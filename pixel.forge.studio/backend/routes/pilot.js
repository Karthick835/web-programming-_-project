const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { runAsync, getAsync, allAsync } = require('../database');

// Rate limiter: 5 attempts per 15 minutes per IP for restore
const restoreLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many recovery attempts. Please wait 15 minutes before trying again.' }
});

// Rate limiter for claim and magic link
const pilotActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a while before trying again.' }
});

// Unambiguous alphabet (no 0/O/1/I)
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRecoveryCode() {
  const bytes = crypto.randomBytes(16);
  let raw = '';
  for (let i = 0; i < 16; i++) {
    raw += CHARSET[bytes[i] % CHARSET.length];
  }
  return `PF-${raw.substring(0, 4)}-${raw.substring(4, 8)}-${raw.substring(8, 12)}-${raw.substring(12, 16)}`;
}

function hashCode(code) {
  const clean = code.trim().toUpperCase();
  return crypto.createHash('sha256').update(clean).digest('hex');
}

// Basic profanity check
const PROFANITY_LIST = ['fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'nigger', 'faggot', 'bastard', 'whore', 'slut'];
function containsProfanity(text = '') {
  const lower = text.toLowerCase().replace(/[^a-z]/g, '');
  return PROFANITY_LIST.some(word => lower.includes(word));
}

// Helper safe JSON parse
function safeParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// ==========================================
// 1. CLAIM PILOT PASS PROFILE
// ==========================================
router.post('/claim', pilotActionLimiter, async (req, res) => {
  try {
    const { callsign, email, visitor_id, preferences = {}, wishlist = [] } = req.body;

    if (!callsign || typeof callsign !== 'string') {
      return res.status(400).json({ error: 'Callsign is required.' });
    }

    const cleanCallsign = callsign.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,20}$/.test(cleanCallsign)) {
      return res.status(400).json({
        error: 'Callsign must be 3–20 characters and contain only letters, numbers, hyphens, and underscores.'
      });
    }

    if (containsProfanity(cleanCallsign)) {
      return res.status(400).json({ error: 'Callsign contains prohibited words. Please choose another.' });
    }

    if (!visitor_id || typeof visitor_id !== 'string') {
      return res.status(400).json({ error: 'Active visitor_id is required.' });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Check unique callsign
    const existing = await getAsync(`SELECT id FROM pilot_profiles WHERE callsign = ?`, [cleanCallsign]);
    if (existing) {
      return res.status(409).json({ error: 'This callsign is already claimed. Please choose a different handle.' });
    }

    // Generate recovery code
    const recoveryCode = generateRecoveryCode();
    const recoveryHash = hashCode(recoveryCode);

    const result = await runAsync(
      `INSERT INTO pilot_profiles (callsign, email, canonical_visitor_id, recovery_code_hash, preferences, wishlist)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cleanCallsign,
        email ? email.trim().toLowerCase() : null,
        visitor_id,
        recoveryHash,
        JSON.stringify(preferences),
        JSON.stringify(wishlist)
      ]
    );

    const pilotId = result.lastID;

    // Link initial device
    const userAgent = req.headers['user-agent'] || 'Current Browser';
    await runAsync(
      `INSERT OR IGNORE INTO pilot_devices (pilot_id, visitor_id, device_info)
       VALUES (?, ?, ?)`,
      [pilotId, visitor_id, userAgent.substring(0, 100)]
    );

    res.status(201).json({
      success: true,
      callsign: cleanCallsign,
      recoveryCode, // Shown ONCE in UI
      canonical_visitor_id: visitor_id
    });
  } catch (err) {
    console.error('Pilot claim error:', err);
    res.status(500).json({ error: 'Failed to claim pilot profile.' });
  }
});

// ==========================================
// 2. RESTORE PROFILE VIA RECOVERY CODE
// ==========================================
router.post('/restore', restoreLimiter, async (req, res) => {
  try {
    const { recovery_code, visitor_id, device_info = '' } = req.body;

    if (!recovery_code || typeof recovery_code !== 'string') {
      return res.status(400).json({ error: 'Recovery code is required.' });
    }

    if (!visitor_id || typeof visitor_id !== 'string') {
      return res.status(400).json({ error: 'Current visitor identifier is required.' });
    }

    const cleanCode = recovery_code.trim().toUpperCase();
    const inputHash = hashCode(cleanCode);
    const inputBuf = Buffer.from(inputHash, 'hex');

    // Retrieve all active profiles
    const profiles = await allAsync(
      `SELECT id, callsign, email, canonical_visitor_id, recovery_code_hash, failed_attempts, locked_until, preferences, wishlist, created_at
       FROM pilot_profiles`
    );

    let matchedPilot = null;
    for (const p of profiles) {
      if (!p.recovery_code_hash) continue;
      const targetBuf = Buffer.from(p.recovery_code_hash, 'hex');
      if (targetBuf.length === inputBuf.length && crypto.timingSafeEqual(targetBuf, inputBuf)) {
        matchedPilot = p;
        break;
      }
    }

    if (!matchedPilot) {
      return res.status(401).json({ error: 'Invalid recovery code. Please check for typos and try again.' });
    }

    // Check lockout
    if (matchedPilot.locked_until && new Date(matchedPilot.locked_until) > new Date()) {
      return res.status(429).json({
        error: 'Too many failed recovery attempts on this profile. Temporarily locked for 15 minutes.'
      });
    }

    // Reset failed attempts upon successful authentication
    await runAsync(
      `UPDATE pilot_profiles SET failed_attempts = 0, locked_until = NULL, last_active = CURRENT_TIMESTAMP WHERE id = ?`,
      [matchedPilot.id]
    );

    // Link current visitor_id as a hardware device
    const devInfo = device_info || req.headers['user-agent'] || 'Linked Device';
    await runAsync(
      `INSERT OR REPLACE INTO pilot_devices (pilot_id, visitor_id, device_info, last_used)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [matchedPilot.id, visitor_id, devInfo.substring(0, 100)]
    );

    // Retrieve locked A/B variants from canonical profile if present
    const assignments = await allAsync(
      `SELECT e.exp_key, a.variant 
       FROM experiment_assignments a
       JOIN experiments e ON a.experiment_id = e.id
       WHERE a.visitor_id = ?`,
      [matchedPilot.canonical_visitor_id]
    );
    const assignedVariants = {};
    assignments.forEach(a => { assignedVariants[a.exp_key] = a.variant; });

    res.json({
      success: true,
      canonical_visitor_id: matchedPilot.canonical_visitor_id,
      callsign: matchedPilot.callsign,
      email: matchedPilot.email,
      preferences: safeParse(matchedPilot.preferences, {}),
      wishlist: safeParse(matchedPilot.wishlist, []),
      assignedVariants,
      first_seen: matchedPilot.created_at
    });
  } catch (err) {
    console.error('Pilot restore error:', err);
    res.status(500).json({ error: 'Recovery authentication failed.' });
  }
});

// ==========================================
// 3. MAGIC LINK RESTORE (OPTIONAL)
// ==========================================
router.post('/magic-link', pilotActionLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pilot = await getAsync(`SELECT id, callsign, email FROM pilot_profiles WHERE email = ?`, [cleanEmail]);

    if (pilot) {
      const rawToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await runAsync(
        `UPDATE pilot_profiles SET magic_token_hash = ?, magic_token_expires = datetime('now', '+15 minutes') WHERE id = ?`,
        [tokenHash, pilot.id]
      );

      // In development mode, print link directly to server console
      console.log(`\n======================================================`);
      console.log(`[PILOT PASS MAGIC LINK] For ${pilot.email} (Callsign: ${pilot.callsign})`);
      console.log(`Restore URL: http://localhost:3333/restore?token=${rawToken}&callsign=${encodeURIComponent(pilot.callsign)}`);
      console.log(`(Token valid for 15 minutes)`);
      console.log(`======================================================\n`);
    }

    // Always generic response to prevent email enumeration
    res.json({
      success: true,
      message: 'If a Pilot profile is registered with that email, a restore link has been dispatched (and logged to the development console).'
    });
  } catch (err) {
    console.error('Magic link error:', err);
    res.status(500).json({ error: 'Failed to process restore request.' });
  }
});

// Verify magic link token
router.post('/restore-token', restoreLimiter, async (req, res) => {
  try {
    const { token, visitor_id, device_info = '' } = req.body;
    if (!token || !visitor_id) {
      return res.status(400).json({ error: 'Token and visitor identifier are required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const pilot = await getAsync(
      `SELECT * FROM pilot_profiles 
       WHERE magic_token_hash = ? 
       AND magic_token_expires > datetime('now')`,
      [tokenHash]
    );

    if (!pilot) {
      return res.status(401).json({ error: 'This restore link has expired or has already been used.' });
    }

    // Invalidate single-use token
    await runAsync(
      `UPDATE pilot_profiles SET magic_token_hash = NULL, magic_token_expires = NULL, last_active = CURRENT_TIMESTAMP WHERE id = ?`,
      [pilot.id]
    );

    // Link device
    const devInfo = device_info || req.headers['user-agent'] || 'Linked Device';
    await runAsync(
      `INSERT OR REPLACE INTO pilot_devices (pilot_id, visitor_id, device_info, last_used)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [pilot.id, visitor_id, devInfo.substring(0, 100)]
    );

    res.json({
      success: true,
      canonical_visitor_id: pilot.canonical_visitor_id,
      callsign: pilot.callsign,
      email: pilot.email,
      preferences: safeParse(pilot.preferences, {}),
      wishlist: safeParse(pilot.wishlist, []),
      first_seen: pilot.created_at
    });
  } catch (err) {
    console.error('Restore token error:', err);
    res.status(500).json({ error: 'Failed to authenticate restore link.' });
  }
});

// ==========================================
// 4. GET CURRENT VISITOR'S PILOT PROFILE
// ==========================================
router.get('/me', async (req, res) => {
  try {
    const { visitor_id } = req.query;
    if (!visitor_id) {
      return res.status(400).json({ error: 'visitor_id query param is required.' });
    }

    // Find profile linked by canonical_visitor_id OR in pilot_devices
    const pilot = await getAsync(
      `SELECT p.id, p.callsign, p.email, p.canonical_visitor_id, p.preferences, p.wishlist, p.created_at, p.last_active,
              v.total_visits, v.first_seen
       FROM pilot_profiles p
       LEFT JOIN visitor_profiles v ON p.canonical_visitor_id = v.visitor_id
       LEFT JOIN pilot_devices d ON p.id = d.pilot_id
       WHERE p.canonical_visitor_id = ? OR d.visitor_id = ?
       LIMIT 1`,
      [visitor_id, visitor_id]
    );

    if (!pilot) {
      return res.json({ claimed: false, profile: null });
    }

    // Fetch linked devices
    const devices = await allAsync(
      `SELECT id, visitor_id, device_info, linked_at, last_used FROM pilot_devices WHERE pilot_id = ? ORDER BY last_used DESC`,
      [pilot.id]
    );

    // Fetch locked A/B variants
    const assignments = await allAsync(
      `SELECT e.exp_key, a.variant 
       FROM experiment_assignments a
       JOIN experiments e ON a.experiment_id = e.id
       WHERE a.visitor_id = ?`,
      [pilot.canonical_visitor_id]
    );
    const assignedVariants = {};
    assignments.forEach(a => { assignedVariants[a.exp_key] = a.variant; });

    res.json({
      claimed: true,
      profile: {
        id: pilot.id,
        callsign: pilot.callsign,
        email: pilot.email,
        canonical_visitor_id: pilot.canonical_visitor_id,
        preferences: safeParse(pilot.preferences, {}),
        wishlist: safeParse(pilot.wishlist, []),
        total_visits: pilot.total_visits || 1,
        first_seen: pilot.first_seen || pilot.created_at,
        last_active: pilot.last_active,
        devices,
        assignedVariants
      }
    });
  } catch (err) {
    console.error('Pilot me error:', err);
    res.status(500).json({ error: 'Failed to retrieve pilot profile.' });
  }
});

// ==========================================
// 5. GENERATE NEW RECOVERY CODE (INVALIDATES OLD)
// ==========================================
router.post('/generate-new-code', pilotActionLimiter, async (req, res) => {
  try {
    const { callsign, current_recovery_code, visitor_id } = req.body;
    if (!callsign || !current_recovery_code) {
      return res.status(400).json({ error: 'Callsign and current recovery code are required.' });
    }

    const currentHash = hashCode(current_recovery_code);
    const inputBuf = Buffer.from(currentHash, 'hex');

    const pilot = await getAsync(`SELECT id, recovery_code_hash FROM pilot_profiles WHERE callsign = ?`, [callsign]);
    if (!pilot) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const targetBuf = Buffer.from(pilot.recovery_code_hash, 'hex');
    if (targetBuf.length !== inputBuf.length || !crypto.timingSafeEqual(targetBuf, inputBuf)) {
      return res.status(401).json({ error: 'Current recovery code is incorrect.' });
    }

    const newCode = generateRecoveryCode();
    const newHash = hashCode(newCode);

    await runAsync(
      `UPDATE pilot_profiles SET recovery_code_hash = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?`,
      [newHash, pilot.id]
    );

    res.json({
      success: true,
      newRecoveryCode: newCode
    });
  } catch (err) {
    console.error('Generate new code error:', err);
    res.status(500).json({ error: 'Failed to roll new recovery code.' });
  }
});

// ==========================================
// 6. UNLINK A DEVICE
// ==========================================
router.delete('/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { visitor_id } = req.query;

    if (!visitor_id) {
      return res.status(400).json({ error: 'visitor_id is required.' });
    }

    // Verify requesting visitor owns this profile
    const device = await getAsync(
      `SELECT d.id, d.pilot_id, p.canonical_visitor_id
       FROM pilot_devices d
       JOIN pilot_profiles p ON d.pilot_id = p.id
       WHERE d.id = ?`,
      [id]
    );

    if (!device) {
      return res.status(404).json({ error: 'Device record not found.' });
    }

    // Can only delete if caller is connected to this profile
    const isOwner = await getAsync(
      `SELECT 1 FROM pilot_devices WHERE pilot_id = ? AND visitor_id = ?
       UNION
       SELECT 1 FROM pilot_profiles WHERE id = ? AND canonical_visitor_id = ?`,
      [device.pilot_id, visitor_id, device.pilot_id, visitor_id]
    );

    if (!isOwner) {
      return res.status(403).json({ error: 'Not authorized to unlink this device.' });
    }

    await runAsync(`DELETE FROM pilot_devices WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Device unlinked.' });
  } catch (err) {
    console.error('Unlink device error:', err);
    res.status(500).json({ error: 'Failed to unlink device.' });
  }
});

// ==========================================
// 7. UPDATE PREFERENCES & WISHLIST
// ==========================================
router.put('/preferences', async (req, res) => {
  try {
    const { visitor_id, preferences, wishlist } = req.body;
    if (!visitor_id) {
      return res.status(400).json({ error: 'visitor_id is required.' });
    }

    // Locate pilot profile
    const pilot = await getAsync(
      `SELECT p.id, p.preferences, p.wishlist
       FROM pilot_profiles p
       LEFT JOIN pilot_devices d ON p.id = d.pilot_id
       WHERE p.canonical_visitor_id = ? OR d.visitor_id = ?
       LIMIT 1`,
      [visitor_id, visitor_id]
    );

    if (!pilot) {
      return res.status(404).json({ error: 'Pilot profile not found for this visitor.' });
    }

    const currentPrefs = safeParse(pilot.preferences, {});
    const currentWishlist = safeParse(pilot.wishlist, []);

    const updatedPrefs = preferences !== undefined ? preferences : currentPrefs;
    const updatedWishlist = wishlist !== undefined ? wishlist : currentWishlist;

    await runAsync(
      `UPDATE pilot_profiles SET preferences = ?, wishlist = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?`,
      [JSON.stringify(updatedPrefs), JSON.stringify(updatedWishlist), pilot.id]
    );

    res.json({
      success: true,
      preferences: updatedPrefs,
      wishlist: updatedWishlist
    });
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

// ==========================================
// 8. DELETE PROFILE & DATA
// ==========================================
router.delete('/me', async (req, res) => {
  try {
    const { callsign, recovery_code } = req.body;
    if (!callsign || !recovery_code) {
      return res.status(400).json({ error: 'Callsign and recovery code are required to delete profile.' });
    }

    const codeHash = hashCode(recovery_code);
    const inputBuf = Buffer.from(codeHash, 'hex');

    const pilot = await getAsync(`SELECT id, recovery_code_hash FROM pilot_profiles WHERE callsign = ?`, [callsign]);
    if (!pilot) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const targetBuf = Buffer.from(pilot.recovery_code_hash, 'hex');
    if (targetBuf.length !== inputBuf.length || !crypto.timingSafeEqual(targetBuf, inputBuf)) {
      return res.status(401).json({ error: 'Incorrect recovery code. Profile was not deleted.' });
    }

    await runAsync(`DELETE FROM pilot_devices WHERE pilot_id = ?`, [pilot.id]);
    await runAsync(`DELETE FROM pilot_profiles WHERE id = ?`, [pilot.id]);

    res.json({ success: true, message: 'Pilot profile and linked devices have been permanently deleted.' });
  } catch (err) {
    console.error('Delete pilot profile error:', err);
    res.status(500).json({ error: 'Failed to delete profile.' });
  }
});

module.exports = router;
