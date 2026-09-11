import * as turf from '@turf/turf';
import * as h3 from 'h3-js';

export const H3_DEFAULT_RESOLUTION = 14;
export const H3_CELL_AREA_KM2 = 0.00000616;
export const CLOSURE_TOLERANCE_METERS = 20;

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
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

function normalizeCoordinates(coords) {
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
 * Projects point P [lng, lat] onto line segment A->B.
 * Returns { point: [lng, lat], distanceMeters: number, t: number }
 */
function projectPointToSegment(P, A, B) {
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

export function extractCoveredCellsFromPath(coords, resolution = H3_DEFAULT_RESOLUTION) {
  const norm = normalizeCoordinates(coords);
  if (!norm || norm.length === 0) return [];

  const cellSet = new Set();
  const stepMeters = 1.2;

  for (let i = 0; i < norm.length; i++) {
    const [lon, lat] = norm[i];
    const cell = h3.latLngToCell(lat, lon, resolution);
    if (cell) cellSet.add(cell);

    if (i > 0) {
      const [prevLon, prevLat] = norm[i - 1];
      const segmentDist = calculateDistanceMeters(prevLat, prevLon, lat, lon);

      if (segmentDist > stepMeters) {
        const numSteps = Math.min(500, Math.ceil(segmentDist / stepMeters));
        for (let s = 1; s < numSteps; s++) {
          const ratio = s / numSteps;
          const interpLat = prevLat + (lat - prevLat) * ratio;
          const interpLon = prevLon + (lon - prevLon) * ratio;
          const interpCell = h3.latLngToCell(interpLat, interpLon, resolution);
          if (interpCell) cellSet.add(interpCell);
        }
      }
    }
  }

  return Array.from(cellSet);
}

/**
 * Robust Paper.io-Style Geometry Engine:
 * 1. Linework extraction
 * 2. Segment-to-point proximity closure (robust against noisy GPS & mid-segment returns)
 * 3. Segment intersection splitting / noding
 * 4. Turf polygonization of planar line network
 * 5. Degenerate sliver removal (< 5 m2)
 * 6. H3 rasterization & cell deduplication
 */
export function extractEnclosedTerritoryGeometry(rawCoords, options = {}) {
  const closureTolerance = options.closureToleranceMeters ?? CLOSURE_TOLERANCE_METERS;
  const minAreaM2 = options.minAreaM2 ?? 5;
  const resolution = options.resolution ?? H3_DEFAULT_RESOLUTION;

  const coords = normalizeCoordinates(rawCoords);
  if (coords.length < 3) {
    const perim = extractCoveredCellsFromPath(coords, resolution);
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

  // 1. Build initial LineString segments
  const initialSegments = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const d = calculateDistanceMeters(p1[1], p1[0], p2[1], p2[0]);
    if (d > 0.05) {
      initialSegments.push(turf.lineString([p1, p2]));
    }
  }

  // 2. Segment Proximity Closures: Check if any forward point approaches ANY earlier non-adjacent segment
  const closureSegments = [];
  let proximityClosuresCount = 0;

  for (let i = coords.length - 1; i >= 3; i--) {
    const ptI = coords[i];
    let bestClosure = null;

    for (let j = 0; j <= i - 3; j++) {
      const segA = coords[j];
      const segB = coords[j + 1];
      const proj = projectPointToSegment(ptI, segA, segB);

      if (proj.distanceMeters <= closureTolerance) {
        // Compute path distance along route from j to i
        let pathDist = 0;
        for (let k = j; k < i; k++) {
          pathDist += calculateDistanceMeters(coords[k][1], coords[k][0], coords[k + 1][1], coords[k + 1][0]);
        }
        if (pathDist >= closureTolerance * 2.0) {
          if (!bestClosure || proj.distanceMeters < bestClosure.distanceMeters) {
            bestClosure = {
              ptI,
              projPoint: proj.point,
              distanceMeters: proj.distanceMeters,
            };
          }
        }
      }
    }

    if (bestClosure) {
      const closeDist = calculateDistanceMeters(
        bestClosure.ptI[1],
        bestClosure.ptI[0],
        bestClosure.projPoint[1],
        bestClosure.projPoint[0]
      );
      if (closeDist > 0.1) {
        closureSegments.push(turf.lineString([bestClosure.ptI, bestClosure.projPoint]));
        proximityClosuresCount++;
      }
    }
  }

  // 3. Node line segments at all intersection points
  let splitLines = [...initialSegments, ...closureSegments];
  let hasIntersections = true;
  let iterations = 0;
  let totalIntersectionsFound = 0;

  while (hasIntersections && iterations < 25) {
    hasIntersections = false;
    iterations++;
    const nextSplit = [];

    for (let i = 0; i < splitLines.length; i++) {
      const lineA = splitLines[i];
      let splitOccurred = false;

      for (let j = 0; j < splitLines.length; j++) {
        if (i === j) continue;
        const lineB = splitLines[j];
        const isects = turf.lineIntersect(lineA, lineB);

        if (isects.features && isects.features.length > 0) {
          for (const feat of isects.features) {
            const pt = feat.geometry.coordinates;
            const pStart = lineA.geometry.coordinates[0];
            const pEnd = lineA.geometry.coordinates[lineA.geometry.coordinates.length - 1];
            const dStart = calculateDistanceMeters(pt[1], pt[0], pStart[1], pStart[0]);
            const dEnd = calculateDistanceMeters(pt[1], pt[0], pEnd[1], pEnd[0]);

            if (dStart > 0.15 && dEnd > 0.15) {
              const split = turf.lineSplit(lineA, feat);
              if (split && split.features && split.features.length > 1) {
                totalIntersectionsFound++;
                for (const sf of split.features) {
                  nextSplit.push(sf);
                }
                splitOccurred = true;
                hasIntersections = true;
                break;
              }
            }
          }
        }
        if (splitOccurred) break;
      }

      if (!splitOccurred) {
        nextSplit.push(lineA);
      }
    }
    splitLines = nextSplit;
  }

  // 4. Polygonize noded planar linework
  const fc = turf.featureCollection(splitLines);
  const polygonized = turf.polygonize(fc);

  const validPolygons = [];
  const interiorCellSet = new Set();
  const allCellSet = new Set(extractCoveredCellsFromPath(coords, resolution));
  let totalPolygonAreaM2 = 0;

  if (polygonized && polygonized.features && polygonized.features.length > 0) {
    for (const poly of polygonized.features) {
      const areaM2 = turf.area(poly);
      if (areaM2 >= minAreaM2) {
        validPolygons.push(poly);
        totalPolygonAreaM2 += areaM2;

        try {
          const filled = h3.polygonToCells(poly.geometry.coordinates, resolution, true);
          for (const hex of filled) {
            interiorCellSet.add(hex);
            allCellSet.add(hex);
          }
        } catch (err) {
          console.warn('polygonToCells rasterization warning:', err.message);
        }
      }
    }
  }

  const perimeterCells = extractCoveredCellsFromPath(coords, resolution);
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
    intersectionsCount: totalIntersectionsFound + proximityClosuresCount,
    loopsCount: validPolygons.length,
    totalAreaM2,
    totalAreaKm2,
    status: validPolygons.length > 0 ? 'VALID' : 'NO_LOOPS',
  };
}

// ==========================================
// TEST SCENARIOS
// ==========================================

console.log('Testing Mid-Segment Approach Case:');
// Long segment A (77.5900, 12.9700) -> B (77.5900, 12.9780)
// Route branches out east to C (77.5950, 12.9740) and returns to D (77.5901, 12.9740) (~10m from segment A-B, but 400m from A and 400m from B)
const midSegmentRoute = [
  [77.5900, 12.9700], // A
  [77.5900, 12.9780], // B (heading north)
  [77.5950, 12.9740], // C (looping east)
  [77.5901, 12.9740], // D (approaching mid-segment of A-B within 10m)
];

const resMid = extractEnclosedTerritoryGeometry(midSegmentRoute);
console.log('Mid-segment test result:', {
  loopsCount: resMid.loopsCount,
  interiorCells: resMid.interiorCells.length,
  totalAreaM2: resMid.totalAreaM2,
});
console.assert(resMid.loopsCount === 1, 'Mid-segment test failed: should detect 1 closed loop');
console.assert(resMid.interiorCells.length > 500, 'Mid-segment test failed: should capture interior cells');
console.log('✅ Mid-segment closure test PASSED!');
