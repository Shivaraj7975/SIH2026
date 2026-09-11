import { calculateDistanceMeters, latLngToH3 } from './spatial.js';

export const GPS_CONFIG = {
  MAX_ACCURACY_METERS: 120, // Allows browser/laptop WiFi geolocation and urban indoor testing
  MAX_HUMAN_SPEED_MS: 15.0,
  MIN_DISTANCE_DELTA_METERS: 0.8,
  MIN_TIME_DELTA_MS: 200,
  MAX_FUTURE_TIME_DRIFT_MS: 60000,
};

export function validateGpsPoint(rawPoint, previousValidPoint = null) {
  if (!rawPoint || typeof rawPoint !== 'object') {
    return { valid: false, reason: 'INVALID_OBJECT', cleanedPoint: null };
  }

  const lat = Number(rawPoint.latitude ?? rawPoint.lat ?? rawPoint[1]);
  const lng = Number(rawPoint.longitude ?? rawPoint.lng ?? rawPoint[0]);
  const timestamp = Number(rawPoint.timestamp || Date.now());
  const accuracy = rawPoint.accuracy !== undefined && rawPoint.accuracy !== null ? Number(rawPoint.accuracy) : 10;
  const speed = rawPoint.speed !== undefined && rawPoint.speed !== null ? Number(rawPoint.speed) : null;
  const isSimulated = Boolean(rawPoint.isSimulated);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, reason: 'COORDINATES_OUT_OF_BOUNDS', cleanedPoint: null };
  }

  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
    return { valid: false, reason: 'NULL_ISLAND_REJECTED', cleanedPoint: null };
  }

  // If point is from route simulator, validate immediately with clean metrics
  if (isSimulated) {
    return {
      valid: true,
      reason: null,
      cleanedPoint: {
        latitude: parseFloat(lat.toFixed(7)),
        longitude: parseFloat(lng.toFixed(7)),
        timestamp,
        accuracy: Math.round(accuracy),
        speed: speed !== null ? parseFloat(speed.toFixed(2)) : 3.8,
      },
    };
  }

  const now = Date.now();
  if (isNaN(timestamp) || timestamp <= 0) {
    return { valid: false, reason: 'INVALID_TIMESTAMP', cleanedPoint: null };
  }
  if (timestamp > now + GPS_CONFIG.MAX_FUTURE_TIME_DRIFT_MS) {
    return { valid: false, reason: 'TIMESTAMP_IN_FUTURE', cleanedPoint: null };
  }

  if (accuracy > GPS_CONFIG.MAX_ACCURACY_METERS) {
    return {
      valid: false,
      reason: `ACCURACY_TOO_LOW_${Math.round(accuracy)}M`,
      cleanedPoint: null,
    };
  }

  if (previousValidPoint) {
    const prevLat = Number(previousValidPoint.latitude ?? previousValidPoint.lat);
    const prevLng = Number(previousValidPoint.longitude ?? previousValidPoint.lng);
    const prevTimestamp = Number(previousValidPoint.timestamp);

    const timeDeltaMs = timestamp - prevTimestamp;
    if (timeDeltaMs < GPS_CONFIG.MIN_TIME_DELTA_MS) {
      return { valid: false, reason: 'TIME_DELTA_TOO_SMALL_OR_NEGATIVE', cleanedPoint: null };
    }

    const distanceMeters = calculateDistanceMeters(prevLat, prevLng, lat, lng);

    if (distanceMeters < GPS_CONFIG.MIN_DISTANCE_DELTA_METERS && timeDeltaMs < 3000) {
      return { valid: false, reason: 'DUPLICATE_OR_STATIC_JITTER', cleanedPoint: null };
    }

    const calculatedSpeedMs = distanceMeters / (timeDeltaMs / 1000);

    if (calculatedSpeedMs > GPS_CONFIG.MAX_HUMAN_SPEED_MS) {
      return {
        valid: false,
        reason: `IMPOSSIBLE_SPEED_${calculatedSpeedMs.toFixed(1)}MS`,
        cleanedPoint: null,
      };
    }
  }

  const cleanedPoint = {
    latitude: parseFloat(lat.toFixed(7)),
    longitude: parseFloat(lng.toFixed(7)),
    timestamp,
    accuracy: Math.round(accuracy),
    speed: speed !== null ? parseFloat(speed.toFixed(2)) : null,
  };

  return { valid: true, reason: null, cleanedPoint };
}
