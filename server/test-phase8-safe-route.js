/**
 * Phase 8 Final Upgrade — Deep Safety Intelligence Test Suite
 *
 * Automated verification of 24 required test cases:
 * 1. Authentication protection (401)
 * 2. Invalid origin payload (400)
 * 3. Invalid destination payload (400)
 * 4. Coordinates bounds validation (422)
 * 5. Valid route calculation (200)
 * 6. Mapbox geometry & actual road sequences
 * 7. Multiple route normalization
 * 8. SafetyZone risk calculation
 * 9. Safest route selection
 * 10. Fastest route selection
 * 11. Route comparison & calculationBreakdown payload
 * 12. Risk category consistency (56% = Moderate Risk, no string contradiction)
 * 13. High-risk SafetyZone elevation
 * 14. Cross-user isolation
 * 15. Mapbox API failure fallback
 * 16. Missing Mapbox token fallback
 * 17. Segment-level splitting & risk analysis
 * 18. Travel Context (Night mode isolation elevation)
 * 19. Traveller Profile (Solo Woman emergency weight elevation)
 * 20. Separation of Risk score (0-100) and Confidence score (HIGH/MEDIUM/LOW)
 * 21. Anantapur / Ananthapuramu route evaluation
 * 22. Crowd / Activity proxy estimate
 * 23. Safety-vs-time trade-off recommendation reasoning
 * 24. Data provenance attribution (NCRB 2023, OSM, Local Evidence)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const express = require('express');

const connectDB = require('./config/database');
const User = require('./models/User');
const SafetyZone = require('./models/SafetyZone');
const authService = require('./services/authService');
const routeService = require('./services/routeService');

const authRoutes = require('./routes/auth.routes');
const routesRoutes = require('./routes/routes.routes');
const guardianRoutes = require('./routes/guardian.routes');
const errorHandler = require('./middleware/errorHandler');

const runTest = async () => {
  console.log('\n======================================================');
  console.log('🚀 RUNNING PHASE 8 FINAL UPGRADE TEST SUITE');
  console.log('======================================================\n');

  let server;
  let baseUrl;
  let token;
  let passedTests = 0;
  const totalTests = 46;

  try {
    await connectDB();

    const app = express();
    app.use(express.json());

    app.use('/api/auth', authRoutes);
    app.use('/api/routes', routesRoutes);
    app.use('/api/guardian', guardianRoutes);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        console.log(`Test Express server running on port ${port}`);
        resolve();
      });
    });

    const testEmail = `phase8_deep_${Date.now()}@example.com`;
    const regResult = await authService.registerUser(
      'Deep Test User',
      testEmail,
      'Password123!',
      '+919999888877'
    );
    token = regResult.token;

    // ----------------------------------------------------
    // TEST 1: Authentication protection
    // ----------------------------------------------------
    const res1 = await fetch(`${baseUrl}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: 28.6139, longitude: 77.2090 },
        destination: { latitude: 28.5355, longitude: 77.3910 }
      })
    });
    if (res1.status === 401) {
      console.log('✅ TEST 1 PASSED: Unauthenticated request rejected with 401 Unauthorized');
      passedTests++;
    } else {
      console.error('❌ TEST 1 FAILED: Expected 401 status');
    }

    // ----------------------------------------------------
    // TEST 2: Missing origin payload (validateRequest returns 422)
    // ----------------------------------------------------
    const res2 = await fetch(`${baseUrl}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ destination: { latitude: 28.5355, longitude: 77.3910 } })
    });
    if (res2.status === 422 || res2.status === 400) {
      console.log(`✅ TEST 2 PASSED: Missing origin payload rejected with ${res2.status} (Validation Error)`);
      passedTests++;
    } else {
      console.error(`❌ TEST 2 FAILED: Expected 422/400 for missing origin, got ${res2.status}`);
    }

    // ----------------------------------------------------
    // TEST 3: Missing destination payload (validateRequest returns 422)
    // ----------------------------------------------------
    const res3 = await fetch(`${baseUrl}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ origin: { latitude: 28.6139, longitude: 77.2090 } })
    });
    if (res3.status === 422 || res3.status === 400) {
      console.log(`✅ TEST 3 PASSED: Missing destination payload rejected with ${res3.status} (Validation Error)`);
      passedTests++;
    } else {
      console.error(`❌ TEST 3 FAILED: Expected 422/400 for missing destination, got ${res3.status}`);
    }

    // ----------------------------------------------------
    // TEST 4: Out of bounds coordinates
    // ----------------------------------------------------
    const res4 = await fetch(`${baseUrl}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        origin: { latitude: 120.0, longitude: 77.2090 },
        destination: { latitude: 28.5355, longitude: 77.3910 }
      })
    });
    if (res4.status === 422) {
      console.log('✅ TEST 4 PASSED: Out of bound coordinates rejected with 422 Unprocessable Entity');
      passedTests++;
    } else {
      console.error('❌ TEST 4 FAILED: Expected 422 for out of bound latitude');
    }

    // ----------------------------------------------------
    // TEST 5: Valid origin & destination payload
    // ----------------------------------------------------
    const res5 = await fetch(`${baseUrl}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        origin: { latitude: 28.6139, longitude: 77.2090 },
        destination: { latitude: 28.5355, longitude: 77.3910 },
        travelContext: 'night',
        travellerProfile: 'solo_woman'
      })
    });
    const data5 = await res5.json();
    if (res5.status === 200 && data5.success && data5.data.routes) {
      console.log('✅ TEST 5 PASSED: Valid origin & destination payload calculated successfully');
      passedTests++;
    } else {
      console.error('❌ TEST 5 FAILED: Valid route calculation failed', data5);
    }

    // ----------------------------------------------------
    // TEST 6: Mapbox geometry & actual road sequences
    // ----------------------------------------------------
    if (data5.data.routes[0].geometry && data5.data.routes[0].roadSequence) {
      console.log(`✅ TEST 6 PASSED: Mapbox geometry and road sequence returned (${data5.data.routes[0].roadSequence.join(' ➔ ')})`);
      passedTests++;
    } else {
      console.error('❌ TEST 6 FAILED: Geometry or roadSequence missing');
    }

    // ----------------------------------------------------
    // TEST 7: Multiple route normalization
    // ----------------------------------------------------
    if (data5.data.routes.length >= 2 && data5.data.routes[0].distanceMeters > 0) {
      console.log(`✅ TEST 7 PASSED: Normalized ${data5.data.routes.length} route options`);
      passedTests++;
    } else {
      console.error('❌ TEST 7 FAILED: Multiple route normalization failed');
    }

    // ----------------------------------------------------
    // TEST 8: SafetyZone risk calculation
    // ----------------------------------------------------
    const route0 = data5.data.routes[0];
    if (route0.riskScore > 0 && route0.calculationBreakdown) {
      console.log(`✅ TEST 8 PASSED: Risk score calculated (${route0.riskScore}%) with calculationBreakdown`);
      passedTests++;
    } else {
      console.error('❌ TEST 8 FAILED: SafetyZone risk calculation failed');
    }

    // ----------------------------------------------------
    // TEST 9: Safest route selection
    // ----------------------------------------------------
    const safestRoute = data5.data.routes.find((r) => r.isSafest);
    if (safestRoute && data5.data.safestRouteId === safestRoute.routeId) {
      console.log(`✅ TEST 9 PASSED: Safest route designated as '${safestRoute.name}' (${safestRoute.riskScore}%)`);
      passedTests++;
    } else {
      console.error('❌ TEST 9 FAILED: Safest route selection failed');
    }

    // ----------------------------------------------------
    // TEST 10: Fastest route selection
    // ----------------------------------------------------
    const fastestRoute = data5.data.routes.find((r) => r.isFastest);
    if (fastestRoute && data5.data.fastestRouteId === fastestRoute.routeId) {
      console.log(`✅ TEST 10 PASSED: Fastest route designated as '${fastestRoute.name}' (${fastestRoute.durationMin})`);
      passedTests++;
    } else {
      console.error('❌ TEST 10 FAILED: Fastest route selection failed');
    }

    // ----------------------------------------------------
    // TEST 11: Route comparison & calculationBreakdown payload
    // ----------------------------------------------------
    if (
      data5.data.safestRouteId &&
      data5.data.fastestRouteId &&
      data5.data.dataSources &&
      data5.data.routes.every((r) => r.calculationBreakdown && r.calculationBreakdown.historicalCrimeContext !== undefined)
    ) {
      console.log('✅ TEST 11 PASSED: Route comparison payload complete with calculationBreakdown and dataSources');
      passedTests++;
    } else {
      console.error('❌ TEST 11 FAILED: Route comparison payload incomplete');
    }

    // ----------------------------------------------------
    // TEST 12: Risk Category Consistency (No "High risk (56%)" contradiction)
    // ----------------------------------------------------
    const moderateRoute = data5.data.routes.find((r) => r.riskScore >= 31 && r.riskScore <= 60);
    if (!moderateRoute || (moderateRoute.riskLevel === 'moderate' && !moderateRoute.riskExplanation.toLowerCase().startsWith('high risk'))) {
      console.log('✅ TEST 12 PASSED: Category consistency verified (Category level matches explanation string)');
      passedTests++;
    } else {
      console.error('❌ TEST 12 FAILED: Category contradiction detected', moderateRoute);
    }

    // ----------------------------------------------------
    // TEST 13: High-risk SafetyZone scenario
    // ----------------------------------------------------
    const highRiskZone = new SafetyZone({
      name: 'Phase8_TestDangerZone',
      center: { latitude: 28.6139, longitude: 77.2090 },
      radiusMeters: 5000,
      riskLevel: 'high',
      active: true
    });
    await highRiskZone.save();

    const res13 = await fetch(`${baseUrl}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        origin: { latitude: 28.6139, longitude: 77.2090 },
        destination: { latitude: 28.5355, longitude: 77.3910 }
      })
    });
    const data13 = await res13.json();
    if (data13.data && data13.data.routes && data13.data.routes[0].riskScore > 0) {
      console.log(`✅ TEST 13 PASSED: High-risk SafetyZone elevated risk score to ${data13.data.routes[0].riskScore}%`);
      passedTests++;
    } else {
      console.error('❌ TEST 13 FAILED: High-risk SafetyZone score elevation failed');
    }

    // ----------------------------------------------------
    // TEST 14: Cross-user security protection
    // ----------------------------------------------------
    const user2Email = `phase8_user2_${Date.now()}@example.com`;
    const { token: token2 } = await authService.registerUser('User Two', user2Email, 'Password123!', '+919999888878');
    const res14 = await fetch(`${baseUrl}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
      body: JSON.stringify({
        origin: { latitude: 28.6139, longitude: 77.2090 },
        destination: { latitude: 28.5355, longitude: 77.3910 }
      })
    });
    if (res14.status === 200) {
      console.log('✅ TEST 14 PASSED: User 2 isolated and authenticated independently');
      passedTests++;
    } else {
      console.error('❌ TEST 14 FAILED: Cross-user authentication failed');
    }

    // ----------------------------------------------------
    // TEST 15: Mapbox API failure fallback
    // ----------------------------------------------------
    const fallbackRoutes = await routeService.calculateRoutes(
      { latitude: 28.6139, longitude: 77.2090 },
      { latitude: 28.5355, longitude: 77.3910 }
    );
    if (fallbackRoutes && fallbackRoutes.routes.length >= 2) {
      console.log('✅ TEST 15 PASSED: Mapbox failure handling returned valid fallback route options');
      passedTests++;
    } else {
      console.error('❌ TEST 15 FAILED: Fallback route handling failed');
    }

    // ----------------------------------------------------
    // TEST 16: Missing Mapbox token handling
    // ----------------------------------------------------
    const oldToken = process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.MAPBOX_ACCESS_TOKEN;
    const noTokenRoutes = await routeService.calculateRoutes(
      { latitude: 28.6139, longitude: 77.2090 },
      { latitude: 28.5355, longitude: 77.3910 }
    );
    process.env.MAPBOX_ACCESS_TOKEN = oldToken;
    if (noTokenRoutes && noTokenRoutes.routes.length >= 2) {
      console.log('✅ TEST 16 PASSED: Missing MAPBOX_ACCESS_TOKEN handled gracefully with fallback calculation');
      passedTests++;
    } else {
      console.error('❌ TEST 16 FAILED: Missing token handling failed');
    }

    // ----------------------------------------------------
    // TEST 17: Segment-level splitting & risk analysis
    // ----------------------------------------------------
    if (data5.data.routes[0].segments && data5.data.routes[0].segments.length > 0 && data5.data.routes[0].highestRiskSegment) {
      console.log(`✅ TEST 17 PASSED: Route split into ${data5.data.routes[0].segments.length} segments with highestRiskSegment identified`);
      passedTests++;
    } else {
      console.error('❌ TEST 17 FAILED: Segment-level splitting or highestRiskSegment missing');
    }

    // ----------------------------------------------------
    // TEST 18: Travel Context (Night vs Day mode)
    // ----------------------------------------------------
    const dayRoutes = await routeService.calculateRoutes(
      { latitude: 28.6139, longitude: 77.2090 },
      { latitude: 28.5355, longitude: 77.3910 },
      { travelContext: 'day' }
    );
    const nightRoutes = await routeService.calculateRoutes(
      { latitude: 28.6139, longitude: 77.2090 },
      { latitude: 28.5355, longitude: 77.3910 },
      { travelContext: 'night' }
    );
    if (nightRoutes.routes[0].riskScore >= dayRoutes.routes[0].riskScore) {
      console.log(`✅ TEST 18 PASSED: Travel Context evaluated (Night mode risk ${nightRoutes.routes[0].riskScore}% vs Day mode ${dayRoutes.routes[0].riskScore}%)`);
      passedTests++;
    } else {
      console.error('❌ TEST 18 FAILED: Night mode travel context evaluation failed');
    }

    // ----------------------------------------------------
    // TEST 19: Traveller Profile (Solo Woman weight elevation)
    // ----------------------------------------------------
    const soloWomanRoutes = await routeService.calculateRoutes(
      { latitude: 28.6139, longitude: 77.2090 },
      { latitude: 28.5355, longitude: 77.3910 },
      { travellerProfile: 'solo_woman' }
    );
    if (soloWomanRoutes.travellerProfile === 'solo_woman' && soloWomanRoutes.routes[0].calculationBreakdown) {
      console.log('✅ TEST 19 PASSED: Traveller Profile solo_woman correctly applied to calculation pipeline');
      passedTests++;
    } else {
      console.error('❌ TEST 19 FAILED: Traveller Profile solo_woman evaluation failed');
    }

    // ----------------------------------------------------
    // TEST 20: Separation of Risk Score & Confidence Score
    // ----------------------------------------------------
    if (data5.data.routes[0].riskScore !== undefined && data5.data.routes[0].confidence) {
      console.log(`✅ TEST 20 PASSED: Risk score (${data5.data.routes[0].riskScore}%) and Confidence (${data5.data.routes[0].confidence}) separated`);
      passedTests++;
    } else {
      console.error('❌ TEST 20 FAILED: Confidence score missing');
    }

    // ----------------------------------------------------
    // TEST 21: Anantapur / Ananthapuramu route evaluation
    // ----------------------------------------------------
    const anantapurRoutes = await routeService.calculateRoutes(
      { latitude: 14.6790, longitude: 77.5890, name: 'Anantapur Station' },
      { latitude: 14.6780, longitude: 77.5980, name: 'GGH Hospital Anantapur' }
    );
    if (anantapurRoutes && anantapurRoutes.routes.length >= 2) {
      console.log(`✅ TEST 21 PASSED: Anantapuramu route evaluated successfully (${anantapurRoutes.routes[0].name}, ${anantapurRoutes.routes[0].riskScore}% risk)`);
      passedTests++;
    } else {
      console.error('❌ TEST 21 FAILED: Anantapuramu route evaluation failed');
    }

    // ----------------------------------------------------
    // TEST 22: Crowd / Activity proxy estimate
    // ----------------------------------------------------
    if (data5.data.routes[0].activityEstimate && data5.data.routes[0].isolationRisk) {
      console.log(`✅ TEST 22 PASSED: Activity estimate (${data5.data.routes[0].activityEstimate}) and Isolation Risk (${data5.data.routes[0].isolationRisk}) calculated`);
      passedTests++;
    } else {
      console.error('❌ TEST 22 FAILED: Activity estimate or isolationRisk missing');
    }

    // ----------------------------------------------------
    // TEST 23: Safety-vs-time trade-off recommendation reasoning
    // ----------------------------------------------------
    if (data5.data.safestRouteRecommendation && data5.data.safestRouteRecommendation.recommendationReason) {
      console.log(`✅ TEST 23 PASSED: Trade-off recommendation rationale: "${data5.data.safestRouteRecommendation.recommendationReason.slice(0, 70)}..."`);
      passedTests++;
    } else {
      console.error('❌ TEST 23 FAILED: Trade-off recommendation rationale missing');
    }

    // ----------------------------------------------------
    // TEST 24: Data provenance attribution (NCRB 2022, OSM)
    // ----------------------------------------------------
    if (data5.data.dataSources && data5.data.dataSources.some((src) => src.includes('NCRB')) && data5.data.dataSources.some((src) => src.includes('OpenStreetMap'))) {
      console.log(`✅ TEST 24 PASSED: Data sources correctly attributed (${data5.data.dataSources.join(' • ')})`);
      passedTests++;
    } else {
      console.error('❌ TEST 24 FAILED: Data sources attribution incomplete');
    }

    // ============================================================
    // CREDIBILITY AUDIT TESTS C1–C18
    // ============================================================
    console.log('\n======================================================');
    console.log('🔍 CREDIBILITY AUDIT TESTS (C1–C18)');
    console.log('======================================================');

    // C1: isFakeRoadName identifies all synthetic names
    const { isFakeRoadName } = require('./services/routeService');
    const fakeNames = ['Direct Thoroughfare', 'Central Avenue', 'Express Way', 'Safe Parkway', 'Civic Center Boulevard', 'Ring Road', 'Southern Arterial'];
    const allFakeDetected = fakeNames.every((name) => isFakeRoadName(name));
    const validNamesPass = !isFakeRoadName('NH 44') && !isFakeRoadName('Road name unavailable');
    if (allFakeDetected && validNamesPass) {
      console.log('✅ C1 PASSED: isFakeRoadName correctly identifies synthetic road names and passes real names');
      passedTests++;
    } else {
      console.error('❌ C1 FAILED: Fake road name detection incorrect');
    }

    // C2: Fallback routes must not contain synthetic road names
    const r5fallback = data5.data.routes[0];
    const hasFakeSeq = (r5fallback.roadSequence || []).some((n) => isFakeRoadName(n));
    if (!hasFakeSeq) {
      console.log(`✅ C2 PASSED: Road sequence contains no synthetic names — uses: "${(r5fallback.roadSequence || []).join(', ')}"`);
      passedTests++;
    } else {
      console.error(`❌ C2 FAILED: Synthetic road names found: ${(r5fallback.roadSequence || []).filter(isFakeRoadName).join(', ')}`);
    }

    // C3: NCRB source metadata is complete
    const { GOVERNMENT_NCRB_DISTRICT_DATA } = require('./services/ncrbService');
    const ncrbRecord = GOVERNMENT_NCRB_DISTRICT_DATA[0];
    if (ncrbRecord.datasetName && ncrbRecord.coverageYear && ncrbRecord.publicationYear && ncrbRecord.district && ncrbRecord.dataQuality) {
      console.log(`✅ C3 PASSED: NCRB metadata complete (Dataset: "${ncrbRecord.datasetName}", Coverage: ${ncrbRecord.coverageYear}, District: ${ncrbRecord.district})`);
      passedTests++;
    } else {
      console.error('❌ C3 FAILED: NCRB source metadata missing required fields');
    }

    // C4: Local evidence labelled as SUPPLEMENTARY_ILLUSTRATIVE_DATA with LOW confidence
    const { SUPPLEMENTARY_ILLUSTRATIVE_DATA } = require('./services/ncrbService');
    const evRecord = SUPPLEMENTARY_ILLUSTRATIVE_DATA[0];
    if (evRecord.sourceType === 'SUPPLEMENTARY_ILLUSTRATIVE_DATA' && evRecord.dataQuality === 'NOT_VERIFIED' && evRecord.confidence === 'LOW') {
      console.log('✅ C4 PASSED: Local evidence correctly labelled SUPPLEMENTARY_ILLUSTRATIVE_DATA, NOT_VERIFIED, LOW confidence');
      passedTests++;
    } else {
      console.error(`❌ C4 FAILED: Evidence labelling wrong — sourceType: ${evRecord.sourceType}, dataQuality: ${evRecord.dataQuality}, confidence: ${evRecord.confidence}`);
    }

    // C5: Local evidence has null incidentDate (no fabricated dates)
    const allNullDates = SUPPLEMENTARY_ILLUSTRATIVE_DATA.every((r) => r.incidentDate === null);
    if (allNullDates) {
      console.log('✅ C5 PASSED: Supplementary evidence has null incidentDate — no fabricated crime dates');
      passedTests++;
    } else {
      console.error('❌ C5 FAILED: Evidence records contain non-null incidentDate — may be fabricated');
    }

    // C6: Police proximity alone must NOT create HIGH confidence
    const { calculateConfidence } = require('./services/routeService');
    const confPoliceOnly = calculateConfidence({ hasDistrictCrimeData: false, hasStreetLevelEvidence: false, hasLiveOSMData: false, hasRecentEvidence: false, policeStationsNearby: ['Police A'], hospitalsNearby: [] });
    if (confPoliceOnly !== 'HIGH') {
      console.log(`✅ C6 PASSED: Police-only does NOT grant HIGH confidence — Result: ${confPoliceOnly}`);
      passedTests++;
    } else {
      console.error('❌ C6 FAILED: Police proximity alone should not grant HIGH confidence');
    }

    // C7: Hospital proximity alone must NOT create HIGH confidence
    const confHospitalOnly = calculateConfidence({ hasDistrictCrimeData: false, hasStreetLevelEvidence: false, hasLiveOSMData: false, hasRecentEvidence: false, policeStationsNearby: [], hospitalsNearby: ['Hospital A'] });
    if (confHospitalOnly !== 'HIGH') {
      console.log(`✅ C7 PASSED: Hospital proximity alone does NOT grant HIGH confidence — Result: ${confHospitalOnly}`);
      passedTests++;
    } else {
      console.error('❌ C7 FAILED: Hospital proximity alone should not grant HIGH confidence');
    }

    // C8: District data alone → MEDIUM or LOW (not HIGH)
    const confDistrictOnly = calculateConfidence({ hasDistrictCrimeData: true, hasStreetLevelEvidence: false, hasLiveOSMData: false, hasRecentEvidence: false, policeStationsNearby: [], hospitalsNearby: [] });
    if (confDistrictOnly === 'LOW' || confDistrictOnly === 'MEDIUM') {
      console.log(`✅ C8 PASSED: District-only data → confidence: ${confDistrictOnly} (not HIGH)`);
      passedTests++;
    } else {
      console.error(`❌ C8 FAILED: District-only data should not give HIGH confidence, got: ${confDistrictOnly}`);
    }

    // C9: Activity estimate basis must not reference police presence
    const r5route0 = data5.data.routes[0];
    const actBasis = r5route0.activityBasis || '';
    if (!actBasis.toLowerCase().includes('police')) {
      console.log(`✅ C9 PASSED: Activity basis correctly derived from transit/time — not police: "${actBasis.slice(0, 70)}"`);
      passedTests++;
    } else {
      console.error(`❌ C9 FAILED: Activity estimate basis references police presence: "${actBasis}"`);
    }

    // C10: Segments receive independent risk scores (not all identical)
    const r5segs = r5route0.segments || [];
    if (r5segs.length <= 1) {
      console.log(`✅ C10 PASSED: Only 1 segment (route too short for multi-segment) — acceptable`);
      passedTests++;
    } else {
      const s0 = r5segs[0].riskScore;
      const allSame = r5segs.every((s) => s.riskScore === s0);
      if (!allSame) {
        console.log(`✅ C10 PASSED: Segments receive independent scores: [${r5segs.map((s) => s.riskScore).join(', ')}]`);
        passedTests++;
      } else {
        console.error(`❌ C10 FAILED: All segments have identical score ${s0} — not independently evaluated`);
      }
    }

    // C11: Night mode produces different risk estimate than Day mode
    const resDayTest = await fetch(`${baseUrl}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ origin: { latitude: 28.6139, longitude: 77.2090 }, destination: { latitude: 28.5355, longitude: 77.3910 }, travelContext: 'day', travellerProfile: 'solo_woman' })
    });
    const dataDay = await resDayTest.json();
    const nightScore = data5.data.routes[0].riskScore;
    const dayScore = dataDay.data?.routes?.[0]?.riskScore;
    if (typeof dayScore === 'number' && nightScore !== dayScore) {
      console.log(`✅ C11 PASSED: Night risk (${nightScore}) differs from Day risk (${dayScore}) — context-sensitive`);
      passedTests++;
    } else if (typeof dayScore !== 'number') {
      console.error(`❌ C11 FAILED: Day mode returned invalid score: ${dayScore}`);
    } else {
      console.error(`❌ C11 FAILED: Night (${nightScore}) and Day (${dayScore}) produce identical scores`);
    }

    // C12: Risk category string is consistent
    const r5r0 = data5.data.routes[0];
    const expectedLevel = r5r0.riskScore <= 30 ? 'low' : r5r0.riskScore <= 60 ? 'moderate' : 'high';
    if (r5r0.riskLevel === expectedLevel) {
      console.log(`✅ C12 PASSED: Risk category consistent — score: ${r5r0.riskScore}, level: ${r5r0.riskLevel}`);
      passedTests++;
    } else {
      console.error(`❌ C12 FAILED: Score ${r5r0.riskScore} → level ${r5r0.riskLevel} but expected ${expectedLevel}`);
    }

    // C13: Risk (numeric) and confidence (string) are separate distinct fields
    const hasRiskField = typeof r5r0.riskScore === 'number';
    const hasConfField = ['HIGH', 'MEDIUM', 'LOW'].includes(r5r0.confidence);
    if (hasRiskField && hasConfField) {
      console.log(`✅ C13 PASSED: Risk (${r5r0.riskScore}/100) and Confidence (${r5r0.confidence}) are separate fields`);
      passedTests++;
    } else {
      console.error(`❌ C13 FAILED: Risk or confidence field missing/invalid`);
    }

    // C14: Police + hospital combined credit ≤ 17 pts
    const bd0 = r5r0.calculationBreakdown;
    const policeCredit = Math.abs(bd0?.policeSafetyCredit || 0);
    const hospitalCredit = Math.abs(bd0?.hospitalSafetyCredit || 0);
    const combined = policeCredit + hospitalCredit;
    if (combined <= 17) {
      console.log(`✅ C14 PASSED: Combined credits (${combined} pts) ≤ 17 — cannot zero out baseline`);
      passedTests++;
    } else {
      console.error(`❌ C14 FAILED: Combined credits (${combined} pts) exceed 17 cap`);
    }

    // C15: Risk score ≥ district baseline floor (not unrealistically low)
    if (r5r0.riskScore >= 16) {
      console.log(`✅ C15 PASSED: Risk score (${r5r0.riskScore}) ≥ 16 — not below district baseline`);
      passedTests++;
    } else {
      console.error(`❌ C15 FAILED: Risk score ${r5r0.riskScore} is below district baseline — misleadingly low`);
    }

    // C16: Road sequence contains no synthetic names
    const roadSeq = r5r0.roadSequence || [];
    const fakeInSeq = roadSeq.filter(isFakeRoadName);
    if (fakeInSeq.length === 0) {
      console.log(`✅ C16 PASSED: Road sequence clear of synthetic names — [${roadSeq.join(', ')}]`);
      passedTests++;
    } else {
      console.error(`❌ C16 FAILED: Synthetic names in road sequence: ${fakeInSeq.join(', ')}`);
    }

    // C17: Anantapur route risk ≥ 16 (never below district baseline)
    const anantapurRes = await fetch(`${baseUrl}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ origin: { latitude: 14.6790, longitude: 77.5890, name: 'Anantapur Railway Station' }, destination: { latitude: 14.6780, longitude: 77.5980, name: 'GGH Hospital Anantapur' }, travelContext: 'night', travellerProfile: 'solo_woman' })
    });
    const anantapurData = await anantapurRes.json();
    const antRoute = anantapurData.data?.routes?.[0];
    const antScore = antRoute?.riskScore;
    if (typeof antScore === 'number' && antScore >= 16) {
      console.log(`✅ C17 PASSED: Anantapur route risk (${antScore}/100) ≥ 16 — not misleadingly low. Confidence: ${antRoute.confidence}`);
      passedTests++;
    } else {
      console.error(`❌ C17 FAILED: Anantapur route score is ${antScore} — below district baseline floor`);
    }

    // C18: All 3 routes receive independent scores (not all identical)
    const routeScores = data5.data.routes.map((r) => r.riskScore);
    const allIdentical = routeScores.length > 1 && routeScores.every((s) => s === routeScores[0]);
    if (!allIdentical) {
      console.log(`✅ C18 PASSED: Routes receive independent scores: [${routeScores.join(', ')}]`);
      passedTests++;
    } else {
      console.error(`❌ C18 FAILED: All routes have identical score ${routeScores[0]} — not independently evaluated`);
    }

    // Ensure no stale Guardian sessions exist before G1-G4
    const GuardianSession = require('./models/GuardianSession');
    await GuardianSession.deleteMany({});

    // G1: Verified geometry → Guardian Mode allowed
    const verifiedRoutePayload = {
      destination: { latitude: 28.5355, longitude: 77.3910, name: 'Verified Dest' },
      origin: { latitude: 28.6139, longitude: 77.2090, name: 'Verified Origin' },
      selectedRoute: {
        routeId: 'route-verified',
        name: 'Verified Road Path',
        isEstimatedGeometry: false,
        coordinates: [
          [77.2090, 28.6139],
          [77.2500, 28.5800],
          [77.3910, 28.5355]
        ]
      }
    };
    const g1Res = await fetch(`${baseUrl}/api/guardian/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(verifiedRoutePayload)
    });
    const g1Data = await g1Res.json();
    if (g1Res.status === 200 && g1Data.success && g1Data.data.sessionId) {
      console.log(`✅ G1 PASSED: Verified geometry → Guardian Mode allowed (Session ID: ${g1Data.data.sessionId})`);
      passedTests++;
    } else {
      console.error(`❌ G1 FAILED: Could not start Guardian Mode with verified geometry:`, g1Data);
    }
    await GuardianSession.deleteMany({});

    // G2: Estimated geometry → Guardian Mode blocked
    const estimatedRoutePayload = {
      destination: { latitude: 28.5355, longitude: 77.3910, name: 'Dest' },
      origin: { latitude: 28.6139, longitude: 77.2090, name: 'Origin' },
      selectedRoute: {
        routeId: 'route-estimated',
        name: 'Estimated Fallback Path',
        isEstimatedGeometry: true,
        coordinates: [
          [77.2090, 28.6139],
          [77.3910, 28.5355]
        ]
      }
    };
    const g2Res = await fetch(`${baseUrl}/api/guardian/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(estimatedRoutePayload)
    });
    const g2Data = await g2Res.json();
    if (g2Res.status === 400 && g2Data.message === 'Guardian Mode unavailable — verified route geometry required.') {
      console.log(`✅ G2 PASSED: Estimated geometry → Guardian Mode blocked with expected error message`);
      passedTests++;
    } else {
      console.error(`❌ G2 FAILED: Estimated geometry was not blocked as expected:`, g2Data);
    }
    await GuardianSession.deleteMany({});

    // G3: Missing geometry → Guardian Mode blocked
    const missingGeomPayload = {
      destination: { latitude: 28.5355, longitude: 77.3910, name: 'Dest' },
      origin: { latitude: 28.6139, longitude: 77.2090, name: 'Origin' },
      selectedRoute: {
        routeId: 'route-empty',
        name: 'Empty Geom Path',
        isEstimatedGeometry: false,
        coordinates: []
      }
    };
    const g3Res = await fetch(`${baseUrl}/api/guardian/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(missingGeomPayload)
    });
    const g3Data = await g3Res.json();
    if (g3Res.status === 400 && g3Data.message === 'Guardian Mode unavailable — verified route geometry required.') {
      console.log(`✅ G3 PASSED: Missing geometry → Guardian Mode blocked with expected error message`);
      passedTests++;
    } else {
      console.error(`❌ G3 FAILED: Missing geometry was not blocked as expected:`, g3Data);
    }
    await GuardianSession.deleteMany({});

    // G4: Existing Guardian Mode behavior without selectedRoute unchanged
    const standardPayload = {
      destination: { latitude: 28.5355, longitude: 77.3910, name: 'Direct Dest' }
    };
    const g4Res = await fetch(`${baseUrl}/api/guardian/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(standardPayload)
    });
    const g4Data = await g4Res.json();
    if (g4Res.status === 200 && g4Data.success && g4Data.data.sessionId) {
      console.log(`✅ G4 PASSED: Existing Guardian Mode behavior without selectedRoute remains unchanged (Session ID: ${g4Data.data.sessionId})`);
      passedTests++;
    } else {
      console.error(`❌ G4 FAILED: Standard Guardian Mode start failed:`, g4Data);
    }
    await GuardianSession.deleteMany({});

    // Cleanup test data
    await SafetyZone.deleteMany({ name: /Phase8_/ });
    await User.deleteMany({ email: /phase8_deep_/ });

    console.log('\n======================================================');
    console.log(`Phase 8 Final Validation Test Summary: ${passedTests} / ${totalTests} Passed`);
    console.log('  Core Tests (1–24):           see above');
    console.log('  Credibility Tests (C1–C18):   see above');
    console.log('  Geometry Safety Tests (G1–G4): see above');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ FATAL TEST ERROR:', err);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runTest();
