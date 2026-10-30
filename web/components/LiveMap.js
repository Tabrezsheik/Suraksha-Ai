'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Signal,
  Radio,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Info
} from 'lucide-react';

export default function LiveMap({ currentLocation, locationHistory = [], className = '' }) {
  const { latitude, longitude, accuracy, timestamp } = currentLocation || {};

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    tileLayer: null,
    overlayLayer: null,
    marker: null,
    accuracyCircle: null,
    trailPolyline: null
  });

  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'satellite' | 'hybrid'
  const [isMapReady, setIsMapReady] = useState(false);

  // Format position readout
  const formattedLat = typeof latitude === 'number' ? latitude.toFixed(4) : null;
  const formattedLon = typeof longitude === 'number' ? longitude.toFixed(4) : null;
  const formattedAccuracy = typeof accuracy === 'number' ? Math.round(accuracy) : null;

  // Format time readout
  const formattedTime = useMemo(() => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date.toLocaleTimeString();
  }, [timestamp]);

  // Determine location freshness (stale if > 75s old)
  const isStale = useMemo(() => {
    if (!timestamp) return false;
    const time = new Date(timestamp).getTime();
    return isNaN(time) ? false : Date.now() - time > 75000;
  }, [timestamp]);

  // Determine accuracy quality indicator
  const isHighConfidence = typeof accuracy === 'number' && accuracy <= 150;

  // Initialize Leaflet Map Instance (SSR safe dynamic import pattern reused from SafeRouteMap)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    import('leaflet').then((leafletModule) => {
      if (!isMounted || !mapContainerRef.current) return;
      const L = leafletModule.default || leafletModule;

      // Fix default Leaflet icon assets
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });

      if (!mapInstanceRef.current) {
        const initialLat = typeof latitude === 'number' ? latitude : 14.6819;
        const initialLon = typeof longitude === 'number' ? longitude : 77.6006;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLon],
          zoom: 16,
          zoomControl: false,
          attributionControl: false
        });

        mapInstanceRef.current = map;
        setIsMapReady(true);

        // Force Leaflet size recalculation after flex layout settles
        setTimeout(() => {
          if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 100);
        setTimeout(() => {
          if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 400);
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Update Tile Layers when mapType or isMapReady changes (reusing SafeRouteMap tile configurations)
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      const map = mapInstanceRef.current;
      if (!map) return;

      // Remove existing tile layer and overlay
      if (layersRef.current.tileLayer) {
        map.removeLayer(layersRef.current.tileLayer);
        layersRef.current.tileLayer = null;
      }
      if (layersRef.current.overlayLayer) {
        map.removeLayer(layersRef.current.overlayLayer);
        layersRef.current.overlayLayer = null;
      }

      if (mapType === 'roadmap') {
        // OpenStreetMap Standard Tiles
        layersRef.current.tileLayer = L.tileLayer(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }
        ).addTo(map);
      } else if (mapType === 'satellite') {
        // Esri ArcGIS World Imagery
        layersRef.current.tileLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye'
          }
        ).addTo(map);
      } else if (mapType === 'hybrid') {
        // Esri ArcGIS World Imagery + Reference Boundaries and Places Overlay
        layersRef.current.tileLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri'
          }
        ).addTo(map);

        layersRef.current.overlayLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution: 'Reference &copy; Esri'
          }
        ).addTo(map);
      }

      // Bring vector overlays to front if present
      if (layersRef.current.trailPolyline) layersRef.current.trailPolyline.bringToFront();
      if (layersRef.current.accuracyCircle) layersRef.current.accuracyCircle.bringToFront();
      if (layersRef.current.marker) layersRef.current.marker.setZIndexOffset(1000);
    });
  }, [mapType, isMapReady]);

  // Update Emergency Marker, Accuracy Circle & Location History Trail on Coordinate Changes
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      const map = mapInstanceRef.current;
      if (!map) return;

      const hasValidCoords = typeof latitude === 'number' && typeof longitude === 'number';

      if (hasValidCoords) {
        const latLng = [latitude, longitude];

        // 1. Re-center map smoothly on current GPS position
        map.panTo(latLng, { animate: true });

        // 2. Emergency Location Red Pulsing Marker
        const emergencyIcon = L.divIcon({
          className: 'suraksha-emergency-marker',
          html: `<div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; background-color: rgba(239, 68, 68, 0.4); border-radius: 9999px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 32px; height: 32px; background-color: #EF4444; border: 2.5px solid #FFFFFF; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#EF4444" stroke-width="1.5">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        if (layersRef.current.marker) {
          layersRef.current.marker.setLatLng(latLng);
          layersRef.current.marker.setIcon(emergencyIcon);
          layersRef.current.marker.setZIndexOffset(1000);
        } else {
          layersRef.current.marker = L.marker(latLng, { icon: emergencyIcon, zIndexOffset: 1000 }).addTo(map);
          layersRef.current.marker.bindPopup(
            '<strong>SURAKSHA AI Live Emergency Tracking</strong><br/>Current GPS Location Active'
          );
        }

        // 3. Accuracy Circle (if real GPS accuracy data is present)
        if (typeof accuracy === 'number' && accuracy > 0) {
          if (layersRef.current.accuracyCircle) {
            layersRef.current.accuracyCircle.setLatLng(latLng);
            layersRef.current.accuracyCircle.setRadius(accuracy);
          } else {
            layersRef.current.accuracyCircle = L.circle(latLng, {
              radius: accuracy,
              color: '#EF4444',
              weight: 1.5,
              fillColor: '#EF4444',
              fillOpacity: 0.12,
              dashArray: '4, 4'
            }).addTo(map);
          }
        } else if (layersRef.current.accuracyCircle) {
          map.removeLayer(layersRef.current.accuracyCircle);
          layersRef.current.accuracyCircle = null;
        }
      }

      // 4. Movement History Polyline Trail
      if (Array.isArray(locationHistory) && locationHistory.length > 0) {
        const trailCoords = locationHistory
          .filter((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
          .map((p) => [p.latitude, p.longitude]);

        if (trailCoords.length > 0) {
          if (layersRef.current.trailPolyline) {
            layersRef.current.trailPolyline.setLatLngs(trailCoords);
          } else {
            layersRef.current.trailPolyline = L.polyline(trailCoords, {
              color: '#0270F7',
              weight: 3,
              opacity: 0.8,
              dashArray: '5, 5'
            }).addTo(map);
          }
        }
      }
    });
  }, [latitude, longitude, accuracy, locationHistory, isMapReady]);

  // Controls Handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleCenterLocation = () => {
    if (mapInstanceRef.current && typeof latitude === 'number' && typeof longitude === 'number') {
      mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
    }
  };

  return (
    <div
      className={`relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden text-white shadow-xl flex flex-col ${className}`}
    >
      {/* Top Header Overlay — Status Badges & Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Side: Live Tracking Badges */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 text-xs font-medium flex items-center gap-2 shadow-md">
            <div
              className={`w-2 h-2 rounded-full ${
                latitude && longitude
                  ? isStale
                    ? 'bg-amber-400'
                    : 'bg-[#EF4444] animate-ping'
                  : 'bg-slate-500'
              }`}
            />
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              {latitude && longitude
                ? isStale
                  ? '● GPS SIGNAL STALE'
                  : '● LIVE GPS TRACKING ACTIVE'
                : 'AWAITING GPS SIGNAL'}
            </span>
          </div>

          {formattedAccuracy && (
            <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shadow-md">
              <Signal
                className={`w-3 h-3 ${isHighConfidence ? 'text-[#10B981]' : 'text-amber-400'}`}
              />
              <span>
                ±{formattedAccuracy}m accuracy{' '}
                {isHighConfidence ? '(High Confidence)' : '(Low Confidence)'}
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Map Controls & Layer Selector */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Layer Selector Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-md">
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                mapType === 'roadmap'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                mapType === 'satellite'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setMapType('hybrid')}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                mapType === 'hybrid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Hybrid
            </button>
          </div>

          {/* Zoom & Re-center Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-md">
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCenterLocation}
              title="Re-center on Current Emergency GPS"
              className="p-1 rounded-lg text-emerald-400 hover:bg-slate-800 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Leaflet Real Tile Map Container */}
      <div className="relative w-full h-72 sm:h-80 bg-[#0F172A] flex-1 z-0">
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '280px' }} />

        {/* Fallback Awaiting GPS overlay if coordinates are missing */}
        {(!latitude || !longitude) && (
          <div className="absolute inset-0 z-[500] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-slate-400 space-y-2 pointer-events-none">
            <Navigation className="w-8 h-8 animate-bounce text-blue-500" />
            <p className="text-xs font-medium">Acquiring current GPS coordinates…</p>
          </div>
        )}
      </div>

      {/* Map Footer Stats Bar */}
      <div className="bg-slate-950/90 backdrop-blur-md px-4 py-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2 z-[1000] relative">
        <div className="flex items-center gap-3 font-mono">
          <div>
            <span className="text-slate-500 mr-1">LAT:</span>
            <span className="font-semibold text-white">{formattedLat || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1">LON:</span>
            <span className="font-semibold text-white">{formattedLon || '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Radio className="w-3.5 h-3.5 text-[#10B981]" />
          <span>{formattedTime ? `Updated at ${formattedTime}` : 'Live location tracking active'}</span>
        </div>
      </div>
    </div>
  );
}

