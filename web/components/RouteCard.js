'use client';

import React, { useState } from 'react';
import { ShieldCheck, Zap, CheckCircle2, Check, AlertCircle, Calculator, ChevronDown, ChevronUp, MapPin, Info } from 'lucide-react';

export default function RouteCard({ route, isSelected, onSelect, routeNumber }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showSegments, setShowSegments] = useState(false);

  if (!route) return null;

  const num = routeNumber || (route.routeId?.includes('-') ? parseInt(route.routeId.split('-')[1], 10) + 1 : 1);

  const getRiskBadgeStyle = (level) => {
    switch (level) {
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'moderate':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRiskLevelLabel = (level) => {
    switch (level) {
      case 'low': return 'LOW';
      case 'moderate': return 'MODERATE';
      case 'high': return 'HIGH';
      default: return 'UNKNOWN';
    }
  };

  const getConfidenceBadge = (conf) => {
    switch (conf) {
      case 'HIGH':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getIsolationStyle = (level) => {
    switch (level) {
      case 'HIGH':
        return 'text-red-600 font-bold';
      case 'MODERATE':
        return 'text-amber-600 font-bold';
      default:
        return 'text-emerald-600 font-bold';
    }
  };

  const bd = route.calculationBreakdown || {};
  const dc = route.dataClassifications || {};

  return (
    <div
      onClick={onSelect}
      className={`relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none ${
        isSelected
          ? route.isSafest
            ? 'bg-[#EAF3FF]/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
            : 'bg-[#EAF3FF]/30 border-[#2563EB] shadow-md ring-1 ring-[#2563EB]'
          : 'bg-white border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-[#F8FAFC]'
      }`}
    >
      {/* Top Badges Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Number indicator */}
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
            route.isSafest ? 'bg-[#2563EB] text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {num}
          </span>

          {route.isSafest ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#2563EB] text-white shadow-2xs">
              <ShieldCheck className="w-3 h-3" />
              SURAKSHA RECOMMENDED ★
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#123B73] border border-slate-200">
              ALTERNATIVE OPTION
            </span>
          )}

          {route.isSafest && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-2xs">
              <ShieldCheck className="w-3 h-3" />
              Safest Route
            </span>
          )}

          {route.isFastest && !route.isSafest && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
              <Zap className="w-3 h-3" />
              Faster Route
            </span>
          )}

          {!route.isSafest && !route.isFastest && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs ${
              route.riskLevel === 'high' ? 'bg-red-500' : 'bg-slate-600'
            }`}>
              <Zap className="w-3 h-3" />
              {route.riskLevel === 'high' ? 'Higher Risk Alternative' : 'Alternative Option'}
            </span>
          )}
        </div>

        {/* Selection / Accordion Indicator */}
        <div className="flex items-center gap-1.5">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
            isSelected
              ? 'bg-[#2563EB] border-[#2563EB] text-white'
              : 'border-[#CBD5E1] bg-white'
          }`}>
            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            title="Toggle details"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4 text-[#2563EB]" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Route Title */}
      <h4 className="text-sm sm:text-base font-bold text-[#123B73] mb-1.5 flex items-center gap-2">
        <span>Route {num} — {route.name}</span>
      </h4>

      {/* Primary Metrics Row (Duration • Distance • Risk Score/Level) */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[#64748B] flex-wrap mb-2">
        <span className="font-extrabold text-[#2563EB] flex items-center gap-1">
          <span>⏱ {route.durationMin}</span>
        </span>
        <span className="text-slate-300">•</span>
        <span className="font-medium text-[#0F172A] flex items-center gap-1">
          <span>📍 {route.distanceKm}</span>
        </span>
        <span className="text-slate-300">•</span>
        <span className="font-bold text-[#123B73] flex items-center gap-1">
          <span>🛡 Risk:</span>
          <span className="font-extrabold text-[#0F172A]">{route.riskScore}/100</span>
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getRiskBadgeStyle(route.riskLevel)}`}>
          {getRiskLevelLabel(route.riskLevel)}
        </span>
        <span
          className="text-slate-400 hover:text-[#2563EB] cursor-pointer"
          title="Click to toggle calculation breakdown"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
            setShowBreakdown(true);
          }}
        >
          <Info className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Compact Evidence Summary Row */}
      <div className="flex items-center gap-2 sm:gap-4 text-[11px] text-[#64748B] flex-wrap pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <span className="font-medium">Confidence:</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getConfidenceBadge(route.confidence || 'MEDIUM')}`}>
            {route.confidence || 'MEDIUM'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">👥 Activity:</span>
          <span className="font-bold text-[#123B73]">{route.activityEstimate || 'UNKNOWN'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">📶 Isolation:</span>
          <span className={getIsolationStyle(route.isolationRisk)}>{route.isolationRisk || 'UNKNOWN'}</span>
        </div>
      </div>

      {/* Provenance & Geometry Verification Row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
          !route.isEstimatedGeometry ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          Routing: {route.routeSource === 'OPENROUTESERVICE_API' || !route.isEstimatedGeometry ? 'OpenRouteService' : 'Fallback Engine'}
        </span>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
          !route.isEstimatedGeometry ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          Geometry: {!route.isEstimatedGeometry ? 'Verified road route' : 'Estimated path (unverified)'}
        </span>
      </div>

      {/* Collapsible Secondary Details Section */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#E2E8F0] space-y-3 text-xs" onClick={(e) => e.stopPropagation()}>
          {/* Road Sequence Note */}
          {route.roadSequence && route.roadSequence.length > 0 && (
            <p className="text-[11px] text-[#64748B] font-medium bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
              <span className="font-bold text-[#123B73]">Road Sequence:</span>
              {' '}{route.roadSequence.slice(0, 3).join(' → ')} {route.roadSequence.length > 3 ? '...' : ''}
            </p>
          )}

          {/* Route Risk Explanation / Rationale */}
          {route.riskExplanation && (
            <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#0F172A] italic">
              <span className="font-bold text-[#123B73] not-italic mr-1">Safety Assessment:</span>
              "{route.riskExplanation}"
            </div>
          )}

          {/* Safety Advantages */}
          {route.safetyAdvantages && route.safetyAdvantages.length > 0 && (
            <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-[11px]">
              <div className="text-emerald-800 font-bold mb-1 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                Safety Advantages:
              </div>
              <ul className="space-y-0.5 pl-4 list-disc text-emerald-900">
                {route.safetyAdvantages.map((adv, idx) => (
                  <li key={idx}>{adv}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Considerations */}
          {route.riskFactors && route.riskFactors.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 text-[11px]">
              <div className="text-amber-800 font-bold mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                Risk Considerations:
              </div>
              <ul className="space-y-0.5 pl-4 list-disc text-amber-900">
                {route.riskFactors.map((factor, idx) => (
                  <li key={idx}>{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Segment Details Accordion */}
          {route.segments && route.segments.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowSegments(!showSegments)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors cursor-pointer mr-4"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Segment Details ({route.segments.length})</span>
                {showSegments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSegments && (
                <div className="mt-2 space-y-1.5">
                  {route.segments.map((seg) => (
                    <div key={seg.segmentIndex} className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px]">
                      <div className="flex items-center justify-between font-bold text-[#123B73]">
                        <span>{seg.name} ({seg.distanceKm})</span>
                        <span className={seg.riskLevel === 'high' ? 'text-red-600' : seg.riskLevel === 'moderate' ? 'text-amber-600' : 'text-emerald-600'}>
                          {seg.riskScore}% ({seg.riskLevel})
                        </span>
                      </div>
                      <div className="text-[#64748B] flex justify-between mt-0.5 text-[10px]">
                        <span>Police: {seg.nearbyPolice}</span>
                        <span>Hospital: {seg.nearbyHospital}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calculation Breakdown Accordion */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculation Breakdown</span>
              {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showBreakdown && bd && (
              <div className="mt-2 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#0F172A] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>NCRB District Context (2023): {dc.historicalCrimeContext && <span className={`ml-1 px-1.5 py-0 rounded text-[9px] font-bold ${dc.historicalCrimeContext === 'OFFICIAL DATA' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>[{dc.historicalCrimeContext}]</span>}</span>
                  <span className="font-bold text-slate-700">{bd.historicalCrimeContext === 'UNKNOWN' ? 'UNKNOWN' : `+${bd.historicalCrimeContext} pts`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recent Verified Evidence: {dc.recentCrimeEvidence && <span className={`ml-1 px-1.5 py-0 rounded text-[9px] font-bold ${dc.recentCrimeEvidence === 'UNKNOWN' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>[{dc.recentCrimeEvidence}]</span>}</span>
                  <span className="font-bold text-amber-600">+{bd.recentCrimeEvidence || 0} pts</span>
                </div>
                {(bd.illustrativeContextPoints || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Supplementary Context (Illustrative): {dc.illustrativeContextPoints && <span className="ml-1 px-1.5 py-0 rounded text-[9px] font-bold bg-amber-100 text-amber-700">[{dc.illustrativeContextPoints}]</span>}</span>
                    <span className="font-bold text-amber-500">+{bd.illustrativeContextPoints} pts</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>High-Risk Zone Exposure: {dc.highRiskZoneExposure && dc.highRiskZoneExposure !== 'UNKNOWN' && <span className="ml-1 px-1.5 py-0 rounded text-[9px] font-bold bg-blue-100 text-blue-700">[{dc.highRiskZoneExposure}]</span>}</span>
                  <span className="font-bold text-red-600">+{bd.highRiskZoneExposure || 0} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Medium-Risk Zone Exposure:</span>
                  <span className="font-bold text-amber-600">+{bd.mediumRiskZoneExposure || 0} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Night Isolation Penalty: <span className="ml-1 px-1.5 py-0 rounded text-[9px] font-bold bg-blue-100 text-blue-700">[DERIVED / ESTIMATED]</span></span>
                  <span className="font-bold text-amber-600">+{bd.nightIsolationPenalties || 0} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Low Activity Penalty: <span className="ml-1 px-1.5 py-0 rounded text-[9px] font-bold bg-blue-100 text-blue-700">[DERIVED / ESTIMATED]</span></span>
                  <span className="font-bold text-amber-500">+{bd.lowActivityPenalties || 0} pts</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>OSM Police Credit (capped at -10): <span className="ml-1 px-1.5 py-0 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">[REAL PUBLIC DATA]</span></span>
                  <span className="font-bold">{bd.policeSafetyCredit || 0} pts</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>OSM Hospital Credit (capped at -7): <span className="ml-1 px-1.5 py-0 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">[REAL PUBLIC DATA]</span></span>
                  <span className="font-bold">{bd.hospitalSafetyCredit || 0} pts</span>
                </div>
                {bd.scoreSource === 'floor_applied' && (
                  <div className="flex justify-between text-blue-700">
                    <span>Floor applied (district baseline):</span>
                    <span className="font-bold">{bd.riskFloorApplied} pts</span>
                  </div>
                )}
                <div className="pt-1 border-t border-[#E2E8F0] flex justify-between font-extrabold text-xs text-[#123B73]">
                  <span>Estimated Risk Score:</span>
                  <span>{route.riskScore}/100 ({getRiskLevelLabel(route.riskLevel)})</span>
                </div>
                <div className="text-[10px] text-[#94A3B8] pt-1">
                  Police + hospital credits have a combined hard cap of -17 pts. They cannot remove the district historical baseline.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
