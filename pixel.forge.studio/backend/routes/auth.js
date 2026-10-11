const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAsync, allAsync, runAsync } = require('../database');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await getAsync(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`, [email.trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// GET /api/auth/me (Current user session)
router.get('/me', requireAuth(), async (req, res) => {
  try {
    const user = await getAsync(`SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?`, [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// GET /api/auth/users (Admin only)
router.get('/users', requireAuth(['admin']), async (req, res) => {
  try {
    const users = await allAsync(`SELECT id, name, email, role, avatar, created_at FROM users ORDER BY id ASC`);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

module.exports = router;
