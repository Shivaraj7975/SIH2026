import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import TerritoryLayer from './TerritoryLayer';
import CurrentLocationMarker from './CurrentLocationMarker';
import { RefreshCw, Plus, Minus, Moon, Sun, Compass, Crosshair } from 'lucide-react';

// Desaturated Carto / OpenFreeMap styles
const LIGHT_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const DARK_MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

export default function MapContainer({
  territoryGeoJson = { type: 'FeatureCollection', features: [] },
  userLocation = null,
  activeTrail = [],
  activeUser = null,
  onCellClick = null,
  onMapLoaded = null,
  initialCenter = [77.5932, 12.9730],
  initialZoom = 17.5,
  isLoading = false,
  error = null,
  onRetry = null,
  className = '',
  followUser: controlledFollowUser,
  onFollowUserChange,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [is3dPitch, setIs3dPitch] = useState(false);
  const [internalFollowUser, setInternalFollowUser] = useState(false);
  const followUser = controlledFollowUser !== undefined ? controlledFollowUser : internalFollowUser;

  const setFollowUser = useCallback(
    (val) => {
      setInternalFollowUser(val);
      if (onFollowUserChange) onFollowUserChange(val);
    },
    [onFollowUserChange]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const validUserLng = userLocation && !isNaN(Number(userLocation.longitude)) ? Number(userLocation.longitude) : null;
      const validUserLat = userLocation && !isNaN(Number(userLocation.latitude)) ? Number(userLocation.latitude) : null;
      const center = (validUserLng !== null && validUserLat !== null)
        ? [validUserLng, validUserLat]
        : (Array.isArray(initialCenter) && !isNaN(Number(initialCenter[0])) && !isNaN(Number(initialCenter[1]))
            ? [Number(initialCenter[0]), Number(initialCenter[1])]
            : [77.5932, 12.9730]);

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: isDarkMode ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
        center: center,
        zoom: initialZoom,
        pitch: is3dPitch ? 45 : 0,
        bearing: -15,
        attributionControl: false,
        antialias: true,
      });

      mapRef.current = map;

      map.on('load', () => {
        setMapInstance(map);
        setMapReady(true);
        if (onMapLoaded) onMapLoaded(map);
      });

      map.on('error', (e) => {
        console.warn('MapLibre internal event:', e);
      });

      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (err) {
      console.error('Failed to initialize MapLibre:', err);
      setMapError(err.message);
    }
  }, []);

  const lastFlownCenterRef = useRef(null);

  // Smooth Fly-To / Ease-To
  useEffect(() => {
    if (!mapInstance || !userLocation) return;
    const lat = Number(userLocation.latitude);
    const lng = Number(userLocation.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const prev = lastFlownCenterRef.current;
    if (!prev || userLocation.forceFly) {
      lastFlownCenterRef.current = [lng, lat];
      try {
        mapInstance.flyTo({
          center: [lng, lat],
          zoom: 17.5,
          pitch: is3dPitch ? 45 : 0,
          essential: true,
          duration: 800,
        });
      } catch (err) {}
      return;
    }

    const dLat = Math.abs(lat - prev[1]);
    const dLng = Math.abs(lng - prev[0]);
    if (dLat > 0.001 || dLng > 0.001) {
      lastFlownCenterRef.current = [lng, lat];
      try {
        mapInstance.flyTo({
          center: [lng, lat],
          zoom: 17.5,
          pitch: is3dPitch ? 45 : 0,
          essential: true,
          duration: 800,
        });
      } catch (err) {}
    } else if (followUser) {
      try {
        mapInstance.easeTo({
          center: [lng, lat],
          duration: 350,
        });
      } catch (err) {}
    }
  }, [mapInstance, userLocation?.latitude, userLocation?.longitude, userLocation?.forceFly, is3dPitch, followUser]);

  const handleToggleDarkMode = useCallback(() => {
    if (!mapInstance) return;
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    mapInstance.setStyle(nextDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE);
  }, [mapInstance, isDarkMode]);

  const handleZoomIn = useCallback(() => {
    if (mapInstance) mapInstance.zoomIn({ duration: 200 });
  }, [mapInstance]);

  const handleZoomOut = useCallback(() => {
    if (mapInstance) mapInstance.zoomOut({ duration: 200 });
  }, [mapInstance]);

  const handleRecenterOnMe = useCallback(() => {
    if (!mapInstance) return;
    setFollowUser(true);
    const lat = userLocation ? Number(userLocation.latitude) : 12.9730;
    const lng = userLocation ? Number(userLocation.longitude) : 77.5932;
    mapInstance.flyTo({
      center: [lng, lat],
      zoom: 17.5,
      pitch: is3dPitch ? 45 : 0,
      duration: 600,
    });
  }, [mapInstance, userLocation, is3dPitch, setFollowUser]);

  const handleResetMap = useCallback(() => {
    if (!mapInstance) return;
    setFollowUser(false);
    mapInstance.flyTo({
      center: initialCenter,
      zoom: initialZoom,
      pitch: is3dPitch ? 45 : 0,
      bearing: -15,
      duration: 700,
    });
  }, [mapInstance, initialCenter, initialZoom, is3dPitch, setFollowUser]);

  const handleToggle3D = useCallback(() => {
    if (!mapInstance) return;
    const nextPitch = is3dPitch ? 0 : 50;
    mapInstance.easeTo({
      pitch: nextPitch,
      duration: 350,
    });
    setIs3dPitch(!is3dPitch);
  }, [mapInstance, is3dPitch]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-100 ${className}`}>
      <div ref={containerRef} className="w-full h-full" />

      {mapReady && mapInstance && (
        <>
          <TerritoryLayer
            map={mapInstance}
            territoryGeoJson={territoryGeoJson}
            activeTrail={activeTrail}
            activeUserId={activeUser?.id}
            onCellClick={onCellClick}
          />
          <CurrentLocationMarker
            map={mapInstance}
            userLocation={userLocation}
            activeUser={activeUser}
            followUser={followUser}
          />
        </>
      )}

      {/* Grouped Vertical Control Cluster on Right Edge (44px buttons, 12px radius, white/90% glass, shadow-md) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2.5 pointer-events-auto">
        {/* Recenter on me (Prominent Crosshair Button) */}
        <button
          type="button"
          onClick={handleRecenterOnMe}
          className="w-11 h-11 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-md flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          title="Recenter on my position"
          aria-label="Recenter map on my location"
        >
          <Crosshair className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Vertical Tool Cluster */}
        <div className="flex flex-col bg-white/90 backdrop-blur-md border border-slate-200 shadow-md rounded-xl overflow-hidden divide-y divide-slate-100">
          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-[#7C3AED] hover:bg-slate-50 transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-[#7C3AED] hover:bg-slate-50 transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Night / Dark Mode */}
          <button
            type="button"
            onClick={handleToggleDarkMode}
            className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-[#7C3AED] hover:bg-slate-50 transition-colors cursor-pointer"
            title={isDarkMode ? 'Switch to Light Map' : 'Switch to Dark Map (Night Mode)'}
            aria-label="Toggle dark map style"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* 3D Perspective */}
          <button
            type="button"
            onClick={handleToggle3D}
            className={`w-11 h-11 flex items-center justify-center text-xs font-sans font-bold transition-colors cursor-pointer ${
              is3dPitch ? 'bg-[#7C3AED] text-white' : 'text-slate-700 hover:text-[#7C3AED] hover:bg-slate-50'
            }`}
            title="Toggle 3D Pitch"
            aria-label="Toggle 3D perspective"
          >
            3D
          </button>

          {/* Reset Camera to North */}
          <button
            type="button"
            onClick={handleResetMap}
            className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-[#7C3AED] hover:bg-slate-50 transition-colors cursor-pointer"
            title="Reset North View"
            aria-label="Reset map orientation to North"
          >
            <Compass className="w-4 h-4 text-slate-700 hover:text-[#7C3AED]" />
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-xs flex items-center justify-center z-30 pointer-events-none">
          <div className="bg-white px-4 py-2 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#7C3AED]" />
            <span>Syncing Tactical Grid...</span>
          </div>
        </div>
      )}
    </div>
  );
}
