import { TerritoryCaptureService } from '../src/services/territory-capture.service.js';
import { TerritoryRepository } from '../src/repositories/territory.repository.js';
import { ActivitiesRepository } from '../src/repositories/activities.repository.js';
import { query } from '../src/config/database.js';
import { runMigrations } from '../src/db/migrate.js';

console.log('🧪 Running Express & Postgres Verification Suite for GeoFit...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  await runMigrations();

  const testCellId = '8960145b4c7ffff';

  await query('DELETE FROM territory_cells WHERE h3_cell_id = $1', [testCellId]);
  await query('DELETE FROM territory_history WHERE h3_cell_id = $1', [testCellId]);

  console.log('1️⃣ Testing First Capture (Unclaimed Cell -> Rahul)...');
  const rahulPoints = [
    { latitude: 12.9800, longitude: 77.6000, accuracy: 5, timestamp: Date.now() - 60000 },
    { latitude: 12.9810, longitude: 77.6010, accuracy: 5, timestamp: Date.now() - 30000 },
    { latitude: 12.9820, longitude: 77.6020, accuracy: 5, timestamp: Date.now() },
  ];

  const rahulCapture = await TerritoryCaptureService.processWorkout({
    userId: 'user-rahul',
    type: 'RUN',
    gpsPoints: rahulPoints,
    customMetrics: { distanceMeters: 600, durationSeconds: 60, uniqueCells: [testCellId] },
  });

  const cellAfterRahul = await TerritoryRepository.findCellById(testCellId);
  assert(cellAfterRahul && cellAfterRahul.currentOwnerId === 'user-rahul', 'Cell is now currently owned by user-rahul');

  const rahulHistory = await TerritoryRepository.findHistoryByCellId(testCellId);
  assert(rahulHistory.length === 1 && rahulHistory[0].userId === 'user-rahul', 'Logged immutable capture history for Rahul');

  console.log('\n2️⃣ Testing Recapture by Another User (Rahul -> Shivaraj)...');
  const shivarajPoints = [
    { latitude: 12.9800, longitude: 77.6000, accuracy: 5, timestamp: Date.now() - 50000 },
    { latitude: 12.9810, longitude: 77.6010, accuracy: 5, timestamp: Date.now() - 25000 },
    { latitude: 12.9820, longitude: 77.6020, accuracy: 5, timestamp: Date.now() },
  ];

  const shivarajCapture = await TerritoryCaptureService.processWorkout({
    userId: 'user-shivaraj',
    type: 'RUN',
    gpsPoints: shivarajPoints,
    customMetrics: { distanceMeters: 750, durationSeconds: 50, uniqueCells: [testCellId] },
  });

  const cellAfterShivaraj = await TerritoryRepository.findCellById(testCellId);
  assert(cellAfterShivaraj.currentOwnerId === 'user-shivaraj', 'Current ownership dynamically updated to user-shivaraj');

  const rahulActivities = await ActivitiesRepository.findByUserId('user-rahul');
  const rahulActivityStillExists = rahulActivities.some(a => a.id === rahulCapture.activity.id);
  assert(rahulActivityStillExists, "Rahul's past activity distance/calories remain completely intact");

  const fullCellHistory = await TerritoryRepository.findHistoryByCellId(testCellId);
  assert(fullCellHistory.length === 2, `Cell audit history contains both captures (Found: ${fullCellHistory.length})`);
  assert(fullCellHistory[0].userId === 'user-shivaraj', 'Latest history entry is Shivaraj');
  assert(fullCellHistory[1].userId === 'user-rahul', 'Historical entry for Rahul preserved perfectly');

  console.log('\n3️⃣ Testing Recapture by Original User (Shivaraj -> Rahul)...');
  await TerritoryCaptureService.processWorkout({
    userId: 'user-rahul',
    type: 'RUN',
    gpsPoints: rahulPoints,
    customMetrics: { distanceMeters: 800, durationSeconds: 55, uniqueCells: [testCellId] },
  });

  const cellRecaptured = await TerritoryRepository.findCellById(testCellId);
  assert(cellRecaptured.currentOwnerId === 'user-rahul', 'Current ownership successfully flipped back to user-rahul');
  assert((await TerritoryRepository.findHistoryByCellId(testCellId)).length === 3, 'Audit history now contains 3 sequential conquests');

  console.log('\n4️⃣ Testing Idempotency on Duplicate Request Submission...');
  const duplicateActivityId = `act-idempotency-test-${Date.now()}`;
  const runParams = {
    activityId: duplicateActivityId,
    userId: 'user-priya',
    type: 'RUN',
    gpsPoints: rahulPoints,
    customMetrics: { distanceMeters: 500, durationSeconds: 40, uniqueCells: [testCellId] },
  };

  const firstRes = await TerritoryCaptureService.processWorkout(runParams);
  const historyCountBefore = (await TerritoryRepository.findHistoryByCellId(testCellId)).length;

  const secondRes = await TerritoryCaptureService.processWorkout(runParams);
  const historyCountAfter = (await TerritoryRepository.findHistoryByCellId(testCellId)).length;

  assert(secondRes.isDuplicateRequest === true, 'Duplicate request was recognized idempotently');
  assert(historyCountAfter === historyCountBefore, 'Duplicate request did not corrupt or create duplicate history rows');

  console.log('\n5️⃣ Testing Static GPS Noise & Minimum Movement Threshold...');
  const staticNoisePoints = [
    { latitude: 12.9800000, longitude: 77.6000000, accuracy: 5, timestamp: Date.now() - 3000 },
    { latitude: 12.9800001, longitude: 77.6000001, accuracy: 5, timestamp: Date.now() - 2000 },
    { latitude: 12.9800001, longitude: 77.6000002, accuracy: 5, timestamp: Date.now() },
  ];

  let noiseHandled = false;
  try {
    const res = await TerritoryCaptureService.processWorkout({
      userId: 'user-alex',
      type: 'RUN',
      gpsPoints: staticNoisePoints,
    });
    if (res.validationStatus !== 'VALID' || res.cellsCoveredCount === 0) {
      noiseHandled = true;
    }
  } catch (err) {
    noiseHandled = true;
  }
  assert(noiseHandled, 'Zero-movement static GPS jitter correctly handled without generating spurious captures');

  console.log(`\n======================================================`);
  console.log(`📊 Express Backend Verification: ${passedTests}/${totalTests} Tests Passed!`);
  console.log(`======================================================\n`);
}

runTests().catch(console.error);
