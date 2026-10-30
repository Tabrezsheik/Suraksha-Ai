'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Upload, FileAudio, CheckCircle2, ShieldAlert, Loader2, AlertTriangle } from 'lucide-react';

export default function EvidenceRecorder({ emergencyId, onEvidenceUploaded, onStatusUpdate }) {
  const [evidenceList, setEvidenceList] = useState([]);
  const [currentSegment, setCurrentSegment] = useState(1);
  const [segmentSeconds, setSegmentSeconds] = useState(0);
  const [isAutoRecording, setIsAutoRecording] = useState(false);
  const [micState, setMicState] = useState('INITIALIZING'); // INITIALIZING, RECORDING, UPLOADING, PAUSED, COMPLETED, UNAVAILABLE
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const segmentTimerRef = useRef(null);
  const isStoppingRef = useRef(false);
  const currentSegmentRef = useRef(1);
  const segmentSecondsRef = useRef(0);

  const fetchEvidence = useCallback(async () => {
    if (!emergencyId) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`http://localhost:5000/api/evidence/${emergencyId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEvidenceList(data.data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch evidence metadata:', err.message);
    }
  }, [emergencyId]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  const uploadAudioSegment = useCallback(async (blob, segNum, durationSecs) => {
    if (!emergencyId || !blob) return null;
    setMicState('UPLOADING');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      const audioBase64 = await base64Promise;

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('http://localhost:5000/api/evidence/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          emergencyId,
          audioData: audioBase64,
          mimeType: blob.type || 'audio/webm',
          durationSeconds: Math.max(1, Math.round(durationSecs))
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUploadSuccess(true);
        fetchEvidence();
        if (onEvidenceUploaded) onEvidenceUploaded(data.data);
        if (onStatusUpdate) onStatusUpdate({ segment: segNum, status: 'UPLOADED' });
        return data.data;
      } else {
        if (onStatusUpdate) onStatusUpdate({ segment: segNum, status: 'FAILED' });
      }
    } catch (uploadErr) {
      console.error('Automatic audio segment upload error:', uploadErr.message);
      if (onStatusUpdate) onStatusUpdate({ segment: segNum, status: 'FAILED' });
    }
    return null;
  }, [emergencyId, fetchEvidence, onEvidenceUploaded, onStatusUpdate]);

  const stopActiveRecording = useCallback(async (finalizePartial = true) => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }

    const segNum = currentSegmentRef.current;
    const durSecs = segmentSecondsRef.current;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        const recorder = mediaRecorderRef.current;
        const stopPromise = new Promise((resolve) => {
          recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            chunksRef.current = [];
            if (finalizePartial && blob.size > 0 && durSecs >= 1) {
              await uploadAudioSegment(blob, segNum, durSecs);
            }
            resolve();
          };
          recorder.stop();
        });
        await stopPromise;
      } catch (e) {
        console.warn('MediaRecorder stop error:', e.message);
      }
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }

    setIsAutoRecording(false);
    setMicState(currentSegmentRef.current >= 20 ? 'COMPLETED' : 'PAUSED');
  }, [uploadAudioSegment]);

  const startSegmentRecording = useCallback(async (segNum = 1) => {
    if (segNum > 20) {
      setMicState('COMPLETED');
      return;
    }

    setError(null);
    chunksRef.current = [];
    currentSegmentRef.current = segNum;
    setCurrentSegment(segNum);
    segmentSecondsRef.current = 0;
    setSegmentSeconds(0);
    isStoppingRef.current = false;

    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Audio recording is not supported in this browser environment.');
      setMicState('UNAVAILABLE');
      if (onStatusUpdate) onStatusUpdate({ segment: segNum, status: 'UNAVAILABLE' });
      return;
    }

    try {
      let stream = mediaStreamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(500);
      mediaRecorderRef.current = mediaRecorder;
      setIsAutoRecording(true);
      setMicState('RECORDING');
      if (onStatusUpdate) onStatusUpdate({ segment: segNum, status: 'RECORDING' });

      // 60-second ticker per segment
      segmentTimerRef.current = setInterval(() => {
        segmentSecondsRef.current += 1;
        setSegmentSeconds(segmentSecondsRef.current);

        // At 60 seconds: finalize segment, upload automatically, start next segment if segNum < 20
        if (segmentSecondsRef.current >= 60) {
          clearInterval(segmentTimerRef.current);
          segmentTimerRef.current = null;

          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = async () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
              chunksRef.current = [];
              await uploadAudioSegment(blob, segNum, 60);

              if (segNum < 20) {
                startSegmentRecording(segNum + 1);
              } else {
                stopActiveRecording(false);
                setMicState('COMPLETED');
              }
            };
            mediaRecorderRef.current.stop();
          }
        }
      }, 1000);

    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err.message);
      setError(`Microphone permission unavailable: ${err.message}`);
      setMicState('UNAVAILABLE');
      setIsAutoRecording(false);
      if (onStatusUpdate) onStatusUpdate({ segment: segNum, status: 'UNAVAILABLE' });
    }
  }, [uploadAudioSegment, stopActiveRecording, onStatusUpdate]);

  // Auto-start emergency audio capture on mount
  useEffect(() => {
    if (!emergencyId) return;
    startSegmentRecording(1);

    return () => {
      stopActiveRecording(true);
    };
  }, [emergencyId]); // run once per emergencyId mount

  const totalElapsedMins = Math.floor(((currentSegment - 1) * 60 + segmentSeconds) / 60);
  const totalElapsedSecs = ((currentSegment - 1) * 60 + segmentSeconds) % 60;
  const timeFormatted = `${totalElapsedMins < 10 ? '0' : ''}${totalElapsedMins}:${totalElapsedSecs < 10 ? '0' : ''}${totalElapsedSecs}`;

  return (
    <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm text-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#0270F7]" />
          <h4 className="text-xs font-bold text-[#032257] uppercase tracking-wider">
            Emergency Audio Evidence Capture
          </h4>
        </div>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
          micState === 'RECORDING' ? 'bg-red-100 text-red-700 animate-pulse border border-red-200' :
          micState === 'UPLOADING' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
          micState === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
          'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {micState === 'RECORDING' ? '● AUTOMATIC CAPTURE ACTIVE' :
           micState === 'UPLOADING' ? 'UPLOADING SEGMENT' :
           micState === 'COMPLETED' ? '20-MIN CAP COMPLETED' :
           micState === 'UNAVAILABLE' ? 'MIC UNAVAILABLE (NON-BLOCKING)' : micState}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 20-Segment Progress Indicator */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            {isAutoRecording && micState === 'RECORDING' ? (
              <Mic className="w-4 h-4 text-red-600 animate-bounce" />
            ) : micState === 'UNAVAILABLE' ? (
              <MicOff className="w-4 h-4 text-slate-400" />
            ) : (
              <Mic className="w-4 h-4 text-slate-400" />
            )}
            <span>Automatic Audio Segment: <strong className="text-[#032257]">{micState === 'UNAVAILABLE' ? 'Audio capture unavailable' : `Segment ${currentSegment} / 20`}</strong></span>
          </div>

          <div className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
            {timeFormatted} / 20:00
          </div>
        </div>

        {/* 20 Segment Progress Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((segIndex) => {
            const isDone = segIndex <= evidenceList.length;
            const isCurrent = isAutoRecording && micState === 'RECORDING' && segIndex === currentSegment;
            const isCompletedCap = micState === 'COMPLETED';

            return (
              <div
                key={segIndex}
                className={`flex-1 min-w-[36px] py-1.5 px-1 rounded-lg border text-center font-mono text-[10px] font-bold transition-all ${
                  isCurrent ? 'bg-red-500 border-red-600 text-white shadow-sm animate-pulse' :
                  isDone || isCompletedCap ? 'bg-emerald-500 border-emerald-600 text-white' :
                  'bg-slate-100 border-slate-200 text-slate-400'
                }`}
                title={`Segment ${segIndex}: ${isCurrent ? 'Recording' : isDone ? 'Uploaded' : isCompletedCap ? 'Completed' : 'Queued'}`}
              >
                #{segIndex}
              </div>
            );
          })}
        </div>
      </div>

      {uploadSuccess && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Audio evidence segment recorded & uploaded to Emergency Event.</span>
        </div>
      )}

      {/* Captured Evidence Records List */}
      {evidenceList.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-[#032257] uppercase tracking-wider flex items-center gap-1">
            <FileAudio className="w-3.5 h-3.5 text-[#0270F7]" />
            Uploaded Audio Evidence Metadata ({evidenceList.length}):
          </span>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {evidenceList.map((ev) => (
              <div
                key={ev._id || ev.id}
                className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">{ev.fileName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {ev.durationSeconds}s • {(ev.fileSizeBytes / 1024).toFixed(1)} KB • {new Date(ev.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  UPLOADED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

