import { query } from '../src/config/database.js';
import { GamificationService, ACHIEVEMENT_DEFINITIONS } from '../src/services/gamification.service.js';
import { TerritoryCaptureService } from '../src/services/territory-capture.service.js';
import { UsersRepository } from '../src/repositories/users.repository.js';
import { AchievementsRepository } from '../src/repositories/achievements.repository.js';
import { ActivitiesRepository } from '../src/repositories/activities.repository.js';
import { TerritoryRepository } from '../src/repositories/territory.repository.js';
import { StatisticsAggregationService } from '../src/services/statistics-aggregation.service.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runPhase10GamificationTests() {
  console.log('\n======================================================');
  console.log('🎮 RUNNING PHASE 10 GAMIFICATION & FITNESS TEST SUITE');
  console.log('======================================================\n');

  // Setup test athlete
  const testUserId = 'user-phase10-athlete';
  await query(`DELETE FROM achievements WHERE user_id = $1`, [testUserId]);
  await query(`DELETE FROM territory_history WHERE user_id = $1`, [testUserId]);
  await query(`DELETE FROM territory_cells WHERE current_owner_id = $1`, [testUserId]);
  await query(`DELETE FROM activities WHERE user_id = $1`, [testUserId]);
  await query(`DELETE FROM weekly_statistics WHERE user_id = $1`, [testUserId]);
  await query(`DELETE FROM monthly_statistics WHERE user_id = $1`, [testUserId]);
  await query(`DELETE FROM users WHERE id = $1`, [testUserId]);

  await UsersRepository.create({
    id: testUserId,
    username: 'phase10_runner',
    displayName: 'Phase10 Athlete',
    email: 'athlete10@geofit.internal',
    passwordHash: 'hashed_pwd_10',
    avatar: '⚡',
    weeklyScore: 0,
    currentTerritoryCount: 0,
  });

  // ----------------------------------------------------
  // TEST 1: Achievement Definitions Validation (9 Defined Badges)
  // ----------------------------------------------------
  console.log('1️⃣ Validating 9 Core Achievement Definitions...');
  assert(ACHIEVEMENT_DEFINITIONS.length === 9, `All 9 achievements defined (found ${ACHIEVEMENT_DEFINITIONS.length})`);
  
  const expectedTypes = [
    'FIRST_RUN',
    'FIRST_TERRITORY',
    'EXPLORER',
    'RUNNER_5K',
    'RUNNER_10K',
    'STREAK_7_DAY',
    'TERRITORY_MASTER',
    'WEEKLY_CHAMPION',
    'MONTHLY_CHAMPION',
  ];

  for (const expected of expectedTypes) {
    const found = ACHIEVEMENT_DEFINITIONS.find((a) => a.type === expected);
    assert(found !== undefined, `Achievement '${expected}' is defined with title '${found?.title}'`);
    assert(found.xpReward > 0, `Achievement '${expected}' has XP reward ${found?.xpReward}`);
  }

  // ----------------------------------------------------
  // TEST 2: Initial Personal Telemetry & Zero State
  // ----------------------------------------------------
  console.log('\n2️⃣ Testing Initial Personal Telemetry & Zero State...');
  const initialStats = await GamificationService.getPersonalStatistics(testUserId);
  assert(initialStats !== null, 'Personal statistics object generated');
  assert(initialStats.totalDistanceKm === 0, 'Initial distance is 0 km');
  assert(initialStats.historicalAreaKm2 === 0, 'Initial historical area is 0 km²');
  assert(initialStats.currentTerritory === 0, 'Initial territory is 0');
  assert(initialStats.uniqueCells === 0, 'Initial unique cells is 0');
  assert(initialStats.streak === 0, 'Initial current streak is 0');
  assert(initialStats.longestStreak === 0, 'Initial longest streak is 0');
  assert(initialStats.unlockedAchievementsCount === 0, 'Zero achievements unlocked initially');
  assert(initialStats.milestones.length === 4, '4 endurance milestones tracked');

  // ----------------------------------------------------
  // TEST 3: First Run & First Territory Achievements Unlock
  // ----------------------------------------------------
  console.log('\n3️⃣ Testing First Run & First Territory Achievements Unlock...');
  const now = Date.now();
  const workoutPoints = [
    { latitude: 12.9716, longitude: 77.5946, accuracy: 5, timestamp: now - 600000, speed: 2.8 },
    { latitude: 12.9725, longitude: 77.5955, accuracy: 4, timestamp: now - 480000, speed: 3.1 },
    { latitude: 12.9735, longitude: 77.5965, accuracy: 4, timestamp: now - 360000, speed: 3.0 },
    { latitude: 12.9745, longitude: 77.5975, accuracy: 5, timestamp: now - 240000, speed: 3.2 },
    { latitude: 12.9755, longitude: 77.5985, accuracy: 4, timestamp: now - 120000, speed: 2.9 },
  ];

  const workout1 = await TerritoryCaptureService.processWorkout({
    userId: testUserId,
    type: 'RUN',
    gpsPoints: workoutPoints,
  });

  assert(workout1.validationStatus === 'VALID', 'Workout #1 is VALID');
  assert(workout1.cellsCoveredCount > 0, `Workout #1 claimed ${workout1.cellsCoveredCount} sectors`);
  assert(workout1.streak === 1, `Current streak is 1 (calculated: ${workout1.streak})`);
  
  const unlockedTypes1 = workout1.newlyUnlockedAchievements.map((a) => a.type);
  assert(unlockedTypes1.includes('FIRST_RUN'), 'FIRST_RUN achievement unlocked on workout completion');
  assert(unlockedTypes1.includes('FIRST_TERRITORY'), 'FIRST_TERRITORY achievement unlocked on sector conquest');

  // Verify DB persistence of achievements
  const savedAchievements = await AchievementsRepository.findByUser(testUserId);
  assert(savedAchievements.length >= 2, `Saved ${savedAchievements.length} achievements to DB`);

  // ----------------------------------------------------
  // TEST 4: Streak System (Consecutive Days & Longest Streak)
  // ----------------------------------------------------
  console.log('\n4️⃣ Testing Streak System (Consecutive Days, Broken Streaks, Longest Streak)...');
  
  // Seed past daily workouts to simulate a 7-day streak
  const dayMs = 86400000;
  for (let i = 1; i <= 6; i++) {
    const pastDate = new Date(now - i * dayMs);
    const dateStr = pastDate.toISOString();
    await ActivitiesRepository.create({
      id: `act-past-day-${i}`,
      userId: testUserId,
      type: 'RUN',
      startedAt: dateStr,
      endedAt: new Date(pastDate.getTime() + 1800000).toISOString(),
      distance: 3500,
      duration: 1800,
      areaCovered: 0.3,
      routeGeometry: { type: 'LineString', coordinates: [[77.5946, 12.9716], [77.5955, 12.9725]] },
      validationStatus: 'VALID',
      createdAt: dateStr,
    });
  }

  const streakAfter7Days = await GamificationService.calculateStreak(testUserId);
  assert(streakAfter7Days.currentStreak >= 7, `Current consecutive streak reached ${streakAfter7Days.currentStreak} days`);
  assert(streakAfter7Days.longestStreak >= 7, `Longest streak is ${streakAfter7Days.longestStreak} days`);

  // Evaluate achievements to check STREAK_7_DAY
  const streakAch = await GamificationService.evaluateAchievements(testUserId);
  const streakAchTypes = streakAch.allAchievements.map((a) => a.type);
  assert(streakAchTypes.includes('STREAK_7_DAY'), 'STREAK_7_DAY achievement successfully unlocked');

  // ----------------------------------------------------
  // TEST 5: Distance & Endurance Achievements (5K & 10K Runner)
  // ----------------------------------------------------
  console.log('\n5️⃣ Testing 5 km & 10 km Runner Achievements...');
  
  // Insert a 10.5 km single workout
  const longWorkoutDate = new Date(now - 7 * dayMs).toISOString();
  await ActivitiesRepository.create({
    id: `act-10k-workout`,
    userId: testUserId,
    type: 'RUN',
    startedAt: longWorkoutDate,
    endedAt: new Date(new Date(longWorkoutDate).getTime() + 3600000).toISOString(),
    distance: 10500,
    duration: 3600,
    areaCovered: 0.8,
    routeGeometry: { type: 'LineString', coordinates: [[77.5946, 12.9716], [77.5955, 12.9725]] },
    validationStatus: 'VALID',
    createdAt: longWorkoutDate,
  });

  const distAch = await GamificationService.evaluateAchievements(testUserId);
  const distAchTypes = distAch.allAchievements.map((a) => a.type);
  assert(distAchTypes.includes('RUNNER_5K'), 'RUNNER_5K achievement unlocked');
  assert(distAchTypes.includes('RUNNER_10K'), 'RUNNER_10K achievement unlocked');

  // ----------------------------------------------------
  // TEST 6: Territory Master & Explorer Achievements
  // ----------------------------------------------------
  console.log('\n6️⃣ Testing Territory Master & Explorer Achievements...');
  
  // Seed 25 unique visited cells in territory history
  for (let c = 0; c < 26; c++) {
    const cellId = `886189258${c.toString().padStart(4, '0')}fffff`;
    await TerritoryRepository.captureCell({
      h3CellId: cellId,
      userId: testUserId,
      activityId: 'act-10k-workout',
      capturedAt: longWorkoutDate,
    });
  }

  const territoryAch = await GamificationService.evaluateAchievements(testUserId);
  const territoryAchTypes = territoryAch.allAchievements.map((a) => a.type);
  assert(territoryAchTypes.includes('EXPLORER'), 'EXPLORER achievement unlocked (>= 25 unique cells)');
  assert(territoryAchTypes.includes('TERRITORY_MASTER'), 'TERRITORY_MASTER achievement unlocked (>= 15 current hexes)');

  // ----------------------------------------------------
  // TEST 7: Weekly & Monthly Champion Achievements
  // ----------------------------------------------------
  console.log('\n7️⃣ Testing Weekly & Monthly Champion Rank #1 Achievements...');
  
  // Seed rank #1 in weekly and monthly statistics
  const { yearNumber, weekNumber } = StatisticsAggregationService.getWeekBounds(new Date());
  const monthNumber = new Date().getUTCMonth() + 1;

  await query(
    `INSERT INTO weekly_statistics (id, user_id, year_number, week_number, competition_score, rank)
     VALUES ($1, $2, $3, $4, 1500, 1)
     ON CONFLICT(user_id, year_number, week_number) DO UPDATE SET rank = 1, competition_score = 1500`,
    [`ws-${testUserId}-${yearNumber}-${weekNumber}`, testUserId, yearNumber, weekNumber]
  );

  await query(
    `INSERT INTO monthly_statistics (id, user_id, year_number, month_number, competition_score, rank)
     VALUES ($1, $2, $3, $4, 5000, 1)
     ON CONFLICT(user_id, year_number, month_number) DO UPDATE SET rank = 1, competition_score = 5000`,
    [`ms-${testUserId}-${yearNumber}-${monthNumber}`, testUserId, yearNumber, monthNumber]
  );

  const champAch = await GamificationService.evaluateAchievements(testUserId);
  const champAchTypes = champAch.allAchievements.map((a) => a.type);
  assert(champAchTypes.includes('WEEKLY_CHAMPION'), 'WEEKLY_CHAMPION unlocked upon Rank #1 standing');
  assert(champAchTypes.includes('MONTHLY_CHAMPION'), 'MONTHLY_CHAMPION unlocked upon Rank #1 standing');

  // Verify all 9 achievements are now unlocked
  assert(champAch.allAchievements.length === 9, `Athlete has unlocked all 9/9 badges!`);

  // ----------------------------------------------------
  // TEST 8: Full Personal Statistics & Milestones Check
  // ----------------------------------------------------
  console.log('\n8️⃣ Testing Comprehensive Personal Telemetry & Milestone Verification...');
  const fullStats = await GamificationService.getPersonalStatistics(testUserId);
  assert(fullStats.totalDistanceKm > 0, `Total distance recorded: ${fullStats.totalDistanceKm} km`);
  assert(fullStats.activities >= 7, `Total activities recorded: ${fullStats.activities}`);
  assert(fullStats.currentTerritory >= 15, `Current territory recorded: ${fullStats.currentTerritory}`);
  assert(fullStats.uniqueCells >= 25, `Unique cells recorded: ${fullStats.uniqueCells}`);
  assert(fullStats.streak >= 7, `Active streak recorded: ${fullStats.streak} days`);
  assert(fullStats.unlockedAchievementsCount === 9, `All 9 achievements reflected in personal stats`);

  const streakMilestone = fullStats.milestones.find((m) => m.name === '7-Day Streak');
  assert(streakMilestone && streakMilestone.reached === true, '7-Day Streak milestone status marked reached = true');

  const hexMilestone = fullStats.milestones.find((m) => m.name === '10 Territory Hexes');
  assert(hexMilestone && hexMilestone.reached === true, '10 Territory Hexes milestone status marked reached = true');

  // ----------------------------------------------------
  // TEST 9: Weekly & Monthly Summary Reports
  // ----------------------------------------------------
  console.log('\n9️⃣ Testing Weekly & Monthly Summary Reports...');
  const weeklySummary = await GamificationService.getWeeklySummary(testUserId);
  assert(weeklySummary.period.includes('Week'), `Weekly summary period formatted: ${weeklySummary.period}`);
  assert(weeklySummary.rank === 1, `Weekly rank is #1`);
  assert(weeklySummary.activeDaysCount >= 1, `Active days count in week: ${weeklySummary.activeDaysCount}`);

  const monthlySummary = await GamificationService.getMonthlySummary(testUserId);
  assert(monthlySummary.yearNumber === yearNumber, `Monthly summary year: ${monthlySummary.yearNumber}`);
  assert(monthlySummary.rank === 1, `Monthly rank is #1`);

  // Clean up
  await query(`DELETE FROM achievements WHERE user_id = $1`, [testUserId]);
  await query(`DELETE FROM territory_history WHERE user_id = $1`, [testUserId]);
  await query(`DELETE FROM territory_cells WHERE current_owner_id = $1`, [testUserId]);
  await query(`DELETE FROM activities WHERE user_id = $1`, [testUserId]);
  await query(`DELETE FROM weekly_statistics WHERE user_id = $1`, [testUserId]);
  await query(`DELETE FROM monthly_statistics WHERE user_id = $1`, [testUserId]);
  await query(`DELETE FROM users WHERE id = $1`, [testUserId]);

  console.log('\n======================================================');
  console.log('🏆 ALL PHASE 10 GAMIFICATION & MOTIVATION TESTS PASSED!');
  console.log('======================================================\n');
}

runPhase10GamificationTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
