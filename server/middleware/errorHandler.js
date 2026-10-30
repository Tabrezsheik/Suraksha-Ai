/**
 * errorHandler — SURAKSHA AI
 *
 * Centralized error handling middleware (Rules.md §5).
 * Must be registered as the LAST middleware in server.js.
 *
 * Handles:
 * - Mongoose ValidationError
 * - MongoDB duplicate key (code 11000)
 * - JWT errors
 * - Generic server errors
 *
 * Never exposes stack traces in production.
 * Returns the standard { success, message, error: { code } } format.
 */
const errorHandler = (err, req, res, next) => {
  // Log server-side with context (never log passwords or tokens)
  console.error(`[Error] ${req.method} ${req.path} — ${err.message}`);

  // Default
  let statusCode = err.statusCode || 500;
  let message = 'An unexpected error occurred';
  let errorCode = 'SERVER_ERROR';

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    const fields = Object.keys(err.errors).map((field) => ({
      field,
      message: err.errors[field].message
    }));
    return res.status(statusCode).json({
      success: false,
      message,
      error: { code: errorCode, fields }
    });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with this value already exists';
    errorCode = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyPattern || {})[0];
    if (field === 'email') {
      message = 'An account with this email already exists';
      errorCode = 'EMAIL_ALREADY_EXISTS';
    }
    return res.status(statusCode).json({
      success: false,
      message,
      error: { code: errorCode }
    });
  }

  // MongoDB connection / selection / buffering errors
  if (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoServerSelectionError' ||
    (err.message && (err.message.includes('buffering timed out') || err.message.includes('MongoDB Atlas') || err.message.includes('connect')))
  ) {
    statusCode = 503;
    message = 'Database connection unavailable. Please ensure your IP address is whitelisted in MongoDB Atlas.';
    errorCode = 'DATABASE_UNAVAILABLE';
    return res.status(statusCode).json({
      success: false,
      message,
      error: { code: errorCode }
    });
  }

  // JWT errors (should normally be caught in authMiddleware, but belt-and-suspenders)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
    errorCode = 'AUTH_TOKEN_INVALID';
    return res.status(statusCode).json({
      success: false,
      message,
      error: { code: errorCode }
    });
  }

  // Custom application errors thrown with statusCode
  if (err.statusCode) {
    message = err.message || message;
    errorCode = err.errorCode || errorCode;
  }

  // Never expose stack traces in production
  const response = {
    success: false,
    message,
    error: { code: errorCode }
  };

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
