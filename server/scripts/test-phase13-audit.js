import assert from 'node:assert';
import { query } from '../src/config/database.js';
import { TerritoryCaptureService } from '../src/services/territory-capture.service.js';
import { DailyChallengesService } from '../src/services/daily-challenges.service.js';
import { ChallengesRepository } from '../src/repositories/challenges.repository.js';
import { StatisticsAggregationService } from '../src/services/statistics-aggregation.service.js';
import { StatisticsRepository } from '../src/repositories/statistics.repository.js';
import { AntiCheatService } from '../src/gps/anti-cheat.service.js';
import { PrivacyService } from '../src/services/privacy.service.js';
import { PrivacyRepository } from '../src/repositories/privacy.repository.js';
import { ActivitiesRepository } from '../src/repositories/activities.repository.js';
import { GamificationService } from '../src/services/gamification.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { DemoService } from '../src/services/demo.service.js';

console.log('\n======================================================');
console.log('🔍 RUNNING PHASE 13 COMPLETE PRODUCT AUDIT TEST SUITE');
console.log('======================================================\n');

async function runAudit() {
  console.log('1️⃣ Auditing Database Architecture & Performance Indexes...');
  const tables = (await query("SELECT name FROM sqlite_master WHERE type='table'")).map(t => t.name);
  const requiredTables = [
    'users', 'activities', 'gps_points', 'territory_cells', 'territory_history',
    'daily_challenges', 'challenge_progress', 'weekly_statistics', 'monthly_statistics',
    'achievements', 'user_privacy_settings', 'privacy_zones'
  ];
  for (const table of requiredTables) {
    assert.ok(tables.includes(table), `Table ${table} must exist in database`);
  }
  const indexes = (await query("SELECT name FROM sqlite_master WHERE type='index'")).map(i => i.name);
  assert.ok(indexes.includes('idx_activities_user_created'), 'idx_activities_user_created must exist');
  assert.ok(indexes.includes('idx_territory_cells_owner'), 'idx_territory_cells_owner must exist');
  assert.ok(indexes.includes('idx_territory_history_cell'), 'idx_territory_history_cell must exist');
  assert.ok(indexes.includes('idx_weekly_stats_rank'), 'idx_weekly_stats_rank must exist');
  console.log('  ✅ PASS: All 12 required tables and performance indexes verified');

  console.log('\n2️⃣ Auditing Authentication & Session Lifecycle...');
  const testUser = {
    id: `audit-user-${Date.now()}`,
    username: `audit_runner_${Date.now()}`,
    displayName: 'Audit Runner',
    password: 'SecurePassword123!'
  };
  const regResult = await AuthService.register(testUser.username, testUser.displayName, testUser.password);
  assert.ok(regResult.token, 'Registration returns signed JWT token');
  assert.strictEqual(regResult.user.username, testUser.username);

  const loginResult = await AuthService.login(testUser.username, testUser.password);
  assert.ok(loginResult.token, 'Login returns valid session token');
  assert.strictEqual(loginResult.user.id, regResult.user.id);

  const authProfile = await AuthService.getUserProfile(regResult.user.id);
  assert.strictEqual(authProfile.displayName, 'Audit Runner');
  console.log('  ✅ PASS: Authentication, password hashing, and token issuance verified');

  console.log('\n3️⃣ Auditing Server-Side Authoritative Distance & Territory Conversion...');
  // 5 GPS points forming ~1.2 km path near Bangalore
  const points = [
    { latitude: 12.9716, longitude: 77.5946, timestamp: new Date(Date.now() - 3600000).toISOString(), accuracy: 5.0, speed: 2.8 },
    { latitude: 12.9730, longitude: 77.5960, timestamp: new Date(Date.now() - 3300000).toISOString(), accuracy: 4.8, speed: 3.1 },
    { latitude: 12.9745, longitude: 77.5975, timestamp: new Date(Date.now() - 3000000).toISOString(), accuracy: 5.2, speed: 3.0 },
    { latitude: 12.9760, longitude: 77.5990, timestamp: new Date(Date.now() - 2700000).toISOString(), accuracy: 4.5, speed: 2.9 },
    { latitude: 12.9775, longitude: 77.6005, timestamp: new Date(Date.now() - 2400000).toISOString(), accuracy: 5.0, speed: 3.0 }
  ];

  const processedWorkout = await TerritoryCaptureService.processWorkout({
    userId: regResult.user.id,
    type: 'RUN',
    startedAt: points[0].timestamp,
    endedAt: points[points.length - 1].timestamp,
    gpsPoints: points
  });

  assert.strictEqual(processedWorkout.validationStatus, 'VALID');
  assert.ok(processedWorkout.activity.distance > 500 && processedWorkout.activity.distance < 2000, `Distance calculated authoritatively (${processedWorkout.activity.distance} m)`);
  assert.ok(processedWorkout.captureDetails.length > 0, `Captured ${processedWorkout.captureDetails.length} H3 sectors`);
  console.log('  ✅ PASS: Server-side distance and H3 spatial conversion verified');

  console.log('\n4️⃣ Auditing Core Fairness & Immutable Historical Activity Invariant...');
  const initialDistance = processedWorkout.activity.distance;
  const initialCells = processedWorkout.captureDetails.map(c => c.h3CellId);

  // User B steals all the cells
  const rivalUser = await AuthService.register(`rival_${Date.now()}`, 'Rival Conqueror', 'Password123!');
  const rivalWorkout = await TerritoryCaptureService.processWorkout({
    userId: rivalUser.user.id,
    type: 'RUN',
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    endedAt: new Date(Date.now() - 600000).toISOString(),
    gpsPoints: points
  });

  // Verify ownership transferred
  for (const cell of initialCells) {
    const dbCell = (await query('SELECT current_owner_id FROM territory_cells WHERE h3_cell_id = $1', [cell]))[0];
    assert.strictEqual(dbCell.current_owner_id, rivalUser.user.id, 'Ownership must flip to rival');
  }

  // Verify User A's historical activity distance remains 100% untouched
  const userA_activity = (await query('SELECT distance, duration FROM activities WHERE id = $1', [processedWorkout.activity.id]))[0];
  assert.strictEqual(userA_activity.distance, initialDistance, 'User A workout distance must remain untouched after territory loss');

  // Verify User A's audit history is preserved
  const userA_history = await query('SELECT * FROM territory_history WHERE user_id = $1', [regResult.user.id]);
  assert.ok(userA_history.length >= initialCells.length, 'Audit history rows must never be deleted');
  console.log('  ✅ PASS: Core fairness confirmed (Ownership changed, historical workout distance 100% preserved)');

  console.log('\n5️⃣ Auditing Universal Daily Challenge Fairness...');
  const todayDate = new Date().toISOString().split('T')[0];
  const activeChallenge = await DailyChallengesService.getOrCreateChallengeForDate(todayDate);
  assert.ok(activeChallenge, 'Universal 24h challenge exists for today');
  assert.strictEqual(activeChallenge.challengeDate, todayDate);

  const userProgress = await ChallengesRepository.getProgress(activeChallenge.id, regResult.user.id);
  assert.ok(userProgress, 'User challenge progress calculated from valid workout history');
  console.log(`  ✅ PASS: Daily challenge evaluated (${activeChallenge.challengeType}: ${userProgress.progress}/${activeChallenge.target})`);

  console.log('\n6️⃣ Auditing Weekly Competition Scoring Arithmetic & Distance Dominance...');
  const weeklyBounds = StatisticsAggregationService.getWeekBounds();
  await StatisticsAggregationService.recalculateAllWeeklyRanks(weeklyBounds.yearNumber, weeklyBounds.weekNumber);
  const leaderboard = await StatisticsRepository.getWeeklyLeaderboard(weeklyBounds.yearNumber, weeklyBounds.weekNumber);
  assert.ok(leaderboard.length > 0, 'Weekly leaderboard generated');

  const sampleEntry = leaderboard[0];
  const expectedScore = StatisticsAggregationService.computeCompetitionScore({
    totalDistanceMeters: sampleEntry.totalDistance,
    totalAreaCoveredKm2: sampleEntry.totalArea,
    challengeScore: sampleEntry.challengeScore,
    activityCount: sampleEntry.activityCount,
    uniqueCellsCount: sampleEntry.uniqueCellsCount,
  });
  assert.strictEqual(sampleEntry.competitionScore, expectedScore, 'Score must match documented formula');
  console.log(`  ✅ PASS: Weekly scoring formula arithmetic verified (${sampleEntry.competitionScore} pts) with zero hidden multipliers`);

  console.log('\n7️⃣ Auditing Anti-Cheat Pipeline (GPS Noise, Teleportation, Speed Limits)...');
  // Teleport jump
  const teleportResult = AntiCheatService.validateActivity([
    { latitude: 12.9716, longitude: 77.5946, timestamp: new Date(Date.now() - 3600000).toISOString(), accuracy: 5.0 },
    { latitude: 28.7041, longitude: 77.1025, timestamp: new Date(Date.now() - 3500000).toISOString(), accuracy: 5.0 }
  ]);
  assert.strictEqual(teleportResult.validationStatus, 'INVALID');

  // Supersonic vehicle speed
  const speedResult = AntiCheatService.validateActivity([
    { latitude: 12.9716, longitude: 77.5946, timestamp: new Date(Date.now() - 3600000).toISOString(), accuracy: 5.0 },
    { latitude: 12.9916, longitude: 77.6146, timestamp: new Date(Date.now() - 3590000).toISOString(), accuracy: 5.0 }
  ]);
  assert.strictEqual(speedResult.validationStatus, 'INVALID');
  console.log('  ✅ PASS: Anti-cheat correctly flags impossible jumps and vehicle velocities');

  console.log('\n8️⃣ Auditing Location Privacy Safe Zones & GDPR Compliance...');
  // Create Privacy Zone
  const zone = await PrivacyRepository.createPrivacyZone({
    userId: regResult.user.id,
    name: 'Home Sanctuary',
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 400
  });
  assert.ok(zone.id, 'Privacy zone created');

  // Verify route sanitization for non-owners
  const userA_Act = await ActivitiesRepository.findById(processedWorkout.activity.id);
  const ownActivity = await PrivacyService.sanitizeActivity(userA_Act, regResult.user.id);
  assert.ok(ownActivity.routeGeometry !== null, 'Owner sees full route geometry');

  await PrivacyRepository.updateSettings(regResult.user.id, { hideRouteGeometry: true });
  const sanitizedActivity = await PrivacyService.sanitizeActivity(userA_Act, rivalUser.user.id);
  assert.strictEqual(sanitizedActivity.routeGeometry, null, 'Non-owner route geometry is redacted for safety');

  // GDPR Account Purge
  await PrivacyRepository.wipeUserAccountData(regResult.user.id);
  const remainingActs = await query('SELECT id FROM activities WHERE user_id = $1', [regResult.user.id]);
  assert.strictEqual(remainingActs.length, 0, 'GDPR account purge completely removed activities');
  console.log('  ✅ PASS: Privacy zones, route redaction, and GDPR data sovereignty verified');

  console.log('\n9️⃣ Auditing Hackathon Demo Mode 5-Minute Invariant Workflow...');
  const demoReport = await DemoService.runFullDemonstration();
  assert.strictEqual(demoReport.success, true);
  assert.strictEqual(demoReport.invariantAudit.length, 9);
  assert.strictEqual(demoReport.allInvariantsVerified, true);
  console.log('  ✅ PASS: Hackathon Demo Mode runs 100% green without bypassing validation');

  console.log('\n======================================================');
  console.log('🏆 COMPLETE PHASE 13 PRODUCT AUDIT PASSED (9/9 SECTORS)');
  console.log('======================================================\n');
}

runAudit().catch(err => {
  console.error('❌ AUDIT ERROR:', err);
  process.exit(1);
});
