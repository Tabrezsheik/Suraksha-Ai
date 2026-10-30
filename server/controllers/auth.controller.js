const authService = require('../services/authService');

/**
 * auth.controller — SURAKSHA AI
 *
 * Thin HTTP controller (Rules.md §4 — controllers layer).
 * Reads validated request data, calls authService, returns standard responses.
 * Business logic lives in authService — not here.
 *
 * Standard response formats from Rules.md §5.
 */

/**
 * POST /api/auth/register
 * Public — no auth required
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const { user, token } = await authService.registerUser(name, email, password, phone);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, token }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Public — no auth required
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { user, token } = await authService.loginUser(email, password);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, token }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Protected — requires valid JWT
 * Identity comes from req.user (set by authMiddleware from verified JWT).
 * Never trusts client-supplied userId.
 */
const getMe = async (req, res, next) => {
  try {
    // req.user.id is from the verified JWT — not from client input
    const user = await authService.getUserById(req.user.id);

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Protected — requires valid JWT
 *
 * MVP: Stateless logout. The client is responsible for discarding the token.
 * This endpoint confirms token validity and returns success.
 * The API contract is stable for future server-side token blocklist integration.
 */
const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout
};
