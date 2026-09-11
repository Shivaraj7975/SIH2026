import * as h3 from 'h3-js';
import * as turf from '@turf/turf';
import { FITNESS_CONFIG } from '../config/fitness.config.js';

// Resolution 14 provides ultra-precise single-lane road & track hexagon coverage (~1.34m edge, ~2.68m diameter, ~0.00000616 km2 area)
export const H3_DEFAULT_RESOLUTION = FITNESS_CONFIG.GEOMETRY.H3_RESOLUTION || 14;

// Area per cell at Res 14 in km² (used for coverage calculations: ~6.16 m²)
export const H3_CELL_AREA_KM2 = FITNESS_CONFIG.GEOMETRY.H3_CELL_AREA_KM2 || 0.00000616;

// Centralized configurable geometric closure tolerance (in meters)
export const CLOSURE_TOLERANCE_METERS = FITNESS_CONFIG.GEOMETRY.PROXIMITY_CLOSURE_TOLERANCE_METERS || 20;

/**
 * Deterministic color assignment based on user ID.
 * Produces a vibrant, saturated HSL color that is consistent for the same user.
 */
export function getUserColor(userId) {
  if (!userId) return '#00f2fe';
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 70 + (Math.abs(hash >> 8) % 20);
  const lightness = 55 + (Math.abs(hash >> 16) % 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Converts latitude and longitude to H3 cell index
 */
export function latLngToH3(lat, lng, resolution = H3_DEFAULT_RESOLUTION) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return null;
  }
  return h3.latLngToCell(lat, lng, resolution);
}

/**
 * Gets geographic center of an H3 cell [lat, lng]
 */
export function getH3Center(cellId) {
  try {
    return h3.cellToLatLng(cellId);
  } catch (err) {
    return [0, 0];
  }
}

/**
 * Gets concentric disk of neighboring H3 cells
 */
export function getNeighborH3Cells(cellId, ringSize = 1) {
  try {
    return h3.gridDisk(cellId, ringSize);
  } catch (err) {
    return [cellId];
  }
}

/**
 * Converts an H3 cell index to a GeoJSON Polygon Feature
 */
export function h3ToGeoJsonFeature(cellId, properties = {}) {
  try {
    const hexStr = typeof cellId === 'string' ? cellId : (cellId?.h3CellId || cellId?.cell_id || cellId?.h3_cell_id);
    if (!hexStr || typeof hexStr !== 'string') return null;

    const boundary = h3.cellToBoundary(hexStr);
    const coordinates = boundary.map(([lat, lng]) => [lng, lat]);
    if (coordinates.length > 0) {
      coordinates.push(coordinates[0]);
    }

    const [centerLat, centerLng] = h3.cellToLatLng(hexStr);

    return {
      type: 'Feature',
      id: hexStr,
      properties: {
        cell_id: hexStr,
        center_lat: centerLat,
        center_lng: centerLng,
        ...properties,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    };
  } catch (error) {
    console.error(`Error converting cell ${cellId} to GeoJSON:`, error);
    return null;
  }
}

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Normalizes input coordinate arrays to standard [[lng, lat], ...]
 */
export function normalizeCoordinates(coords) {
  if (!coords || !Array.isArray(coords)) return [];
  const normalized = [];
  for (const pt of coords) {
    if (!pt) continue;
    let lng, lat;
    if (Array.isArray(pt) && pt.length >= 2) {
      lng = Number(pt[0]);
      lat = Number(pt[1]);
    } else if (typeof pt === 'object') {
      lng = Number(pt.longitude ?? pt.lng ?? pt.lon);
      lat = Number(pt.latitude ?? pt.lat);
    }
    if (!isNaN(lng) && !isNaN(lat) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      if (
        normalized.length === 0 ||
        normalized[normalized.length - 1][0] !== lng ||
        normalized[normalized.length - 1][1] !== lat
      ) {
        normalized.push([lng, lat]);
      }
    }
  }
  return normalized;
}

/**
 * Projects a point P [lng, lat] onto line segment A->B.
 * Returns { point: [lng, lat], distanceMeters: number, t: number }
 */
export function projectPointToSegment(P, A, B) {
  const latMid = ((A[1] + B[1]) / 2) * (Math.PI / 180);
  const cosLat = Math.cos(latMid);

  const dx = (B[0] - A[0]) * cosLat;
  const dy = B[1] - A[1];
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return {
      point: [A[0], A[1]],
      distanceMeters: calculateDistanceMeters(P[1], P[0], A[1], A[0]),
      t: 0,
    };
  }

  const px = (P[0] - A[0]) * cosLat;
  const py = P[1] - A[1];
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));

  const projLng = A[0] + t * (B[0] - A[0]);
  const projLat = A[1] + t * (B[1] - A[1]);
  const dist = calculateDistanceMeters(P[1], P[0], projLat, projLng);

  return {
    point: [projLng, projLat],
    distanceMeters: dist,
    t,
  };
}

/**
 * Dense linear interpolation for continuous perimeter cell coverage.
 * Uses adaptive step size — larger steps for longer segments to avoid
 * generating thousands of H3 lookups on long straight segments.
 */
export function extractCoveredCellsFromPath(coords, resolution = H3_DEFAULT_RESOLUTION) {
  const norm = normalizeCoordinates(coords);
  if (!norm || norm.length === 0) return [];

  const cellSet = new Set();
  // At resolution 14 each cell is ~2.68m diameter. Step at ~2m for solid coverage.
  const stepMeters = resolution >= 13 ? 2.0 : 1.2;

  for (let i = 0; i < norm.length; i++) {
    const [lon, lat] = norm[i];
    const cell = latLngToH3(lat, lon, resolution);
    if (cell) cellSet.add(cell);

    if (i > 0) {
      const [prevLon, prevLat] = norm[i - 1];
      const segmentDist = calculateDistanceMeters(prevLat, prevLon, lat, lon);

      if (segmentDist > stepMeters) {
        const numSteps = Math.min(200, Math.ceil(segmentDist / stepMeters));
        for (let s = 1; s < numSteps; s++) {
          const ratio = s / numSteps;
          const interpLat = prevLat + (lat - prevLat) * ratio;
          const interpLon = prevLon + (lon - prevLon) * ratio;
          const interpCell = latLngToH3(interpLat, interpLon, resolution);
          if (interpCell) cellSet.add(interpCell);
        }
      }
    }
  }

  return Array.from(cellSet);
}

/**
 * Fast 2D line-segment intersection test using cross-product.
 * Returns intersection point [x,y] or null if no proper intersection.
 */
function segmentIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const dABx = bx - ax, dABy = by - ay;
  const dCDx = dx - cx, dCDy = dy - cy;
  const denom = dABx * dCDy - dABy * dCDx;
  if (Math.abs(denom) < 1e-14) return null; // parallel or collinear

  const dACx = cx - ax, dACy = cy - ay;
  const t = (dACx * dCDy - dACy * dCDx) / denom;
  const u = (dACx * dABy - dACy * dABx) / denom;

  // Require proper intersection (not at endpoints for t,u ∈ (ε, 1-ε))
  const EPS = 1e-9;
  if (t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS) {
    return [ax + t * dABx, ay + t * dABy];
  }
  return null;
}

/**
 * Downsample coordinates using Douglas-Peucker-style distance filtering.
 * Keeps first, last, and any point farther than `toleranceMeters` from
 * the straight line between its kept neighbors. Runs in O(n).
 */
function downsampleCoords(coords, toleranceMeters = 3.0) {
  if (coords.length <= 30) return coords;
  const result = [coords[0]];
  let anchor = 0;
  for (let i = 1; i < coords.length - 1; i++) {
    const proj = projectPointToSegment(coords[i], coords[anchor], coords[coords.length - 1]);
    if (proj.distanceMeters > toleranceMeters) {
      result.push(coords[i]);
      anchor = i;
    }
  }
  result.push(coords[coords.length - 1]);
  // Ensure we have enough points
  if (result.length < 4 && coords.length >= 4) return coords;
  return result;
}

/**
 * OPTIMIZED Paper.io-Style Geometry Engine:
 * 
 * Performance-critical design decisions:
 * - Coordinate downsampling reduces n from hundreds to ~30-80 for polygon detection
 * - Single-pass O(n²) self-intersection scan replaces 25-iteration noding loop
 * - Direct polygon ring extraction from intersection points (no turf.lineSplit)
 * - Full-resolution H3 rasterization only on final validated polygons
 * - Perimeter cells computed once and shared
 */
export function extractEnclosedTerritoryGeometry(rawCoords, options = {}) {
  const closureTolerance = options.closureToleranceMeters ?? CLOSURE_TOLERANCE_METERS;
  const minAreaM2 = options.minAreaM2 ?? FITNESS_CONFIG.GEOMETRY.MIN_ENCLOSED_POLYGON_AREA_M2 ?? 5;
  const resolution = options.resolution ?? H3_DEFAULT_RESOLUTION;
  const skipCells = options.skipCells ?? false;

  const coords = normalizeCoordinates(rawCoords);
  if (coords.length < 3) {
    const perim = skipCells ? [] : extractCoveredCellsFromPath(coords, resolution);
    return {
      perimeterCells: perim,
      interiorCells: [],
      allCells: perim,
      polygons: [],
      polygonGeoJson: { type: 'FeatureCollection', features: [] },
      enclosedPolygons: [],
      intersectionsCount: 0,
      loopsCount: 0,
      totalAreaM2: Math.round(perim.length * H3_CELL_AREA_KM2 * 1000000),
      totalAreaKm2: parseFloat((perim.length * H3_CELL_AREA_KM2).toFixed(6)),
      status: 'EMPTY',
    };
  }

  // Build the coordinate path for polygon detection (downsampled for speed)
  let polyCoords = downsampleCoords(coords, 2.0);

  // Auto-close: from starting point to ending point draw chord to enclose the entire curve
  const autoCloseStartEnd = options.autoCloseStartEnd ?? true;
  let hasStartEndChord = false;
  if (autoCloseStartEnd && polyCoords.length >= 3) {
    const pStart = polyCoords[0];
    const pEnd = polyCoords[polyCoords.length - 1];
    const gapMeters = calculateDistanceMeters(pStart[1], pStart[0], pEnd[1], pEnd[0]);

    if (gapMeters > 0.1) {
      polyCoords = [...polyCoords, pStart]; // close the ring with start-end chord
      hasStartEndChord = true;
    }
  }

  // Extract all valid polygons from the closed curve
  const validPolygons = [];
  let totalPolygonAreaM2 = 0;
  const seenPolyKeys = new Set();

  // 1. Direct unkink on the full closed loop (handles simple curves, start-end chords, and self-crossing loops)
  const ring = [...polyCoords];
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push(ring[0]);
  }

  if (ring.length >= 4) {
    try {
      const fullPoly = turf.polygon([ring]);
      const unkinked = turf.unkinkPolygon(fullPoly);
      if (unkinked?.features) {
        for (const feat of unkinked.features) {
          const a = turf.area(feat);
          if (a >= minAreaM2) {
            const key = `${Math.round(a)}-${feat.geometry.coordinates[0]?.length}`;
            if (!seenPolyKeys.has(key)) {
              seenPolyKeys.add(key);
              validPolygons.push(feat);
              totalPolygonAreaM2 += a;
            }
          }
        }
      }
    } catch (e) {
      // Fallback to segment-based polygonize
      try {
        const segments = [];
        for (let i = 0; i < ring.length - 1; i++) {
          segments.push(turf.lineString([ring[i], ring[i + 1]]));
        }
        if (segments.length > 0 && segments.length <= 1000) {
          const fc = turf.featureCollection(segments);
          const polygonized = turf.polygonize(fc);
          if (polygonized?.features) {
            for (const poly of polygonized.features) {
              const a = turf.area(poly);
              if (a >= minAreaM2) {
                const key = `${Math.round(a)}-${poly.geometry.coordinates[0]?.length}`;
                if (!seenPolyKeys.has(key)) {
                  seenPolyKeys.add(key);
                  validPolygons.push(poly);
                  totalPolygonAreaM2 += a;
                }
              }
            }
          }
        }
      } catch (e2) {}
    }
  }

  // 2. Single-pass self-intersection detection for any interior loops
  const n = polyCoords.length;
  const intersections = [];
  const cosLat = Math.cos((polyCoords[0][1] * Math.PI) / 180);

  for (let i = 0; i < n - 1; i++) {
    const ax = polyCoords[i][0] * cosLat, ay = polyCoords[i][1];
    const bx = polyCoords[i + 1][0] * cosLat, by = polyCoords[i + 1][1];
    for (let j = i + 2; j < n - 1; j++) {
      if (j === i + 1 || (i === 0 && j === n - 2)) continue;
      const cx = polyCoords[j][0] * cosLat, cy = polyCoords[j][1];
      const dx = polyCoords[j + 1][0] * cosLat, dy = polyCoords[j + 1][1];
      const pt = segmentIntersect(ax, ay, bx, by, cx, cy, dx, dy);
      if (pt) {
        intersections.push({
          segI: i, segJ: j,
          point: [pt[0] / cosLat, pt[1]],
        });
      }
    }
  }

  for (const isect of intersections) {
    const isectRing = [isect.point];
    for (let k = isect.segI + 1; k <= isect.segJ; k++) {
      isectRing.push(polyCoords[k]);
    }
    isectRing.push(isect.point);
    if (isectRing.length < 4) continue;
    try {
      const poly = turf.polygon([isectRing]);
      const a = turf.area(poly);
      if (a >= minAreaM2) {
        const key = `${Math.round(a)}-${isectRing.length}`;
        if (!seenPolyKeys.has(key)) {
          seenPolyKeys.add(key);
          validPolygons.push(poly);
          totalPolygonAreaM2 += a;
        }
      }
    } catch (e) {}
  }

  // H3 rasterization (bounded for high-performance execution)
  const interiorCellSet = new Set();
  let perimeterCells = [];
  let allCellSet;

  if (skipCells) {
    // Fast mode: skip cell computation (for live metrics display)
    allCellSet = new Set();
    perimeterCells = [];
  } else {
    perimeterCells = extractCoveredCellsFromPath(coords, resolution);
    allCellSet = new Set(perimeterCells);

    if (hasStartEndChord && coords.length >= 3) {
      const chordCells = extractCoveredCellsFromPath(
        [coords[coords.length - 1], coords[0]], resolution
      );
      for (const c of chordCells) allCellSet.add(c);
    }

    for (const poly of validPolygons) {
      try {
        const polyArea = turf.area(poly);
        const fillRes = polyArea > 50000 ? Math.min(resolution, 12) : resolution;
        const filled = h3.polygonToCells(poly.geometry.coordinates, fillRes, true);
        const safeFilled = filled.length > 1200 ? filled.slice(0, 1200) : filled;
        for (const hex of safeFilled) {
          interiorCellSet.add(hex);
          allCellSet.add(hex);
        }
      } catch (err) {
        // polygonToCells can fail on complex polygons — skip silently
      }
    }
  }

  const interiorCells = Array.from(interiorCellSet);
  const allCells = Array.from(allCellSet);

  const cellAreaKm2 = allCells.length * H3_CELL_AREA_KM2;
  const totalAreaKm2 = parseFloat(Math.max(cellAreaKm2, totalPolygonAreaM2 / 1000000).toFixed(6));
  const totalAreaM2 = Math.round(totalAreaKm2 * 1000000);

  return {
    perimeterCells,
    interiorCells,
    allCells,
    polygons: validPolygons,
    polygonGeoJson: turf.featureCollection(validPolygons),
    enclosedPolygons: validPolygons.map((p) => p.geometry.coordinates[0]),
    intersectionsCount: intersections.length,
    loopsCount: validPolygons.length,
    totalAreaM2,
    totalAreaKm2,
    status: validPolygons.length > 0 ? 'VALID' : 'NO_LOOPS',
  };
}

/**
 * Backward-compatible helper for detecting enclosed polygon loops
 */
export function detectEnclosedPolygons(rawCoords, minAreaM2 = 5) {
  const result = extractEnclosedTerritoryGeometry(rawCoords, { minAreaM2 });
  return result.polygons.map((poly) => ({
    ring: poly.geometry.coordinates[0],
    areaM2: turf.area(poly),
    areaKm2: turf.area(poly) / 1000000,
    type: 'POLYGONIZED',
    startIndex: 0,
    endIndex: rawCoords.length - 1,
  }));
}

/**
 * FAST live loop enclosure detection — lightweight version for real-time tracking.
 * Only checks if the LATEST point creates a self-intersection with any earlier segment.
 * Runs in O(n) per call instead of O(n²).
 */
export function detectLatestLoopEnclosure(rawCoords, processedLoopKeys = new Set(), resolution = H3_DEFAULT_RESOLUTION) {
  const coords = normalizeCoordinates(rawCoords);
  if (coords.length < 4) return { newLoop: null, interiorCells: [] };

  // Only check the last segment against all earlier non-adjacent segments
  const lastIdx = coords.length - 1;
  const ax = coords[lastIdx - 1][0], ay = coords[lastIdx - 1][1];
  const bx = coords[lastIdx][0], by = coords[lastIdx][1];
  const cosLat = Math.cos((ay * Math.PI) / 180);
  const axP = ax * cosLat, ayP = ay;
  const bxP = bx * cosLat, byP = by;

  let bestIntersection = null;
  let bestSegIdx = -1;

  for (let j = 0; j < lastIdx - 2; j++) {
    const cx = coords[j][0] * cosLat, cy = coords[j][1];
    const dx = coords[j + 1][0] * cosLat, dy = coords[j + 1][1];
    const pt = segmentIntersect(axP, ayP, bxP, byP, cx, cy, dx, dy);
    if (pt) {
      bestIntersection = [pt[0] / cosLat, pt[1]];
      bestSegIdx = j;
      break; // Take the first (earliest) intersection
    }
  }

  if (!bestIntersection) return { newLoop: null, interiorCells: [] };

  // Build the loop ring from the intersection
  const ring = [bestIntersection];
  for (let k = bestSegIdx + 1; k <= lastIdx; k++) {
    ring.push(coords[k]);
  }
  ring.push(bestIntersection);

  if (ring.length < 4) return { newLoop: null, interiorCells: [] };

  try {
    const poly = turf.polygon([ring]);
    const areaM2 = turf.area(poly);
    if (areaM2 < (FITNESS_CONFIG.GEOMETRY.MIN_ENCLOSED_POLYGON_AREA_M2 ?? 5)) {
      return { newLoop: null, interiorCells: [] };
    }

    const loopKey = `poly-${Math.round(areaM2)}-${ring.length}`;
    if (processedLoopKeys.has(loopKey)) {
      return { newLoop: null, interiorCells: [] };
    }
    processedLoopKeys.add(loopKey);

    // Bounded fill for live tracking: at most 150 cells so JS thread NEVER hangs!
    const newInterior = [];
    try {
      const hexes = h3.polygonToCells(poly.geometry.coordinates, resolution, true);
      const safeHexes = hexes.length > 150 ? hexes.slice(0, 150) : hexes;
      for (const h of safeHexes) newInterior.push(h);
    } catch (e) {}

    return {
      newLoop: { loopKey, areaM2, poly },
      interiorCells: newInterior,
    };
  } catch (e) {
    return { newLoop: null, interiorCells: [] };
  }
}

/**
 * Authoritative territory extraction: perimeter + interior enclosed polygon cells
 */
export function extractEnclosedTerritoryCells(rawCoords, resolution = H3_DEFAULT_RESOLUTION) {
  return extractEnclosedTerritoryGeometry(rawCoords, { resolution });
}

export function interpolateCircuitPath(waypoints, stepMeters = 1.5) {
  if (!waypoints || waypoints.length < 2) return waypoints || [];
  const dense = [];
  for (let i = 0; i < waypoints.length; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[(i + 1) % waypoints.length];
    const [lon1, lat1] = p1;
    const [lon2, lat2] = p2;
    const dist = calculateDistanceMeters(lat1, lon1, lat2, lon2);
    const steps = Math.max(1, Math.floor(dist / stepMeters));
    for (let s = 0; s < steps; s++) {
      const r = s / steps;
      dense.push([
        parseFloat((lon1 + (lon2 - lon1) * r).toFixed(7)),
        parseFloat((lat1 + (lat2 - lat1) * r).toFixed(7)),
      ]);
    }
  }
  return dense;
}
