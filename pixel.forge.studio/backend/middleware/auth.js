const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pixelforge-super-secret-cyber-key-2099';

/**
 * requireAuth middleware
 * Verifies JWT token and role authorization on protected admin routes.
 *
 * @param {string[]} roles Allowed roles, e.g. ['admin', 'editor']. Defaults to ['admin', 'editor']
 */
const requireAuth = (roles = ['admin', 'editor']) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Authentication token missing.' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      // Verify user has an allowed role
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }
  };
};

module.exports = {
  JWT_SECRET,
  requireAuth
};
