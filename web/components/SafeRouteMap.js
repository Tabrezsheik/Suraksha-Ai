'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  Maximize2,
  Minimize2,
  Shield,
  Activity,
  PlusCircle,
  Info
} from 'lucide-react';

export default function SafeRouteMap({
  origin,
  destination,
  routes = [],
  selectedRouteId,
  onSelectRoute
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    tileLayer: null,
    overlayLayer: null,
    routesGroup: null,
    markersGroup: null
  });

  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'satellite' | 'hybrid'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const wrapperRef = useRef(null);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let L;
    let isMounted = true;

    import('leaflet').then((leafletModule) => {
      if (!isMounted || !mapContainerRef.current) return;
      L = leafletModule.default || leafletModule;

      // Fix default Leaflet icon assets
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });

      if (!mapInstanceRef.current) {
        const initialLat = origin?.latitude || 14.6819;
        const initialLon = origin?.longitude || 77.6006;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLon],
          zoom: 14,
          zoomControl: false,
          attributionControl: false
        });

        const routesGroup = L.featureGroup().addTo(map);
        const markersGroup = L.featureGroup().addTo(map);

        layersRef.current.routesGroup = routesGroup;
        layersRef.current.markersGroup = markersGroup;
        mapInstanceRef.current = map;
        setIsMapReady(true);
        // Force Leaflet to re-measure container after React flex layout settles
        setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 100);
        setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 400);
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

  // Update Basemap Tiles when mapType changes
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
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
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

      // Ensure vector overlays stay on top of tiles
      if (layersRef.current.routesGroup) layersRef.current.routesGroup.bringToFront();
      if (layersRef.current.markersGroup) layersRef.current.markersGroup.bringToFront();
    });
  }, [mapType, isMapReady]);

  // Update Route Vectors and Infrastructure Markers
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      const map = mapInstanceRef.current;
      const routesGroup = layersRef.current.routesGroup;
      const markersGroup = layersRef.current.markersGroup;

      if (!map || !routesGroup || !markersGroup) return;

      routesGroup.clearLayers();
      markersGroup.clearLayers();

      const boundsPoints = [];

      // 1. Render Unselected / Alternative Routes
      routes
        .filter((r) => r.routeId !== selectedRouteId)
        .forEach((r) => {
          const coords = r.geometry?.coordinates || [];
          if (coords.length > 0) {
            const latLngs = coords.map(([lon, lat]) => [lat, lon]);
            latLngs.forEach((pt) => boundsPoints.push(pt));

            const polyline = L.polyline(latLngs, {
              color: '#64748B',
              weight: 4,
              dashArray: '6, 6',
              opacity: 0.75,
              interactive: true
            }).addTo(routesGroup);

            polyline.bindTooltip(
              `<strong>${r.name}</strong><br/>${r.distanceKm} • ${r.durationMin}<br/>Estimated Risk: ${r.riskScore}/100<br/><em>Click to select</em>`,
              { sticky: true, className: 'suraksha-map-tooltip' }
            );

            polyline.on('click', () => {
              if (onSelectRoute) onSelectRoute(r.routeId);
            });
          }
        });

      // 2. Render Selected Route with Risk Segment Styling
      const selectedRouteObj = routes.find((r) => r.routeId === selectedRouteId) || routes[0];

      if (selectedRouteObj) {
        if (selectedRouteObj.segments && selectedRouteObj.segments.length > 0) {
          selectedRouteObj.segments.forEach((seg) => {
            const segCoords = seg.coordinates || [];
            if (segCoords.length > 0) {
              const segLatLngs = segCoords.map(([lon, lat]) => [lat, lon]);
              segLatLngs.forEach((pt) => boundsPoints.push(pt));

              const segColor =
                seg.riskLevel === 'high'
                  ? '#EF4444'
                  : seg.riskLevel === 'moderate'
                  ? '#F59E0B'
                  : '#10B981';

              // Glow underlay / casing
              L.polyline(segLatLngs, {
                color: segColor,
                weight: 10,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(routesGroup);

              // Foreground road polyline
              const fgLine = L.polyline(segLatLngs, {
                color: segColor,
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(routesGroup);

              fgLine.bindTooltip(
                `<strong>${seg.name || 'Route Segment'}</strong><br/>Estimated Risk: ${seg.riskLevel?.toUpperCase()} (${seg.riskScore}/100)<br/>Length: ${seg.lengthMeters}m`,
                { sticky: true, className: 'suraksha-map-tooltip' }
              );
            }
          });
        } else {
          const coords = selectedRouteObj.geometry?.coordinates || [];
          if (coords.length > 0) {
            const latLngs = coords.map(([lon, lat]) => [lat, lon]);
            latLngs.forEach((pt) => boundsPoints.push(pt));

            L.polyline(latLngs, {
              color: '#2563EB',
              weight: 5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(routesGroup);
          }
        }

        // 3. Render Safety Infrastructure Markers
        if (selectedRouteObj.safetyInfrastructureMarkers) {
          selectedRouteObj.safetyInfrastructureMarkers.forEach((marker) => {
            if (marker.type === 'police') {
              const policeIcon = L.divIcon({
                className: 'custom-police-marker',
                html: `<div style="background-color: #2563EB; color: white; border-radius: 9999px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">P</div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
              });
              const m = L.marker([marker.latitude, marker.longitude], { icon: policeIcon }).addTo(markersGroup);
              m.bindPopup(
                `<strong>${marker.name}</strong><br/>Police Facility<br/>${marker.distanceMeters}m from route<br/><span style="color:#2563EB; font-size:10px;">Verified OSM Infrastructure</span>`
              );
            } else if (marker.type === 'hospital') {
              const hospitalIcon = L.divIcon({
                className: 'custom-hospital-marker',
                html: `<div style="background-color: #10B981; color: white; border-radius: 9999px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">+</div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
              });
              const m = L.marker([marker.latitude, marker.longitude], { icon: hospitalIcon }).addTo(markersGroup);
              m.bindPopup(
                `<strong>${marker.name}</strong><br/>Emergency Medical Facility<br/>${marker.distanceMeters}m from route<br/><span style="color:#10B981; font-size:10px;">Verified OSM Infrastructure</span>`
              );
            } else if (marker.type === 'safety_zone') {
              const zoneColor =
                marker.riskLevel === 'high'
                  ? '#EF4444'
                  : marker.riskLevel === 'medium'
                  ? '#F59E0B'
                  : '#94A3B8';

              L.circle([marker.latitude, marker.longitude], {
                radius: marker.radiusMeters || 300,
                color: zoneColor,
                fillColor: zoneColor,
                fillOpacity: 0.12,
                weight: 1.5,
                dashArray: '4, 4'
              }).addTo(markersGroup);
            }
          });
        }
      }

      // 4. Render Origin Beacon (Green)
      if (origin?.latitude && origin?.longitude) {
        boundsPoints.push([origin.latitude, origin.longitude]);
        const originIcon = L.divIcon({
          className: 'custom-origin-beacon',
          html: `<div style="position: relative; width: 26px; height: 26px;">
            <div style="position: absolute; inset: 0; background-color: #10B981; border-radius: 9999px; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; background-color: #10B981; color: white; border-radius: 9999px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">O</div>
          </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        const oMarker = L.marker([origin.latitude, origin.longitude], { icon: originIcon }).addTo(markersGroup);
        oMarker.bindPopup(`<strong>Origin</strong><br/>${origin.name || 'Start Point'}`);
      }

      // 5. Render Destination Beacon (Blue)
      if (destination?.latitude && destination?.longitude) {
        boundsPoints.push([destination.latitude, destination.longitude]);
        const destIcon = L.divIcon({
          className: 'custom-dest-beacon',
          html: `<div style="position: relative; width: 26px; height: 26px;">
            <div style="position: absolute; inset: 0; background-color: #2563EB; border-radius: 9999px; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; background-color: #2563EB; color: white; border-radius: 9999px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">D</div>
          </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        const dMarker = L.marker([destination.latitude, destination.longitude], { icon: destIcon }).addTo(markersGroup);
        dMarker.bindPopup(`<strong>Destination</strong><br/>${destination.name || 'End Point'}`);
      }

      // Fit bounds to show route and markers cleanly
      if (boundsPoints.length > 0) {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [30, 30], maxZoom: 16 });
      }
    });
  }, [routes, selectedRouteId, origin, destination, isMapReady, onSelectRoute]);

  // Handlers for Map Control Buttons
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleResetFit = () => {
    if (!mapInstanceRef.current || !layersRef.current.routesGroup) return;
    const bounds = layersRef.current.routesGroup.getBounds();
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    }
  };

  const handleLocateOrigin = () => {
    if (!mapInstanceRef.current || !origin?.latitude) return;
    mapInstanceRef.current.setView([origin.latitude, origin.longitude], 16, { animate: true });
  };

  const isDarkBase = mapType === 'satellite' || mapType === 'hybrid';

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-sm flex flex-col transition-colors duration-300 ${
        isDarkBase ? 'bg-[#0B132B]' : 'bg-[#F8FAFC]'
      }`}
      style={{ minHeight: '520px' }}
    >
      {/* Top Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
        {/* Layer Switcher Pills */}
        <div className="flex items-center gap-1 p-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-[#E2E8F0] dark:border-slate-700 rounded-xl shadow-md pointer-events-auto">
          <button
            type="button"
            onClick={() => setMapType('roadmap')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              mapType === 'roadmap'
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#1E3A8A] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Roadmap
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              mapType === 'satellite'
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#1E3A8A] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapType('hybrid')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              mapType === 'hybrid'
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#1E3A8A] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Hybrid
          </button>
        </div>

        {/* Viewport Control Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-[#E2E8F0] dark:border-slate-700 rounded-xl shadow-md pointer-events-auto">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 rounded-lg text-[#1E3A8A] dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded-lg text-[#1E3A8A] dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetFit}
            title="Reset / Fit Route"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E3A8A] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLocateOrigin}
            title="Locate Start Position"
            className="p-1.5 rounded-lg text-[#10B981] hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Navigation className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E3A8A] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Leaflet Real Tile Map Container — flex-1 grows to fill the card; explicit height:100% lets Leaflet measure the container correctly */}
      <div className="w-full flex-1 relative z-0" style={{ minHeight: '420px' }}>
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '420px' }} />
      </div>

      {/* Map Legend & Persistent Attribution Footer */}
      <div
        className={`p-3 border-t flex flex-col sm:flex-row items-center justify-between text-xs gap-2 transition-colors z-[1000] relative ${
          isDarkBase
            ? 'bg-slate-900 border-slate-800 text-slate-300'
            : 'bg-white border-[#E2E8F0] text-[#64748B]'
        }`}
      >
        {/* Risk & Marker Legend */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px]">
          <div className="flex items-center gap-1 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
            <span>Low Risk</span>
          </div>
          <div className="flex items-center gap-1 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
            <span>High Risk</span>
          </div>
          <div className="flex items-center gap-1 font-semibold">
            <span className="w-3.5 h-0.5 rounded bg-[#64748B]"></span>
            <span>Alternative</span>
          </div>
          <div className="flex items-center gap-1 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
            <span>Police</span>
          </div>
          <div className="flex items-center gap-1 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
            <span>Hospital</span>
          </div>
        </div>

        {/* Legal & Provenance Attribution */}
        <div className="text-[10px] text-slate-400 font-medium text-right flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>
            {mapType === 'roadmap'
              ? '© OpenStreetMap contributors • OpenRouteService • PostGIS 3.6'
              : 'Tiles © Esri • OpenRouteService • PostGIS 3.6'}
          </span>
        </div>
      </div>
    </div>
  );
}
