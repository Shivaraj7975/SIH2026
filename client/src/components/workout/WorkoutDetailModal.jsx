import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import Modal from '../ui/Modal.jsx';
import { Shield, MapPin, Clock, Gauge, Flame, Sparkles, X, Layers, Calendar } from 'lucide-react';
import {
  h3ToGeoJsonFeature,
  getUserColor,
  H3_CELL_AREA_KM2,
  calculateDistanceMeters,
  extractEnclosedTerritoryGeometry,
} from '../../lib/spatial.js';

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

function formatArea(areaKm2) {
  const km2 = Number(areaKm2) || 0;
  const m2 = km2 * 1000000;
  if (m2 >= 100000) {
    return { val: km2.toFixed(3), unit: 'km²' };
  }
  if (m2 >= 1000) {
    return { val: Math.round(m2).toLocaleString(), unit: 'm²' };
  }
  return { val: Math.round(m2).toString(), unit: 'm²' };
}

function formatDuration(seconds) {
  const safeSecs = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(safeSecs / 60);
  const s = safeSecs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function WorkoutDetailModal({
  isOpen,
  onClose,
  activity,
  activeUserId,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !activity || !mapContainerRef.current) return;

    let coords = [];
    if (activity.routeGeometry && activity.routeGeometry.coordinates) {
      coords = activity.routeGeometry.coordinates;
    } else if (activity.route_geometry && activity.route_geometry.coordinates) {
      coords = activity.route_geometry.coordinates;
    } else if (typeof activity.route_geometry === 'string') {
      try {
        coords = JSON.parse(activity.route_geometry).coordinates || [];
      } catch (e) {}
    } else if (typeof activity.routeGeometry === 'string') {
      try {
        coords = JSON.parse(activity.routeGeometry).coordinates || [];
      } catch (e) {}
    }

    const initialCenter = coords.length > 0 ? coords[0] : [77.5946, 12.9716];

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: DARK_MAP_STYLE,
        center: initialCenter,
        zoom: 15.5,
        pitch: 35,
        bearing: -15,
        antialias: true,
      });

      mapInstanceRef.current = map;

      map.on('load', () => {
        // Enclose all cells within the curve + start-end chord
        const autoEnclosed = coords.length >= 3 ? extractEnclosedTerritoryGeometry(coords, { autoCloseStartEnd: true }) : null;
        let cellIds = Array.isArray(activity.cells) ? [...activity.cells] : [];
        if (autoEnclosed?.allCells && autoEnclosed.allCells.length > 0) {
          const set = new Set(cellIds);
          for (const h of autoEnclosed.allCells) {
            set.add(h);
          }
          cellIds = Array.from(set);
        }

        const hexFeatures = cellIds
          .map((id) =>
            h3ToGeoJsonFeature(id, {
              cell_id: id,
              owner_color: getUserColor(activity.userId || activeUserId),
              is_unclaimed: false,
            })
          )
          .filter(Boolean);

        const hexGeoJson = {
          type: 'FeatureCollection',
          features: hexFeatures,
        };

        // Continuous shaded territory polygon (shaded area inside curve + start-end chord)
        if (autoEnclosed?.polygonGeoJson?.features?.length > 0) {
          map.addSource('workout-polygon', {
            type: 'geojson',
            data: autoEnclosed.polygonGeoJson,
          });

          map.addLayer({
            id: 'workout-polygon-fill',
            type: 'fill',
            source: 'workout-polygon',
            paint: {
              'fill-color': getUserColor(activity.userId || activeUserId) || '#00f2fe',
              'fill-opacity': 0.45,
            },
          });

          map.addLayer({
            id: 'workout-polygon-line',
            type: 'line',
            source: 'workout-polygon',
            paint: {
              'line-color': '#38bdf8',
              'line-width': 2,
              'line-opacity': 0.8,
            },
          });
        }

        // Territory Cells fill and line layers (if any)
        if (hexFeatures.length > 0) {
          map.addSource('workout-cells', {
            type: 'geojson',
            data: hexGeoJson,
          });

          map.addLayer({
            id: 'workout-cells-fill',
            type: 'fill',
            source: 'workout-cells',
            paint: {
              'fill-color': ['coalesce', ['get', 'owner_color'], '#00f2fe'],
              'fill-opacity': 0.55,
            },
          });

          map.addLayer({
            id: 'workout-cells-line',
            type: 'line',
            source: 'workout-cells',
            paint: {
              'line-color': ['coalesce', ['get', 'owner_color'], '#00f2fe'],
              'line-width': 0.8,
              'line-opacity': 0.85,
            },
          });
        }

        // Add Route LineString path
        if (coords.length > 1) {
          map.addSource('workout-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coords,
              },
            },
          });

          map.addLayer({
            id: 'workout-route-glow',
            type: 'line',
            source: 'workout-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#00f2fe',
              'line-width': 8,
              'line-opacity': 0.5,
              'line-blur': 4,
            },
          });

          map.addLayer({
            id: 'workout-route-core',
            type: 'line',
            source: 'workout-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#ffffff',
              'line-width': 3,
              'line-opacity': 0.95,
            },
          });

          // Draw closing line connecting start to end to enclose the curve
          if (coords.length >= 3) {
            const pStart = coords[0];
            const pEnd = coords[coords.length - 1];
            const chordDist = calculateDistanceMeters(pStart[1], pStart[0], pEnd[1], pEnd[0]);

            if (chordDist > 0.5) {
              map.addSource('workout-closure-chord', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [pEnd, pStart],
                  },
                },
              });

              map.addLayer({
                id: 'workout-closure-glow',
                type: 'line',
                source: 'workout-closure-chord',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                  'line-color': '#38bdf8',
                  'line-width': 7,
                  'line-opacity': 0.45,
                  'line-blur': 3,
                },
              });

              map.addLayer({
                id: 'workout-closure-core',
                type: 'line',
                source: 'workout-closure-chord',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                  'line-color': '#38bdf8',
                  'line-width': 2.5,
                  'line-dasharray': [3, 2],
                  'line-opacity': 0.95,
                },
              });
            }
          }

          // Fit map bounds to cover entire workout path
          const bounds = new maplibregl.LngLatBounds();
          for (const c of coords) {
            bounds.extend(c);
          }
          map.fitBounds(bounds, {
            padding: 45,
            maxZoom: 17.5,
            duration: 800,
          });
          setTimeout(() => {
            try { map.resize(); } catch(e) {}
          }, 250);
        }
      });

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.error('Failed to initialize workout map inspector:', err);
    }
  }, [isOpen, activity, activeUserId]);

  if (!activity) return null;

  let coords = [];
  if (activity.routeGeometry && activity.routeGeometry.coordinates) {
    coords = activity.routeGeometry.coordinates;
  } else if (activity.route_geometry && activity.route_geometry.coordinates) {
    coords = activity.route_geometry.coordinates;
  } else if (typeof activity.route_geometry === 'string') {
    try {
      coords = JSON.parse(activity.route_geometry).coordinates || [];
    } catch (e) {}
  } else if (typeof activity.routeGeometry === 'string') {
    try {
      coords = JSON.parse(activity.routeGeometry).coordinates || [];
    } catch (e) {}
  }

  const autoEnclosed = coords.length >= 3 ? extractEnclosedTerritoryGeometry(coords, { autoCloseStartEnd: true }) : null;
  const distanceKm = activity.distance_km || (activity.distance ? (activity.distance / 1000).toFixed(2) : '0.00');
  const durationSec = activity.duration || activity.duration_seconds || 0;
  const durationFormatted = formatDuration(durationSec);
  const areaKm2 = Math.max(
    Number(activity.areaCovered || activity.area_covered || 0),
    Number(autoEnclosed?.totalAreaKm2 || 0)
  );
  const areaDisplay = formatArea(areaKm2);
  const cellsCount = Math.max(
    activity.unique_cells_count || (activity.cells ? activity.cells.length : 0),
    autoEnclosed?.allCells?.length || 0
  );
  const pace = activity.avg_pace_min_km || (Number(distanceKm) > 0 ? ((durationSec / 60) / Number(distanceKm)).toFixed(1) : '--:--');
  const calories = activity.calories || Math.round(Number(distanceKm) * 65);
  const dateStr = new Date(activity.startedAt || activity.started_at || activity.createdAt || Date.now()).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = new Date(activity.startedAt || activity.started_at || activity.createdAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏃</span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {distanceKm} km {activity.type === 'WALK' ? 'Outdoor Walk' : 'Outdoor Run'}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                HISTORICAL RECORD
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{dateStr} at {timeStr}</span>
            </p>
          </div>
        </div>

        {/* 5-Stat Tactical Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
              <MapPin className="w-3 h-3 text-purple-600" />
              <span>Distance</span>
            </div>
            <div className="text-base sm:text-lg font-black text-purple-700 mt-0.5">
              {distanceKm} <span className="text-[10px] font-normal text-slate-500">km</span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-700" />
              <span>Duration</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {durationFormatted}
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
              <Gauge className="w-3 h-3 text-slate-700" />
              <span>Pace</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {pace} <span className="text-[10px] font-normal text-slate-500">min/km</span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
              <Shield className="w-3 h-3 text-purple-600" />
              <span>Area Captured</span>
            </div>
            <div className="text-base sm:text-lg font-black text-purple-700 mt-0.5">
              {areaDisplay.val} <span className="text-[10px] font-normal text-slate-500">{areaDisplay.unit}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-slate-700" />
              <span>Territory Cells</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {cellsCount} <span className="text-[10px] font-normal text-slate-500">cells</span>
            </div>
          </div>
        </div>

        {/* Read-Only Interactive Map Container */}
        <div className="relative w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] text-slate-800 font-mono font-bold flex items-center gap-2 shadow-sm">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Route Linework & Territory Fill</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
