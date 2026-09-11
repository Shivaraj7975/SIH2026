import { query } from '../config/database.js';
import { ChallengesRepository } from '../repositories/challenges.repository.js';

export const CHALLENGE_CONFIG_POOL = [
  {
    id: 'cfg-dist-3k',
    type: 'DISTANCE',
    target: 3000,
    title: 'Morning Blitz 3K',
    description: 'Cover 3.0 km of running or walking across any sector.',
    unit: 'meters',
    displayTarget: '3.0 km',
    xpBonus: 200,
    badge: '👟',
  },
  {
    id: 'cfg-dist-5k',
    type: 'DISTANCE',
    target: 5000,
    title: '5K Endurance Sprint',
    description: 'Log 5.0 km of verified movement in today’s territory.',
    unit: 'meters',
    displayTarget: '5.0 km',
    xpBonus: 350,
    badge: '⚡',
  },
  {
    id: 'cfg-dist-10k',
    type: 'DISTANCE',
    target: 10000,
    title: '10K Grid Pioneer',
    description: 'Push your limits with a full 10.0 km expedition.',
    unit: 'meters',
    displayTarget: '10.0 km',
    xpBonus: 600,
    badge: '🏆',
  },
  {
    id: 'cfg-dist-4k',
    type: 'DISTANCE',
    target: 4000,
    title: 'Urban Ranger 4K',
    description: 'Patrol 4.0 km throughout your metropolitan zone.',
    unit: 'meters',
    displayTarget: '4.0 km',
    xpBonus: 280,
    badge: '🏙️',
  },
  {
    id: 'cfg-area-250k',
    type: 'AREA',
    target: 250000,
    title: 'Sector Expansion',
    description: 'Cover at least 0.25 km² (250,000 m²) of geographical area.',
    unit: 'm²',
    displayTarget: '0.25 km²',
    xpBonus: 250,
    badge: '🌐',
  },
  {
    id: 'cfg-area-500k',
    type: 'AREA',
    target: 500000,
    title: 'Territory Sweeper',
    description: 'Sweep across 0.50 km² (500,000 m²) of spatial territory.',
    unit: 'm²',
    displayTarget: '0.50 km²',
    xpBonus: 450,
    badge: '🛡️',
  },
  {
    id: 'cfg-area-750k',
    type: 'AREA',
    target: 750000,
    title: 'Metropolis Frontier',
    description: 'Explore 0.75 km² of contested urban perimeter.',
    unit: 'm²',
    displayTarget: '0.75 km²',
    xpBonus: 550,
    badge: '🗺️',
  },
  {
    id: 'cfg-cells-10',
    type: 'UNIQUE_CELLS',
    target: 10,
    title: 'Hex Explorer',
    description: 'Pass through at least 10 unique geographical hexagons.',
    unit: 'cells',
    displayTarget: '10 hexes',
    xpBonus: 200,
    badge: '⬡',
  },
  {
    id: 'cfg-cells-25',
    type: 'UNIQUE_CELLS',
    target: 25,
    title: 'Grid Conqueror',
    description: 'Infiltrate or claim 25 distinct hexagons today.',
    unit: 'cells',
    displayTarget: '25 hexes',
    xpBonus: 400,
    badge: '⚔️',
  },
  {
    id: 'cfg-cells-50',
    type: 'UNIQUE_CELLS',
    target: 50,
    title: 'Centurion Patrol',
    description: 'Traverse 50 unique geographical hexagons across workouts.',
    unit: 'cells',
    displayTarget: '50 hexes',
    xpBonus: 750,
    badge: '👑',
  },
  {
    id: 'cfg-dur-30m',
    type: 'ACTIVE_DURATION',
    target: 1800,
    title: 'Cadence Booster',
    description: 'Maintain active workout movement for at least 30 minutes.',
    unit: 'seconds',
    displayTarget: '30 mins',
    xpBonus: 250,
    badge: '⏱️',
  },
  {
    id: 'cfg-dur-60m',
    type: 'ACTIVE_DURATION',
    target: 3600,
    title: 'Iron Stride',
    description: 'Log 60 minutes of active running or walking duration.',
    unit: 'seconds',
    displayTarget: '60 mins',
    xpBonus: 500,
    badge: '🔥',
  },
  {
    id: 'cfg-dur-80m',
    type: 'ACTIVE_DURATION',
    target: 4800,
    title: 'Ultra Endurance',
    description: 'Accumulate 80 minutes of sustained outdoor cardio.',
    unit: 'seconds',
    displayTarget: '80 mins',
    xpBonus: 650,
    badge: '💎',
  },
];

export class DailyChallengesService {
  /**
   * Deterministically pick or retrieve the universal 24H challenge for a date
   */
  static async getOrCreateChallengeForDate(dateStr) {
    const existing = await ChallengesRepository.findByDate(dateStr);
    if (existing) {
      return existing;
    }

    // Deterministic hash to pick from the 10+ configuration pool
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    const poolIndex = Math.abs(hash) % CHALLENGE_CONFIG_POOL.length;
    const template = CHALLENGE_CONFIG_POOL[poolIndex];

    const startTime = `${dateStr}T00:00:00.000Z`;
    const endTime = `${dateStr}T23:59:59.999Z`;

    return ChallengesRepository.createDailyChallenge({
      id: `challenge-${dateStr}`,
      challengeDate: dateStr,
      challengeType: template.type,
      target: template.target,
      configuration: {
        title: template.title,
        description: template.description,
        unit: template.unit,
        displayTarget: template.displayTarget,
        xpBonus: template.xpBonus,
        badge: template.badge,
        templateId: template.id,
      },
      startTime,
      endTime,
    });
  }

  /**
   * Calculate and update challenge progress strictly from user's valid historical activities
   * (Fairness Rule: Independent of arrival order, time of day, or initial territory)
   */
  static async updateUserProgress(challenge, userId) {
    if (!challenge || !userId) return null;

    // 1. Get all valid historical activities for this user in the challenge window
    const activities = await query(
      `SELECT 
        id, 
        distance, 
        duration, 
        area_covered, 
        started_at,
        created_at
      FROM activities
      WHERE user_id = $1 
        AND validation_status = 'VALID'
        AND started_at >= $2 
        AND started_at <= $3
      ORDER BY started_at ASC`,
      [userId, challenge.startTime, challenge.endTime]
    );

    // Track unique activity IDs to prevent double counting
    const uniqueActivityIds = [...new Set(activities.map((a) => a.id))];

    // 2. Compute the progress metric according to the challenge type
    let rawProgress = 0;

    switch (challenge.challengeType) {
      case 'DISTANCE': {
        // Sum total valid meters
        rawProgress = activities.reduce((sum, act) => sum + (Number(act.distance) || 0), 0);
        break;
      }

      case 'AREA': {
        // Sum total valid square meters covered
        rawProgress = activities.reduce((sum, act) => {
          let area = Number(act.area_covered) || 0;
          if (area > 0 && area < 1000) {
            area = area * 1000000; // Convert km² to m²
          } else if (area === 0) {
            area = (Number(act.distance) || 0) * 15;
          }
          return sum + area;
        }, 0);
        break;
      }

      case 'UNIQUE_CELLS': {
        // Count distinct H3 cells visited during those valid activities
        if (uniqueActivityIds.length > 0) {
          const placeholders = uniqueActivityIds.map((_, i) => `$${i + 2}`).join(',');
          const cellRows = await query(
            `SELECT DISTINCT h3_cell_id 
             FROM territory_history 
             WHERE user_id = $1 AND activity_id IN (${placeholders})`,
            [userId, ...uniqueActivityIds]
          );
          rawProgress = cellRows.length;
        } else {
          rawProgress = 0;
        }
        break;
      }

      case 'ACTIVE_DURATION': {
        // Sum total valid active duration seconds
        rawProgress = activities.reduce((sum, act) => sum + (Number(act.duration) || 0), 0);
        break;
      }

      default: {
        rawProgress = activities.reduce((sum, act) => sum + (Number(act.distance) || 0), 0);
        break;
      }
    }

    const percentage = Math.min(100, parseFloat(((rawProgress / challenge.target) * 100).toFixed(1)));
    const isCompleted = rawProgress >= challenge.target;

    // Check previous progress state
    const previousProgress = await ChallengesRepository.getProgress(challenge.id, userId);
    const wasAlreadyCompleted = previousProgress ? Boolean(previousProgress.completed) : false;

    const xpBonus = challenge.configuration?.xpBonus || 250;
    const score = isCompleted ? xpBonus : 0;

    let completedAt = previousProgress?.completedAt || null;
    if (isCompleted && !wasAlreadyCompleted) {
      completedAt = new Date().toISOString();
    }

    // 3. Upsert challenge progress record
    const updatedRecord = await ChallengesRepository.upsertProgress({
      id: `prog-${challenge.id}-${userId}`,
      challengeId: challenge.id,
      userId,
      progress: rawProgress,
      percentage,
      score,
      completed: isCompleted,
      completedAt,
      activityIds: uniqueActivityIds,
    });

    // 4. If newly completed, award daily score record
    if (isCompleted && !wasAlreadyCompleted) {
      await ChallengesRepository.recordDailyScore({
        id: `score-${challenge.id}-${userId}`,
        challengeId: challenge.id,
        userId,
        score: xpBonus,
      });
    }

    return {
      ...updatedRecord,
      rawProgress,
      percentage,
      isCompleted,
      justCompleted: isCompleted && !wasAlreadyCompleted,
      uniqueActivitiesCount: uniqueActivityIds.length,
    };
  }

  /**
   * Finalize and freeze a day's challenge results
   */
  static async finalizeDay(dateStr) {
    const challenge = await ChallengesRepository.findByDate(dateStr);
    if (!challenge) {
      throw new Error(`No daily challenge found for date ${dateStr}`);
    }

    const now = new Date().toISOString();
    await query(
      `UPDATE daily_challenges 
       SET is_finalized = TRUE, finalized_at = $1 
       WHERE id = $2`,
      [now, challenge.id]
    );

    // Prepare next day's challenge automatically
    const nextDate = new Date(new Date(dateStr).getTime() + 86400000).toISOString().slice(0, 10);
    const nextChallenge = await this.getOrCreateChallengeForDate(nextDate);

    return {
      finalizedChallenge: { ...challenge, isFinalized: true, finalizedAt: now },
      nextChallenge,
    };
  }

  /**
   * Format challenge progress for human consumption
   */
  static formatProgress(challenge, progress) {
    const rawVal = progress?.progress || 0;
    const target = challenge.target;
    let formattedCurrent = `${rawVal}`;
    let formattedTarget = `${target}`;

    switch (challenge.challengeType) {
      case 'DISTANCE':
        formattedCurrent = `${(rawVal / 1000).toFixed(2)} km`;
        formattedTarget = `${(target / 1000).toFixed(1)} km`;
        break;
      case 'AREA':
        formattedCurrent = `${(rawVal / 1000000).toFixed(3)} km²`;
        formattedTarget = `${(target / 1000000).toFixed(2)} km²`;
        break;
      case 'UNIQUE_CELLS':
        formattedCurrent = `${Math.round(rawVal)} hexes`;
        formattedTarget = `${Math.round(target)} hexes`;
        break;
      case 'ACTIVE_DURATION':
        formattedCurrent = `${Math.round(rawVal / 60)} mins`;
        formattedTarget = `${Math.round(target / 60)} mins`;
        break;
    }

    return {
      formattedCurrent,
      formattedTarget,
      percentage: progress?.percentage || Math.min(100, Math.round((rawVal / target) * 100)),
      completed: Boolean(progress?.completed),
      score: progress?.score || 0,
      completedAt: progress?.completedAt || null,
    };
  }
}
