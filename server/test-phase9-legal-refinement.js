const assert = require('assert');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const User = require('./models/User');
const assistantService = require('./services/assistantService');
const legalRagService = require('./services/legalRagService');

async function runPhase9LegalRefinementTests() {
  console.log('======================================================');
  console.log('🚀 RUNNING PHASE 9 LEGAL AI CORRECTIVE REFINEMENT TEST SUITE');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');

  let passCount = 0;
  let testCount = 0;

  const runTest = async (name, testFn) => {
    testCount++;
    try {
      await testFn();
      passCount++;
      console.log(`[PASS] Test #${testCount}: ${name}`);
    } catch (err) {
      console.error(`[FAIL] Test #${testCount}: ${name} — Error:`, err.message);
    }
  };

  const testEmail = `phase9_refinement_${Date.now()}@suraksha.ai`;
  const user = await User.create({
    name: 'Phase 9 Refinement User',
    email: testEmail,
    passwordHash: 'hash'
  });

  // Test 1: Greeting query
  await runTest('A. Greeting ("hello") returns general greeting without RAG/case dump', async () => {
    const res = await assistantService.processChatQuery(user, 'hello');
    assert.strictEqual(res.intent, 'GREETING');
    assert.strictEqual(res.legalRagResult.judgments.length, 0);
    assert(res.legalExplanation.toLowerCase().includes('hello'));
  });

  // Test 2: Personal safety statement ("I am scared")
  await runTest('B. Personal safety statement ("I am scared") returns human safety response first', async () => {
    const res = await assistantService.processChatQuery(user, 'I am scared');
    assert.strictEqual(res.intent, 'PERSONAL_SAFETY_GUIDANCE');
    assert.strictEqual(res.legalRagResult.judgments.length, 0);
    assert(res.safetyAdvice.length >= 3);
    assert(res.legalExplanation.includes('safety comes first'));
  });

  // Test 3: Harassment statement ("I am feeling harassed")
  await runTest('C. Harassment statement ("I am feeling harassed") returns calm safety response without legal dump', async () => {
    const res = await assistantService.processChatQuery(user, 'I am feeling harassed');
    assert.strictEqual(res.intent, 'PERSONAL_SAFETY_GUIDANCE');
    assert.strictEqual(res.legalRagResult.judgments.length, 0);
    assert(!res.legalExplanation.includes('Protection of Women from Domestic Violence Act'));
    assert(res.legalExplanation.includes('workplace harassment') || res.legalExplanation.includes('context'));
  });

  // Test 4: Targeted statement ("I am feeling targeted")
  await runTest('D. Targeted statement ("I am feeling targeted") asks for context & safety guidance', async () => {
    const res = await assistantService.processChatQuery(user, 'I am feeling targeted');
    assert.strictEqual(res.intent, 'PERSONAL_SAFETY_GUIDANCE');
    assert.strictEqual(res.legalRagResult.judgments.length, 0);
    assert(res.safetyAdvice.some(a => a.toLowerCase().includes('immediate safety')));
  });

  // Test 5: Threat statement ("someone keeps threatening me")
  await runTest('E. Threat statement ("someone keeps threatening me") prioritizes safety & evidence preservation', async () => {
    const res = await assistantService.processChatQuery(user, 'someone keeps threatening me');
    assert.strictEqual(res.intent, 'PERSONAL_SAFETY_GUIDANCE');
    assert(res.safetyAdvice.some(a => a.toLowerCase().includes('evidence') || a.toLowerCase().includes('save')));
  });

  // Test 6: Sexual harassment definition query
  await runTest('F. Definition query ("what is sexual harassment") defines concept accurately', async () => {
    const res = await assistantService.processChatQuery(user, 'what is sexual harassment');
    assert.strictEqual(res.questionType, 'DEFINITION');
    assert(res.structuredLegal.simpleAnswer.toLowerCase().includes('unwanted sexual conduct'));
    assert(res.structuredLegal.actName.includes('BNS') || res.structuredLegal.actName.includes('POSH'));
  });

  // Test 7: Causes of domestic violence query
  await runTest('G. Causes query ("what are the causes of domestic violence") answers factors instead of remedies', async () => {
    const res = await assistantService.processChatQuery(user, 'what are the causes of domestic violence');
    assert.strictEqual(res.questionType, 'CAUSES');
    assert(res.structuredLegal.simpleAnswer.toLowerCase().includes('power imbalances') || res.structuredLegal.simpleAnswer.toLowerCase().includes('controlling behavior'));
    assert(res.structuredLegal.whatItMeans.includes('Coercive Control') || res.structuredLegal.whatItMeans.includes('Economic Dependence'));
  });

  // Test 8: Ambiguous section query ("what is section 173")
  await runTest('H. Ambiguous section query ("what is section 173") requests Act clarification', async () => {
    const res = await assistantService.processChatQuery(user, 'what is section 173');
    assert.strictEqual(res.intent, 'AMBIGUOUS_SECTION');
    assert(res.legalExplanation.includes('Which specific Act would you like me to explain'));
  });

  // Test 9: Explicit BNSS section query
  await runTest('I. Explicit BNSS section query ("what is BNSS section 173") explains BNSS Section 173 FIR procedure', async () => {
    const res = await assistantService.processChatQuery(user, 'what is BNSS section 173');
    assert.strictEqual(res.questionType, 'SECTION_EXPLANATION');
    assert(res.structuredLegal.simpleAnswer.includes('Section 173'));
    assert(res.structuredLegal.simpleAnswer.includes('FIR'));
  });

  // Test 10: Legal advice query ("legal advice")
  await runTest('J. General legal guidance ("legal advice") prompts for specific topic without arbitrary judgment', async () => {
    const res = await assistantService.processChatQuery(user, 'legal advice');
    assert.strictEqual(res.intent, 'GENERAL_LEGAL_GUIDANCE');
    assert.strictEqual(res.legalRagResult.judgments.length, 0);
    assert(!res.legalExplanation.includes('Srilatha'));
  });

  // Test 11: Case study request ("show me case studies")
  await runTest('K. Case study request ("show me case studies") returns openCaseExplorer = true', async () => {
    const res = await assistantService.processChatQuery(user, 'show me case studies');
    assert.strictEqual(res.intent, 'CASE_EXPLORATION');
    assert.strictEqual(res.openCaseExplorer, true);
  });

  // Test 12: Case Explorer taxonomy API
  await runTest('L. Case Explorer taxonomy API returns categories, Acts, and Sections derived from corpus', async () => {
    const tax = await legalRagService.getCorpusTaxonomy();
    assert.strictEqual(tax.success, true);
    assert(tax.categories.length > 0);
    const dvCat = tax.categories.find(c => c.id === 'domestic_violence');
    assert(dvCat, 'domestic_violence category must exist');
    assert(dvCat.acts.length > 0);
  });

  // Test 13: Case Explorer section filtering
  await runTest('M. Case Explorer section filtering returns matching cases for section 18', async () => {
    const explorer = await legalRagService.getExplorerCases({ section: '18' });
    assert.strictEqual(explorer.success, true);
    assert(explorer.judgments.length > 0);
    assert(explorer.judgments[0].sections.includes('18'));
  });

  // Test 14: Study Case details verification
  await runTest('N. Study Case details returns verified metadata and provenance', async () => {
    const explorer = await legalRagService.getExplorerCases({ section: '173' });
    assert.strictEqual(explorer.success, true);
    assert(explorer.judgments.length > 0);
    const caseObj = explorer.judgments[0];
    assert.strictEqual(caseObj.actCode, 'BNSS');
    assert.strictEqual(caseObj.cnr, 'APHC010189322025');
  });

  // Test 15: Case with verified case-specific URL
  await runTest('O. Case with verified case-specific URL returns official sourceUrl', async () => {
    const rag = await legalRagService.queryJudgments('sexual harassment BNS Section 75');
    assert.strictEqual(rag.status, 'SUCCESS');
    const targetCase = rag.judgments.find((j) => j.title.includes('Dr. A. Sunitha'));
    assert(targetCase, 'Dr. A. Sunitha case should be retrieved');
    assert.strictEqual(targetCase.sourceUrl, 'https://github.com/vanga/indian-high-court-judgments/raw/main/28~2/2025/APHC010065432025.pdf');
  });

  // Test 16: Case without URL has sourceUrl = null
  await runTest('P. Case without verified case-specific URL has sourceUrl = null and provenance DATASET_COPY', async () => {
    const rag = await legalRagService.queryJudgments('police protection Section 18');
    assert.strictEqual(rag.status, 'SUCCESS');
    const targetCase = rag.judgments.find((j) => j.title.includes('K. Srilatha'));
    assert(targetCase, 'K. Srilatha case should be retrieved');
    assert.strictEqual(targetCase.sourceUrl, null);
    assert.strictEqual(targetCase.sourceType, 'DATASET_COPY');
  });

  // Test 17: Unrelated retrieved judgment filtering
  await runTest('Q. Legal RAG filters out completely unrelated judgments (returns NO_RELEVANT_CASE_FOUND)', async () => {
    const rag = await legalRagService.queryJudgments('quantum computing cryptography algorithm');
    assert(rag.status === 'NO_RELEVANT_CASE_FOUND' || rag.status === 'NO_VERIFIED_SOURCE_FOUND');
    assert.strictEqual(rag.judgments.length, 0);
  });

  // Test 18: Case explanation query without context
  await runTest('R. Case explanation query ("explain this case") prompts user for case details when context is missing', async () => {
    const res = await assistantService.processChatQuery(user, 'explain this case');
    assert.strictEqual(res.intent, 'CASE_EXPLANATION');
    assert(res.legalExplanation.includes('Please specify the case title or CNR number'));
  });

  // Test 19: Emergency phrase trigger
  await runTest('S. Emergency phrase ("Help me") triggers priority emergency distress workflow', async () => {
    const res = await assistantService.processChatQuery(user, 'Help me');
    assert.strictEqual(res.intent, 'EMERGENCY');
    assert.strictEqual(res.emergencyDetected, true);
    assert.strictEqual(res.emergencyTriggerRecommended, true);
  });

  // Test 20: Contextual follow-up ("At work")
  await runTest('T. Contextual follow-up ("At work") returns workplace harassment guidance when sessionContext lastIntent is PERSONAL_SAFETY_GUIDANCE', async () => {
    const sessionCtx = { lastIntent: 'PERSONAL_SAFETY_GUIDANCE' };
    const res = await assistantService.processChatQuery(user, 'At work', sessionCtx);
    assert.strictEqual(res.intent, 'PERSONAL_SAFETY_GUIDANCE');
    assert.strictEqual(res.questionType, 'PERSONAL_SAFETY_CONTEXT');
    assert(res.legalExplanation.includes('workplace harassment') || res.legalExplanation.includes('POSH Framework'));
  });

  // Clean up test user
  await User.deleteMany({ _id: user._id });

  console.log(`\n======================================================`);
  console.log(`Phase 9 Legal AI Corrective Refinement Summary: ${passCount} / ${testCount} PASSED`);
  console.log(`======================================================\n`);

  await mongoose.disconnect();
  process.exit(passCount === testCount ? 0 : 1);
}

runPhase9LegalRefinementTests();
