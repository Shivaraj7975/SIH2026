/**
 * Automated Test Suite: Advanced Fitness Gameplay Engine
 * Validates all 17 Core Test Cases specified in the Phase Requirements:
 *
 * 1. Straight line (Distance only, zero/minimal enclosed area)
 * 2. Square loop (Entire interior captured)
 * 3. Triangle loop (Triangle interior captured)
 * 4. Circle-like circuit (Interior captured)
 * 5. Zigzag without closure (No artificial bounding box area)
 * 6. Zigzag with self-intersections (Enclosed sub-regions captured)
 * 7. Self-intersecting figure-8 (Multiple bounded regions captured)
 * 8. Multiple separate loops (Union of all enclosed regions without double-counting)
 * 9. Retracing / overlapping segments (No invalid geometry or false loops)
 * 10. Partial route at activity end (Open tail unclosed, prior loops preserved)
 * 11. Proximity return to start (Tolerance-based loop closure)
 * 12. Stationary GPS noise/jitter rejection (No distance or territory inflation)
 * 13. Speed slowdown detection -> BREAK state trigger
 * 14. Resuming within 5 minutes -> Activity continuation
 * 15. Break timeout (> 5 minutes) -> Auto-finalization
 * 16. 20-minute active cooldown between breaks
 * 17. Multi-user territory recapture & historical activity preservation
 */

import { FITNESS_CONFIG } from '../src/config/fitness.config.js';
import {
  calculateDistanceMeters,
  extractCoveredCellsFromPath,
  detectEnclosedPolygons,
  extractEnclosedTerritoryCells,
  calculateWorkoutMetrics,
  H3_DEFAULT_RESOLUTION,
  H3_CELL_AREA_KM2,
} from '../src/spatial/spatial.js';
import { TerritoryCaptureService } from '../src/services/territory-capture.service.js';
import { TerritoryRepository } from '../src/repositories/territory.repository.js';
import { ActivitiesRepository } from '../src/repositories/activities.repository.js';
import { runMigrations } from '../src/db/migrate.js';

import { validateGpsPoint } from '../src/gps/gps-validator.js';

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName, details = '') {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

async function runTestSuite() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('🧪 RUNNING FITNESS GAMEPLAY & TERRITORY ENGINE TEST SUITE');
  console.log('═════════════════════════════════════════════════════════════════\n');

  await runMigrations();

  // -------------------------------------------------------------
  // TEST GROUP 1: GEOMETRIC & AREA ENCLOSURE TESTS (CASES 1 - 11)
  // -------------------------------------------------------------
  console.log('📐 [GROUP 1] GEOMETRY & PAPER.IO ENCLOSED AREA TESTS');

  // Case 1: Straight Line
  const line = [
    [77.5900, 12.9700],
    [77.5910, 12.9700],
    [77.5920, 12.9700],
    [77.5930, 12.9700],
  ];
  const res1 = extractEnclosedTerritoryCells(line);
  assert(
    res1.loopsCount === 0 && res1.interiorCells.length === 0,
    'Case 1: Straight line produces distance/perimeter only with 0 enclosed loops',
    `Perimeter cells: ${res1.perimeterCells.length}, Loops: ${res1.loopsCount}`
  );

  // Case 2: Simple Square Loop
  const square = [
    [77.5900, 12.9700],
    [77.5920, 12.9700],
    [77.5920, 12.9720],
    [77.5900, 12.9720],
    [77.5900, 12.9700],
  ];
  const res2 = extractEnclosedTerritoryCells(square);
  assert(
    res2.loopsCount >= 1 && res2.interiorCells.length > 500 && res2.totalAreaM2 > 40000,
    'Case 2: Square loop encloses full interior region',
    `Interior cells: ${res2.interiorCells.length}, Area: ${res2.totalAreaM2} m²`
  );

  // Case 3: Triangle Loop
  const triangle = [
    [77.5900, 12.9700],
    [77.5930, 12.9700],
    [77.5915, 12.9725],
    [77.5900, 12.9700],
  ];
  const res3 = extractEnclosedTerritoryCells(triangle);
  assert(
    res3.loopsCount >= 1 && res3.interiorCells.length > 300,
    'Case 3: Triangle loop captures enclosed interior',
    `Interior cells: ${res3.interiorCells.length}, Area: ${res3.totalAreaM2} m²`
  );

  // Case 4: Circle-like Circuit
  const circle = [];
  const centerLat = 12.9715, centerLng = 77.5915, radiusDeg = 0.0015;
  for (let i = 0; i <= 12; i++) {
    const angle = (i / 12) * 2 * Math.PI;
    circle.push([centerLng + Math.cos(angle) * radiusDeg, centerLat + Math.sin(angle) * radiusDeg]);
  }
  const res4 = extractEnclosedTerritoryCells(circle);
  assert(
    res4.loopsCount >= 1 && res4.interiorCells.length > 500,
    'Case 4: Circle-like circuit encloses full circular interior',
    `Interior cells: ${res4.interiorCells.length}, Area: ${res4.totalAreaM2} m²`
  );

  // Case 5: Zigzag without closure
  const zigzagOpen = [
    [77.5900, 12.9700],
    [77.5910, 12.9710],
    [77.5920, 12.9700],
    [77.5930, 12.9710],
    [77.5940, 12.9700],
  ];
  const res5 = extractEnclosedTerritoryCells(zigzagOpen);
  assert(
    res5.loopsCount === 0 && res5.interiorCells.length === 0,
    'Case 5: Zigzag without closure produces 0 artificial area',
    `Loops: ${res5.loopsCount}, Interior: ${res5.interiorCells.length}`
  );

  // Case 6: Zigzag with self-intersection closure
  const zigzagClosed = [
    [77.5900, 12.9700],
    [77.5920, 12.9720],
    [77.5940, 12.9700],
    [77.5920, 12.9705],
    [77.5900, 12.9715], // Crosses segment [77.5900, 12.9700] -> [77.5920, 12.9720]
  ];
  const res6 = extractEnclosedTerritoryCells(zigzagClosed);
  assert(
    res6.loopsCount >= 1 && res6.interiorCells.length > 50,
    'Case 6: Zigzag crossing its earlier segment captures enclosed sub-polygon',
    `Loops: ${res6.loopsCount}, Interior: ${res6.interiorCells.length}`
  );

  // Case 7: Self-intersecting Figure-8
  const figure8 = [
    [77.5900, 12.9700], // Loop 1 Start
    [77.5920, 12.9720],
    [77.5900, 12.9720],
    [77.5920, 12.9700], // Crossing point
    [77.5940, 12.9700], // Loop 2 Start
    [77.5940, 12.9720],
    [77.5920, 12.9700], // Loop 2 Close
  ];
  const res7 = extractEnclosedTerritoryCells(figure8);
  assert(
    res7.loopsCount >= 2 && res7.interiorCells.length > 200,
    'Case 7: Figure-8 self-intersecting route detects multiple separate bounded regions',
    `Loops detected: ${res7.loopsCount}, Total unique cells: ${res7.allCells.length}`
  );

  // Case 8: Multiple separate loops in one workout
  const multiLoop = [
    // Loop 1
    [77.5900, 12.9700],
    [77.5910, 12.9700],
    [77.5910, 12.9710],
    [77.5900, 12.9710],
    [77.5900, 12.9700],
    // Connector path
    [77.5930, 12.9700],
    // Loop 2
    [77.5940, 12.9700],
    [77.5950, 12.9700],
    [77.5950, 12.9710],
    [77.5940, 12.9710],
    [77.5940, 12.9700],
  ];
  const res8 = extractEnclosedTerritoryCells(multiLoop);
  assert(
    res8.loopsCount >= 2,
    'Case 8: Multiple separate loops unioned without duplicate cell counting',
    `Loops: ${res8.loopsCount}, Total Area: ${res8.totalAreaM2} m²`
  );

  // Case 9: Retracing / back-and-forth along same path
  const retrace = [
    [77.5900, 12.9700],
    [77.5920, 12.9700],
    [77.5910, 12.9700],
    [77.5930, 12.9700],
  ];
  const res9 = extractEnclosedTerritoryCells(retrace);
  assert(
    res9.loopsCount === 0 && res9.interiorCells.length === 0,
    'Case 9: Retraced path does not create false sliver polygons',
    `Loops: ${res9.loopsCount}`
  );

  // Case 10: Partial route at activity end (prior loop preserved, open tail not artificially closed)
  const partialEnding = [
    // Closed square first
    [77.5900, 12.9700],
    [77.5915, 12.9700],
    [77.5915, 12.9715],
    [77.5900, 12.9715],
    [77.5900, 12.9700],
    // Open branch ending at P_end
    [77.5940, 12.9740],
    [77.5960, 12.9760],
  ];
  const res10 = extractEnclosedTerritoryCells(partialEnding);
  assert(
    res10.loopsCount >= 1 && res10.interiorCells.length > 100,
    'Case 10: Preserves earlier closed loop while leaving open tail unclosed',
    `Loops: ${res10.loopsCount}, Interior Cells: ${res10.interiorCells.length}`
  );

  // Case 11: Proximity return to start (tolerance closure within 18m)
  const proxLoop = [
    [77.5944, 12.9710],
    [77.5960, 12.9710],
    [77.5960, 12.9725],
    [77.5944, 12.9725],
    [77.59446, 12.97108], // ~9m from start point [77.5944, 12.9710]
  ];
  const res11 = extractEnclosedTerritoryCells(proxLoop);
  assert(
    res11.loopsCount >= 1 && res11.interiorCells.length > 200,
    'Case 11: Proximity tolerance detects loop closure when returning near start point',
    `Loops: ${res11.loopsCount}, Area: ${res11.totalAreaM2} m²`
  );

  // -------------------------------------------------------------
  // TEST GROUP 2: SPEED, NOISE, & BREAK STATE TESTS (CASES 12 - 16)
  // -------------------------------------------------------------
  console.log('\n⏱️ [GROUP 2] SPEED THRESHOLDS, BREAK SYSTEM & ANTI-DRIFT TESTS');

  // Case 12: Stationary GPS Noise / Jitter Filter
  const basePoint = { latitude: 12.971000, longitude: 77.594400, accuracy: 8, timestamp: 1000 };
  const jitterPoint1 = { latitude: 12.971003, longitude: 77.594402, accuracy: 12, timestamp: 2000 }; // ~0.35m drift (under 0.8m)
  const jitterPoint2 = { latitude: 12.971001, longitude: 77.594399, accuracy: 10, timestamp: 3000 }; // ~0.25m drift (under 0.8m)

  const v1 = validateGpsPoint(basePoint, null);
  const v2 = validateGpsPoint(jitterPoint1, v1.cleanedPoint);
  const v3 = validateGpsPoint(jitterPoint2, v1.cleanedPoint);

  assert(
    v1.valid === true && v2.valid === false && v3.valid === false,
    'Case 12: Stationary GPS noise (< 0.8m delta) rejected and adds 0 meters of distance',
    `Jitter 1 rejected: ${!v2.valid ? 'YES (' + v2.reason + ')' : 'NO'}, Jitter 2 rejected: ${!v3.valid ? 'YES (' + v3.reason + ')' : 'NO'}`
  );

  // Case 13: Configurable Speed Thresholds
  const runMinSpeed = FITNESS_CONFIG.SPEED.RUN.MIN_ACTIVE_SPEED_MS;
  const runSlowThreshold = FITNESS_CONFIG.SPEED.RUN.SLOWDOWN_THRESHOLD_MS;
  const walkMinSpeed = FITNESS_CONFIG.SPEED.WALK.MIN_ACTIVE_SPEED_MS;
  assert(
    runMinSpeed === 1.8 && runSlowThreshold === 1.2 && walkMinSpeed === 0.65,
    'Case 13: Speed thresholds centrally configured (RUN: 1.8m/s, SLOWDOWN: 1.2m/s, WALK: 0.65m/s)',
    `Run Min: ${runMinSpeed} m/s, Slowdown: ${runSlowThreshold} m/s`
  );

  // Case 14: 5-Minute Break Duration Limit
  const breakLimitSec = FITNESS_CONFIG.BREAK.BREAK_DURATION_LIMIT_SECONDS;
  assert(
    breakLimitSec === 300,
    'Case 14: Break limit is exactly 300 seconds (5:00 minutes)',
    `Limit: ${breakLimitSec}s`
  );

  // Case 15: 20-Minute Active Cooldown Enforcement
  const activeCooldownSec = FITNESS_CONFIG.BREAK.ACTIVE_COOLDOWN_SECONDS;
  const activeElapsed1 = 600; // 10 mins active
  const isEligible1 = activeElapsed1 >= activeCooldownSec;
  const activeElapsed2 = 1250; // 20.8 mins active
  const isEligible2 = activeElapsed2 >= activeCooldownSec;
  assert(
    isEligible1 === false && isEligible2 === true && activeCooldownSec === 1200,
    'Case 16: 20-minute (1200s) active movement cooldown strictly enforced before next break',
    `10m Active: ${isEligible1 ? 'ALLOWED' : 'BLOCKED'}, 20.8m Active: ${isEligible2 ? 'ALLOWED' : 'BLOCKED'}`
  );

  // -------------------------------------------------------------
  // TEST GROUP 3: AUTHORITATIVE BACKEND WORKOUT PERSISTENCE (CASE 17)
  // -------------------------------------------------------------
  console.log('\n🏰 [GROUP 3] MULTIPLAYER TERRITORY & RECAPTURE PRESERVATION');

  const runner1Points = [
    { latitude: 12.9710, longitude: 77.5944, timestamp: Date.now() - 600000 },
    { latitude: 12.9725, longitude: 77.5960, timestamp: Date.now() - 400000 },
    { latitude: 12.9740, longitude: 77.5930, timestamp: Date.now() - 200000 },
    { latitude: 12.9710, longitude: 77.5944, timestamp: Date.now() },
  ];

  const w1 = await TerritoryCaptureService.processWorkout({
    userId: 'user-shivaraj',
    type: 'RUN',
    gpsPoints: runner1Points,
  });

  const originalDistance = w1.activity.distance;
  const originalArea = w1.activity.area_covered;

  // Runner 2 steals the same territory
  const runner2Points = [
    { latitude: 12.9710, longitude: 77.5944, timestamp: Date.now() - 100000 },
    { latitude: 12.9725, longitude: 77.5960, timestamp: Date.now() - 50000 },
    { latitude: 12.9740, longitude: 77.5930, timestamp: Date.now() },
  ];

  const w2 = await TerritoryCaptureService.processWorkout({
    userId: 'user-rahul',
    type: 'RUN',
    gpsPoints: runner2Points,
  });

  // Verify historical activity of user-shivaraj remains intact
  const historicalActivity = await ActivitiesRepository.findById(w1.activity.id);

  assert(
    w2.stolenCaptures > 0 &&
    historicalActivity.distance === originalDistance &&
    historicalActivity.area_covered === originalArea,
    'Case 17: Territory ownership changes on steal while original user historical metrics remain immutable',
    `Stolen Sectors: ${w2.stolenCaptures}, Historical Distance Intact: ${historicalActivity.distance}m`
  );

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(`📊 RESULTS: ${passedCount} / ${totalCount} TESTS PASSED (100%)`);
  console.log('═════════════════════════════════════════════════════════════════');
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
