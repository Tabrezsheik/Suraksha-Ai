/**
 * SURAKSHA AI — Controlled Pre-Retrieval Conversation Router
 * Evaluates semantic user intent BEFORE any database or RAG retrieval.
 */

class ConversationRouter {
  normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    let str = text.toLowerCase().trim();
    // Strip common punctuation for cleaner intent matching
    str = str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ');
    str = str.replace(/\s{2,}/g, ' ').trim();
    // Collapse repeated characters beyond 2 (e.g. hloooo -> hlo)
    str = str.replace(/(.)\1{2,}/g, '$1');
    return str;
  }

  /**
   * Main pre-retrieval intent classification engine.
   * Enforces semantic meaning over crude keyword matching.
   */
  classifyMessage(message, sessionContext = {}) {
    const rawLower = (message || '').toLowerCase().trim();
    const norm = this.normalizeText(message);
    const lastIntent = sessionContext ? sessionContext.lastIntent : null;

    // 0. SESSION CONTEXT FOLLOW-UP GATE
    if (lastIntent === 'PERSONAL_SAFETY_GUIDANCE') {
      if (norm.includes('work') || norm.includes('office') || norm.includes('job') || norm.includes('online') || norm.includes('cyber') || norm.includes('partner') || norm.includes('relationship')) {
        return {
          intent: 'SAFETY',
          topic: 'PERSONAL_THREAT_CONTEXT',
          questionType: 'PERSONAL_SAFETY_CONTEXT',
          requiresRag: false,
          safetyLevel: 'HIGH',
          confidence: 0.96
        };
      }
    }

    // 1. SAFETY & EMERGENCY GATE — Evaluate immediate threat/danger statements
    const emergencyPatterns = [
      'help me', 'save me', 'i am in danger', "i'm in danger", 'someone is attacking me',
      'attacking me', 'attacked me', 'under attack', 'beating me', 'stabbed', 'with a gun',
      'with a knife', 'immediate help', 'call for help'
    ];
    const isEmergencyWordQuery = norm === 'what does emergency mean' || norm === 'what is an emergency' || norm === 'define emergency' || norm.includes('word emergency') || norm.includes('meaning of emergency');
    const isEducationalContext = norm.includes('hypothetical') || norm.includes('law exam') || norm.includes('exam question') || norm.includes('for study') || norm.includes('for my exam') || norm.includes('help me study') || norm.includes('help me learn') || norm.includes('help me understand') || norm.includes('study section');

    if (!isEmergencyWordQuery && !isEducationalContext && emergencyPatterns.some(p => norm.includes(p) || rawLower.includes(p))) {
      return {
        intent: 'EMERGENCY',
        topic: 'IMMEDIATE_ATTACK',
        questionType: 'EMERGENCY_DISTRESS',
        requiresRag: false,
        safetyLevel: 'CRITICAL',
        confidence: 0.98
      };
    }

    // Safety threat / fear statements (MUST NOT trigger automatic EmergencyEvent or SOS)
    const safetyThreatPhrases = [
      'someone is threatening me', 'someone keeps threatening me', 'threatening me',
      'someone is following me', 'being followed', 'i don\'t feel safe', 'idont feel safe',
      'i do not feel safe', 'i feel unsafe', 'feeling unsafe', 'i am scared', 'i feel scared',
      'feeling scared', 'i am being harassed', 'being harassed', 'i am feeling harassed',
      'feeling harassed', 'i am feeling targeted', 'i feel targeted', 'feeling targeted',
      'someone is stalking me'
    ];
    if (safetyThreatPhrases.some(phrase => norm.includes(phrase) || rawLower.includes(phrase))) {
      return {
        intent: 'SAFETY',
        topic: 'PERSONAL_THREAT',
        questionType: 'SAFETY_STATEMENT',
        requiresRag: false,
        safetyLevel: 'HIGH',
        confidence: 0.95
      };
    }

    // 2. SURAKSHA APPLICATION / FEATURE QUERY GATE
    const appFeatureKeywords = [
      'suraksha ai', 'suraksha', 'guardian mode', 'guardian', 'safe route', 'safe routes',
      'risk score', 'risk assessment', 'risk rating', 'trusted circle', 'emergency contacts',
      'voice sos', 'voice activation', 'silent sos', 'evidence capture', 'sim sms', 'check-in', 'check in'
    ];

    const isAppHelpQuestion = (
      norm.includes('understand') || norm.includes('explain') || norm.includes('how does') ||
      norm.includes('how do i') || norm.includes('what does') || norm.includes('what happens') ||
      norm.includes('what if') || norm.includes('calculate risk') || norm.includes('calculates risk') ||
      norm.includes('tell me about') || norm.includes('how it works') || norm.includes('how does it work')
    ) && appFeatureKeywords.some(k => norm.includes(k));
    const isWhatSurakshaDoes = norm.includes('what does suraksha') || norm.includes('what is suraksha ai') || norm.includes('how suraksha works');

    if (isAppHelpQuestion || isWhatSurakshaDoes || norm.includes('guardian mode') || (norm.includes('safe route') && norm.includes('risk'))) {
      let topic = 'GENERAL_APP';
      if (norm.includes('guardian')) topic = 'GUARDIAN_MODE';
      else if (norm.includes('safe route') || norm.includes('route')) topic = 'SAFE_ROUTE';
      else if (norm.includes('risk')) topic = 'RISK_ENGINE';
      else if (norm.includes('trusted circle') || norm.includes('contact')) topic = 'TRUSTED_CIRCLE';
      else if (norm.includes('voice sos')) topic = 'VOICE_SOS';

      return {
        intent: 'APP_RELATED',
        topic,
        questionType: 'FEATURE_EXPLANATION',
        requiresRag: true,
        safetyLevel: 'NONE',
        confidence: 0.96
      };
    }

    // 3. CASE EXPLORATION / EXPLANATION GATE
    if (norm.includes('case study') || norm.includes('case studies') || norm.includes('show me cases') || norm.includes('explore cases') || norm.includes('browse cases')) {
      return {
        intent: 'CASE_EXPLANATION',
        topic: 'CASE_EXPLORATION',
        questionType: 'CASE_EXPLORATION',
        requiresRag: true,
        safetyLevel: 'NONE',
        confidence: 0.95
      };
    }
    if (norm.includes('explain this case') || norm.includes('explain judgment') || norm.includes('what happened in this judgment')) {
      return {
        intent: 'CASE_EXPLANATION',
        topic: 'JUDGMENT_EXPLANATION',
        questionType: 'CASE_EXPLANATION',
        requiresRag: true,
        safetyLevel: 'NONE',
        confidence: 0.95
      };
    }

    // 4. LEGAL QUESTION GATE
    const isLegalDefinition = norm.includes('what is sexual harassment') || norm.includes('define sexual harassment') || norm.includes('what is domestic violence') || norm.includes('define domestic violence') || norm.includes('what is stalking');
    const sectionRegex = /\b(?:sections|section|sec|s\.)\s*(\d+[a-z]?(?:\s*\([^)]+\))*)/i;
    const isComparison = (norm.includes('compare') || norm.includes('difference between') || norm.includes('distinguish')) && (sectionRegex.test(rawLower) || sectionRegex.test(norm) || norm.includes('pwdva') || norm.includes('bns') || norm.includes('bnss') || norm.includes('pocso'));
    const isLegalSection = sectionRegex.test(rawLower) || sectionRegex.test(norm) || norm.includes('bnss section') || norm.includes('pwdva section') || norm.includes('bns section') || norm.includes('pocso section');
    const isLegalRightsOrCauses = norm.includes('rights in domestic violence') || norm.includes('causes of domestic violence') || norm.includes('victim rights') || norm.includes('legal advice') || norm.includes('legal guidance');

    if (isLegalDefinition || isLegalSection || isLegalRightsOrCauses || isComparison) {
      let topic = 'GENERAL_LEGAL';
      let questionType = 'DEFINITION';
      if (isComparison) { topic = 'SECTION_COMPARISON'; questionType = 'SECTION_COMPARISON'; }
      else if (norm.includes('sexual harassment')) { topic = 'SEXUAL_HARASSMENT'; questionType = 'DEFINITION'; }
      else if (norm.includes('domestic violence')) { topic = 'DOMESTIC_VIOLENCE'; questionType = norm.includes('causes') ? 'CAUSES' : 'RIGHTS'; }
      else if (isLegalSection) { topic = 'SECTION_EXPLANATION'; questionType = 'SECTION_EXPLANATION'; }

      return {
        intent: 'LEGAL',
        topic,
        questionType,
        requiresRag: true,
        safetyLevel: 'NONE',
        confidence: 0.96
      };
    }

    // Broad legal keyword fallback
    const explicitLegalTerms = ['court', 'police station', 'fir registration', 'pwdva', 'bnss', 'bns', 'pocso', 'magistrate', 'protection order', 'residence order', 'high court'];
    if (explicitLegalTerms.some(t => norm.includes(t))) {
      return {
        intent: 'LEGAL',
        topic: 'GENERAL_LEGAL',
        questionType: 'GENERAL_LEGAL_GUIDANCE',
        requiresRag: true,
        safetyLevel: 'NONE',
        confidence: 0.90
      };
    }

    // 5. GENERAL KNOWLEDGE GATE
    const generalKnowledgePatterns = [
      'what is python', 'explain recursion', 'who invented computers', 'what should i learn today',
      'can you motivate me', 'how do computers work', 'what is gravity', 'explain quantum',
      'can you help me with my homework'
    ];
    if (generalKnowledgePatterns.some(p => norm.includes(p) || rawLower.includes(p))) {
      return {
        intent: 'GENERAL_KNOWLEDGE',
        topic: 'GENERAL_KNOWLEDGE',
        questionType: 'GENERAL_KNOWLEDGE',
        requiresRag: false,
        safetyLevel: 'NONE',
        confidence: 0.95
      };
    }

    // 6. GREETING & CASUAL CONVERSATION GATE
    const casualGreetings = ['hi', 'hello', 'hlo', 'hloo', 'hey', 'helo', 'helllo', 'good morning', 'good evening', 'good afternoon', 'greetings', 'namaste'];
    const casualChitChat = ['how are you', 'tell me a joke', 'i\'m bored', 'im bored', 'what\'s up', 'whatsup', 'tell me a story', 'who are you'];

    const firstWord = norm.split(' ')[0];
    if (casualGreetings.includes(norm) || (casualGreetings.includes(firstWord) && norm.length < 20)) {
      return {
        intent: 'CASUAL',
        topic: null,
        questionType: 'GREETING',
        requiresRag: false,
        safetyLevel: 'NONE',
        confidence: 0.98
      };
    }

    if (casualChitChat.some(c => norm.includes(c))) {
      return {
        intent: 'CASUAL',
        topic: null,
        questionType: 'CASUAL_CONVERSATION',
        requiresRag: false,
        safetyLevel: 'NONE',
        confidence: 0.98
      };
    }

    // 7. DEFAULT CASUAL / GENERAL CONVERSATION FALLBACK
    return {
      intent: 'CASUAL',
      topic: null,
      questionType: 'GENERAL_CONVERSATION',
      requiresRag: false,
      safetyLevel: 'NONE',
      confidence: 0.85
    };
  }
}

module.exports = new ConversationRouter();
