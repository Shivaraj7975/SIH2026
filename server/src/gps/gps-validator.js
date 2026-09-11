import { AntiCheatService, DEFAULT_ANTI_CHEAT_CONFIG } from './anti-cheat.service.js';

export { AntiCheatService, DEFAULT_ANTI_CHEAT_CONFIG };
export const GPS_CONFIG = DEFAULT_ANTI_CHEAT_CONFIG;

export function validateGpsPoint(rawPoint, previousValidPoint = null, config = DEFAULT_ANTI_CHEAT_CONFIG) {
  return AntiCheatService.validateGpsPoint(rawPoint, previousValidPoint, config);
}

export function validateAndCleanTrail(rawPoints = [], options = {}) {
  const result = AntiCheatService.validateActivity(rawPoints, options);
  return {
    validPoints: result.validPoints,
    rejectedCount: result.anomalies.rejectedCount,
    validationStatus: result.validationStatus,
    reasons: result.reasons,
    confidenceScore: result.confidenceScore,
    anomalies: result.anomalies,
    metrics: result.metrics,
  };
}

export function computeAuthoritativeMetrics(cleanPoints = [], userWeightKg = 70) {
  return AntiCheatService.computeCleanTrailMetrics(cleanPoints, userWeightKg);
}
