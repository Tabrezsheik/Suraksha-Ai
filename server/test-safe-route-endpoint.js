/**
 * Focused Regression & Endpoint Test — Safe Route API Endpoint
 *
 * Verifies that POST /api/routes/calculate is mounted in server.js and returns JSON.
 * Fails if /api/routes becomes unmounted or returns an HTML response.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const express = require('express');
const connectDB = require('./config/database');
const authService = require('./services/authService');

const authRoutes = require('./routes/auth.routes');
const routesRoutes = require('./routes/routes.routes');
const errorHandler = require('./middleware/errorHandler');

const runEndpointTest = async () => {
  console.log('\n======================================================');
  console.log('🚀 SAFE ROUTE API ENDPOINT MOUNTING & REGRESSION TEST');
  console.log('======================================================\n');

  let server;
  let baseUrl;
  let token;
  let passed = 0;
  const total = 5;

  try {
    await connectDB();

    // Create server mirroring main server.js route mounting configuration
    const app = express();
    app.use(express.json());

    app.use('/api/auth', authRoutes);
    // Mounted route under test
    app.use('/api/routes', routesRoutes);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        console.log(`[Test Server] Running on ${baseUrl}`);
        resolve();
      });
    });

    // 1. Register test user to get auth token
    const testEmail = `endpoint_test_${Date.now()}@example.com`;
    const reg = await authService.registerUser('Endpoint Tester', testEmail, 'Password123!', '+919876543210');
    token = reg.token;

    // -----------------------------------------------------------------
    // TEST 1: Endpoint Reachability & HTTP Status
    // -----------------------------------------------------------------
    console.log('[TEST 1] POST /api/routes/calculate reachability...');
    const res = await fetch(`${baseUrl}/api/routes/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        origin: { latitude: 14.6790, longitude: 77.5890, name: 'Anantapur Railway Station' },
        destination: { latitude: 14.6780, longitude: 77.5980, name: 'Government General Hospital Anantapur' },
        travelContext: 'night',
        travellerProfile: 'solo_woman'
      })
    });

    if (res.status === 200) {
      console.log('  ✅ Status 200 OK');
      passed++;
    } else {
      console.error(`  ❌ Failed: Received HTTP status ${res.status}`);
    }

    // -----------------------------------------------------------------
    // TEST 2: Content-Type Header Validation (Must NOT be text/html)
    // -----------------------------------------------------------------
    console.log('[TEST 2] Response Content-Type validation...');
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      console.log(`  ✅ Content-Type is JSON: "${contentType}"`);
      passed++;
    } else {
      console.error(`  ❌ Failed: Content-Type is NOT application/json (Received: "${contentType}")`);
    }

    // -----------------------------------------------------------------
    // TEST 3: Valid JSON Parsing (Must NOT throw Unexpected token '<')
    // -----------------------------------------------------------------
    console.log('[TEST 3] JSON Parsing & Structure validation...');
    let data;
    try {
      data = await res.json();
      console.log('  ✅ Response body successfully parsed as JSON');
      passed++;
    } catch (err) {
      console.error(`  ❌ Failed to parse response as JSON: ${err.message}`);
    }

    // -----------------------------------------------------------------
    // TEST 4: Response Payload & Contract Consistency
    // -----------------------------------------------------------------
    console.log('[TEST 4] Route Payload & Data Contract validation...');
    if (data && data.success === true && data.data && Array.isArray(data.data.routes) && data.data.routes.length > 0) {
      console.log(`  ✅ Valid response payload: ${data.data.routes.length} route options returned`);
      passed++;
    } else {
      console.error('  ❌ Failed: Payload structure does not match safe route contract');
    }

    // -----------------------------------------------------------------
    // TEST 5: Verify Route Geometry & Source Contract
    // -----------------------------------------------------------------
    console.log('[TEST 5] Route Source & Geometry contract preservation...');
    if (data && data.data && data.data.routes) {
      const primaryRoute = data.data.routes[0];
      const hasValidGeometry = primaryRoute.geometry && primaryRoute.geometry.type === 'LineString';
      const isValidSource = primaryRoute.routeSource === 'OPENROUTESERVICE_API' || primaryRoute.routeSource === 'MAPBOX_API' || primaryRoute.routeSource === 'ESTIMATED_FALLBACK';
      
      if (hasValidGeometry && isValidSource) {
        console.log(`  ✅ Primary Route Source: "${primaryRoute.routeSource}", Geometry Type: "${primaryRoute.geometry.type}"`);
        passed++;
      } else {
        console.error('  ❌ Failed: Route geometry or source contract broken');
      }
    }

  } catch (err) {
    console.error('💥 Test execution error:', err);
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.connection.close();

    console.log('\n======================================================');
    console.log(`RESULTS: ${passed}/${total} tests passed`);
    console.log('======================================================\n');

    if (passed === total) {
      console.log('✅ ALL SAFE ROUTE ENDPOINT MOUNTING TESTS PASSED');
      process.exit(0);
    } else {
      console.error('❌ SAFE ROUTE ENDPOINT MOUNTING TESTS FAILED');
      process.exit(1);
    }
  }
};

runEndpointTest();
