'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import useVoiceSOS from '../hooks/useVoiceSOS';
import VoiceSOSModal from '../components/VoiceSOSModal';

const GlobalVoiceSOSContext = createContext(null);

export function GlobalVoiceSOSProvider({ children }) {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [activeEmergency, setActiveEmergency] = useState(null);
  const isTriggeringRef = useRef(false);

  // Check active emergency status from backend
  const fetchActiveEmergency = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      const res = await fetch('http://localhost:5000/api/emergency/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveEmergency(data.data || null);
      }
    } catch (err) {
      console.warn('[GlobalVoiceSOS] Active emergency check warning:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchActiveEmergency();
  }, [fetchActiveEmergency]);

  // Central useVoiceSOS instance
  const {
    isListening,
    permissionStatus,
    error: voiceError,
    startListening,
    stopListening
  } = useVoiceSOS({
    autoListen: true,
    onEmergencyDetected: (transcriptText) => {
      // Prevent duplicate modal triggers if modal is open or emergency is active
      if (isVoiceModalOpen || activeEmergency || isTriggeringRef.current) return;
      setVoiceTranscript(transcriptText);
      setIsVoiceModalOpen(true);
    }
  });

  // Execute emergency creation via backend EmergencyService
  const executeEmergencyCreation = useCallback(async (triggerType = 'voice') => {
    if (isTriggeringRef.current) return;
    isTriggeringRef.current = true;
    setIsVoiceModalOpen(false);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        console.warn('[GlobalVoiceSOS] No auth token found');
        isTriggeringRef.current = false;
        return;
      }

      // Check if emergency is already active to prevent duplicates
      const checkRes = await fetch('http://localhost:5000/api/emergency/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const checkData = await checkRes.json();
      if (checkRes.ok && checkData.success && checkData.data) {
        setActiveEmergency(checkData.data);
        isTriggeringRef.current = false;
        return;
      }

      const res = await fetch('http://localhost:5000/api/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          triggerType,
          signals: triggerType === 'voice' ? [{ type: 'voice_distress', points: 30 }] : []
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveEmergency(data.data);
      } else if (res.status === 409 && data.existingEmergencyId) {
        fetchActiveEmergency();
      }
    } catch (err) {
      console.error('[GlobalVoiceSOS] Emergency activation error:', err.message);
    } finally {
      isTriggeringRef.current = false;
    }
  }, [fetchActiveEmergency]);

  // Trigger manual SOS directly
  const triggerManualSOS = useCallback(() => {
    executeEmergencyCreation('manual');
  }, [executeEmergencyCreation]);

  const closeVoiceModal = useCallback(() => {
    setIsVoiceModalOpen(false);
  }, []);

  return (
    <GlobalVoiceSOSContext.Provider
      value={{
        isListening,
        permissionStatus,
        voiceError,
        voiceTranscript,
        isVoiceModalOpen,
        activeEmergency,
        startListening,
        stopListening,
        triggerManualSOS,
        executeEmergencyCreation,
        closeVoiceModal,
        fetchActiveEmergency,
        setActiveEmergency
      }}
    >
      {children}

      {/* Global Countdown Modal rendered over ANY active page */}
      <VoiceSOSModal
        isOpen={isVoiceModalOpen}
        transcript={voiceTranscript}
        onConfirmSOS={() => {
          executeEmergencyCreation('voice');
        }}
        onCancelSOS={closeVoiceModal}
        countdownInitial={5}
      />
    </GlobalVoiceSOSContext.Provider>
  );
}

export function useGlobalVoiceSOS() {
  const context = useContext(GlobalVoiceSOSContext);
  if (!context) {
    throw new Error('useGlobalVoiceSOS must be used within a GlobalVoiceSOSProvider');
  }
  return context;
}
