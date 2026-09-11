import { query } from '../config/database.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { ChallengesRepository } from '../repositories/challenges.repository.js';
import { AchievementsRepository } from '../repositories/achievements.repository.js';
import { TerritoryCaptureService } from '../services/territory-capture.service.js';
import { StatisticsAggregationService } from '../services/statistics-aggregation.service.js';
import { runMigrations } from './migrate.js';
import { fileURLToPath } from 'url';

export async function runSeed() {
  console.log('🌱 Seeding GeoFit Database with Multi-City Multiplayer Data...\n');

  await runMigrations();

  const tables = [
    'achievements', 'daily_scores', 'challenge_progress',
    'daily_challenges', 'weekly_statistics', 'monthly_statistics',
    'territory_history', 'territory_cells', 'gps_points', 'activities', 'users'
  ];

  for (const t of tables) {
    try {
      await query(`DELETE FROM ${t}`);
    } catch (e) {}
  }

  console.log('1️⃣ Seeding Users...');
  const users = [
    { id: 'user-shivaraj', username: 'shivaraj', displayName: 'Shivaraj', avatar: '⚡' },
    { id: 'user-rahul', username: 'rahul', displayName: 'Rahul', avatar: '🔥' },
    { id: 'user-priya', username: 'priya', displayName: 'Priya', avatar: '🌿' },
    { id: 'user-alex', username: 'alex', displayName: 'Alex Cyber', avatar: '👾' },
    { id: 'user-maya', username: 'maya', displayName: 'Maya Swift', avatar: '🚀' },
  ];

  for (const u of users) {
    await UsersRepository.create(u);
    console.log(`  - User created: ${u.displayName} (@${u.username})`);
  }

  console.log('\n2️⃣ Seeding Universal Achievements...');
  const achievements = [
    { id: 'ach-first-run', userId: 'user-shivaraj', type: 'FIRST_RUN', title: 'First Steps', description: 'Complete your first live outdoor run or walk.', icon: '⚡' },
    { id: 'ach-hex-pioneer', userId: 'user-shivaraj', type: 'HEX_PIONEER', title: 'Hex Pioneer', description: 'Conquer your first H3 geographical territory cell.', icon: '🗺️' },
    { id: 'ach-5k-club', userId: 'user-rahul', type: '5K_CLUB', title: '5K Fleetfoot', description: 'Cover at least 5,000 meters in a single workout.', icon: '🏃' },
  ];

  for (const a of achievements) {
    await AchievementsRepository.create(a);
    console.log(`  - Achievement: ${a.title}`);
  }

  console.log('\n3️⃣ Seeding Universal 24H Daily Challenge...');
  const todayStr = new Date().toISOString().slice(0, 10);
  await ChallengesRepository.createDailyChallenge({
    id: `challenge-${todayStr}`,
    challengeDate: todayStr,
    challengeType: 'DISTANCE',
    target: 3500,
    configuration: { title: 'Hex Grid Blitz', description: 'Cover 3.5 km and capture territory sectors today.', xpBonus: 250 },
    startTime: `${todayStr}T00:00:00Z`,
    endTime: `${todayStr}T23:59:59Z`,
  });
  console.log(`  - Daily Challenge created for date ${todayStr} (Target: 3.5 km)`);

  console.log('\n4️⃣ Seeding Multi-City Workouts & Multiplayer Territory Captures...');

  const runTime1 = Date.now() - (20 * 3600 * 1000);
  const runTime2 = Date.now() - (4 * 3600 * 1000);

  const cubbonTrack1 = [
    { latitude: 12.9710, longitude: 77.5944, accuracy: 5, timestamp: runTime1 - 3600000 },
    { latitude: 12.9725, longitude: 77.5960, accuracy: 5, timestamp: runTime1 - 2400000 },
    { latitude: 12.9740, longitude: 77.5930, accuracy: 5, timestamp: runTime1 - 1200000 },
    { latitude: 12.9755, longitude: 77.5980, accuracy: 5, timestamp: runTime1 },
  ];

  const cubbonTrack2 = [
    { latitude: 12.9770, longitude: 77.5965, accuracy: 5, timestamp: runTime2 - 3600000 },
    { latitude: 12.9785, longitude: 77.5950, accuracy: 5, timestamp: runTime2 - 2400000 },
    { latitude: 12.9800, longitude: 77.5935, accuracy: 5, timestamp: runTime2 - 1200000 },
    { latitude: 12.9815, longitude: 77.5920, accuracy: 5, timestamp: runTime2 },
  ];

  // Rahul's runs (Bengaluru)
  await TerritoryCaptureService.processWorkout({
    userId: 'user-rahul',
    type: 'RUN',
    gpsPoints: cubbonTrack1,
    startedAt: new Date(runTime1 - 3600000).toISOString(),
    endedAt: new Date(runTime1).toISOString(),
    customMetrics: { distanceMeters: 11000, durationSeconds: 3600 },
  });

  await TerritoryCaptureService.processWorkout({
    userId: 'user-rahul',
    type: 'RUN',
    gpsPoints: cubbonTrack2,
    startedAt: new Date(runTime2 - 3200000).toISOString(),
    endedAt: new Date(runTime2).toISOString(),
    customMetrics: { distanceMeters: 10000, durationSeconds: 3200 },
  });

  // Shivaraj's runs (Bengaluru)
  await TerritoryCaptureService.processWorkout({
    userId: 'user-shivaraj',
    type: 'RUN',
    gpsPoints: cubbonTrack2,
    startedAt: new Date(runTime2 - 5400000).toISOString(),
    endedAt: new Date(runTime2).toISOString(),
    customMetrics: {
      distanceMeters: 18000,
      durationSeconds: 5400,
    },
  });

  // Priya's runs (Bengaluru + NYC Central Park)
  await TerritoryCaptureService.processWorkout({
    userId: 'user-priya',
    type: 'RUN',
    gpsPoints: [
      { latitude: 40.7829, longitude: -73.9654, accuracy: 5, timestamp: runTime1 },
      { latitude: 40.7845, longitude: -73.9638, accuracy: 5, timestamp: runTime1 + 1800000 },
    ],
    startedAt: new Date(runTime1).toISOString(),
    endedAt: new Date(runTime1 + 1800000).toISOString(),
    customMetrics: {
      distanceMeters: 6200,
      durationSeconds: 2100,
    },
  });

  // Alex's Cyber runs (NYC Central Park + London Hyde Park)
  await TerritoryCaptureService.processWorkout({
    userId: 'user-alex',
    type: 'RUN',
    gpsPoints: [
      { latitude: 40.7812, longitude: -73.9670, accuracy: 5, timestamp: runTime2 },
      { latitude: 40.7856, longitude: -73.9625, accuracy: 5, timestamp: runTime2 + 2400000 },
    ],
    startedAt: new Date(runTime2).toISOString(),
    endedAt: new Date(runTime2 + 2400000).toISOString(),
    customMetrics: {
      distanceMeters: 8500,
      durationSeconds: 2800,
    },
  });

  // Maya Swift runs (London Hyde Park)
  await TerritoryCaptureService.processWorkout({
    userId: 'user-maya',
    type: 'RUN',
    gpsPoints: [
      { latitude: 51.5074, longitude: -0.1657, accuracy: 5, timestamp: runTime1 },
      { latitude: 51.5090, longitude: -0.1600, accuracy: 5, timestamp: runTime1 + 1500000 },
    ],
    startedAt: new Date(runTime1).toISOString(),
    endedAt: new Date(runTime1 + 1500000).toISOString(),
    customMetrics: {
      distanceMeters: 4500,
      durationSeconds: 1500,
    },
  });

  console.log('  - Multi-city multiplayer workouts processed successfully');

  for (const u of users) {
    await StatisticsAggregationService.aggregateUserWeekly(u.id);
    await StatisticsAggregationService.aggregateUserMonthly(u.id);
  }

  console.log('\n🎉 Seed Data Provisioned Successfully!\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
