import { Router } from 'express';
import { query } from '../config/database.js';
import { StatisticsRepository } from '../repositories/statistics.repository.js';
import { StatisticsAggregationService } from '../services/statistics-aggregation.service.js';

const router = Router();

const FORMULA_DOCUMENTATION = {
  description: '100% Explainable Historical Fitness Competition Scoring (Rule 6 & 7)',
  formula: 'competitionScore = distanceScore + areaScore + challengeScore + consistencyScore + uniqueCellsScore',
  rules: {
    distanceScore: '1 pt per 10m (100 pts per km of verified movement)',
    areaScore: '50 pts per km² of geographic area covered',
    challengeScore: 'Points earned from completing 24H daily challenges during the period',
    consistencyScore: '25 pts per valid workout session logged',
    uniqueCellsScore: '10 pts per distinct geographical H3 hexagon traversed',
    priority: 'Rank is determined strictly by historical workout metrics, never by momentary territory ownership',
  },
};

router.get('/', async (req, res, next) => {
  try {
    // Only 'daily' and 'weekly' are accepted timeframes
    const rawTimeframe = (req.query.timeframe || 'weekly').toLowerCase();
    const timeframe = (rawTimeframe === 'daily') ? 'daily' : 'weekly';
    const sector = (req.query.sector || 'distance').toLowerCase();

    // Fetch aggregated data with the 3 sectors
    const rawRankings = await StatisticsAggregationService.getLeaderboardData({
      timeframe,
      sector,
    });

    // Fetch privacy settings to mask anonymous athletes
    const privacyRows = await query(`SELECT user_id, is_profile_public, anonymous_leaderboard FROM user_privacy_settings`);
    const privacyMap = new Map((privacyRows || []).map((p) => [p.user_id, p]));

    // Format rankings for client UI
    const formatted = rawRankings.map((r, idx) => {
      const uId = r.userId || r.user_id;
      const userPrivacy = privacyMap.get(uId);
      const isAnon = userPrivacy ? Boolean(userPrivacy.anonymous_leaderboard) : false;

      return {
        id: isAnon ? `anon-${idx + 1}` : uId,
        userId: isAnon ? `anon-${idx + 1}` : uId,
        rank: idx + 1,
        rankChange: 0,
        username: isAnon ? 'anonymous' : r.username,
        displayName: isAnon ? 'Anonymous Athlete' : (r.displayName || r.username),
        name: isAnon ? 'Anonymous Athlete' : (r.displayName || r.username),
        avatar: isAnon ? '🕶️' : (r.avatar || '⚡'),
        // Sector 1: Distance Covered
        distanceKm: r.distanceKm,
        total_distance_meters: r.distanceMeters,
        // Sector 2: Current Holding Area (Live on grid, decreases if stolen)
        currentCellsOwned: r.currentCellsOwned,
        currentHoldingAreaM2: r.currentHoldingAreaM2,
        currentHoldingAreaKm2: r.currentHoldingAreaKm2,
        territoryCount: r.currentCellsOwned,
        // Sector 3: Total Area Captured (Monotonic, cumulative, NEVER decreases)
        totalAreaCapturedM2: r.totalAreaCapturedM2,
        totalAreaCapturedKm2: r.totalAreaCapturedKm2,
        areaCoveredKm2: r.totalAreaCapturedKm2,
        // Auxiliary stats
        durationFormatted: r.durationFormatted,
        activityCount: r.activityCount,
        challengeScore: r.challengeScore,
        competitionScore: r.competitionScore,
        totalScore: r.competitionScore,
        score: r.competitionScore,
      };
    });

    res.json({
      success: true,
      timeframe,
      activeSector: sector,
      availableTimeframes: ['daily', 'weekly'],
      sectors: [
        { id: 'distance', label: 'Distance Covered', unit: 'km' },
        { id: 'holding', label: 'Current Holding Area', unit: 'm²' },
        { id: 'total_area', label: 'Total Area Captured', unit: 'm²' },
      ],
      scoringFormula: FORMULA_DOCUMENTATION,
      data: formatted,
      totalCompetitors: formatted.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/leaderboard/formula - Public endpoint for scoring documentation
router.get('/formula', (req, res) => {
  res.json({
    success: true,
    data: FORMULA_DOCUMENTATION,
  });
});

export default router;
