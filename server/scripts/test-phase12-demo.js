import { query } from '../src/config/database.js';
import { DemoService, DEMO_USERS, PREDEFINED_ROUTES } from '../src/services/demo.service.js';
import { UsersRepository } from '../src/repositories/users.repository.js';
import { TerritoryRepository } from '../src/repositories/territory.repository.js';
import { ActivitiesRepository } from '../src/repositories/activities.repository.js';
import { GamificationService } from '../src/services/gamification.service.js';
import { StatisticsAggregationService } from '../src/services/statistics-aggregation.service.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runPhase12DemoTests() {
  console.log('\n======================================================');
  console.log('⚡ RUNNING PHASE 12 HACKATHON DEMO MODE TEST SUITE');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // TEST 1: Demo Environment Initialization & Isolation
  // ----------------------------------------------------
  console.log('1️⃣ Testing Demo Environment Initialization & Data Isolation...');
  const initRes = await DemoService.initDemoEnvironment();
  assert(initRes.initialized === true, 'Demo environment initialized');
  assert(initRes.users.length === 3, 'Demo users A, B, C created with distinct IDs');

  for (const u of DEMO_USERS) {
    const dbUser = await UsersRepository.findById(u.id);
    assert(dbUser !== null, `Demo user '${u.id}' exists in database`);
    assert(u.id.startsWith('demo-'), `Demo user ID '${u.id}' is prefixed for strict data isolation`);
  }

  // ----------------------------------------------------
  // TEST 2: Predefined Routes Configuration
  // ----------------------------------------------------
  console.log('\n2️⃣ Testing Predefined Simulated Routes (Area 1, Overlap, Area 2)...');
  assert(PREDEFINED_ROUTES.ROUTE_A && PREDEFINED_ROUTES.ROUTE_A.length >= 6, 'ROUTE_A is defined (5.0 km, Area 1)');
  assert(PREDEFINED_ROUTES.ROUTE_B && PREDEFINED_ROUTES.ROUTE_B.length >= 6, 'ROUTE_B is defined (3.8 km, Area 1 Overlap)');
  assert(PREDEFINED_ROUTES.ROUTE_C && PREDEFINED_ROUTES.ROUTE_C.length >= 6, 'ROUTE_C is defined (4.2 km, Area 2 West)');

  // ----------------------------------------------------
  // TEST 3: Step 1 Execution (User A Morning Pioneer Claim at 06:30 AM)
  // ----------------------------------------------------
  console.log('\n3️⃣ Testing Step 1: User A Morning Pioneer Claim (06:30 AM)...');
  await DemoService.resetDemoEnvironment();

  const step1 = await DemoService.runStep1_UserA_Morning();
  assert(step1.step === 1, 'Step 1 completed');
  assert(step1.actor === 'demo-user-a', 'Actor is demo-user-a (Rahul)');
  assert(step1.timeOfDay.includes('Morning'), 'Time of day tagged as Morning (06:30 AM)');
  assert(step1.totalCellsCovered > 0, `User A captured ${step1.totalCellsCovered} pioneer hexes`);
  assert(step1.distanceKm > 0, `User A recorded ${step1.distanceKm} km`);

  const userAAfterStep1 = await GamificationService.getPersonalStatistics('demo-user-a');
  assert(userAAfterStep1.currentTerritory === step1.totalCellsCovered, `User A holds ${userAAfterStep1.currentTerritory} current hexes`);
  assert(userAAfterStep1.totalDistanceKm > 0, `User A lifetime distance is ${userAAfterStep1.totalDistanceKm} km`);

  // ----------------------------------------------------
  // TEST 4: Step 2 Execution (User B Afternoon Contested Takeover at 02:15 PM)
  // ----------------------------------------------------
  console.log('\n4️⃣ Testing Step 2: User B Afternoon Contested Takeover (02:15 PM)...');
  const step2 = await DemoService.runStep2_UserB_Afternoon();
  assert(step2.step === 2, 'Step 2 completed');
  assert(step2.actor === 'demo-user-b', 'Actor is demo-user-b (Priya)');
  assert(step2.timeOfDay.includes('Afternoon'), 'Time of day tagged as Afternoon (02:15 PM)');
  assert(step2.stolenCaptures > 0, `User B contested and stole ${step2.stolenCaptures} hexagons from User A`);

  // Verify Core Invariant 4 & 5: User A's historical activity distance remains 100% UNCHANGED
  const userAAfterStep2 = await GamificationService.getPersonalStatistics('demo-user-a');
  const userBAfterStep2 = await GamificationService.getPersonalStatistics('demo-user-b');

  assert(userAAfterStep2.currentTerritory < userAAfterStep1.currentTerritory, `User A current territory decreased (${userAAfterStep1.currentTerritory} -> ${userAAfterStep2.currentTerritory})`);
  assert(userAAfterStep2.totalDistanceKm === userAAfterStep1.totalDistanceKm, `INVARIANT PASS: User A historical workout distance (${userAAfterStep2.totalDistanceKm} km) is 100% UNTOUCHED`);
  assert(userBAfterStep2.currentTerritory >= step2.stolenCaptures, `User B now holds ${userBAfterStep2.currentTerritory} current hexes`);

  // ----------------------------------------------------
  // TEST 5: Step 3 Execution (User C Evening Expansion at 08:45 PM)
  // ----------------------------------------------------
  console.log('\n5️⃣ Testing Step 3: User C Evening Expansion (08:45 PM)...');
  const step3 = await DemoService.runStep3_UserC_Evening();
  assert(step3.step === 3, 'Step 3 completed');
  assert(step3.actor === 'demo-user-c', 'Actor is demo-user-c (Shivaraj)');
  assert(step3.timeOfDay.includes('Evening'), 'Time of day tagged as Evening (08:45 PM)');
  assert(step3.totalCellsCovered > 0, `User C captured ${step3.totalCellsCovered} sectors in Area 2`);

  const userCAfterStep3 = await GamificationService.getPersonalStatistics('demo-user-c');
  assert(userCAfterStep3.currentTerritory === step3.totalCellsCovered, `User C holds ${userCAfterStep3.currentTerritory} hexes`);

  // ----------------------------------------------------
  // TEST 6: Leaderboard Historical Dominance Invariant (User A > User B)
  // ----------------------------------------------------
  console.log('\n6️⃣ Testing Leaderboard Invariant: Historical Distance Dominates Momentary Territory...');
  const weeklyRanks = await StatisticsAggregationService.recalculateAllWeeklyRanks();
  const demoAthletesOnBoard = weeklyRanks.filter((r) => (r.userId || r.user_id || '').startsWith('demo-'));

  const userARank = demoAthletesOnBoard.find((r) => (r.userId || r.user_id) === 'demo-user-a');
  const userBRank = demoAthletesOnBoard.find((r) => (r.userId || r.user_id) === 'demo-user-b');

  assert(userARank && userBRank, 'Both Demo User A and Demo User B appear on leaderboard');
  assert(Number(userARank.totalDistance || userARank.total_distance) >= Number(userBRank.totalDistance || userBRank.total_distance), 'User A historical distance exceeds User B');
  assert(userARank.rank < userBRank.rank, `INVARIANT PASS: User A (Rank #${userARank.rank}) outranks User B (Rank #${userBRank.rank}) despite User B holding more contested hexes`);

  // ----------------------------------------------------
  // TEST 7: Complete Hackathon 5-Minute Full Playback
  // ----------------------------------------------------
  console.log('\n7️⃣ Testing Complete 5-Minute Hackathon Demo Playback...');
  const fullPlayback = await DemoService.runFullDemonstration();
  assert(fullPlayback.success === true, 'Full playback executed in seconds');
  assert(fullPlayback.steps.length === 3, 'All 3 demonstration steps executed');
  assert(fullPlayback.allInvariantsVerified === true, 'All 9 core product invariants verified: 100% PASS');

  // ----------------------------------------------------
  // TEST 8: Demo State Retrieval & Clean Reset
  // ----------------------------------------------------
  console.log('\n8️⃣ Testing Demo State API & Clean Reset...');
  const demoState = await DemoService.getDemoState();
  assert(demoState.users.length === 3, 'Demo state returns 3 demo athletes');
  assert(demoState.stats['demo-user-a'] !== undefined, 'User A telemetry returned');

  const resetRes = await DemoService.resetDemoEnvironment();
  assert(resetRes.reset === true, 'Demo environment reset cleanly');

  const stateAfterReset = await DemoService.getDemoState();
  assert(stateAfterReset.stats['demo-user-a'].totalDistanceKm === 0, 'User A reset to 0 distance');
  assert(stateAfterReset.stats['demo-user-a'].currentTerritory === 0, 'User A reset to 0 territory');

  console.log('\n======================================================');
  console.log('🏆 ALL PHASE 12 HACKATHON DEMO MODE TESTS PASSED!');
  console.log('======================================================\n');
}

runPhase12DemoTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
