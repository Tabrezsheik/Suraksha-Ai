const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * authService — SURAKSHA AI
 *
 * Authentication business logic (Rules.md §4 — services layer).
 * Controllers call these functions; HTTP concerns stay in the controller.
 *
 * Security rules enforced here:
 * - Passwords hashed with bcrypt before storage (saltRounds=12)
 * - passwordHash never returned in user objects
 * - JWT payload contains only { id, email, role } — no sensitive data
 * - JWT secret read from environment variable only — never hardcoded
 */

const SALT_ROUNDS = 12;

/**
 * Generates a signed JWT for the given user.
 * @param {string} id  - MongoDB ObjectId (as string)
 * @param {string} email - User's email
 * @param {string} role - User's role
 * @returns {string} Signed JWT
 */
const generateToken = (id, email, role) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Formats a safe user object for API responses.
 * Explicitly excludes passwordHash and internal fields.
 * @param {Object} user - Mongoose User document
 * @returns {Object} Safe user data
 */
const formatUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone || null,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt
});

/**
 * Registers a new user.
 * @param {string} name
 * @param {string} email
 * @param {string} password  - Plain text (hashed here before storage)
 * @param {string} [phone]   - Optional
 * @returns {{ user: Object, token: string }}
 */
const registerUser = async (name, email, password, phone) => {
  // Check for duplicate email before hashing (fast fail)
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.statusCode = 409;
    err.errorCode = 'EMAIL_ALREADY_EXISTS';
    throw err;
  }

  // Hash password — NEVER store plain text
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user document
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    phone: phone ? phone.trim() : null,
    role: 'user',
    isActive: true
  });

  const token = generateToken(user._id.toString(), user.email, user.role);

  return { user: formatUser(user), token };
};

/**
 * Authenticates a user with email and password.
 * @param {string} email
 * @param {string} password - Plain text (compared against stored hash)
 * @returns {{ user: Object, token: string }}
 */
const loginUser = async (email, password) => {
  // Must explicitly select passwordHash (it is excluded by default)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  // Use generic error message to prevent email enumeration
  if (!user || !user.isActive) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.errorCode = 'INVALID_CREDENTIALS';
    throw err;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.errorCode = 'INVALID_CREDENTIALS';
    throw err;
  }

  const token = generateToken(user._id.toString(), user.email, user.role);

  return { user: formatUser(user), token };
};

/**
 * Retrieves the full user record for /me endpoints.
 * Uses the id from the verified JWT (never from client input).
 * @param {string} userId - From req.user.id (verified JWT)
 * @returns {Object} Safe user data
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.errorCode = 'USER_NOT_FOUND';
    throw err;
  }

  return formatUser(user);
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  generateToken
};
