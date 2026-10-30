'use client';

import React, { useMemo } from 'react';
import { MapPin, Navigation, Flag, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function GuardianMiniMap({ currentLocation, destination, isDeviation = false, className = '' }) {
  const currentLat = currentLocation?.latitude;
  const currentLon = currentLocation?.longitude;
  const destLat = destination?.latitude;
  const destLon = destination?.longitude;
  const destName = destination?.name || 'Destination';

  // Normalize points on a 100x100 SVG canvas
  const canvasPoints = useMemo(() => {
    if (typeof currentLat !== 'number' || typeof currentLon !== 'number' || typeof destLat !== 'number' || typeof destLon !== 'number') {
      return { start: { x: 30, y: 70 }, end: { x: 70, y: 30 } };
    }

    const minLat = Math.min(currentLat, destLat);
    const maxLat = Math.max(currentLat, destLat);
    const minLon = Math.min(currentLon, destLon);
    const maxLon = Math.max(currentLon, destLon);

    const latRange = maxLat - minLat || 0.005;
    const lonRange = maxLon - minLon || 0.005;

    const startX = 20 + ((currentLon - minLon) / lonRange) * 60;
    const startY = 80 - ((currentLat - minLat) / latRange) * 60;

    const endX = 20 + ((destLon - minLon) / lonRange) * 60;
    const endY = 80 - ((destLat - minLat) / latRange) * 60;

    return {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY }
    };
  }, [currentLat, currentLon, destLat, destLon]);

  const { start, end } = canvasPoints;

  return (
    <div className={`relative bg-slate-900 rounded-xl border border-slate-800 overflow-hidden text-white shadow-md ${className}`}>
      {/* Map Header Status Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/60 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
          <div className={`w-2 h-2 rounded-full ${isDeviation ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
          <span className={`uppercase tracking-wider font-extrabold text-[10px] ${isDeviation ? 'text-amber-300' : 'text-emerald-400'}`}>
            {isDeviation ? '⚠️ ROUTE DEVIATION DETECTED' : '● GUARDIAN JOURNEY PATH'}
          </span>
        </div>

        {isDeviation && (
          <div className="bg-amber-500/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/40 text-[10px] font-extrabold text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>OFF ROUTE (&gt;500m)</span>
          </div>
        )}
      </div>

      {/* SVG Vector Canvas */}
      <div className="relative w-full h-44 bg-[#0F172A] flex items-center justify-center overflow-hidden select-none">
        {/* Dot Matrix Background Pattern */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38BDF8_1px,transparent_1px)] [background-size:16px_16px]" />

        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Journey Path Vector Line */}
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={isDeviation ? '#F59E0B' : '#10B981'}
            strokeWidth={isDeviation ? '2.5' : '2'}
            strokeDasharray={isDeviation ? '4 3' : '6 3'}
            className="opacity-90"
          />

          {/* Current Position Pulsing Halo */}
          <circle
            cx={start.x}
            cy={start.y}
            r="5"
            fill={isDeviation ? '#F59E0B' : '#10B981'}
            fillOpacity="0.25"
            className="animate-ping"
          />
        </svg>

        {/* Current Location Marker */}
        <div
          className="absolute z-10 transition-all duration-500 ease-out transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${start.x}%`, top: `${start.y}%` }}
        >
          <div className="relative flex items-center justify-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 ${
              isDeviation
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-500/40'
                : 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-emerald-500/40'
            }`}>
              <Navigation className="w-4 h-4 fill-current transform rotate-45" />
            </div>
            <span className="absolute -bottom-4 bg-slate-900/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
              YOU
            </span>
          </div>
        </div>

        {/* Destination Marker */}
        <div
          className="absolute z-10 transition-all duration-500 ease-out transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${end.x}%`, top: `${end.y}%` }}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center shadow-lg shadow-cyan-500/40">
              <Flag className="w-4 h-4 fill-current" />
            </div>
            <span className="absolute -bottom-4 bg-slate-900/90 text-cyan-200 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
              {destName}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Readout */}
      <div className="bg-slate-950/80 backdrop-blur-md px-3.5 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300 font-mono">
        <div>
          <span className="text-slate-500 mr-1">TARGET:</span>
          <span className="font-semibold text-cyan-300">{destLat?.toFixed(4) || '—'}, {destLon?.toFixed(4) || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 mr-1">YOU:</span>
          <span className="font-semibold text-emerald-300">{currentLat?.toFixed(4) || '—'}, {currentLon?.toFixed(4) || '—'}</span>
        </div>
      </div>
    </div>
  );
}
