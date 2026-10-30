'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SOSButton from '@/components/SOSButton';
import ActiveEmergencyView from '@/components/ActiveEmergencyView';
import GuardianCheckInModal from '@/components/GuardianCheckInModal';
import { useSocket } from '@/hooks/useSocket';
import { Users, User, ArrowRight, Shield, LogOut, AlertCircle, Radio, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [resolvedEmergency, setResolvedEmergency] = useState(null);
  const [checkingEmergency, setCheckingEmergency] = useState(true);
  const [activeGuardian, setActiveGuardian] = useState(null);
  const [warningEvent, setWarningEvent] = useState(null);

  const { socket } = useSocket();

  const fetchActiveEmergency = useCallback(async (token) => {
    try {
      setCheckingEmergency(true);
      const res = await fetch('http://localhost:5000/api/emergency/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.data && data.data.status === 'active') {
          setActiveEmergency(data.data);
        } else {
          setActiveEmergency(null);
        }
      } else {
        setActiveEmergency(null);
      }
    } catch (err) {
      console.warn('Could not check active emergency status:', err.message);
    } finally {
      setCheckingEmergency(false);
    }
  }, []);

  const fetchActiveGuardian = useCallback(async (token) => {
    try {
      const res = await fetch('http://localhost:5000/api/guardian/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveGuardian(data.data || null);
      }
    } catch (err) {
      console.warn('Could not check active Guardian session:', err.message);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const userRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (!token) {
      router.replace('/login');
      return;
    }

    if (userRaw) {
      try {
        setAuthUser(JSON.parse(userRaw));
      } catch (_) {}
    }
    setLoading(false);

    fetchActiveEmergency(token);
    fetchActiveGuardian(token);
  }, [router, fetchActiveEmergency, fetchActiveGuardian]);

  // Subscribe to real-time socket events for emergency creation/resolution/cancellation & guardian warnings
  useEffect(() => {
    if (!socket) return;

    const handleEmergencyCreated = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) fetchActiveEmergency(token);
    };

    const handleEmergencyResolved = (data) => {
      setActiveEmergency(null);
      setResolvedEmergency({
        id: data?.emergencyId || null,
        timestamp: new Date()
      });
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) fetchActiveEmergency(token);
    };

    const handleEmergencyCancelled = () => {
      setActiveEmergency(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) fetchActiveEmergency(token);
    };

    const handleGuardianWarning = (data) => {
      if (data && data.requiresCheckIn) {
        setWarningEvent(data);
      }
    };

    socket.on('emergency_created', handleEmergencyCreated);
    socket.on('emergency_resolved', handleEmergencyResolved);
    socket.on('emergency_cancelled', handleEmergencyCancelled);
    socket.on('guardian_warning', handleGuardianWarning);

    return () => {
      socket.off('emergency_created', handleEmergencyCreated);
      socket.off('emergency_resolved', handleEmergencyResolved);
      socket.off('emergency_cancelled', handleEmergencyCancelled);
      socket.off('guardian_warning', handleGuardianWarning);
    };
  }, [socket, fetchActiveEmergency]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (_) {}
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#0270F7]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-[#64748B]">Verifying session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      {/* Phase 7 — Guardian Check-In Warning Modal */}
      {warningEvent && (
        <GuardianCheckInModal
          warningEvent={warningEvent}
          onCheckInCompleted={(data) => {
            setWarningEvent(null);
            if (data.status === 'escalated' && data.emergencyId) {
              const token = localStorage.getItem('token');
              if (token) fetchActiveEmergency(token);
            }
          }}
        />
      )}

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full space-y-10">
        {/* Welcome Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0270F7]/10 text-[#0270F7] text-xs font-semibold mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>{activeEmergency && activeEmergency.status === 'active' ? 'Emergency Active' : 'Protection Active'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#032257] tracking-tight">
            Welcome back{authUser?.name ? `, ${authUser.name.split(' ')[0]}` : ''}.
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {activeEmergency && activeEmergency.status === 'active'
              ? 'An emergency session is currently active. Monitor status and take immediate safety action below.'
              : 'Trigger Silent SOS immediately during danger or manage your safety settings and trusted contacts.'}
          </p>
        </div>

        {/* ACTIVE EMERGENCY VIEW (rendered if an emergency is active) */}
        {activeEmergency && activeEmergency.status === 'active' ? (
          <ActiveEmergencyView
            emergency={activeEmergency}
            onEmergencyUpdated={(updated) => {
              if (!updated || updated.status === 'cancelled') {
                setActiveEmergency(null);
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (token) fetchActiveEmergency(token);
              } else if (updated.status === 'resolved') {
                setActiveEmergency(null);
                setResolvedEmergency({
                  id: updated.id || updated.emergencyId,
                  timestamp: new Date()
                });
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (token) fetchActiveEmergency(token);
              } else if (updated.status === 'active') {
                setActiveEmergency(updated);
              }
            }}
          />
        ) : (
          /* STANDARD DASHBOARD VIEW (rendered when user is safe) */
          <div className="space-y-8">
            {/* Resolved Emergency Success Banner */}
            {resolvedEmergency && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 text-emerald-800 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Emergency Resolved</p>
                    <p className="text-xs text-emerald-700">You confirmed you are safe. Normal protection is now active.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResolvedEmergency(null)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg hover:bg-emerald-100/50 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Silent SOS Core Section */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#EF4444] uppercase tracking-wider bg-red-50 px-3 py-1 rounded-full border border-red-100">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Emergency Core</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#032257]">
                Silent SOS Emergency Trigger
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] max-w-md">
                In case of immediate danger or threat, press the button below. Your initial location will be captured and an emergency event will be registered.
              </p>

              <div className="pt-2">
                <SOSButton
                  onSOSActivated={(emergency) => {
                    setResolvedEmergency(null);
                    if (emergency && emergency.status === 'active') {
                      setActiveEmergency(emergency);
                    }
                  }}
                />
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Trusted Circle Card */}
              <Link
                href="/dashboard/trusted-circle"
                className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-[#0270F7] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#0270F7]/10 flex items-center justify-center text-[#0270F7] mb-4 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-[#032257] group-hover:text-[#0270F7] transition-colors">
                    Trusted Circle
                  </h2>
                  <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                    Add and manage family and close contacts who receive instant emergency alerts and location sharing.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-[#0270F7]">
                  <span>Manage Contacts</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* User Profile Card */}
              <Link
                href="/dashboard/profile"
                className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-[#0270F7] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#0270F7]/10 flex items-center justify-center text-[#0270F7] mb-4 group-hover:scale-105 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-[#032257] group-hover:text-[#0270F7] transition-colors">
                    My Profile
                  </h2>
                  <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                    Configure your account details, phone number, gender, avatar, and emergency preferences securely.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-[#0270F7]">
                  <span>View Profile</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Atlas IP Note — informational backend connection guide */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Backend API Connection</p>
            <p>
              Ensure the Node.js API server is running on <code className="bg-amber-100 px-1 py-0.5 rounded">http://localhost:5000</code> and your current IP address is allowed in MongoDB Atlas Network Access.
            </p>
          </div>
        </div>

        {/* Logout Section */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <p className="text-xs text-[#94A3B8]">
            {authUser?.email ? `Signed in as ${authUser.email}` : 'Authenticated session active'}
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-[#94A3B8]">
        © 2026 SURAKSHA AI — Intelligent Protection Platform
      </footer>
    </div>
  );
}
