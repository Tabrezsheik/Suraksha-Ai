'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, MapPin, Navigation, StopCircle, Loader2, AlertCircle } from 'lucide-react';
import GuardianMiniMap from '@/components/GuardianMiniMap';

const PRESET_DESTINATIONS = [
  { name: 'Home', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Office', latitude: 19.1136, longitude: 72.8697 },
  { name: 'University', latitude: 19.0728, longitude: 72.8826 }
];

export default function GuardianModeWidget({ activeSession, onSessionStarted, onSessionStopped, warningEvent = null }) {
  const [lat, setLat] = useState('19.0760');
  const [lon, setLon] = useState('72.8777');
  const [destName, setDestName] = useState('Home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prefilledRouteData, setPrefilledRouteData] = useState(null);
  const [prolongedStopThresholdSeconds, setProlongedStopThresholdSeconds] = useState(120);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('selectedSafeRoute');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.destination) {
            setLat(parsed.destination.latitude.toString());
            setLon(parsed.destination.longitude.toString());
            setDestName(parsed.destination.name || 'Selected Destination');
          }
          setPrefilledRouteData(parsed);
        } catch (e) {}
      }
    }
  }, []);

  const isDeviation = warningEvent?.type === 'route_deviation';

  const handleStart = async (e) => {
    e.preventDefault();
    setError('');

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      setError('Invalid destination latitude (-90 to 90)');
      return;
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      setError('Invalid destination longitude (-180 to 180)');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Session expired. Please sign in again.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        destination: {
          latitude,
          longitude,
          name: destName || 'Selected Destination'
        },
        prolongedStopThresholdSeconds: Number(prolongedStopThresholdSeconds) || 120
      };

      if (prefilledRouteData) {
        if (prefilledRouteData.origin) payload.origin = prefilledRouteData.origin;
        if (prefilledRouteData.selectedRoute && !prefilledRouteData.selectedRoute.isEstimatedGeometry && Array.isArray(prefilledRouteData.selectedRoute.coordinates) && prefilledRouteData.selectedRoute.coordinates.length >= 2) {
          payload.selectedRoute = prefilledRouteData.selectedRoute;
        }
      }

      const res = await fetch('http://localhost:5000/api/guardian/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to activate Guardian Mode');
      }

      if (data.success && onSessionStarted) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('selectedSafeRoute');
        }
        onSessionStarted(data.data);
      }
    } catch (err) {
      setError(err.message || 'Error starting Guardian Mode');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeSession || !activeSession.sessionId) return;
    setError('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/guardian/${activeSession.sessionId}/stop`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to stop Guardian Mode');
      }

      if (data.success && onSessionStopped) {
        onSessionStopped();
      }
    } catch (err) {
      setError(err.message || 'Error stopping Guardian Mode');
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (preset) => {
    setLat(preset.latitude.toString());
    setLon(preset.longitude.toString());
    setDestName(preset.name);
  };

  // ACTIVE GUARDIAN SESSION VIEW
  if (activeSession) {
    return (
      <div className={`rounded-2xl border-2 p-6 shadow-sm space-y-4 ${
        isDeviation ? 'border-amber-400 bg-amber-50/60' : 'border-emerald-500 bg-emerald-50/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isDeviation ? 'bg-amber-400' : 'bg-emerald-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-4 w-4 ${
                isDeviation ? 'bg-amber-600' : 'bg-emerald-600'
              }`}></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  GUARDIAN MODE ACTIVE
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase text-white ${
                  isDeviation ? 'bg-amber-600' : 'bg-emerald-600'
                }`}>
                  {isDeviation ? 'OFF ROUTE' : 'MONITORING'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Target: <span className="font-semibold">{activeSession.destination?.name || 'Destination'}</span> ({activeSession.destination?.latitude?.toFixed(4)}, {activeSession.destination?.longitude?.toFixed(4)})
              </p>
            </div>
          </div>

          <button
            onClick={handleStop}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4 text-emerald-400" />}
            <span>Stop Guardian Mode</span>
          </button>
        </div>

        {/* Phase 7 — Interactive Guardian Journey Mini-Map */}
        <GuardianMiniMap
          currentLocation={activeSession.lastLocation}
          destination={activeSession.destination}
          isDeviation={isDeviation}
        />
      </div>
    );
  }

  // GUARDIAN MODE START FORM VIEW
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#032257]">
            Guardian Mode Journey Protection
          </h3>
          <p className="text-xs text-slate-500">
            Proactively monitors movement, route deviation, and suspicious stoppage before danger occurs.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preset Buttons */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Quick Destination Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_DESTINATIONS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => selectPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                destName === p.name
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleStart} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Destination Latitude
            </label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 19.0760"
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Destination Longitude
            </label>
            <input
              type="number"
              step="any"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="e.g. 72.8777"
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Prolonged Stop Alert Threshold
          </label>
          <select
            value={prolongedStopThresholdSeconds}
            onChange={(e) => setProlongedStopThresholdSeconds(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-semibold bg-white"
          >
            <option value={60}>1 min (60s)</option>
            <option value={120}>2 min (120s - Default)</option>
            <option value={300}>5 min (300s)</option>
            <option value={600}>10 min (600s)</option>
            <option value={900}>15 min (900s)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          <span>Start Guardian Mode Journey Protection</span>
        </button>
      </form>
    </div>
  );
}
