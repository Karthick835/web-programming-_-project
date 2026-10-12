const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getAsync, allAsync, runAsync } = require('../database');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

// Rate limiter: 5 attempts per 15 minutes per IP
const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this IP. Please try again after 15 minutes.' }
});

/**
 * POST /api/auth/login
 * Rate limited: 5 attempts per 15 min per IP and per account.
 * Lockout: 15 minutes upon 5 failed attempts.
 * Returns generic "Invalid email or password." error message on authentication failure.
 * JWT token expires after 2 hours.
 */
router.post('/login', loginIpLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Fetch user by email
    const user = await getAsync(
      `SELECT id, name, email, password_hash, role, avatar, failed_attempts, locked_until 
       FROM users 
       WHERE LOWER(email) = ?`,
      [cleanEmail]
    );

    // 2. Check per-account lockout if user exists
    if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs = new Date(user.locked_until) - new Date();
      const remainingMin = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
      return res.status(429).json({
        error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMin} minute(s).`
      });
    }

    // 3. Verify password with bcrypt (never log plain password)
    const isMatch = user ? bcrypt.compareSync(password, user.password_hash) : false;

    if (!user || !isMatch) {
      if (user) {
        const nextFailed = (user.failed_attempts || 0) + 1;
        let lockTime = null;
        if (nextFailed >= 5) {
          lockTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }
        await runAsync(
          `UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?`,
          [nextFailed, lockTime, user.id]
        );

        if (lockTime) {
          return res.status(429).json({
            error: 'Account is temporarily locked due to too many failed login attempts. Please try again after 15 minutes.'
          });
        }
      }

      // Generic error message for both wrong email and wrong password to prevent user enumeration
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 4. Successful login: reset failed attempts & lockout
    await runAsync(
      `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?`,
      [user.id]
    );

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    };

    // JWT token expires after 2 hours
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });

    res.json({
      message: 'Login successful',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

/**
 * GET /api/auth/me (Current user session profile)
 * Verifies JWT token and role on the server.
 */
router.get('/me', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const user = await getAsync(
      `SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

/**
 * GET /api/auth/users (Admin only)
 * Lists staff users without leaking password hashes.
 */
router.get('/users', requireAuth(['admin']), async (req, res) => {
  try {
    const users = await allAsync(
      `SELECT id, name, email, role, avatar, created_at FROM users ORDER BY id ASC`
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

/**
 * PUT /api/auth/change-password
 * Requires current password verification and securely hashes the new password with bcrypt.
 * Never logs or exposes plain passwords.
 */
router.put('/change-password', requireAuth(['admin', 'editor']), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current password and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    // Fetch existing user password hash
    const user = await getAsync(`SELECT id, password_hash FROM users WHERE id = ?`, [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    const isCurrentMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isCurrentMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    // Hash new password using bcrypt (10 rounds)
    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    // Update in database
    await runAsync(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [newHash, req.user.id]
    );

    res.json({
      success: true,
      message: 'Password updated successfully. Please use your new password next time you sign in.'
    });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

module.exports = router;
