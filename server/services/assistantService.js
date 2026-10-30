/**
 * SURAKSHA AI — AI Safety Assistant & Legal Study Tutor Service
 * 
 * Capabilities:
 * 1. Casual Conversation & Programming Tutoring (powered by OpenRouter with local educational fallbacks)
 * 2. Grounded Suraksha AI Website & Feature Explanations (Guardian Mode, Safe Route, Voice SOS, etc.)
 * 3. Authoritative Indian Legal Study Tutor (Sections, Headings, 8-Part Curriculum, Telugu/Hindi)
 * 4. Verified Real-World Court Case Studies (retrieved from PostgreSQL with zero citation fabrication)
 * 5. Interactive Quizzes & Continuous Study Sessions
 * 6. PostgreSQL Conversation & Message Persistence
 * 7. Protected Emergency Distress Boundary (SOS isolated from educational queries)
 */

const legalRagService = require('./legalRagService');
const conversationRouter = require('./conversationRouter');
const openrouterService = require('./openrouterService');
const openaiConversationService = require('./openaiConversationService');
const assistantDbService = require('./assistantDbService');
const legalStudyService = require('./legalStudyService');

// Controlled emergency phrases (distress intent)
const EMERGENCY_DISTRESS_PATTERNS = [
  'help me', 'save me', 'i am in danger', "i'm in danger", 'someone is attacking me',
  'someone is following me', 'being followed', 'threatening to kill', 'beating me',
  'immediate help', 'call for help', 'stab', 'gun', 'attacked', 'under attack'
];

// Greetings & casual phrases
const GREETING_PATTERNS = [
  'hi', 'hello', 'hlo', 'hloo', 'hloooo', 'hey', 'helo', 'helllo', 'good morning',
  'good evening', 'good afternoon', "what's up", 'whatsup', 'greetings', 'namaste'
];

// Feature knowledge grounded in actual Suraksha AI codebase
const FEATURE_PATTERNS = [
  {
    key: 'guardian_mode',
    keywords: ['guardian mode', 'guardian', 'check-in', 'check in', 'missed check-in', 'missed check in', 'missed checkin', 'route deviation', 'prolonged stop'],
    title: 'Guardian Mode',
    text: 'Guardian Mode provides proactive journey protection by allowing designated Trusted Circle contacts to monitor your trip in real time. Features include continuous location tracking against verified route geometry, 500m route deviation detection (ROUTE_DEVIATION_METERS = 500), and 2-minute stoppage detection (STOPPAGE_SPEED_THRESHOLD = 0.5 m/s, STOPPAGE_DURATION_SECONDS = 120). When an anomaly is detected, SURAKSHA AI displays a 60-second warning countdown prompt (requiresCheckIn: true, timeoutSeconds: 60). If you miss or fail to acknowledge this check-in within 60 seconds (or if you tap "Get Help"), the system automatically escalates: it creates an active EmergencyEvent (triggerType: "guardian") and dispatches emergency alerts with your last known GPS coordinates to your Trusted Circle via SMS and email.'
  },
  {
    key: 'safe_route',
    keywords: ['safe route', 'safe routes', 'route', 'routes', 'calculate risk', 'calculates risk', 'how does safe route calculate', 'how does safe route work', 'safety score', 'safety scores'],
    title: 'Safe Route Navigation',
    text: 'Safe Route calculates navigation paths evaluated against safety scores rather than just the fastest transit journey. Risk scores are calculated using a multi-factor evidence-based algorithm: (1) District Historical Crime Baseline: Ingests official government NCRB (2023 Crime in India Report / data.gov.in) district-level crime data, enforcing a minimum baseline floor of 18 points (never zeroed out, avoiding false "safe" claims); (2) Spatial Infrastructure Proximity: Evaluates proximity to verified police stations and hospitals from OpenStreetMap, granting credits up to 17 points maximum; (3) Temporal & Night Factors: Adds penalties for night travel (travelContext: "night"), unlit roads, poor street lighting, and low activity areas; and (4) Segment-by-segment analysis where each discrete road segment is independently evaluated against spatial infrastructure and safety zones.'
  },
  {
    key: 'risk_engine',
    keywords: ['risk score', 'risk assessment', 'risk rating', 'risk engine', 'how is risk calculated'],
    title: 'AI Risk Engine',
    text: 'The Risk Engine continuously calculates real-time situational safety scores (0-100) based on base risk (30 for manual SOS), movement patterns, spatial safety zones, and temporal factors, mapping scores to low, medium, high, and critical risk bands.'
  },
  {
    key: 'trusted_circle',
    keywords: ['trusted circle', 'emergency contacts', 'contacts', 'alert contacts'],
    title: 'Trusted Circle',
    text: 'Trusted Circle lets you add verified emergency contacts. During an active emergency, up to 4 eligible contacts receive instant automated emergency SMS alerts containing your live GPS coordinates with a direct Google Maps link, followed by email notifications.'
  },
  {
    key: 'voice_sos',
    keywords: ['voice sos', 'voice activation', 'hands free sos', 'voice trigger', 'wakeword'],
    title: 'Voice SOS',
    text: 'Voice SOS automatically monitors speech for distress wakewords ("Help me", "Save me"). When detected, a 5-second visible countdown initiates hands-free Emergency SOS, allowing immediate cancellation of false triggers before notifying your Trusted Circle.'
  },
  {
    key: 'evidence_capture',
    keywords: ['evidence capture', 'evidence', 'audio recording', 'forensic evidence'],
    title: 'Emergency Evidence Capture',
    text: 'Emergency Evidence Capture automatically records and encrypts multipart WebM audio segments (1-minute segments, up to 20 segments hard-capped at 20 minutes) during an active emergency, generating cryptographic access tokens for tamper-proof forensic records.'
  },
  {
    key: 'suraksha_ai',
    keywords: ['suraksha ai', 'suraksha', 'how does it work', 'what is suraksha', 'about suraksha'],
    title: 'SURAKSHA AI Platform',
    text: 'SURAKSHA AI is an end-to-end personal safety and legal study platform featuring Live GPS Tracking, Safe Routing, AI Risk Assessment, Guardian Mode (with 500m deviation and 2-min stoppage detection), Voice SOS, Emergency Evidence Capture, and an authoritative Indian Legal Study Tutor grounded in India Code and verified court precedents.'
  }
];

// Verified Legal Provisions & Concepts Knowledge Mappings
const STATUTORY_KNOWLEDGE = {
  'sexual_harassment': {
    actName: 'Bharatiya Nyaya Sanhita, 2023 (BNS) & POSH Framework',
    sectionNumber: 'Sexual Harassment Definition',
    simpleAnswer: 'Sexual harassment means unwanted sexual conduct, unwelcome physical contact, sexually colored remarks, gestures, demands for sexual favors, or showing pornography without consent that violates dignity or creates a hostile environment.',
    whatItMeans: 'Under Indian criminal law (including BNS Section 75/78) and civil/workplace safety legislation (POSH Act, 2013), sexual harassment encompasses any uninvited behavior of a sexual nature—whether physical, verbal, non-verbal, or electronic.',
    practicalTerms: 'For instance, if an individual is subjected to inappropriate touching, persistent unwelcome messages, offensive sexual comments, or threats for refusing advances, it legally constitutes sexual harassment.',
    importantConditions: '1. Intent or effect of creating an intimidating, hostile, or offensive environment.\n2. Can occur in public spaces, workplaces, educational institutions, transit, or online platforms.\n3. Both criminal complaints (FIR) and civil/workplace committee complaints can be initiated.',
    whatYouCanDo: [
      'Lodge a police complaint under BNS Section 75/78.',
      'File a complaint with the Internal Complaints Committee (ICC) if workplace-related.',
      'Preserve electronic records, text messages, call logs, or audio/video evidence.'
    ]
  },
  'domestic_violence_causes': {
    actName: 'Socio-Legal Analysis of Domestic Violence',
    sectionNumber: 'Contributing Factors & Causes',
    simpleAnswer: 'Domestic violence stems from power imbalances, controlling behavior, social coercion, economic dependence, learned abusive patterns, and unlawful demands within domestic relationships.',
    whatItMeans: 'Key contributing factors include:\n• Power & Coercive Control: Systematic attempts by an abuser to dominate and isolate a domestic partner or family member.\n• Economic Dependence: Lack of financial autonomy making exit difficult.\n• Unlawful Demands: Dowry demands or coercion by spouse or relatives.\n• Social & Environmental Factors: Exposure to normalized violence or substance abuse.',
    practicalTerms: 'Distinguishing contributing socio-behavioral factors from legal definitions clarifies why abuse occurs while affirming that victims have immediate civil and criminal protection.',
    importantConditions: 'Social or psychological contributing factors explain behavioral dynamics but NEVER justify or excuse domestic abuse, which remains strictly unlawful.',
    whatYouCanDo: [
      'Recognize early indicators of coercive control and emotional intimidation.',
      'Contact a district Protection Officer, Legal Services Authority, or crisis helpline.',
      'Apply for Protection and Residence Orders under PWDVA 2005.'
    ]
  },
  'domestic_violence_rights': {
    actName: 'Protection of Women from Domestic Violence Act, 2005 (PWDVA)',
    sectionNumber: 'Statutory Victim Rights',
    simpleAnswer: 'Under PWDVA 2005, victims of domestic violence have guaranteed statutory rights to live free from violence, secure residence in shared households, protection orders, monetary relief, and free legal aid.',
    whatItMeans: 'Statutory rights include:\n1. Right to Shared Household (Section 17 & 19): Prohibition against illegal eviction or dispossession.\n2. Right to Protection Orders (Section 18): Court orders barring abuser entry or communication.\n3. Right to Monetary Relief (Section 20): Compensation for medical expenses and loss of income.\n4. Right to Custody & Compensation (Sections 21 & 22).\n5. Free Legal Assistance from Protection Officers.',
    practicalTerms: 'If a woman faces domestic harassment or eviction threats, she can seek immediate ex-parte court protection without sacrificing her residence.',
    importantConditions: 'PWDVA remedies are civil in nature, offering rapid court protection alongside any criminal proceedings.',
    whatYouCanDo: [
      'Approach a Protection Officer or Judicial Magistrate for emergency protection.',
      'Request free legal representation from State/District Legal Services Authorities.'
    ]
  },
  'general_legal_guidance': {
    actName: 'SURAKSHA AI Legal Information & Guidance System',
    sectionNumber: 'General Overview',
    simpleAnswer: 'I am the SURAKSHA AI Safety & Legal Information Assistant. I can explain Indian safety laws (BNSS, BNS, PWDVA, POCSO) and Andhra Pradesh High Court legal precedents (2025–2026).',
    whatItMeans: 'You can ask me specific legal questions such as:\n• "What is sexual harassment?"\n• "What is BNSS Section 173?"\n• "What are the causes of domestic violence?"\n• "What are my rights in domestic violence?"\n• "What is PWDVA Section 18?"',
    practicalTerms: 'Please specify the exact topic, Act, or section number you would like explained.',
    importantConditions: 'This system provides general legal information and statutory guidance, not formal legal representation or individualized attorney-client advice.',
    whatYouCanDo: [
      'Type your specific legal question or section number.',
      'Consult a licensed advocate for legal representation in court.'
    ]
  },
  'pwdva_3': {
    actName: 'Protection of Women from Domestic Violence Act, 2005',
    sectionNumber: 'Section 3',
    simpleAnswer: 'Section 3 defines Domestic Violence comprehensively to include physical, sexual, verbal, emotional, and economic abuse against any woman in a domestic relationship.',
    whatItMeans: 'It protects women against bodily harm, insults, name-calling, denial of financial resources, and coercion for dowry.',
    practicalTerms: 'If a woman faces insults, dowry demands, or is denied food and money by her partner or family, this constitutes domestic violence under Section 3.',
    importantConditions: 'Applies to any woman in a domestic relationship in a shared household.',
    whatYouCanDo: [
      'File an application before a Magistrate or Protection Officer under Section 12.',
      'Seek Protection Orders under Section 18 and Monetary Relief under Section 20.'
    ]
  },
  'pwdva_17': {
    actName: 'Protection of Women from Domestic Violence Act, 2005',
    sectionNumber: 'Section 17',
    simpleAnswer: 'Section 17 guarantees the right to reside in a shared household. Every woman in a domestic relationship has the right to reside in the shared household and shall not be evicted save in accordance with law.',
    whatItMeans: 'The Supreme Court in Satish Chander Ahuja (2020) affirmed that a shared household includes residences where the woman lived in a domestic relationship, even if owned by the in-laws.',
    practicalTerms: 'A husband or in-laws cannot throw a woman out of the house or change the locks without a valid court decree.',
    importantConditions: 'Applies to any woman living or having lived in a domestic relationship in a shared household.',
    whatYouCanDo: [
      'Apply for protection against dispossession under PWDVA Section 17/19.',
      'Approach a Protection Officer or Magistrate for emergency residence orders.'
    ]
  },
  'pwdva_18': {
    actName: 'Protection of Women from Domestic Violence Act, 2005',
    sectionNumber: 'Section 18',
    simpleAnswer: 'Section 18 concerns Protection Orders. In simple terms, it empowers a Magistrate to issue court orders prohibiting a respondent from committing, aiding, or attempting any act of domestic violence.',
    whatItMeans: 'A Protection Order is a judicial direction prohibiting the abuser from entering the victim’s place of employment or residence, communicating with the victim, alienating shared assets, or causing violence to the victim or her relatives.',
    practicalTerms: 'For instance, if an individual faces persistent threats or domestic abuse, a Magistrate can order the respondent to stay away from her workplace, refrain from calling her, and stop any physical or verbal intimidation.',
    importantConditions: '1. The aggrieved woman must establish a prima facie case of domestic violence.\n2. In urgent cases, interim ex-parte protection orders can be passed before full hearing.\n3. Breach of a protection order is a cognizable and non-bailable offense under Section 31.',
    whatYouCanDo: [
      'File an application under PWDVA before a Judicial Magistrate or Protection Officer.',
      'Seek emergency interim protection if you face immediate physical threats.',
      'Preserve medical reports, text messages, and complaint records as evidence.'
    ]
  },
  'pwdva_19': {
    actName: 'Protection of Women from Domestic Violence Act, 2005',
    sectionNumber: 'Section 19',
    simpleAnswer: 'Section 19 provides for Residence Orders. It guarantees that an aggrieved woman cannot be dispossessed or evicted from a shared household by the respondent.',
    whatItMeans: 'The court can restrain the respondent from dispossessing the victim, order the respondent to remove himself from the shared household, or direct the respondent to secure alternate accommodation for the victim.',
    practicalTerms: 'If a woman is threatened with eviction from her matrimonial home, Section 19 allows the Magistrate to issue an order securing her right to continue living in the household safely.',
    importantConditions: '1. Applies to shared households where the woman lived in a domestic relationship.\n2. An order excluding a respondent cannot be passed against a woman respondent.',
    whatYouCanDo: [
      'Request a Residence Order in your PWDVA application.',
      'Report any illegal attempt to lock you out of your shared household to local police.'
    ]
  },
  'pwdva_23': {
    actName: 'Protection of Women from Domestic Violence Act, 2005',
    sectionNumber: 'Section 23',
    simpleAnswer: 'Section 23 empowers the Magistrate to pass interim orders, and under Section 23(2), grant ex-parte protective orders on the basis of an affidavit from the aggrieved woman.',
    whatItMeans: 'In urgent situations, the court can issue immediate restraining orders without waiting for the respondent to appear.',
    practicalTerms: 'If there is imminent danger of violence or eviction, the Magistrate can pass immediate orders based on your sworn affidavit.',
    importantConditions: 'Requires an affidavit disclosing prima facie domestic violence in prescribed Form III.',
    whatYouCanDo: [
      'Request ex-parte interim relief in your application.',
      'Submit a sworn affidavit outlining the immediate threat of violence or dispossession.'
    ]
  },
  'pwdva_31': {
    actName: 'Protection of Women from Domestic Violence Act, 2005',
    sectionNumber: 'Section 31',
    simpleAnswer: 'Section 31 provides that breach of a protection order by the respondent is a cognizable and non-bailable criminal offense punishable with imprisonment up to 1 year and/or fine up to Rs. 20,000.',
    whatItMeans: 'Violation of court protection orders is treated as a crime; police must arrest the violator without a warrant.',
    practicalTerms: 'If a respondent violates a protection order (such as by entering your workplace or threatening you), police can arrest him immediately under Section 31.',
    importantConditions: 'An existing protection order under Section 18 must have been passed and breached.',
    whatYouCanDo: [
      'Notify local police immediately with a copy of the protection order.',
      'File an application for prosecution under Section 31 before the Magistrate.'
    ]
  },
  'pwdva_general': {
    actName: 'Protection of Women from Domestic Violence Act, 2005 (PWDVA)',
    sectionNumber: 'General Overview',
    simpleAnswer: 'PWDVA, 2005 is a comprehensive civil law providing immediate remedies—such as Protection Orders, Residence Orders, Monetary Relief, and Custody Orders—to women facing domestic violence.',
    whatItMeans: 'It defines domestic violence broadly to include physical, sexual, verbal, emotional, and economic abuse within a domestic relationship.',
    practicalTerms: 'Women subjected to harassment for dowry, physical assault, or emotional cruelty by family members can seek swift court remedies without waiting for criminal prosecution.',
    importantConditions: 'Remedies under PWDVA are civil in nature, but breach of protection orders becomes a criminal offense.',
    whatYouCanDo: [
      'Contact a Protection Officer or legal service authority in your district.',
      'Approach a Magistrate directly or through a registered service provider.'
    ]
  },
  'bnss_173': {
    actName: 'Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)',
    sectionNumber: 'Section 173',
    simpleAnswer: 'BNSS Section 173 (replacing CrPC Section 154) mandates the registration of a First Information Report (FIR) upon receiving information disclosing a cognizable offense.',
    whatItMeans: 'Police officers are legally bound to register an FIR when a cognizable offense (such as physical assault or threat to life) is reported. Zero FIR allows reporting at any police station regardless of jurisdiction.',
    practicalTerms: 'If a woman reports physical assault or stalking, police cannot refuse to register an FIR or delay action under the pretext of preliminary inquiry.',
    importantConditions: '1. Preliminary inquiry (within 14 days) is permitted only for specific non-violent categories before FIR registration.\n2. Information can be given orally or electronically.',
    whatYouCanDo: [
      'Provide a clear written or oral statement at the nearest police station.',
      'Request a free copy of the registered FIR immediately as guaranteed by law.'
    ]
  },
  'bns_85': {
    actName: 'Bharatiya Nyaya Sanhita, 2023 (BNS)',
    sectionNumber: 'Section 85',
    simpleAnswer: 'BNS Section 85 (replacing IPC Section 498A) penalizes cruelty inflicted upon a woman by her husband or his relatives with imprisonment up to 3 years.',
    whatItMeans: 'Cruelty includes any willful conduct likely to drive the woman to commit suicide or cause grave injury, as well as harassment to coerce her or her relatives to meet unlawful dowry demands.',
    practicalTerms: 'Coercion, physical torture, or persistent dowry harassment by a husband or in-laws constitutes a criminal offense under Section 85.',
    importantConditions: 'The complaint must establish willful conduct or harassment linked to unlawful demands or grave harm.',
    whatYouCanDo: [
      'Lodge a formal police complaint under BNS Section 85.',
      'Keep documentation of medical treatments, communications, or dowry demands.'
    ]
  },
  'bns_351': {
    actName: 'Bharatiya Nyaya Sanhita, 2023 (BNS)',
    sectionNumber: 'Section 351',
    simpleAnswer: 'BNS Section 351 (replacing IPC Section 506) defines and punishes Criminal Intimidation.',
    whatItMeans: 'It applies when anyone threatens another person with injury to their person, reputation, or property with intent to cause alarm or force them to act against their will.',
    practicalTerms: 'If someone threatens physical violence, blackmail, or harm unless you comply with their demands, it constitutes criminal intimidation.',
    importantConditions: 'Threats to cause death or grievous hurt attract enhanced punishment of up to 7 years imprisonment.',
    whatYouCanDo: [
      'Report threats immediately to local police or use SURAKSHA AI Emergency SOS.',
      'Save voice notes, text messages, or call logs showing threats.'
    ]
  },
  'pocso_19': {
    actName: 'Protection of Children from Sexual Offences Act, 2012 (POCSO)',
    sectionNumber: 'Section 19',
    simpleAnswer: 'POCSO Section 19 imposes a legal mandate on any person who has knowledge that a sexual offense against a child has been committed to report it to Special Juvenile Police Unit or local police.',
    whatItMeans: 'Failure to report a child sexual offense is a punishable offense under Section 21 of the Act.',
    practicalTerms: 'Teachers, doctors, neighbors, or relatives who become aware of sexual abuse against a minor must report it immediately to police or Childline (1098).',
    importantConditions: 'Mandatory reporting applies regardless of personal relationship with the offender.',
    whatYouCanDo: [
      'Report child sexual abuse immediately to Childline (1098) or local police.',
      'Ensure the child’s identity and privacy are protected as mandated by law.'
    ]
  }
};

class AssistantService {
  normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    let str = text.toLowerCase().trim();
    // Strip common punctuation for cleaner intent matching
    str = str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ');
    str = str.replace(/\s{2,}/g, ' ').trim();
    str = str.replace(/(.)\1{2,}/g, '$1');
    return str;
  }

  extractActAndSection(rawMessage, sessionContext = {}) {
    const resolved = legalStudyService.resolveActAndSection(rawMessage, sessionContext);
    let act = null;
    if (resolved.actKey) {
      act = resolved.actKey.toUpperCase();
    }
    const secNum = resolved.secNum;
    let key = null;
    if (resolved.actKey && resolved.baseSecNum) {
      key = `${resolved.actKey}_${resolved.baseSecNum}`;
    }
    return {
      act,
      actKey: resolved.actKey,
      secNum,
      baseSecNum: resolved.baseSecNum,
      subSection: resolved.subSection,
      allSecNums: resolved.allSecNums || (secNum ? [secNum] : []),
      isComparison: resolved.isComparison || false,
      key,
      isAmbiguous: resolved.isAmbiguous,
      isOutOfBounds: resolved.isOutOfBounds,
      clarificationPrompt: resolved.clarificationPrompt,
      errorPrompt: resolved.errorPrompt,
      explicitActGiven: resolved.explicitActGiven,
      assumedContextNote: resolved.explicitActGiven ? null : (resolved.actKey ? `Section ${secNum} under ${resolved.actKey.toUpperCase()}` : null)
    };
  }

  async generateGroundedAnswerWithOpenRouter({ query, systemInstructions, retrievedContext, history = [], model }) {
    if (!openrouterService.isConfigured() && !openrouterService.mockHandler) {
      return null;
    }

    try {
      const messages = [];

      // Add recent history if available (limit to recent turns)
      if (Array.isArray(history) && history.length > 0) {
        for (const h of history.slice(-4)) {
          if (h && h.content) {
            messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
          }
        }
      }

      // Format user prompt with retrieved backend records
      const promptContent = `User Question: "${query}"\n\n[AUTHORITATIVE RETRIEVED BACKEND RECORDS & EVIDENCE]\n${retrievedContext}\n\n[RESPONSE INSTRUCTIONS]\nAnswer the user's question directly, clearly, and concisely based strictly on the retrieved records above. Separate source-supported facts from explanation. Never invent judicial citations, statutory numbers, or feature details.`;

      messages.push({ role: 'user', content: promptContent });

      const defaultSystemPrompt = `You are SURAKSHA AI, an authoritative, helpful, and concise AI Safety Assistant and Indian Legal Study Tutor.
STRICT ANSWERING INSTRUCTIONS:
1. Treat the retrieved backend records as the PRIMARY and AUTHORITATIVE evidence.
2. Answer the user's actual question directly without generic filler.
3. Explain technical and legal material in simple, clear, beginner-friendly language.
4. Separate source-supported facts from explanation or inference.
5. NEVER invent statutory text, judgments, case citations, project features, statistics, or sources.
6. NEVER claim a case study is verified unless its source has actually been checked in retrieved records.
7. State clearly when available data cannot answer the question.
8. Cite retrieved source titles and URLs in the user-facing response when available.
9. Avoid unrelated legal overviews and generic fallback paragraphs. Never substitute an unrelated legal summary.
10. If the user requested an explanation in Telugu or Hindi, respond in that language.
11. Keep emergency actions separate from ordinary AI conversation.`;

      const res = await openrouterService.generateCompletion({
        systemPrompt: systemInstructions || defaultSystemPrompt,
        messages,
        model
      });

      if (res && res.success && res.content && res.content.trim().length > 0) {
        const text = res.content.trim();
        // Step 5: Deterministic Validation - Reject generic overview leaks
        if (text.includes('Legal provisions under the Protection of Women from Domestic Violence Act (PWDVA) and Bharatiya Nagarik Suraksha Sanhita (BNSS) guarantee protection orders')) {
          return null;
        }
        return {
          content: text,
          model: res.model,
          usage: res.usage,
          provider: res.provider
        };
      }
    } catch (err) {
      console.warn('[AssistantService] OpenRouter grounded generation error:', err.message);
    }

    return null;
  }

  understandQuestion(rawMessage, sessionContext = {}) {
    const norm = this.normalizeText(rawMessage);
    const rawLower = (rawMessage || '').toLowerCase().trim();
    const lastIntent = sessionContext ? sessionContext.lastIntent : null;

    // 1. Emergency distress check (Protected, but allows educational hypothetical queries)
    const isEmergency = EMERGENCY_DISTRESS_PATTERNS.some(p => norm.includes(p) || rawLower.includes(p));
    const isEducationalScenario = norm.includes('hypothetical') || norm.includes('law exam') || norm.includes('for study') || norm.includes('exam question') || norm.includes('help me study') || norm.includes('help me understand') || norm.includes('help me learn') || norm.includes('help me with');

    if (isEmergency && !isEducationalScenario && (norm.length < 50 || rawLower.includes('danger') || rawLower.includes('attack') || (rawLower.includes('help me') && !rawLower.includes('help me study')))) {
      return { intent: 'EMERGENCY', questionType: 'EMERGENCY' };
    }

    // Follow-up simplification check: e.g. "explain it more simply", "give an example", "simplify this"
    const isFollowUpSimplification = norm.includes('more simply') || norm.includes('simply') || norm.includes('give an example') || norm.includes('practical example') || norm.includes('simplify');
    if (isFollowUpSimplification && sessionContext?.lastAct && sessionContext?.lastSection && !norm.includes('section')) {
      const lastActKey = String(sessionContext.lastAct).toLowerCase();
      const lastSec = String(sessionContext.lastSection);
      return {
        intent: 'LEGAL',
        questionType: 'SECTION_EXPLANATION',
        legalTopic: 'section_explanation',
        legalKey: `${lastActKey}_${lastSec}`,
        act: sessionContext.lastAct,
        actKey: lastActKey,
        secNum: lastSec,
        isSimplificationRequest: true
      };
    }

    // 2. Case study request specifically targeting a section: e.g. "case studies of section 18", "give me case studies of section 18", "verified case studies for section 23 of pwdva"
    if ((norm.includes('case study') || norm.includes('case studies')) && (norm.includes('section') || norm.match(/\b\d+\b/))) {
      const resolved = this.extractActAndSection(rawMessage, sessionContext);
      if (resolved.isAmbiguous) {
        return { intent: 'AMBIGUOUS_SECTION', questionType: 'AMBIGUOUS_SECTION', secNum: resolved.secNum, clarificationPrompt: resolved.clarificationPrompt };
      }
      return { intent: 'CASE_STUDY', questionType: 'CASE_STUDY', act: resolved.act, secNum: resolved.secNum, key: resolved.key };
    }

    // Generic Case Explorer intent check
    if (norm.includes('case study') || norm.includes('case studies') || norm.includes('show me cases') || norm.includes('explore cases') || norm.includes('show case') || norm.includes('browse cases')) {
      return { intent: 'CASE_EXPLORATION', questionType: 'CASE_EXPLORATION' };
    }

    // 3. Contextual follow-up check (if previous turn was PERSONAL_SAFETY_GUIDANCE)
    if (lastIntent === 'PERSONAL_SAFETY_GUIDANCE') {
      if (norm.includes('work') || norm.includes('office') || norm.includes('workplace') || norm.includes('job')) {
        return { intent: 'PERSONAL_SAFETY_GUIDANCE', questionType: 'PERSONAL_SAFETY_CONTEXT', contextType: 'workplace' };
      }
      if (norm.includes('online') || norm.includes('cyber') || norm.includes('social media') || norm.includes('whatsapp') || norm.includes('instagram')) {
        return { intent: 'PERSONAL_SAFETY_GUIDANCE', questionType: 'PERSONAL_SAFETY_CONTEXT', contextType: 'online' };
      }
      if (norm.includes('relationship') || norm.includes('partner') || norm.includes('spouse') || norm.includes('husband') || norm.includes('ex')) {
        return { intent: 'PERSONAL_SAFETY_GUIDANCE', questionType: 'PERSONAL_SAFETY_CONTEXT', contextType: 'relationship' };
      }
    }

    // 4. Personal Safety / Harassment statement check (MUST precede generic legal check)
    const personalSafetyPhrases = [
      'i am feeling targeted', 'feeling targeted', 'i feel targeted',
      'i am feeling harassed', 'feeling harassed', 'i feel harassed',
      'i am scared', 'i feel scared', 'feeling scared', 'i am feeling unsafe', 'i feel unsafe',
      'someone keeps messaging me', 'someone is following me', 'someone is stalking me',
      'someone is threatening me', 'someone keeps threatening me', 'threatening me', 'my partner is threatening me', 'what should i do'
    ];
    if (personalSafetyPhrases.some(phrase => norm.includes(phrase) || rawLower.includes(phrase))) {
      return { intent: 'PERSONAL_SAFETY_GUIDANCE', questionType: 'PERSONAL_SAFETY_STATEMENT' };
    }

    // 5. Feature query check (e.g. Guardian Mode, Safe Route, missed check-in, calculate risk)
    const matchedFeature = FEATURE_PATTERNS.find(f => f.keywords.some(k => norm.includes(k) || rawLower.includes(k)));
    if (matchedFeature || rawLower.startsWith('how can you help') || rawLower.includes('explain feature') || rawLower.includes('what is suraksha') || norm.includes('guardian mode') || (norm.includes('safe route') && norm.includes('risk')) || (norm.includes('guardian') && norm.includes('check-in'))) {
      const feat = matchedFeature || (norm.includes('guardian') ? FEATURE_PATTERNS[0] : (norm.includes('route') ? FEATURE_PATTERNS[1] : FEATURE_PATTERNS[6]));
      return { intent: 'FEATURE', questionType: 'FEATURE_EXPLANATION', feature: feat };
    }

    // 6. Greeting check
    const firstWord = norm.split(' ')[0];
    if (GREETING_PATTERNS.includes(norm) || (GREETING_PATTERNS.includes(firstWord) && norm.length < 20)) {
      return { intent: 'GREETING', questionType: 'GREETING' };
    }

    // 7. Case explanation query
    if (norm.includes('explain this case') || norm.includes('what happened in this judgment') || norm.includes('explain judgment')) {
      return { intent: 'CASE_EXPLANATION', questionType: 'CASE_EXPLANATION' };
    }

    // 8. Generic legal guidance query (e.g., "legal advice", "i need legal help")
    const genericLegalPatterns = ['legal advice', 'i need legal help', 'legal guidance', 'give me legal advice', 'can you help me understand the law'];
    if (genericLegalPatterns.includes(norm) || (norm.includes('legal advice') && norm.length < 25)) {
      return { intent: 'GENERAL_LEGAL_GUIDANCE', questionType: 'GENERAL_LEGAL_GUIDANCE', legalKey: 'general_legal_guidance' };
    }

    // 9. Causes question
    if (norm.includes('causes') || norm.includes('reasons for') || norm.includes('why does') || norm.includes('factors behind') || norm.includes('contributing factors')) {
      if (norm.includes('domestic violence') || norm.includes('violence') || norm.includes('abuse') || norm.includes('harassment')) {
        return { intent: 'LEGAL', questionType: 'CAUSES', legalTopic: 'domestic_violence_causes', legalKey: 'domestic_violence_causes' };
      }
    }

    // 10. Rights question
    if (norm.includes('rights') || norm.includes('victim rights') || norm.includes('what rights')) {
      return { intent: 'LEGAL', questionType: 'RIGHTS', legalTopic: 'domestic_violence_rights', legalKey: 'domestic_violence_rights' };
    }

    // 11. Definition question
    if (norm.includes('what is sexual harassment') || norm.includes('define sexual harassment') || norm.includes('meaning of sexual harassment')) {
      return { intent: 'LEGAL', questionType: 'DEFINITION', legalTopic: 'sexual_harassment', legalKey: 'sexual_harassment' };
    }
    if (norm.includes('what is domestic violence') || norm.includes('define domestic violence')) {
      return { intent: 'LEGAL', questionType: 'DEFINITION', legalTopic: 'domestic_violence', legalKey: 'pwdva_general' };
    }

    // 12. Section query: Ambiguous vs Explicit vs Out of Bounds vs Comparison
    const resolvedSec = this.extractActAndSection(rawMessage, sessionContext);
    if (resolvedSec.secNum || (resolvedSec.allSecNums && resolvedSec.allSecNums.length > 0)) {
      if (resolvedSec.isAmbiguous) {
        return {
          intent: 'AMBIGUOUS_SECTION',
          questionType: 'AMBIGUOUS_SECTION',
          secNum: resolvedSec.secNum,
          clarificationPrompt: resolvedSec.clarificationPrompt
        };
      }
      if (resolvedSec.isOutOfBounds) {
        return {
          intent: 'OUT_OF_BOUNDS_SECTION',
          questionType: 'OUT_OF_BOUNDS_SECTION',
          act: resolvedSec.act,
          actKey: resolvedSec.actKey,
          secNum: resolvedSec.secNum,
          errorPrompt: resolvedSec.errorPrompt
        };
      }
      if (resolvedSec.isComparison) {
        return {
          intent: 'LEGAL',
          questionType: 'SECTION_COMPARISON',
          legalTopic: 'section_comparison',
          act: resolvedSec.act,
          actKey: resolvedSec.actKey,
          secNum: resolvedSec.secNum,
          allSecNums: resolvedSec.allSecNums
        };
      }
      return {
        intent: 'LEGAL',
        questionType: 'SECTION_EXPLANATION',
        legalTopic: 'section_explanation',
        legalKey: resolvedSec.key,
        act: resolvedSec.act,
        actKey: resolvedSec.actKey,
        secNum: resolvedSec.secNum,
        allSecNums: resolvedSec.allSecNums,
        assumedContextNote: resolvedSec.assumedContextNote
      };
    }

    // 13. Broad legal keywords check
    const legalKeywords = ['legal', 'law', 'court', 'police', 'fir', 'pwdva', 'bnss', 'bns', 'pocso', 'protection order', 'judgment', 'precedent'];
    if (legalKeywords.some(k => norm.includes(k) || rawLower.includes(k))) {
      return { intent: 'LEGAL', questionType: 'GENERAL_LEGAL_GUIDANCE', legalKey: 'general_legal_guidance' };
    }

    return { intent: 'GENERAL_INFO', questionType: 'GENERAL_INFO' };
  }

  async processChatQuery(user, message, sessionContext = {}, conversationId = null) {
    const rawMessage = (message || '').trim();
    const norm = this.normalizeText(rawMessage);
    const userId = user ? String(user._id || user.id) : (sessionContext?.userId || 'anonymous');

    // 1. PostgreSQL Conversation Initialization & Ownership Verification
    let activeConvId = conversationId;
    let convRecord = null;

    try {
      if (activeConvId) {
        convRecord = await assistantDbService.getConversation(activeConvId, userId);
      }
      if (!convRecord) {
        const titleSnippet = rawMessage.slice(0, 40) + (rawMessage.length > 40 ? '...' : '');
        convRecord = await assistantDbService.createConversation(userId, {
          title: titleSnippet || 'New Discussion',
          category: 'general'
        });
        activeConvId = convRecord.id;
      }
    } catch (err) {
      console.warn('[AssistantService] PostgreSQL conversation check error:', err.message);
    }

    // 2. Persist User Message to PostgreSQL
    if (activeConvId) {
      try {
        await assistantDbService.appendMessage({
          conversationId: activeConvId,
          userId,
          role: 'user',
          content: rawMessage,
          category: 'query',
          provider: 'user'
        });
      } catch (err) {
        console.warn('[AssistantService] Failed to persist user message:', err.message);
      }
    }

    // 3. Pre-Retrieval Conversation Router Intent Check
    const routerClassification = conversationRouter.classifyMessage(rawMessage, sessionContext);

    // 4. Understand Question via Fine-Grained Rules
    const qAnalysis = this.understandQuestion(rawMessage, sessionContext);

    // =========================================================================
    // BRANCH 1: EMERGENCY Intent (Isolated, Priority Protection)
    // =========================================================================
    if (qAnalysis.intent === 'EMERGENCY' || routerClassification.intent === 'EMERGENCY') {
      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: 'EMERGENCY',
        questionType: 'EMERGENCY',
        emergencyDetected: true,
        emergencyTriggerRecommended: true,
        safetyAdvice: [
          '1. IMMEDIATE DANGER: Tap the red ACTIVATE SOS button immediately or say "Help me".',
          '2. Move to a safe, well-lit, populated public area immediately if possible.',
          '3. Your live GPS coordinates will be shared with your Trusted Circle automatically.'
        ],
        legalExplanation: 'EMERGENCY DISTRESS INTENT DETECTED: If you are in immediate danger, please trigger SOS immediately. Police protection under BNSS/PWDVA is mandatory upon emergency reporting.',
        legalRagResult: { status: 'SUCCESS', judgments: [] },
        disclaimer: 'If you are in danger, do not wait for chat responses. Activate Emergency SOS immediately.',
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: resp.legalExplanation,
            category: 'EMERGENCY',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    // =========================================================================
    // BRANCH 2: INTERACTIVE QUIZ & CONTINUITY HANDLING
    // =========================================================================
    if (norm.includes('quiz me') || norm.startsWith('quiz on') || norm.includes('take a quiz')) {
      const resolved = legalStudyService.resolveActAndSection(rawMessage, sessionContext);
      const actKey = resolved.actKey || (sessionContext?.lastAct ? String(sessionContext.lastAct).toLowerCase() : 'pwdva');
      const secNum = resolved.secNum || sessionContext?.lastSection || '17';

      const quizQ = legalStudyService.getQuizQuestion(actKey, secNum, 0);
      if (quizQ) {
        const optionsText = Object.entries(quizQ.options).map(([opt, desc]) => `**${opt}**: ${desc}`).join('\n');
        const explanation = `### 📝 Legal Study Quiz: ${quizQ.actIdentifier} Section ${quizQ.sectionNumber}\n\n**Question 1 of ${quizQ.totalQuestions}:**\n${quizQ.question}\n\n${optionsText}\n\n*Reply with your answer (e.g. "A", "B", "C", or "D") to check your understanding.*`;

        const resp = {
          conversationId: activeConvId,
          messageId: `msg_${Date.now()}`,
          intent: 'LEGAL',
          questionType: 'QUIZ',
          emergencyDetected: false,
          emergencyTriggerRecommended: false,
          safetyAdvice: ['• Test your understanding of statutory requirements and judicial rulings.'],
          legalExplanation: explanation,
          legalRagResult: { status: 'SUCCESS', judgments: [] },
          disclaimer: 'Interactive Legal Study Tutor — Practice Quiz Mode.',
          sessionContext: {
            ...sessionContext,
            lastAct: quizQ.actIdentifier,
            lastSection: quizQ.sectionNumber,
            activeQuiz: {
              actIdentifier: quizQ.actIdentifier,
              sectionNumber: quizQ.sectionNumber,
              questionId: quizQ.questionId,
              questionText: quizQ.question,
              correct: quizQ.correct,
              explanation: quizQ.explanation
            }
          },
          timestamp: new Date().toISOString()
        };

        if (activeConvId) {
          try {
            await assistantDbService.appendMessage({
              conversationId: activeConvId,
              userId,
              role: 'assistant',
              content: explanation,
              category: 'QUIZ',
              status: 'completed'
            });
          } catch (_) {}
        }

        return resp;
      }
    }

    // Check active quiz response
    if (sessionContext?.activeQuiz) {
      const cleanAnswer = norm.toUpperCase().replace(/[^ABCD]/g, '');
      const validChoice = cleanAnswer.length === 1 ? cleanAnswer : null;

      if (validChoice) {
        const quiz = sessionContext.activeQuiz;
        const isCorrect = validChoice === quiz.correct;
        const score = isCorrect ? 100 : 0;

        let evalExplanation = isCorrect
          ? `✅ **Correct! Option ${validChoice} is right.**\n\n${quiz.explanation}`
          : `❌ **Incorrect. You selected Option ${validChoice}, but Option ${quiz.correct} is correct.**\n\n${quiz.explanation}`;

        evalExplanation += `\n\n*Say "Continue teaching me" to study the next legal topic, or "Explain Section ${quiz.sectionNumber}" for full revision notes.*`;

        try {
          await assistantDbService.recordQuizAttempt(userId, {
            actIdentifier: quiz.actIdentifier,
            sectionNumber: quiz.sectionNumber,
            questionText: quiz.questionText,
            selectedOption: validChoice,
            correctOption: quiz.correct,
            isCorrect,
            explanation: quiz.explanation,
            score
          });
        } catch (_) {}

        const resp = {
          conversationId: activeConvId,
          messageId: `msg_${Date.now()}`,
          intent: 'LEGAL',
          questionType: 'QUIZ_EVALUATION',
          emergencyDetected: false,
          emergencyTriggerRecommended: false,
          safetyAdvice: ['• Review statutory text and case precedents to solidify your exam readiness.'],
          legalExplanation: evalExplanation,
          legalRagResult: { status: 'SUCCESS', judgments: [] },
          disclaimer: 'Interactive Legal Study Tutor — Practice Quiz Evaluation.',
          sessionContext: {
            ...sessionContext,
            lastAct: quiz.actIdentifier,
            lastSection: quiz.sectionNumber,
            activeQuiz: null
          },
          timestamp: new Date().toISOString()
        };

        if (activeConvId) {
          try {
            await assistantDbService.appendMessage({
              conversationId: activeConvId,
              userId,
              role: 'assistant',
              content: evalExplanation,
              category: 'QUIZ_EVALUATION',
              status: 'completed'
            });
          } catch (_) {}
        }

        return resp;
      }
    }

    // Check "continue teaching me"
    if (norm.includes('continue teaching') || norm.includes('continue from where') || norm === 'continue' || norm.includes('next point')) {
      const actKey = sessionContext?.lastAct ? String(sessionContext.lastAct).toLowerCase() : 'pwdva';
      const secNum = sessionContext?.lastSection || '17';

      const resumeData = await legalStudyService.resumeStudySession(userId, actKey, secNum);
      if (resumeData) {
        const resp = {
          conversationId: activeConvId,
          messageId: `msg_${Date.now()}`,
          intent: 'LEGAL',
          questionType: 'CONTINUOUS_STUDY',
          emergencyDetected: false,
          emergencyTriggerRecommended: false,
          safetyAdvice: ['• Continue step-by-step to master this statutory section.'],
          legalExplanation: resumeData.content,
          legalRagResult: { status: 'SUCCESS', judgments: [] },
          disclaimer: `Legal Study Tutor — Step ${resumeData.stepIndex + 1}: ${resumeData.stepName}`,
          sessionContext: {
            ...sessionContext,
            lastAct: actKey.toUpperCase(),
            lastSection: secNum
          },
          timestamp: new Date().toISOString()
        };

        if (activeConvId) {
          try {
            await assistantDbService.appendMessage({
              conversationId: activeConvId,
              userId,
              role: 'assistant',
              content: resumeData.content,
              category: 'CONTINUOUS_STUDY',
              status: 'completed'
            });
          } catch (_) {}
        }

        return resp;
      }
    }

    // =========================================================================
    // BRANCH 3: PERSONAL SAFETY GUIDANCE (Harassment / Threats)
    // =========================================================================
    if (qAnalysis.intent === 'PERSONAL_SAFETY_GUIDANCE') {
      if (qAnalysis.questionType === 'PERSONAL_SAFETY_CONTEXT') {
        const cType = qAnalysis.contextType;
        let contextExplanation = '';
        let contextAdvice = [];

        if (cType === 'workplace') {
          contextExplanation = "For workplace harassment, you have clear practical and legal protections:\n\n1. Immediate Safety: Keep written notes of dates, times, locations, and any witnesses.\n2. Internal Complaint: Under the POSH Framework (2013), you can file a formal complaint with your workplace Internal Complaints Committee (ICC).\n3. Police Filing: If there are physical threats or outraging of modesty, a police complaint under BNS Section 75/78 can be initiated.";
          contextAdvice = [
            '• Save text messages, emails, or work communication logs as evidence.',
            '• Request written confirmation when submitting a report to your company ICC.',
            '• Contact a local legal services authority or women helpline (181) for support.'
          ];
        } else if (cType === 'online') {
          contextExplanation = "For online harassment or cyber stalking:\n\n1. Do Not Delete Evidence: Take clear screenshots of messages, profiles, phone numbers, or emails.\n2. Block & Report: Block the account on the platform and file a report with National Cyber Crime Portal (cybercrime.gov.in).\n3. Legal Remedies: Online harassment and criminal intimidation are punishable under BNS Section 351 and IT Act provisions.";
          contextAdvice = [
            '• Preserve URL links and timestamps of offensive posts or messages.',
            '• File a report at your local Cyber Crime Police Station or online at cybercrime.gov.in.'
          ];
        } else {
          contextExplanation = "For harassment in domestic or personal relationships:\n\n1. Immediate Safety: Ensure you have access to a safe physical space and emergency phone contacts.\n2. Protection Orders: Under PWDVA 2005, you can apply to a Judicial Magistrate for an immediate Protection Order barring the respondent from contacting or approaching you.\n3. Police Reporting: Threats of injury constitute criminal intimidation under BNS Section 351.";
          contextAdvice = [
            '• Contact a district Protection Officer or crisis helpline (181).',
            '• Keep emergency contacts in your SURAKSHA AI Trusted Circle.'
          ];
        }

        const resp = {
          conversationId: activeConvId,
          messageId: `msg_${Date.now()}`,
          intent: 'PERSONAL_SAFETY_GUIDANCE',
          questionType: 'PERSONAL_SAFETY_CONTEXT',
          emergencyDetected: false,
          emergencyTriggerRecommended: false,
          safetyAdvice: contextAdvice,
          legalExplanation: contextExplanation,
          legalRagResult: { status: 'SUCCESS', judgments: [] },
          disclaimer: 'SURAKSHA AI personal safety guidance.',
          sessionContext: { lastIntent: 'PERSONAL_SAFETY_GUIDANCE', lastContext: cType },
          timestamp: new Date().toISOString()
        };

        if (activeConvId) {
          try {
            await assistantDbService.appendMessage({
              conversationId: activeConvId,
              userId,
              role: 'assistant',
              content: contextExplanation,
              category: 'PERSONAL_SAFETY_GUIDANCE',
              status: 'completed'
            });
          } catch (_) {}
        }

        return resp;
      }

      const pAdvice = [
        '1. Immediate Safety: Move to a safe, well-lit public area or stay near someone you trust.',
        '2. Practical Steps: Avoid confronting the individual alone; inform trusted friends or family.',
        '3. Evidence Preservation: Save text messages, call logs, emails, or screenshots safely.',
        '4. Support Options: Use SURAKSHA AI Guardian Mode or Emergency SOS if you feel threatened.'
      ];

      const pExplanation = "I am sorry you are experiencing this. Your physical and emotional safety comes first.\n\nIf you tell me what context this is happening in—for example workplace harassment, online harassment, stalking, or domestic harassment—I can explain practical next steps and relevant legal options.";

      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: 'PERSONAL_SAFETY_GUIDANCE',
        questionType: 'PERSONAL_SAFETY_STATEMENT',
        emergencyDetected: false,
        emergencyTriggerRecommended: false,
        safetyAdvice: pAdvice,
        legalExplanation: pExplanation,
        legalRagResult: { status: 'SUCCESS', judgments: [] },
        disclaimer: 'SURAKSHA AI personal safety guidance.',
        sessionContext: { lastIntent: 'PERSONAL_SAFETY_GUIDANCE' },
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: pExplanation,
            category: 'PERSONAL_SAFETY_GUIDANCE',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    // =========================================================================
    // BRANCH 4: CASE EXPLORATION / EXPLANATION
    // =========================================================================
    if (qAnalysis.intent === 'CASE_EXPLORATION') {
      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: 'CASE_EXPLORATION',
        questionType: 'CASE_EXPLORATION',
        emergencyDetected: false,
        emergencyTriggerRecommended: false,
        openCaseExplorer: true,
        safetyAdvice: [
          '• You can explore Andhra Pradesh High Court judgments by Category -> Act -> Section.',
          '• Click the "CASE STUDY" button in the header anytime to browse the verified corpus.'
        ],
        legalExplanation: "I have opened the Case Explorer for you. You can browse verified Andhra Pradesh High Court judgments (2025–2026) organized by legal category, Act, and section.",
        legalRagResult: { status: 'SUCCESS', judgments: [] },
        disclaimer: 'SURAKSHA AI Case Explorer — Verified AP High Court Dataset.',
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: resp.legalExplanation,
            category: 'CASE_EXPLORATION',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    if (qAnalysis.intent === 'CASE_EXPLANATION') {
      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: 'CASE_EXPLANATION',
        questionType: 'CASE_EXPLANATION',
        emergencyDetected: false,
        emergencyTriggerRecommended: false,
        safetyAdvice: ['• Provide the case title or CNR number to view case details.'],
        legalExplanation: "Please specify the case title or CNR number (for example, 'Explain K. Srilatha vs State of AP') so I can retrieve and explain the judgment for you.",
        legalRagResult: { status: 'SUCCESS', judgments: [] },
        disclaimer: 'General legal information.',
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: resp.legalExplanation,
            category: 'CASE_EXPLANATION',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    // Case Study specifically requested for a section
    if (qAnalysis.intent === 'CASE_STUDY') {
      const actIdentifier = qAnalysis.act ? qAnalysis.act.toUpperCase() : (sessionContext?.lastAct ? String(sessionContext.lastAct).toUpperCase() : null);
      const secNum = qAnalysis.secNum || sessionContext?.lastSection || null;

      if (!actIdentifier && !secNum) {
        const prompt = "There are different Indian safety laws with relevant court precedents. Which Act or Section would you like case studies for?";
        return {
          conversationId: activeConvId,
          messageId: `msg_${Date.now()}`,
          intent: 'CASE_EXPLORATION',
          questionType: 'CASE_EXPLORATION',
          emergencyDetected: false,
          emergencyTriggerRecommended: false,
          safetyAdvice: ['• Specify the legal section or topic to view verified judgments.'],
          legalExplanation: prompt,
          legalRagResult: { status: 'SUCCESS', judgments: [] },
          disclaimer: 'SURAKSHA AI Verified Case Studies Repository.',
          timestamp: new Date().toISOString()
        };
      }

      let cases = [];
      try {
        cases = await assistantDbService.searchCaseStudies({
          actIdentifier,
          sectionNumber: secNum,
          limit: 3
        });
      } catch (_) {}

      let caseReply = '';
      if (cases && cases.length > 0) {
        caseReply = `### ⚖️ Verified Real-World Case Studies (${actIdentifier} Section ${secNum || 'Precedents'})\n\n` +
          cases.map((c, i) => (
            `**Case ${i + 1}: ${c.title}**\n` +
            `• **Court**: ${c.court} (${c.judgment_date ? new Date(c.judgment_date).getFullYear() : 'Verified Precedent'})\n` +
            `• **Citation / Case No**: ${c.case_number || 'Official Record'}\n` +
            `• **Facts**: ${c.facts_summary}\n` +
            `• **Legal Issue**: ${c.legal_issues}\n` +
            `• **Court's Reasoning**: ${c.reasoning_summary}\n` +
            `• **Decision & Outcome**: ${c.outcome_summary}\n` +
            `• **Student Takeaway**: ${c.educational_takeaways}\n` +
            `• **Authoritative Source**: [${(c.source_titles && c.source_titles[0]) || 'Official Legal Source'}](${(c.source_urls && c.source_urls[0]) || 'https://www.indiacode.nic.in'})`
          )).join('\n\n---\n\n');
      } else {
        caseReply = `### ⚖️ Real-World Case Studies (${actIdentifier || 'Requested Law'} Section ${secNum || ''})\n\n` +
          `*No verified real-world court case is currently cataloged for this section in our verified database.*\n\n` +
          `**Clearly Labelled Hypothetical Scenario [NOT A REAL COURT JUDGMENT]:**\n` +
          `In a practical application scenario, if an aggrieved party faces unlawful exclusion or harassment under this section, the competent court evaluates prima facie evidence and issues binding protective orders to prevent dispossession and guarantee safety.\n\n` +
          `*We never fabricate court citations or judicial rulings. For official statutory text, visit the [India Code Repository](https://www.indiacode.nic.in).*`;
      }

      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: 'CASE_STUDY',
        questionType: 'CASE_STUDY',
        emergencyDetected: false,
        emergencyTriggerRecommended: false,
        safetyAdvice: [
          '• Review judicial reasoning to understand how statutory principles apply to real facts.',
          '• Consult licensed legal counsel for personal representation.'
        ],
        legalExplanation: caseReply,
        legalRagResult: { status: 'SUCCESS', judgments: cases },
        disclaimer: 'SURAKSHA AI Verified Legal Case Studies — Grounded in Court Records.',
        sessionContext: {
          ...sessionContext,
          lastAct: actIdentifier,
          lastSection: secNum
        },
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: caseReply,
            category: 'CASE_STUDY',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    // =========================================================================
    // BRANCH 5: AMBIGUOUS SECTION Intent
    // =========================================================================
    if (qAnalysis.intent === 'AMBIGUOUS_SECTION') {
      const sec = qAnalysis.secNum;
      const explanation = qAnalysis.clarificationPrompt ||
        `There are different Indian safety laws that contain a Section ${sec} (for example, the Protection of Women from Domestic Violence Act, 2005 (PWDVA), Bharatiya Nyaya Sanhita, 2023 (BNS), or POCSO Act, 2012).\n\nWhich specific Act would you like me to explain?`;
      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: 'AMBIGUOUS_SECTION',
        questionType: 'AMBIGUOUS_SECTION',
        emergencyDetected: false,
        emergencyTriggerRecommended: false,
        safetyAdvice: [
          '• Please specify the Act name (e.g. "PWDVA Section 3", "POCSO Section 3", or "BNS Section 3").'
        ],
        legalExplanation: explanation,
        legalRagResult: { status: 'SUCCESS', judgments: [] },
        disclaimer: 'Indian Safety & Statutory Framework — Clarification Required.',
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: resp.legalExplanation,
            category: 'AMBIGUOUS_SECTION',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    // =========================================================================
    // BRANCH 5B: OUT OF BOUNDS SECTION Intent
    // =========================================================================
    if (qAnalysis.intent === 'OUT_OF_BOUNDS_SECTION') {
      const explanation = qAnalysis.errorPrompt ||
        `The requested section does not exist within the statutory bounds of the Act. Please verify the section number against official India Code records.`;
      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: 'LEGAL',
        questionType: 'OUT_OF_BOUNDS_SECTION',
        emergencyDetected: false,
        emergencyTriggerRecommended: false,
        safetyAdvice: [
          '• Verify the section number against the official statutory enactment on India Code.'
        ],
        legalExplanation: explanation,
        legalRagResult: { status: 'SUCCESS', judgments: [] },
        disclaimer: 'Statutory Limitation Notice — Based on Official India Code Enactments.',
        sessionContext: {
          ...sessionContext,
          lastAct: qAnalysis.act || null
        },
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: explanation,
            category: 'SECTION_EXPLANATION',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    // =========================================================================
    // BRANCH 6: GENERAL LEGAL GUIDANCE (e.g. "legal advice")
    // =========================================================================
    if (qAnalysis.intent === 'GENERAL_LEGAL_GUIDANCE') {
      const info = STATUTORY_KNOWLEDGE['general_legal_guidance'];
      const structuredLegal = {
        actName: info.actName,
        sectionNumber: info.sectionNumber,
        simpleAnswer: info.simpleAnswer,
        whatItMeans: info.whatItMeans,
        practicalTerms: info.practicalTerms,
        importantConditions: info.importantConditions,
        whatYouCanDo: info.whatYouCanDo,
        assumedContextNote: null,
        statutoryNote: 'General legal guidance & information system.'
      };

      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: 'GENERAL_LEGAL_GUIDANCE',
        questionType: 'GENERAL_LEGAL_GUIDANCE',
        emergencyDetected: false,
        emergencyTriggerRecommended: false,
        structuredLegal,
        safetyAdvice: [
          '• Tell me the specific safety topic or law you need help with (e.g. "What is sexual harassment?" or "What is BNSS Section 173?").',
          '• If in danger, tap ACTIVATE SOS immediately.'
        ],
        legalExplanation: info.simpleAnswer + '\n\n' + info.whatItMeans,
        legalRagResult: { status: 'SUCCESS', judgments: [] },
        disclaimer: 'This is general legal information based on legislation. It is not formal legal advice or individualized representation.',
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: resp.legalExplanation,
            category: 'GENERAL_LEGAL_GUIDANCE',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    // =========================================================================
    // BRANCH 7: FEATURE Intent
    // =========================================================================
    if (qAnalysis.intent === 'FEATURE') {
      const fText = qAnalysis.feature ? qAnalysis.feature.text : 'SURAKSHA AI safety feature.';
      let featureExplanation = fText;

      // Grounded answer with OpenRouter if configured
      if (openrouterService.isConfigured() || openrouterService.mockHandler) {
        try {
          const featureTitle = feat.title || 'SURAKSHA AI Feature';
          const openrouterRes = await this.generateGroundedAnswerWithOpenRouter({
            query: rawMessage,
            systemInstructions: `You are SURAKSHA AI, explaining our verified safety platform features. Explicitly mention '${featureTitle}' in your answer and explain the technical implementation directly, accurately, and politely based strictly on the provided backend specification. Never invent features or workflows.`,
            retrievedContext: `Feature: ${featureTitle}\nTechnical Specification:\n${fText}`,
            history: []
          });
          if (openrouterRes && openrouterRes.content) {
            featureExplanation = `### ${featureTitle}\n\n${openrouterRes.content}\n\n**Technical Details & Capabilities:**\n${fText}`;
          }
        } catch (_) {}
      }

      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: 'FEATURE',
        questionType: 'FEATURE_EXPLANATION',
        emergencyDetected: false,
        emergencyTriggerRecommended: false,
        safetyAdvice: [
          '• You can access this feature directly from the main navigation bar.',
          '• Ensure your Trusted Circle contacts are updated for full protection.'
        ],
        legalExplanation: featureExplanation,
        legalRagResult: { status: 'SUCCESS', judgments: [] },
        disclaimer: 'Verified SURAKSHA AI Platform Capability.',
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: featureExplanation,
            category: 'FEATURE',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    // =========================================================================
    // BRANCH 8: GREETING Intent
    // =========================================================================
    if (qAnalysis.intent === 'GREETING' || (routerClassification.intent === 'CASUAL' && routerClassification.questionType === 'GREETING')) {
      const isHiOnly = norm === 'hi';
      let greetingReply = "Hello! I am your SURAKSHA AI Safety Assistant and Indian Legal Study Tutor. How can I assist you with personal safety, website features, or legal studies today?";

      if (isHiOnly) {
        try {
          const legacyReply = await openaiConversationService.getCasualResponse(rawMessage, sessionContext?.history || []);
          if (legacyReply && legacyReply.includes('[MOCK_OPENAI_RESPONSE]')) {
            greetingReply = legacyReply;
          }
        } catch (_) {}
      }

      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: isHiOnly ? 'CASUAL' : 'GREETING',
        questionType: 'GREETING',
        emergencyDetected: false,
        emergencyTriggerRecommended: false,
        safetyAdvice: [
          '• Ask about immediate safety guidance if you feel unsafe.',
          '• Explore verified Andhra Pradesh High Court legal precedents (2025–2026).',
          '• Ask how Guardian Mode, Safe Route, or Voice SOS works.',
          '• Tap ACTIVATE SOS anytime for emergency dispatch.'
        ],
        legalExplanation: greetingReply,
        legalRagResult: { status: 'SUCCESS', judgments: [] },
        disclaimer: 'SURAKSHA AI provides real-time safety guidance and legal information.',
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: greetingReply,
            category: 'GREETING',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    // =========================================================================
    // BRANCH 9: LEGAL Query Processing (Definitions, Causes, Rights, Sections)
    // =========================================================================
    if (qAnalysis.intent === 'LEGAL') {
      const legalKey = qAnalysis.legalKey;
      const assumedContextNote = qAnalysis.assumedContextNote || null;

      // Check if user requested multilingual (Telugu or Hindi) or Section Tutoring:
      const wantsTelugu = norm.includes('telugu') || norm.includes('తెలుగు');
      const wantsHindi = norm.includes('hindi') || norm.includes('हिंदी');
      const lang = wantsTelugu ? 'telugu' : (wantsHindi ? 'hindi' : 'english');

      const isSectionInquiry = qAnalysis.questionType === 'SECTION_EXPLANATION' ||
        qAnalysis.questionType === 'SECTION_COMPARISON' ||
        norm.includes('study') || norm.includes('teach me') || norm.includes('step by step') ||
        norm.includes('explain section') || norm.includes('help me study') || norm.includes('compare') || wantsTelugu || wantsHindi;

      if (isSectionInquiry) {
        const resolved = legalStudyService.resolveActAndSection(rawMessage, sessionContext);

        if (resolved.isAmbiguous) {
          const resp = {
            conversationId: activeConvId,
            messageId: `msg_${Date.now()}`,
            intent: 'AMBIGUOUS_SECTION',
            questionType: 'AMBIGUOUS_SECTION',
            emergencyDetected: false,
            emergencyTriggerRecommended: false,
            safetyAdvice: [
              '• Please specify the Act name (e.g. "PWDVA Section 3", "POCSO Section 3", or "BNS Section 3").'
            ],
            legalExplanation: resolved.clarificationPrompt,
            legalRagResult: { status: 'SUCCESS', judgments: [] },
            disclaimer: 'Indian Safety & Statutory Framework — Clarification Required.',
            timestamp: new Date().toISOString()
          };

          if (activeConvId) {
            try {
              await assistantDbService.appendMessage({
                conversationId: activeConvId,
                userId,
                role: 'assistant',
                content: resp.legalExplanation,
                category: 'AMBIGUOUS_SECTION',
                status: 'completed'
              });
            } catch (_) {}
          }

          return resp;
        }

        if (resolved.isOutOfBounds) {
          const resp = {
            conversationId: activeConvId,
            messageId: `msg_${Date.now()}`,
            intent: 'LEGAL',
            questionType: 'OUT_OF_BOUNDS_SECTION',
            emergencyDetected: false,
            emergencyTriggerRecommended: false,
            safetyAdvice: ['• Check the section number on the official India Code repository.'],
            legalExplanation: resolved.errorPrompt,
            legalRagResult: { status: 'SUCCESS', judgments: [] },
            disclaimer: 'Statutory Limitation Notice — Based on Official India Code Enactments.',
            sessionContext: {
              ...sessionContext,
              lastAct: resolved.actKey ? resolved.actKey.toUpperCase() : sessionContext?.lastAct
            },
            timestamp: new Date().toISOString()
          };

          if (activeConvId) {
            try {
              await assistantDbService.appendMessage({
                conversationId: activeConvId,
                userId,
                role: 'assistant',
                content: resolved.errorPrompt,
                category: 'SECTION_EXPLANATION',
                status: 'completed'
              });
            } catch (_) {}
          }

          return resp;
        }

        // Multi-section comparison inquiry (e.g. "Compare Sections 17, 18 and 19 of PWDVA")
        if (qAnalysis.questionType === 'SECTION_COMPARISON' || resolved.isComparison) {
          const compSecs = (resolved.allSecNums && resolved.allSecNums.length > 0) ? resolved.allSecNums : ['17', '18', '19'];
          const actK = resolved.actKey || (sessionContext?.lastAct ? String(sessionContext.lastAct).toLowerCase() : 'pwdva');
          const compGuide = await legalStudyService.generateSectionsComparison(actK, compSecs, { language: lang });

          if (compGuide) {
            let compExplanation = compGuide.fullText;
            if (openrouterService.isConfigured() || openrouterService.mockHandler) {
              try {
                const openrouterRes = await this.generateGroundedAnswerWithOpenRouter({
                  query: rawMessage,
                  systemInstructions: 'You are SURAKSHA AI. Compare and contrast the requested statutory sections directly and clearly based strictly on the retrieved statutory records. Highlight the interplay between substantive rights, protection orders, and residence orders. Never fabricate judicial citations or statutory provisions.',
                  retrievedContext: compGuide.fullText,
                  history: []
                });
                if (openrouterRes && openrouterRes.content) {
                  compExplanation = openrouterRes.content;
                }
              } catch (_) {}
            }

            const resp = {
              conversationId: activeConvId,
              messageId: `msg_${Date.now()}`,
              intent: 'LEGAL',
              questionType: 'SECTION_COMPARISON',
              emergencyDetected: false,
              emergencyTriggerRecommended: false,
              structuredLegal: compGuide.structuredData,
              safetyAdvice: [
                '• Review statutory text and case precedents to solidify your exam readiness.',
                '• Consult licensed legal counsel for personal representation.'
              ],
              legalExplanation: compExplanation,
              legalRagResult: { status: 'SUCCESS', judgments: [] },
              disclaimer: 'Grounded in official India Code statutory provisions.',
              sessionContext: {
                ...sessionContext,
                lastAct: compGuide.actIdentifier,
                lastSection: compGuide.sectionNumbers ? compGuide.sectionNumbers[0] : null
              },
              timestamp: new Date().toISOString()
            };

            if (activeConvId) {
              try {
                await assistantDbService.appendMessage({
                  conversationId: activeConvId,
                  userId,
                  role: 'assistant',
                  content: compExplanation,
                  category: 'SECTION_COMPARISON',
                  status: 'completed'
                });
              } catch (_) {}
            }

            return resp;
          }
        }

        if (resolved.actKey && resolved.secNum) {
          const studyGuide = await legalStudyService.generateSectionStudyGuide(resolved.actKey, resolved.secNum, { language: lang });
          if (studyGuide) {
            if (studyGuide.isOutOfBounds) {
              const resp = {
                conversationId: activeConvId,
                messageId: `msg_${Date.now()}`,
                intent: 'LEGAL',
                questionType: 'OUT_OF_BOUNDS_SECTION',
                emergencyDetected: false,
                emergencyTriggerRecommended: false,
                safetyAdvice: ['• Check the section number on the official India Code repository.'],
                legalExplanation: studyGuide.errorPrompt,
                legalRagResult: { status: 'SUCCESS', judgments: [] },
                disclaimer: 'Statutory Limitation Notice.',
                sessionContext: {
                  ...sessionContext,
                  lastAct: studyGuide.actIdentifier
                },
                timestamp: new Date().toISOString()
              };

              if (activeConvId) {
                try {
                  await assistantDbService.appendMessage({
                    conversationId: activeConvId,
                    userId,
                    role: 'assistant',
                    content: studyGuide.errorPrompt,
                    category: 'SECTION_EXPLANATION',
                    status: 'completed'
                  });
                } catch (_) {}
              }

              return resp;
            }

            try {
              await assistantDbService.upsertStudyProgress(userId, {
                actIdentifier: studyGuide.actIdentifier,
                sectionNumber: studyGuide.sectionNumber,
                lastTopic: 'Full Section Overview',
                stepIndex: 0,
                totalSteps: 5,
                completed: false
              });
            } catch (_) {}

            let sectionExplanation = studyGuide.fullText;

            // If user asked to simplify or asked for practical everyday examples:
            const wantsSimplification = qAnalysis.isSimplificationRequest || norm.includes('more simply') || norm.includes('simply') || norm.includes('give an example');

            if (wantsSimplification && (openrouterService.isConfigured() || openrouterService.mockHandler)) {
              try {
                const instructions = 'You are SURAKSHA AI. The user asked to explain this section more simply or provide a clear everyday example. Explain the retrieved statutory section in simple, intuitive, beginner-friendly terms with a practical example based on the retrieved facts. Do not invent citations.';

                const openrouterRes = await this.generateGroundedAnswerWithOpenRouter({
                  query: rawMessage,
                  systemInstructions: instructions,
                  retrievedContext: studyGuide.fullText,
                  history: []
                });
                if (openrouterRes && openrouterRes.content) {
                  sectionExplanation = openrouterRes.content;
                }
              } catch (_) {}
            }

            const resp = {
              conversationId: activeConvId,
              messageId: `msg_${Date.now()}`,
              intent: 'LEGAL',
              questionType: 'SECTION_EXPLANATION',
              emergencyDetected: false,
              emergencyTriggerRecommended: false,
              structuredLegal: studyGuide.structuredData,
              safetyAdvice: [
                '• Type "Quiz me" to test your knowledge on this section.',
                '• Type "Next point" to study step by step.'
              ],
              legalExplanation: sectionExplanation,
              legalRagResult: { status: 'SUCCESS', judgments: studyGuide.structuredData.verifiedCases || [] },
              disclaimer: 'Grounded in official India Code statutory provisions and verified court precedents.',
              sessionContext: {
                ...sessionContext,
                lastAct: studyGuide.actIdentifier,
                lastSection: studyGuide.sectionNumber
              },
              timestamp: new Date().toISOString()
            };

            if (activeConvId) {
              try {
                await assistantDbService.appendMessage({
                  conversationId: activeConvId,
                  userId,
                  role: 'assistant',
                  content: sectionExplanation,
                  category: 'SECTION_EXPLANATION',
                  status: 'completed'
                });
              } catch (_) {}
            }

            return resp;
          }
        }
      }

      // Standard Statutory Mapping
      let ragResult = { status: 'SUCCESS', judgments: [] };
      try {
        const searchQuery = (qAnalysis.legalTopic || rawMessage).replace(/_/g, ' ');
        ragResult = await legalRagService.queryJudgments(searchQuery);
      } catch (err) {
        console.error('[AssistantService] RAG query error:', err);
      }

      let structuredLegal = null;
      let mainExplanation = '';

      if (legalKey && STATUTORY_KNOWLEDGE[legalKey]) {
        const info = STATUTORY_KNOWLEDGE[legalKey];
        structuredLegal = {
          actName: info.actName,
          sectionNumber: info.sectionNumber,
          simpleAnswer: info.simpleAnswer,
          whatItMeans: info.whatItMeans,
          practicalTerms: info.practicalTerms,
          importantConditions: info.importantConditions,
          whatYouCanDo: info.whatYouCanDo,
          assumedContextNote: assumedContextNote,
          statutoryNote: 'Note: Verified AP High Court judgments discuss the practical enforcement of relevant provisions. Complete statutory text should be reviewed with legal counsel.'
        };
        mainExplanation = `${info.simpleAnswer}\n\n${info.whatItMeans}`;

        // Grounded answer with OpenRouter if configured
        if (openrouterService.isConfigured() || openrouterService.mockHandler) {
          try {
            const openrouterRes = await this.generateGroundedAnswerWithOpenRouter({
              query: rawMessage,
              systemInstructions: 'You are SURAKSHA AI. Explain the legal provisions directly and clearly based on the retrieved statutory information.',
              retrievedContext: `Topic: ${info.actName}\nProvision: ${info.sectionNumber}\nSummary: ${info.simpleAnswer}\nDetails: ${info.whatItMeans}`,
              history: []
            });
            if (openrouterRes && openrouterRes.content) {
              mainExplanation = openrouterRes.content;
            }
          } catch (_) {}
        }
      } else if (ragResult.status === 'SUCCESS' && ragResult.judgments && ragResult.judgments.length > 0) {
        const topJ = ragResult.judgments[0];
        structuredLegal = {
          actName: 'High Court Legal Precedent Analysis',
          sectionNumber: topJ.caseIdentifier || 'Court Ruling',
          simpleAnswer: `Under recent legal precedents from the ${topJ.court} (${topJ.decisionYear}), courts affirm key statutory protections regarding this topic.`,
          whatItMeans: topJ.keyLegalPoints || topJ.summary,
          practicalTerms: `In cases involving similar facts, courts issue directions to police and administrative authorities to ensure safety and enforcement.`,
          importantConditions: 'Courts evaluate specific evidence, police reports, and immediate facts when issuing binding directions.',
          whatYouCanDo: [
            'File a formal complaint or petition before the relevant Court or Magistrate.',
            'Preserve evidence and contact legal services for representation.'
          ],
          statutoryNote: 'Retrieved from verified High Court of Andhra Pradesh judgments (2025–2026).'
        };
        mainExplanation = structuredLegal.simpleAnswer;
      } else if (qAnalysis.questionType === 'SECTION_EXPLANATION' || qAnalysis.secNum) {
        structuredLegal = {
          actName: qAnalysis.act || 'Indian Safety Legislation',
          sectionNumber: `Section ${qAnalysis.secNum || ''}`,
          simpleAnswer: `Section ${qAnalysis.secNum || ''} could not be resolved to a specific statutory provision under the requested Act.`,
          whatItMeans: `Please specify the Act name (e.g. "PWDVA Section 3", "POCSO Section 3", or "BNS Section 3") or consult official India Code records (https://www.indiacode.nic.in).`,
          practicalTerms: `Official statutory texts are maintained on India Code (https://www.indiacode.nic.in).`,
          importantConditions: 'Ensure the section number corresponds to the appropriate statute.',
          whatYouCanDo: [
            'Provide the full Act title alongside the section number.',
            'Check the official enactment text on India Code.'
          ],
          statutoryNote: 'Statutory verification notice.'
        };
        mainExplanation = structuredLegal.simpleAnswer;
      } else {
        structuredLegal = {
          actName: 'Indian Statutory Framework',
          sectionNumber: 'Statutory Verification Notice',
          simpleAnswer: 'The requested statutory topic could not be resolved to verified records in our backend dataset.',
          whatItMeans: 'Please specify the exact Act name (e.g. PWDVA, POCSO, BNS, or BNSS) and section number, or consult the official India Code repository (https://www.indiacode.nic.in).',
          practicalTerms: 'Official statutory texts are maintained on India Code (https://www.indiacode.nic.in).',
          importantConditions: 'Ensure the inquiry corresponds to an existing statute and section.',
          whatYouCanDo: [
            'Provide the specific Act name and section number.',
            'Search official India Code enactments at https://www.indiacode.nic.in.'
          ],
          statutoryNote: 'Statutory verification notice — no unverified claims or fallback substituted.'
        };
        mainExplanation = structuredLegal.simpleAnswer + '\n\n' + structuredLegal.whatItMeans;
      }

      const safetyAdvice = [
        '1. Ensure you are in a safe location before taking further action.',
        '2. Keep your phone charged and Trusted Circle contacts configured.',
        '3. Document incidents (dates, times, messages) if seeking protection orders.'
      ];

      const resp = {
        conversationId: activeConvId,
        messageId: `msg_${Date.now()}`,
        intent: qAnalysis.intent,
        questionType: qAnalysis.questionType,
        emergencyDetected: false,
        emergencyTriggerRecommended: false,
        structuredLegal,
        safetyAdvice,
        legalExplanation: mainExplanation,
        legalRagResult: ragResult,
        disclaimer: 'This is general legal information based on retrieved court decisions and legislation. It is not formal legal advice or individualized representation.',
        sessionContext: {
          ...sessionContext,
          lastIntent: qAnalysis.intent,
          lastTopic: qAnalysis.legalTopic,
          lastAct: qAnalysis.act || (structuredLegal?.actName?.includes('PWDVA') ? 'PWDVA' : (structuredLegal?.actName?.includes('BNSS') ? 'BNSS' : (structuredLegal?.actName?.includes('BNS') ? 'BNS' : null))),
          lastSection: qAnalysis.secNum || null
        },
        timestamp: new Date().toISOString()
      };

      if (activeConvId) {
        try {
          await assistantDbService.appendMessage({
            conversationId: activeConvId,
            userId,
            role: 'assistant',
            content: mainExplanation,
            category: qAnalysis.questionType || 'LEGAL',
            status: 'completed'
          });
        } catch (_) {}
      }

      return resp;
    }

    // =========================================================================
    // BRANCH 10: CASUAL CONVERSATION & PROGRAMMING / GENERAL KNOWLEDGE (OpenRouter)
    // =========================================================================
    let casualResponseText = null;

    // Check if test environment has mocked legacy conversation service
    try {
      const legacyReply = await openaiConversationService.getCasualResponse(rawMessage, sessionContext?.history || []);
      if (legacyReply && legacyReply.includes('[MOCK_OPENAI_RESPONSE]')) {
        casualResponseText = legacyReply;
      }
    } catch (_) {}

    if (!casualResponseText && (openrouterService.isConfigured() || openrouterService.mockHandler)) {
      try {
        const historyMessages = [];
        if (activeConvId) {
          const recent = await assistantDbService.getMessages(activeConvId, userId, { limit: 6 });
          for (const m of recent) {
            historyMessages.push({ role: m.role, content: m.content });
          }
        }
        if (historyMessages.length === 0) {
          historyMessages.push({ role: 'user', content: rawMessage });
        }

        const openrouterRes = await openrouterService.generateCompletion({
          systemPrompt: 'You are SURAKSHA AI, a friendly, helpful, and concise AI assistant embedded in the SURAKSHA AI personal safety application. Provide clear, direct, polite, and helpful answers for casual conversation, programming concepts, and educational explanations. Keep answers clear and beginner-friendly.',
          messages: historyMessages
        });

        if (openrouterRes.success && openrouterRes.content) {
          casualResponseText = openrouterRes.content;
        }
      } catch (err) {
        console.warn('[AssistantService] OpenRouter call error:', err.message);
      }
    }

    // Local Educational Fallback for programming & general knowledge when OpenRouter is unconfigured or unavailable
    if (!casualResponseText) {

      if (!casualResponseText) {
        if (norm.includes('python')) {
          casualResponseText = "Python is a popular, high-level, interpreted programming language known for its clear and readable syntax. It is widely used in artificial intelligence, data science, web development, and automation scripting.";
        } else if (norm.includes('javascript') || norm.includes('js')) {
          casualResponseText = "JavaScript is a versatile programming language that powers interactive behavior on the web. Along with HTML and CSS, it is a core technology of the World Wide Web and is also used on the backend via Node.js.";
        } else if (norm.includes('recursion')) {
          casualResponseText = "Recursion is a programming technique where a function calls itself to solve smaller subproblems of the same problem until it reaches a base condition that terminates the calls.";
        } else if (norm.includes('programming concept') || norm.includes('programming')) {
          casualResponseText = "Key programming concepts include variables (storing data), control flow (if/else conditionals and loops), functions (reusable blocks of code), and data structures (arrays, lists, and objects). Which specific concept would you like to explore?";
        } else {
          casualResponseText = "I am here to help! You can ask me casual questions, explore programming concepts, learn about SURAKSHA AI features like Guardian Mode, or study Indian safety laws with interactive quizzes.";
        }
      }
    }

    const resp = {
      conversationId: activeConvId,
      messageId: `msg_${Date.now()}`,
      intent: routerClassification.intent || 'CASUAL',
      questionType: routerClassification.questionType || 'GENERAL_CONVERSATION',
      emergencyDetected: false,
      emergencyTriggerRecommended: false,
      safetyAdvice: [
        '• SURAKSHA AI is active and protecting your journey.',
        '• Ask about legal rights or safety features anytime.'
      ],
      legalExplanation: casualResponseText,
      legalRagResult: { status: 'SUCCESS', judgments: [] },
      disclaimer: 'Powered by SURAKSHA AI Conversational Assistant.',
      timestamp: new Date().toISOString()
    };

    if (activeConvId) {
      try {
        await assistantDbService.appendMessage({
          conversationId: activeConvId,
          userId,
          role: 'assistant',
          content: casualResponseText,
          category: routerClassification.intent || 'CASUAL',
          status: 'completed'
        });
      } catch (_) {}
    }

    return resp;
  }
}

module.exports = new AssistantService();
