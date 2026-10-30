require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth.routes');
const errorHandler = require('./middleware/errorHandler');

let BASE_URL = 'http://localhost:5000/api';
let testServer = null;

async function setupTestServer() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) return;
  } catch (_) {
    // Port 5000 not listening; spin up ephemeral express test server
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  const app = express();
  app.use(express.json());
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Suraksha AI backend API is running',
      timestamp: new Date()
    });
  });
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);

  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      const port = testServer.address().port;
      BASE_URL = `http://localhost:${port}/api`;
      resolve();
    });
  });
}

async function runTests() {
  await setupTestServer();
  console.log('=== SURAKSHA AI AUTHENTICATION VERIFICATION TESTS ===\n');
  let testCount = 0;
  let passCount = 0;

  const runTest = async (name, testFn) => {
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

  // Generate unique email for registration tests to avoid duplicate collisions across runs
  const uniqueEmail = `test_${Date.now()}@example.com`;
  let registeredToken = null;
  let loginToken = null;

  // 1. Health check regression
  await runTest('Phase 1 health check regression (/api/health)', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (data.success !== true || !data.message.includes('running')) {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  // 2. Registration - missing/invalid fields
  await runTest('Registration validation rejects invalid password and format', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'invalid-email',
        password: '123', // Too short, no uppercase, no number
        phone: '1234'    // Invalid format
      })
    });
    const data = await res.json();
    if (res.status !== 422) throw new Error(`Expected status 422, got ${res.status}`);
    if (data.success !== false || data.error.code !== 'VALIDATION_ERROR') {
      throw new Error(`Unexpected error shape: ${JSON.stringify(data)}`);
    }
    if (!data.error.fields || data.error.fields.length === 0) {
      throw new Error('Expected field-level validation errors');
    }
  });

  // 3. Registration - valid data
  await runTest('Registration successfully creates user and returns token', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: uniqueEmail,
        password: 'Password123!',
        phone: '+919999999999'
      })
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}. Body: ${JSON.stringify(data)}`);
    if (data.success !== true || !data.data.token || !data.data.user) {
      throw new Error(`Unexpected response body: ${JSON.stringify(data)}`);
    }
    if (data.data.user.email !== uniqueEmail.toLowerCase()) {
      throw new Error(`Expected email ${uniqueEmail}, got ${data.data.user.email}`);
    }
    if (data.data.user.passwordHash !== undefined) {
      throw new Error('Security Violation: passwordHash exposed in register response!');
    }
    registeredToken = data.data.token;
  });

  // 4. Registration - duplicate email
  await runTest('Registration rejects duplicate email with 409 Conflict', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: uniqueEmail,
        password: 'Password123!',
        phone: '+919999999999'
      })
    });
    const data = await res.json();
    if (res.status !== 409) throw new Error(`Expected status 409, got ${res.status}`);
    if (data.success !== false || data.error.code !== 'EMAIL_ALREADY_EXISTS') {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  // 5. Login - invalid password
  await runTest('Login rejects wrong password with 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'WrongPassword123!'
      })
    });
    const data = await res.json();
    if (res.status !== 401) throw new Error(`Expected status 401, got ${res.status}`);
    if (data.success !== false || data.error.code !== 'INVALID_CREDENTIALS') {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  // 6. Login - correct password
  await runTest('Login succeeds with correct password and returns token', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'Password123!'
      })
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (data.success !== true || !data.data.token || !data.data.user) {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
    if (data.data.user.passwordHash !== undefined) {
      throw new Error('Security Violation: passwordHash exposed in login response!');
    }
    loginToken = data.data.token;
  });

  // 7. GET /me - no token
  await runTest('GET /me rejects requests without token', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`);
    const data = await res.json();
    if (res.status !== 401) throw new Error(`Expected status 401, got ${res.status}`);
    if (data.success !== false || data.error.code !== 'AUTH_TOKEN_MISSING') {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  // 8. GET /me - invalid token
  await runTest('GET /me rejects requests with invalid/malformed token', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': 'Bearer invalid_or_expired_jwt_token_here' }
    });
    const data = await res.json();
    if (res.status !== 401) throw new Error(`Expected status 401, got ${res.status}`);
    if (data.success !== false || data.error.code !== 'AUTH_TOKEN_INVALID') {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  // 9. GET /me - valid token
  // getMe returns { success, data: { id, name, email, role, ... } } per API.md §5.3
  await runTest('GET /me successfully returns user profile with valid token', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${loginToken}` }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (data.success !== true || !data.data || !data.data.id) {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
    const user = data.data;
    if (!user.id || user.email !== uniqueEmail.toLowerCase() || !user.role || !user.createdAt) {
      throw new Error(`User object contains incomplete details: ${JSON.stringify(user)}`);
    }
    if (user.passwordHash !== undefined) {
      throw new Error('Security Violation: passwordHash exposed in /me response!');
    }
  });

  // 10. POST /logout - valid token
  await runTest('POST /logout returns success with valid token', async () => {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${loginToken}` }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (data.success !== true || !data.message.includes('Logged out')) {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  console.log(`\n=== RESULTS: ${passCount} / ${testCount} PASSED ===`);
  if (testServer) testServer.close();
  await mongoose.disconnect();
  process.exit(passCount === testCount ? 0 : 1);
}

runTests().catch(async (err) => {
  console.error('Runner failed:', err);
  if (testServer) testServer.close();
  await mongoose.disconnect();
  process.exit(1);
});
