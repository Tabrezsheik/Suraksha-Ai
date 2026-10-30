'use client';

import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Clock, MapPin, Users, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import LiveMap from '@/components/LiveMap';
import EvidenceRecorder from '@/components/EvidenceRecorder';
import { useSocket } from '@/hooks/useSocket';

export default function ActiveEmergencyView({ emergency, onEmergencyUpdated }) {
  const [cancelling, setCancelling] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmResolve, setConfirmResolve] = useState(false);
  const [error, setError] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [locationHistory, setLocationHistory] = useState([]);

  const isTerminatedRef = useRef(false);
  const latestEmergencyRef = useRef(emergency);
  latestEmergencyRef.current = emergency;
  const onEmergencyUpdatedRef = useRef(onEmergencyUpdated);
  onEmergencyUpdatedRef.current = onEmergencyUpdated;
  const evidenceRecorderStatusRef = useRef({ segment: 1, status: 'NOT_RECORDING' });

  const watchIdRef = useRef(null);
  const lastSubmittedTimeRef = useRef(0);
  const bestCandidateRef = useRef(null);
  const intervalIdRef = useRef(null);
  const { socket, joinEmergencyRoom, leaveEmergencyRoom } = useSocket();

  const emergencyId = emergency?.id || emergency?.emergencyId;

  // Fetch historic locations when emergency mounts
  useEffect(() => {
    if (!emergencyId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    fetch(`http://localhost:5000/api/tracking/${emergencyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setLocationHistory(data.data);
        }
      })
      .catch(() => {});
  }, [emergencyId]);

  // Join emergency Socket.IO room & listen for live location and risk updates
  useEffect(() => {
    if (!emergencyId || !socket) return;

    joinEmergencyRoom(emergencyId);

    const handleLocationUpdated = (data) => {
      if (data && (data.emergencyId === emergencyId || !data.emergencyId)) {
        const newLoc = {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          timestamp: data.timestamp || new Date().toISOString()
        };

        setLocationHistory((prev) => [...prev, newLoc]);

        if (onEmergencyUpdated && emergency) {
          onEmergencyUpdated({
            ...emergency,
            currentLocation: newLoc,
            timeline: Array.isArray(data.timeline) ? data.timeline : emergency.timeline
          });
        }
      }
    };

    const handleRiskUpdated = (data) => {
      if (data && (data.emergencyId === emergencyId || !data.emergencyId)) {
        if (onEmergencyUpdated && emergency) {
          onEmergencyUpdated({
            ...emergency,
            currentRiskScore: data.score,
            riskLevel: data.level
          });
        }
      }
    };

    socket.on('location_updated', handleLocationUpdated);
    socket.on('risk_updated', handleRiskUpdated);

    return () => {
      socket.off('location_updated', handleLocationUpdated);
      socket.off('risk_updated', handleRiskUpdated);
      leaveEmergencyRoom(emergencyId);
    };
  }, [emergencyId, socket, joinEmergencyRoom, leaveEmergencyRoom, onEmergencyUpdated, emergency]);

  // Helper: POST location reading to backend API
  const submitLocationToBackend = async (reading) => {
    if (!emergencyId || !reading) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      const res = await fetch('http://localhost:5000/api/tracking/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          emergencyId,
          latitude: reading.latitude,
          longitude: reading.longitude,
          accuracy: reading.accuracy,
          speed: reading.speed,
          heading: reading.heading
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.data && !isTerminatedRef.current) {
        const locData = data.data;
        if (locData.isPersisted !== false && onEmergencyUpdatedRef.current && latestEmergencyRef.current) {
          onEmergencyUpdatedRef.current({
            ...latestEmergencyRef.current,
            currentLocation: {
              latitude: locData.latitude,
              longitude: locData.longitude,
              accuracy: locData.accuracy,
              timestamp: locData.recordedAt
            },
            timeline: Array.isArray(locData.timeline) ? locData.timeline : latestEmergencyRef.current.timeline
          });
        }
      }
    } catch (postErr) {
      console.warn('Could not post live tracking location update:', postErr.message);
    }
  };

  // Continuous Geolocation watchPosition lifecycle & 60-second send gate
  useEffect(() => {
    if (!emergencyId || typeof window === 'undefined' || !('geolocation' in navigator)) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Start watchPosition for continuous browser location acquisition
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!position || !position.coords) return;
        const { latitude, longitude, accuracy, speed, heading } = position.coords;

        const currentReading = {
          latitude,
          longitude,
          accuracy: typeof accuracy === 'number' ? accuracy : null,
          speed: typeof speed === 'number' ? speed : null,
          heading: typeof heading === 'number' ? heading : null
        };

        const now = Date.now();

        // 1. First valid location: send immediately
        if (lastSubmittedTimeRef.current === 0) {
          lastSubmittedTimeRef.current = now;
          bestCandidateRef.current = null;
          submitLocationToBackend(currentReading);
          return;
        }

        // 2. Within 60-second window: candidate selection (prefer smaller numerical accuracy)
        if (now - lastSubmittedTimeRef.current < 60000) {
          if (!bestCandidateRef.current) {
            bestCandidateRef.current = currentReading;
          } else {
            const currentAcc = bestCandidateRef.current.accuracy;
            const newAcc = currentReading.accuracy;
            if (currentAcc === null || (newAcc !== null && newAcc <= currentAcc)) {
              bestCandidateRef.current = currentReading;
            }
          }
        } else {
          // 3. 60+ seconds elapsed: send current reading immediately & reset candidate
          lastSubmittedTimeRef.current = now;
          bestCandidateRef.current = null;
          submitLocationToBackend(currentReading);
        }
      },
      (geoErr) => {
        console.warn('watchPosition error:', geoErr.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000
      }
    );

    // Ticker check every 1000ms: dispatch candidate if 60s boundary reached
    intervalIdRef.current = setInterval(() => {
      const now = Date.now();
      if (lastSubmittedTimeRef.current > 0 && now - lastSubmittedTimeRef.current >= 60000 && bestCandidateRef.current) {
        const candidate = bestCandidateRef.current;
        bestCandidateRef.current = null;
        lastSubmittedTimeRef.current = now;
        submitLocationToBackend(candidate);
      }
    }, 1000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [emergencyId]);

  // Helper to stop all active browser trackers & interval tickers immediately
  const stopAllWatchersAndTimers = () => {
    isTerminatedRef.current = true;
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  };

  // Timer calculation & 60-Second Periodic Emergency Update Dispatcher
  const periodicSeqRef = useRef(0);

  useEffect(() => {
    if (!emergencyId || !emergency?.startedAt) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const startTime = new Date(emergency.startedAt).getTime();

    const calculateElapsedAndDispatchPeriodicUpdate = async () => {
      if (isTerminatedRef.current) return;

      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(diffSecs);

      // Determine expected sequence number (1, 2, 3, 4... max 20)
      const currentSeq = Math.floor(diffSecs / 60);

      if (currentSeq > 0 && currentSeq <= 20 && currentSeq !== periodicSeqRef.current && token) {
        periodicSeqRef.current = currentSeq;

        const currentEm = latestEmergencyRef.current;
        const currentAudioStatus = evidenceRecorderStatusRef.current?.status || 'NOT_RECORDING';

        try {
          const res = await fetch(`http://localhost:5000/api/emergency/${emergencyId}/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              sequenceNumber: currentSeq,
              location: currentEm?.currentLocation || null,
              evidenceSegment: currentSeq,
              evidenceStatus: currentAudioStatus
            })
          });

          const data = await res.json();
          if (res.ok && data.success && data.data && !isTerminatedRef.current) {
            if (onEmergencyUpdatedRef.current) {
              onEmergencyUpdatedRef.current(data.data);
            }
          }
        } catch (updErr) {
          console.warn(`Periodic emergency update #${currentSeq} warning:`, updErr.message);
        }
      }
    };

    calculateElapsedAndDispatchPeriodicUpdate();
    const interval = setInterval(calculateElapsedAndDispatchPeriodicUpdate, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [emergencyId, emergency?.startedAt]);

  const formatElapsed = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}m ${remainder < 10 ? '0' : ''}${remainder}s`;
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-amber-500 text-white';
      case 'low':
      default:
        return 'bg-emerald-500 text-white';
    }
  };

  const handleCancel = async () => {
    if (cancelling || resolving) return;

    if (!confirmCancel) {
      setConfirmCancel(true);
      setTimeout(() => setConfirmCancel(false), 4500);
      return;
    }

    // Immediately stop geolocation watcher & ticker before API call
    stopAllWatchersAndTimers();
    setConfirmCancel(false);
    setCancelling(true);
    setError('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Session expired. Please sign in again.');
      setCancelling(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/emergency/${emergencyId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        // If already cancelled on backend, clear active emergency gracefully without showing error
        if (data.message && data.message.toLowerCase().includes('already cancelled')) {
          if (onEmergencyUpdatedRef.current) {
            onEmergencyUpdatedRef.current(null);
          }
          return;
        }
        throw new Error(data.message || 'Failed to cancel emergency');
      }

      if (data.success) {
        if (onEmergencyUpdatedRef.current) {
          onEmergencyUpdatedRef.current(null);
        }
      }
    } catch (err) {
      setError(err.message || 'Error cancelling emergency');
    } finally {
      setCancelling(false);
    }
  };

  const handleResolve = async () => {
    if (cancelling || resolving) return;

    if (!confirmResolve) {
      setConfirmResolve(true);
      setTimeout(() => setConfirmResolve(false), 4500);
      return;
    }

    // Immediately stop geolocation watcher & ticker before API call
    stopAllWatchersAndTimers();
    setConfirmResolve(false);
    setResolving(true);
    setError('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Session expired. Please sign in again.');
      setResolving(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/emergency/${emergencyId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          resolution: 'User confirmed safe'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.message && data.message.toLowerCase().includes('already resolved')) {
          if (onEmergencyUpdatedRef.current) {
            onEmergencyUpdatedRef.current({ ...(latestEmergencyRef.current || {}), status: 'resolved' });
          }
          return;
        }
        throw new Error(data.message || 'Failed to resolve emergency');
      }

      if (data.success) {
        if (onEmergencyUpdatedRef.current) {
          onEmergencyUpdatedRef.current({ ...(data.data || latestEmergencyRef.current || {}), status: 'resolved' });
        }
      }
    } catch (err) {
      setError(err.message || 'Error resolving emergency');
    } finally {
      setResolving(false);
    }
  };

  if (!emergency) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-red-500 shadow-md p-6 sm:p-8 w-full max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#032257] tracking-tight">
                ACTIVE EMERGENCY
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide ${getRiskColor(emergency.riskLevel)}`}>
                {emergency.riskLevel || 'LOW'} RISK
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Trigger: <span className="font-semibold capitalize">{emergency.triggerType || 'manual'} SOS</span>
            </p>
          </div>
        </div>

        {/* Live Timer */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-[#032257] text-xs font-semibold self-start sm:self-auto">
          <Clock className="w-4 h-4 text-red-500" />
          <span>Active for {formatElapsed(elapsedSeconds)}</span>
        </div>
      </div>

      {error && (
        <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
          {error}
        </div>
      )}

      {/* Phase 5 — PC Live Map Component */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-[#032257] uppercase tracking-wider">
          Real-Time Emergency Location Map
        </h3>
        <LiveMap
          currentLocation={emergency.currentLocation}
          locationHistory={locationHistory}
        />
      </div>

      {/* Phase 9 — Emergency Audio Evidence Recorder */}
      <EvidenceRecorder
        emergencyId={emergency.id || emergency.emergencyId}
        onStatusUpdate={(statusObj) => {
          if (statusObj) {
            evidenceRecorderStatusRef.current = statusObj;
          }
        }}
      />

      {/* Primary Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Initial / Current Location Summary Card */}
        <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#032257]">
            <MapPin className="w-4 h-4 text-[#0270F7]" />
            <span>Latest GPS Coordinates</span>
          </div>
          {emergency.currentLocation && emergency.currentLocation.latitude ? (
            <div>
              <p className="text-xs font-medium text-slate-700">
                Lat: {emergency.currentLocation.latitude.toFixed(4)}, Lon: {emergency.currentLocation.longitude.toFixed(4)}
              </p>
              {emergency.currentLocation.accuracy && (
                <p className="text-[10px] text-[#94A3B8]">
                  Accuracy: ±{Math.round(emergency.currentLocation.accuracy)}m
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#64748B] italic">
              GPS location unavailable (Permission denied or disabled)
            </p>
          )}
        </div>

        {/* Trusted Circle Integration Card */}
        <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#032257]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0270F7]" />
              <span>Trusted Circle Delivery Status</span>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
              {emergency.trustedContactsNotified ? 'Contacts Active' : 'No Active Contacts'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 block">Mobile / Push Channel</span>
              {emergency.trustedContactsNotified ? (
                <span className="text-emerald-700 font-medium">✓ SENT (Delivery: UNKNOWN)</span>
              ) : (
                <span className="text-slate-400 italic">MOBILE_UNAVAILABLE</span>
              )}
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 block">Email Channel</span>
              {emergency.trustedContactsNotified ? (
                <span className="text-emerald-700 font-medium">✓ SENT (Delivery: UNKNOWN)</span>
              ) : (
                <span className="text-slate-400 italic">EMAIL_UNAVAILABLE</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Timeline */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-[#032257] uppercase tracking-wider">
          Emergency Event Timeline
        </h3>
        <div className="bg-[#F8FAFC] rounded-xl p-4 border border-slate-200 max-h-48 overflow-y-auto space-y-2.5">
          {Array.isArray(emergency.timeline) && emergency.timeline.length > 0 ? (
            emergency.timeline.map((item, idx) => (
              <div key={`${item.timestamp || idx}-${item.type || ''}-${idx}`} className="flex items-start gap-2.5 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0270F7] mt-1.5 shrink-0"></span>
                <div className="flex-1">
                  <p className="text-slate-800 font-medium">{item.message}</p>
                  <span className="text-[10px] text-[#94A3B8]">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-[#94A3B8]">No timeline records available</p>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={handleResolve}
          disabled={resolving || cancelling}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
            confirmResolve
              ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
              : 'bg-[#10B981] hover:bg-[#059669] text-white'
          }`}
        >
          {resolving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{confirmResolve ? "Confirm: I'm Safe (Click to Resolve)" : "I'm Safe — Resolve Emergency"}</span>
        </button>

        <button
          onClick={handleCancel}
          disabled={resolving || cancelling}
          className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
            confirmCancel
              ? 'bg-red-600 hover:bg-red-700 text-white border border-red-700 animate-pulse'
              : 'bg-white hover:bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          {cancelling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span>{confirmCancel ? 'Confirm: Cancel Emergency (Click again)' : 'Cancel Emergency'}</span>
        </button>
      </div>
    </div>
  );
}
