/**
 * Central Fitness Gameplay Configuration (Client)
 *
 * Single source of truth for:
 * - Speed thresholds for RUN and WALK
 * - Break and pause management (5 min duration, 20 min active cooldown)
 * - GPS noise & stationary drift filtering
 * - Geometry tolerance & H3 territory capture
 */

export const FITNESS_CONFIG = {
  // Speed Thresholds (in meters/second: 1 m/s = 3.6 km/h)
  SPEED: {
    RUN: {
      MIN_ACTIVE_SPEED_MS: 1.8,     // ~6.5 km/h: Minimum speed to be considered actively running
      SLOWDOWN_THRESHOLD_MS: 1.2,   // ~4.3 km/h: Below this triggers slowdown / break detection
      MAX_HUMAN_SPEED_MS: 11.5,     // ~41.4 km/h: Human sprint ceiling (anti-cheat)
    },
    WALK: {
      MIN_ACTIVE_SPEED_MS: 0.65,    // ~2.3 km/h: Minimum speed to be considered actively walking
      SLOWDOWN_THRESHOLD_MS: 0.35,  // ~1.3 km/h: Below this triggers stop / break detection
      MAX_HUMAN_SPEED_MS: 4.0,      // ~14.4 km/h: Walking/jogging ceiling
    },
    SPEED_SMOOTHING_WINDOW: 3,      // Number of consecutive GPS points for moving average speed
    SLOW_DETECTION_SECONDS: 4,      // Seconds below threshold before switching from ACTIVE to BREAK
  },

  // Break & Pause Management
  BREAK: {
    BREAK_DURATION_LIMIT_SECONDS: 300,   // 5 minutes maximum break duration
    ACTIVE_COOLDOWN_SECONDS: 1200,       // 20 minutes (1200s) of ACTIVE movement required between breaks
    INITIAL_BREAK_AVAILABLE_AFTER: 60,   // Grace period (1 min) after starting before first break is permitted
    COUNTDOWN_WARNING_SECONDS: 60,       // Warn athlete when 1 minute remains in break
  },

  // GPS Accuracy & Stationary Drift Rejection
  GPS: {
    MAX_ACCEPTABLE_ACCURACY_METERS: 40,  // Discard raw points with accuracy worse than 40m
    MIN_DISTANCE_DELTA_METERS: 0.8,      // Minimum movement distance to accept new coordinate
    STATIONARY_DRIFT_RADIUS_METERS: 3.0, // Stationary jitter radius to ignore while stopped / in break
    MIN_TIME_DELTA_MS: 250,              // Minimum time between valid GPS points
    MAX_FUTURE_TIME_DRIFT_MS: 60000,     // Clock drift tolerance
  },

  // Geometry & Enclosed Territory Detection
  GEOMETRY: {
    PROXIMITY_CLOSURE_TOLERANCE_METERS: 45.0, // Radius to snap loop closure to earlier route geometry/segments (20-45m)
    MIN_ENCLOSED_POLYGON_AREA_M2: 5.0,        // Minimum polygon area to qualify as valid enclosed territory
    MIN_LOOP_POINTS: 3,                       // Minimum vertices to form a closed ring
    H3_RESOLUTION: 13,                        // Road/track hexagon resolution (~3.6m edge, ~7.2m diameter, ~43 m² area)
    H3_CELL_AREA_KM2: 0.000043,               // Area per cell at Res 13 (~43 m²)
    INTERPOLATION_STEP_METERS: 2.0,           // Path interpolation density for continuous hex coverage
  },
};
