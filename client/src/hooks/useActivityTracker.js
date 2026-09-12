import { useState, useEffect, useRef, useCallback } from 'react';
import { validateGpsPoint } from '../lib/gps-validator.js';
import { GpsBuffer } from '../lib/gps-buffer.js';
import { FITNESS_CONFIG } from '../config/fitness.config.js';
import {
  latLngToH3,
  calculateDistanceMeters,
  extractCoveredCellsFromPath,
  extractEnclosedTerritoryGeometry,
  extractEnclosedTerritoryCells,
  detectLatestLoopEnclosure,
  interpolateCircuitPath,
  H3_DEFAULT_RESOLUTION,
  H3_CELL_AREA_KM2,
  CLOSURE_TOLERANCE_METERS,
} from '../lib/spatial.js';
import { sounds } from '../lib/audio.js';
import { api } from '../lib/api.js';

export const ACTIVITY_STATES = {
  IDLE: 'IDLE',
  REQUESTING_LOCATION: 'REQUESTING_LOCATION',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  BREAK: 'BREAK',
  PAUSED: 'BREAK', // Alias for backward compatibility
  STOPPING: 'STOPPING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

export const LOCATION_ERRORS = {
  UNSUPPORTED: 'UNSUPPORTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE: 'POSITION_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
};

/**
 * FAST live metrics — only computes distance/pace/calories.
 * Uses the already-tracked capturedHexes set for cell counts.
 * Does NOT run the full geometry engine (no H3 rasterization).
 */
function computeLiveMetrics(cleanPoints = [], userWeightKg = 70, existingCapturedHexes = null, loopsCount = 0) {
  const cellCount = existingCapturedHexes ? existingCapturedHexes.size : 0;
  if (!cleanPoints || cleanPoints.length < 2) {
    return {
      distanceMeters: 0,
      distanceKm: 0,
      durationSeconds: 0,
      avgSpeedKmh: 0,
      avgPaceMinKm: 0,
      caloriesBurned: 0,
      areaCoveredKm2: parseFloat((cellCount * H3_CELL_AREA_KM2).toFixed(6)),
      areaCoveredM2: Math.round(cellCount * H3_CELL_AREA_KM2 * 1000000),
      uniqueCells: [],
      uniqueCellsCount: cellCount,
      interiorCellsCount: 0,
      perimeterCellsCount: cellCount,
      loopsCount,
      intersectionsCount: 0,
      geometryStatus: 'EMPTY',
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
  const avgPaceMinKm = distanceKm > 0 ? durationSeconds / 60 / distanceKm : 0;

  const areaCoveredKm2 = parseFloat((cellCount * H3_CELL_AREA_KM2).toFixed(6));
  const areaCoveredM2 = Math.round(areaCoveredKm2 * 1000000);

  const MET = avgSpeedKmh > 8.5 ? 9.8 : avgSpeedKmh > 5 ? 7.0 : 3.8;
  const caloriesBurned = Math.round(MET * userWeightKg * hours);

  return {
    distanceMeters: Math.round(totalDistanceMeters),
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    durationSeconds,
    avgSpeedKmh: parseFloat(avgSpeedKmh.toFixed(2)),
    avgPaceMinKm: parseFloat(avgPaceMinKm.toFixed(2)),
    caloriesBurned,
    areaCoveredKm2,
    areaCoveredM2,
    uniqueCells: [],
    uniqueCellsCount: cellCount,
    interiorCellsCount: 0,
    perimeterCellsCount: cellCount,
    loopsCount,
    intersectionsCount: 0,
    geometryStatus: cellCount > 0 ? 'LIVE' : 'EMPTY',
  };
}

/**
 * FULL metrics — runs the complete geometry engine with H3 rasterization.
 * Only called ONCE when the activity is finalized/stopped.
 */
function computeFullMetrics(cleanPoints = [], userWeightKg = 70, existingCapturedHexes = null) {
  if (!cleanPoints || cleanPoints.length < 2) {
    return {
      distanceMeters: 0,
      distanceKm: 0,
      durationSeconds: 0,
      avgSpeedKmh: 0,
      avgPaceMinKm: 0,
      caloriesBurned: 0,
      areaCoveredKm2: 0,
      areaCoveredM2: 0,
      uniqueCells: existingCapturedHexes ? Array.from(existingCapturedHexes) : [],
      uniqueCellsCount: existingCapturedHexes ? existingCapturedHexes.size : 0,
      interiorCellsCount: 0,
      perimeterCellsCount: 0,
      loopsCount: 0,
      intersectionsCount: 0,
      geometryStatus: 'EMPTY',
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
  const avgPaceMinKm = distanceKm > 0 ? durationSeconds / 60 / distanceKm : 0;

  // Authoritative geometry extraction (Perimeter + Noded Planar Polygons)
  const territoryResult = extractEnclosedTerritoryGeometry(cleanPoints, {
    closureToleranceMeters: CLOSURE_TOLERANCE_METERS,
    resolution: H3_DEFAULT_RESOLUTION,
  });

  const cellSet = new Set(territoryResult.allCells);
  if (existingCapturedHexes) {
    for (const h of existingCapturedHexes) {
      cellSet.add(h);
    }
  }

  const uniqueCells = Array.from(cellSet);
  const areaCoveredKm2 = parseFloat(
    Math.max(uniqueCells.length * H3_CELL_AREA_KM2, territoryResult.totalAreaKm2).toFixed(6)
  );
  const areaCoveredM2 = Math.round(areaCoveredKm2 * 1000000);

  const MET = avgSpeedKmh > 8.5 ? 9.8 : avgSpeedKmh > 5 ? 7.0 : 3.8;
  const caloriesBurned = Math.round(MET * userWeightKg * hours);

  return {
    distanceMeters: Math.round(totalDistanceMeters),
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    durationSeconds,
    avgSpeedKmh: parseFloat(avgSpeedKmh.toFixed(2)),
    avgPaceMinKm: parseFloat(avgPaceMinKm.toFixed(2)),
    caloriesBurned,
    areaCoveredKm2,
    areaCoveredM2,
    uniqueCells,
    uniqueCellsCount: uniqueCells.length,
    interiorCellsCount: territoryResult.interiorCells.length,
    perimeterCellsCount: territoryResult.perimeterCells.length,
    loopsCount: territoryResult.loopsCount,
    intersectionsCount: territoryResult.intersectionsCount,
    geometryStatus: territoryResult.status,
    polygons: territoryResult.polygons,
  };
}

export function useActivityTracker({
  activeUser,
  activityType = 'RUN',
  onLocationUpdate = null,
  onNewCellsCaptured = null,
  onActivityComplete = null,
}) {
  const [state, setState] = useState(ACTIVITY_STATES.IDLE);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  const [userLocation, setUserLocation] = useState(null);
  const [trailCoordinates, setTrailCoordinates] = useState([]);
  const [gpsPoints, setGpsPoints] = useState([]);

  // Timer & Break States
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [breakRemainingSeconds, setBreakRemainingSeconds] = useState(FITNESS_CONFIG.BREAK.BREAK_DURATION_LIMIT_SECONDS);
  const [breakElapsedSeconds, setBreakElapsedSeconds] = useState(0);
  const [totalBreakSeconds, setTotalBreakSeconds] = useState(0);
  const [activeSecondsSinceLastBreak, setActiveSecondsSinceLastBreak] = useState(0);
  const [breaksCount, setBreaksCount] = useState(0);
  const [breakHistory, setBreakHistory] = useState([]);
  const [breakWarningMessage, setBreakWarningMessage] = useState(null);
  const [terminationNotice, setTerminationNotice] = useState(null);

  // Speed Metrics
  const [currentSpeedMs, setCurrentSpeedMs] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);

  const [currentHex, setCurrentHex] = useState(null);
  const [capturedHexes, setCapturedHexes] = useState(new Set());
  const [loopsDetectedCount, setLoopsDetectedCount] = useState(0);
  const [accuracyMeters, setAccuracyMeters] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [isSimulated, setIsSimulated] = useState(false);

  // References
  const isSimulatedRef = useRef(false);
  const watchIdRef = useRef(null);
  const simIntervalRef = useRef(null);
  const wakeLockRef = useRef(null);
  const activeTimerRef = useRef(null);
  const breakCountdownTimerRef = useRef(null);
  const breakStartTimestampRef = useRef(null);
  const previousPointRef = useRef(null);
  const lastActiveMovementPointRef = useRef(null);
  const activityStartTimeRef = useRef(null);
  const processedLoopKeysRef = useRef(new Set());
  const recentSpeedsRef = useRef([]);
  const slowSpeedTicksRef = useRef(0);

  // Callback References to prevent circular TDZ issues
  const handleRawPositionRef = useRef(null);
  const resumeTrackingRef = useRef(null);
  const triggerBreakRef = useRef(null);
  const startSimulatedTrackingRef = useRef(null);
  const stopTrackingRef = useRef(null);

  // Speed Config Resolution based on Activity Type
  const speedConfig = activityType === 'WALK' ? FITNESS_CONFIG.SPEED.WALK : FITNESS_CONFIG.SPEED.RUN;

  const setSimulated = useCallback((val) => {
    const bool = Boolean(val);
    isSimulatedRef.current = bool;
    setIsSimulated(bool);
    if (bool && watchIdRef.current !== null) {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
  }, []);

  // Auto-detect browser permission on mount
  useEffect(() => {
    let isCancelled = false;
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permissionStatus) => {
          if (isCancelled) return;
          setPermissionState(permissionStatus.state);
          if (permissionStatus.state === 'granted') {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (isCancelled || isSimulatedRef.current) return;
                const pt = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: Math.round(pos.coords.accuracy),
                  timestamp: pos.timestamp || Date.now(),
                };
                setUserLocation(pt);
                setAccuracyMeters(pt.accuracy);
                setState(ACTIVITY_STATES.READY);
                if (onLocationUpdate) onLocationUpdate(pt);
              },
              () => {},
              { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
            );
          }
          permissionStatus.onchange = () => {
            if (!isCancelled) setPermissionState(permissionStatus.state);
          };
        })
        .catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [onLocationUpdate]);

  const acquireWakeLock = useCallback(async () => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Screen WakeLock notice:', err.message);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // 1. Active Timer Management
  useEffect(() => {
    if (state === ACTIVITY_STATES.ACTIVE) {
      activeTimerRef.current = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);
        setActiveSecondsSinceLastBreak((prev) => prev + 1);
      }, 1000);
    } else {
      if (activeTimerRef.current) {
        clearInterval(activeTimerRef.current);
        activeTimerRef.current = null;
      }
    }

    return () => {
      if (activeTimerRef.current) clearInterval(activeTimerRef.current);
    };
  }, [state]);

  // 2. Break Countdown & Auto-Timeout Management
  useEffect(() => {
    if (state === ACTIVITY_STATES.BREAK) {
      breakCountdownTimerRef.current = setInterval(() => {
        setBreakElapsedSeconds((prev) => prev + 1);
        setBreakRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(breakCountdownTimerRef.current);
            breakCountdownTimerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (breakCountdownTimerRef.current) {
        clearInterval(breakCountdownTimerRef.current);
        breakCountdownTimerRef.current = null;
      }
    }

    return () => {
      if (breakCountdownTimerRef.current) clearInterval(breakCountdownTimerRef.current);
    };
  }, [state]);

  const requestLocationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setError({
        code: LOCATION_ERRORS.UNSUPPORTED,
        message: 'Your browser does not support Geolocation API.',
      });
      setState(ACTIVITY_STATES.FAILED);
      return false;
    }

    setState(ACTIVITY_STATES.REQUESTING_LOCATION);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isSimulatedRef.current) {
            resolve(true);
            return;
          }
          const { latitude, longitude, accuracy } = pos.coords;
          setPermissionState('granted');
          const initialPt = {
            latitude,
            longitude,
            accuracy: Math.round(accuracy),
            timestamp: pos.timestamp || Date.now(),
          };
          setUserLocation(initialPt);
          setAccuracyMeters(Math.round(accuracy));
          setState(ACTIVITY_STATES.READY);
          if (onLocationUpdate) onLocationUpdate(initialPt);
          resolve(true);
        },
        (err) => {
          let code = LOCATION_ERRORS.UNKNOWN;
          let msg = 'Failed to acquire current location.';

          if (err.code === 1) {
            code = LOCATION_ERRORS.PERMISSION_DENIED;
            msg = 'Location permission was denied. Please allow location access in your browser settings.';
            setPermissionState('denied');
          } else if (err.code === 2) {
            code = LOCATION_ERRORS.POSITION_UNAVAILABLE;
            msg = 'Location signal unavailable. Ensure GPS / Location is turned on.';
          } else if (err.code === 3) {
            code = LOCATION_ERRORS.TIMEOUT;
            msg = 'Location request timed out. Please try again with clear sky view.';
          }

          setError({ code, message: msg });
          setState(ACTIVITY_STATES.FAILED);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    });
  }, [onLocationUpdate]);

  // Break Availability Evaluation (20-min active cooldown rule)
  const isBreakEligible =
    breaksCount === 0
      ? activeSeconds >= FITNESS_CONFIG.BREAK.INITIAL_BREAK_AVAILABLE_AFTER
      : activeSecondsSinceLastBreak >= FITNESS_CONFIG.BREAK.ACTIVE_COOLDOWN_SECONDS;

  const breakCooldownRemainingSeconds = Math.max(
    0,
    (breaksCount === 0
      ? FITNESS_CONFIG.BREAK.INITIAL_BREAK_AVAILABLE_AFTER
      : FITNESS_CONFIG.BREAK.ACTIVE_COOLDOWN_SECONDS) - activeSecondsSinceLastBreak
  );

  // Trigger Break State
  const triggerBreak = useCallback(
    (reason = 'USER_REQUESTED') => {
      if (state !== ACTIVITY_STATES.ACTIVE) return false;

      // Enforce 20-minute active cooldown
      if (!isBreakEligible && reason !== 'FORCE_STOP') {
        const remainingMin = Math.ceil(breakCooldownRemainingSeconds / 60);
        setBreakWarningMessage(
          `Break unavailable. You must complete ${remainingMin} more minute${
            remainingMin > 1 ? 's' : ''
          } of active movement before your next 5-minute break.`
        );
        setTimeout(() => setBreakWarningMessage(null), 5000);
        return false;
      }

      breakStartTimestampRef.current = Date.now();
      setBreakRemainingSeconds(FITNESS_CONFIG.BREAK.BREAK_DURATION_LIMIT_SECONDS);
      setBreakElapsedSeconds(0);
      setBreaksCount((prev) => prev + 1);
      setActiveSecondsSinceLastBreak(0);
      slowSpeedTicksRef.current = 0;
      setState(ACTIVITY_STATES.BREAK);

      try {
        sounds.playCaptureTone(false);
      } catch (e) {}

      return true;
    },
    [state, isBreakEligible, breakCooldownRemainingSeconds]
  );
  triggerBreakRef.current = triggerBreak;

  // Handle Raw GPS Position callback
  const handleRawPosition = useCallback(
    (pos) => {
      if (isSimulatedRef.current && !pos.isSimulated && !pos.coords?.isSimulated) {
        return;
      }

      const raw = {
        latitude: pos.coords ? pos.coords.latitude : pos.latitude,
        longitude: pos.coords ? pos.coords.longitude : pos.longitude,
        accuracy: pos.coords ? pos.coords.accuracy : (pos.accuracy ?? 10),
        speed: pos.coords ? pos.coords.speed : (pos.speed ?? null),
        timestamp: pos.timestamp || Date.now(),
        isSimulated: Boolean(pos.isSimulated || pos.coords?.isSimulated),
      };

      setAccuracyMeters(Math.round(raw.accuracy || 10));

      const isFirstPoint = previousPointRef.current === null;
      const livePt = {
        latitude: raw.latitude,
        longitude: raw.longitude,
        accuracy: Math.round(raw.accuracy || 10),
        timestamp: raw.timestamp,
        speed: raw.speed,
        forceFly: isFirstPoint,
      };
      setUserLocation(livePt);
      if (onLocationUpdate) {
        onLocationUpdate(livePt);
      }

      const prev = previousPointRef.current;
      const validation = validateGpsPoint(raw, prev);
      if (!validation.valid || !validation.cleanedPoint) {
        return;
      }

      const clean = validation.cleanedPoint;
      const currentSpeed = clean.speed !== null && clean.speed !== undefined ? clean.speed : 0;
      setCurrentSpeedMs(currentSpeed);
      setCurrentSpeedKmh(parseFloat((currentSpeed * 3.6).toFixed(1)));

      recentSpeedsRef.current.push(currentSpeed);
      if (recentSpeedsRef.current.length > FITNESS_CONFIG.SPEED.SPEED_SMOOTHING_WINDOW) {
        recentSpeedsRef.current.shift();
      }
      const avgSpeed =
        recentSpeedsRef.current.reduce((a, b) => a + b, 0) / recentSpeedsRef.current.length;

      // Handle BREAK State GPS behavior: filter stationary drift and detect auto-resumption
      if (state === ACTIVITY_STATES.BREAK) {
        const lastMovementPt = lastActiveMovementPointRef.current || prev;
        if (lastMovementPt) {
          const distFromBreakPoint = calculateDistanceMeters(
            lastMovementPt.latitude,
            lastMovementPt.longitude,
            clean.latitude,
            clean.longitude
          );
          if (
            distFromBreakPoint > FITNESS_CONFIG.GPS.STATIONARY_DRIFT_RADIUS_METERS &&
            avgSpeed >= speedConfig.MIN_ACTIVE_SPEED_MS
          ) {
            if (resumeTrackingRef.current) {
              resumeTrackingRef.current();
            }
          }
        }
        return;
      }

      // Handle ACTIVE State: Check for automatic slowdown / break detection
      if (state === ACTIVITY_STATES.ACTIVE) {
        if (avgSpeed < speedConfig.SLOWDOWN_THRESHOLD_MS) {
          slowSpeedTicksRef.current += 1;
          if (slowSpeedTicksRef.current >= FITNESS_CONFIG.SPEED.SLOW_DETECTION_SECONDS) {
            if (isBreakEligible && triggerBreakRef.current) {
              triggerBreakRef.current('SPEED_SLOWDOWN');
              return;
            }
          }
        } else {
          slowSpeedTicksRef.current = 0;
        }
      }

      previousPointRef.current = clean;
      lastActiveMovementPointRef.current = clean;

      setGpsPoints((prevPoints) => [...prevPoints, clean]);

      const nextCoord = [clean.longitude, clean.latitude];
      setTrailCoordinates((prevCoords) => {
        const updatedTrail = [...prevCoords, nextCoord];

        // Real-time Geometry Extraction & Paper.io Loop Enclosure
        const { newLoop, interiorCells } = detectLatestLoopEnclosure(
          updatedTrail,
          processedLoopKeysRef.current,
          H3_DEFAULT_RESOLUTION
        );

        if (newLoop) {
          processedLoopKeysRef.current.add(newLoop.loopKey);
          setLoopsDetectedCount((c) => c + 1);
        }

        // Perimeter cells for current step
        const segmentCoords = prev ? [prev, clean] : [clean];
        const newPerimeterHexes = extractCoveredCellsFromPath(segmentCoords, H3_DEFAULT_RESOLUTION);

        const combinedNewCells = [...newPerimeterHexes, ...interiorCells];

        if (combinedNewCells.length > 0) {
          setCurrentHex(combinedNewCells[combinedNewCells.length - 1]);
          setCapturedHexes((prevCaptured) => {
            const freshCaptures = [];
            const updated = new Set(prevCaptured);
            for (const hex of combinedNewCells) {
              if (!updated.has(hex)) {
                updated.add(hex);
                freshCaptures.push(hex);
              }
            }
            if (freshCaptures.length > 0) {
              try {
                if (newLoop) {
                  sounds.playVictoryFanfare();
                } else {
                  sounds.playCaptureTone(false);
                }
              } catch (e) {}

              // Batch notify parent of conquered cells
              if (onNewCellsCaptured) onNewCellsCaptured(freshCaptures);
              return updated;
            }
            return prevCaptured;
          });
        }

        return updatedTrail;
      });

      GpsBuffer.appendPoint(clean);
    },
    [
      state,
      speedConfig,
      isBreakEligible,
      onLocationUpdate,
      onNewCellsCaptured,
    ]
  );
  handleRawPositionRef.current = handleRawPosition;

  // Start Simulated Tracking
  const startSimulatedTracking = useCallback(
    (circuitCoords = [], speedMultiplier = 2) => {
      if (!circuitCoords || circuitCoords.length === 0) return;

      const densePath = interpolateCircuitPath(circuitCoords, 1.5);
      if (densePath.length === 0) return;

      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      try {
        sounds.playStartTone();
      } catch (e) {}

      setIsSimulated(true);
      isSimulatedRef.current = true;
      const startTimestamp = Date.now();
      activityStartTimeRef.current = startTimestamp;
      setGpsPoints([]);
      setTrailCoordinates([]);
      setCapturedHexes(new Set());
      setActiveSeconds(0);
      setBreakRemainingSeconds(FITNESS_CONFIG.BREAK.BREAK_DURATION_LIMIT_SECONDS);
      setBreakElapsedSeconds(0);
      setTotalBreakSeconds(0);
      setActiveSecondsSinceLastBreak(0);
      setBreaksCount(0);
      setBreakHistory([]);
      setLoopsDetectedCount(0);
      setBreakWarningMessage(null);
      setTerminationNotice(null);
      processedLoopKeysRef.current = new Set();
      recentSpeedsRef.current = [];
      slowSpeedTicksRef.current = 0;
      previousPointRef.current = null;
      lastActiveMovementPointRef.current = null;
      setError(null);
      setSummaryData(null);
      setState(ACTIVITY_STATES.ACTIVE);

      let stepIndex = 0;
      let simulatedTime = startTimestamp;
      const initialLngLat = densePath[0];
      const initialPos = {
        latitude: initialLngLat[1],
        longitude: initialLngLat[0],
        accuracy: 6,
        speed: speedConfig.MIN_ACTIVE_SPEED_MS + 1.0,
        timestamp: simulatedTime,
        isSimulated: true,
      };
      if (handleRawPositionRef.current) {
        handleRawPositionRef.current(initialPos);
      }

      const intervalMs = Math.max(400, Math.round(1400 / speedMultiplier));

      simIntervalRef.current = setInterval(() => {
        stepIndex = (stepIndex + 1) % densePath.length;
        const [lng, lat] = densePath[stepIndex];
        simulatedTime += intervalMs;

        const nextPoint = {
          latitude: lat,
          longitude: lng,
          accuracy: 5,
          speed: speedConfig.MIN_ACTIVE_SPEED_MS + 1.2,
          timestamp: simulatedTime,
          isSimulated: true,
        };

        if (handleRawPositionRef.current) {
          handleRawPositionRef.current(nextPoint);
        }
      }, intervalMs);
    },
    [speedConfig]
  );
  startSimulatedTrackingRef.current = startSimulatedTracking;

  // Resume Tracking from Break
  const resumeTracking = useCallback(
    (circuitCoords = [], speedMultiplier = 2) => {
      if (state !== ACTIVITY_STATES.BREAK) return;

      const breakEnd = Date.now();
      const breakStart = breakStartTimestampRef.current || breakEnd;
      const duration = Math.max(1, Math.round((breakEnd - breakStart) / 1000));

      setTotalBreakSeconds((prev) => prev + duration);
      setBreakHistory((prev) => [
        ...prev,
        {
          start: breakStart,
          end: breakEnd,
          duration,
        },
      ]);
      setBreakElapsedSeconds(0);
      breakStartTimestampRef.current = null;
      slowSpeedTicksRef.current = 0;
      setBreakWarningMessage(null);

      try {
        sounds.playStartTone();
      } catch (e) {}

      if (isSimulated || isSimulatedRef.current) {
        if (circuitCoords && circuitCoords.length > 0 && startSimulatedTrackingRef.current) {
          startSimulatedTrackingRef.current(circuitCoords, speedMultiplier);
        } else {
          setState(ACTIVITY_STATES.ACTIVE);
        }
      } else {
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              if (handleRawPositionRef.current) handleRawPositionRef.current(pos);
            },
            (err) => console.warn('Watch notice on resume:', err.message),
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
          );
        }
        setState(ACTIVITY_STATES.ACTIVE);
      }
    },
    [state, isSimulated]
  );
  resumeTrackingRef.current = resumeTracking;

  // Stop & Authoritative Finalization
  const stopTracking = useCallback(
    async (options = {}) => {
      if (state !== ACTIVITY_STATES.ACTIVE && state !== ACTIVITY_STATES.BREAK) return;

      const isTimeout = options?.reason === 'BREAK_TIMEOUT_EXCEEDED' || breakRemainingSeconds === 0;
      if (isTimeout) {
        setTerminationNotice('Activity ended because the break exceeded 5 minutes.');
      }

      setState(ACTIVITY_STATES.STOPPING);
      releaseWakeLock();

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }

      // If stopped while in break, record final break duration
      if (breakStartTimestampRef.current) {
        const breakEnd = Date.now();
        const duration = Math.max(1, Math.round((breakEnd - breakStartTimestampRef.current) / 1000));
        setTotalBreakSeconds((prev) => prev + duration);
        setBreakHistory((prev) => [
          ...prev,
          { start: breakStartTimestampRef.current, end: breakEnd, duration },
        ]);
        breakStartTimestampRef.current = null;
      }

      if (gpsPoints.length < 2) {
        GpsBuffer.clearBuffer();
        setState(ACTIVITY_STATES.IDLE);
        return;
      }

      // Authoritative area and territory extraction on full validated path (runs ONCE)
      const clientMetrics = computeFullMetrics(gpsPoints, 70, capturedHexes);
      clientMetrics.durationSeconds = activeSeconds;

      try {
        const data = await api.post('/activity', {
          userId: activeUser?.id,
          type: activityType,
          gpsPoints,
          metrics: clientMetrics,
          breaks: breakHistory,
          activeDuration: activeSeconds,
          totalBreakDuration: totalBreakSeconds,
        });

        if (data.success) {
          GpsBuffer.clearBuffer();
          const finalResult = {
            ...data.data,
            metrics: clientMetrics,
            terminationReason: isTimeout ? 'BREAK_TIMEOUT_EXCEEDED' : 'USER_STOPPED',
          };
          setSummaryData(finalResult);
          setState(ACTIVITY_STATES.COMPLETED);
          try {
            sounds.playVictoryFanfare();
          } catch (e) {}
          if (onActivityComplete) {
            onActivityComplete(finalResult);
          }
        } else {
          const fallbackSummary = {
            activityId: `act-${Date.now()}`,
            metrics: clientMetrics,
            activeDuration: activeSeconds,
            totalBreakDuration: totalBreakSeconds,
            breaksCount,
            xpGained: Math.round(clientMetrics.distanceMeters / 10) + clientMetrics.uniqueCellsCount * 25,
            cellsCoveredCount: clientMetrics.uniqueCellsCount,
            totalAreaKm2: clientMetrics.areaCoveredKm2,
            totalAreaM2: clientMetrics.areaCoveredM2,
            terminationReason: isTimeout ? 'BREAK_TIMEOUT_EXCEEDED' : 'USER_STOPPED',
          };
          setSummaryData(fallbackSummary);
          setState(ACTIVITY_STATES.COMPLETED);
          if (onActivityComplete) {
            onActivityComplete(fallbackSummary);
          }
        }
      } catch (err) {
        console.error('Failed to submit activity to server:', err);
        const fallbackSummary = {
          activityId: `act-${Date.now()}`,
          metrics: clientMetrics,
          activeDuration: activeSeconds,
          totalBreakDuration: totalBreakSeconds,
          breaksCount,
          xpGained: Math.round(clientMetrics.distanceMeters / 10) + clientMetrics.uniqueCellsCount * 25,
          cellsCoveredCount: clientMetrics.uniqueCellsCount,
          totalAreaKm2: clientMetrics.areaCoveredKm2,
          totalAreaM2: clientMetrics.areaCoveredM2,
          terminationReason: isTimeout ? 'BREAK_TIMEOUT_EXCEEDED' : 'USER_STOPPED',
        };
        setSummaryData(fallbackSummary);
        setState(ACTIVITY_STATES.COMPLETED);
        if (onActivityComplete) {
          onActivityComplete(fallbackSummary);
        }
      }
    },
    [
      state,
      activeUser,
      activityType,
      gpsPoints,
      activeSeconds,
      totalBreakSeconds,
      breaksCount,
      breakHistory,
      capturedHexes,
      breakRemainingSeconds,
      releaseWakeLock,
      onActivityComplete,
    ]
  );
  stopTrackingRef.current = stopTracking;

  // Watch for break countdown reaching 0 -> triggers auto finalization!
  useEffect(() => {
    if (state === ACTIVITY_STATES.BREAK && breakRemainingSeconds === 0) {
      if (stopTrackingRef.current) {
        stopTrackingRef.current({ reason: 'BREAK_TIMEOUT_EXCEEDED' });
      }
    }
  }, [state, breakRemainingSeconds]);

  const startTracking = useCallback(async () => {
    if (state === ACTIVITY_STATES.ACTIVE) return;

    if (state !== ACTIVITY_STATES.READY && permissionState !== 'granted') {
      const ok = await requestLocationPermission();
      if (!ok) return;
    }

    try {
      sounds.playStartTone();
    } catch (e) {}

    await acquireWakeLock();

    setIsSimulated(false);
    isSimulatedRef.current = false;
    activityStartTimeRef.current = Date.now();
    setGpsPoints([]);
    setTrailCoordinates([]);
    setCapturedHexes(new Set());
    setActiveSeconds(0);
    setBreakRemainingSeconds(FITNESS_CONFIG.BREAK.BREAK_DURATION_LIMIT_SECONDS);
    setBreakElapsedSeconds(0);
    setTotalBreakSeconds(0);
    setActiveSecondsSinceLastBreak(0);
    setBreaksCount(0);
    setBreakHistory([]);
    setLoopsDetectedCount(0);
    setBreakWarningMessage(null);
    setTerminationNotice(null);
    processedLoopKeysRef.current = new Set();
    recentSpeedsRef.current = [];
    slowSpeedTicksRef.current = 0;
    previousPointRef.current = null;
    lastActiveMovementPointRef.current = null;
    setError(null);
    setSummaryData(null);

    GpsBuffer.saveActivitySnapshot({
      activityId: `act-${Date.now()}`,
      userId: activeUser?.id,
      type: activityType,
      startedAt: new Date().toISOString(),
      points: [],
      status: 'ACTIVE',
    });

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (handleRawPositionRef.current) handleRawPositionRef.current(pos);
        },
        (err) => console.warn('Initial fix notice:', err.message),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (handleRawPositionRef.current) handleRawPositionRef.current(pos);
        },
        (err) => {
          console.warn('Geolocation watch notice:', err.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 10000,
        }
      );
    }

    setState(ACTIVITY_STATES.ACTIVE);
  }, [
    state,
    permissionState,
    activeUser,
    activityType,
    requestLocationPermission,
    acquireWakeLock,
  ]);

  const pauseTracking = useCallback(() => {
    if (triggerBreakRef.current) {
      return triggerBreakRef.current('USER_REQUESTED');
    }
    return false;
  }, []);

  const resetTracker = useCallback(() => {
    releaseWakeLock();
    if (watchIdRef.current !== null) {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setState(ACTIVITY_STATES.IDLE);
    setGpsPoints([]);
    setTrailCoordinates([]);
    setCapturedHexes(new Set());
    setActiveSeconds(0);
    setBreakRemainingSeconds(FITNESS_CONFIG.BREAK.BREAK_DURATION_LIMIT_SECONDS);
    setBreakElapsedSeconds(0);
    setTotalBreakSeconds(0);
    setActiveSecondsSinceLastBreak(0);
    setBreaksCount(0);
    setBreakHistory([]);
    setLoopsDetectedCount(0);
    setBreakWarningMessage(null);
    setTerminationNotice(null);
    processedLoopKeysRef.current = new Set();
    recentSpeedsRef.current = [];
    slowSpeedTicksRef.current = 0;
    setError(null);
    setSummaryData(null);
    previousPointRef.current = null;
    lastActiveMovementPointRef.current = null;
    breakStartTimestampRef.current = null;
  }, [releaseWakeLock]);

  useEffect(() => {
    return () => {
      releaseWakeLock();
      if (watchIdRef.current !== null) {
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
      if (activeTimerRef.current) {
        clearInterval(activeTimerRef.current);
      }
      if (breakCountdownTimerRef.current) {
        clearInterval(breakCountdownTimerRef.current);
      }
    };
  }, [releaseWakeLock]);

  // Fast live metrics — NO geometry engine, just distance/pace/calories + existing hex count
  const liveMetrics = computeLiveMetrics(gpsPoints, 70, capturedHexes, loopsDetectedCount);
  liveMetrics.durationSeconds = activeSeconds;

  let accuracyQuality = 'LOW';
  if (accuracyMeters !== null) {
    if (accuracyMeters <= 15) accuracyQuality = 'HIGH';
    else if (accuracyMeters <= 50) accuracyQuality = 'MEDIUM';
    else accuracyQuality = 'LOW';
  }

  return {
    state,
    error,
    permissionState,
    userLocation,
    trailCoordinates,
    gpsPoints,
    activeSeconds,
    breakRemainingSeconds,
    breakElapsedSeconds,
    totalBreakSeconds,
    activeSecondsSinceLastBreak,
    isBreakEligible,
    breakCooldownRemainingSeconds,
    breaksCount,
    breakHistory,
    breakWarningMessage,
    terminationNotice,
    elapsedSeconds: activeSeconds + totalBreakSeconds,
    currentSpeedMs,
    currentSpeedKmh,
    currentHex,
    capturedHexes,
    loopsDetectedCount,
    accuracyMeters,
    accuracyQuality,
    summaryData,
    liveMetrics,
    isSimulated,
    setSimulated,
    requestLocationPermission,
    startTracking,
    startSimulatedTracking,
    pauseTracking,
    triggerBreak,
    resumeTracking,
    stopTracking,
    resetTracker,
    handleRawPosition,
  };
}
