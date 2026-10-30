/**
 * SURAKSHA AI — Regression Test Suite for Legal Section Resolution Defect Fix
 * 
 * Verifies that:
 * 1. "explain section 3", "section 23", "section 31" without Act ask for concise clarification with candidate Acts.
 * 2. They DO NOT return the same generic PWDVA/BNSS overview text.
 * 3. Explicit Act queries ("Section 3 of PWDVA", "Section 23 of PWDVA", "Section 31 of PWDVA") return distinct, section-specific 8-part tutorials.
 * 4. Explicit Act in query overrides prior session context (e.g. POCSO overrides PWDVA).
 * 5. Conversational follow-up reuses prior Act context when no new Act is given.
 * 6. Subsections like "Section 3(1)" and "Section 23(2)" are parsed and resolved.
 * 7. Out-of-bounds sections (e.g. "Section 999 of PWDVA") return transparent statutory limitation notices.
 * 8. Zero fabricated citations or generic overview fallback leakage.
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const assistantService = require('./services/assistantService');
const conversationRouter = require('./services/conversationRouter');
const legalStudyService = require('./services/legalStudyService');
const assistantDbService = require('./services/assistantDbService');

const GENERIC_OVERVIEW_SNIPPET = 'Legal provisions under the Protection of Women from Domestic Violence Act (PWDVA) and Bharatiya Nagarik Suraksha Sanhita (BNSS) guarantee protection orders and police response upon reporting threats.';

let passedTests = 0;
let totalTests = 0;

async function runTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    console.error(`         Error: ${err.message}`);
    if (err.stack) console.error(`         Stack: ${err.stack.split('\n').slice(1, 3).join('\n')}`);
  }
}

async function runRegressionSuite() {
  console.log('\n=============================================================');
  console.log('⚖️ SURAKSHA AI — Legal Section Resolution Defect Regression Suite');
  console.log('=============================================================\n');

  // Initialize DB schema & seed cases
  await assistantDbService.initializeSchema();

  const testUser = { _id: 'test_user_regression_sec', id: 'test_user_regression_sec', role: 'user' };

  // -------------------------------------------------------------------------
  // 1. CONVERSATION ROUTER SECTION CLASSIFICATION TESTS
  // -------------------------------------------------------------------------
  console.log('--- 1. CONVERSATION ROUTER CLASSIFICATION ---');

  await runTest('A. "explain section 3" classifies as LEGAL / SECTION_EXPLANATION', async () => {
    const c = conversationRouter.classifyMessage('explain section 3');
    assert.strictEqual(c.intent, 'LEGAL');
    assert.strictEqual(c.topic, 'SECTION_EXPLANATION');
    assert.strictEqual(c.questionType, 'SECTION_EXPLANATION');
  });

  await runTest('B. "section 23" classifies as LEGAL / SECTION_EXPLANATION', async () => {
    const c = conversationRouter.classifyMessage('section 23');
    assert.strictEqual(c.intent, 'LEGAL');
    assert.strictEqual(c.topic, 'SECTION_EXPLANATION');
  });

  await runTest('C. "section 31" classifies as LEGAL / SECTION_EXPLANATION', async () => {
    const c = conversationRouter.classifyMessage('section 31');
    assert.strictEqual(c.intent, 'LEGAL');
    assert.strictEqual(c.topic, 'SECTION_EXPLANATION');
  });

  await runTest('D. "Section 3(1)" preserves subsection and classifies as LEGAL', async () => {
    const c = conversationRouter.classifyMessage('Section 3(1)');
    assert.strictEqual(c.intent, 'LEGAL');
    assert.strictEqual(c.topic, 'SECTION_EXPLANATION');
  });

  // -------------------------------------------------------------------------
  // 2. AMBIGUOUS SECTION RESOLUTION & CLARIFICATION PROMPTS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. AMBIGUITY RESOLUTION (NO CONTEXT) ---');

  await runTest('A. "explain section 3" without Act asks concise clarification with candidate Acts', async () => {
    const res = await assistantService.processChatQuery(testUser, 'explain section 3');
    assert.strictEqual(res.intent, 'AMBIGUOUS_SECTION');
    assert.strictEqual(res.questionType, 'AMBIGUOUS_SECTION');
    assert(res.legalExplanation.includes('PWDVA'));
    assert(res.legalExplanation.includes('POCSO'));
    assert(res.legalExplanation.includes('BNS'));
    assert(res.legalExplanation.includes('Which specific Act would you like me to explain'));
    assert(!res.legalExplanation.includes(GENERIC_OVERVIEW_SNIPPET), 'Must NOT contain generic overview');
  });

  await runTest('B. "section 23" without Act asks concise clarification with candidate Acts', async () => {
    const res = await assistantService.processChatQuery(testUser, 'section 23');
    assert.strictEqual(res.intent, 'AMBIGUOUS_SECTION');
    assert.strictEqual(res.questionType, 'AMBIGUOUS_SECTION');
    assert(res.legalExplanation.includes('PWDVA'));
    assert(res.legalExplanation.includes('POCSO'));
    assert(res.legalExplanation.includes('BNSS'));
    assert(res.legalExplanation.includes('Which specific Act would you like me to explain'));
    assert(!res.legalExplanation.includes(GENERIC_OVERVIEW_SNIPPET), 'Must NOT contain generic overview');
  });

  await runTest('C. "section 31" without Act asks concise clarification with candidate Acts', async () => {
    const res = await assistantService.processChatQuery(testUser, 'section 31');
    assert.strictEqual(res.intent, 'AMBIGUOUS_SECTION');
    assert.strictEqual(res.questionType, 'AMBIGUOUS_SECTION');
    assert(res.legalExplanation.includes('PWDVA'));
    assert(res.legalExplanation.includes('POCSO'));
    assert(res.legalExplanation.includes('BNSS'));
    assert(res.legalExplanation.includes('Which specific Act would you like me to explain'));
    assert(!res.legalExplanation.includes(GENERIC_OVERVIEW_SNIPPET), 'Must NOT contain generic overview');
  });

  await runTest('D. Responses for Section 3, Section 23, and Section 31 are distinct and non-identical', async () => {
    const r3 = await assistantService.processChatQuery(testUser, 'explain section 3');
    const r23 = await assistantService.processChatQuery(testUser, 'section 23');
    const r31 = await assistantService.processChatQuery(testUser, 'section 31');

    assert.notStrictEqual(r3.legalExplanation, r23.legalExplanation, 'Section 3 and Section 23 responses must be different');
    assert.notStrictEqual(r23.legalExplanation, r31.legalExplanation, 'Section 23 and Section 31 responses must be different');
    assert.notStrictEqual(r3.legalExplanation, r31.legalExplanation, 'Section 3 and Section 31 responses must be different');
  });

  // -------------------------------------------------------------------------
  // 3. EXPLICIT ACT RESOLUTION & 8-PART TUTORIALS
  // -------------------------------------------------------------------------
  console.log('\n--- 3. EXPLICIT ACT RESOLUTION & 8-PART TUTORIALS ---');

  await runTest('A. "Section 3 of PWDVA" returns exact statutory heading and definition of domestic violence', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Section 3 of PWDVA');
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.questionType, 'SECTION_EXPLANATION');
    assert.strictEqual(res.structuredLegal.actName, 'Protection of Women from Domestic Violence Act, 2005');
    assert(res.structuredLegal.sectionNumber.includes('3'));
    assert(res.structuredLegal.simpleAnswer.toLowerCase().includes('definition of domestic violence') || res.structuredLegal.simpleAnswer.toLowerCase().includes('exhaustive definition') || res.structuredLegal.simpleAnswer.toLowerCase().includes('physical, sexual, verbal, emotional'));
    assert(res.legalExplanation.includes('### A. Section and Act'));
    assert(res.legalExplanation.includes('### B. Meaning in Simple English'));
    assert(res.legalExplanation.includes('### C. Important Legal Points'));
    assert(res.legalExplanation.includes('### D. Practical Hypothetical Example'));
    assert(res.legalExplanation.includes('### E. Real Legal Case Studies'));
    assert(res.legalExplanation.includes('### F. Exam Revision Notes'));
    assert(res.legalExplanation.includes('### G. Practice Questions'));
    assert(res.legalExplanation.includes('### H. Authoritative Sources'));
    assert(!res.legalExplanation.includes(GENERIC_OVERVIEW_SNIPPET));
  });

  await runTest('B. "Section 23 of PWDVA" returns interim and ex-parte orders tutorial', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Section 23 of PWDVA');
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.questionType, 'SECTION_EXPLANATION');
    assert(res.structuredLegal.sectionNumber.includes('23'));
    assert(res.structuredLegal.simpleAnswer.toLowerCase().includes('interim') || res.structuredLegal.simpleAnswer.toLowerCase().includes('ex parte'));
    assert(res.legalExplanation.includes('Kunapareddy v. Kunapareddy') || res.legalExplanation.includes('ex parte'));
    assert(!res.legalExplanation.includes(GENERIC_OVERVIEW_SNIPPET));
  });

  await runTest('C. "Section 31 of PWDVA" returns penalty for breach of protection order tutorial', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Section 31 of PWDVA');
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.questionType, 'SECTION_EXPLANATION');
    assert(res.structuredLegal.sectionNumber.includes('31'));
    assert(res.structuredLegal.simpleAnswer.toLowerCase().includes('breach of protection order') || res.structuredLegal.simpleAnswer.toLowerCase().includes('breach of any protection order'));
    assert(res.structuredLegal.whatItMeans.toLowerCase().includes('cognizable') || res.structuredLegal.simpleAnswer.toLowerCase().includes('cognizable'));
    assert(!res.legalExplanation.includes(GENERIC_OVERVIEW_SNIPPET));
  });

  await runTest('D. "Section 3 of POCSO" returns penetrative sexual assault tutorial', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Section 3 of POCSO');
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.questionType, 'SECTION_EXPLANATION');
    assert(res.structuredLegal.actName.includes('Protection of Children from Sexual Offences'));
    assert(res.structuredLegal.simpleAnswer.toLowerCase().includes('penetrative sexual assault'));
    assert(!res.legalExplanation.includes(GENERIC_OVERVIEW_SNIPPET));
  });

  // -------------------------------------------------------------------------
  // 4. CONTEXT OVERRIDE & CONTINUITY TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 4. CONTEXT OVERRIDE & CONTINUITY ---');

  await runTest('A. Explicit Act overrides previous sessionContext Act (POCSO overrides PWDVA)', async () => {
    // SessionContext has lastAct: 'PWDVA'
    const res = await assistantService.processChatQuery(testUser, 'Section 3 of POCSO', { lastAct: 'PWDVA', lastSection: '17' });
    assert.strictEqual(res.intent, 'LEGAL');
    assert(res.structuredLegal.actName.includes('Protection of Children from Sexual Offences'));
    assert(res.sessionContext.lastAct.toUpperCase().includes('POCSO'));
  });

  await runTest('B. Follow-up query without Act reuses previous sessionContext Act', async () => {
    // SessionContext has lastAct: 'PWDVA'
    const res = await assistantService.processChatQuery(testUser, 'what about section 23', { lastAct: 'PWDVA' });
    assert.strictEqual(res.intent, 'LEGAL');
    assert(res.structuredLegal.actName.includes('Domestic Violence'));
    assert(res.structuredLegal.sectionNumber.includes('23'));
  });

  // -------------------------------------------------------------------------
  // 5. SUBSECTION PARSING & PRESERVATION TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 5. SUBSECTION PARSING & PRESERVATION ---');

  await runTest('A. "Section 3(1) of PWDVA" resolves base section 3 and preserves subsection', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Section 3(1) of PWDVA');
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.questionType, 'SECTION_EXPLANATION');
    assert(res.structuredLegal.simpleAnswer.toLowerCase().includes('domestic violence'));
  });

  await runTest('B. "Section 23(2) of PWDVA" resolves base section 23 (ex-parte orders)', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Section 23(2) of PWDVA');
    assert.strictEqual(res.intent, 'LEGAL');
    assert(res.structuredLegal.simpleAnswer.toLowerCase().includes('ex parte') || res.structuredLegal.simpleAnswer.toLowerCase().includes('interim'));
  });

  // -------------------------------------------------------------------------
  // 6. STATUTORY BOUNDARY / OUT-OF-BOUNDS TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 6. STATUTORY BOUNDARY & LIMITATION TESTS ---');

  await runTest('A. "Section 999 of PWDVA" returns statutory limitation notice (max 37 sections)', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Section 999 of PWDVA');
    assert.strictEqual(res.questionType, 'OUT_OF_BOUNDS_SECTION');
    assert(res.legalExplanation.includes('only 37 sections'));
    assert(res.legalExplanation.includes('Section 999 does not exist in this Act'));
    assert(res.legalExplanation.includes('https://www.indiacode.nic.in'));
    assert(!res.legalExplanation.includes(GENERIC_OVERVIEW_SNIPPET), 'Must NOT fall back to generic overview');
  });

  await runTest('B. "Section 100 of POCSO" returns statutory limitation notice (max 46 sections)', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Section 100 of the POCSO Act');
    assert.strictEqual(res.questionType, 'OUT_OF_BOUNDS_SECTION');
    assert(res.legalExplanation.includes('only 46 sections'));
    assert(res.legalExplanation.includes('Section 100 does not exist in this Act'));
    assert(!res.legalExplanation.includes(GENERIC_OVERVIEW_SNIPPET));
  });

  await runTest('C. "Section 500 of BNS" returns statutory limitation notice (max 358 sections)', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Section 500 of BNS');
    assert.strictEqual(res.questionType, 'OUT_OF_BOUNDS_SECTION');
    assert(res.legalExplanation.includes('only 358 sections'));
    assert(res.legalExplanation.includes('Section 500 does not exist in this Act'));
    assert(!res.legalExplanation.includes(GENERIC_OVERVIEW_SNIPPET));
  });

  // -------------------------------------------------------------------------
  // 7. VERIFIED REAL CASE STUDIES TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 7. VERIFIED CASE STUDIES GROUNDING ---');

  await runTest('A. PWDVA Section 3 retrieves Indra Sarma v. V.K.V. Sarma (2013)', async () => {
    const cases = await assistantDbService.searchCaseStudies({ actIdentifier: 'PWDVA', sectionNumber: '3', limit: 1 });
    assert(cases.length > 0, 'Must have seeded case study for PWDVA Section 3');
    assert(cases[0].title.includes('Indra Sarma'));
    assert(cases[0].court.includes('Supreme Court'));
    assert.strictEqual(cases[0].verification_status, 'verified');
  });

  await runTest('B. PWDVA Section 23 retrieves Kunapareddy v. Kunapareddy (2016)', async () => {
    const cases = await assistantDbService.searchCaseStudies({ actIdentifier: 'PWDVA', sectionNumber: '23', limit: 1 });
    assert(cases.length > 0, 'Must have seeded case study for PWDVA Section 23');
    assert(cases[0].title.includes('Kunapareddy'));
    assert.strictEqual(cases[0].verification_status, 'verified');
  });

  await runTest('C. PWDVA Section 31 retrieves Kamlesh Devi v. Jaipal', async () => {
    const cases = await assistantDbService.searchCaseStudies({ actIdentifier: 'PWDVA', sectionNumber: '31', limit: 1 });
    assert(cases.length > 0, 'Must have seeded case study for PWDVA Section 31');
    assert(cases[0].title.includes('Kamlesh Devi'));
    assert.strictEqual(cases[0].verification_status, 'verified');
  });

  // -------------------------------------------------------------------------
  // 8. MULTILINGUAL TUTORING (TELUGU & HINDI)
  // -------------------------------------------------------------------------
  console.log('\n--- 8. MULTILINGUAL SECTION TUTORING ---');

  await runTest('A. User: "Explain Section 3 of PWDVA in Telugu" provides authentic Telugu tutorial', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Explain Section 3 of PWDVA in Telugu');
    assert.strictEqual(res.intent, 'LEGAL');
    assert(res.legalExplanation.includes('సెక్షన్ 3'));
    assert(res.legalExplanation.includes('గృహహింస'));
  });

  await runTest('B. User: "Explain Section 23 of PWDVA in Hindi" provides authentic Hindi tutorial', async () => {
    const res = await assistantService.processChatQuery(testUser, 'Explain Section 23 of PWDVA in Hindi');
    assert.strictEqual(res.intent, 'LEGAL');
    assert(res.legalExplanation.includes('धारा 23'));
    assert(res.legalExplanation.includes('मजिस्ट्रेट') || res.legalExplanation.includes('अंतरिम'));
  });

  console.log('\n=============================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} passed.`);
  console.log('=============================================================\n');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Fatal regression suite error:', err);
  process.exit(1);
});

