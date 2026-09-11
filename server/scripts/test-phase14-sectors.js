import { initDatabase, query } from '../src/config/database.js';
import { runMigrations } from '../src/db/migrate.js';
import { UsersRepository } from '../src/repositories/users.repository.js';
import { StatisticsAggregationService } from '../src/services/statistics-aggregation.service.js';
import { TerritoryCaptureService } from '../src/services/territory-capture.service.js';
import { authenticateUser } from '../src/services/auth.service.js';

async function runPhase14Verification() {
  console.log('🏁 Starting Phase 14: Auth, Sectors & Territory Invariants Test Suite...\n');
  initDatabase();
  await runMigrations();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Test Auth Authentication
    console.log('\n--- 1. Authentication Verification ---');
    const user = await authenticateUser('shivaraj', 'password123');
    assert(user && user.id === 'user-shivaraj', 'authenticateUser succeeds for valid runner credentials');

    // 2. Test Enriched Profile stats
    console.log('\n--- 2. Enriched Profile Invariants ---');
    const enriched = await UsersRepository.getEnrichedUserProfile('user-shivaraj');
    assert(enriched !== null, 'getEnrichedUserProfile returns profile');
    assert(typeof enriched.totalAreaCapturedM2 === 'number', 'enriched profile has totalAreaCapturedM2');
    assert(typeof enriched.currentHoldingAreaM2 === 'number', 'enriched profile has currentHoldingAreaM2');
    assert(typeof enriched.totalDistanceKm === 'number', 'enriched profile has totalDistanceKm');

    // 3. Test Leaderboard Data with the 3 Sectors
    console.log('\n--- 3. Leaderboard 3-Sector Verification ---');
    const dailyDist = await StatisticsAggregationService.getLeaderboardData({ timeframe: 'daily', sector: 'distance' });
    assert(Array.isArray(dailyDist), 'Daily leaderboard returns array');
    assert(dailyDist.length > 0, 'Daily leaderboard has competitors');
    const firstDaily = dailyDist[0];
    assert('distanceKm' in firstDaily, 'Daily entry contains distanceKm sector');
    assert('currentHoldingAreaM2' in firstDaily, 'Daily entry contains currentHoldingAreaM2 sector');
    assert('totalAreaCapturedM2' in firstDaily, 'Daily entry contains totalAreaCapturedM2 sector');

    const weeklyHolding = await StatisticsAggregationService.getLeaderboardData({ timeframe: 'weekly', sector: 'holding' });
    assert(Array.isArray(weeklyHolding), 'Weekly leaderboard returns array');
    const firstWeeklyHolding = weeklyHolding[0];
    assert('currentHoldingAreaM2' in firstWeeklyHolding, 'Weekly entry contains currentHoldingAreaM2 sector');

    const weeklyTotal = await StatisticsAggregationService.getLeaderboardData({ timeframe: 'weekly', sector: 'total_area' });
    assert(Array.isArray(weeklyTotal), 'Weekly total area leaderboard returns array');
    assert('totalAreaCapturedM2' in weeklyTotal[0], 'Weekly entry contains totalAreaCapturedM2 sector');

    // 4. Test Monotonic Total Area Captured Invariant
    console.log('\n--- 4. Monotonic Total Area Captured Invariant ---');
    // Record baseline for User Shivaraj
    const userShivarajBefore = await UsersRepository.getEnrichedUserProfile('user-shivaraj');
    const initialTotalCaptured = userShivarajBefore.totalAreaCapturedM2;
    console.log(`  Initial Shivaraj Total Area Captured: ${initialTotalCaptured} m²`);
    console.log(`  Initial Shivaraj Current Holding: ${userShivarajBefore.currentHoldingAreaM2} m²`);

    // Let Rahul run a loop in Bangalore that overlaps
    const rahulLoop = [
      { latitude: 12.97100, longitude: 77.59440, timestamp: Date.now() - 30000, accuracy: 5 },
      { latitude: 12.97120, longitude: 77.59470, timestamp: Date.now() - 20000, accuracy: 5 },
      { latitude: 12.97140, longitude: 77.59455, timestamp: Date.now() - 10000, accuracy: 5 },
      { latitude: 12.97100, longitude: 77.59440, timestamp: Date.now(), accuracy: 5 },
    ];

    const captureResult = await TerritoryCaptureService.processWorkout({
      userId: 'user-rahul',
      type: 'RUN',
      gpsPoints: rahulLoop,
      startedAt: new Date(Date.now() - 30000).toISOString(),
      endedAt: new Date().toISOString(),
    });

    console.log(`  Rahul captured ${captureResult.cellsCoveredCount} cells (${captureResult.stolenCaptures} takeovers)`);

    // Check Shivaraj's Total Area Captured again
    const userShivarajAfter = await UsersRepository.getEnrichedUserProfile('user-shivaraj');
    console.log(`  Post-Capture Shivaraj Total Area Captured: ${userShivarajAfter.totalAreaCapturedM2} m²`);
    console.log(`  Post-Capture Shivaraj Current Holding: ${userShivarajAfter.currentHoldingAreaM2} m²`);

    assert(
      userShivarajAfter.totalAreaCapturedM2 >= initialTotalCaptured,
      'INVARIANT PRESERVED: Shivaraj Total Area Captured NEVER decreases even when rival claims cells'
    );

    console.log(`\n========================================`);
    console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runPhase14Verification();
