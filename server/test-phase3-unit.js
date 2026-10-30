const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Set dummy JWT secret for test if not in environment
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_suraksha_ai_2026';
process.env.JWT_EXPIRES_IN = '7d';

const User = require('./models/User');
const TrustedContact = require('./models/TrustedContact');
const userService = require('./services/userService');
const contactService = require('./services/contactService');
const authMiddleware = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');
const validateRequest = require('./middleware/validateRequest');

async function runUnitTests() {
  console.log('=== SURAKSHA AI PHASE 3 UNIT & INTEGRATION VERIFICATION ===\n');
  let testCount = 0;
  let passCount = 0;

  const runTest = (name, testFn) => {
    testCount++;
    try {
      testFn();
      console.log(`[PASS] Test #${testCount}: ${name}`);
      passCount++;
    } catch (err) {
      console.log(`[FAIL] Test #${testCount}: ${name}`);
      console.error('       Reason:', err.message);
    }
  };

  const runAsyncTest = async (name, testFn) => {
    testCount++;
    try {
      await testFn();
      console.log(`[PASS] Test #${testCount}: ${name}`);
      passCount++;
    } catch (err) {
      console.log(`[FAIL] Test #${testCount}: ${name}`);
      console.error('       Reason:', err.message);
    }
  };

  // -------------------------------------------------------------
  // 1. Model Validation: User Schema
  // -------------------------------------------------------------
  runTest('User Model: requires name and email', () => {
    const invalidUser = new User({});
    const err = invalidUser.validateSync();
    if (!err || !err.errors.name || !err.errors.email) {
      throw new Error('Expected name and email validation errors');
    }
  });

  runTest('User Model: role must be user or dashboard_operator', () => {
    const invalidUser = new User({
      name: 'Test',
      email: 'test@example.com',
      passwordHash: 'hash123',
      role: 'invalid_role'
    });
    const err = invalidUser.validateSync();
    if (!err || !err.errors.role) {
      throw new Error('Expected role validation error');
    }
  });

  // -------------------------------------------------------------
  // 2. Model Validation: TrustedContact Schema
  // -------------------------------------------------------------
  runTest('TrustedContact Model: requires user, name, and phone', () => {
    const invalidContact = new TrustedContact({});
    const err = invalidContact.validateSync();
    if (!err || !err.errors.user || !err.errors.name || !err.errors.phone) {
      throw new Error('Expected user, name, and phone validation errors');
    }
  });

  runTest('TrustedContact Model: validates relationship enum', () => {
    const invalidContact = new TrustedContact({
      user: new mongoose.Types.ObjectId(),
      name: 'Mom',
      phone: '+919999999999',
      relationship: 'boss' // Not in parent, friend, relative, other
    });
    const err = invalidContact.validateSync();
    if (!err || !err.errors.relationship) {
      throw new Error('Expected relationship validation error');
    }
  });

  runTest('TrustedContact Model: accepts valid relationship values', () => {
    ['parent', 'friend', 'relative', 'other'].forEach((rel) => {
      const validContact = new TrustedContact({
        user: new mongoose.Types.ObjectId(),
        name: 'Contact',
        phone: '+919999999999',
        relationship: rel
      });
      const err = validContact.validateSync();
      if (err) {
        throw new Error(`Unexpected error for relationship "${rel}": ${err.message}`);
      }
      if (validContact.isActive !== true) {
        throw new Error('Default isActive must be true');
      }
    });
  });

  runTest('TrustedContact Model: indexes verified', () => {
    const indexes = TrustedContact.schema.indexes();
    const hasUserActiveIndex = indexes.some(
      (idx) => idx[0].user === 1 && idx[0].isActive === 1
    );
    if (!hasUserActiveIndex) {
      throw new Error('Missing compound index { user: 1, isActive: 1 }');
    }
  });

  // -------------------------------------------------------------
  // 3. Service Layer: userService formatProfile & update logic
  // -------------------------------------------------------------
  runTest('userService: formatProfile excludes passwordHash and internal fields', () => {
    const mockUserDoc = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Jane Doe',
      email: 'jane@example.com',
      passwordHash: 'secret_bcrypt_hash_never_leak',
      phone: '+919876543210',
      ageGroup: '25-34',
      role: 'user',
      profilePicture: null,
      isActive: true,
      createdAt: new Date('2026-08-18T10:00:00Z'),
      updatedAt: new Date('2026-08-18T10:00:00Z')
    };

    const formatted = userService.formatProfile(mockUserDoc);
    if (formatted.passwordHash !== undefined) {
      throw new Error('Security Violation: passwordHash must not be in profile output!');
    }
    if (formatted.id !== '507f1f77bcf86cd799439011' || formatted.name !== 'Jane Doe' || formatted.email !== 'jane@example.com') {
      throw new Error(`Incorrect formatted profile: ${JSON.stringify(formatted)}`);
    }
  });

  // -------------------------------------------------------------
  // 4. Service Layer: contactService formatContact & active filter
  // -------------------------------------------------------------
  runTest('contactService: formatContact formats id, name, phone, relationship, and isActive', () => {
    const mockContactDoc = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439022'),
      user: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Father',
      phone: '+919999999998',
      email: 'father@example.com',
      relationship: 'parent',
      isActive: true,
      createdAt: new Date('2026-08-18T10:00:00Z'),
      updatedAt: new Date('2026-08-18T10:00:00Z')
    };

    const formatted = contactService.formatContact(mockContactDoc);
    if (formatted.id !== '507f1f77bcf86cd799439022' || formatted.name !== 'Father' || formatted.relationship !== 'parent' || formatted.isActive !== true) {
      throw new Error(`Incorrect formatted contact: ${JSON.stringify(formatted)}`);
    }
  });

  // -------------------------------------------------------------
  // 5. Middleware: authMiddleware JWT verification & error handling
  // -------------------------------------------------------------
  runTest('authMiddleware: rejects missing Authorization header', () => {
    let statusCode = null;
    let responseBody = null;
    const req = { headers: {} };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (body) => { responseBody = body; }
        };
      }
    };
    const next = () => { throw new Error('next() should not be called'); };

    authMiddleware(req, res, next);
    if (statusCode !== 401 || responseBody.error.code !== 'AUTH_TOKEN_MISSING') {
      throw new Error(`Expected 401 AUTH_TOKEN_MISSING, got ${statusCode}`);
    }
  });

  runTest('authMiddleware: rejects invalid token', () => {
    let statusCode = null;
    let responseBody = null;
    const req = { headers: { authorization: 'Bearer invalid_token_123' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (body) => { responseBody = body; }
        };
      }
    };
    const next = () => { throw new Error('next() should not be called'); };

    authMiddleware(req, res, next);
    if (statusCode !== 401 || responseBody.error.code !== 'AUTH_TOKEN_INVALID') {
      throw new Error(`Expected 401 AUTH_TOKEN_INVALID, got ${statusCode}`);
    }
  });

  runTest('authMiddleware: attaches req.user for valid JWT', () => {
    const token = jwt.sign(
      { id: '507f1f77bcf86cd799439011', email: 'test@example.com', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    authMiddleware(req, res, next);
    if (!nextCalled || !req.user || req.user.id !== '507f1f77bcf86cd799439011') {
      throw new Error(`req.user not set correctly: ${JSON.stringify(req.user)}`);
    }
  });

  // -------------------------------------------------------------
  // 6. Middleware: errorHandler standard error responses
  // -------------------------------------------------------------
  runTest('errorHandler: formats Mongoose ValidationError to 422', () => {
    let statusCode = null;
    let responseBody = null;
    const err = {
      name: 'ValidationError',
      errors: {
        phone: { message: 'Phone number is required' }
      }
    };
    const req = { method: 'POST', path: '/api/contacts' };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (body) => { responseBody = body; }
        };
      }
    };

    errorHandler(err, req, res, () => {});
    if (statusCode !== 422 || responseBody.error.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 422 VALIDATION_ERROR, got ${statusCode}`);
    }
  });

  runTest('errorHandler: formats MongoDB duplicate key (11000) to 409', () => {
    let statusCode = null;
    let responseBody = null;
    const err = {
      code: 11000,
      keyPattern: { email: 1 }
    };
    const req = { method: 'POST', path: '/api/auth/register' };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (body) => { responseBody = body; }
        };
      }
    };

    errorHandler(err, req, res, () => {});
    if (statusCode !== 409 || responseBody.error.code !== 'EMAIL_ALREADY_EXISTS') {
      throw new Error(`Expected 409 EMAIL_ALREADY_EXISTS, got ${statusCode}`);
    }
  });

  console.log(`\n=== UNIT & INTEGRATION RESULTS: ${passCount} / ${testCount} PASSED ===`);
  process.exit(passCount === testCount ? 0 : 1);
}

runUnitTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
