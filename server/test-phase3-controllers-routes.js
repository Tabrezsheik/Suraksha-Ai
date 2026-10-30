const express = require('express');
const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_suraksha_ai_2026';
process.env.JWT_EXPIRES_IN = '7d';

const usersController = require('./controllers/users.controller');
const contactsController = require('./controllers/contacts.controller');
const userService = require('./services/userService');
const contactService = require('./services/contactService');

async function runControllerAndRouteTests() {
  console.log('=== SURAKSHA AI PHASE 3 CONTROLLER & ROUTE TESTS ===\n');
  let testCount = 0;
  let passCount = 0;

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

  // Helper for mock HTTP response
  const createMockRes = () => {
    const res = {
      statusCode: null,
      body: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.body = data;
        return this;
      }
    };
    return res;
  };

  const userId = '507f1f77bcf86cd799439011';
  const contactId = '507f1f77bcf86cd799439022';

  // 1. users.controller.getProfile
  await runAsyncTest('users.controller.getProfile: returns 200 with user profile', async () => {
    const origGetProfile = userService.getProfile;
    userService.getProfile = async (id) => ({
      id,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+919999999999',
      role: 'user',
      isActive: true
    });

    const req = { user: { id: userId } };
    const res = createMockRes();
    await usersController.getProfile(req, res, (err) => { if (err) throw err; });

    userService.getProfile = origGetProfile;

    if (res.statusCode !== 200 || !res.body.success || res.body.data.name !== 'John Doe') {
      throw new Error(`Unexpected controller output: ${JSON.stringify(res.body)}`);
    }
  });

  // 2. users.controller.updateProfile
  await runAsyncTest('users.controller.updateProfile: returns 200 with updated profile', async () => {
    const origUpdateProfile = userService.updateProfile;
    userService.updateProfile = async (id, data) => ({
      id,
      name: data.name,
      phone: data.phone,
      ageGroup: data.ageGroup,
      role: 'user'
    });

    const req = {
      user: { id: userId },
      body: { name: 'John Doe Updated', phone: '+919888888888', ageGroup: '25-34' }
    };
    const res = createMockRes();
    await usersController.updateProfile(req, res, (err) => { if (err) throw err; });

    userService.updateProfile = origUpdateProfile;

    if (res.statusCode !== 200 || !res.body.success || res.body.data.name !== 'John Doe Updated' || res.body.message !== 'Profile updated successfully') {
      throw new Error(`Unexpected controller output: ${JSON.stringify(res.body)}`);
    }
  });

  // 3. contacts.controller.getContacts
  await runAsyncTest('contacts.controller.getContacts: returns 200 with list of contacts', async () => {
    const origGetContacts = contactService.getContacts;
    contactService.getContacts = async (uId) => [
      { id: contactId, name: 'Mother', phone: '+919999999999', relationship: 'parent', isActive: true }
    ];

    const req = { user: { id: userId } };
    const res = createMockRes();
    await contactsController.getContacts(req, res, (err) => { if (err) throw err; });

    contactService.getContacts = origGetContacts;

    if (res.statusCode !== 200 || !res.body.success || res.body.data.length !== 1) {
      throw new Error(`Unexpected controller output: ${JSON.stringify(res.body)}`);
    }
  });

  // 4. contacts.controller.getActiveContacts
  await runAsyncTest('contacts.controller.getActiveContacts: returns 200 with active contacts', async () => {
    const origGetActiveContacts = contactService.getActiveContacts;
    contactService.getActiveContacts = async (uId) => [
      { id: contactId, name: 'Mother', phone: '+919999999999', relationship: 'parent', isActive: true }
    ];

    const req = { user: { id: userId } };
    const res = createMockRes();
    await contactsController.getActiveContacts(req, res, (err) => { if (err) throw err; });

    contactService.getActiveContacts = origGetActiveContacts;

    if (res.statusCode !== 200 || !res.body.success || res.body.data.length !== 1) {
      throw new Error(`Unexpected controller output: ${JSON.stringify(res.body)}`);
    }
  });

  // 5. contacts.controller.addContact
  await runAsyncTest('contacts.controller.addContact: returns 201 with created contact', async () => {
    const origAddContact = contactService.addContact;
    contactService.addContact = async (uId, data) => ({
      id: contactId,
      name: data.name,
      phone: data.phone,
      relationship: data.relationship || 'other',
      isActive: true
    });

    const req = {
      user: { id: userId },
      body: { name: 'Mother', phone: '+919999999999', relationship: 'parent' }
    };
    const res = createMockRes();
    await contactsController.addContact(req, res, (err) => { if (err) throw err; });

    contactService.addContact = origAddContact;

    if (res.statusCode !== 201 || !res.body.success || res.body.data.name !== 'Mother' || res.body.message !== 'Trusted contact added') {
      throw new Error(`Unexpected controller output: ${JSON.stringify(res.body)}`);
    }
  });

  // 6. contacts.controller.updateContact
  await runAsyncTest('contacts.controller.updateContact: returns 200 with updated contact', async () => {
    const origUpdateContact = contactService.updateContact;
    contactService.updateContact = async (uId, cId, data) => ({
      id: cId,
      name: data.name || 'Mother',
      phone: data.phone || '+919999999999',
      relationship: data.relationship || 'parent',
      isActive: data.isActive !== undefined ? data.isActive : true
    });

    const req = {
      user: { id: userId },
      params: { contactId },
      body: { isActive: false }
    };
    const res = createMockRes();
    await contactsController.updateContact(req, res, (err) => { if (err) throw err; });

    contactService.updateContact = origUpdateContact;

    if (res.statusCode !== 200 || !res.body.success || res.body.data.isActive !== false || res.body.message !== 'Trusted contact updated') {
      throw new Error(`Unexpected controller output: ${JSON.stringify(res.body)}`);
    }
  });

  // 7. contacts.controller.deleteContact
  await runAsyncTest('contacts.controller.deleteContact: returns 200 with success message', async () => {
    const origDeleteContact = contactService.deleteContact;
    contactService.deleteContact = async (uId, cId) => true;

    const req = {
      user: { id: userId },
      params: { contactId }
    };
    const res = createMockRes();
    await contactsController.deleteContact(req, res, (err) => { if (err) throw err; });

    contactService.deleteContact = origDeleteContact;

    if (res.statusCode !== 200 || !res.body.success || res.body.message !== 'Trusted contact removed') {
      throw new Error(`Unexpected controller output: ${JSON.stringify(res.body)}`);
    }
  });

  // 8. Controller error propagation to next(err)
  await runAsyncTest('Controller error propagation: passes service error to next()', async () => {
    const origGetProfile = userService.getProfile;
    userService.getProfile = async () => {
      const err = new Error('User not found');
      err.statusCode = 404;
      err.errorCode = 'USER_NOT_FOUND';
      throw err;
    };

    const req = { user: { id: userId } };
    const res = createMockRes();
    let caughtErr = null;
    await usersController.getProfile(req, res, (err) => { caughtErr = err; });

    userService.getProfile = origGetProfile;

    if (!caughtErr || caughtErr.statusCode !== 404 || caughtErr.errorCode !== 'USER_NOT_FOUND') {
      throw new Error(`Expected next(err) with 404, got: ${caughtErr}`);
    }
  });

  console.log(`\n=== CONTROLLER RESULTS: ${passCount} / ${testCount} PASSED ===`);
  process.exit(passCount === testCount ? 0 : 1);
}

runControllerAndRouteTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
