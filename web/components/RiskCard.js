'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

const RISK_CONFIG = {
  low: {
    label: 'Low Risk',
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    progressBg: 'bg-emerald-500',
    icon: ShieldCheck
  },
  medium: {
    label: 'Medium Risk',
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    progressBg: 'bg-amber-500',
    icon: AlertTriangle
  },
  high: {
    label: 'High Risk',
    color: '#F97316',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    progressBg: 'bg-orange-500',
    icon: ShieldAlert
  },
  critical: {
    label: 'Critical Risk',
    color: '#EF4444',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    progressBg: 'bg-rose-600',
    icon: ShieldAlert
  }
};

export default function RiskCard({ score = 30, level = 'low', signals = [] }) {
  const currentLevel = (level || 'low').toLowerCase();
  const config = RISK_CONFIG[currentLevel] || RISK_CONFIG.low;
  const IconComponent = config.icon;

  const validScore = typeof score === 'number' ? Math.min(100, Math.max(0, score)) : 30;

  return (
    <div className={`rounded-2xl border ${config.borderColor} ${config.bgColor} p-5 shadow-sm transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border ${config.borderColor}`}>
            <IconComponent className={`h-5 w-5 ${config.textColor}`} />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI Risk Assessment</h3>
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold ${config.textColor}`}>
                {config.label}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className={`text-2xl font-black tracking-tight ${config.textColor}`}>
            {validScore}
          </span>
          <span className="text-xs font-medium text-slate-400">/100</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
          <div
            className={`h-full ${config.progressBg} transition-all duration-500 ease-out`}
            style={{ width: `${validScore}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
          <span>0 (Safe)</span>
          <span>30</span>
          <span>60</span>
          <span>80</span>
          <span>100 (Critical)</span>
        </div>
      </div>

      {/* Evaluated Signals Breakdown */}
      {Array.isArray(signals) && signals.length > 0 && (
        <div className="mt-4 border-t border-slate-200/60 pt-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            Detected Risk Signals ({signals.length})
          </h4>
          <ul className="mt-2 space-y-1.5">
            {signals.map((sig, idx) => (
              <li key={idx} className="flex items-center justify-between text-xs bg-white/70 px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                <span className="font-medium text-slate-700">
                  {sig.description || sig.type || 'Active signal'}
                </span>
                <span className={`font-semibold ${config.textColor}`}>
                  +{sig.points || 0} pts
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
