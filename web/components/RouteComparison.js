'use client';

import React from 'react';
import RouteCard from './RouteCard';
import DataCoveragePanel from './DataCoveragePanel';
import { ShieldCheck, ArrowRight, Navigation, Sparkles, Database, Info, Moon, Sun, Sunset, UserCheck, CheckCircle } from 'lucide-react';

export default function RouteComparison({
  routesData,
  selectedRouteId,
  onSelectRoute,
  onStartGuardian,
  activeGuardianSession = null,
  onStopGuardian = null,
  isStartingGuardian = false
}) {
  if (!routesData || !routesData.routes || routesData.routes.length === 0) {
    return null;
  }

  const { routes, safestRouteId, safestRouteRecommendation, dataSources, dataCoverage, travelContext, travellerProfile } = routesData;
  const safestRoute = routes.find((r) => r.routeId === safestRouteId);
  const selectedRoute = routes.find((r) => r.routeId === selectedRouteId) || safestRoute || routes[0];

  return (
    <div className="space-y-4">
      {/* Route Options Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[#2563EB] text-sm">▶</span>
          <h3 className="text-base font-extrabold text-[#123B73]">
            Route Options ({routes.length})
          </h3>
        </div>
        <span className="text-xs font-semibold text-[#64748B] bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          Sorted by: Safety (Recommended first)
        </span>
      </div>

      {/* List of Compact Route Cards */}
      <div className="space-y-3">
        {routes.map((route, idx) => (
          <RouteCard
            key={route.routeId}
            route={route}
            routeNumber={idx + 1}
            isSelected={route.routeId === selectedRoute.routeId}
            onSelect={() => onSelectRoute(route.routeId)}
          />
        ))}
      </div>

      {/* Recommendation Explanation Box (Compact) */}
      {safestRouteRecommendation && (
        <div className="bg-[#EAF3FF]/60 border border-[#BFDBFE] rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[#123B73] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              Why SURAKSHA AI selected {safestRoute?.name || 'this route'}:
            </span>
            <span className="text-[10px] font-bold text-[#2563EB] uppercase">
              Confidence: {safestRoute?.confidence || 'MEDIUM'}
            </span>
          </div>

          {safestRouteRecommendation?.whyThisRoute && safestRouteRecommendation.whyThisRoute.length > 0 ? (
            <ul className="space-y-1 text-slate-700">
              {safestRouteRecommendation.whyThisRoute.map((point, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-700 leading-relaxed">
              {safestRouteRecommendation?.recommendationReason ||
                `${safestRoute?.name || 'Recommended route'} offers the lowest estimated safety risk profile.`}
            </p>
          )}

          {safestRouteRecommendation?.disclaimer && (
            <p className="text-[10px] text-[#64748B] italic pt-1 border-t border-[#BFDBFE]/40">
              {safestRouteRecommendation.disclaimer}
            </p>
          )}
        </div>
      )}

      {/* Data Coverage & Provenance Panel */}
      <DataCoveragePanel
        dataCoverage={dataCoverage}
        dataSources={dataSources}
      />

      {/* Safety Methodology Disclaimer Banner */}
      <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#64748B] flex items-start gap-2">
        <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#123B73]">Evidence-Based Safety Estimate: </span>
          Scores are derived from official NCRB 2023 district historical statistics and OpenStreetMap infrastructure.
          Street-level crime records and live pedestrian counts are unavailable.
        </div>
      </div>

      {/* Action Button: Start/End Guardian Journey */}
      <div className="pt-1">
        {activeGuardianSession ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={onStopGuardian}
              className="w-full py-3.5 px-5 rounded-2xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-md flex items-center justify-center gap-2.5 text-sm cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>End Safe Route / Stop Guardian Protection</span>
            </button>
            <p className="text-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-xl">
              ● Guardian Mode Active — Monitoring location, deviation, and stoppage.
            </p>
          </div>
        ) : selectedRoute?.isEstimatedGeometry ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-5 rounded-2xl font-bold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2.5 text-sm"
            >
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>Start Guardian Mode</span>
            </button>
            <p className="text-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 py-2 px-3 rounded-xl">
              Guardian Mode unavailable — verified route geometry required.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onStartGuardian(selectedRoute)}
            disabled={isStartingGuardian}
            className="w-full py-3.5 px-5 rounded-2xl font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2.5 text-sm cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>Start Guardian Mode with {selectedRoute?.isSafest ? 'Safest' : 'Selected'} Route</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
