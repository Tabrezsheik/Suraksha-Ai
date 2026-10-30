import { useState, useEffect, useRef, useCallback } from 'react';

export function normalizeTranscript(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const EXPLANATORY_FALSE_POSITIVES = [
  'help me understand',
  'can you help',
  'how can you help',
  'what help',
  'help explain',
  'help with',
  'help me with',
  'help me find',
  'what is suraksha',
  'tell me about suraksha',
  'suraksha ai features',
  'what does emergency mean',
  'what does help mean',
  'explain the word help',
  'explain what help means',
  'someone said the word emergency',
  'tell me about safety',
  'tell me about emergency',
  'i am learning about',
  'learning about domestic violence'
];

const WAKE_WORDS = [
  'hey suraksha ai',
  'hey suraksha',
  'hi suraksha'
];

const QUESTION_PREFIXES = [
  'what is',
  'what does',
  'how do',
  'how can',
  'tell me',
  'explain',
  'where is',
  'who is',
  'why is'
];

const LEGACY_DISTRESS_PHRASES = [
  'help me',
  'help',
  'emergency help',
  'i need help',
  'someone help me',
  'please help me',
  'save me',
  'in danger',
  'i am in danger',
  "i'm in danger"
];

export function isEmergencyPhrase(text) {
  if (!text) return false;
  const norm = normalizeTranscript(text);
  if (!norm) return false;

  // 1. Explicit false-positive / explanatory pattern check
  for (const fp of EXPLANATORY_FALSE_POSITIVES) {
    if (norm.includes(fp)) {
      return false;
    }
  }

  // 2. Weak single words alone MUST NOT trigger SOS
  const weakWords = ['suraksha', 'hey', 'security', 'danger', 'emergency'];
  if (weakWords.includes(norm)) {
    return false;
  }

  // 3. Wake-word matching ("Hey Suraksha", "Hey Suraksha AI", "Hi Suraksha")
  const detectedWakeWord = WAKE_WORDS.find(ww => norm.includes(ww));
  if (detectedWakeWord) {
    const wakeWordIndex = norm.indexOf(detectedWakeWord);
    const afterWake = norm.slice(wakeWordIndex + detectedWakeWord.length).trim();

    // "Hey Suraksha" alone is an intentional emergency trigger
    if (!afterWake) {
      return true;
    }

    // If text after wake word is an informational/conversational question prefix, DO NOT trigger SOS
    const startsWithQuestion = QUESTION_PREFIXES.some(q => afterWake.startsWith(q));
    if (startsWithQuestion) {
      return false;
    }

    return true;
  }

  // 4. Direct distress phrases ("help me", "help", "emergency help", "i need help")
  for (const phrase of LEGACY_DISTRESS_PHRASES) {
    if (norm === phrase || norm.includes(phrase)) {
      return true;
    }
  }

  return false;
}

export default function useVoiceSOS({ onEmergencyDetected, autoListen = true }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [emergencyDetected, setEmergencyDetected] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'granted', 'prompt', 'denied', 'unsupported'
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const mountedRef = useRef(true);
  const isAutoListeningRef = useRef(autoListen);
  const permissionStatusRef = useRef(permissionStatus);
  const onEmergencyDetectedRef = useRef(onEmergencyDetected);
  const isExplicitlyStoppedRef = useRef(false);
  const restartTimerRef = useRef(null);

  useEffect(() => {
    onEmergencyDetectedRef.current = onEmergencyDetected;
  }, [onEmergencyDetected]);

  useEffect(() => {
    isAutoListeningRef.current = autoListen;
  }, [autoListen]);

  useEffect(() => {
    permissionStatusRef.current = permissionStatus;
  }, [permissionStatus]);

  const startListening = useCallback(() => {
    isExplicitlyStoppedRef.current = false;
    isAutoListeningRef.current = true;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setPermissionStatus('unsupported');
      setError('Web Speech API is not supported in this browser.');
      return false;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (mountedRef.current) {
          setIsListening(true);
          setPermissionStatus('granted');
          setError(null);
        }
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        
        if (mountedRef.current) {
          setTranscript(currentTranscript);
          if (isEmergencyPhrase(currentTranscript)) {
            setEmergencyDetected(true);
            if (onEmergencyDetectedRef.current) {
              onEmergencyDetectedRef.current(currentTranscript);
            }
          }
        }
      };

      recognition.onerror = (event) => {
        if (!mountedRef.current) return;
        if (event.error === 'not-allowed') {
          setPermissionStatus('denied');
          setError('Microphone permission required for automatic Voice SOS.');
          setIsListening(false);
        } else if (event.error === 'network' || event.error === 'aborted') {
          // Transient network drop or user pause - silent recover on next onend cycle if enabled
        } else if (event.error !== 'no-speech') {
          console.warn('[useVoiceSOS] Recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        if (!mountedRef.current) return;
        setIsListening(false);

        // Safely restart continuous background monitoring if autoListen is enabled, permission is granted, and not explicitly stopped
        if (isAutoListeningRef.current && permissionStatusRef.current !== 'denied' && !isExplicitlyStoppedRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (mountedRef.current && isAutoListeningRef.current && !isExplicitlyStoppedRef.current) {
              try {
                if (recognitionRef.current) {
                  recognitionRef.current.start();
                }
              } catch (e) {}
            }
          }, 500);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      return true;
    } catch (err) {
      if (mountedRef.current) {
        setError(`Failed to start speech recognition: ${err.message}`);
        setIsListening(false);
      }
      return false;
    }
  }, []);

  const stopListening = useCallback(() => {
    isExplicitlyStoppedRef.current = true;
    isAutoListeningRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mountedRef.current) {
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (autoListen) {
      startListening();
    }

    return () => {
      mountedRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      stopListening();
    };
  }, [autoListen, startListening, stopListening]);

  return {
    isListening,
    transcript,
    emergencyDetected,
    permissionStatus,
    error,
    startListening,
    stopListening
  };
}

