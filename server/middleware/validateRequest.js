const { validationResult } = require('express-validator');

/**
 * validateRequest — SURAKSHA AI
 *
 * Shared validation handler middleware (Rules.md §6).
 * Run after express-validator chains. Returns 422 with field-level
 * errors if any validation rule failed.
 *
 * Usage in route:
 *   router.post('/register', [...validators], validateRequest, controller.register)
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const fields = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        fields
      }
    });
  }

  next();
};

module.exports = validateRequest;
