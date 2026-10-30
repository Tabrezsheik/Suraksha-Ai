'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, ShieldAlert, Clock, Loader2 } from 'lucide-react';

export default function GuardianCheckInModal({ warningEvent, onCheckInCompleted }) {
  const [countdown, setCountdown] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const eventId = warningEvent?.eventId;
  const anomalyType = warningEvent?.type || 'unusual_activity';

  // 60-second countdown timer
  useEffect(() => {
    if (!eventId) return;

    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-escalates on timeout
          handleCheckIn('get_help');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [eventId]);

  const handleCheckIn = async (status) => {
    if (!eventId || submitting) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      setSubmitting(true);
      setError('');

      const res = await fetch(`http://localhost:5000/api/guardian/${eventId}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Check-in failed');
      }

      if (data.success && onCheckInCompleted) {
        onCheckInCompleted(data.data);
      }
    } catch (err) {
      setError(err.message || 'Error processing check-in');
    } finally {
      setSubmitting(false);
    }
  };

  if (!warningEvent) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A]/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-2xl shadow-2xl border-2 border-[#EF4444] p-6 space-y-5 my-auto animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#EF4444] border border-red-200 shrink-0">
            <AlertTriangle className="h-6 w-6 animate-pulse text-[#EF4444]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1E3A8A] leading-snug">
              ⚠️ Guardian Mode Needs Your Attention
            </h3>
            <p className="text-xs text-[#EF4444] font-bold uppercase tracking-wide mt-0.5">
              {anomalyType === 'route_deviation' ? 'Route deviation detected.' : 'Possible prolonged stop detected.'}
            </p>
          </div>
        </div>

        <p className="text-xs text-[#64748B] leading-relaxed font-medium">
          {warningEvent.message || 'Unusual activity detected during your journey. Please confirm that you\'re safe.'}
        </p>

        {/* Countdown Timer */}
        <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl p-3 border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3A8A]">
            <Clock className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span>Response Timer</span>
          </div>
          <span className="text-base font-black text-[#EF4444] font-mono">
            {countdown}s
          </span>
        </div>

        {error && (
          <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleCheckIn('safe')}
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] active:bg-[#047857] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
            <span>I'M SAFE</span>
          </button>

          <button
            type="button"
            onClick={() => handleCheckIn('get_help')}
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] active:bg-[#B91C1C] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
            <span>NEED HELP</span>
          </button>
        </div>
      </div>
    </div>
  );
}
