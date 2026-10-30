const jwt = require('jsonwebtoken');

/**
 * authMiddleware — SURAKSHA AI
 *
 * Verifies the JWT from Authorization: Bearer <token> header.
 * Attaches req.user = { id, email, role } from the verified token payload.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
      error: { code: 'AUTH_TOKEN_MISSING' }
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token format.',
      error: { code: 'AUTH_TOKEN_MISSING' }
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
        error: { code: 'AUTH_TOKEN_EXPIRED' }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.',
      error: { code: 'AUTH_TOKEN_INVALID' }
    });
  }
};

/**
 * optionalAuth — Attaches req.user if token valid, otherwise defaults to guest.
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      return next();
    } catch (e) {}
  }
  req.user = { id: 'guest', role: 'guest' };
  next();
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;
