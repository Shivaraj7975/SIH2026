import { calculateDistanceMeters, latLngToH3, extractEnclosedTerritoryCells } from '../spatial/spatial.js';

export const DEFAULT_ANTI_CHEAT_CONFIG = {
  // Speed thresholds (in meters/second)
  MAX_WALK_SPEED_MS: 3.5,        // ~12.6 km/h (fast walk / light jog)
  MAX_RUN_SPEED_MS: 11.5,        // ~41.4 km/h (human sprint ceiling)
  MAX_INSTANT_SPEED_MS: 12.0,    // Point-to-point max speed
  VEHICLE_SPEED_MS: 13.5,        // ~48.6 km/h (driving/motorized transit threshold)

  // Acceleration threshold (in m/s²)
  MAX_ACCELERATION_MS2: 6.0,     // Human sprint maximum acceleration

  // Accuracy threshold (in meters)
  MAX_ACCURACY_METERS: 45.0,     // Discard points with accuracy worse than 45m

  // Jump & Teleport thresholds
  MAX_JUMP_DISTANCE_METERS: 250.0, // Significant leap in short interval
  TELEPORT_COUNT_MAX: 1,           // >= 2 impossible jumps -> INVALID

  // Noise / rejection ratios
  SUSPICIOUS_NOISE_RATIO: 0.35,    // > 35% rejected points -> SUSPICIOUS
  INVALID_NOISE_RATIO: 0.60,       // > 60% rejected points -> INVALID

  // Time delta thresholds
  MIN_TIME_DELTA_MS: 200,          // Points arriving faster than 200ms
  MAX_FUTURE_TIME_DRIFT_MS: 60000, // Max 60 seconds into future
  MIN_STATIC_DELTA_METERS: 0.8,    // Movement threshold for static jitter
};

export class AntiCheatService {
  /**
   * Validates an individual GPS coordinate against previous valid point.
   */
  static validateGpsPoint(rawPoint, previousValidPoint = null, config = DEFAULT_ANTI_CHEAT_CONFIG) {
    if (!rawPoint || typeof rawPoint !== 'object') {
      return { valid: false, reason: 'INVALID_POINT_OBJECT', cleanedPoint: null, speed: 0, acceleration: 0, isJump: false };
    }

    const lat = Number(rawPoint.latitude ?? rawPoint.lat ?? rawPoint[1]);
    const lng = Number(rawPoint.longitude ?? rawPoint.lng ?? rawPoint[0]);
    const timestamp = typeof rawPoint.timestamp === 'string' && isNaN(Number(rawPoint.timestamp))
      ? new Date(rawPoint.timestamp).getTime()
      : Number(rawPoint.timestamp || Date.now());
    const accuracy = rawPoint.accuracy !== undefined && rawPoint.accuracy !== null ? Number(rawPoint.accuracy) : 10;
    const speed = rawPoint.speed !== undefined && rawPoint.speed !== null ? Number(rawPoint.speed) : null;

    // 1. Check coordinate boundary constraints
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { valid: false, reason: 'COORDINATES_OUT_OF_BOUNDS', cleanedPoint: null, speed: 0, acceleration: 0, isJump: false };
    }

    // 2. Reject Null Island (0, 0)
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
      return { valid: false, reason: 'NULL_ISLAND_REJECTED', cleanedPoint: null, speed: 0, acceleration: 0, isJump: false };
    }

    // 3. Check timestamp validity & future drift
    const now = Date.now();
    if (isNaN(timestamp) || timestamp <= 0) {
      return { valid: false, reason: 'INVALID_TIMESTAMP', cleanedPoint: null, speed: 0, acceleration: 0, isJump: false };
    }
    if (timestamp > now + config.MAX_FUTURE_TIME_DRIFT_MS) {
      return { valid: false, reason: 'TIMESTAMP_IN_FUTURE', cleanedPoint: null, speed: 0, acceleration: 0, isJump: false };
    }

    // 4. Accuracy filtering (discard noisy points > threshold without failing whole workout)
    if (accuracy > config.MAX_ACCURACY_METERS) {
      return {
        valid: false,
        reason: `ACCURACY_TOO_LOW_${Math.round(accuracy)}M`,
        cleanedPoint: null,
        speed: 0,
        acceleration: 0,
        isJump: false,
      };
    }

    // 5. Differential checks against previous valid point
    let calculatedSpeed = speed || 0;
    let acceleration = 0;
    let isJump = false;

    if (previousValidPoint) {
      const prevLat = Number(previousValidPoint.latitude ?? previousValidPoint.lat);
      const prevLng = Number(previousValidPoint.longitude ?? previousValidPoint.lng);
      const prevTimestamp = typeof previousValidPoint.timestamp === 'string' && isNaN(Number(previousValidPoint.timestamp))
        ? new Date(previousValidPoint.timestamp).getTime()
        : Number(previousValidPoint.timestamp);
      const prevSpeed = Number(previousValidPoint.speed || 0);

      const timeDeltaMs = timestamp - prevTimestamp;

      // Timestamp corruption check (backward or zero time travel)
      if (timeDeltaMs <= 0) {
        return {
          valid: false,
          reason: timeDeltaMs < 0 ? 'CORRUPTED_BACKWARD_TIMESTAMP' : 'DUPLICATE_TIMESTAMP',
          cleanedPoint: null,
          speed: 0,
          acceleration: 0,
          isJump: false,
        };
      }

      if (timeDeltaMs < config.MIN_TIME_DELTA_MS) {
        return { valid: false, reason: 'TIME_DELTA_TOO_RAPID', cleanedPoint: null, speed: 0, acceleration: 0, isJump: false };
      }

      const distanceMeters = calculateDistanceMeters(prevLat, prevLng, lat, lng);
      const timeDeltaSec = timeDeltaMs / 1000;
      calculatedSpeed = distanceMeters / timeDeltaSec;

      // Duplicate / static GPS jitter check
      if (distanceMeters < config.MIN_STATIC_DELTA_METERS && timeDeltaMs < 4000) {
        return { valid: false, reason: 'STATIC_GPS_JITTER', cleanedPoint: null, speed: 0, acceleration: 0, isJump: false };
      }

      // Acceleration check
      if (timeDeltaSec > 0) {
        acceleration = Math.abs(calculatedSpeed - prevSpeed) / timeDeltaSec;
      }

      // Teleportation / jump detection
      if (distanceMeters > config.MAX_JUMP_DISTANCE_METERS && calculatedSpeed > config.MAX_INSTANT_SPEED_MS) {
        isJump = true;
        return {
          valid: false,
          reason: `TELEPORT_JUMP_${Math.round(distanceMeters)}M_IN_${timeDeltaSec.toFixed(1)}S`,
          cleanedPoint: null,
          speed: calculatedSpeed,
          acceleration,
          isJump: true,
        };
      }

      // Impossible speed check
      if (calculatedSpeed > config.MAX_INSTANT_SPEED_MS) {
        return {
          valid: false,
          reason: `IMPOSSIBLE_SPEED_${calculatedSpeed.toFixed(1)}MS`,
          cleanedPoint: null,
          speed: calculatedSpeed,
          acceleration,
          isJump: false,
        };
      }

      // Superhuman acceleration check
      if (acceleration > config.MAX_ACCELERATION_MS2 && calculatedSpeed > 6.0) {
        return {
          valid: false,
          reason: `IMPOSSIBLE_ACCELERATION_${acceleration.toFixed(1)}MS2`,
          cleanedPoint: null,
          speed: calculatedSpeed,
          acceleration,
          isJump: false,
        };
      }
    }

    const cleanedPoint = {
      latitude: parseFloat(lat.toFixed(7)),
      longitude: parseFloat(lng.toFixed(7)),
      timestamp,
      accuracy: Math.round(accuracy),
      speed: parseFloat(calculatedSpeed.toFixed(2)),
    };

    return {
      valid: true,
      reason: null,
      cleanedPoint,
      speed: calculatedSpeed,
      acceleration,
      isJump: false,
    };
  }

  /**
   * Evaluates entire activity trail and assigns authoritative validation status:
   * VALID, SUSPICIOUS, or INVALID.
   */
  static validateActivity(rawPoints = [], options = {}) {
    const config = { ...DEFAULT_ANTI_CHEAT_CONFIG, ...options.config };
    const activityType = options.type || 'RUN';

    if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
      return {
        validationStatus: 'INVALID',
        reasons: ['EMPTY_OR_INVALID_POINTS_ARRAY'],
        confidenceScore: 0.0,
        anomalies: { rejectedCount: 0, totalCount: 0, rejectionRatio: 1.0 },
        validPoints: [],
        metrics: null,
      };
    }

    const validPoints = [];
    const reasons = [];
    let rejectedCount = 0;
    let teleportCount = 0;
    let vehicleSpeedCount = 0;
    let timestampCorruptionCount = 0;
    let maxSpeedObserved = 0;
    let maxAccelerationObserved = 0;
    let previousValid = null;

    for (let i = 0; i < rawPoints.length; i++) {
      const pt = rawPoints[i];
      const res = this.validateGpsPoint(pt, previousValid, config);

      if (res.speed > maxSpeedObserved) maxSpeedObserved = res.speed;
      if (res.acceleration > maxAccelerationObserved) maxAccelerationObserved = res.acceleration;

      if (res.isJump) {
        teleportCount++;
        reasons.push(res.reason);
      }

      if (res.reason && (res.reason.includes('BACKWARD') || res.reason.includes('DUPLICATE_TIMESTAMP'))) {
        timestampCorruptionCount++;
        reasons.push(res.reason);
      }

      if (res.speed >= config.VEHICLE_SPEED_MS) {
        vehicleSpeedCount++;
        reasons.push(`VEHICLE_SPEED_DETECTED_${res.speed.toFixed(1)}MS`);
      }

      if (res.valid && res.cleanedPoint) {
        validPoints.push(res.cleanedPoint);
        previousValid = res.cleanedPoint;
      } else {
        rejectedCount++;
        if (res.reason && !reasons.includes(res.reason)) {
          reasons.push(res.reason);
        }
      }
    }

    const totalCount = rawPoints.length;
    const rejectionRatio = totalCount > 0 ? rejectedCount / totalCount : 1.0;

    // Calculate preliminary metrics on cleaned valid trail
    const metrics = this.computeCleanTrailMetrics(validPoints, options.userWeightKg || 70);

    // Compute Activity-Level Validation Classification
    let validationStatus = 'VALID';
    let confidenceScore = 1.0;

    // Rule 1: Insufficient valid points
    if (validPoints.length < 2 || metrics.distanceMeters < 5) {
      validationStatus = 'INVALID';
      confidenceScore = 0.0;
      reasons.push('INSUFFICIENT_VALID_MOVEMENT');
    }
    // Rule 2: Timestamp corruption (backward time travel)
    else if (timestampCorruptionCount > 0) {
      validationStatus = 'INVALID';
      confidenceScore = 0.1;
      reasons.push('CORRUPTED_BACKWARD_TIMESTAMPS');
    }
    // Rule 3: Repeated teleportation (2+ impossible jumps)
    else if (teleportCount >= config.TELEPORT_COUNT_MAX + 1) {
      validationStatus = 'INVALID';
      confidenceScore = 0.15;
      reasons.push(`REPEATED_TELEPORTATION_${teleportCount}_JUMPS`);
    }
    // Rule 4: Vehicle-like speed detection (> 48.6 km/h)
    else if (metrics.avgSpeedKmh > config.VEHICLE_SPEED_MS * 3.6 || vehicleSpeedCount >= 2) {
      validationStatus = 'INVALID';
      confidenceScore = 0.2;
      reasons.push(`VEHICLE_SPEED_DETECTED_${metrics.avgSpeedKmh.toFixed(1)}KMH`);
    }
    // Rule 5: Walking activity exceeding walk speed threshold
    else if (activityType === 'WALK' && metrics.avgSpeedKmh > config.MAX_WALK_SPEED_MS * 3.6 * 1.4) {
      validationStatus = 'SUSPICIOUS';
      confidenceScore = 0.45;
      reasons.push(`EXCESSIVE_WALK_SPEED_${metrics.avgSpeedKmh.toFixed(1)}KMH`);
    }
    // Rule 6: High noise / rejection ratio
    else if (rejectionRatio >= config.INVALID_NOISE_RATIO) {
      validationStatus = 'INVALID';
      confidenceScore = 0.3;
      reasons.push(`EXCESSIVE_REJECTED_GPS_NOISE_${Math.round(rejectionRatio * 100)}%`);
    }
    // Rule 7: Single isolated teleport or moderate noise ratio -> SUSPICIOUS
    else if (teleportCount === 1 || rejectionRatio >= config.SUSPICIOUS_NOISE_RATIO) {
      validationStatus = 'SUSPICIOUS';
      confidenceScore = 0.6;
      reasons.push(`MODERATE_GPS_ANOMALIES_${Math.round(rejectionRatio * 100)}%`);
    }
    // Rule 8: Clean or minor noise safely filtered out -> VALID
    else {
      validationStatus = 'VALID';
      confidenceScore = parseFloat((1.0 - (rejectionRatio * 0.4)).toFixed(2));
    }

    return {
      validationStatus,
      reasons: Array.from(new Set(reasons)),
      confidenceScore,
      anomalies: {
        totalCount,
        rejectedCount,
        rejectionRatio: parseFloat(rejectionRatio.toFixed(3)),
        teleportCount,
        vehicleSpeedCount,
        timestampCorruptionCount,
        maxSpeedObserved: parseFloat(maxSpeedObserved.toFixed(2)),
        maxAccelerationObserved: parseFloat(maxAccelerationObserved.toFixed(2)),
      },
      validPoints,
      metrics,
    };
  }

  /**
   * Computes authoritative metrics exclusively on validated clean points.
   */
  static computeCleanTrailMetrics(cleanPoints = [], userWeightKg = 70) {
    if (!cleanPoints || cleanPoints.length < 2) {
      return {
        distanceMeters: 0,
        distanceKm: 0,
        durationSeconds: 0,
        avgSpeedKmh: 0,
        avgPaceMinKm: 0,
        caloriesBurned: 0,
        areaCoveredKm2: 0,
        uniqueCells: [],
        uniqueCellsCount: 0,
      };
    }

    let totalDistanceMeters = 0;
    for (let i = 1; i < cleanPoints.length; i++) {
      const p1 = cleanPoints[i - 1];
      const p2 = cleanPoints[i];
      totalDistanceMeters += calculateDistanceMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    }

    const startTime = cleanPoints[0].timestamp;
    const endTime = cleanPoints[cleanPoints.length - 1].timestamp;
    const durationSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));
    const distanceKm = totalDistanceMeters / 1000;
    const hours = durationSeconds / 3600;
    const avgSpeedKmh = hours > 0 ? distanceKm / hours : 0;
    const avgPaceMinKm = distanceKm > 0 ? (durationSeconds / 60) / distanceKm : 0;

    const territoryResult = extractEnclosedTerritoryCells(cleanPoints);

    const MET = avgSpeedKmh > 8.5 ? 9.8 : avgSpeedKmh > 5 ? 7.0 : 3.8;
    const caloriesBurned = Math.round(MET * userWeightKg * hours);

    return {
      distanceMeters: Math.round(totalDistanceMeters),
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationSeconds,
      avgSpeedKmh: parseFloat(avgSpeedKmh.toFixed(2)),
      avgPaceMinKm: parseFloat(avgPaceMinKm.toFixed(2)),
      caloriesBurned,
      areaCoveredKm2: territoryResult.totalAreaKm2,
      areaCoveredM2: territoryResult.totalAreaM2,
      uniqueCells: territoryResult.allCells,
      uniqueCellsCount: territoryResult.allCells.length,
      interiorCellsCount: territoryResult.interiorCells.length,
      perimeterCellsCount: territoryResult.perimeterCells.length,
      loopsCount: territoryResult.loopsCount,
    };
  }
}
