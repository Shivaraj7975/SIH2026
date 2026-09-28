import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Sparkles,
  Navigation,
  Footprints,
  Activity,
  Radio,
  Shield,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useActivityTracker, ACTIVITY_STATES } from '../hooks/useActivityTracker.js';
import LocationPermissionModal from './workout/LocationPermissionModal.jsx';
import DailyResultModal from './ui/DailyResultModal.jsx';
import { RUNNING_RAW_DATA } from '../data/runningRawData.js';

export const DEMO_CIRCUITS = {
  curve: {
    id: 'curve',
    name: 'Curved On-Road Loop (~180m)',
    coords: RUNNING_RAW_DATA.curve.coords,
  },
  garden_crescent: {
    id: 'garden_crescent',
    name: 'Garden Crescent Loop (~190m)',
    coords: RUNNING_RAW_DATA.garden_crescent.coords,
  },
  boulevard_rotary: {
    id: 'boulevard_rotary',
    name: 'Boulevard Rotary Curve (~175m)',
    coords: RUNNING_RAW_DATA.boulevard_rotary.coords,
  },
};

function formatSeconds(secs) {
  const safeSecs = Math.max(0, secs || 0);
  const m = Math.floor(safeSecs / 60);
  const s = safeSecs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function WorkoutHUD({
  activeUser,
  onLocationUpdate,
  onWorkoutStart,
  onWorkoutComplete,
  onNewCellCaptured,
  onTrailUpdate,
  className = '',
}) {
  const [trackingEngine, setTrackingEngine] = useState('simulated'); // 'simulated' | 'real_gps'
  const [activityType, setActivityType] = useState('RUN');
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedCircuit, setSelectedCircuit] = useState('curve');
  const [simulationSpeed, setSimulationSpeed] = useState(8);
  // Maximized by default on mobile screens (<1024px), minimized on desktop
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [isPinned, setIsPinned] = useState(false); // If clicked, manual click controls take over from hover

  // Ensure mobile starts maximized on viewport changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && !isPinned) {
        setIsExpanded(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPinned]);

  // Hold-to-confirm Stop state (1.2s hold duration to avoid accidental stop mid-run)
  const [stopProgress, setStopProgress] = useState(0);
  const stopTimerRef = useRef(null);
  const stopStartTimeRef = useRef(null);

  const tracker = useActivityTracker({
    activeUser,
    activityType,
    onLocationUpdate: (pt) => {
      if (onLocationUpdate) onLocationUpdate(pt);
    },
    onNewCellsCaptured: (hexIds) => {
      if (onNewCellCaptured && hexIds && hexIds.length > 0) {
        onNewCellCaptured(hexIds);
      }
    },
    onActivityComplete: (data) => {
      setIsSummaryModalOpen(true);
      // On mobile keep maximized; on desktop return to minimized hover peek
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsExpanded(true);
      } else {
        setIsExpanded(false);
      }
      setIsPinned(false);   // Return to standard idle hover peek mode
      if (onWorkoutComplete) onWorkoutComplete(data);
    },
  });

  const isTracking = tracker.state === ACTIVITY_STATES.ACTIVE;
  const isBreak = tracker.state === ACTIVITY_STATES.BREAK;

  const prevTrailLengthRef = useRef(-1);
  useEffect(() => {
    const coords = tracker.trailCoordinates || [];
    if (onTrailUpdate && coords.length !== prevTrailLengthRef.current) {
      prevTrailLengthRef.current = coords.length;
      onTrailUpdate(coords);
    }
  }, [tracker.trailCoordinates, onTrailUpdate]);

  // Preview circuit start position
  useEffect(() => {
    if (trackingEngine === 'simulated' && tracker.state === ACTIVITY_STATES.IDLE) {
      if (tracker.setSimulated) tracker.setSimulated(true);
      const circuit = DEMO_CIRCUITS[selectedCircuit] || DEMO_CIRCUITS.curve;
      if (onLocationUpdate && circuit.coords && circuit.coords[0]) {
        onLocationUpdate({
          latitude: circuit.coords[0][1],
          longitude: circuit.coords[0][0],
          accuracy: 5,
          timestamp: Date.now(),
          isSimulated: true,
          forceFly: true,
        });
      }
    }
  }, [selectedCircuit, trackingEngine, tracker.state]);

  const handleStartClick = async () => {
    setIsPinned(true);
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsExpanded(false); // Automatically minimize into bottom bar when starting run on desktop
    }
    if (trackingEngine === 'real_gps') {
      if (tracker.permissionState !== 'granted') {
        setIsPermissionModalOpen(true);
      } else {
        if (onWorkoutStart) onWorkoutStart({ isSimulated: false });
        tracker.startTracking();
      }
    } else {
      if (onWorkoutStart) onWorkoutStart({ isSimulated: true, circuit: selectedCircuit });
      const circuit = DEMO_CIRCUITS[selectedCircuit] || DEMO_CIRCUITS.curve;
      tracker.startSimulatedTracking(circuit.coords, simulationSpeed);
    }
  };

  const handleRequestPermissionConfirm = async () => {
    const granted = await tracker.requestLocationPermission();
    if (granted) {
      setIsPermissionModalOpen(false);
      setIsPinned(true);
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setIsExpanded(false); // Automatically minimize into bottom bar when starting run on desktop
      }
      if (onWorkoutStart) onWorkoutStart({ isSimulated: false });
      tracker.startTracking();
    }
  };

  const handleResumeClick = () => {
    const circuit = DEMO_CIRCUITS[selectedCircuit] || DEMO_CIRCUITS.curve;
    tracker.resumeTracking(circuit.coords, simulationSpeed);
  };

  // Hold to stop confirmation handlers (1.2s ring fill)
  const startStopHold = () => {
    stopStartTimeRef.current = Date.now();
    stopTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - stopStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 1200) * 100);
      setStopProgress(progress);

      if (progress >= 100) {
        clearInterval(stopTimerRef.current);
        tracker.stopTracking({ reason: 'USER_STOPPED' });
        setStopProgress(0);
      }
    }, 30);
  };

  const cancelStopHold = () => {
    if (stopTimerRef.current) {
      clearInterval(stopTimerRef.current);
    }
    setStopProgress(0);
  };

  const metrics = tracker.liveMetrics;
  const distanceKm = metrics.distanceKm > 0 ? metrics.distanceKm.toFixed(2) : '0.00';
  const activeDurationFormatted = formatSeconds(tracker.activeSeconds);
  const paceFormatted = metrics.avgPaceMinKm > 0 ? metrics.avgPaceMinKm.toFixed(1) : null;
  const hexesClaimed = tracker.capturedHexes?.size || 0;

  return (
    <div
      onMouseEnter={() => {
        if (!isPinned && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          setIsExpanded(true);
        }
      }}
      onMouseLeave={() => {
        if (!isPinned && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          setIsExpanded(false);
        }
      }}
      className={`glass-dark-sheet text-white rounded-2xl lg:rounded-3xl border border-slate-800 shadow-xl lg:shadow-2xl transition-all duration-300 overflow-hidden font-sans ${className}`}
    >
      {/* Drag & Collapse Handle Header */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsPinned(true);
          setIsExpanded((prev) => !prev);
        }}
        className="pt-1.5 pb-1 lg:pt-2.5 lg:pb-1.5 px-3 lg:px-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/40 select-none group"
        title={isExpanded ? 'Click to Minimize HUD' : 'Click to Expand HUD'}
      >
        <div className="w-8 lg:w-10 h-1 rounded-full bg-slate-600 group-hover:bg-slate-400 transition-colors mb-0.5 lg:mb-1" />
      </div>

      {/* MINIMIZED / COLLAPSED STATE (Smooth Fade & Height Transition) */}
      <div
        className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          !isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div
            onClick={() => {
              setIsPinned(true);
              setIsExpanded(true);
            }}
            className="p-2.5 lg:p-3.5 pt-0.5 flex items-center justify-between gap-2.5 lg:gap-3 cursor-pointer hover:bg-slate-900/40 select-none"
          >
            {/* Mini 3 Stats */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 text-xs font-sans">
              <div>
                <span className="text-[9px] lg:text-[10px] uppercase font-semibold text-slate-400 block tracking-[0.06em]">Distance</span>
                <span className="font-display font-bold text-xs sm:text-sm lg:text-base text-white tabular-nums">{distanceKm} km</span>
              </div>
              <div className="h-5 lg:h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[9px] lg:text-[10px] uppercase font-semibold text-slate-400 block tracking-[0.06em]">
                  {isBreak ? 'Break Left' : 'Time'}
                </span>
                <span
                  className={`font-display font-bold text-xs sm:text-sm lg:text-base tabular-nums ${
                    isBreak ? 'text-amber-400 animate-pulse' : 'text-[#A3E635]'
                  }`}
                >
                  {isBreak ? formatSeconds(tracker.breakRemainingSeconds) : activeDurationFormatted}
                </span>
              </div>
              <div className="h-5 lg:h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[9px] lg:text-[10px] uppercase font-semibold text-slate-400 block tracking-[0.06em]">Pace</span>
                <span className="font-display font-bold text-xs sm:text-sm lg:text-base text-white tabular-nums">
                  {paceFormatted ? `${paceFormatted} min/km` : <span className="text-slate-500 font-display">-- : --</span>}
                </span>
              </div>
            </div>

            {/* Quick Action Controls in Minimized Bar */}
            {!isTracking && !isBreak ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartClick();
                }}
                className="px-3 py-1.5 lg:px-4 lg:py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-[11px] lg:text-xs rounded-lg lg:rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Play className="w-3 h-3 lg:w-3.5 lg:h-3.5 fill-white" />
                <span>Start</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 lg:gap-2" onClick={(e) => e.stopPropagation()}>
                {/* Mini Pause / Resume Button */}
                <button
                  type="button"
                  onClick={isBreak ? handleResumeClick : tracker.pauseTracking}
                  className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-xs ${
                    isBreak ? 'bg-emerald-600 hover:bg-emerald-500 animate-pulse' : 'bg-[#7C3AED] hover:bg-[#6D28D9]'
                  }`}
                  title={isBreak ? 'Resume Run' : 'Pause Run'}
                  aria-label={isBreak ? 'Resume Run' : 'Pause Run'}
                >
                  {isBreak ? (
                    <Play className="w-3 h-3 lg:w-3.5 lg:h-3.5 fill-white translate-x-0.5" />
                  ) : (
                    <Pause className="w-3 h-3 lg:w-3.5 lg:h-3.5 fill-white" />
                  )}
                </button>

                {/* Hold to Stop Button with 1.2s Fill Progress */}
                <div className="relative">
                  <button
                    type="button"
                    onMouseDown={startStopHold}
                    onMouseUp={cancelStopHold}
                    onMouseLeave={cancelStopHold}
                    onTouchStart={startStopHold}
                    onTouchEnd={cancelStopHold}
                    className="px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-700/80 text-[11px] lg:text-xs font-bold transition-all select-none cursor-pointer flex items-center gap-1 lg:gap-1.5 relative overflow-hidden shadow-xs"
                    title="Press and hold 1.2s to stop run"
                  >
                    <Square className="w-2.5 h-2.5 lg:w-3 lg:h-3 fill-current shrink-0" />
                    <span>Hold to Stop</span>
                    <div
                      className="absolute inset-y-0 left-0 bg-rose-600/50 transition-all duration-75 pointer-events-none"
                      style={{ width: `${stopProgress}%` }}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EXPANDED STATE (Smooth Accordion Grid Unfold Transition) */}
      <div
        className={`grid transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3 sm:p-4 lg:p-5 pt-0 space-y-2 sm:space-y-2.5 lg:space-y-4">
          {/* Status & Run/Walk Selector Header */}
          <div className="flex items-center justify-between gap-2 pb-1.5 lg:pb-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 lg:gap-2 min-w-0">
              <span
                className={`w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full shrink-0 ${
                  isTracking
                    ? 'bg-[#A3E635] animate-pulse shadow-[0_0_8px_#A3E635]'
                    : isBreak
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-[11px] lg:text-xs font-semibold text-slate-200 tracking-tight truncate">
                {tracker.state === ACTIVITY_STATES.ACTIVE
                  ? trackingEngine === 'simulated' ? 'Active Test Run' : 'Active Live Run'
                  : tracker.state === ACTIVITY_STATES.BREAK
                  ? `Break State (${formatSeconds(tracker.breakRemainingSeconds)} left)`
                  : 'Ready to Claim Territory'}
              </span>

              {isTracking && (
                <span
                  className={`text-[10px] lg:text-[11px] font-sans font-medium px-1.5 lg:px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                    trackingEngine === 'simulated'
                      ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                      : (tracker.accuracyMeters || 4) <= 5
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800'
                  }`}
                >
                  <Radio className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                  {trackingEngine === 'simulated' ? `Sim ${simulationSpeed}x` : 'GPS ±4m'}
                </span>
              )}
            </div>

            {/* Run / Walk Toggle (Visible when idle) */}
            {!isTracking && !isBreak && (
              <div className="flex items-center p-0.5 bg-slate-800/90 rounded-lg border border-slate-700/80 text-[11px] lg:text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setActivityType('RUN')}
                  className={`px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-md transition-colors cursor-pointer ${
                    activityType === 'RUN' ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3 h-3 inline mr-1" />
                  Run
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('WALK')}
                  className={`px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-md transition-colors cursor-pointer ${
                    activityType === 'WALK' ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Footprints className="w-3 h-3 inline mr-1" />
                  Walk
                </button>
              </div>
            )}
          </div>

          {/* Break State Active Banner (5m countdown) */}
          {isBreak && (
            <div className="flex items-center justify-between p-2 lg:p-2.5 bg-amber-950/70 border border-amber-500/60 rounded-xl text-amber-200 text-xs shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-base animate-pulse">⏸️</span>
                <div>
                  <span className="font-bold block text-amber-100">Workout Paused</span>
                  <span className="text-[10px] text-amber-300 font-mono">
                    Auto-ends in {formatSeconds(tracker.breakRemainingSeconds)} if inactive (5m limit)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResumeClick}
                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              >
                <Play className="w-3 h-3 fill-current translate-x-0.5" />
                Resume
              </button>
            </div>
          )}

          {/* Break Cooldown / Restriction Warning Toast */}
          {tracker.breakWarningMessage && (
            <div className="p-2 lg:p-2.5 bg-rose-950/80 border border-rose-600/70 rounded-xl text-rose-200 text-xs font-semibold flex items-center gap-2 shadow-sm animate-pulse">
              <span>⚠️</span>
              <span>{tracker.breakWarningMessage}</span>
            </div>
          )}

          {/* Mode Switch: Compact Segmented Control (Test Run | Live GPS) */}
          {!isTracking && !isBreak && (
            <div className="space-y-1.5 lg:space-y-2">
              <div className="h-8 sm:h-9 lg:h-10 p-0.5 lg:p-1 bg-slate-800/90 rounded-lg lg:rounded-xl border border-slate-700/80 grid grid-cols-2 gap-1 text-[11px] lg:text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setTrackingEngine('simulated');
                    if (tracker.setSimulated) tracker.setSimulated(true);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-md lg:rounded-lg transition-all cursor-pointer ${
                    trackingEngine === 'simulated'
                      ? 'bg-[#7C3AED] text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🧪</span>
                  <span>Test Run</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTrackingEngine('real_gps');
                    if (tracker.setSimulated) tracker.setSimulated(false);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-md lg:rounded-lg transition-all cursor-pointer ${
                    trackingEngine === 'real_gps'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🛰️</span>
                  <span>Live GPS</span>
                </button>
              </div>

              {/* Road Circuit + Speed in 1 Row (Under mode switch when Test Run is active) */}
              {trackingEngine === 'simulated' && (
                <div className="flex items-center justify-between gap-1.5 lg:gap-2 p-1.5 lg:p-2 bg-slate-800/50 border border-slate-700/60 rounded-lg lg:rounded-xl text-[11px] lg:text-xs">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <select
                      value={selectedCircuit}
                      onChange={(e) => setSelectedCircuit(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded-md lg:rounded-lg px-2 py-0.5 lg:px-2.5 lg:py-1 text-[11px] lg:text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C3AED] cursor-pointer truncate"
                    >
                      <option value="curve">🏃 Curved Loop (~180m)</option>
                      <option value="garden_crescent">🌿 Garden Crescent (~190m)</option>
                      <option value="boulevard_rotary">🔄 Boulevard Rotary (~175m)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 2, 4, 8].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setSimulationSpeed(spd)}
                        className={`px-1.5 lg:px-2 py-0.5 rounded text-[10px] lg:text-[11px] font-sans font-semibold transition-all cursor-pointer ${
                          simulationSpeed === spd
                            ? 'bg-[#7C3AED] text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Glanceable mid-run stats grid */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:gap-2.5 text-center">
            {/* 1. Distance */}
            <div className="bg-slate-900/90 p-1.5 sm:p-2.5 lg:p-3 rounded-xl lg:rounded-2xl border border-slate-800">
              <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B] block mb-0.5 lg:mb-1">
                Distance
              </span>
              <div className="flex items-baseline justify-center gap-0.5 lg:gap-1">
                <span className="text-xl sm:text-2xl lg:text-[44px] font-display font-bold tabular-nums tracking-tight text-white">
                  {distanceKm}
                </span>
                <span className="text-[10px] lg:text-xs font-semibold text-[#94A3B8] font-sans">km</span>
              </div>
            </div>

            {/* 2. Duration / Break Countdown */}
            <div className="bg-slate-900/90 p-1.5 sm:p-2.5 lg:p-3 rounded-xl lg:rounded-2xl border border-slate-800">
              <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B] block mb-0.5 lg:mb-1">
                {isBreak ? 'Break Left' : 'Time'}
              </span>
              <div
                className={`text-lg sm:text-2xl lg:text-4xl font-display font-bold tabular-nums tracking-tight flex items-center justify-center h-full pb-0.5 lg:pb-1 ${
                  isBreak ? 'text-amber-400 animate-pulse' : 'text-[#A3E635]'
                }`}
              >
                {isBreak ? formatSeconds(tracker.breakRemainingSeconds) : activeDurationFormatted}
              </div>
            </div>

            {/* 3. Pace (Aligned plain text empty state) */}
            <div className="bg-slate-900/90 p-1.5 sm:p-2.5 lg:p-3 rounded-xl lg:rounded-2xl border border-slate-800">
              <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B] block mb-0.5 lg:mb-1">
                Pace
              </span>
              <div className="flex items-baseline justify-center gap-0.5 lg:gap-1">
                {paceFormatted ? (
                  <>
                    <span className="text-lg sm:text-2xl lg:text-4xl font-display font-bold tabular-nums tracking-tight text-white">
                      {paceFormatted}
                    </span>
                    <span className="text-[9px] lg:text-[10px] font-semibold text-[#94A3B8] font-sans">min/km</span>
                  </>
                ) : (
                  <span className="text-lg sm:text-2xl lg:text-4xl font-display font-bold tabular-nums tracking-tight text-[#64748B]">
                    -- : --
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Stats Chip Row (Hexes Claimed, Burned, Speed) - Hidden strictly on Mobile, shown on Laptop */}
          <div className="hidden lg:flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Hex Claimed Chip */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-sans font-semibold border transition-colors ${
                  hexesClaimed > 0
                    ? 'bg-slate-800 text-[#A3E635] border-lime-400/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>+{hexesClaimed} hexes claimed</span>
              </span>

              {tracker.loopsDetectedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-sans font-semibold">
                  <Shield className="w-3 h-3" />
                  <span>{tracker.loopsDetectedCount} loop enclosed</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-sans text-slate-400 font-medium">
              <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                🔥 <strong className="text-slate-200">{metrics.caloriesBurned || 0} kcal</strong>
              </span>
              <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                ⚡ <strong className="text-slate-200">{metrics.avgSpeedKmh || 0} km/h</strong>
              </span>
            </div>
          </div>

          {/* Primary Action Button (Compact on mobile, 56px Full-Width CTA on laptop) */}
          <div className="pt-0.5 lg:pt-1">
            {!isTracking && !isBreak ? (
              <button
                type="button"
                onClick={handleStartClick}
                className="w-full h-10 sm:h-12 lg:h-14 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm lg:text-base rounded-xl lg:rounded-2xl shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5 lg:gap-2"
              >
                <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-white" />
                <span>Start Run</span>
                {trackingEngine === 'simulated' && (
                  <span className="text-[11px] lg:text-xs font-normal text-purple-200 font-sans">(Test mode)</span>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-3 lg:gap-5">
                {/* Pause/Resume Button */}
                <button
                  type="button"
                  onClick={isBreak ? handleResumeClick : tracker.pauseTracking}
                  className={`w-11 h-11 lg:w-[72px] lg:h-[72px] rounded-full text-white shadow-lg border-2 border-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
                    isBreak
                      ? 'bg-emerald-600 hover:bg-emerald-500 animate-pulse ring-4 ring-emerald-500/30'
                      : 'bg-[#7C3AED] hover:bg-[#6D28D9]'
                  }`}
                  title={isBreak ? 'Resume Run' : 'Pause Run'}
                  aria-label={isBreak ? 'Resume Run' : 'Pause Run'}
                >
                  {isBreak ? (
                    <Play className="w-5 h-5 lg:w-7 lg:h-7 fill-white translate-x-0.5" />
                  ) : (
                    <Pause className="w-5 h-5 lg:w-7 lg:h-7 fill-white" />
                  )}
                </button>

                {/* Hold-to-Confirm Stop Button (1.2s Ring Progress Fill) */}
                <div className="relative">
                  <button
                    type="button"
                    onMouseDown={startStopHold}
                    onMouseUp={cancelStopHold}
                    onMouseLeave={cancelStopHold}
                    onTouchStart={startStopHold}
                    onTouchEnd={cancelStopHold}
                    className="h-11 sm:h-12 lg:h-14 px-4 lg:px-6 rounded-xl lg:rounded-2xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-[11px] lg:text-xs font-bold uppercase tracking-wider transition-all select-none cursor-pointer flex items-center gap-1.5 lg:gap-2 relative overflow-hidden"
                  >
                    <Square className="w-3.5 h-3.5 lg:w-4 lg:h-4 fill-current" />
                    <span>Hold 1.2s to Finish</span>
                    {/* Ring Progress Fill */}
                    <div
                      className="absolute inset-y-0 left-0 bg-rose-600/40 transition-all duration-75 pointer-events-none"
                      style={{ width: `${stopProgress}%` }}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      <LocationPermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onRequestPermission={handleRequestPermissionConfirm}
        isLoading={tracker.state === ACTIVITY_STATES.REQUESTING_LOCATION}
        error={tracker.error}
      />

      <DailyResultModal
        isOpen={isSummaryModalOpen}
        onClose={() => {
          setIsSummaryModalOpen(false);
          tracker.resetTracker();
        }}
        resultData={tracker.summaryData}
      />
    </div>
  );
}
