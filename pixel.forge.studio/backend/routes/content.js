const express = require('express');
const router = express.Router();
const { runAsync, getAsync, allAsync } = require('../database');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter: 5 contact form submissions per hour per IP
const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages from this IP. Please wait before sending again.' }
});

// Simple email validator
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==========================================
// 1. GAMES CRUD
// ==========================================

// GET /api/content/games (Public)
router.get('/games', async (req, res) => {
  try {
    const { genre, status, featured } = req.query;
    let sql = `SELECT * FROM games WHERE 1=1`;
    const params = [];

    if (genre && genre !== 'All') {
      sql += ` AND genre LIKE ?`;
      params.push(`%${genre}%`);
    }
    if (status && status !== 'All') {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (featured === 'true' || featured === '1') {
      sql += ` AND featured = 1`;
    }

    sql += ` ORDER BY featured DESC, rating DESC, id ASC`;
    const games = await allAsync(sql, params);

    // Parse JSON fields
    const parsedGames = games.map(g => ({
      ...g,
      platforms: g.platforms ? JSON.parse(g.platforms) : [],
      screenshots: g.screenshots ? JSON.parse(g.screenshots) : [],
      tags: g.tags ? JSON.parse(g.tags) : []
    }));

    res.json({ games: parsedGames });
  } catch (err) {
    console.error('Fetch games error:', err);
    res.status(500).json({ error: 'Failed to retrieve games.' });
  }
});

// GET /api/content/games/:id or :slug (Public)
router.get('/games/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let game;
    if (isNaN(identifier)) {
      game = await getAsync(`SELECT * FROM games WHERE slug = ?`, [identifier]);
    } else {
      game = await getAsync(`SELECT * FROM games WHERE id = ?`, [identifier]);
    }

    if (!game) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    res.json({
      game: {
        ...game,
        platforms: game.platforms ? JSON.parse(game.platforms) : [],
        screenshots: game.screenshots ? JSON.parse(game.screenshots) : [],
        tags: game.tags ? JSON.parse(game.tags) : []
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game details.' });
  }
});

// POST /api/content/games (Protected - Admin/Editor)
router.post('/games', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const {
      title, slug, genre, status = 'Released', description, tagline = '',
      release_date = '', rating = 4.8, platforms = [], trailer_url = '',
      banner_img = '', screenshots = [], featured = 0, tags = [], play_url = '#',
      create_launch_devlog = false
    } = req.body;

    if (!title || !genre || !description) {
      return res.status(400).json({ error: 'Title, genre, and description are required.' });
    }

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await runAsync(
      `INSERT INTO games (title, slug, genre, status, tagline, description, release_date, rating, platforms, trailer_url, banner_img, screenshots, featured, tags, play_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, finalSlug, genre, status, tagline, description, release_date,
        rating, JSON.stringify(platforms), trailer_url, banner_img,
        JSON.stringify(screenshots), featured ? 1 : 0, JSON.stringify(tags), play_url
      ]
    );

    const gameId = result.lastID;

    // Auto-create launch announcement devlog draft if requested
    if (create_launch_devlog && gameId) {
      const devlogSlug = `${finalSlug}-launch-announcement`;
      const devlogTitle = `${title} — Launch Announcement`;
      const devlogContent = `# ${title} — Launch Announcement\n\n${tagline || ''}\n\n${description}\n\n## What to Expect\n\nMore details coming soon. Stay tuned!\n`;
      try {
        await runAsync(
          `INSERT OR IGNORE INTO devlogs (title, slug, category, excerpt, content, cover_image, game_id, author, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
          [devlogTitle, devlogSlug, 'GAME UPDATE', tagline || description.substring(0, 160), devlogContent, banner_img, gameId, 'Pixel Forge Team']
        );
      } catch (_) {}
    }

    res.status(201).json({ message: 'Game created successfully', gameId });
  } catch (err) {
    console.error('Create game error:', err);
    res.status(500).json({ error: 'Failed to create game.' });
  }
});

// PUT /api/content/games/:id (Protected)
router.put('/games/:id', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, genre, status, tagline, description, release_date, rating,
      platforms, trailer_url, banner_img, screenshots, featured, tags, play_url
    } = req.body;

    await runAsync(
      `UPDATE games SET
       title = COALESCE(?, title),
       genre = COALESCE(?, genre),
       status = COALESCE(?, status),
       tagline = COALESCE(?, tagline),
       description = COALESCE(?, description),
       release_date = COALESCE(?, release_date),
       rating = COALESCE(?, rating),
       platforms = COALESCE(?, platforms),
       trailer_url = COALESCE(?, trailer_url),
       banner_img = COALESCE(?, banner_img),
       screenshots = COALESCE(?, screenshots),
       featured = COALESCE(?, featured),
       tags = COALESCE(?, tags),
       play_url = COALESCE(?, play_url)
       WHERE id = ?`,
      [
        title, genre, status, tagline, description, release_date, rating,
        platforms ? JSON.stringify(platforms) : null,
        trailer_url, banner_img,
        screenshots ? JSON.stringify(screenshots) : null,
        featured !== undefined ? (featured ? 1 : 0) : null,
        tags ? JSON.stringify(tags) : null,
        play_url, id
      ]
    );

    res.json({ message: 'Game updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update game.' });
  }
});

// DELETE /api/content/games/:id (Protected - Admin)
router.delete('/games/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(`DELETE FROM games WHERE id = ?`, [id]);
    res.json({ message: 'Game deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete game.' });
  }
});


// ==========================================
// 2. TEAM MEMBERS CRUD
// ==========================================

// GET /api/content/team (Public)
router.get('/team', async (req, res) => {
  try {
    const members = await allAsync(`SELECT * FROM team_members ORDER BY order_idx ASC, id ASC`);
    const parsed = members.map(m => ({
      ...m,
      social_links: m.social_links ? JSON.parse(m.social_links) : [],
      is_verified: Boolean(m.is_verified)
    }));
    res.json({ team: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team members.' });
  }
});

// POST /api/content/team (Protected)
router.post('/team', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { name, role, department, bio, avatar, social_links = [], is_verified = 0, order_idx = 0 } = req.body;
    if (!name || !role || !department) {
      return res.status(400).json({ error: 'Name, role, and department are required.' });
    }

    const result = await runAsync(
      `INSERT INTO team_members (name, role, department, bio, avatar, social_links, is_verified, order_idx) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, role, department, bio || '', avatar || '', JSON.stringify(social_links), is_verified ? 1 : 0, order_idx]
    );

    res.status(201).json({ message: 'Team member added', memberId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create team member.' });
  }
});

// PUT /api/content/team/:id (Protected)
router.put('/team/:id', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, department, bio, avatar, social_links, is_verified, order_idx } = req.body;

    await runAsync(
      `UPDATE team_members SET
       name = COALESCE(?, name),
       role = COALESCE(?, role),
       department = COALESCE(?, department),
       bio = COALESCE(?, bio),
       avatar = COALESCE(?, avatar),
       social_links = COALESCE(?, social_links),
       is_verified = COALESCE(?, is_verified),
       order_idx = COALESCE(?, order_idx)
       WHERE id = ?`,
      [
        name, role, department, bio, avatar,
        social_links !== undefined ? JSON.stringify(social_links) : null,
        is_verified !== undefined ? (is_verified ? 1 : 0) : null,
        order_idx, id
      ]
    );

    res.json({ message: 'Team member updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update team member.' });
  }
});

// DELETE /api/content/team/:id (Protected - Admin)
router.delete('/team/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(`DELETE FROM team_members WHERE id = ?`, [id]);
    res.json({ message: 'Team member deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete team member.' });
  }
});


// ==========================================
// 3. JOBS / CAREERS CRUD
// ==========================================

// GET /api/content/jobs (Public)
router.get('/jobs', async (req, res) => {
  try {
    const { activeOnly } = req.query;
    let sql = `SELECT * FROM jobs`;
    if (activeOnly === 'true' || activeOnly === '1') {
      sql += ` WHERE is_active = 1`;
    }
    sql += ` ORDER BY is_active DESC, id DESC`;

    const jobs = await allAsync(sql);
    const parsed = jobs.map(j => ({
      ...j,
      requirements: j.requirements ? JSON.parse(j.requirements) : [],
      perks: j.perks ? JSON.parse(j.perks) : []
    }));

    res.json({ jobs: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs.' });
  }
});

// POST /api/content/jobs (Protected)
router.post('/jobs', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { title, department, location, type = 'Full-Time', experience, description, requirements = [], perks = [], is_active = 1 } = req.body;
    if (!title || !department || !description) {
      return res.status(400).json({ error: 'Title, department, and description are required.' });
    }

    const result = await runAsync(
      `INSERT INTO jobs (title, department, location, type, experience, description, requirements, perks, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, department, location, type, experience, description, JSON.stringify(requirements), JSON.stringify(perks), is_active ? 1 : 0]
    );

    res.status(201).json({ message: 'Job opening posted', jobId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job.' });
  }
});

// PUT /api/content/jobs/:id (Protected)
router.put('/jobs/:id', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, department, location, type, experience, description, requirements, perks, is_active } = req.body;

    await runAsync(
      `UPDATE jobs SET
       title = COALESCE(?, title),
       department = COALESCE(?, department),
       location = COALESCE(?, location),
       type = COALESCE(?, type),
       experience = COALESCE(?, experience),
       description = COALESCE(?, description),
       requirements = COALESCE(?, requirements),
       perks = COALESCE(?, perks),
       is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        title, department, location, type, experience, description,
        requirements ? JSON.stringify(requirements) : null,
        perks ? JSON.stringify(perks) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]
    );

    res.json({ message: 'Job updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job.' });
  }
});

// DELETE /api/content/jobs/:id (Protected - Admin)
router.delete('/jobs/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(`DELETE FROM jobs WHERE id = ?`, [id]);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete job.' });
  }
});


// ==========================================
// 4. MESSAGES (Contact Form Ingestion & Admin View)
// ==========================================

// POST /api/content/messages (Public) — with rate limiting + honeypot
router.post('/messages', contactRateLimit, async (req, res) => {
  try {
    const { name, email, subject, message, website } = req.body;

    // Honeypot: bots fill the hidden "website" field; humans leave it blank
    if (website) {
      return res.status(200).json({ message: 'Message sent successfully! We will get back to you shortly.' });
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All message fields are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }
    if (message.trim().length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters.' });
    }

    const result = await runAsync(
      `INSERT INTO messages (name, email, subject, message, status, is_sample) VALUES (?, ?, ?, ?, 'unread', 0)`,
      [name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()]
    );

    res.status(201).json({ message: 'Message sent successfully! We will get back to you shortly.', messageId: result.lastID });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// GET /api/content/messages (Protected) — search, status filter, unread count
router.get('/messages', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;
    let sql = `SELECT * FROM messages WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ` AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY id DESC`;
    const messages = await allAsync(sql, params);

    const unreadCount = await getAsync(`SELECT COUNT(*) as count FROM messages WHERE status = 'unread'`);

    res.json({ messages, unreadCount: unreadCount.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// PUT /api/content/messages/:id/status (Protected)
router.put('/messages/:id/status', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['read', 'unread'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use "read" or "unread".' });
    }
    await runAsync(`UPDATE messages SET status = ? WHERE id = ?`, [status, id]);
    res.json({ message: 'Message status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// DELETE /api/content/messages/:id (Protected - Admin)
router.delete('/messages/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(`DELETE FROM messages WHERE id = ?`, [id]);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message.' });
  }
});

// GET /api/content/messages/export/csv (Protected)
router.get('/messages/export/csv', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const messages = await allAsync('SELECT id, name, email, subject, message, status, created_at FROM messages ORDER BY id DESC');
    let csv = 'ID,Name,Email,Subject,Message,Status,Date\n';
    messages.forEach(m => {
      csv += `${m.id},"${(m.name || '').replace(/"/g, '""')}","${m.email}","${(m.subject || '').replace(/"/g, '""')}","${(m.message || '').replace(/"/g, '""')}","${m.status}","${m.created_at}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contact_messages.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export messages CSV' });
  }
});

// POST /api/content/messages/sample — Load demo sample messages (is_sample = 1)
router.post('/messages/sample', requireAuth(['admin']), async (req, res) => {
  try {
    const samples = [
      {
        name: 'Jordan Pierce',
        email: 'jordan@exampledev.io',
        subject: 'Publishing & Partnership',
        message: 'Hey Pixel Forge! We are a mid-size publisher looking for exciting indie titles for our Q1 2027 lineup. CyberVanguard 2099 caught our eye — would love to set up a call to discuss co-publishing options.',
        status: 'unread'
      },
      {
        name: 'Taylor Nguyen',
        email: 'taylor.n@pressquarterly.com',
        subject: 'Press & Media Inquiries',
        message: 'Hi! I am a journalist covering the indie gaming scene for Press Quarterly. I would love to do an in-depth studio profile ahead of your next title launch. Any chance of scheduling an interview?',
        status: 'unread'
      },
      {
        name: 'Riley Santos',
        email: 'riley@gamestream.tv',
        subject: 'Community & Beta Playtests',
        message: 'I run a streaming community of 40k followers who are huge fans of pixel-art action games. I would be thrilled to participate in any beta playtest or early access program you have. Please let me know!',
        status: 'read'
      }
    ];

    for (const s of samples) {
      await runAsync(
        `INSERT INTO messages (name, email, subject, message, status, is_sample) VALUES (?, ?, ?, ?, ?, 1)`,
        [s.name, s.email, s.subject, s.message, s.status]
      );
    }

    res.json({ message: `${samples.length} sample messages loaded.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load sample messages.' });
  }
});

// DELETE /api/content/messages/sample — Clear all sample messages
router.delete('/messages/sample', requireAuth(['admin']), async (req, res) => {
  try {
    const result = await runAsync(`DELETE FROM messages WHERE is_sample = 1`);
    res.json({ message: `Cleared ${result.changes} sample messages.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear sample messages.' });
  }
});


// ==========================================
// 5. JOB APPLICATIONS (Ingestion & Admin View)
// ==========================================

// POST /api/content/applications (Public)
router.post('/applications', async (req, res) => {
  try {
    const { job_id, job_title, applicant_name, email, portfolio_url, resume_path, cover_note } = req.body;
    if (!applicant_name || !email || !job_title) {
      return res.status(400).json({ error: 'Applicant name, email, and job title are required.' });
    }

    const result = await runAsync(
      `INSERT INTO applications (job_id, job_title, applicant_name, email, portfolio_url, resume_path, cover_note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [job_id || null, job_title, applicant_name, email, portfolio_url || '', resume_path || '', cover_note || '']
    );

    res.status(201).json({ message: 'Application submitted successfully! Our talent team will review it.', applicationId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit application.' });
  }
});

// GET /api/content/applications (Protected)
router.get('/applications', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const applications = await allAsync(`SELECT * FROM applications ORDER BY id DESC`);
    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications.' });
  }
});

// PUT /api/content/applications/:id/status (Protected)
router.put('/applications/:id/status', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await runAsync(`UPDATE applications SET status = ? WHERE id = ?`, [status, id]);
    res.json({ message: 'Application status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update application status.' });
  }
});

// GET /api/content/applications/export/csv (Protected)
router.get('/applications/export/csv', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const apps = await allAsync('SELECT id, job_title, applicant_name, email, portfolio_url, cover_note, status, created_at FROM applications ORDER BY id DESC');
    let csv = 'ID,Job Title,Applicant Name,Email,Portfolio URL,Cover Note,Status,Date\n';
    apps.forEach(a => {
      csv += `${a.id},"${a.job_title}","${(a.applicant_name || '').replace(/"/g, '""')}","${a.email}","${a.portfolio_url || ''}","${(a.cover_note || '').replace(/"/g, '""')}","${a.status}","${a.created_at}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="job_applications.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export applications CSV' });
  }
});


// ==========================================
// 6. DEVLOGS CRUD
// ==========================================

// GET /api/content/devlogs (Public) — published only unless admin
router.get('/devlogs', async (req, res) => {
  try {
    const { category, game_id, status, limit = 20, offset = 0 } = req.query;
    let sql = `SELECT * FROM devlogs WHERE 1=1`;
    const params = [];

    // Public always only sees published; admin can pass status
    const reqStatus = status || 'published';
    sql += ` AND status = ?`;
    params.push(reqStatus);

    if (category && category !== 'All') {
      sql += ` AND category = ?`;
      params.push(category);
    }
    if (game_id) {
      sql += ` AND game_id = ?`;
      params.push(game_id);
    }

    const countRow = await getAsync(`SELECT COUNT(*) as total FROM devlogs WHERE status = ?${category && category !== 'All' ? ' AND category = ?' : ''}${game_id ? ' AND game_id = ?' : ''}`,
      [reqStatus, ...(category && category !== 'All' ? [category] : []), ...(game_id ? [game_id] : [])]
    );

    sql += ` ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const devlogs = await allAsync(sql, params);
    res.json({ devlogs, total: countRow.total });
  } catch (err) {
    console.error('Fetch devlogs error:', err);
    res.status(500).json({ error: 'Failed to fetch devlogs.' });
  }
});

// GET /api/content/devlogs/admin — all devlogs for admin (Protected)
router.get('/devlogs/admin', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { category, game_id } = req.query;
    let sql = `SELECT d.*, g.title as game_title FROM devlogs d LEFT JOIN games g ON d.game_id = g.id WHERE 1=1`;
    const params = [];

    if (category && category !== 'All') {
      sql += ` AND d.category = ?`;
      params.push(category);
    }
    if (game_id) {
      sql += ` AND d.game_id = ?`;
      params.push(game_id);
    }

    sql += ` ORDER BY d.id DESC`;
    const devlogs = await allAsync(sql, params);
    res.json({ devlogs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch devlogs.' });
  }
});

// GET /api/content/devlogs/:slug (Public)
router.get('/devlogs/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const devlog = await getAsync(
      `SELECT d.*, g.title as game_title, g.slug as game_slug FROM devlogs d LEFT JOIN games g ON d.game_id = g.id WHERE d.slug = ? AND d.status = 'published'`,
      [slug]
    );

    if (!devlog) {
      return res.status(404).json({ error: 'Devlog not found.' });
    }

    // Fetch prev/next published devlogs
    const prev = await getAsync(
      `SELECT title, slug FROM devlogs WHERE status = 'published' AND id < ? ORDER BY id DESC LIMIT 1`,
      [devlog.id]
    );
    const next = await getAsync(
      `SELECT title, slug FROM devlogs WHERE status = 'published' AND id > ? ORDER BY id ASC LIMIT 1`,
      [devlog.id]
    );

    res.json({ devlog, prev: prev || null, next: next || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch devlog.' });
  }
});

// POST /api/content/devlogs (Protected)
router.post('/devlogs', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const {
      title, slug, category, excerpt, content, cover_image = '',
      game_id = null, version = '', author, status = 'draft'
    } = req.body;

    if (!title || !category || !excerpt || !content || !author) {
      return res.status(400).json({ error: 'Title, category, excerpt, content, and author are required.' });
    }

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const published_at = status === 'published' ? new Date().toISOString() : null;

    const result = await runAsync(
      `INSERT INTO devlogs (title, slug, category, excerpt, content, cover_image, game_id, version, author, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, finalSlug, category, excerpt, content, cover_image, game_id || null, version, author, status, published_at]
    );

    res.status(201).json({ message: 'Devlog created', devlogId: result.lastID, slug: finalSlug });
  } catch (err) {
    console.error('Create devlog error:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A devlog with this slug already exists. Please choose a different title or slug.' });
    }
    res.status(500).json({ error: 'Failed to create devlog.' });
  }
});

// PUT /api/content/devlogs/:id (Protected)
router.put('/devlogs/:id', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, category, excerpt, content, cover_image, game_id, version, author, status } = req.body;

    // If publishing for first time, set published_at
    const existing = await getAsync(`SELECT status, published_at FROM devlogs WHERE id = ?`, [id]);
    let published_at = existing?.published_at;
    if (status === 'published' && !published_at) {
      published_at = new Date().toISOString();
    }

    await runAsync(
      `UPDATE devlogs SET
       title = COALESCE(?, title),
       slug = COALESCE(?, slug),
       category = COALESCE(?, category),
       excerpt = COALESCE(?, excerpt),
       content = COALESCE(?, content),
       cover_image = COALESCE(?, cover_image),
       game_id = ?,
       version = COALESCE(?, version),
       author = COALESCE(?, author),
       status = COALESCE(?, status),
       published_at = ?
       WHERE id = ?`,
      [title, slug, category, excerpt, content, cover_image, game_id !== undefined ? (game_id || null) : undefined, version, author, status, published_at, id]
    );

    res.json({ message: 'Devlog updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update devlog.' });
  }
});

// DELETE /api/content/devlogs/:id (Protected - Admin)
router.delete('/devlogs/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(`DELETE FROM devlogs WHERE id = ?`, [id]);
    res.json({ message: 'Devlog deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete devlog.' });
  }
});


module.exports = router;
