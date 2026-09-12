import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import TerritoryLayer from './TerritoryLayer';
import CurrentLocationMarker from './CurrentLocationMarker';
import MapControls from './MapControls';
import TerritoryPopup from './TerritoryPopup';
import TerritoryLegend from '../ui/TerritoryLegend';
import { AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import Button from '../ui/Button';

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || 'cb1_3416_1_759e95d9268056dd40ffd715';

const DARK_MAP_STYLE = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        `https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`,
        `https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`,
        `https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`,
        `https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`,
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export default function MapContainer({
  territoryGeoJson = { type: 'FeatureCollection', features: [] },
  userLocation = null,
  activeTrail = [],
  activeUser = null,
  onCellClick = null,
  onMapLoaded = null,
  initialCenter = [77.5946, 12.9716],
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
  const [is3dPitch, setIs3dPitch] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
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
            : [77.5946, 12.9716]);

      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
      const mapStyle = mapboxToken && mapboxToken.startsWith('pk.')
        ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${mapboxToken}`
        : DARK_MAP_STYLE;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyle,
        center: center,
        zoom: initialZoom,
        pitch: 45,
        bearing: -17.6,
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

  // Smooth Fly-To on major location shifts (switching cities/circuits or explicit forceFly), smooth easeTo during movement
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
          duration: 1000,
        });
      } catch (err) {}
      return;
    }

    const dLat = Math.abs(lat - prev[1]);
    const dLng = Math.abs(lng - prev[0]);
    // If major jump > ~100m (e.g. city hub switch or simulation circuit jump)
    if (dLat > 0.001 || dLng > 0.001) {
      lastFlownCenterRef.current = [lng, lat];
      try {
        mapInstance.flyTo({
          center: [lng, lat],
          zoom: 17.5,
          pitch: is3dPitch ? 45 : 0,
          essential: true,
          duration: 1000,
        });
      } catch (err) {}
    } else if (followUser) {
      // Smooth incremental tracking during movement
      try {
        mapInstance.easeTo({
          center: [lng, lat],
          duration: 400,
        });
      } catch (err) {}
    }
  }, [mapInstance, userLocation?.latitude, userLocation?.longitude, userLocation?.forceFly, is3dPitch, followUser]);

  const handleLocateMe = useCallback(() => {
    if (!mapInstance) return;
    if (userLocation) {
      lastFlownCenterRef.current = [userLocation.longitude, userLocation.latitude];
      mapInstance.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 18,
        pitch: is3dPitch ? 50 : 0,
        essential: true,
        duration: 1200,
      });
      setFollowUser(true);
    } else {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          lastFlownCenterRef.current = [pos.coords.longitude, pos.coords.latitude];
          mapInstance.flyTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: 18,
            pitch: is3dPitch ? 50 : 0,
            essential: true,
            duration: 1200,
          });
          setFollowUser(true);
        },
        (err) => console.warn('Could not acquire location:', err)
      );
    }
  }, [mapInstance, userLocation, is3dPitch]);

  const handleZoomIn = useCallback(() => {
    if (mapInstance) mapInstance.zoomIn({ duration: 300 });
  }, [mapInstance]);

  const handleZoomOut = useCallback(() => {
    if (mapInstance) mapInstance.zoomOut({ duration: 300 });
  }, [mapInstance]);

  const handleResetMap = useCallback(() => {
    if (!mapInstance) return;
    setFollowUser(false);
    mapInstance.flyTo({
      center: initialCenter,
      zoom: initialZoom,
      pitch: 45,
      bearing: -17.6,
      duration: 1000,
    });
  }, [mapInstance, initialCenter, initialZoom]);

  const handleToggle3D = useCallback(() => {
    if (!mapInstance) return;
    const nextPitch = is3dPitch ? 0 : 55;
    mapInstance.easeTo({
      pitch: nextPitch,
      duration: 600,
    });
    setIs3dPitch(!is3dPitch);
  }, [mapInstance, is3dPitch]);

  const handleCellClick = useCallback(
    (props, feature) => {
      setSelectedCell(props);
      if (onCellClick) onCellClick(props, feature);
    },
    [onCellClick]
  );

  return (
    <div className={`relative w-full h-full min-h-[400px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 ${className}`}>
      <div ref={containerRef} className="w-full h-full" />

      {mapReady && mapInstance && (
        <>
          <TerritoryLayer
            map={mapInstance}
            territoryGeoJson={territoryGeoJson}
            activeTrail={activeTrail}
            activeUserId={activeUser?.id}
            onCellClick={handleCellClick}
            showPopup={true}
          />

          <CurrentLocationMarker
            map={mapInstance}
            userLocation={userLocation}
            activeUser={activeUser}
            followUser={followUser}
          />

          <MapControls
            onLocateMe={handleLocateMe}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetMap={handleResetMap}
            onToggle3D={handleToggle3D}
            is3dActive={is3dPitch}
            onToggleLegend={() => setIsLegendOpen(!isLegendOpen)}
            isLegendOpen={isLegendOpen}
          />

          {isLegendOpen && (
            <div className="absolute top-16 right-4 z-20 animate-in fade-in zoom-in-95 duration-150">
              <TerritoryLegend />
            </div>
          )}

          {selectedCell && (
            <div className="absolute bottom-6 left-6 z-30 max-w-sm">
              <TerritoryPopup
                sector={selectedCell}
                onClose={() => setSelectedCell(null)}
                activeUserId={activeUser?.id}
              />
            </div>
          )}
        </>
      )}

      {isLoading && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-400 font-mono text-xs backdrop-blur-md shadow-xl pointer-events-none animate-in fade-in duration-200">
          <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Syncing Tactical Grid...</span>
        </div>
      )}

      {/* Grid Sync Notice (Non-fatal, doesn't obscure map) */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/95 border border-amber-500/40 text-amber-200 text-xs backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-mono text-[11px] font-bold border border-amber-500/30 transition-all cursor-pointer shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fatal Map Canvas Initialization Error (Only if MapLibre itself fails to initialize) */}
      {mapError && !mapReady && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 rounded-3xl glass-panel border border-rose-500/30 space-y-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 w-12 h-12 rounded-2xl mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Map Engine Initialization Failed</h3>
              <p className="text-xs text-slate-400 mt-1">{mapError}</p>
            </div>
            {onRetry && (
              <Button variant="primary" size="sm" onClick={onRetry} icon={RefreshCw}>
                Retry Map Connection
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
