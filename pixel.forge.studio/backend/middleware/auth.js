const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pixelforge-super-secret-cyber-key-2099';

const requireAuth = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }
  };
};

module.exports = {
  JWT_SECRET,
  requireAuth
};
