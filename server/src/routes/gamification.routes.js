import { Router } from 'express';
import { GamificationService, ACHIEVEMENT_DEFINITIONS } from '../services/gamification.service.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/gamification/stats
router.get('/stats', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.userId || 'user-shivaraj';
    const stats = await GamificationService.getPersonalStatistics(targetUserId);
    if (!stats) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/gamification/weekly-summary
router.get('/weekly-summary', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.userId || 'user-shivaraj';
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const summary = await GamificationService.getWeeklySummary(targetUserId, date);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/gamification/monthly-summary
router.get('/monthly-summary', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.userId || 'user-shivaraj';
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const summary = await GamificationService.getMonthlySummary(targetUserId, date);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/gamification/achievements
router.get('/achievements', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.userId || 'user-shivaraj';
    const achievementData = await GamificationService.evaluateAchievements(targetUserId);
    res.json({
      success: true,
      data: {
        definitions: ACHIEVEMENT_DEFINITIONS,
        unlocked: achievementData.allAchievements,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
