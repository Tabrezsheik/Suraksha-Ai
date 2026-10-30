'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import RouteComparison from '@/components/RouteComparison';
import SafeRouteMap from '@/components/SafeRouteMap';
import GuardianCheckInModal from '@/components/GuardianCheckInModal';
import { useSocket } from '@/hooks/useSocket';
import {
  ShieldCheck,
  MapPin,
  Navigation,
  Compass,
  AlertCircle,
  Loader2,
  Sparkles,
  Sun,
  Moon,
  Sunset,
  UserCheck,
  Radio,
  StopCircle,
  CheckCircle2,
  Activity
} from 'lucide-react';

const PRESETS = [
  {
    name: 'Anantapur Station ➔ GGH Hospital',
    origin: { latitude: 14.6790, longitude: 77.5890, name: 'Anantapur Railway Station' },
    destination: { latitude: 14.6780, longitude: 77.5980, name: 'Government General Hospital Anantapur' }
  },
  {
    name: 'Clock Tower ➔ SK University',
    origin: { latitude: 14.6835, longitude: 77.6012, name: 'Clock Tower Circle Anantapur' },
    destination: { latitude: 14.6400, longitude: 77.6300, name: 'Sri Krishnadevaraya University' }
  },
  {
    name: 'Delhi CP ➔ Noida Sec 18',
    origin: { latitude: 28.6139, longitude: 77.2090, name: 'Connaught Place, Delhi' },
    destination: { latitude: 28.5355, longitude: 77.3910, name: 'Noida Sector 18' }
  }
];

export default function SafeRoutePage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Form State
  const [originName, setOriginName] = useState('Anantapur Railway Station');
  const [originLat, setOriginLat] = useState('14.6790');
  const [originLon, setOriginLon] = useState('77.5890');

  const [destName, setDestName] = useState('Government General Hospital Anantapur');
  const [destLat, setDestLat] = useState('14.6780');
  const [destLon, setDestLon] = useState('77.5980');

  // Travel Context & Profile State
  const [travelContext, setTravelContext] = useState('night'); // 'day', 'evening', 'night'
  const [travellerProfile, setTravellerProfile] = useState('solo_woman'); // 'solo_woman', 'solo_traveller', 'group', 'family'

  // Calculation State
  const [calculating, setCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [routesData, setRoutesData] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  // Guardian Mode Integrated State
  const [activeGuardianSession, setActiveGuardianSession] = useState(null);
  const [isStartingGuardian, setIsStartingGuardian] = useState(false);
  const [warningEvent, setWarningEvent] = useState(null);
  const [guardianSuccessMsg, setGuardianSuccessMsg] = useState('');
  const [prolongedStopThresholdSeconds, setProlongedStopThresholdSeconds] = useState(120);

  const { socket } = useSocket();
  const locationIntervalRef = useRef(null);

  // Auth Guard & Initial Active Guardian Check
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!t) {
      router.push('/login');
    } else {
      setToken(t);
      setLoadingAuth(false);
      fetchActiveGuardianSession(t);
    }
  }, [router]);

  const fetchActiveGuardianSession = async (authToken) => {
    try {
      const res = await fetch('http://localhost:5000/api/guardian/active', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setActiveGuardianSession(data.data);
        if (data.data.prolongedStopThresholdSeconds) {
          setProlongedStopThresholdSeconds(data.data.prolongedStopThresholdSeconds);
        }
      }
    } catch (err) {
      console.warn('Could not check active Guardian session:', err.message);
    }
  };

  // Subscribe to real-time socket events for Guardian warnings
  useEffect(() => {
    if (!socket) return;

    const handleGuardianWarning = (data) => {
      if (data && data.requiresCheckIn) {
        setWarningEvent(data);
      }
    };

    socket.on('guardian_warning', handleGuardianWarning);
    return () => {
      socket.off('guardian_warning', handleGuardianWarning);
    };
  }, [socket]);

  // Periodic location heartbeat when Guardian session is active
  useEffect(() => {
    if (!activeGuardianSession || !token) {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      return;
    }

    const reportHeartbeat = async () => {
      if (!activeGuardianSession?.sessionId) return;
      const curLat = parseFloat(originLat) || 14.6790;
      const curLon = parseFloat(originLon) || 77.5890;

      try {
        await fetch(`http://localhost:5000/api/guardian/${activeGuardianSession.sessionId}/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            latitude: curLat,
            longitude: curLon,
            speed: 0
          })
        });
      } catch (err) {
        console.warn('Guardian location heartbeat failed:', err.message);
      }
    };

    locationIntervalRef.current = setInterval(reportHeartbeat, 15000);
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, [activeGuardianSession, token, originLat, originLon]);

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setOriginLat(pos.coords.latitude.toFixed(6));
          setOriginLon(pos.coords.longitude.toFixed(6));
          setOriginName('My Current Location');
        },
        (err) => {
          setErrorMsg('Could not fetch GPS location: ' + err.message);
        }
      );
    } else {
      setErrorMsg('Geolocation is not supported by your browser');
    }
  };

  const applyPreset = (preset) => {
    setOriginName(preset.origin.name);
    setOriginLat(preset.origin.latitude.toString());
    setOriginLon(preset.origin.longitude.toString());

    setDestName(preset.destination.name);
    setDestLat(preset.destination.latitude.toString());
    setDestLon(preset.destination.longitude.toString());
  };

  const handleSelectRoute = (id) => {
    setSelectedRouteId(id);
  };

  const calculateRoutes = async () => {
    if (calculating) return;
    setErrorMsg('');
    setGuardianSuccessMsg('');
    const oLat = parseFloat(originLat);
    const oLon = parseFloat(originLon);
    const dLat = parseFloat(destLat);
    const dLon = parseFloat(destLon);

    if (isNaN(oLat) || isNaN(oLon) || isNaN(dLat) || isNaN(dLon)) {
      setErrorMsg('Please enter valid numeric latitude and longitude coordinates.');
      return;
    }

    setCalculating(true);
    try {
      const res = await fetch('http://localhost:5000/api/routes/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          origin: { latitude: oLat, longitude: oLon, name: originName },
          destination: { latitude: dLat, longitude: dLon, name: destName },
          travelContext,
          travellerProfile
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setErrorMsg('Route service returned an unexpected response format. Please check the route service connection.');
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setRoutesData(data.data);
        const safest = data.data.routes?.find((r) => r.routeId === data.data.safestRouteId) || data.data.routes?.[0];
        setSelectedRouteId(safest?.routeId);
      } else {
        setErrorMsg(data.error?.message || data.message || 'Failed to calculate safe routes');
      }
    } catch (err) {
      setErrorMsg('Network error while requesting routes: ' + err.message);
    } finally {
      setCalculating(false);
    }
  };

  // Start Guardian Mode directly on Safe Route page
  const handleStartGuardian = async (selectedRoute) => {
    if (isStartingGuardian) return;
    setErrorMsg('');
    setGuardianSuccessMsg('');

    const coords = selectedRoute?.geometry?.coordinates || selectedRoute?.coordinates;
    if (!selectedRoute || selectedRoute.isEstimatedGeometry || !coords || !Array.isArray(coords) || coords.length < 2) {
      setErrorMsg('Guardian Mode unavailable — verified route geometry required.');
      return;
    }

    if (!token) {
      setErrorMsg('Session expired. Please sign in again.');
      return;
    }

    setIsStartingGuardian(true);
    try {
      const payload = {
        origin: {
          latitude: parseFloat(originLat),
          longitude: parseFloat(originLon),
          name: originName || 'Starting Location'
        },
        destination: {
          latitude: parseFloat(destLat),
          longitude: parseFloat(destLon),
          name: destName || 'Selected Destination'
        },
        selectedRoute: {
          routeId: selectedRoute.routeId,
          name: selectedRoute.name,
          isEstimatedGeometry: false,
          coordinates: coords
        },
        prolongedStopThresholdSeconds: Number(prolongedStopThresholdSeconds) || 120
      };

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

      if (data.success) {
        setActiveGuardianSession(data.data);
        setGuardianSuccessMsg(`Guardian Mode successfully activated for "${selectedRoute.name}". Real-time monitoring active.`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error starting Guardian Mode');
    } finally {
      setIsStartingGuardian(false);
    }
  };

  // Stop Guardian Mode
  const handleStopGuardian = async () => {
    if (!activeGuardianSession?.sessionId) return;
    setErrorMsg('');

    try {
      const res = await fetch(`http://localhost:5000/api/guardian/${activeGuardianSession.sessionId}/stop`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to stop Guardian Mode');
      }

      setActiveGuardianSession(null);
      setGuardianSuccessMsg('Guardian Mode safely completed and stopped.');
    } catch (err) {
      setErrorMsg(err.message || 'Error stopping Guardian Mode');
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-[#0F172A] flex flex-col font-sans">
      <Navbar />

      {/* Guardian Check-In Warning Modal */}
      {warningEvent && (
        <GuardianCheckInModal
          warningEvent={warningEvent}
          onCheckInCompleted={(data) => {
            setWarningEvent(null);
            if (data.status === 'escalated' && data.emergencyId) {
              router.push('/dashboard');
            }
          }}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#EAF3FF] text-[#2563EB] border border-[#BFDBFE] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              PHASE 8 — SAFETY INTELLIGENCE ENGINE & GUARDIAN PROTECTION
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123B73] tracking-tight flex items-center gap-3">
              AI Safe Route Optimizer
            </h1>
            <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
              Real-world road-following navigation powered by OpenRouteService, NCRB district crime stats, OpenStreetMap emergency infrastructure, and integrated Guardian Mode protection.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#64748B] font-medium">Demo Presets:</span>
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => applyPreset(preset)}
                className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-[#EAF3FF] border border-[#E2E8F0] text-xs font-semibold text-[#123B73] hover:text-[#2563EB] transition-all shadow-2xs cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Integrated Active Guardian Protection Banner */}
        {activeGuardianSession && (
          <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/70 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="relative flex h-5 w-5 mt-0.5 sm:mt-0 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-600"></span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                    SAFE ROUTE — GUARDIAN MODE ACTIVE
                  </span>
                  <span className="text-xs font-bold text-emerald-800">
                    ● MONITORING JOURNEY
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-emerald-900 font-medium flex-wrap pt-0.5">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Route monitoring active
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Current location tracking
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    500m Route deviation protection
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {Math.round((activeGuardianSession.prolongedStopThresholdSeconds || 120) / 60)}-Min Prolonged-stop detection
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleStopGuardian}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
            >
              <StopCircle className="w-4 h-4 text-emerald-400" />
              <span>End Safe Route / Stop Guardian</span>
            </button>
          </div>
        )}

        {/* Success Feedback */}
        {guardianSuccessMsg && !errorMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{guardianSuccessMsg}</span>
          </div>
        )}

        {/* Input Form & Context Controls */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-5 shadow-xs">
          {/* Origin & Destination Inputs in Horizontal Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Origin Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#123B73] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Origin Location
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Use GPS
                </button>
              </div>
              <input
                type="text"
                value={originName}
                onChange={(e) => setOriginName(e.target.value)}
                placeholder="Origin Name (e.g. Anantapur Railway Station)"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={originLat}
                  onChange={(e) => setOriginLat(e.target.value)}
                  placeholder="Latitude"
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs font-mono text-[#0F172A]"
                />
                <input
                  type="text"
                  value={originLon}
                  onChange={(e) => setOriginLon(e.target.value)}
                  placeholder="Longitude"
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs font-mono text-[#0F172A]"
                />
              </div>
            </div>

            {/* Destination Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#123B73] uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-red-600" />
                Destination Location
              </label>
              <input
                type="text"
                value={destName}
                onChange={(e) => setDestName(e.target.value)}
                placeholder="Destination Name (e.g. GGH Hospital)"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={destLat}
                  onChange={(e) => setDestLat(e.target.value)}
                  placeholder="Latitude"
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs font-mono text-[#0F172A]"
                />
                <input
                  type="text"
                  value={destLon}
                  onChange={(e) => setDestLon(e.target.value)}
                  placeholder="Longitude"
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs font-mono text-[#0F172A]"
                />
              </div>
            </div>
          </div>

          {/* Travel Context & Profile Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
            {/* Travel Context Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#123B73] uppercase tracking-wider flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-[#2563EB]" />
                Travel Time Context
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'day', label: 'Day', icon: Sun },
                  { id: 'evening', label: 'Evening', icon: Sunset },
                  { id: 'night', label: 'Night (22:00+)', icon: Moon }
                ].map((ctx) => {
                  const IconComp = ctx.icon;
                  const active = travelContext === ctx.id;
                  return (
                    <button
                      key={ctx.id}
                      type="button"
                      onClick={() => setTravelContext(ctx.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#BFDBFE]'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                      <span>{ctx.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Traveller Profile Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#123B73] uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#2563EB]" />
                Traveller Profile
              </label>
              <select
                value={travellerProfile}
                onChange={(e) => setTravellerProfile(e.target.value)}
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="solo_woman">Solo Woman (Enhanced Isolation & Emergency Weights)</option>
                <option value="solo_traveller">Solo Traveller (Night Remoteness Focus)</option>
                <option value="group">Group Travel</option>
                <option value="family">Family Travel</option>
              </select>
            </div>

            {/* Prolonged Stop Alert Threshold Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#123B73] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#2563EB]" />
                Prolonged Stop Alert
              </label>
              <select
                id="prolonged-stop-selector"
                value={prolongedStopThresholdSeconds}
                onChange={(e) => setProlongedStopThresholdSeconds(Number(e.target.value))}
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              >
                <option value={60}>1 min (60s)</option>
                <option value={120}>2 min (120s - Default)</option>
                <option value={300}>5 min (300s)</option>
                <option value={600}>10 min (600s)</option>
                <option value={900}>15 min (900s)</option>
              </select>
            </div>
          </div>

          {/* Error Feedback */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Calculate CTA Button */}
          <button
            onClick={calculateRoutes}
            disabled={calculating}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            {calculating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Evaluating Deep Safety Intelligence Engine...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Calculate & Compare Routes ({travelContext.toUpperCase()} / {travellerProfile.replace('_', ' ').toUpperCase()})</span>
              </>
            )}
          </button>
        </div>

        {/* Main Content Grid: Left Column Cards, Right Column Sticky Map */}
        {routesData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column: Route Cards */}
            <div className="lg:col-span-5 space-y-4">
              <RouteComparison
                routesData={routesData}
                selectedRouteId={selectedRouteId}
                onSelectRoute={handleSelectRoute}
                onStartGuardian={handleStartGuardian}
                activeGuardianSession={activeGuardianSession}
                onStopGuardian={handleStopGuardian}
                isStartingGuardian={isStartingGuardian}
              />
            </div>

            {/* Right Column: Map — self-stretch + h-full ensures the map card grows to match the left column height, eliminating the white gap below */}
            <div className="lg:col-span-7 lg:sticky lg:top-6 self-stretch h-full">
              <SafeRouteMap
                origin={routesData.origin}
                destination={routesData.destination}
                routes={routesData.routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={handleSelectRoute}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
