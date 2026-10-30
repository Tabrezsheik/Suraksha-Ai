const authController = require('./controllers/auth.controller');
const authService = require('./services/authService');

async function runAuthUnitTests() {
  console.log('=== SURAKSHA AI AUTH CONTROLLER & ROUTE TESTS ===\n');
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

  // Mock helpers
  const mockResponse = () => {
    const res = {};
    res.statusCode = null;
    res.body = null;
    res.status = function (code) {
      this.statusCode = code;
      return this;
    };
    res.json = function (data) {
      this.body = data;
      return this;
    };
    return res;
  };

  // 1. authController.register
  await runTest('authController.register: returns 201 with user and token', async () => {
    const originalRegister = authService.registerUser;
    authService.registerUser = async (name, email, password, phone) => ({
      user: { id: 'usr_test_1', name, email, role: 'user' },
      token: 'jwt_mock_token_register'
    });

    const req = { body: { name: 'Sarah', email: 'sarah@example.com', password: 'Password123!', phone: '+919999999999' } };
    const res = mockResponse();
    const next = (err) => { if (err) throw err; };

    await authController.register(req, res, next);

    authService.registerUser = originalRegister;

    if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}`);
    if (!res.body.success || res.body.data.token !== 'jwt_mock_token_register') {
      throw new Error(`Unexpected body: ${JSON.stringify(res.body)}`);
    }
  });

  // 2. authController.login
  await runTest('authController.login: returns 200 with user and token', async () => {
    const originalLogin = authService.loginUser;
    authService.loginUser = async (email, password) => ({
      user: { id: 'usr_test_1', name: 'Sarah', email, role: 'user' },
      token: 'jwt_mock_token_login'
    });

    const req = { body: { email: 'sarah@example.com', password: 'Password123!' } };
    const res = mockResponse();
    const next = (err) => { if (err) throw err; };

    await authController.login(req, res, next);

    authService.loginUser = originalLogin;

    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (!res.body.success || res.body.data.token !== 'jwt_mock_token_login') {
      throw new Error(`Unexpected body: ${JSON.stringify(res.body)}`);
    }
  });

  // 3. authController.getMe
  await runTest('authController.getMe: returns 200 with current user data', async () => {
    const originalGetUser = authService.getUserById;
    authService.getUserById = async (id) => ({
      id,
      name: 'Sarah',
      email: 'sarah@example.com',
      role: 'user'
    });

    const req = { user: { id: 'usr_test_1' } };
    const res = mockResponse();
    const next = (err) => { if (err) throw err; };

    await authController.getMe(req, res, next);

    authService.getUserById = originalGetUser;

    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (!res.body.success || res.body.data.email !== 'sarah@example.com') {
      throw new Error(`Unexpected body: ${JSON.stringify(res.body)}`);
    }
  });

  // 4. authController.logout
  await runTest('authController.logout: returns 200 with logout confirmation', async () => {
    const req = {};
    const res = mockResponse();

    await authController.logout(req, res);

    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (!res.body.success || !res.body.message.includes('Logged out')) {
      throw new Error(`Unexpected body: ${JSON.stringify(res.body)}`);
    }
  });

  console.log(`\n=== AUTH CONTROLLER RESULTS: ${passCount} / ${testCount} PASSED ===`);
  process.exit(passCount === testCount ? 0 : 1);
}

runAuthUnitTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
