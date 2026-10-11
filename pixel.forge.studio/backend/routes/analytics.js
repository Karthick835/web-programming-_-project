const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { runAsync, getAsync, allAsync } = require('../database');
const { requireAuth } = require('../middleware/auth');

// Bot detection regex
const BOT_REGEX = /bot|crawler|spider|googlebot|bingbot|yandexbot|duckduckbot|slurp|baiduspider|headless|lighthouse|pingdom|curl|wget/i;

// Rate limiting for public event tracking
const eventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180, // Allow up to 180 events/min for scroll/heartbeats
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for analytics events.' }
});

// Helper to detect device from user-agent if not supplied by client
function parseUserAgent(ua = '') {
  let device = 'desktop';
  if (/mobile|android|iphone|ipod/i.test(ua)) device = 'mobile';
  else if (/ipad|tablet/i.test(ua)) device = 'tablet';

  let browser = 'Other';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return { device, browser };
}

// In-memory frequency tracker to detect spamming visitors (> 120 events/min)
const visitorEventCounts = new Map();
setInterval(() => visitorEventCounts.clear(), 60000);

// ==========================================
// 1. INGESTION ENDPOINTS (Public)
// ==========================================

// POST /api/analytics/events (Single or Batch)
router.post('/events', eventsLimiter, async (req, res) => {
  try {
    const clientUa = req.headers['user-agent'] || '';

    // Bot filtering: ignore known bot user agents
    if (BOT_REGEX.test(clientUa)) {
      return res.status(200).json({ success: true, count: 0, ignored: 'bot_ua' });
    }

    const rawEvents = Array.isArray(req.body.events) ? req.body.events : [req.body];
    const uaInfo = parseUserAgent(clientUa);

    let recorded = 0;

    for (const evt of rawEvents) {
      const {
        visitor_id,
        session_id,
        event_type = 'page_view',
        page_url = '/',
        referrer = '',
        device_type = uaInfo.device,
        browser = uaInfo.browser,
        screen_res = '1920x1080',
        metadata = {},
        is_simulated = 0,
        is_forced = 0
      } = evt;

      // Basic input validation
      if (!visitor_id || typeof visitor_id !== 'string' || visitor_id.length > 100) continue;
      if (!event_type || typeof event_type !== 'string' || event_type.length > 50) continue;
      if (typeof page_url !== 'string' || page_url.length > 255) continue;

      // Check impossible frequency per visitor (> 120 events/min)
      const count = (visitorEventCounts.get(visitor_id) || 0) + 1;
      visitorEventCounts.set(visitor_id, count);
      if (count > 120 && !is_simulated) {
        continue; // Drop excessive spam events
      }

      const safeMetadata = typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : '{}';

      await runAsync(
        `INSERT INTO events (
          visitor_id, session_id, event_type, page_url, referrer,
          device_type, browser, screen_res, metadata, is_simulated, is_forced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          visitor_id,
          session_id || ('ses_' + Math.random().toString(36).substring(2, 9)),
          event_type,
          page_url,
          referrer || '',
          device_type || 'desktop',
          browser || 'Chrome',
          screen_res || '1920x1080',
          safeMetadata,
          is_simulated ? 1 : 0,
          is_forced ? 1 : 0
        ]
      );
      recorded++;
    }

    res.json({ success: true, count: recorded });
  } catch (err) {
    console.error('Analytics event ingestion error:', err);
    res.status(500).json({ error: 'Failed to record analytics event.' });
  }
});


// ==========================================
// 2. DASHBOARD METRICS (Protected)
// ==========================================

function getSimFilter(req) {
  const includeSimulated = req.query.include_simulated === 'true';
  return includeSimulated ? '' : 'AND (is_simulated = 0 OR is_simulated IS NULL)';
}

// GET /api/analytics/overview
router.get('/overview', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const simFilter = getSimFilter(req);

    const totalEvents = await getAsync(`SELECT COUNT(*) as count FROM events WHERE 1=1 ${simFilter}`);
    const totalPageviews = await getAsync(`SELECT COUNT(*) as count FROM events WHERE event_type = 'page_view' ${simFilter}`);
    const uniqueVisitors = await getAsync(`SELECT COUNT(DISTINCT visitor_id) as count FROM events WHERE 1=1 ${simFilter}`);
    const uniqueSessions = await getAsync(`SELECT COUNT(DISTINCT session_id) as count FROM events WHERE 1=1 ${simFilter}`);

    // Live active visitors in last 5 minutes (Real events only, 0 if none)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const liveVisitors = await getAsync(
      `SELECT COUNT(DISTINCT visitor_id) as count FROM events WHERE timestamp >= ? ${simFilter}`,
      [fiveMinutesAgo]
    );

    // Form Submissions / Conversions
    const formSubmissions = await getAsync(`SELECT COUNT(*) as count FROM events WHERE event_type = 'form_submit' ${simFilter}`);
    
    const convSimFilter = req.query.include_simulated === 'true' ? '' : 'WHERE (is_simulated = 0 OR is_simulated IS NULL) AND is_forced = 0';
    const totalConversions = await getAsync(`SELECT COUNT(*) as count FROM experiment_conversions ${convSimFilter}`);

    // Approximate bounce rate (sessions with only 1 pageview)
    const singleViewSessions = await getAsync(`
      SELECT COUNT(*) as count FROM (
        SELECT session_id FROM events 
        WHERE event_type = 'page_view' ${simFilter}
        GROUP BY session_id HAVING COUNT(*) = 1
      )
    `);
    const bounceRate = uniqueSessions.count > 0 ? ((singleViewSessions.count / uniqueSessions.count) * 100).toFixed(1) : 0;

    // Real average dwell time calculation across multi-event sessions
    const dwellStats = await getAsync(`
      SELECT AVG(session_seconds) as avg_sec FROM (
        SELECT (MAX(julianday(timestamp)) - MIN(julianday(timestamp))) * 86400 as session_seconds
        FROM events
        WHERE 1=1 ${simFilter}
        GROUP BY session_id
        HAVING COUNT(*) > 1
      )
    `);

    let avgDwellTime = '0s';
    if (dwellStats && dwellStats.avg_sec > 0) {
      const sec = Math.round(dwellStats.avg_sec);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      avgDwellTime = m > 0 ? `${m}m ${s}s` : `${s}s`;
    }

    // Consistency check: uniqueVisitors <= uniqueSessions <= totalPageviews
    const uVisitors = uniqueVisitors.count;
    const uSessions = Math.max(uVisitors, uniqueSessions.count);
    const uViews = Math.max(uSessions, totalPageviews.count);

    // Check if any simulated events exist in DB
    const simCountResult = await getAsync(`SELECT COUNT(*) as count FROM events WHERE is_simulated = 1`);
    const hasSimulatedData = (simCountResult?.count || 0) > 0;

    res.json({
      totalEvents: totalEvents.count,
      totalPageviews: uViews,
      uniqueVisitors: uVisitors,
      uniqueSessions: uSessions,
      liveVisitors: liveVisitors.count || 0,
      formSubmissions: formSubmissions.count,
      totalConversions: totalConversions.count,
      bounceRate: Number(bounceRate),
      avgDwellTime,
      hasSimulatedData,
      simulatedEventsCount: simCountResult?.count || 0
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ error: 'Failed to aggregate overview metrics.' });
  }
});

// GET /api/analytics/timeline (Daily visitors & pageviews over parameterized days)
router.get('/timeline', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 7));
    const simFilter = getSimFilter(req);

    // SQL Injection safe parameterized query
    const timelineData = await allAsync(`
      SELECT
        strftime('%Y-%m-%d', timestamp) as date,
        COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as pageviews,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END) as conversions
      FROM events
      WHERE timestamp >= datetime('now', '-' || ? || ' days') ${simFilter}
      GROUP BY date
      ORDER BY date ASC
    `, [days]);

    res.json({ timeline: timelineData });
  } catch (err) {
    console.error('Analytics timeline error:', err);
    res.status(500).json({ error: 'Failed to aggregate timeline data.' });
  }
});

// GET /api/analytics/pages (Top Pages & Views)
router.get('/pages', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const simFilter = getSimFilter(req);

    const topPages = await allAsync(`
      SELECT
        page_url,
        COUNT(*) as views,
        COUNT(DISTINCT visitor_id) as unique_visitors
      FROM events
      WHERE event_type = 'page_view' ${simFilter}
      GROUP BY page_url
      ORDER BY views DESC
      LIMIT 10
    `);

    res.json({ pages: topPages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to aggregate page metrics.' });
  }
});

// GET /api/analytics/devices (Device & Browser breakdown)
router.get('/devices', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const simFilter = getSimFilter(req);

    const deviceBreakdown = await allAsync(`
      SELECT
        COALESCE(device_type, 'desktop') as device,
        COUNT(DISTINCT visitor_id) as count
      FROM events
      WHERE 1=1 ${simFilter}
      GROUP BY device
      ORDER BY count DESC
    `);

    const browserBreakdown = await allAsync(`
      SELECT
        COALESCE(browser, 'Chrome') as browser,
        COUNT(DISTINCT visitor_id) as count
      FROM events
      WHERE 1=1 ${simFilter}
      GROUP BY browser
      ORDER BY count DESC
    `);

    const referrerBreakdown = await allAsync(`
      SELECT
        CASE
          WHEN referrer = '' OR referrer IS NULL OR referrer = 'Direct' THEN 'Direct / Bookmark'
          ELSE referrer
        END as source,
        COUNT(DISTINCT visitor_id) as count
      FROM events
      WHERE 1=1 ${simFilter}
      GROUP BY source
      ORDER BY count DESC
      LIMIT 6
    `);

    res.json({
      devices: deviceBreakdown,
      browsers: browserBreakdown,
      referrers: referrerBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to aggregate device distribution.' });
  }
});

// GET /api/analytics/funnel (Home -> Games -> Contact / Careers -> Submissions)
router.get('/funnel', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const simFilter = getSimFilter(req);

    // Stage 1: Home Page visitors
    const homeVisitors = await getAsync(`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM events
      WHERE page_url = '/' AND event_type = 'page_view' ${simFilter}
    `);

    // Stage 2: Games Page visitors
    const gamesVisitors = await getAsync(`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM events
      WHERE page_url = '/games' AND event_type = 'page_view' ${simFilter}
    `);

    // Stage 3: Contact or Careers Page visitors
    const contactOrCareersVisitors = await getAsync(`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM events
      WHERE (page_url = '/contact' OR page_url = '/careers') AND event_type = 'page_view' ${simFilter}
    `);

    // Stage 4: Form Submission (Contact message or Job Application)
    const submittedVisitors = await getAsync(`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM events
      WHERE event_type = 'form_submit' ${simFilter}
    `);

    const step1 = homeVisitors.count || 0;
    const step2 = Math.min(step1, gamesVisitors.count || 0);
    const step3 = Math.min(step2, contactOrCareersVisitors.count || 0);
    const step4 = Math.min(step3, submittedVisitors.count || 0);

    const funnelStages = [
      {
        stage: '1. Home Landing',
        page: '/',
        count: step1,
        pctOfTotal: step1 > 0 ? 100 : 0,
        dropOffRate: step1 > 0 ? Number((((step1 - step2) / step1) * 100).toFixed(1)) : 0
      },
      {
        stage: '2. Portfolio Discovery',
        page: '/games',
        count: step2,
        pctOfTotal: step1 > 0 ? Number(((step2 / step1) * 100).toFixed(1)) : 0,
        dropOffRate: step2 > 0 ? Number((((step2 - step3) / step2) * 100).toFixed(1)) : 0
      },
      {
        stage: '3. Engagement / Careers / Contact',
        page: '/careers or /contact',
        count: step3,
        pctOfTotal: step1 > 0 ? Number(((step3 / step1) * 100).toFixed(1)) : 0,
        dropOffRate: step3 > 0 ? Number((((step3 - step4) / step3) * 100).toFixed(1)) : 0
      },
      {
        stage: '4. Lead / Application Conversion',
        page: 'Form Submitted',
        count: step4,
        pctOfTotal: step1 > 0 ? Number(((step4 / step1) * 100).toFixed(1)) : 0,
        dropOffRate: 0
      }
    ];

    res.json({ funnel: funnelStages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to aggregate funnel analysis.' });
  }
});

// GET /api/analytics/realtime-stream (Raw recent event stream)
router.get('/realtime-stream', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const simFilter = getSimFilter(req);

    const rawEvents = await allAsync(`
      SELECT id, visitor_id, session_id, event_type, page_url, device_type, browser, timestamp, metadata, is_simulated
      FROM events
      WHERE 1=1 ${simFilter}
      ORDER BY timestamp DESC, id DESC
      LIMIT 30
    `);

    const parsed = rawEvents.map(e => ({
      ...e,
      metadata: e.metadata ? JSON.parse(e.metadata) : {}
    }));

    res.json({ events: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch raw event stream.' });
  }
});


// ==========================================
// 3. DEMO TRAFFIC SIMULATOR (Optional Admin Tool)
// ==========================================

// POST /api/analytics/simulate
router.post('/simulate', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const count = Math.min(100, Math.max(5, parseInt(req.body.count) || 25));
    const pages = ['/', '/games', '/about', '/team', '/careers', '/contact'];
    const referrers = ['https://google.com', 'https://twitter.com', 'https://reddit.com/r/gamedev', 'https://store.steampowered.com', 'Direct'];
    const devices = ['desktop', 'desktop', 'desktop', 'mobile', 'mobile', 'tablet'];
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];

    const exp = await getAsync(`SELECT id FROM experiments WHERE exp_key = 'hero_cta_text'`);
    const expId = exp ? exp.id : 1;

    let generatedEvents = 0;

    for (let i = 0; i < count; i++) {
      const visitorId = 'sim_' + Math.random().toString(36).substring(2, 10);
      const sessionId = 'ses_' + Math.random().toString(36).substring(2, 9);
      const device = devices[Math.floor(Math.random() * devices.length)];
      const browser = browsers[Math.floor(Math.random() * browsers.length)];
      const referrer = referrers[Math.floor(Math.random() * referrers.length)];
      const variant = Math.random() < 0.5 ? 'A' : 'B';

      // Random time in the last 7 days
      const pastMs = Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);
      const eventTime = new Date(Date.now() - pastMs).toISOString();

      // Record simulated profile
      await runAsync(
        `INSERT OR IGNORE INTO visitor_profiles (
          visitor_id, first_seen, last_seen, total_visits, total_page_views,
          pages_visited, device_type, browser, os, first_referrer,
          assigned_variants, goals_completed, status, is_simulated
        ) VALUES (?, ?, ?, 1, 2, '["/","/games"]', ?, ?, 'Windows', ?, ?, '[]', 'new', 1)`,
        [visitorId, eventTime, eventTime, device, browser, referrer, JSON.stringify({ hero_cta_text: variant })]
      );

      // Record simulated experiment assignment
      await runAsync(
        `INSERT OR IGNORE INTO experiment_assignments (visitor_id, experiment_id, variant, assigned_at, is_simulated)
         VALUES (?, ?, ?, ?, 1)`,
        [visitorId, expId, variant, eventTime]
      );

      // Home page view
      await runAsync(
        `INSERT INTO events (visitor_id, session_id, event_type, page_url, referrer, device_type, browser, screen_res, timestamp, metadata, is_simulated)
         VALUES (?, ?, 'page_view', '/', ?, ?, ?, '1920x1080', ?, ?, 1)`,
        [visitorId, sessionId, referrer, device, browser, eventTime, JSON.stringify({ title: 'Home', simulated: true })]
      );
      generatedEvents++;

      // Visited games
      await runAsync(
        `INSERT INTO events (visitor_id, session_id, event_type, page_url, referrer, device_type, browser, screen_res, timestamp, metadata, is_simulated)
         VALUES (?, ?, 'page_view', '/games', ?, ?, ?, '1920x1080', ?, ?, 1)`,
        [visitorId, sessionId, referrer, device, browser, eventTime, JSON.stringify({ title: 'Games', simulated: true })]
      );
      generatedEvents++;

      // 40% conversion
      if (Math.random() < 0.4) {
        await runAsync(
          `INSERT INTO events (visitor_id, session_id, event_type, page_url, referrer, device_type, browser, screen_res, timestamp, metadata, is_simulated)
           VALUES (?, ?, 'cta_click_games', '/', ?, ?, ?, '1920x1080', ?, ?, 1)`,
          [visitorId, sessionId, referrer, device, browser, eventTime, JSON.stringify({ variant, simulated: true })]
        );
        await runAsync(
          `INSERT INTO experiment_conversions (visitor_id, experiment_id, variant, goal_event, timestamp, is_simulated)
           VALUES (?, ?, ?, 'cta_click_games', ?, 1)`,
          [visitorId, expId, variant, eventTime]
        );
        generatedEvents++;
      }
    }

    res.json({
      success: true,
      message: `Simulated ${count} visitors with ${generatedEvents} events marked with is_simulated=true.`,
      generatedEvents
    });
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: 'Failed to simulate demo traffic.' });
  }
});

// DELETE /api/analytics/simulated (Purge all simulated data)
router.delete('/simulated', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    await runAsync(`DELETE FROM events WHERE is_simulated = 1`);
    await runAsync(`DELETE FROM experiment_conversions WHERE is_simulated = 1`);
    await runAsync(`DELETE FROM experiment_assignments WHERE is_simulated = 1`);
    await runAsync(`DELETE FROM visitor_profiles WHERE is_simulated = 1`);

    res.json({ success: true, message: 'All simulated traffic events and profiles have been cleared.' });
  } catch (err) {
    console.error('Clear simulation error:', err);
    res.status(500).json({ error: 'Failed to clear simulated traffic.' });
  }
});

module.exports = router;
