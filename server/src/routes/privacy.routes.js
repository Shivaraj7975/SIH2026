import { Router } from 'express';
import { PrivacyRepository } from '../repositories/privacy.repository.js';
import { PrivacyService } from '../services/privacy.service.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * GET /api/privacy/disclosure - Public Privacy & Location Transparency Policy
 */
router.get('/disclosure', (req, res) => {
  const disclosure = PrivacyService.getLocationPrivacyDisclosure();
  res.json({ success: true, data: disclosure });
});

/**
 * GET /api/privacy/settings - User Privacy Settings
 */
router.get('/settings', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.userId || req.query.userId || 'user-shivaraj';
    const settings = await PrivacyRepository.getSettings(targetUserId);
    const zones = await PrivacyRepository.getPrivacyZones(targetUserId);

    res.json({
      success: true,
      data: {
        settings,
        privacyZones: zones,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/privacy/settings - Update User Privacy Preferences
 */
router.put('/settings', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.userId || req.body.userId || 'user-shivaraj';
    const {
      isProfilePublic = true,
      anonymousLeaderboard = false,
      hideRouteGeometry = false,
      maskPrivacyZones = true,
    } = req.body;

    const updated = await PrivacyRepository.updateSettings(targetUserId, {
      isProfilePublic: Boolean(isProfilePublic),
      anonymousLeaderboard: Boolean(anonymousLeaderboard),
      hideRouteGeometry: Boolean(hideRouteGeometry),
      maskPrivacyZones: Boolean(maskPrivacyZones),
    });

    res.json({
      success: true,
      data: updated,
      message: 'Privacy settings updated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/privacy/zones - List User Privacy Zones
 */
router.get('/zones', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.userId || req.query.userId || 'user-shivaraj';
    const zones = await PrivacyRepository.getPrivacyZones(targetUserId);
    res.json({ success: true, data: zones });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/privacy/zones - Create New Privacy Zone (e.g. Home, Workplace)
 */
router.post('/zones', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.userId || req.body.userId || 'user-shivaraj';
    const { name, latitude, longitude, radiusMeters = 300.0 } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Privacy zone name is required.' });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const radius = Number(radiusMeters);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, error: 'Invalid latitude [-90 to 90].' });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, error: 'Invalid longitude [-180 to 180].' });
    }
    if (isNaN(radius) || radius < 50 || radius > 5000) {
      return res.status(400).json({ success: false, error: 'Radius must be between 50m and 5000m.' });
    }

    const created = await PrivacyRepository.createPrivacyZone({
      userId: targetUserId,
      name: name.trim().slice(0, 100),
      latitude: lat,
      longitude: lng,
      radiusMeters: radius,
    });

    res.status(201).json({
      success: true,
      data: created,
      message: `Privacy Zone "${created.name}" established (${created.radiusMeters}m radius). Movement inside this zone will not claim public territory.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/privacy/zones/:id - Delete a Privacy Zone
 */
router.delete('/zones/:id', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.userId || req.query.userId || 'user-shivaraj';
    const { id } = req.params;

    await PrivacyRepository.deletePrivacyZone(targetUserId, id);
    res.json({ success: true, message: 'Privacy zone removed.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/privacy/account-data - Full GDPR / CCPA Account Data Deletion
 */
router.delete('/account-data', optionalAuth, async (req, res, next) => {
  try {
    const targetUserId = req.userId || req.body.userId || 'user-shivaraj';

    const result = await PrivacyRepository.wipeUserAccountData(targetUserId);
    res.json({
      success: true,
      data: result,
      message: 'All personal workouts, GPS audit traces, territory history, and telemetry permanently deleted.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
