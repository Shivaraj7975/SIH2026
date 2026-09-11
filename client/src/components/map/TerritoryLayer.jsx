import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { buildMapPopupHTML } from './TerritoryPopup';
import { getUserColor } from '../../lib/spatial.js';

export default function TerritoryLayer({
  map,
  territoryGeoJson,
  activeTrail = [],
  activeUserId,
  onCellClick,
  showPopup = true,
}) {
  const popupRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const sourceId = 'territory-cells';
    const fillLayerId = 'territory-cells-fill';
    const lineLayerId = 'territory-cells-line';
    const activeTrailSourceId = 'active-workout-trail';
    const activeTrailGlowLayerId = 'active-trail-glow';
    const activeTrailCoreLayerId = 'active-trail-core';
    const activePolygonSourceId = 'active-enclosed-polygon';
    const activeClosureChordSourceId = 'active-closure-chord';

    const safeGeoJson = territoryGeoJson || { type: 'FeatureCollection', features: [] };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: safeGeoJson,
      });

      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['get', 'is_unclaimed'], false],
            'rgba(30, 41, 59, 0.35)',
            ['coalesce', ['get', 'owner_color'], '#00f2fe'],
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'is_unclaimed'], false],
            0.2,
            ['==', ['get', 'owner_id'], activeUserId || ''],
            0.65,
            0.45,
          ],
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'is_unclaimed'], false],
            'rgba(148, 163, 184, 0.4)',
            ['coalesce', ['get', 'owner_color'], '#00f2fe'],
          ],
          'line-width': [
            'case',
            ['==', ['get', 'owner_id'], activeUserId || ''],
            1.0,
            ['boolean', ['get', 'is_unclaimed'], false],
            0.4,
            0.7,
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'is_unclaimed'], false],
            0.5,
            0.9,
          ],
        },
      });

      // Real-time conquest pulse layer
      map.addLayer({
        id: 'territory-cells-pulse',
        type: 'line',
        source: sourceId,
        filter: ['boolean', ['get', 'just_captured'], false],
        paint: {
          'line-color': '#38bdf8',
          'line-width': 1.8,
          'line-blur': 1.5,
          'line-opacity': 0.95,
        },
      });

      // Enclosed shaded polygon source and layer (shaded area inside curve + start-end line)
      if (!map.getSource(activePolygonSourceId)) {
        map.addSource(activePolygonSourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'active-enclosed-fill',
          type: 'fill',
          source: activePolygonSourceId,
          paint: {
            'fill-color': getUserColor(activeUserId) || '#00f2fe',
            'fill-opacity': 0.40,
          },
        });

        map.addLayer({
          id: 'active-enclosed-stroke',
          type: 'line',
          source: activePolygonSourceId,
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2,
            'line-opacity': 0.8,
          },
        });
      }

      // Closure chord line connecting start to end
      if (!map.getSource(activeClosureChordSourceId)) {
        map.addSource(activeClosureChordSourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'active-closure-chord-glow',
          type: 'line',
          source: activeClosureChordSourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#38bdf8',
            'line-width': 6,
            'line-opacity': 0.4,
            'line-blur': 3,
          },
        });

        map.addLayer({
          id: 'active-closure-chord-line',
          type: 'line',
          source: activeClosureChordSourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2.5,
            'line-dasharray': [3, 2],
            'line-opacity': 0.95,
          },
        });
      }

      // Active workout trail line
      if (!map.getSource(activeTrailSourceId)) {
        map.addSource(activeTrailSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: activeTrail.length > 1 ? activeTrail : [],
            },
          },
        });

        map.addLayer({
          id: activeTrailGlowLayerId,
          type: 'line',
          source: activeTrailSourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#00f2fe',
            'line-width': 10,
            'line-opacity': 0.4,
            'line-blur': 6,
          },
        });

        map.addLayer({
          id: activeTrailCoreLayerId,
          type: 'line',
          source: activeTrailSourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': 3.5,
            'line-opacity': 0.95,
          },
        });
      }

      map.on('click', fillLayerId, (e) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const props = feat.properties || {};

        if (onCellClick) {
          onCellClick(props, feat);
        }

        if (showPopup) {
          if (popupRef.current) popupRef.current.remove();

          const html = buildMapPopupHTML(props, activeUserId);
          popupRef.current = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: '320px',
            offset: 15,
          })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
        }
      });

      map.on('mouseenter', fillLayerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', fillLayerId, () => {
        map.getCanvas().style.cursor = '';
      });
    } else {
      try {
        const src = map.getSource(sourceId);
        if (src) {
          src.setData(safeGeoJson);
        }
      } catch (e) {
        console.warn('Notice updating territory-cells source:', e);
      }
    }
  }, [map, territoryGeoJson, activeUserId, onCellClick, showPopup]);

  useEffect(() => {
    if (!map) return;
    try {
      const trailSource = map.getSource('active-workout-trail');
      if (trailSource) {
        trailSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: activeTrail && activeTrail.length > 1 ? activeTrail : [],
          },
        });
      }

      const chordSource = map.getSource('active-closure-chord');
      const polygonSource = map.getSource('active-enclosed-polygon');

      if (activeTrail && activeTrail.length >= 3) {
        const pStart = activeTrail[0];
        const pEnd = activeTrail[activeTrail.length - 1];

        // Draw line from end to start
        if (chordSource) {
          chordSource.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [pEnd, pStart],
            },
          });
        }

        // Shaded polygon inside curve
        if (polygonSource) {
          const ring = [...activeTrail];
          if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
            ring.push(ring[0]);
          }

          let polyFeatures = [];
          if (ring.length >= 4) {
            try {
              const poly = turf.polygon([ring]);
              const unkinked = turf.unkinkPolygon(poly);
              polyFeatures = (unkinked?.features || []).filter((f) => turf.area(f) >= 5);
            } catch (e) {
              try {
                const segments = [];
                for (let i = 0; i < ring.length - 1; i++) {
                  segments.push(turf.lineString([ring[i], ring[i + 1]]));
                }
                const fc = turf.featureCollection(segments);
                const polygonized = turf.polygonize(fc);
                polyFeatures = (polygonized?.features || []).filter((f) => turf.area(f) >= 5);
              } catch (e2) {}
            }
          }

          polygonSource.setData({
            type: 'FeatureCollection',
            features: polyFeatures,
          });
        }
      } else {
        if (chordSource) {
          chordSource.setData({ type: 'FeatureCollection', features: [] });
        }
        if (polygonSource) {
          polygonSource.setData({ type: 'FeatureCollection', features: [] });
        }
      }
    } catch (e) {
      console.warn('Notice updating active trail layers:', e);
    }
  }, [map, activeTrail]);

  return null;
}
