'use client';

import React, { useState, useEffect } from 'react';
import { Mic, AlertTriangle, ShieldCheck, X, Activity } from 'lucide-react';

export default function VoiceSOSModal({
  isOpen,
  transcript,
  onConfirmSOS,
  onCancelSOS,
  countdownInitial = 5
}) {
  const [countdown, setCountdown] = useState(countdownInitial);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(countdownInitial);
      return;
    }

    setCountdown(countdownInitial);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdownInitial]);

  // Automatic Hands-Free SOS trigger upon countdown completion
  useEffect(() => {
    if (isOpen && countdown === 0) {
      if (onConfirmSOS) onConfirmSOS();
    }
  }, [isOpen, countdown, onConfirmSOS]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white border border-red-200 rounded-3xl p-6 shadow-2xl text-slate-800 space-y-5 relative">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-red-600 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5 animate-pulse text-red-600 shrink-0" />
            <span>Voice Emergency Intent Detected</span>
          </div>
          <button
            type="button"
            onClick={onCancelSOS}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recognized Speech Transcript */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-semibold">
              <Mic className="w-3.5 h-3.5 text-red-500 animate-bounce" />
              Recognized Speech:
            </span>
            <span className="font-mono text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
              DISTRESS PHRASE
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 italic bg-white p-3 rounded-xl border border-slate-200">
            "{transcript || 'Help me, I am in danger'}"
          </p>
        </div>

        {/* Countdown Readout */}
        <div className="text-center space-y-2 py-2">
          <p className="text-xs font-semibold text-slate-600">
            Activating Emergency SOS automatically in:
          </p>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 border-2 border-red-500 text-red-600 font-mono font-black text-3xl animate-pulse shadow-inner">
            {countdown}s
          </div>
          <p className="text-[11px] text-slate-500">
            If this was spoken accidentally, tap <strong>"I'M SAFE"</strong> below.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancelSOS}
            className="w-full py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 border border-emerald-200 transition-all shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>I'M SAFE (CANCEL)</span>
          </button>

          <button
            type="button"
            onClick={onConfirmSOS}
            className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30 animate-pulse"
          >
            <Activity className="w-4 h-4" />
            <span>ACTIVATE NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
}
