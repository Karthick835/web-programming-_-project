const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { runAsync, getAsync, allAsync } = require('../database');
const { requireAuth } = require('../middleware/auth');

// Rate limiting for visitor identification
const identifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many identification requests. Please try again later.' }
});

// Bot user agents pattern
const BOT_REGEX = /bot|crawler|spider|googlebot|bingbot|yandexbot|duckduckbot|slurp|baiduspider|headless|lighthouse|pingdom|curl|wget/i;

// POST /api/visitor/identify
router.post('/identify', identifyLimiter, async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    if (BOT_REGEX.test(userAgent)) {
      return res.status(200).json({ bot: true, ignored: true });
    }

    const {
      visitor_id,
      session_id,
      soft_fingerprint = '',
      page_url = '/',
      referrer = '',
      device_type = 'desktop',
      browser = 'Unknown',
      os = 'Unknown',
      do_not_track = false,
      is_simulated = 0,
      matched_by = ''
    } = req.body;

    // Respect Do Not Track
    if (do_not_track) {
      return res.json({
        dnt: true,
        isReturning: false,
        visitCount: 1,
        sessionId: session_id || null,
        visitorId: visitor_id || null,
        matchedBy: 'new',
        status: 'dnt_anonymous',
        assignedVariants: {}
      });
    }

    if (!visitor_id || typeof visitor_id !== 'string' || visitor_id.length > 100) {
      return res.status(400).json({ error: 'Valid visitor_id is required.' });
    }
    if (!session_id || typeof session_id !== 'string' || session_id.length > 100) {
      return res.status(400).json({ error: 'Valid session_id is required.' });
    }

    const now = new Date().toISOString();

    // Check if profile exists for visitor_id
    let profile = await getAsync(`SELECT * FROM visitor_profiles WHERE visitor_id = ?`, [visitor_id]);
    let matchedBy = 'new';

    // If no profile found by visitor_id, check soft fingerprint within last 24h
    if (!profile && soft_fingerprint) {
      const match = await getAsync(
        `SELECT * FROM visitor_profiles 
         WHERE soft_fingerprint = ? 
         AND last_seen >= datetime('now', '-24 hours')
         ORDER BY last_seen DESC LIMIT 1`,
        [soft_fingerprint]
      );
      if (match) {
        profile = match;
        matchedBy = 'localStorage';
      }
    }

    if (profile) {
      if (matchedBy !== 'localStorage') {
        if (['cookie', 'localStorage', 'recovery_code'].includes(matched_by)) {
          matchedBy = matched_by;
        } else {
          matchedBy = 'cookie';
        }
      }

      // Session deduplication
      const isSameSession = (profile.last_session_id === session_id);
      const visitCount = isSameSession ? profile.total_visits : profile.total_visits + 1;

      // Update pages visited list
      let pages = [];
      try { pages = JSON.parse(profile.pages_visited || '[]'); } catch (_) {}
      if (!pages.includes(page_url)) pages.push(page_url);

      // Check current assigned variants
      const assignments = await allAsync(
        `SELECT e.exp_key, a.variant 
         FROM experiment_assignments a
         JOIN experiments e ON a.experiment_id = e.id
         WHERE a.visitor_id = ?`,
        [profile.visitor_id]
      );

      const assignedVariants = {};
      assignments.forEach(a => { assignedVariants[a.exp_key] = a.variant; });

      // Determine updated status
      const conversionCount = await getAsync(
        `SELECT COUNT(*) as count FROM experiment_conversions WHERE visitor_id = ?`,
        [profile.visitor_id]
      );
      const newStatus = (conversionCount.count > 0) ? 'converted' : 'returning';

      await runAsync(
        `UPDATE visitor_profiles SET
          last_seen = ?,
          total_visits = ?,
          total_page_views = total_page_views + 1,
          pages_visited = ?,
          device_type = COALESCE(?, device_type),
          browser = COALESCE(?, browser),
          os = COALESCE(?, os),
          status = ?,
          soft_fingerprint = COALESCE(?, soft_fingerprint),
          last_session_id = ?
         WHERE visitor_id = ?`,
        [now, visitCount, JSON.stringify(pages), device_type, browser, os, newStatus, soft_fingerprint, session_id, profile.visitor_id]
      );

      return res.json({
        visitorId: profile.visitor_id,
        sessionId: session_id,
        isReturning: true,
        isNewSession: !isSameSession,
        visitCount,
        firstSeen: profile.first_seen,
        lastSeen: now,
        matchedBy,
        status: newStatus,
        assignedVariants
      });
    } else {
      // Create new profile
      const pages = [page_url];
      await runAsync(
        `INSERT OR IGNORE INTO visitor_profiles (
          visitor_id, first_seen, last_seen, total_visits, total_page_views,
          pages_visited, device_type, browser, os, first_referrer,
          assigned_variants, goals_completed, status, soft_fingerprint, is_simulated,
          last_session_id
        ) VALUES (?, ?, ?, 1, 1, ?, ?, ?, ?, ?, '{}', '[]', 'new', ?, ?, ?)`,
        [
          visitor_id,
          now,
          now,
          JSON.stringify(pages),
          device_type,
          browser,
          os,
          referrer || 'Direct',
          soft_fingerprint || null,
          is_simulated ? 1 : 0,
          session_id
        ]
      );

      return res.json({
        visitorId: visitor_id,
        sessionId: session_id,
        isReturning: false,
        isNewSession: true,
        visitCount: 1,
        firstSeen: now,
        lastSeen: now,
        matchedBy: 'new',
        status: 'new',
        assignedVariants: {}
      });
    }
  } catch (err) {
    console.error('Visitor identify error:', err);
    res.status(500).json({ error: 'Failed to process visitor identity.' });
  }
});

// GET /api/visitor/profiles (Admin only — searchable, paginated table)
router.get('/profiles', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20, include_simulated = 'false' } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const filterSim = include_simulated === 'true' ? '' : 'AND (is_simulated = 0 OR is_simulated IS NULL)';

    let baseFilter = `WHERE 1=1 ${filterSim}`;
    const params = [];

    if (search) {
      baseFilter += ` AND (vp.visitor_id LIKE ? OR vp.browser LIKE ? OR vp.os LIKE ? OR vp.device_type LIKE ? OR pp.callsign LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (status) {
      baseFilter += ` AND vp.status = ?`;
      params.push(status);
    }

    const countResult = await getAsync(
      `SELECT COUNT(*) as count FROM visitor_profiles vp LEFT JOIN pilot_profiles pp ON vp.visitor_id = pp.canonical_visitor_id ${baseFilter}`,
      params
    );

    let query = `
      SELECT vp.*, pp.callsign,
        COALESCE((SELECT COUNT(*) FROM pilot_devices pd WHERE pd.pilot_id = pp.id), 0) as devices_count
      FROM visitor_profiles vp
      LEFT JOIN pilot_profiles pp ON vp.visitor_id = pp.canonical_visitor_id
      ${baseFilter}
      ORDER BY vp.last_seen DESC LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), offset);

    const profiles = await allAsync(query, params);

    const formatted = profiles.map(p => ({
      ...p,
      pages_visited: safeParse(p.pages_visited, []),
      assigned_variants: safeParse(p.assigned_variants, {}),
      goals_completed: safeParse(p.goals_completed, [])
    }));

    res.json({
      profiles: formatted,
      total: countResult ? countResult.count : 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Visitor profiles query error:', err);
    res.status(500).json({ error: 'Failed to fetch visitor profiles.' });
  }
});

// GET /api/visitor/profiles/:id (Admin only — full journey timeline)
router.get('/profiles/:id', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await getAsync(`SELECT * FROM visitor_profiles WHERE visitor_id = ?`, [id]);

    if (!profile) {
      return res.status(404).json({ error: 'Visitor profile not found.' });
    }

    // Retrieve event stream for this visitor
    const events = await allAsync(
      `SELECT id, session_id, event_type, page_url, referrer, device_type, browser, timestamp, metadata
       FROM events 
       WHERE visitor_id = ? 
       ORDER BY timestamp ASC, id ASC`,
      [id]
    );

    // Retrieve conversions
    const conversions = await allAsync(
      `SELECT c.goal_event, c.variant, c.timestamp, e.name as experiment_name, e.exp_key
       FROM experiment_conversions c
       JOIN experiments e ON c.experiment_id = e.id
       WHERE c.visitor_id = ?
       ORDER BY c.timestamp ASC`,
      [id]
    );

    res.json({
      profile: {
        ...profile,
        pages_visited: safeParse(profile.pages_visited, []),
        assigned_variants: safeParse(profile.assigned_variants, {}),
        goals_completed: safeParse(profile.goals_completed, [])
      },
      events: events.map(e => ({ ...e, metadata: safeParse(e.metadata, {}) })),
      conversions
    });
  } catch (err) {
    console.error('Visitor timeline error:', err);
    res.status(500).json({ error: 'Failed to fetch visitor timeline.' });
  }
});

function safeParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

module.exports = router;
