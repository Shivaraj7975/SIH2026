import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Flame,
  Timer,
  Gauge,
  MapPin,
  Sparkles,
  Navigation,
  Cpu,
  Volume2,
  VolumeX,
  Footprints,
  Activity,
  Radio,
  Coffee,
  Shield,
  Layers,
  AlertTriangle,
  Clock,
  Bug,
} from 'lucide-react';
import { useActivityTracker, ACTIVITY_STATES } from '../hooks/useActivityTracker.js';
import LocationPermissionModal from './workout/LocationPermissionModal.jsx';
import DailyResultModal from './ui/DailyResultModal.jsx';
import { sounds } from '../lib/audio.js';

const DEMO_CIRCUITS = {
  small_curve: {
    name: 'Small Curved Loop (Fast Demo, ~40m)',
    coords: [
      [77.59440, 12.97100],
      [77.59460, 12.97110],
      [77.59470, 12.97125],
      [77.59455, 12.97140],
      [77.59435, 12.97135],
      [77.59425, 12.97115],
      [77.59440, 12.97100],
    ],
  },
  cubbon_park: {
    name: 'Cubbon Park Loop, Bengaluru',
    coords: [
      [77.5944, 12.9710], // Vittal Mallya Road / UB City Start
      [77.5960, 12.9725], // Kasturba Road Junction
      [77.5950, 12.9740], // South Park Entry
      [77.5930, 12.9755], // Queen Victoria Statue
      [77.5955, 12.9770], // Press Club Circuit
      [77.5975, 12.9755], // Central Library Circle
      [77.5960, 12.9725], // Kasturba Cross (Loop Closure Junction)
      [77.5944, 12.9710], // Return to UB City
    ],
  },
  central_park: {
    name: 'Central Park Reservoir Loop, NYC',
    coords: [
      [-73.9654, 40.7829],
      [-73.9645, 40.7838],
      [-73.9638, 40.7845],
      [-73.9625, 40.7856],
      [-73.9615, 40.7868],
      [-73.9632, 40.7878],
      [-73.9650, 40.7885],
      [-73.9668, 40.7875],
      [-73.9670, 40.7840],
      [-73.9654, 40.7829],
    ],
  },
};

function formatSeconds(secs) {
  const safeSecs = Math.max(0, secs || 0);
  const m = Math.floor(safeSecs / 60);
  const s = safeSecs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatArea(areaM2, areaKm2) {
  if (areaM2 >= 100000) {
    return { val: areaKm2.toFixed(3), unit: 'km²' };
  }
  if (areaM2 >= 1000) {
    return { val: areaM2.toLocaleString(), unit: 'm²' };
  }
  return { val: Math.round(areaM2).toString(), unit: 'm²' };
}

export default function WorkoutHUD({
  activeUser,
  onLocationUpdate,
  onWorkoutStart,
  onWorkoutComplete,
  onNewCellCaptured,
  onTrailUpdate,
}) {
  const [trackingEngine, setTrackingEngine] = useState('real_gps');
  const [activityType, setActivityType] = useState('RUN');
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  const [selectedCircuit, setSelectedCircuit] = useState('small_curve');
  const [simulationSpeed, setSimulationSpeed] = useState(2);

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
      if (onWorkoutComplete) onWorkoutComplete(data);
    },
  });

  const prevTrailLengthRef = useRef(-1);
  useEffect(() => {
    const coords = tracker.trailCoordinates || [];
    if (onTrailUpdate && coords.length !== prevTrailLengthRef.current) {
      prevTrailLengthRef.current = coords.length;
      onTrailUpdate(coords);
    }
  }, [tracker.trailCoordinates, onTrailUpdate]);

  const handleStartClick = async () => {
    if (trackingEngine === 'real_gps') {
      if (tracker.permissionState !== 'granted') {
        setIsPermissionModalOpen(true);
      } else {
        if (onWorkoutStart) onWorkoutStart({ isSimulated: false });
        tracker.startTracking();
      }
    } else {
      if (onWorkoutStart) onWorkoutStart({ isSimulated: true, circuit: selectedCircuit });
      const circuit = DEMO_CIRCUITS[selectedCircuit] || DEMO_CIRCUITS.cubbon_park;
      tracker.startSimulatedTracking(circuit.coords, simulationSpeed);
    }
  };

  const handleRequestPermissionConfirm = async () => {
    const granted = await tracker.requestLocationPermission();
    if (granted) {
      setIsPermissionModalOpen(false);
      if (onWorkoutStart) onWorkoutStart({ isSimulated: false });
      tracker.startTracking();
    }
  };

  const handleResumeClick = () => {
    const circuit = DEMO_CIRCUITS[selectedCircuit] || DEMO_CIRCUITS.cubbon_park;
    tracker.resumeTracking(circuit.coords, simulationSpeed);
  };

  const isTracking = tracker.state === ACTIVITY_STATES.ACTIVE;
  const isBreak = tracker.state === ACTIVITY_STATES.BREAK;
  const metrics = tracker.liveMetrics;
  const distanceKm = metrics.distanceKm > 0 ? metrics.distanceKm.toFixed(2) : '0.00';
  const activeDurationFormatted = formatSeconds(tracker.activeSeconds);
  const breakCountdownFormatted = formatSeconds(tracker.breakRemainingSeconds);
  const paceFormatted = metrics.avgPaceMinKm > 0 ? metrics.avgPaceMinKm.toFixed(1) : '--:--';
  const areaDisplay = formatArea(metrics.areaCoveredM2 || 0, metrics.areaCoveredKm2 || 0);

  return (
    <div className="w-full flex flex-col gap-3 pointer-events-auto font-sans">
      <div className="bg-white/95 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xl backdrop-blur-xl">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full ${
                isTracking
                  ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]'
                  : isBreak
                  ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              {tracker.state === ACTIVITY_STATES.ACTIVE
                ? 'Active Gameplay Tracking'
                : tracker.state === ACTIVITY_STATES.BREAK
                ? 'Break / Pause State'
                : tracker.state === ACTIVITY_STATES.REQUESTING_LOCATION
                ? 'Acquiring GPS Signal...'
                : 'Ready to Conquer'}
            </span>

            {isTracking && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  tracker.accuracyQuality === 'HIGH'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : tracker.accuracyQuality === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <Radio className="w-2.5 h-2.5" />
                {tracker.accuracyMeters ? `±${tracker.accuracyMeters}m GPS` : 'GPS Active'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDebugOpen(!isDebugOpen)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDebugOpen
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-purple-600'
              }`}
              title="Toggle Geometry Diagnostics Debug Panel"
            >
              <Bug className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                const next = sounds.toggle();
                setSoundEnabled(next);
              }}
              className="p-1.5 text-slate-600 hover:text-purple-600 rounded-lg bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Toggle Audio Feedback"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-600" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {!isTracking && !isBreak && (
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setActivityType('RUN')}
                  className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activityType === 'RUN'
                      ? 'bg-purple-600 text-white font-black shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 inline mr-1" />
                  Run
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('WALK')}
                  className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activityType === 'WALK'
                      ? 'bg-purple-600 text-white font-black shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5 inline mr-1" />
                  Walk
                </button>
              </div>
            )}

            {!isTracking && !isBreak && (
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTrackingEngine('real_gps');
                    if (tracker.setSimulated) tracker.setSimulated(false);
                  }}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    trackingEngine === 'real_gps'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Navigation className="w-3 h-3 inline mr-1" />
                  Real GPS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrackingEngine('simulated');
                    if (tracker.setSimulated) tracker.setSimulated(true);
                    const circuit = DEMO_CIRCUITS[selectedCircuit] || DEMO_CIRCUITS.cubbon_park;
                    if (onLocationUpdate && circuit.coords[0]) {
                      onLocationUpdate({
                        latitude: circuit.coords[0][1],
                        longitude: circuit.coords[0][0],
                        accuracy: 6,
                        timestamp: Date.now(),
                        isSimulated: true,
                        forceFly: true,
                      });
                    }
                  }}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    trackingEngine === 'simulated'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cpu className="w-3 h-3 inline mr-1" />
                  Sim
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Break Warning / Cooldown Error Toast */}
        {tracker.breakWarningMessage && (
          <div className="flex items-center gap-2 p-3 mb-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{tracker.breakWarningMessage}</span>
          </div>
        )}

        {/* PROMINENT BREAK NOTIFICATION */}
        {isBreak && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <Coffee className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-black uppercase tracking-wider">BREAK</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-mono font-black text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{breakCountdownFormatted}</span>
              </div>
            </div>

            <div className="text-xs text-slate-700 font-medium">
              <p className="font-bold text-amber-800">You're taking a break.</p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Continue within <span className="text-amber-700 font-mono font-bold">{breakCountdownFormatted}</span> to keep your activity active.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-amber-200 text-[11px] text-slate-500">
              <span>Current Distance: <strong className="text-slate-900 font-mono">{distanceKm} km</strong></span>
              <span>Current Area: <strong className="text-purple-700 font-mono">{areaDisplay.val} {areaDisplay.unit}</strong></span>
            </div>
          </div>
        )}

        {/* Geometry Engine Diagnostic Debug Panel */}
        {isDebugOpen && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="font-bold text-purple-700 flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5" />
                Geometry Engine Diagnostics
              </span>
              <span
                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  metrics.geometryStatus === 'VALID'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                {metrics.geometryStatus || 'IDLE'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-slate-500 text-[10px]">Route Points</div>
                <div className="text-slate-900 font-bold">{tracker.gpsPoints.length}</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-slate-500 text-[10px]">Intersections</div>
                <div className="text-purple-700 font-bold">{metrics.intersectionsCount || 0}</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-slate-500 text-[10px]">Closed Loops</div>
                <div className="text-slate-900 font-bold">{metrics.loopsCount || 0}</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                <div className="text-slate-500 text-[10px]">Enclosed Hexes</div>
                <div className="text-purple-700 font-bold">{metrics.interiorCellsCount || 0}</div>
              </div>
            </div>
          </div>
        )}

        {/* Simulation Circuit & Speed Selector */}
        {trackingEngine === 'simulated' && !isTracking && !isBreak && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-800 font-bold">Circuit:</span>
              <select
                value={selectedCircuit}
                onChange={(e) => {
                  const key = e.target.value;
                  setSelectedCircuit(key);
                  if (tracker.setSimulated) tracker.setSimulated(true);
                  const circuit = DEMO_CIRCUITS[key];
                  if (circuit && onLocationUpdate && circuit.coords[0]) {
                    onLocationUpdate({
                      latitude: circuit.coords[0][1],
                      longitude: circuit.coords[0][0],
                      accuracy: 6,
                      timestamp: Date.now(),
                      isSimulated: true,
                      forceFly: true,
                    });
                  }
                }}
                className="bg-white text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-purple-600 font-medium"
              >
                <option value="small_curve">Small Curved Loop (~40m, Fast Demo)</option>
                <option value="cubbon_park">Cubbon Park Loop, Bengaluru</option>
                <option value="central_park">Central Park Reservoir, NYC</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">Speed:</span>
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimulationSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    simulationSpeed === spd
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5-Stat Tactical Live Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5 mb-4">
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
              <MapPin className="w-3.5 h-3.5 text-purple-600" />
              <span className="uppercase text-[10px] font-bold tracking-wider">Distance</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-purple-700">
              {distanceKm}
              <span className="text-xs font-sans font-normal text-slate-500 ml-1">km</span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
              <Timer className="w-3.5 h-3.5 text-slate-600" />
              <span className="uppercase text-[10px] font-bold tracking-wider">Active Time</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
              {activeDurationFormatted}
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
              <Gauge className="w-3.5 h-3.5 text-slate-600" />
              <span className="uppercase text-[10px] font-bold tracking-wider">Avg Pace</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
              {paceFormatted}
              <span className="text-xs font-sans font-normal text-slate-500 ml-1">min/km</span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span className="uppercase text-[10px] font-bold tracking-wider">Captured Area</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-purple-700">
              {areaDisplay.val}
              <span className="text-xs font-sans font-normal text-slate-500 ml-1">{areaDisplay.unit}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="uppercase text-[10px] font-bold tracking-wider">Hexes</span>
              </span>
              {tracker.loopsDetectedCount > 0 && (
                <span className="text-[10px] font-mono font-black text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                  {tracker.loopsDetectedCount} loop{tracker.loopsDetectedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
              {tracker.capturedHexes?.size || 0}
              <span className="text-xs font-sans font-normal text-slate-500 ml-1">cells</span>
            </div>
          </div>
        </div>

        {/* Action Control Buttons */}
        <div className="flex items-center gap-3">
          {!isTracking && !isBreak ? (
            <button
              type="button"
              onClick={handleStartClick}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md shadow-purple-600/20 transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white" />
              Start {activityType === 'RUN' ? 'Outdoor Run' : 'Outdoor Walk'} & Claim Territory
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={isBreak ? handleResumeClick : tracker.pauseTracking}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 font-bold text-xs uppercase tracking-wider rounded-xl border transition-colors cursor-pointer ${
                  isBreak
                    ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-md'
                    : 'bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#0F172A]'
                }`}
              >
                {isBreak ? <Play className="w-4 h-4 fill-white" /> : <Coffee className="w-4 h-4 text-white" />}
                {isBreak ? 'Resume Activity' : 'Take Break (5m)'}
              </button>

              <button
                type="button"
                onClick={() => tracker.stopTracking({ reason: 'USER_STOPPED' })}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                Finish & Claim Territory
              </button>
            </>
          )}
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
