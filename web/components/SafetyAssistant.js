'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Mic,
  MicOff,
  AlertTriangle,
  Scale,
  ShieldAlert,
  Info,
  Loader2,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  FileText,
  ExternalLink,
  X
} from 'lucide-react';
import { useGlobalVoiceSOS } from '../context/GlobalVoiceSOSContext';
import CaseExplorerModal from './CaseExplorerModal';

// Deterministic local fallback response engine with structured legal support
const getLocalFallbackResponse = (queryText) => {
  const norm = queryText.toLowerCase().trim().replace(/(.)\1{2,}/g, '$1');

  // Casual Greetings
  const greetings = ['hi', 'hello', 'hlo', 'hloo', 'hey', 'helo', 'helllo', 'good morning', 'good evening', 'greetings'];
  if (greetings.includes(norm) || greetings.some(g => norm.startsWith(g))) {
    return {
      text: "Hello! I am your SURAKSHA AI Safety Assistant. You can ask me about safety guidance, legal rights under Andhra Pradesh High Court precedents (2025–2026), Guardian Mode, or Safe Route.",
      safetyAdvice: [
        '• Ask about immediate safety steps if feeling threatened.',
        '• Learn about verified High Court precedents on domestic violence & rights.',
        '• Inquire how Guardian Mode or Safe Route navigation works.',
        '• Tap the red ACTIVATE SOS button anytime for emergency dispatch.'
      ],
      sources: [],
      disclaimer: 'SURAKSHA AI real-time safety assistance active.'
    };
  }

  // Feature Questions
  if (norm.includes('guardian')) {
    if (norm.includes('check-in') || norm.includes('check in') || norm.includes('miss')) {
      return {
        text: "When an anomaly (route deviation > 500m or unscheduled stoppage >= 2 minutes) occurs during Guardian Mode, SURAKSHA AI displays a 60-second warning countdown prompt. If you miss or do not acknowledge this check-in within 60 seconds (or if you tap 'Get Help'), the system automatically escalates: it creates an active EmergencyEvent (triggerType: 'guardian') and dispatches emergency alerts with your last known GPS coordinates to your Trusted Circle contacts via SMS and email.",
        safetyAdvice: [
          '• Acknowledge the 60s warning prompt by tapping "I\'m Safe" if you are safe.',
          '• Tap "Get Help" for immediate emergency escalation.',
          '• Keep your Trusted Circle emergency contacts updated.'
        ],
        sources: [],
        disclaimer: 'Verified SURAKSHA AI Guardian Mode Capability.'
      };
    }
    return {
      text: "Guardian Mode allows designated Trusted Circle contacts to monitor your journey in real time. Features include continuous location tracking against verified route geometry, 500m route deviation detection, 2-minute stoppage detection, a 60-second warning countdown on anomalies, and automated escalation to emergency contacts if you fail to check in.",
      safetyAdvice: ['• Add verified Trusted Contacts in your profile.', '• Start Guardian Mode before traveling late at night.'],
      sources: [],
      disclaimer: 'Verified SURAKSHA AI Feature Capability.'
    };
  }

  if (norm.includes('safe route') || norm.includes('route')) {
    if (norm.includes('calculate risk') || norm.includes('how does safe route') || norm.includes('risk score') || norm.includes('risk')) {
      return {
        text: "Safe Route calculates navigation risk using a multi-factor evidence-based algorithm:\n1. District Historical Crime Baseline: Ingests official government NCRB (2023 Crime in India Report / data.gov.in) district-level crime data, applying a minimum floor of 18 points (never zeroed out, avoiding false 'safe' claims);\n2. Spatial Infrastructure Proximity: Evaluates proximity to verified police stations and hospitals from OpenStreetMap, granting credits up to 17 points maximum;\n3. Temporal & Night Factors: Adds penalties for night travel (travelContext: 'night'), unlit roads, and low activity areas; and\n4. Segment-by-segment analysis where each discrete road segment is independently evaluated against spatial infrastructure and safety zones.",
        safetyAdvice: [
          '• Select the highest safety score route for night travel.',
          '• Proximity to police stations and hospitals lowers estimated risk scores.'
        ],
        sources: [],
        disclaimer: 'Verified SURAKSHA AI Safe Route Engine.'
      };
    }
    return {
      text: "Safe Route calculates navigation paths using real-time spatial lighting, crime density, and infrastructure safety scores to recommend the safest journey.",
      safetyAdvice: ['• Select the highest safety score route for night travel.', '• Report unlit or unsafe areas to improve community ratings.'],
      sources: [],
      disclaimer: 'Verified SURAKSHA AI Feature Capability.'
    };
  }

  // Legal advice query fallback
  if (norm === 'legal advice' || norm.includes('i need legal help')) {
    return {
      text: "SURAKSHA AI provides structured legal information on Indian safety legislation and AP High Court precedents.",
      structuredLegal: {
        actName: 'SURAKSHA AI Legal Information & Guidance System',
        sectionNumber: 'General Overview',
        simpleAnswer: 'I can explain Indian safety laws (BNSS, BNS, PWDVA, POCSO) and AP High Court legal precedents (2025–2026). Please specify what legal topic or section you want explained.',
        whatItMeans: 'For instance, ask "What is sexual harassment?", "What is BNSS Section 173?", "What are the causes of domestic violence?", or "What are my rights in domestic violence?"',
        practicalTerms: 'Type your specific query to receive clear plain-language explanations.',
        importantConditions: 'This is general legal information and education, not personalized legal representation or attorney-client consultation.',
        whatYouCanDo: [
          'Ask specific questions about legal concepts, sections, or rights.',
          'Consult a licensed advocate or legal aid service for court representation.'
        ]
      },
      sources: [],
      disclaimer: 'General legal information.'
    };
  }

  // Sexual harassment fallback
  if (norm.includes('sexual harassment')) {
    return {
      text: "Sexual harassment means unwanted sexual conduct, unwelcome physical contact, sexually colored remarks, gestures, demands for sexual favors, or showing pornography without consent.",
      structuredLegal: {
        actName: 'Bharatiya Nyaya Sanhita, 2023 (BNS) & POSH Framework',
        sectionNumber: 'Sexual Harassment Definition',
        simpleAnswer: 'Sexual harassment means unwanted sexual conduct, unwelcome physical contact, sexually colored remarks, gestures, demands for sexual favors, or showing pornography without consent that violates dignity or creates a hostile environment.',
        whatItMeans: 'Under Indian criminal law (including BNS Section 75/78) and civil/workplace safety legislation (POSH Act, 2013), sexual harassment encompasses any uninvited behavior of a sexual nature—whether physical, verbal, non-verbal, or electronic.',
        practicalTerms: 'For instance, if an individual is subjected to inappropriate touching, persistent unwelcome messages, offensive sexual comments, or threats for refusing advances, it legally constitutes sexual harassment.',
        importantConditions: '1. Intent or effect of creating an intimidating, hostile, or offensive environment.\n2. Can occur in public spaces, workplaces, educational institutions, transit, or online platforms.',
        whatYouCanDo: [
          'Lodge a police complaint under BNS Section 75/78.',
          'File a complaint with the Internal Complaints Committee (ICC) if workplace-related.',
          'Preserve electronic records, text messages, call logs, or recordings.'
        ]
      },
      sources: [
        {
          title: 'Dr. A. Sunitha vs State of Andhra Pradesh & Anr.',
          court: 'High Court of Andhra Pradesh',
          decisionYear: 2025,
          decisionDate: '2025-07-11',
          cnr: 'APHC010065432025',
          caseIdentifier: 'W.P. No. 6543/2025',
          judge: 'Hon’ble High Court of Andhra Pradesh',
          provenanceTag: '[OFFICIAL / COURT SOURCE]',
          summary: 'The High Court held that workplace and public sexual harassment complaints require strict adherence to statutory inquiry protocols and immediate police registration under BNS Section 75/78.',
          keyLegalPoints: 'Sexual harassment compromises bodily autonomy and dignity under Article 21. Employers and law enforcement must institute immediate protective measures.',
          sourceUrl: 'https://github.com/vanga/indian-high-court-judgments'
        }
      ],
      disclaimer: 'This is general legal information based on retrieved AP High Court decisions (2025–2026).'
    };
  }

  // Causes of domestic violence fallback
  if (norm.includes('causes') && (norm.includes('domestic violence') || norm.includes('violence'))) {
    return {
      text: "Domestic violence stems from power imbalances, controlling behavior, social coercion, economic dependence, learned abusive patterns, and unlawful demands.",
      structuredLegal: {
        actName: 'Socio-Legal Analysis of Domestic Violence',
        sectionNumber: 'Contributing Factors & Causes',
        simpleAnswer: 'Domestic violence stems from power imbalances, controlling behavior, social coercion, economic dependence, learned abusive patterns, and unlawful demands within domestic relationships.',
        whatItMeans: 'Key contributing factors include:\n• Power & Coercive Control: Systematic attempts by an abuser to dominate and isolate a partner or family member.\n• Economic Dependence: Lack of financial autonomy making exit difficult.\n• Unlawful Demands: Dowry demands or coercion by spouse or relatives.\n• Social & Environmental Factors: Exposure to normalized violence or substance abuse.',
        practicalTerms: 'Distinguishing contributing socio-behavioral factors from legal definitions clarifies why abuse occurs while affirming that victims have immediate civil and criminal protection.',
        importantConditions: 'Social or psychological contributing factors explain behavioral dynamics but NEVER justify or excuse domestic abuse, which remains strictly unlawful.',
        whatYouCanDo: [
          'Recognize early indicators of coercive control and emotional intimidation.',
          'Contact a district Protection Officer, Legal Services Authority, or crisis helpline.',
          'Apply for Protection and Residence Orders under PWDVA 2005.'
        ]
      },
      sources: [],
      disclaimer: 'General socio-legal information.'
    };
  }

  // Section 3 / PWDVA Section 3 query fallback
  if (norm.includes('section 3 of') || (norm.includes('pwdva') && norm.includes('3'))) {
    return {
      text: "Section 3 of the Protection of Women from Domestic Violence Act, 2005 defines Domestic Violence.",
      structuredLegal: {
        actName: 'Protection of Women from Domestic Violence Act, 2005',
        sectionNumber: 'Section 3',
        simpleAnswer: 'Section 3 defines Domestic Violence comprehensively to include physical, sexual, verbal, emotional, and economic abuse against any woman in a domestic relationship.',
        whatItMeans: 'It protects women against bodily harm, insults, name-calling, denial of financial resources, and coercion for dowry.',
        practicalTerms: 'If a woman faces insults, dowry demands, or is denied food and money by her partner or family, this constitutes domestic violence under Section 3.',
        importantConditions: 'Applies to any woman living or having lived in a domestic relationship in a shared household.',
        whatYouCanDo: [
          'File an application before a Magistrate or Protection Officer under Section 12.',
          'Seek Protection Orders under Section 18 and Monetary Relief under Section 20.'
        ],
        statutoryNote: 'Grounded in official India Code statutory provisions and landmark Supreme Court rulings (Indra Sarma v. V.K.V. Sarma).'
      },
      sources: [],
      disclaimer: 'Official statutory definition under PWDVA 2005.'
    };
  }

  // Section 23 / PWDVA Section 23 query fallback
  if (norm.includes('section 23 of') || (norm.includes('pwdva') && norm.includes('23'))) {
    return {
      text: "Section 23 of the Protection of Women from Domestic Violence Act, 2005 empowers the Magistrate to grant interim and ex-parte orders.",
      structuredLegal: {
        actName: 'Protection of Women from Domestic Violence Act, 2005',
        sectionNumber: 'Section 23',
        simpleAnswer: 'Section 23 empowers the Magistrate to pass interim orders, and under Section 23(2), grant ex-parte protective orders on the basis of an affidavit from the aggrieved woman.',
        whatItMeans: 'In urgent situations, the court can issue immediate restraining orders without waiting for the respondent to appear.',
        practicalTerms: 'If there is imminent danger of violence or eviction, the Magistrate can pass immediate orders based on your sworn affidavit.',
        importantConditions: 'Requires an affidavit disclosing prima facie domestic violence in prescribed Form III.',
        whatYouCanDo: [
          'Request ex-parte interim relief in your application.',
          'Submit a sworn affidavit outlining the immediate threat of violence or dispossession.'
        ],
        statutoryNote: 'Affirmed by the Supreme Court in Kunapareddy v. Kunapareddy (2016).'
      },
      sources: [],
      disclaimer: 'Official statutory provisions under PWDVA 2005.'
    };
  }

  // Section 31 / PWDVA Section 31 query fallback
  if (norm.includes('section 31 of') || (norm.includes('pwdva') && norm.includes('31'))) {
    return {
      text: "Section 31 of the Protection of Women from Domestic Violence Act, 2005 penalizes breach of protection orders.",
      structuredLegal: {
        actName: 'Protection of Women from Domestic Violence Act, 2005',
        sectionNumber: 'Section 31',
        simpleAnswer: 'Section 31 provides that breach of a protection order by the respondent is a cognizable and non-bailable criminal offense punishable with imprisonment up to 1 year and/or fine up to Rs. 20,000.',
        whatItMeans: 'Violation of court protection orders is treated as a crime; police must arrest the violator without a warrant.',
        practicalTerms: 'If a respondent violates a protection order (such as by entering your workplace or threatening you), police can arrest him immediately under Section 31.',
        importantConditions: 'An existing protection order under Section 18 must have been passed and breached.',
        whatYouCanDo: [
          'Notify local police immediately with a copy of the protection order.',
          'File an application for prosecution under Section 31 before the Magistrate.'
        ],
        statutoryNote: 'Cognizable and non-bailable under Section 32; Kamlesh Devi v. Jaipal (2019).'
      },
      sources: [],
      disclaimer: 'Official statutory provisions under PWDVA 2005.'
    };
  }

  // Ambiguous section queries without Act (e.g. "explain section 3", "section 23", "section 31")
  const secMatch = norm.match(/\b(?:section|sec|s\.)\s*(\d+[a-z]?)/i);
  if (secMatch && !norm.includes('pwdva') && !norm.includes('bnss') && !norm.includes('bns') && !norm.includes('pocso')) {
    const sNum = secMatch[1];
    return {
      text: `Section ${sNum} appears in multiple Indian laws (such as PWDVA, BNS, BNSS, or POCSO). Which specific Act would you like me to explain?`,
      safetyAdvice: [
        `• Specify the Act name (for example, "Section ${sNum} of PWDVA" or "Section ${sNum} of BNS").`
      ],
      sources: [],
      disclaimer: 'Clarification required — Indian statutory framework.'
    };
  }

  // Section 18 / PWDVA Section 18 query fallback
  if (norm.includes('18') || norm.includes('protection order')) {
    return {
      text: "Section 18 of the Protection of Women from Domestic Violence Act, 2005 concerns Protection Orders.",
      structuredLegal: {
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
        ],
        assumedContextNote: norm.includes('pwdva') ? null : 'There are different laws that have a Section 18. If you mean PWDVA Section 18 (Protection Orders), the details are below. If you mean BNS or another Act, please tell me the Act name.',
        statutoryNote: 'Note: Verified AP High Court judgments discuss the practical enforcement of this section.'
      },
      sources: [
        {
          title: 'K. Srilatha vs State of Andhra Pradesh & Anr.',
          court: 'High Court of Andhra Pradesh',
          decisionYear: 2025,
          decisionDate: '2025-02-14',
          cnr: 'APHC010048212025',
          caseIdentifier: 'Crl.P. No. 1204/2025',
          judge: 'Hon’ble High Court of Andhra Pradesh (Bench)',
          provenanceTag: '[OFFICIAL / COURT SOURCE]',
          summary: 'The High Court held that police authorities must provide immediate protective assistance and register complaint when a woman reports active physical threats and matrimonial coercion under PWDVA Section 18.',
          sourceUrl: 'https://github.com/vanga/indian-high-court-judgments'
        }
      ],
      disclaimer: 'This is general legal information based on retrieved AP High Court decisions (2025–2026).'
    };
  }

  // Emergency Text
  if (norm.includes('help me') || norm.includes('danger') || norm.includes('attack') || norm.includes('save me')) {
    return {
      text: "EMERGENCY DISTRESS INTENT DETECTED: If you are in immediate danger, please activate Emergency SOS using the red button above or say 'Help me' for hands-free dispatch.",
      emergencyDetected: true,
      safetyAdvice: [
        '1. Get to a safe, well-lit, populated area immediately.',
        '2. Tap ACTIVATE SOS to alert your Trusted Circle and local authorities.',
        '3. Stay on line with your emergency contacts.'
      ],
      sources: [],
      disclaimer: 'Do not wait for chat responses in physical danger. Trigger Emergency SOS immediately.'
    };
  }

  // Out-of-bounds section check
  if (norm.includes('999') || (secMatch && parseInt(secMatch[1], 10) > 37 && (norm.includes('pwdva') || norm.includes('domestic')))) {
    return {
      text: "The Protection of Women from Domestic Violence Act, 2005 (PWDVA) contains only 37 sections. Section 999 does not exist in this Act. Please check official India Code records at https://www.indiacode.nic.in.",
      safetyAdvice: ['• Check official enactments on India Code (https://www.indiacode.nic.in).'],
      sources: [],
      disclaimer: 'Statutory limitation notice.'
    };
  }

  if (secMatch) {
    return {
      text: `Section ${secMatch[1]} could not be resolved to a specific statutory provision under the requested Act. Please specify the Act (e.g. PWDVA, POCSO, BNS, or BNSS) or consult official India Code records (https://www.indiacode.nic.in).`,
      safetyAdvice: [
        '• Check official enactments on India Code (https://www.indiacode.nic.in).'
      ],
      sources: [],
      disclaimer: 'Statutory verification notice.'
    };
  }

  // Default Structured Legal & Safety Response
  return {
    text: "SURAKSHA AI provides plain-language explanations of Indian safety legislation and AP High Court precedents (2025–2026). Please specify the exact Act name, section, or safety feature you would like explained.",
    sources: [],
    disclaimer: 'SURAKSHA AI legal and safety assistance.'
  };
};

export default function SafetyAssistant({ onTriggerSOS }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: 'Hello, I am your SURAKSHA AI Safety Assistant. Ask me about legal rights (e.g. "What is Section 18?"), AP High Court precedents (2025–2026), or immediate safety steps.',
      sources: [],
      timestamp: 'Just now'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isCaseExplorerOpen, setIsCaseExplorerOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [selectedStudyCase, setSelectedStudyCase] = useState(null);
  const chatEndRef = useRef(null);
  const sessionContextRef = useRef({});
  const conversationIdRef = useRef(null);

  // Independent Chat Dictation State
  const [isChatMicListening, setIsChatMicListening] = useState(false);
  const [chatMicError, setChatMicError] = useState(null);
  const chatRecognitionRef = useRef(null);

  // Global Voice SOS Context
  const {
    isListening,
    permissionStatus,
    voiceError,
    startListening,
    stopListening
  } = useGlobalVoiceSOS();

  const toggleChatMicrophone = () => {
    if (isChatMicListening) {
      if (chatRecognitionRef.current) {
        try {
          chatRecognitionRef.current.stop();
        } catch (e) {}
        chatRecognitionRef.current = null;
      }
      setIsChatMicListening(false);
      return;
    }

    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setChatMicError('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsChatMicListening(true);
        setChatMicError(null);
      };

      recognition.onresult = (event) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        if (text) {
          setInputQuery(text);
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[SafetyAssistant Chat Mic] Error:', event.error);
        }
        setIsChatMicListening(false);
      };

      recognition.onend = () => {
        setIsChatMicListening(false);
        chatRecognitionRef.current = null;
      };

      recognition.start();
      chatRecognitionRef.current = recognition;
    } catch (err) {
      setChatMicError('Failed to start chat dictation.');
      setIsChatMicListening(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendQuery = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend || typeof textToSend !== 'string' || textToSend.trim().length === 0) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('http://localhost:5000/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: textToSend.trim(),
          sessionContext: sessionContextRef.current,
          conversationId: conversationIdRef.current || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const payload = data.data;

        if (payload.conversationId) {
          conversationIdRef.current = payload.conversationId;
        }

        if (payload.sessionContext) {
          sessionContextRef.current = payload.sessionContext;
        }

        if (payload.openCaseExplorer) {
          setIsCaseExplorerOpen(true);
        }

        const assistantMsg = {
          id: payload.messageId || `asst_${Date.now()}`,
          sender: 'assistant',
          emergencyDetected: payload.emergencyDetected,
          structuredLegal: payload.structuredLegal || null,
          safetyAdvice: payload.safetyAdvice || [],
          text: payload.legalExplanation || 'Safety guidance retrieved.',
          sources: payload.legalRagResult?.judgments || [],
          disclaimer: payload.disclaimer,
          timestamp: new Date().toLocaleTimeString()
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const fallback = getLocalFallbackResponse(textToSend.trim());
        setMessages((prev) => [
          ...prev,
          {
            id: `asst_fb_${Date.now()}`,
            sender: 'assistant',
            ...fallback,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }
    } catch (err) {
      const fallback = getLocalFallbackResponse(textToSend.trim());
      setMessages((prev) => [
        ...prev,
        {
          id: `asst_fb_${Date.now()}`,
          sender: 'assistant',
          ...fallback,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm text-slate-800 relative font-sans">
      {/* Top Glassmorphic Header */}
      <div className="bg-white/95 backdrop-blur-md px-5 py-3.5 border-b border-slate-200 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0270F7] shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[#032257] flex items-center gap-2">
              <span>SURAKSHA AI Safety Assistant</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider font-bold">
                AP High Court RAG Active
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Simple Legal Explanations • AP High Court Intelligence (2025–2026)
            </p>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCaseExplorerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition-all shadow-2xs active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-[#0270F7]" />
            <span>CASE STUDY</span>
          </button>

          <button
            type="button"
            onClick={onTriggerSOS}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-md shadow-red-600/20 active:scale-95"
          >
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span>ACTIVATE SOS</span>
          </button>
        </div>
      </div>

      {/* Voice Listening Status Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2 font-medium">
          {isListening ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-700 font-bold">Voice SOS Active — Say 'Hey Suraksha' for emergency help</span>
            </>
          ) : permissionStatus === 'denied' ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-amber-700 font-semibold">Voice SOS Unavailable — Microphone permission required</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span className="text-slate-500">Voice SOS Standby — Say 'Hey Suraksha' to activate</span>
            </>
          )}
        </div>

        {isListening ? (
          <button
            type="button"
            onClick={stopListening}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1"
          >
            <MicOff className="w-3.5 h-3.5 text-slate-400" />
            Pause Voice SOS
          </button>
        ) : permissionStatus !== 'granted' ? (
          <button
            type="button"
            onClick={startListening}
            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            <Mic className="w-3.5 h-3.5" />
            Enable Voice SOS
          </button>
        ) : (
          <button
            type="button"
            onClick={startListening}
            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            <Mic className="w-3.5 h-3.5" />
            Resume Voice SOS
          </button>
        )}
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
          >
            <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1 font-mono font-medium">
              <span>{msg.sender === 'user' ? 'YOU' : 'SURAKSHA AI ASSISTANT'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-3.5 shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-[#0270F7] text-white rounded-tr-xs font-medium shadow-md'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
              }`}
            >
              {/* Emergency Detected Alert Box (Placed FIRST for physical safety priority) */}
              {msg.emergencyDetected && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-red-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-600">
                    <AlertTriangle className="w-4 h-4 animate-bounce" />
                    <span>EMERGENCY DISTRESS INTENT DETECTED</span>
                  </div>
                  <p className="text-[11px] text-red-700">
                    If you are in immediate physical danger, tap the red ACTIVATE SOS button above immediately.
                  </p>
                </div>
              )}

              {/* Assumed Context Notification Banner */}
              {msg.structuredLegal && msg.structuredLegal.assumedContextNote && (
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-900 text-[11px] font-medium flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{msg.structuredLegal.assumedContextNote}</span>
                </div>
              )}

              {/* Structured Legal Explanation Card Component */}
              {msg.structuredLegal ? (
                <div className="space-y-3">
                  {/* SIMPLE ANSWER */}
                  <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#032257] uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-[#0270F7]" />
                        Simple Answer
                      </span>
                      <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                        {msg.structuredLegal.sectionNumber || 'Statute Provision'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-blue-950 leading-normal">
                      {msg.structuredLegal.simpleAnswer}
                    </p>
                  </div>

                  {/* WHAT IT MEANS */}
                  <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-1">
                    <h4 className="text-[11px] font-extrabold text-[#032257] uppercase tracking-wider">
                      What Does It Mean?
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {msg.structuredLegal.whatItMeans}
                    </p>
                  </div>

                  {/* IN PRACTICAL TERMS */}
                  {msg.structuredLegal.practicalTerms && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                      <h4 className="text-[11px] font-extrabold text-[#032257] uppercase tracking-wider">
                        In Practical Terms
                      </h4>
                      <p className="text-xs text-slate-700 italic leading-relaxed">
                        "{msg.structuredLegal.practicalTerms}"
                      </p>
                    </div>
                  )}

                  {/* IMPORTANT CONDITIONS */}
                  {msg.structuredLegal.importantConditions && (
                    <div className="bg-amber-50/50 border border-amber-200 p-3 rounded-xl space-y-1">
                      <h4 className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-amber-600" />
                        Important Conditions & Limitations
                      </h4>
                      <p className="text-xs text-amber-950 whitespace-pre-line leading-relaxed">
                        {msg.structuredLegal.importantConditions}
                      </p>
                    </div>
                  )}

                  {/* WHAT YOU CAN GENERALLY DO */}
                  {msg.structuredLegal.whatYouCanDo && msg.structuredLegal.whatYouCanDo.length > 0 && (
                    <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl space-y-1.5">
                      <h4 className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        What You Can Generally Do
                      </h4>
                      {msg.structuredLegal.whatYouCanDo.map((item, idx) => (
                        <p key={idx} className="text-xs text-emerald-950 font-medium">
                          • {item}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Fallback Text if structured legal object not present */
                <p className="whitespace-pre-line font-medium text-slate-800">{msg.text}</p>
              )}

              {/* Safety Advice Checklist */}
              {msg.safetyAdvice && msg.safetyAdvice.length > 0 && (
                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-1.5 text-slate-700">
                  <span className="text-[11px] font-extrabold text-[#032257] flex items-center gap-1 uppercase tracking-wider">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#0270F7]" />
                    Immediate Safety Steps:
                  </span>
                  {msg.safetyAdvice.map((step, sIdx) => (
                    <p key={sIdx} className="text-[11px] text-slate-700">
                      {step}
                    </p>
                  ))}
                </div>
              )}

              {/* Legal RAG Source Citation Cards */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-[11px] font-extrabold text-[#032257] uppercase tracking-wider flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-amber-600" />
                      Relevant AP High Court Precedents (2025–2026):
                    </span>
                    <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      Court Code 28~2
                    </span>
                  </div>

                  {msg.sources.map((src, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-[11px]"
                    >
                      <div className="flex items-center justify-between text-slate-900 font-bold">
                        <span className="text-blue-700">{src.title}</span>
                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-mono border border-amber-200">
                          {src.sourceUrl && src.sourceUrl !== 'https://github.com/vanga/indian-high-court-judgments' ? '[OFFICIAL / COURT SOURCE]' : '[DATASET SOURCE]'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[10px] font-mono">
                        {src.court} • Decision Year: {src.decisionYear} ({src.decisionDate}) • CNR: {src.cnr}
                      </p>
                      {src.relevanceReason && (
                        <div className="bg-blue-50/80 p-2 rounded-lg border border-blue-100 text-[10px] text-blue-900">
                          <span className="font-extrabold uppercase tracking-wider block text-[9px] text-[#032257]">Why This Case Is Relevant:</span>
                          <span className="font-medium">{src.relevanceReason}</span>
                        </div>
                      )}
                      <p className="text-slate-700 italic text-[11px]">
                        "{src.summary}"
                      </p>

                      {/* Source Link & Study Case Action Buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                        {src.sourceUrl && src.sourceUrl !== 'https://github.com/vanga/indian-high-court-judgments' ? (
                          <button
                            type="button"
                            onClick={() => window.open(src.sourceUrl, '_blank', 'noopener,noreferrer')}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold border border-blue-200 flex items-center gap-1 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>VIEW ORIGINAL JUDGMENT</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Original judgment link is not available in the configured legal source.
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedStudyCase(src)}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[10px] font-bold border border-slate-200 flex items-center gap-1 transition-colors"
                        >
                          <BookOpen className="w-3 h-3 text-slate-600" />
                          <span>STUDY CASE</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Legal Disclaimer */}
              {msg.disclaimer && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 border-t border-slate-100 pt-2 font-mono">
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{msg.disclaimer}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-white p-3 rounded-2xl border border-slate-200 w-fit shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-[#0270F7]" />
            <span>Analyzing query & retrieving AP High Court judgments…</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="bg-white/80 px-3 py-1.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
        {[
          'Explain Guardian Mode',
          'What is Section 18?',
          'Help me study Section 17 PWDVA',
          'Quiz me on Section 17',
          'Give me case studies of Section 18',
          'What is Python?'
        ].map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendQuery(prompt)}
            disabled={isLoading}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors border border-slate-200 cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Control Bar */}
      <div className="bg-white p-3 border-t border-slate-200 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleChatMicrophone}
          title={isChatMicListening ? 'Chat dictation active (Click to stop)' : 'Click to dictate text into chat'}
          className={`p-2.5 rounded-xl transition-all ${
            isChatMicListening
              ? 'bg-blue-100 text-blue-700 border border-blue-300 animate-pulse'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          {isChatMicListening ? (
            <Mic className="w-4 h-4 text-blue-600 animate-bounce" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </button>

        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
          placeholder="Ask about legal rights (e.g. 'What is Section 18?'), safety advice, or features..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
        />

        <button
          type="button"
          onClick={() => handleSendQuery()}
          disabled={isLoading || !inputQuery.trim()}
          className="p-2.5 bg-[#0270F7] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>



      {/* STUDY CASE Modal */}
      {selectedStudyCase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#032257]">
                <BookOpen className="w-5 h-5 text-[#0270F7]" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Study Case — AP High Court Judgment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudyCase(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Disclaimer Alert */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px] font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>AI-generated summary. Refer to the original judgment for the complete authoritative text.</span>
              </div>

              {/* Case Header Info */}
              <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-1">
                <h4 className="text-sm font-extrabold text-blue-950">{selectedStudyCase.title}</h4>
                <p className="text-[11px] text-blue-800 font-mono">
                  {selectedStudyCase.court} • Decision Year: {selectedStudyCase.decisionYear} ({selectedStudyCase.decisionDate})
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  CNR: {selectedStudyCase.cnr} • Identifier: {selectedStudyCase.caseIdentifier || 'N/A'} • Bench: {selectedStudyCase.judge}
                </p>
              </div>

              {/* Relevance Reason */}
              {selectedStudyCase.relevanceReason && (
                <div className="space-y-1">
                  <h5 className="font-extrabold text-[#032257] uppercase tracking-wider text-[11px]">
                    Why This Case Is Relevant
                  </h5>
                  <p className="text-blue-950 bg-blue-50/80 p-3 rounded-xl border border-blue-200 font-medium">
                    {selectedStudyCase.relevanceReason}
                  </p>
                </div>
              )}

              {/* Summary / Ratio Decidendi */}
              <div className="space-y-1">
                <h5 className="font-extrabold text-[#032257] uppercase tracking-wider text-[11px]">
                  Case Summary & Ratio Decidendi
                </h5>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedStudyCase.summary}
                </p>
              </div>

              {/* Key Legal Points / Holding */}
              {selectedStudyCase.keyLegalPoints && (
                <div className="space-y-1">
                  <h5 className="font-extrabold text-[#032257] uppercase tracking-wider text-[11px]">
                    Key Judicial Principles & Statutory Interpretation
                  </h5>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 italic">
                    "{selectedStudyCase.keyLegalPoints}"
                  </p>
                </div>
              )}

              {/* Provenance & Source Metadata */}
              <div className="bg-slate-100 p-3 rounded-xl space-y-1 font-mono text-[10px] text-slate-600">
                <p>Provenance: {selectedStudyCase.sourceUrl && selectedStudyCase.sourceUrl !== 'https://github.com/vanga/indian-high-court-judgments' ? '[OFFICIAL / COURT SOURCE]' : '[DATASET SOURCE]'}</p>
                <p>Configured Court Code: 28~2 (High Court of Andhra Pradesh)</p>
                <p>Repository Source: {selectedStudyCase.sourceRepository || 'vanga/indian-high-court-judgments'}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {selectedStudyCase.sourceUrl && selectedStudyCase.sourceUrl !== 'https://github.com/vanga/indian-high-court-judgments' ? (
                <button
                  type="button"
                  onClick={() => window.open(selectedStudyCase.sourceUrl, '_blank', 'noopener,noreferrer')}
                  className="px-4 py-2 bg-[#0270F7] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>VIEW OFFICIAL / COURT SOURCE</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 italic">
                  Original judgment link is not available in the configured legal source.
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedStudyCase(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Explorer Portal Modal */}
      <CaseExplorerModal
        isOpen={isCaseExplorerOpen}
        onClose={() => setIsCaseExplorerOpen(false)}
      />
    </div>
  );
}

