import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { buildMapPopupHTML } from './TerritoryPopup';
import { getUserColor, latLngToH3 } from '../../lib/spatial.js';

export default function TerritoryLayer({
  map,
  territoryGeoJson,
  activeTrail = [],
  activeUserId,
  onCellClick,
  showPopup = true,
}) {
  const popupRef = useRef(null);
  const territoryGeoJsonRef = useRef(territoryGeoJson);
  const onCellClickRef = useRef(onCellClick);
  const activeUserIdRef = useRef(activeUserId);
  const showPopupRef = useRef(showPopup);

  useEffect(() => {
    territoryGeoJsonRef.current = territoryGeoJson;
  }, [territoryGeoJson]);

  useEffect(() => {
    onCellClickRef.current = onCellClick;
  }, [onCellClick]);

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  useEffect(() => {
    showPopupRef.current = showPopup;
  }, [showPopup]);

  const initSourcesAndLayers = useCallback(() => {
    if (!map) return;

    const sourceId = 'territory-cells';
    const fillLayerId = 'territory-cells-fill';
    const lineLayerId = 'territory-cells-line';
    const activeTrailSourceId = 'active-workout-trail';
    const activeTrailCasingLayerId = 'active-trail-casing';
    const activeTrailCoreLayerId = 'active-trail-core';
    const activePolygonSourceId = 'active-enclosed-polygon';
    const activeClosureChordSourceId = 'active-closure-chord';

    const safeGeoJson = territoryGeoJsonRef.current || { type: 'FeatureCollection', features: [] };

    // 1. Territory Hex Source & Fill / Stroke Layers
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: safeGeoJson,
      });

      // Fill Layer: My territory #7C3AED (0.40), Rival (0.30), Contested #F59E0B (0.30), Unclaimed (0.06)
      const currentUid = activeUserIdRef.current || 'user-shivaraj';
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['get', 'is_unclaimed'], false],
            'rgba(148, 163, 184, 0.08)',
            ['boolean', ['get', 'is_contested'], false],
            '#F59E0B',
            ['boolean', ['get', 'just_captured'], false],
            '#7C3AED',
            ['==', ['get', 'owner_id'], currentUid],
            '#7C3AED',
            ['coalesce', ['get', 'owner_color'], '#06B6D4'],
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'is_unclaimed'], false],
            0.06,
            ['boolean', ['get', 'just_captured'], false],
            0.45,
            ['==', ['get', 'owner_id'], currentUid],
            0.40,
            0.30,
          ],
        },
      });

      // Line / Stroke Layer: My territory (2.5px #5B21B6), Rival (1.5px), Contested (1.5px #F59E0B), Unclaimed (0.5px #CBD5E1)
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        minzoom: 12,
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'is_unclaimed'], false],
            '#CBD5E1',
            ['boolean', ['get', 'is_contested'], false],
            '#F59E0B',
            ['boolean', ['get', 'just_captured'], false],
            '#5B21B6',
            ['==', ['get', 'owner_id'], currentUid],
            '#5B21B6',
            ['coalesce', ['get', 'owner_color'], '#06B6D4'],
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'just_captured'], false],
            3.0,
            ['==', ['get', 'owner_id'], currentUid],
            2.5,
            ['boolean', ['get', 'is_unclaimed'], false],
            0.5,
            1.5,
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'is_unclaimed'], false],
            0.30,
            0.95,
          ],
        },
      });

      // Conquest pulse layer for freshly captured cells
      map.addLayer({
        id: 'territory-cells-pulse',
        type: 'line',
        source: sourceId,
        filter: ['boolean', ['get', 'just_captured'], false],
        paint: {
          'line-color': '#A3E635',
          'line-width': 3,
          'line-opacity': 0.95,
        },
      });
    }

    // 2. Enclosed shaded polygon source and layer (interior flood fill on loop closure)
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
          'fill-color': '#7C3AED',
          'fill-opacity': 0.45,
        },
      });

      map.addLayer({
        id: 'active-enclosed-stroke',
        type: 'line',
        source: activePolygonSourceId,
        paint: {
          'line-color': '#5B21B6',
          'line-width': 2.5,
          'line-opacity': 0.95,
        },
      });
    }

    // 3. Closure chord connecting start to current point
    if (!map.getSource(activeClosureChordSourceId)) {
      map.addSource(activeClosureChordSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'active-closure-chord-line',
        type: 'line',
        source: activeClosureChordSourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#A3E635',
          'line-width': 3,
          'line-dasharray': [3, 2],
          'line-opacity': 0.95,
        },
      });
    }

    // 4. Live Path: 5px line in #A3E635 (lime) with 2px #0F172A casing (total 9px casing)
    if (!map.getSource(activeTrailSourceId)) {
      map.addSource(activeTrailSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: activeTrail && activeTrail.length > 1 ? activeTrail : [],
          },
        },
      });

      // Dark casing (2px on each side of 5px core = 9px total)
      map.addLayer({
        id: activeTrailCasingLayerId,
        type: 'line',
        source: activeTrailSourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#0F172A',
          'line-width': 9,
          'line-opacity': 0.95,
        },
      });

      // Lime core line (5px)
      map.addLayer({
        id: activeTrailCoreLayerId,
        type: 'line',
        source: activeTrailSourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#A3E635',
          'line-width': 5,
          'line-opacity': 1.0,
        },
      });
    }
  }, [map, activeTrail]);

  // Initialize sources and layers on map load or style change
  useEffect(() => {
    if (!map) return;

    if (map.isStyleLoaded()) {
      initSourcesAndLayers();
    }

    const handleStyleLoad = () => {
      initSourcesAndLayers();
    };

    map.on('style.load', handleStyleLoad);
    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [map, initSourcesAndLayers]);

  // Click & hover event handlers
  useEffect(() => {
    if (!map) return;

    const fillLayerId = 'territory-cells-fill';
    const lineLayerId = 'territory-cells-line';

    const clickHandler = (e) => {
      let feature = null;
      let props = null;

      // 1. Query rendered features from fill and line layers
      try {
        if (map.getLayer(fillLayerId) || map.getLayer(lineLayerId)) {
          const checkLayers = [fillLayerId, lineLayerId].filter((id) => map.getLayer(id));
          const rendered = map.queryRenderedFeatures(e.point, { layers: checkLayers });
          if (rendered && rendered.length > 0) {
            feature = rendered[0];
            props = { ...feature.properties };
          }
        }
      } catch (err) {
        console.warn('Error querying rendered features:', err);
      }

      // 2. Fallback to H3 calculation at clicked coordinate ONLY if a matching feature exists in territoryGeoJson
      const cellId = latLngToH3(e.lngLat.lat, e.lngLat.lng, 14);
      if (cellId && !props) {
        const currentGeo = territoryGeoJsonRef.current;
        const match = currentGeo?.features?.find(
          (f) => f.id === cellId || f.properties?.cell_id === cellId
        );
        if (match) {
          feature = match;
          props = { ...match.properties };
        }
      }

      if (props) {
        // Ensure cell_id is present
        if (!props.cell_id && cellId) {
          props.cell_id = cellId;
        }

        // Calculate owner's total hexes and area across the tactical grid
        const allFeatures = territoryGeoJsonRef.current?.features || [];
        let ownerHexCount = 1;
        if (props.owner_id) {
          const matching = allFeatures.filter((f) => f.properties?.owner_id === props.owner_id);
          ownerHexCount = matching.length > 0 ? matching.length : 1;
        }
        props.owner_total_hexes = ownerHexCount;
        props.owner_total_area_m2 = ownerHexCount * 10;
        props.owner_total_area_km2 = (ownerHexCount * 0.000010).toFixed(4);

        if (onCellClickRef.current) {
          onCellClickRef.current(props, feature);
        }

        if (showPopupRef.current) {
          if (popupRef.current) {
            popupRef.current.remove();
          }

          const html = buildMapPopupHTML(props, activeUserIdRef.current);
          popupRef.current = new maplibregl.Popup({
            offset: 14,
            closeButton: true,
            closeOnClick: true,
            maxWidth: '320px',
            className: 'custom-tactical-popup',
          })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
        }
      } else {
        // Clicked outside any hexagon on empty map area: do nothing & remove open popup
        if (popupRef.current) {
          popupRef.current.remove();
        }
      }
    };

    const mouseMoveHandler = (e) => {
      try {
        if (map.getLayer(fillLayerId)) {
          const rendered = map.queryRenderedFeatures(e.point, { layers: [fillLayerId] });
          map.getCanvas().style.cursor = rendered && rendered.length > 0 ? 'pointer' : '';
        }
      } catch (err) {
        // ignore
      }
    };

    map.on('click', clickHandler);
    map.on('mousemove', mouseMoveHandler);

    return () => {
      map.off('click', clickHandler);
      map.off('mousemove', mouseMoveHandler);

      if (popupRef.current) {
        popupRef.current.remove();
      }
    };
  }, [map]);

  // Update territory hex data when territoryGeoJson changes
  useEffect(() => {
    if (!map || !map.getSource('territory-cells')) return;
    const source = map.getSource('territory-cells');
    const safeGeoJson = territoryGeoJson || { type: 'FeatureCollection', features: [] };
    source.setData(safeGeoJson);
  }, [map, territoryGeoJson]);

  // Dynamically update layer paint properties whenever activeUserId changes
  useEffect(() => {
    if (!map) return;
    const uid = activeUserId || 'user-shivaraj';

    if (map.getLayer('territory-cells-fill')) {
      map.setPaintProperty('territory-cells-fill', 'fill-color', [
        'case',
        ['boolean', ['get', 'is_unclaimed'], false],
        'rgba(148, 163, 184, 0.08)',
        ['boolean', ['get', 'is_contested'], false],
        '#F59E0B',
        ['boolean', ['get', 'just_captured'], false],
        '#7C3AED',
        ['==', ['get', 'owner_id'], uid],
        '#7C3AED',
        ['coalesce', ['get', 'owner_color'], '#06B6D4'],
      ]);

      map.setPaintProperty('territory-cells-fill', 'fill-opacity', [
        'case',
        ['boolean', ['get', 'is_unclaimed'], false],
        0.06,
        ['boolean', ['get', 'just_captured'], false],
        0.45,
        ['==', ['get', 'owner_id'], uid],
        0.40,
        0.30,
      ]);
    }

    if (map.getLayer('territory-cells-line')) {
      map.setPaintProperty('territory-cells-line', 'line-color', [
        'case',
        ['boolean', ['get', 'is_unclaimed'], false],
        '#CBD5E1',
        ['boolean', ['get', 'is_contested'], false],
        '#F59E0B',
        ['boolean', ['get', 'just_captured'], false],
        '#5B21B6',
        ['==', ['get', 'owner_id'], uid],
        '#5B21B6',
        ['coalesce', ['get', 'owner_color'], '#06B6D4'],
      ]);

      map.setPaintProperty('territory-cells-line', 'line-width', [
        'case',
        ['boolean', ['get', 'just_captured'], false],
        3.0,
        ['==', ['get', 'owner_id'], uid],
        2.5,
        ['boolean', ['get', 'is_unclaimed'], false],
        0.5,
        1.5,
      ]);
    }
  }, [map, activeUserId]);

  // Update live active workout trail
  useEffect(() => {
    if (!map || !map.getSource('active-workout-trail')) return;
    const source = map.getSource('active-workout-trail');
    const coords = activeTrail && activeTrail.length > 1 ? activeTrail : [];

    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    });

    // Detect loop closures and update shaded interior polygon
    if (map.getSource('active-enclosed-polygon') && map.getSource('active-closure-chord')) {
      const polySource = map.getSource('active-enclosed-polygon');
      const chordSource = map.getSource('active-closure-chord');

      if (coords.length >= 4) {
        try {
          const first = coords[0];
          const last = coords[coords.length - 1];
          const fromPt = turf.point(first);
          const toPt = turf.point(last);
          const distanceMeters = turf.distance(fromPt, toPt, { units: 'meters' });

          chordSource.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [last, first],
            },
          });

          if (distanceMeters <= 50) {
            const closedCoords = [...coords, first];
            polySource.setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [closedCoords],
              },
            });
          } else {
            polySource.setData({ type: 'FeatureCollection', features: [] });
          }
        } catch (e) {
          polySource.setData({ type: 'FeatureCollection', features: [] });
          chordSource.setData({ type: 'FeatureCollection', features: [] });
        }
      } else {
        polySource.setData({ type: 'FeatureCollection', features: [] });
        chordSource.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [map, activeTrail]);

  return null;
}
