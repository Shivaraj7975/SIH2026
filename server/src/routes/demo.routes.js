import { Router } from 'express';
import { DemoService } from '../services/demo.service.js';

const router = Router();

/**
 * GET /api/demo/state - Get live status of Demo Mode athletes & routes
 */
router.get('/state', async (req, res, next) => {
  try {
    const state = await DemoService.getDemoState();
    res.json({ success: true, data: state });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/demo/reset - 1-Click Reset Demo Environment
 */
router.post('/reset', async (req, res, next) => {
  try {
    const result = await DemoService.resetDemoEnvironment();
    res.json({
      success: true,
      message: 'Demo environment reset cleanly. Production athlete data untouched.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/demo/step/:stepNumber - Run individual demo step
 */
router.post('/step/:stepNumber', async (req, res, next) => {
  try {
    const stepNum = parseInt(req.params.stepNumber, 10);
    let result = null;

    if (stepNum === 1) {
      result = await DemoService.runStep1_UserA_Morning();
    } else if (stepNum === 2) {
      result = await DemoService.runStep2_UserB_Afternoon();
    } else if (stepNum === 3) {
      result = await DemoService.runStep3_UserC_Evening();
    } else {
      return res.status(400).json({ success: false, error: 'Invalid step number (1, 2, or 3).' });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/demo/full-playback - Run complete 5-minute hackathon demo in 5s
 */
router.post('/full-playback', async (req, res, next) => {
  try {
    const auditReport = await DemoService.runFullDemonstration();
    res.json({
      success: true,
      data: auditReport,
      message: 'Complete Hackathon Demo Playback executed! All 9 core invariants verified.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
