import { PrivacyRepository } from '../repositories/privacy.repository.js';
import { calculateDistanceMeters, latLngToH3 } from '../spatial/spatial.js';

export class PrivacyService {
  /**
   * Evaluates raw or cleaned GPS points against user's active privacy zones.
   * Points within privacy zone radius are flagged to prevent public territory exposure.
   */
  static evaluatePrivacyZones(gpsPoints = [], privacyZones = []) {
    if (!privacyZones || privacyZones.length === 0 || !gpsPoints || gpsPoints.length === 0) {
      return {
        pointsWithPrivacyFlags: (gpsPoints || []).map((p) => ({ ...p, inPrivacyZone: false })),
        pointsInsideZonesCount: 0,
        pointsOutsideZonesCount: (gpsPoints || []).length,
      };
    }

    let pointsInsideZonesCount = 0;
    const pointsWithPrivacyFlags = gpsPoints.map((pt) => {
      const lat = pt.latitude ?? pt[1];
      const lng = pt.longitude ?? pt[0];

      let inZone = false;
      let matchedZoneName = null;

      for (const zone of privacyZones) {
        const distMeters = calculateDistanceMeters(lat, lng, zone.latitude, zone.longitude);
        if (distMeters <= (zone.radiusMeters || 300.0)) {
          inZone = true;
          matchedZoneName = zone.name;
          break;
        }
      }

      if (inZone) {
        pointsInsideZonesCount++;
        return {
          ...pt,
          inPrivacyZone: true,
          privacyZoneName: matchedZoneName,
        };
      }

      return {
        ...pt,
        inPrivacyZone: false,
      };
    });

    return {
      pointsWithPrivacyFlags,
      pointsInsideZonesCount,
      pointsOutsideZonesCount: gpsPoints.length - pointsInsideZonesCount,
    };
  }

  /**
   * Filters H3 cells: Hexes originating exclusively within privacy zones
   * are omitted from public territory conquest to prevent home/office doxxing.
   */
  static filterPublicConquestCells(cells = [], pointsWithPrivacyFlags = []) {
    if (!pointsWithPrivacyFlags || pointsWithPrivacyFlags.length === 0) {
      return cells;
    }

    // Build a map of cell -> boolean (has at least one point outside privacy zones)
    const cellHasPublicPoints = new Map();

    for (const pt of pointsWithPrivacyFlags) {
      const lat = pt.latitude ?? pt[1];
      const lng = pt.longitude ?? pt[0];
      const hex = latLngToH3(lat, lng);
      if (!hex) continue;

      const isOutside = !pt.inPrivacyZone;
      const current = cellHasPublicPoints.get(hex) || false;
      cellHasPublicPoints.set(hex, current || isOutside);
    }

    // Only allow cells that have points OUTSIDE privacy zones to be publicly conquered
    const eligibleConquestCells = cells.filter((cellId) => {
      if (!cellHasPublicPoints.has(cellId)) {
        return false;
      }
      return cellHasPublicPoints.get(cellId) === true;
    });

    return eligibleConquestCells;
  }

  /**
   * Sanitizes activity record to protect exact GPS and private routes.
   * If requesting user is not the activity owner, route geometry is redacted.
   */
  static async sanitizeActivity(activity, requestingUserId = null) {
    if (!activity) return null;

    const isOwner = requestingUserId && requestingUserId === activity.userId;
    if (isOwner) {
      return activity;
    }

    const settings = await PrivacyRepository.getSettings(activity.userId);

    // Non-owners: ALWAYS redact exact route geometry, start/end points, and path coordinates
    const sanitized = {
      id: activity.id,
      userId: settings.anonymousLeaderboard ? 'anonymous' : activity.userId,
      type: activity.type,
      startedAt: activity.startedAt,
      endedAt: activity.endedAt,
      distance: activity.distance,
      duration: activity.duration,
      areaCovered: activity.areaCovered,
      validationStatus: activity.validationStatus,
      createdAt: activity.createdAt,
      routeGeometry: null, // Always private from others: no one sees your path, starting point, or ending point
      startPoint: null,
      endPoint: null,
      gpsPoints: null,
      rawGpsPoints: null,
      isSanitizedForPrivacy: true,
    };

    return sanitized;
  }

  /**
   * Returns authoritative Location Privacy and Transparency Disclosure.
   */
  static getLocationPrivacyDisclosure() {
    return {
      title: 'GeoFit Location Privacy & Data Security Policy',
      version: '2.0.0',
      lastUpdated: '2026-09-12',
      sections: [
        {
          heading: '1. Why Location Data is Required',
          points: [
            'Convert real-world outdoor movement into geographic H3 hexagonal sectors.',
            'Compute authoritative workout distance, duration, pace, and energy expenditure.',
            'Validate physical movement via server-side anti-cheat filters to prevent spoofing and ensure fair competition.',
          ],
        },
        {
          heading: '2. What Data We Store',
          points: [
            'Raw GPS points during an active workout (latitude, longitude, timestamp, accuracy, speed) for personal history and validation audits.',
            'Permanent fitness metrics (distance in km, duration in minutes, calories burned, sectors conquered).',
            'Historical cell conquest timestamps and owner IDs.',
          ],
        },
        {
          heading: '3. What is Visible to Other Players',
          points: [
            'Public H3 hexagonal sector ownership color and display name on the tactical map.',
            'Weekly and daily leaderboard scores, rank, and active days.',
            'NEVER your live real-time GPS coordinates.',
            'NEVER your starting point, ending point, or exact running/walking path coordinates.',
            'Every hexagon you traverse is fully credited to your territory anywhere you move (including your doorstep).',
          ],
        },
        {
          heading: '4. Privacy Controls & Safe Zones',
          points: [
            'Route & Endpoint Privacy: Only you can view your running trail and start/finish coordinates. All public views see only claimed hexagons.',
            'Anonymous Leaderboard Mode: Hide your username and display as an anonymous athlete.',
            'Right to be Forgotten: Delete individual activities or request complete account data wiping at any time.',
          ],
        },
      ],
    };
  }
}
