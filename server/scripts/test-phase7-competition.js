import assert from 'assert';
import { query } from '../src/config/database.js';
import { runMigrations } from '../src/db/migrate.js';
import { UsersRepository } from '../src/repositories/users.repository.js';
import { StatisticsRepository } from '../src/repositories/statistics.repository.js';
import { StatisticsAggregationService } from '../src/services/statistics-aggregation.service.js';
import { TerritoryCaptureService } from '../src/services/territory-capture.service.js';
import { ActivitiesRepository } from '../src/repositories/activities.repository.js';

function generateLinearGpsPoints(startLat, startLng, distanceKm, count = 10, startTimestamp = Date.now()) {
  const points = [];
  const kmPerLat = 1 / 111.32;
  const latStep = (distanceKm * kmPerLat) / (count - 1);
  const totalDurationSec = (distanceKm * 1000) / 3.0; // Human running pace: 3.0 m/s (~10.8 km/h)
  const timeStepMs = Math.round((totalDurationSec / (count - 1)) * 1000);

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

async function runPhase7Tests() {
  console.log('🏆 Starting Phase 7 Weekly & Monthly Fitness Competition Test Suite...\n');

  // 1. Run migrations
  await runMigrations();

  const runId = Date.now();
  const testDate = new Date();
  const { yearNumber, weekNumber } = StatisticsAggregationService.getWeekBounds(testDate);
  const monthNumber = testDate.getUTCMonth() + 1;

  // 2. Setup Test Athletes
  console.log('1️⃣ Setting up test athletes for competition...');
  const userRahul = await UsersRepository.create({
    id: `user-rahul-${runId}`,
    username: `rahul_${runId}`,
    displayName: 'Rahul Marathoner',
    avatar: '🔥',
    passwordHash: 'hash123',
  });

  const userShivaraj = await UsersRepository.create({
    id: `user-shivaraj-${runId}`,
    username: `shivaraj_${runId}`,
    displayName: 'Shivaraj Sprinter',
    avatar: '⚡',
    passwordHash: 'hash123',
  });

  const userPriya = await UsersRepository.create({
    id: `user-priya-${runId}`,
    username: `priya_${runId}`,
    displayName: 'Priya Walker',
    avatar: '🌿',
    passwordHash: 'hash123',
  });
  console.log('  ✅ Created test runners: Rahul, Shivaraj, and Priya');

  // 3. Test Core Rule: Historical Fitness Performance vs Momentary Territory
  // Rahul covers 20 km historically (e.g. 2 runs of 10 km)
  console.log('\n2️⃣ Logging Historical Workouts for Rahul (20 km total)...');
  const tRun1 = Date.now() - (6 * 3600 * 1000);
  const rahulPts1 = generateLinearGpsPoints(12.9716, 77.5946, 10.0, 20, tRun1);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-rahul-1-${runId}`,
    userId: userRahul.id,
    type: 'RUN',
    gpsPoints: rahulPts1,
    startedAt: new Date(tRun1).toISOString(),
    endedAt: new Date(tRun1 + 3333000).toISOString(),
  });

  const tRun2 = Date.now() - (3 * 3600 * 1000);
  const rahulPts2 = generateLinearGpsPoints(12.9816, 77.5946, 10.0, 20, tRun2);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-rahul-2-${runId}`,
    userId: userRahul.id,
    type: 'RUN',
    gpsPoints: rahulPts2,
    startedAt: new Date(tRun2).toISOString(),
    endedAt: new Date(tRun2 + 3333000).toISOString(),
  });

  // Shivaraj covers 12 km initial + 5 km steal = 17 km total
  console.log('  Logging Historical Workouts for Shivaraj (12 km initial)...');
  const tShiv1 = Date.now() - (4.5 * 3600 * 1000);
  const shivarajPts = generateLinearGpsPoints(40.7829, -73.9654, 12.0, 20, tShiv1);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-shivaraj-1-${runId}`,
    userId: userShivaraj.id,
    type: 'RUN',
    gpsPoints: shivarajPts,
    startedAt: new Date(tShiv1).toISOString(),
    endedAt: new Date(tShiv1 + 4000000).toISOString(),
  });

  // Priya covers 5 km historically
  console.log('  Logging Historical Workouts for Priya (5 km total)...');
  const tPriya1 = Date.now() - (2 * 3600 * 1000);
  const priyaPts = generateLinearGpsPoints(51.5074, -0.1657, 5.0, 15, tPriya1);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-priya-1-${runId}`,
    userId: userPriya.id,
    type: 'RUN',
    gpsPoints: priyaPts,
    startedAt: new Date(tPriya1).toISOString(),
    endedAt: new Date(tPriya1 + 1666000).toISOString(),
  });

  // 4. Territory Theft / Recapture scenario (Shivaraj adds 5 km and steals territory)
  console.log('\n3️⃣ Simulating Territory Theft (Shivaraj runs 5 km and steals Rahul’s hexagons)...');
  const tSteal = Date.now() - (1800 * 1000);
  const stealPts = generateLinearGpsPoints(12.9716, 77.5946, 5.0, 15, tSteal);
  await TerritoryCaptureService.processWorkout({
    activityId: `act-steal-${runId}`,
    userId: userShivaraj.id,
    type: 'RUN',
    gpsPoints: stealPts,
    startedAt: new Date(tSteal).toISOString(),
    endedAt: new Date(tSteal + 1666000).toISOString(),
  });

  // 5. Aggregate and Validate Weekly Competition Standings
  console.log('\n4️⃣ Computing Weekly Aggregations & Leaderboard Standings...');
  await StatisticsAggregationService.recalculateAllWeeklyRanks(yearNumber, weekNumber);

  const rahulStats = await StatisticsRepository.getWeeklyStatsByUserAndWeek(userRahul.id, yearNumber, weekNumber);
  const shivarajStats = await StatisticsRepository.getWeeklyStatsByUserAndWeek(userShivaraj.id, yearNumber, weekNumber);

  console.log(`  - Rahul Stats: Distance: ${(rahulStats.totalDistance / 1000).toFixed(1)} km, Current Hexes: ${rahulStats.territoryCount}, Score: ${rahulStats.competitionScore}, Rank: #${rahulStats.rank}`);
  console.log(`  - Shivaraj Stats: Distance: ${(shivarajStats.totalDistance / 1000).toFixed(1)} km, Current Hexes: ${shivarajStats.territoryCount}, Score: ${shivarajStats.competitionScore}, Rank: #${shivarajStats.rank}`);

  // 6. Assertions on the Core Historical Fairness Principle
  console.log('\n5️⃣ Verifying Prompt Example (Rahul 20 km ranks above Shivaraj despite fewer current hexes)...');
  assert(rahulStats.totalDistance > 19000, 'Rahul must have ~20 km recorded');
  assert(rahulStats.rank < shivarajStats.rank, 'Rahul (20 km) MUST rank higher (lower rank number) than Shivaraj (17 km + 5 km steal)');
  console.log('  ✅ PASS: Rahul ranks #1 above Shivaraj because historical distance dominates momentary territory');

  // 7. Verify Invariant: Territory loss does NOT decrease historical activity distance or duration
  console.log('\n6️⃣ Verifying Invariant: Lost territory does NOT reduce historical workout distance...');
  const rahulActs = await query('SELECT distance FROM activities WHERE user_id = $1', [userRahul.id]);
  const rahulTotalDist = rahulActs.reduce((sum, a) => sum + a.distance, 0);
  assert.strictEqual(rahulStats.totalDistance, rahulTotalDist, 'Weekly statistics must match full sum of historical activities');
  console.log('  ✅ PASS: 100% of Rahul’s historical activity distance remains fully intact after territory was stolen');

  // 8. Test Incomplete & Invalid Activity Exclusion
  console.log('\n7️⃣ Verifying Incomplete / Invalid Activity Exclusion...');
  await ActivitiesRepository.create({
    id: `act-invalid-${runId}`,
    userId: userRahul.id,
    type: 'RUN',
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    distance: 50000, // 50 km spoof
    duration: 100,
    areaCovered: 5.0,
    validationStatus: 'REJECTED', // Flagged by anti-cheat
  });

  await StatisticsAggregationService.recalculateAllWeeklyRanks(yearNumber, weekNumber);
  const rahulStatsAfterInvalid = await StatisticsRepository.getWeeklyStatsByUserAndWeek(userRahul.id, yearNumber, weekNumber);
  assert.strictEqual(rahulStatsAfterInvalid.totalDistance, rahulStats.totalDistance, 'Rejected activities must NOT be included in competition totals');
  console.log('  ✅ PASS: Invalid/rejected activities correctly excluded from competition leaderboard');

  // 9. Test Monthly Competition Aggregation
  console.log('\n8️⃣ Verifying Monthly Competition Aggregation...');
  await StatisticsAggregationService.recalculateAllMonthlyRanks(yearNumber, monthNumber);
  const monthlyLeaderboard = await StatisticsRepository.getMonthlyLeaderboard(yearNumber, monthNumber);
  assert(monthlyLeaderboard.length >= 3, 'Monthly leaderboard must contain competitors');
  console.log(`  ✅ PASS: Monthly competition calculated with ${monthlyLeaderboard.length} athletes ranked`);

  // 10. Test Transparent Scoring Formula Accuracy
  console.log('\n9️⃣ Verifying Transparent Scoring Formula Arithmetic...');
  const expectedScore = StatisticsAggregationService.computeCompetitionScore({
    totalDistanceMeters: rahulStats.totalDistance,
    totalAreaCoveredKm2: rahulStats.totalArea,
    challengeScore: rahulStats.challengeScore,
    activityCount: rahulStats.activityCount,
    uniqueCellsCount: rahulStats.uniqueCellsCount,
  });
  assert.strictEqual(rahulStats.competitionScore, expectedScore, 'Competition score must match documented formula');
  console.log(`  ✅ PASS: Exact formula match (Expected: ${expectedScore}, Actual: ${rahulStats.competitionScore})`);

  console.log('\n======================================================');
  console.log('🎉 Phase 7 Weekly & Monthly Competition: ALL 8/8 TESTS PASSED!');
  console.log('======================================================\n');
}

runPhase7Tests().catch((err) => {
  console.error('❌ Phase 7 Test Failure:', err);
  process.exit(1);
});
