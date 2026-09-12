import { query } from '../config/database.js';
import { ActivitiesRepository } from '../repositories/activities.repository.js';
import { GpsPointsRepository } from '../repositories/gps-points.repository.js';
import { TerritoryRepository } from '../repositories/territory.repository.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { ChallengesRepository } from '../repositories/challenges.repository.js';
import { DailyChallengesService } from './daily-challenges.service.js';
import { StatisticsAggregationService } from './statistics-aggregation.service.js';
import { GamificationService } from './gamification.service.js';
import { PrivacyRepository } from '../repositories/privacy.repository.js';
import { PrivacyService } from './privacy.service.js';
import { broadcastTerritoryChange } from '../realtime/socket.js';
import { extractEnclosedTerritoryCells, H3_CELL_AREA_KM2 } from '../spatial/spatial.js';
import { validateAndCleanTrail, computeAuthoritativeMetrics } from '../gps/gps-validator.js';

export class TerritoryCaptureService {
  static async processWorkout({
    activityId: customActivityId = null,
    userId,
    type = 'RUN',
    gpsPoints = [],
    startedAt = null,
    endedAt = null,
    customMetrics = null,
  }) {
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!gpsPoints || gpsPoints.length === 0) {
      throw new Error('gpsPoints array must contain at least 1 coordinate');
    }

    const activityId = customActivityId || `act-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 0. Idempotency Check: Return existing activity if already processed
    const existingActivity = await ActivitiesRepository.findById(activityId);
    if (existingActivity) {
      return {
        activity: existingActivity,
        cellsCoveredCount: 0,
        newCaptures: 0,
        stolenCaptures: 0,
        recaptures: 0,
        challengeJustCompleted: false,
        captureDetails: [],
        isDuplicateRequest: true,
      };
    }

    // 1. Authoritative Anti-Cheat Validation & Cleaning of Raw GPS Points
    const validationResult = validateAndCleanTrail(gpsPoints, { type });
    const {
      validPoints,
      validationStatus,
      reasons,
      confidenceScore,
      anomalies,
      metrics: validatedMetrics,
    } = validationResult;

    const cleanPoints = validPoints.length >= 2 ? validPoints : gpsPoints;

    // 2. Authoritative Metrics Calculation
    const metrics = customMetrics || validatedMetrics || computeAuthoritativeMetrics(cleanPoints);

    const startTimeStr = startedAt
      ? (typeof startedAt === 'string' ? startedAt : new Date(startedAt).toISOString())
      : (cleanPoints[0]?.timestamp ? new Date(cleanPoints[0].timestamp).toISOString() : new Date(Date.now() - (metrics.durationSeconds * 1000)).toISOString());

    const endTimeStr = endedAt
      ? (typeof endedAt === 'string' ? endedAt : new Date(endedAt).toISOString())
      : (cleanPoints[cleanPoints.length - 1]?.timestamp ? new Date(cleanPoints[cleanPoints.length - 1].timestamp).toISOString() : new Date().toISOString());

    const cellsCovered = validationStatus === 'VALID'
      ? (metrics.uniqueCells && metrics.uniqueCells.length > 0 ? metrics.uniqueCells : extractEnclosedTerritoryCells(cleanPoints).allCells)
      : [];

    const areaCoveredKm2 = validationStatus === 'VALID'
      ? (metrics.areaCoveredKm2 || parseFloat((cellsCovered.length * H3_CELL_AREA_KM2).toFixed(6)))
      : 0.0;

    const routeGeometry = {
      type: 'LineString',
      coordinates: cleanPoints.map((p) => [p.longitude ?? p[0], p.latitude ?? p[1]]),
    };

    // 3. Persist immutable ACTIVITY with authoritative validationStatus (Do NOT delete raw activity)
    const activity = await ActivitiesRepository.create({
      id: activityId,
      userId,
      type,
      startedAt: startTimeStr,
      endedAt: endTimeStr,
      distance: validationStatus === 'VALID' ? metrics.distanceMeters : 0.0,
      duration: metrics.durationSeconds,
      areaCovered: areaCoveredKm2,
      routeGeometry,
      validationStatus,
      createdAt: endTimeStr,
    });

    // 4. Batch insert raw GPS Points for audit and diagnostics
    await GpsPointsRepository.createBatch(activityId, gpsPoints);

    // ANTI-CHEAT ENFORCEMENT: If activity is SUSPICIOUS or INVALID, it MUST NOT contribute to territory, challenges, or leaderboards
    if (validationStatus !== 'VALID') {
      return {
        activity,
        validationStatus,
        reasons,
        confidenceScore,
        anomalies,
        cellsCoveredCount: 0,
        newCaptures: 0,
        stolenCaptures: 0,
        recaptures: 0,
        challengeJustCompleted: false,
        captureDetails: [],
      };
    }

    // 5. Territory Capture (All traversed hexagons are conquest-eligible, including doorstep/home)
    const conquestEligibleCells = cellsCovered;

    const {
      newCaptures,
      stolenCaptures,
      recaptures,
      captureDetails,
    } = await TerritoryRepository.captureCellsBatch({
      h3CellIds: conquestEligibleCells,
      userId,
      activityId,
      capturedAt: endTimeStr,
    });

    // 6. Evaluate Today's Universal Daily Challenge (Only for VALID activities)
    const challengeDateStr = startTimeStr.slice(0, 10);
    const challenge = await DailyChallengesService.getOrCreateChallengeForDate(challengeDateStr);
    let challengeJustCompleted = false;

    if (challenge) {
      const challengeResult = await DailyChallengesService.updateUserProgress(challenge, userId);
      challengeJustCompleted = challengeResult ? challengeResult.justCompleted : false;
    }

    // 7. Aggregate Weekly & Monthly Statistics (Only for VALID activities)
    await StatisticsAggregationService.aggregateUserWeekly(userId, new Date(startTimeStr));
    await StatisticsAggregationService.aggregateUserMonthly(userId, new Date(startTimeStr));

    // 8. Evaluate Gamification Achievements & Streak
    const streakData = await GamificationService.calculateStreak(userId);
    const { newlyUnlocked } = await GamificationService.evaluateAchievements(userId);

    // 9. Broadcast Real-Time Territory Updates to Connected Clients
    if (captureDetails.length > 0) {
      try {
        const athlete = await UsersRepository.findById(userId);
        broadcastTerritoryChange({
          cells: captureDetails,
          athlete: athlete || { id: userId, displayName: 'Runner', avatar: '⚡' },
          activityId,
        });
      } catch (err) {
        console.warn('Realtime broadcast notice:', err.message);
      }
    }

    return {
      activity,
      metrics,
      validationStatus,
      reasons,
      confidenceScore,
      anomalies,
      cellsCoveredCount: cellsCovered.length,
      interiorCellsCount: metrics.interiorCellsCount || 0,
      perimeterCellsCount: metrics.perimeterCellsCount || cellsCovered.length,
      totalAreaKm2: areaCoveredKm2,
      totalAreaM2: Math.round(areaCoveredKm2 * 1000000),
      newCaptures,
      stolenCaptures,
      recaptures,
      challengeJustCompleted,
      captureDetails,
      streak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      newlyUnlockedAchievements: newlyUnlocked || [],
    };
  }
}
