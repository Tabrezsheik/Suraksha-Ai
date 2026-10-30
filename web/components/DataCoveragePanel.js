'use client';

import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';


export default function DataCoveragePanel({ dataCoverage, dataSources }) {
  const [expanded, setExpanded] = useState(false);

  const lastUpdated = dataCoverage?.lastUpdated
    ? new Date(dataCoverage.lastUpdated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Unknown';

  const statusStyle = {
    available: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    partial: 'text-amber-700 bg-amber-50 border-amber-200',
    estimated: 'text-blue-700 bg-blue-50 border-blue-200',
    unavailable: 'text-slate-500 bg-slate-50 border-slate-200',
    varies: 'text-indigo-700 bg-indigo-50 border-indigo-200'
  };

  // Dynamically constructed coverage items based on runtime data Coverage from backend
  const coverageItems = [
    {
      label: 'District Crime Data',
      status: dataCoverage?.districtCrimeData?.includes('Available') ? 'partial' : 'unavailable',
      value: dataCoverage?.districtCrimeData || 'District-level official crime data unavailable for this location.',
      icon: dataCoverage?.districtCrimeData?.includes('Available') ? AlertTriangle : XCircle
    },
    {
      label: 'Street-Level Crime',
      status: 'unavailable',
      value: dataCoverage?.streetLevelCrime || 'Unavailable — No public street-level crime API integrated',
      icon: XCircle
    },
    {
      label: 'Recent Local Evidence',
      status: dataCoverage?.recentLocalEvidence?.includes('illustrative') ? 'partial' : 'unavailable',
      value: dataCoverage?.recentLocalEvidence || 'Unavailable',
      icon: dataCoverage?.recentLocalEvidence?.includes('illustrative') ? AlertTriangle : XCircle
    },
    {
      label: 'Police Locations',
      status: 'estimated',
      value: dataCoverage?.policeLocations || 'Estimated via OpenStreetMap cached infrastructure data',
      icon: AlertTriangle
    },
    {
      label: 'Hospital Locations',
      status: 'estimated',
      value: dataCoverage?.hospitalLocations || 'Estimated via OpenStreetMap cached infrastructure data',
      icon: AlertTriangle
    },
    {
      label: 'Live Pedestrian Count',
      status: 'unavailable',
      value: dataCoverage?.livePedestrianCount || 'Unavailable — No real-time pedestrian data source integrated',
      icon: XCircle
    },
    {
      label: 'Route Geometry',
      status: (dataCoverage?.routeGeometry?.includes('OpenRouteService') || dataCoverage?.routeGeometry?.includes('Mapbox') || dataCoverage?.routeGeometry?.includes('ROUTING_PROVIDER_GEOMETRY')) ? 'available' : 'varies',
      value: dataCoverage?.routeGeometry || 'Estimated fallback geometry (not real road path)',
      icon: (dataCoverage?.routeGeometry?.includes('OpenRouteService') || dataCoverage?.routeGeometry?.includes('Mapbox') || dataCoverage?.routeGeometry?.includes('ROUTING_PROVIDER_GEOMETRY')) ? CheckCircle : AlertTriangle
    }
  ];

  return (
    <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden">
      {/* Header Toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F8FAFC] hover:bg-[#EAF3FF] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#2563EB]" />
          <span className="text-xs font-bold text-[#123B73] uppercase tracking-wider">Safety Data Coverage & Sources</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#64748B] font-medium">Last updated: {lastUpdated}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-[#64748B]" /> : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 bg-white space-y-4">
          {/* Data Coverage Grid */}
          <div className="space-y-2">
            {coverageItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-2.5 text-xs">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold shrink-0 ${statusStyle[item.status]}`}>
                    <Icon className="w-2.5 h-2.5" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[#64748B] leading-4 pt-0.5">{item.value}</span>
                </div>
              );
            })}
          </div>

          {/* Data Sources */}
          {dataSources && dataSources.length > 0 && (
            <div className="pt-3 border-t border-[#E2E8F0]">
              <p className="text-[10px] font-bold text-[#123B73] uppercase tracking-wider mb-1.5">Intelligence Sources Used</p>
              <div className="flex flex-wrap gap-1.5">
                {dataSources.map((src, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EAF3FF] text-[#2563EB] border border-[#BFDBFE]">
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* NCRB Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <p className="font-bold mb-0.5">⚠️ NCRB Data Disclaimer</p>
            <p>{dataCoverage?.ncrb_disclaimer || 'NCRB data reflects district-level aggregate historical crime rates. It is NOT live, NOT street-level, and NOT location-specific beyond the district boundary.'}</p>
          </div>

          {/* Master Disclaimer */}
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#64748B]">
            <p className="font-bold text-[#123B73] mb-0.5">Safety Estimate Disclaimer</p>
            <p>{dataCoverage?.estimationDisclaimer || 'This is an evidence-based safety estimate and is NOT a guarantee of real-world safety.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
