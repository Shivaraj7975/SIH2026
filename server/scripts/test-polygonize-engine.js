import * as turf from '@turf/turf';
import * as h3 from 'h3-js';

// Let's test the circuit from the user's screenshot:
// Road up -> Triangle Loop at circle -> Road back down
const testRoute = [
  [77.5944, 12.9710], // P1 start
  [77.5952, 12.9718], // P2
  [77.5960, 12.9725], // P3 (junction)
  [77.5950, 12.9733], // P4 (loop top left)
  [77.5965, 12.9740], // P5 (loop top right)
  [77.5960, 12.9725], // P6 (back to junction / crosses P3)
  [77.5952, 12.9718], // P7 (heading back down)
  [77.5944, 12.9710], // P8 (end)
];

console.log('Testing route with', testRoute.length, 'points');

// Let's test Turf polygonize with noded linework
function nodeLineworkAndPolygonize(coords, closureToleranceMeters = 20) {
  if (!coords || coords.length < 3) return { polygons: [], cells: [] };

  // 1. Build initial segments
  const segments = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    if (p1[0] !== p2[0] || p1[1] !== p2[1]) {
      segments.push(turf.lineString([p1, p2]));
    }
  }

  // 2. Proximity closure: If any point is within closureToleranceMeters of an earlier non-adjacent point/segment, snap or insert closing segment
  for (let i = coords.length - 1; i >= 3; i--) {
    const ptI = coords[i];
    for (let j = 0; j <= i - 3; j++) {
      const ptJ = coords[j];
      const dist = turf.distance(turf.point(ptI), turf.point(ptJ), { units: 'meters' });
      if (dist > 0 && dist <= closureToleranceMeters) {
        // Path distance along trail between j and i should be at least 3x tolerance to avoid trivial jitter
        let pathDist = 0;
        for (let k = j; k < i; k++) {
          pathDist += turf.distance(turf.point(coords[k]), turf.point(coords[k+1]), { units: 'meters' });
        }
        if (pathDist >= closureToleranceMeters * 2) {
          segments.push(turf.lineString([ptI, ptJ]));
          break;
        }
      }
    }
  }

  // 3. Find all intersection points between all segments and split segments
  let splitLines = [...segments];
  let hasIntersections = true;
  let iterations = 0;

  while (hasIntersections && iterations < 15) {
    hasIntersections = false;
    iterations++;
    const nextSplit = [];

    for (let i = 0; i < splitLines.length; i++) {
      const lineA = splitLines[i];
      let splitOccurred = false;

      for (let j = 0; j < splitLines.length; j++) {
        if (i === j) continue;
        const lineB = splitLines[j];
        const isect = turf.lineIntersect(lineA, lineB);

        if (isect.features && isect.features.length > 0) {
          for (const feat of isect.features) {
            const pt = feat.geometry.coordinates;
            // Check if pt is strictly interior to lineA (not endpoint)
            const pStart = lineA.geometry.coordinates[0];
            const pEnd = lineA.geometry.coordinates[lineA.geometry.coordinates.length - 1];
            const dStart = turf.distance(turf.point(pt), turf.point(pStart), { units: 'meters' });
            const dEnd = turf.distance(turf.point(pt), turf.point(pEnd), { units: 'meters' });

            if (dStart > 0.1 && dEnd > 0.1) {
              const split = turf.lineSplit(lineA, feat);
              if (split && split.features && split.features.length > 1) {
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

  // 4. Polygonize the noded segments
  const fc = turf.featureCollection(splitLines);
  const polygonized = turf.polygonize(fc);

  console.log('Polygonized features found:', polygonized.features.length);
  const validPolys = [];
  const allH3Cells = new Set();

  for (const poly of polygonized.features) {
    const area = turf.area(poly);
    console.log('Polygon area:', area, 'm²');
    if (area >= 5) {
      validPolys.push(poly);
      const ring = poly.geometry.coordinates[0];
      try {
        const hexes = h3.polygonToCells(poly.geometry.coordinates, 14, true);
        console.log('h3.polygonToCellsRes14 returned:', hexes.length, 'cells');
        for (const h of hexes) allH3Cells.add(h);
      } catch (e) {
        console.warn('H3 fill error:', e.message);
      }
    }
  }

  return {
    polygons: validPolys,
    cells: Array.from(allH3Cells),
  };
}

const result = nodeLineworkAndPolygonize(testRoute, 20);
console.log('Total valid polygons:', result.polygons.length, 'Total H3 Res 14 cells:', result.cells.length);
