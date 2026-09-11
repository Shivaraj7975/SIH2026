import { query } from '../src/config/database.js';
import { AntiCheatService, DEFAULT_ANTI_CHEAT_CONFIG } from '../src/gps/anti-cheat.service.js';
import { TerritoryCaptureService } from '../src/services/territory-capture.service.js';
import { UsersRepository } from '../src/repositories/users.repository.js';
import { ChallengesRepository } from '../src/repositories/challenges.repository.js';
import { DailyChallengesService } from '../src/services/daily-challenges.service.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runPhase9AntiCheatTests() {
  console.log('\n======================================================');
  console.log('🛡️ RUNNING PHASE 9 GPS VALIDATION & ANTI-CHEAT TEST SUITE');
  console.log('======================================================\n');

  const now = Date.now();

  // ----------------------------------------------------
  // TEST 1: Normal Walking Activity (VALID)
  // ----------------------------------------------------
  console.log('1️⃣ Testing Normal Walking Track (~5 km/h, 1.4 m/s)...');
  const walkingPoints = [
    { latitude: 12.9716, longitude: 77.5946, accuracy: 5, timestamp: now - 300000, speed: 1.3 },
    { latitude: 12.9719, longitude: 77.5949, accuracy: 6, timestamp: now - 270000, speed: 1.4 },
    { latitude: 12.9722, longitude: 77.5952, accuracy: 4, timestamp: now - 240000, speed: 1.3 },
    { latitude: 12.9725, longitude: 77.5955, accuracy: 5, timestamp: now - 210000, speed: 1.4 },
    { latitude: 12.9728, longitude: 77.5958, accuracy: 5, timestamp: now - 180000, speed: 1.3 },
  ];

  const walkResult = AntiCheatService.validateActivity(walkingPoints, { type: 'WALK' });
  assert(walkResult.validationStatus === 'VALID', 'Normal walking activity classified as VALID');
  assert(walkResult.validPoints.length === 5, 'All 5 clean walking points preserved');
  assert(walkResult.confidenceScore >= 0.9, `High confidence score: ${walkResult.confidenceScore}`);

  // ----------------------------------------------------
  // TEST 2: Normal Running Activity (VALID)
  // ----------------------------------------------------
  console.log('\n2️⃣ Testing Normal Running Track (~11 km/h, 3.1 m/s)...');
  const runningPoints = [
    { latitude: 12.9716, longitude: 77.5946, accuracy: 4, timestamp: now - 300000, speed: 3.0 },
    { latitude: 12.9725, longitude: 77.5955, accuracy: 4, timestamp: now - 260000, speed: 3.2 },
    { latitude: 12.9735, longitude: 77.5965, accuracy: 5, timestamp: now - 220000, speed: 3.1 },
    { latitude: 12.9745, longitude: 77.5975, accuracy: 3, timestamp: now - 180000, speed: 3.3 },
    { latitude: 12.9755, longitude: 77.5985, accuracy: 4, timestamp: now - 140000, speed: 3.0 },
  ];

  const runResult = AntiCheatService.validateActivity(runningPoints, { type: 'RUN' });
  assert(runResult.validationStatus === 'VALID', 'Normal running activity classified as VALID');
  assert(runResult.validPoints.length === 5, 'All 5 clean running points preserved');
  assert(runResult.anomalies.rejectedCount === 0, 'Zero points rejected');

  // ----------------------------------------------------
  // TEST 3: Isolated GPS Noise (DO NOT Invalidate Whole Workout)
  // ----------------------------------------------------
  console.log('\n3️⃣ Testing Isolated GPS Noise Filter (Points with low accuracy > 45m)...');
  const noisyPoints = [
    { latitude: 12.9716, longitude: 77.5946, accuracy: 5, timestamp: now - 300000, speed: 3.0 },
    { latitude: 12.9725, longitude: 77.5955, accuracy: 4, timestamp: now - 260000, speed: 3.2 },
    // 1 Noisy Point with 120m accuracy error (e.g. under tree cover or bridge)
    { latitude: 12.9790, longitude: 77.6050, accuracy: 120, timestamp: now - 240000, speed: 8.0 },
    { latitude: 12.9735, longitude: 77.5965, accuracy: 5, timestamp: now - 220000, speed: 3.1 },
    { latitude: 12.9745, longitude: 77.5975, accuracy: 3, timestamp: now - 180000, speed: 3.3 },
  ];

  const noiseResult = AntiCheatService.validateActivity(noisyPoints, { type: 'RUN' });
  assert(noiseResult.validationStatus === 'VALID', 'Activity with 1 noisy point remains VALID (not unfairly rejected)');
  assert(noiseResult.anomalies.rejectedCount === 1, 'Single noisy point was safely filtered out');
  assert(noiseResult.validPoints.length === 4, 'Remaining 4 legitimate points retained for metrics');

  // ----------------------------------------------------
  // TEST 4: Single Sudden GPS Jump (SUSPICIOUS)
  // ----------------------------------------------------
  console.log('\n4️⃣ Testing Single Sudden GPS Jump (Flagged as SUSPICIOUS)...');
  const jumpPoints = [
    { latitude: 12.9716, longitude: 77.5946, accuracy: 5, timestamp: now - 300000, speed: 3.0 },
    { latitude: 12.9725, longitude: 77.5955, accuracy: 4, timestamp: now - 260000, speed: 3.2 },
    // Sudden leap 800m away
    { latitude: 12.9800, longitude: 77.6050, accuracy: 5, timestamp: now - 240000, speed: 40.0 },
    // Return to path and continue
    { latitude: 12.9735, longitude: 77.5965, accuracy: 4, timestamp: now - 220000, speed: 3.1 },
    { latitude: 12.9745, longitude: 77.5975, accuracy: 5, timestamp: now - 180000, speed: 3.0 },
  ];

  const jumpResult = AntiCheatService.validateActivity(jumpPoints, { type: 'RUN' });
  assert(jumpResult.validationStatus === 'SUSPICIOUS', 'Single sudden jump classified as SUSPICIOUS');
  assert(jumpResult.anomalies.teleportCount >= 1, 'Teleport jump anomaly detected and recorded');

  // ----------------------------------------------------
  // TEST 5: Repeated Teleportation / Mock Location (INVALID)
  // ----------------------------------------------------
  console.log('\n5️⃣ Testing Repeated Teleportation Spoofing (Classified as INVALID)...');
  const teleportPoints = [
    { latitude: 12.9716, longitude: 77.5946, accuracy: 5, timestamp: now - 300000, speed: 3.0 },
    // Teleport 1: Bangalore to Mysore (140 km in 2s)
    { latitude: 12.2958, longitude: 76.6394, accuracy: 5, timestamp: now - 298000, speed: 70000.0 },
    // Teleport 2: Mysore to London (8000 km in 2s)
    { latitude: 51.5074, longitude: -0.1657, accuracy: 5, timestamp: now - 296000, speed: 400000.0 },
  ];

  const teleportResult = AntiCheatService.validateActivity(teleportPoints, { type: 'RUN' });
  assert(teleportResult.validationStatus === 'INVALID', 'Repeated teleportation classified as INVALID');
  assert(teleportResult.anomalies.teleportCount >= 2, 'Multiple teleports flagged in anomaly report');

  // ----------------------------------------------------
  // TEST 6: Vehicle Travel Speeds (Car / Train > 60 km/h) (INVALID)
  // ----------------------------------------------------
  console.log('\n6️⃣ Testing Vehicle Travel Speed (Driving at 80 km/h)...');
  const vehiclePoints = [
    { latitude: 12.9716, longitude: 77.5946, accuracy: 5, timestamp: now - 300000 },
    { latitude: 12.9780, longitude: 77.6020, accuracy: 5, timestamp: now - 270000 }, // ~1 km in 30s = 120 km/h
    { latitude: 12.9850, longitude: 77.6100, accuracy: 5, timestamp: now - 240000 },
    { latitude: 12.9920, longitude: 77.6180, accuracy: 5, timestamp: now - 210000 },
  ];

  const vehicleResult = AntiCheatService.validateActivity(vehiclePoints, { type: 'RUN' });
  assert(vehicleResult.validationStatus === 'INVALID', 'Vehicle speed classified as INVALID');
  assert(vehicleResult.reasons.some((r) => r.includes('VEHICLE') || r.includes('IMPOSSIBLE_SPEED')), 'Vehicle speed reason recorded');

  // ----------------------------------------------------
  // TEST 7: Duplicate Coordinates / Static Jitter (Filtered Cleanly)
  // ----------------------------------------------------
  console.log('\n7️⃣ Testing Duplicate Coordinates & Stationary GPS Jitter...');
  const duplicatePoints = [
    { latitude: 12.9716, longitude: 77.5946, accuracy: 5, timestamp: now - 300000, speed: 2.5 },
    { latitude: 12.9716, longitude: 77.5946, accuracy: 5, timestamp: now - 299000, speed: 0.0 }, // exact duplicate (stopped at light)
    { latitude: 12.9716001, longitude: 77.5946001, accuracy: 5, timestamp: now - 298000, speed: 0.0 }, // 0.01m jitter
    { latitude: 12.9720, longitude: 77.5950, accuracy: 5, timestamp: now - 270000, speed: 2.6 },
    { latitude: 12.9725, longitude: 77.5955, accuracy: 5, timestamp: now - 240000, speed: 2.7 },
    { latitude: 12.9730, longitude: 77.5960, accuracy: 5, timestamp: now - 210000, speed: 2.8 },
    { latitude: 12.9735, longitude: 77.5965, accuracy: 5, timestamp: now - 180000, speed: 2.6 },
    { latitude: 12.9740, longitude: 77.5970, accuracy: 5, timestamp: now - 150000, speed: 2.5 },
  ];

  const dupResult = AntiCheatService.validateActivity(duplicatePoints, { type: 'RUN' });
  assert(dupResult.validationStatus === 'VALID', 'Activity with static jitter remains VALID after cleaning');
  assert(dupResult.anomalies.rejectedCount === 2, 'Duplicate stationary coordinates filtered out');
  assert(dupResult.validPoints.length === 6, 'Legitimate movement points retained');

  // ----------------------------------------------------
  // TEST 8: Timestamp Corruption / Time Travel (INVALID)
  // ----------------------------------------------------
  console.log('\n8️⃣ Testing Timestamp Corruption (Backwards Time Travel)...');
  const corruptTimePoints = [
    { latitude: 12.9716, longitude: 77.5946, accuracy: 5, timestamp: now - 100000 },
    { latitude: 12.9725, longitude: 77.5955, accuracy: 5, timestamp: now - 200000 }, // time went backwards by 100s!
    { latitude: 12.9735, longitude: 77.5965, accuracy: 5, timestamp: now - 50000 },
  ];

  const corruptResult = AntiCheatService.validateActivity(corruptTimePoints, { type: 'RUN' });
  assert(corruptResult.validationStatus === 'INVALID', 'Backwards timestamps classified as INVALID');
  assert(corruptResult.reasons.some((r) => r.includes('CORRUPTED') || r.includes('BACKWARD')), 'Corrupted timestamp reason logged');

  // ----------------------------------------------------
  // TEST 9: Invariant: Invalid/Suspicious Activities DO NOT Update Territory, Challenges, or Leaderboards
  // ----------------------------------------------------
  console.log('\n9️⃣ Testing Core Anti-Cheat Invariant: Non-VALID Activities MUST NOT Capture Territory or Score Points...');

  const initialHexCount = (await query(`SELECT count(*) as count FROM territory_cells WHERE current_owner_id = 'user-alex'`))[0].count;

  // Submit vehicle speed workout for Alex
  const fakeWorkout = await TerritoryCaptureService.processWorkout({
    userId: 'user-alex',
    type: 'RUN',
    gpsPoints: vehiclePoints,
  });

  assert(fakeWorkout.validationStatus === 'INVALID', 'Submission recognized as INVALID by TerritoryCaptureService');
  assert(fakeWorkout.cellsCoveredCount === 0, 'Zero territory cells awarded for invalid workout');
  assert(fakeWorkout.newCaptures === 0 && fakeWorkout.stolenCaptures === 0, 'No captures created');
  assert(fakeWorkout.challengeJustCompleted === false, 'No challenge progress granted');

  // Verify raw activity is still persisted in DB for audit
  const savedActivity = (await query(`SELECT * FROM activities WHERE id = $1`, [fakeWorkout.activity.id]))[0];
  assert(savedActivity !== undefined, 'Raw activity is preserved in database (not deleted)');
  assert(savedActivity.validation_status === 'INVALID', 'Database activity validation_status is INVALID');
  assert(savedActivity.distance === 0, 'Database activity distance recorded as 0 to prevent leaderboard corruption');

  // Verify territory count did not change
  const finalHexCount = (await query(`SELECT count(*) as count FROM territory_cells WHERE current_owner_id = 'user-alex'`))[0].count;
  assert(finalHexCount === initialHexCount, 'Alex territory count remained strictly unchanged');

  // ----------------------------------------------------
  // TEST 10: Configurable Anti-Cheat Rules
  // ----------------------------------------------------
  console.log('\n🔟 Testing Configurable Anti-Cheat Rule Parameters...');
  const customConfig = {
    MAX_RUN_SPEED_MS: 4.0, // Stricter custom speed ceiling
    MAX_ACCURACY_METERS: 20.0, // Stricter GPS accuracy
  };

  const customResult = AntiCheatService.validateActivity(
    [
      { latitude: 12.9716, longitude: 77.5946, accuracy: 30, timestamp: now - 300000 }, // would pass default 45m, fails custom 20m
      { latitude: 12.9735, longitude: 77.5965, accuracy: 10, timestamp: now - 280000 },
    ],
    { config: customConfig }
  );

  assert(customResult.anomalies.rejectedCount === 1, 'Custom config successfully applied and rejected 30m accuracy point');

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 9 ANTI-CHEAT TESTS PASSED (10/10 TEST SUITES)');
  console.log('======================================================\n');
}

runPhase9AntiCheatTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
