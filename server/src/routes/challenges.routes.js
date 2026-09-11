import { Router } from 'express';
import { ChallengesRepository } from '../repositories/challenges.repository.js';
import { DailyChallengesService } from '../services/daily-challenges.service.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/challenges - Active or specified date daily challenge & user progress
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.userId || 'user-shivaraj';
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);

    const challenge = await DailyChallengesService.getOrCreateChallengeForDate(dateStr);

    // Sync latest progress directly from historical valid activities on that calendar day
    const progressResult = await DailyChallengesService.updateUserProgress(challenge, targetUserId);
    const leaderboard = await ChallengesRepository.getTodaysLeaderboard(challenge.id);
    const formatted = DailyChallengesService.formatProgress(challenge, progressResult);

    res.json({
      success: true,
      data: {
        challenge,
        progress: {
          ...progressResult,
          ...formatted,
          distanceMeters: challenge.challengeType === 'DISTANCE' ? progressResult?.rawProgress || 0 : undefined,
          target_distance_meters: challenge.challengeType === 'DISTANCE' ? challenge.target : undefined,
          reward_xp: challenge.configuration?.xpBonus || 250,
        },
        leaderboard,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/challenges/history - Past daily challenges and completion archive
router.get('/history', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.userId || 'user-shivaraj';
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 14));

    const history = await ChallengesRepository.getChallengeHistory(targetUserId, limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/challenges/recalculate - Force recalculation of challenge progress from activities
router.post('/recalculate', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.body.userId || req.userId || 'user-shivaraj';
    const dateStr = req.body.date || new Date().toISOString().slice(0, 10);

    const challenge = await DailyChallengesService.getOrCreateChallengeForDate(dateStr);
    const progressResult = await DailyChallengesService.updateUserProgress(challenge, targetUserId);

    res.json({
      success: true,
      data: progressResult,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/challenges/finalize - Day-end freeze and next-day preparation
router.post('/finalize', async (req, res, next) => {
  try {
    const dateStr = req.body.date || new Date().toISOString().slice(0, 10);
    const result = await DailyChallengesService.finalizeDay(dateStr);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
