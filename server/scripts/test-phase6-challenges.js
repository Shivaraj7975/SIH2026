import assert from 'assert';
import { query } from '../src/config/database.js';
import { runMigrations } from '../src/db/migrate.js';
import { UsersRepository } from '../src/repositories/users.repository.js';
import { ChallengesRepository } from '../src/repositories/challenges.repository.js';
import { DailyChallengesService, CHALLENGE_CONFIG_POOL } from '../src/services/daily-challenges.service.js';
import { TerritoryCaptureService } from '../src/services/territory-capture.service.js';

function generateLinearGpsPoints(startLat, startLng, distanceKm, count = 10, startTimestamp = Date.now()) {
  const points = [];
  const kmPerLat = 1 / 111.32;
  const latStep = (distanceKm * kmPerLat) / (count - 1);
  const timeStepMs = 10000;

  for (let i = 0; i < count; i++) {
    points.push({
      latitude: startLat + i * latStep,
      longitude: startLng,
      timestamp: startTimestamp + i * timeStepMs,
      accuracy: 5.0,
      speed: 3.0,
    });
  }
  return points;
}

async function runPhase6Tests() {
  console.log('🧪 Starting Phase 6 Daily Fitness Challenges Test Suite...\n');

  // 1. Run database migrations
  await runMigrations();

  // 2. Setup Test Athlete Accounts
  console.log('1️⃣ Setting up test athlete accounts...');
  const userMorning = await UsersRepository.create({
    id: 'user-morning-runner',
    username: 'morning_runner',
    displayName: 'Rahul Earlybird',
    avatar: '🌅',
    passwordHash: 'hash123',
  });

  const userAfternoon = await UsersRepository.create({
    id: 'user-afternoon-runner',
    username: 'afternoon_runner',
    displayName: 'Maya Midday',
    avatar: '☀️',
    passwordHash: 'hash123',
  });

  const userEvening = await UsersRepository.create({
    id: 'user-evening-runner',
    username: 'evening_runner',
    displayName: 'Shivaraj Nightowl',
    avatar: '🌙',
    passwordHash: 'hash123',
  });
  console.log('  ✅ Created morning, afternoon, and evening test runners');

  // 3. Test Daily Challenge Generation & Configuration Pool (10+ Templates)
  console.log('\n2️⃣ Testing Challenge Configuration Pool (10+ Templates)...');
  assert(CHALLENGE_CONFIG_POOL.length >= 10, `Pool must have at least 10 configurations (found: ${CHALLENGE_CONFIG_POOL.length})`);
  console.log(`  ✅ Configuration pool contains ${CHALLENGE_CONFIG_POOL.length} realistic challenge templates across DISTANCE, AREA, UNIQUE_CELLS, ACTIVE_DURATION`);

  // 4. Test 1: DISTANCE Challenge (Fairness & Time-of-Day Independence)
  console.log('\n3️⃣ Testing DISTANCE Challenge: Morning vs Afternoon vs Evening Fairness...');
  const distDate = '2026-09-20';
  const distChallenge = await ChallengesRepository.createDailyChallenge({
    id: `challenge-${distDate}`,
    challengeDate: distDate,
    challengeType: 'DISTANCE',
    target: 3000, // 3.0 km
    configuration: {
      title: 'Morning Blitz 3K',
      description: 'Cover 3.0 km of verified running or walking.',
      unit: 'meters',
      displayTarget: '3.0 km',
      xpBonus: 200,
    },
    startTime: `${distDate}T00:00:00.000Z`,
    endTime: `${distDate}T23:59:59.999Z`,
  });

  const runId = Date.now();

  // Morning Runner at 06:00 UTC (runs 3.5 km)
  const morningTime = new Date(`${distDate}T06:00:00.000Z`).getTime();
  const morningPoints = generateLinearGpsPoints(12.9716, 77.5946, 3.5, 15, morningTime);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-dist-morning-6am-${runId}`,
    userId: userMorning.id,
    type: 'RUN',
    gpsPoints: morningPoints,
    startedAt: new Date(morningTime).toISOString(),
    endedAt: new Date(morningTime + 150000).toISOString(),
  });
  const morningProg = await ChallengesRepository.getProgress(distChallenge.id, userMorning.id);
  console.log(`  - Morning Participant (6:00 AM): ${morningProg.progress}m, Completed: ${morningProg.completed}, XP: ${morningProg.score}`);
  assert(morningProg.completed, 'Morning runner must complete 3K challenge');
  assert.strictEqual(morningProg.score, 200, 'Morning runner must receive 200 XP');

  // Afternoon Runner at 14:00 UTC (runs 3.5 km)
  const afternoonTime = new Date(`${distDate}T14:00:00.000Z`).getTime();
  const afternoonPoints = generateLinearGpsPoints(40.7829, -73.9654, 3.5, 15, afternoonTime);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-dist-afternoon-2pm-${runId}`,
    userId: userAfternoon.id,
    type: 'RUN',
    gpsPoints: afternoonPoints,
    startedAt: new Date(afternoonTime).toISOString(),
    endedAt: new Date(afternoonTime + 150000).toISOString(),
  });
  const afternoonProg = await ChallengesRepository.getProgress(distChallenge.id, userAfternoon.id);
  console.log(`  - Afternoon Participant (2:00 PM): ${afternoonProg.progress}m, Completed: ${afternoonProg.completed}, XP: ${afternoonProg.score}`);
  assert(afternoonProg.completed, 'Afternoon runner must complete 3K challenge');
  assert.strictEqual(afternoonProg.score, 200, 'Afternoon runner must receive 200 XP');

  // Evening Runner at 22:00 UTC (runs 3.5 km)
  const eveningTime = new Date(`${distDate}T22:00:00.000Z`).getTime();
  const eveningPoints = generateLinearGpsPoints(51.5074, -0.1657, 3.5, 15, eveningTime);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-dist-evening-10pm-${runId}`,
    userId: userEvening.id,
    type: 'RUN',
    gpsPoints: eveningPoints,
    startedAt: new Date(eveningTime).toISOString(),
    endedAt: new Date(eveningTime + 150000).toISOString(),
  });
  const eveningProg = await ChallengesRepository.getProgress(distChallenge.id, userEvening.id);
  console.log(`  - Evening Participant (10:00 PM): ${eveningProg.progress}m, Completed: ${eveningProg.completed}, XP: ${eveningProg.score}`);
  assert(eveningProg.completed, 'Evening runner must complete 3K challenge');
  assert.strictEqual(eveningProg.score, 200, 'Evening runner must receive 200 XP');

  // Core Fairness Validation
  assert.strictEqual(morningProg.score, eveningProg.score, 'Morning and Evening runners must receive identical score/XP');
  console.log('  ✅ PASS: Core Fairness verified (Morning at 6 AM, Afternoon at 2 PM, Evening at 10 PM receive equal credit)');

  // 5. Test 2: Double-Counting Prevention
  console.log('\n4️⃣ Testing Duplicate Activity & Double-Counting Prevention...');
  const preDist = eveningProg.progress;
  await DailyChallengesService.updateUserProgress(distChallenge, userEvening.id);
  const postDist = await ChallengesRepository.getProgress(distChallenge.id, userEvening.id);
  assert.strictEqual(postDist.progress, preDist, 'Progress must not double-count on repeated execution');
  console.log('  ✅ PASS: Idempotent activity evaluation prevents double-counting');

  // 6. Test 3: AREA Challenge
  console.log('\n5️⃣ Testing AREA Challenge Type...');
  const areaDate = '2026-09-21';
  const areaChallenge = await ChallengesRepository.createDailyChallenge({
    id: `challenge-${areaDate}`,
    challengeDate: areaDate,
    challengeType: 'AREA',
    target: 50000, // 50,000 m²
    configuration: {
      title: 'Sector Expansion',
      description: 'Cover at least 50,000 m² of geographical area.',
      unit: 'm²',
      xpBonus: 250,
    },
    startTime: `${areaDate}T00:00:00.000Z`,
    endTime: `${areaDate}T23:59:59.999Z`,
  });

  const areaTime = new Date(`${areaDate}T09:00:00.000Z`).getTime();
  const areaPoints = generateLinearGpsPoints(12.9716, 77.5946, 4.0, 15, areaTime);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-area-test-${runId}`,
    userId: userMorning.id,
    type: 'RUN',
    gpsPoints: areaPoints,
    startedAt: new Date(areaTime).toISOString(),
    endedAt: new Date(areaTime + 180000).toISOString(),
  });

  const areaProg = await ChallengesRepository.getProgress(areaChallenge.id, userMorning.id);
  console.log(`  - Area Challenge Progress: ${areaProg.progress} m², Completed: ${areaProg.completed}`);
  assert(areaProg.progress >= 50000, 'Area covered must satisfy target');
  assert(areaProg.completed, 'Area challenge must be marked completed');
  console.log('  ✅ PASS: AREA challenge correctly evaluated from valid workout area');

  // 7. Test 4: UNIQUE_CELLS Challenge
  console.log('\n6️⃣ Testing UNIQUE_CELLS Challenge Type...');
  const cellsDate = '2026-09-22';
  const cellsChallenge = await ChallengesRepository.createDailyChallenge({
    id: `challenge-${cellsDate}`,
    challengeDate: cellsDate,
    challengeType: 'UNIQUE_CELLS',
    target: 5, // 5 unique hexes
    configuration: {
      title: 'Hex Explorer',
      description: 'Pass through at least 5 unique hexagons today.',
      unit: 'cells',
      xpBonus: 200,
    },
    startTime: `${cellsDate}T00:00:00.000Z`,
    endTime: `${cellsDate}T23:59:59.999Z`,
  });

  const cellsTime = new Date(`${cellsDate}T11:00:00.000Z`).getTime();
  const cellsPoints = generateLinearGpsPoints(12.9716, 77.5946, 3.0, 12, cellsTime);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-cells-test-${runId}`,
    userId: userMorning.id,
    type: 'RUN',
    gpsPoints: cellsPoints,
    startedAt: new Date(cellsTime).toISOString(),
    endedAt: new Date(cellsTime + 120000).toISOString(),
  });

  const cellsProg = await ChallengesRepository.getProgress(cellsChallenge.id, userMorning.id);
  console.log(`  - Unique Cells Progress: ${cellsProg.progress} hexes, Completed: ${cellsProg.completed}`);
  assert(cellsProg.progress >= 5, 'Must have visited at least 5 unique cells');
  assert(cellsProg.completed, 'Unique cells challenge must be marked completed');
  console.log('  ✅ PASS: UNIQUE_CELLS challenge correctly evaluated from distinct cell encounters');

  // 8. Test 5: ACTIVE_DURATION Challenge
  console.log('\n7️⃣ Testing ACTIVE_DURATION Challenge Type...');
  const durDate = '2026-09-23';
  const durChallenge = await ChallengesRepository.createDailyChallenge({
    id: `challenge-${durDate}`,
    challengeDate: durDate,
    challengeType: 'ACTIVE_DURATION',
    target: 1200, // 20 minutes (1200 seconds)
    configuration: {
      title: 'Cadence Booster',
      description: 'Log 20 minutes of active workout movement.',
      unit: 'seconds',
      xpBonus: 250,
    },
    startTime: `${durDate}T00:00:00.000Z`,
    endTime: `${durDate}T23:59:59.999Z`,
  });

  const durTime = new Date(`${durDate}T16:00:00.000Z`).getTime();
  const durPoints = generateLinearGpsPoints(12.9716, 77.5946, 2.0, 10, durTime);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-dur-test-${runId}`,
    userId: userMorning.id,
    type: 'RUN',
    gpsPoints: durPoints,
    startedAt: new Date(durTime).toISOString(),
    endedAt: new Date(durTime + 1500000).toISOString(),
    customMetrics: { distanceMeters: 2000, durationSeconds: 1500, speedMps: 1.33, uniqueCells: ['886189255bfffff'] },
  });

  const durProg = await ChallengesRepository.getProgress(durChallenge.id, userMorning.id);
  console.log(`  - Active Duration Progress: ${durProg.progress}s, Completed: ${durProg.completed}`);
  assert(durProg.progress >= 1200, 'Must have accumulated 1200 seconds of active duration');
  assert(durProg.completed, 'Active duration challenge must be marked completed');
  console.log('  ✅ PASS: ACTIVE_DURATION challenge correctly evaluated from activity duration');

  // 9. Test Challenge History & Leaderboard
  console.log('\n8️⃣ Testing Challenge History & Live Leaderboard...');
  const leaderboard = await ChallengesRepository.getTodaysLeaderboard(distChallenge.id);
  assert(leaderboard.length >= 3, 'Leaderboard must contain all 3 participants');
  console.log(`  ✅ Leaderboard returned ${leaderboard.length} ranked participants for ${distDate}`);

  const history = await ChallengesRepository.getChallengeHistory(userMorning.id, 10);
  assert(history.length >= 4, `History must return at least 4 daily challenges (found: ${history.length})`);
  console.log(`  ✅ User challenge history returned ${history.length} daily challenge records with completion breakdown`);

  // 10. Test Day-End Finalization & Expiration
  console.log('\n9️⃣ Testing Day-End Finalization & Next Day Preparation...');
  const finalizeResult = await DailyChallengesService.finalizeDay(distDate);
  assert.strictEqual(finalizeResult.finalizedChallenge.isFinalized, true, 'Challenge must be marked finalized');
  assert(finalizeResult.nextChallenge, 'Must automatically generate next day challenge');
  console.log(`  ✅ Successfully finalized ${distDate} and prepared next day challenge (${finalizeResult.nextChallenge.challengeDate}: "${finalizeResult.nextChallenge.configuration.title}")`);

  console.log('\n======================================================');
  console.log('🎉 Phase 6 Daily Fitness Challenges: ALL 9/9 TEST SUITES PASSED!');
  console.log('======================================================\n');
}

runPhase6Tests().catch((err) => {
  console.error('❌ Phase 6 Test Failure:', err);
  process.exit(1);
});
