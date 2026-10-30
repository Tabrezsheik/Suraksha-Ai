const BASE_URL = 'http://localhost:5000/api';

async function runPhase3Tests() {
  console.log('=== SURAKSHA AI PHASE 3 (USER & TRUSTED CIRCLE) VERIFICATION TESTS ===\n');
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

  const user1Email = `user1_${Date.now()}@example.com`;
  const user2Email = `user2_${Date.now()}@example.com`;
  let user1Token = null;
  let user2Token = null;
  let createdContactId = null;

  // -------------------------------------------------------------
  // REGRESSION: Phase 1 & Phase 2 Tests
  // -------------------------------------------------------------
  await runTest('Phase 1 health check regression (/api/health)', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (data.success !== true || !data.message.includes('running')) {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  await runTest('Phase 2 registration for User 1', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User One',
        email: user1Email,
        password: 'Password123!',
        phone: '+919876543210'
      })
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    if (!data.data.token) throw new Error('Token missing');
    user1Token = data.data.token;
  });

  await runTest('Phase 2 registration for User 2 (multi-tenant testing)', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User Two',
        email: user2Email,
        password: 'Password123!',
        phone: '+919123456789'
      })
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    if (!data.data.token) throw new Error('Token missing');
    user2Token = data.data.token;
  });

  // -------------------------------------------------------------
  // PHASE 3: User Profile Tests (GET /api/users/me, PATCH /api/users/me)
  // -------------------------------------------------------------
  await runTest('GET /api/users/me - rejects unauthorized request (no token)', async () => {
    const res = await fetch(`${BASE_URL}/users/me`);
    const data = await res.json();
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    if (data.success !== false || data.error.code !== 'AUTH_TOKEN_MISSING') {
      throw new Error(`Unexpected shape: ${JSON.stringify(data)}`);
    }
  });

  await runTest('GET /api/users/me - returns user profile with valid JWT', async () => {
    const res = await fetch(`${BASE_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (data.success !== true || !data.data || data.data.email !== user1Email.toLowerCase()) {
      throw new Error(`Unexpected user profile data: ${JSON.stringify(data)}`);
    }
    if (data.data.passwordHash !== undefined) {
      throw new Error('Security violation: passwordHash exposed!');
    }
  });

  await runTest('PATCH /api/users/me - validation rejects invalid phone format', async () => {
    const res = await fetch(`${BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        phone: 'invalid-phone-format'
      })
    });
    const data = await res.json();
    if (res.status !== 422) throw new Error(`Expected 422, got ${res.status}`);
    if (data.success !== false || data.error.code !== 'VALIDATION_ERROR') {
      throw new Error(`Unexpected error shape: ${JSON.stringify(data)}`);
    }
  });

  await runTest('PATCH /api/users/me - updates profile fields successfully', async () => {
    const res = await fetch(`${BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        name: 'User One Updated',
        phone: '+919988776655',
        ageGroup: '25-34'
      })
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (data.success !== true || data.data.name !== 'User One Updated' || data.data.phone !== '+919988776655' || data.data.ageGroup !== '25-34') {
      throw new Error(`Unexpected updated data: ${JSON.stringify(data)}`);
    }
  });

  // -------------------------------------------------------------
  // PHASE 3: Trusted Circle Tests (CRUD & Validation)
  // -------------------------------------------------------------
  await runTest('GET /api/contacts - returns empty array for new user', async () => {
    const res = await fetch(`${BASE_URL}/contacts`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (data.success !== true || !Array.isArray(data.data) || data.data.length !== 0) {
      throw new Error(`Expected empty array, got: ${JSON.stringify(data)}`);
    }
  });

  await runTest('POST /api/contacts - validation rejects missing name and invalid phone', async () => {
    const res = await fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        relationship: 'invalid_relationship'
      })
    });
    const data = await res.json();
    if (res.status !== 422) throw new Error(`Expected 422, got ${res.status}`);
    if (data.success !== false || data.error.code !== 'VALIDATION_ERROR') {
      throw new Error(`Unexpected error shape: ${JSON.stringify(data)}`);
    }
  });

  await runTest('POST /api/contacts - successfully adds contact with relationship', async () => {
    const res = await fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        name: 'Mother',
        phone: '+919999999999',
        relationship: 'parent',
        email: 'mother@example.com'
      })
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    if (data.success !== true || !data.data.id || data.data.name !== 'Mother' || data.data.relationship !== 'parent') {
      throw new Error(`Unexpected response shape: ${JSON.stringify(data)}`);
    }
    if (data.data.isActive !== true) {
      throw new Error('Default isActive should be true');
    }
    createdContactId = data.data.id;
  });

  await runTest('GET /api/contacts - returns the newly created contact', async () => {
    const res = await fetch(`${BASE_URL}/contacts`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(data.data) || data.data.length !== 1 || data.data[0].id !== createdContactId) {
      throw new Error(`Unexpected contacts list: ${JSON.stringify(data)}`);
    }
  });

  await runTest('GET /api/contacts/active - returns active contacts for emergency prep', async () => {
    const res = await fetch(`${BASE_URL}/contacts/active`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(data.data) || data.data.length !== 1) {
      throw new Error(`Unexpected active contacts: ${JSON.stringify(data)}`);
    }
  });

  await runTest('PATCH /api/contacts/:contactId - deactivates contact (isActive: false)', async () => {
    const res = await fetch(`${BASE_URL}/contacts/${createdContactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        isActive: false
      })
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (data.success !== true || data.data.isActive !== false) {
      throw new Error(`Expected isActive to be false: ${JSON.stringify(data)}`);
    }
  });

  await runTest('GET /api/contacts/active - inactive contact is omitted from active list', async () => {
    const res = await fetch(`${BASE_URL}/contacts/active`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(data.data) || data.data.length !== 0) {
      throw new Error(`Expected 0 active contacts, got: ${JSON.stringify(data)}`);
    }
  });

  await runTest('PATCH /api/contacts/:contactId - updates name, phone, relationship, and reactivates', async () => {
    const res = await fetch(`${BASE_URL}/contacts/${createdContactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        name: 'Mom (Home)',
        phone: '+919888877777',
        relationship: 'parent',
        isActive: true
      })
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (data.data.name !== 'Mom (Home)' || data.data.phone !== '+919888877777' || data.data.isActive !== true) {
      throw new Error(`Update mismatch: ${JSON.stringify(data)}`);
    }
  });

  // -------------------------------------------------------------
  // SECURITY & MULTI-TENANT ISOLATION TESTS
  // -------------------------------------------------------------
  await runTest('Security: User 2 cannot view User 1 contacts', async () => {
    const res = await fetch(`${BASE_URL}/contacts`, {
      headers: { 'Authorization': `Bearer ${user2Token}` }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (data.data.length !== 0) {
      throw new Error(`Security breach: User 2 received User 1 contacts! ${JSON.stringify(data)}`);
    }
  });

  await runTest('Security: User 2 cannot modify User 1 contact', async () => {
    const res = await fetch(`${BASE_URL}/contacts/${createdContactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2Token}`
      },
      body: JSON.stringify({
        name: 'Hacked Name'
      })
    });
    const data = await res.json();
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}: ${JSON.stringify(data)}`);
    if (data.success !== false) throw new Error('Expected failure');
  });

  await runTest('Security: User 2 cannot delete User 1 contact', async () => {
    const res = await fetch(`${BASE_URL}/contacts/${createdContactId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user2Token}`
      }
    });
    const data = await res.json();
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}: ${JSON.stringify(data)}`);
    if (data.success !== false) throw new Error('Expected failure');
  });

  // -------------------------------------------------------------
  // PHASE 3: Contact Deletion
  // -------------------------------------------------------------
  await runTest('DELETE /api/contacts/:contactId - removes contact from circle', async () => {
    const res = await fetch(`${BASE_URL}/contacts/${createdContactId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (data.success !== true || !data.message.includes('removed')) {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`);
    }
  });

  await runTest('GET /api/contacts - confirms contact has been completely removed', async () => {
    const res = await fetch(`${BASE_URL}/contacts`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (data.data.length !== 0) {
      throw new Error(`Expected 0 contacts after deletion, got: ${JSON.stringify(data)}`);
    }
  });

  console.log(`\n=== PHASE 3 RESULTS: ${passCount} / ${testCount} PASSED ===`);
  process.exit(passCount === testCount ? 0 : 1);
}

runPhase3Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
