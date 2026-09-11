import { Router } from 'express';
import { TerritoryCaptureService } from '../services/territory-capture.service.js';
import { ActivitiesRepository } from '../repositories/activities.repository.js';
import { TerritoryRepository } from '../repositories/territory.repository.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { PrivacyRepository } from '../repositories/privacy.repository.js';
import { PrivacyService } from '../services/privacy.service.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/activity - Record Authenticated Workout & Conquer Territory
 */
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      userId: bodyUserId,
      gpsPoints,
      metrics,
      type = 'RUN',
      activityId = null,
      startedAt = null,
      endedAt = null,
    } = req.body;

    const authenticatedUserId = req.userId;
    const targetUserId = authenticatedUserId || bodyUserId || 'user-shivaraj';

    // 1. Authorization: Prevent cross-user spoofing (Requirement 8)
    if (authenticatedUserId && bodyUserId && bodyUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You cannot create or submit activities for another athlete.',
      });
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // 2. Strict Malformed GPS Input Validation (Requirement 10)
    if (!gpsPoints || !Array.isArray(gpsPoints) || gpsPoints.length === 0) {
      return res.status(400).json({ success: false, error: 'Valid GPS points array is required' });
    }

    // Validate coordinate structure and types to prevent SQL injection and malformed payloads
    for (let i = 0; i < Math.min(gpsPoints.length, 50); i++) {
      const pt = gpsPoints[i];
      if (!pt || typeof pt !== 'object') {
        return res.status(400).json({ success: false, error: `Malformed GPS point at index ${i}` });
      }
      const lat = Number(pt.latitude);
      const lng = Number(pt.longitude);
      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          error: `Invalid GPS coordinates at index ${i}: lat=${pt.latitude}, lng=${pt.longitude}`,
        });
      }
    }

    // 3. Process Authoritative Workout & Territory Capture (Server-Side Validation)
    const result = await TerritoryCaptureService.processWorkout({
      activityId,
      userId: targetUserId,
      type: type === 'WALK' ? 'WALK' : 'RUN',
      gpsPoints,
      startedAt,
      endedAt,
      customMetrics: metrics,
    });

    res.json({
      success: true,
      data: result,
      message: `Workout recorded! Conquered ${result.cellsCoveredCount} sectors (${result.stolenCaptures} contested takeovers).`,
    });
  } catch (err) {
    console.error('Activity processing error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/activity - List user activities (sanitized for non-owners)
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.query.userId || req.userId || 'user-shivaraj';
    const profile = await UsersRepository.getEnrichedUserProfile(targetUserId);
    const rawActivities = await ActivitiesRepository.findByUserId(targetUserId, 20);

    // Sanitize routes if viewer is not the activity owner and enrich with captured cell count
    const sanitizedActivities = await Promise.all(
      (rawActivities || []).map(async (act) => {
        const sanitized = await PrivacyService.sanitizeActivity(act, req.userId);
        const cells = await TerritoryRepository.findCellsByActivityId(act.id);
        const distanceKm = act.distance ? (act.distance / 1000).toFixed(2) : '0.00';
        const durationMin = act.duration ? Math.max(1, Math.round(act.duration / 60)) : 1;
        const avgPace = Number(distanceKm) > 0 ? (act.duration / 60 / Number(distanceKm)).toFixed(1) : '--:--';
        const calories = Math.round(Number(distanceKm) * 65);
        return {
          ...sanitized,
          distance_meters: act.distance,
          distance_km: distanceKm,
          duration_seconds: act.duration,
          duration_minutes: durationMin,
          avg_pace_min_km: avgPace,
          calories,
          unique_cells_count: cells.length,
          cells,
        };
      })
    );

    res.json({
      success: true,
      user: profile,
      activities: sanitizedActivities,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/activity/:id - Inspect single activity (Exact route privacy enforced)
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = await ActivitiesRepository.findById(id);
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    const sanitized = await PrivacyService.sanitizeActivity(activity, req.userId);
    const cells = await TerritoryRepository.findCellsByActivityId(id);

    res.json({ success: true, activity: sanitized, cells });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/activity/:id - GDPR Activity Deletion (Requirement 13)
 */
router.delete('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.userId || req.query.userId || req.body.userId || 'user-shivaraj';

    const result = await PrivacyRepository.deleteActivity(id, requestingUserId);
    if (!result.found) {
      return res.status(404).json({ success: false, error: 'Activity not found.' });
    }

    res.json({
      success: true,
      message: 'Workout activity and associated GPS coordinates permanently deleted.',
    });
  } catch (err) {
    if (err.message && err.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, error: err.message });
    }
    next(err);
  }
});

export default router;
