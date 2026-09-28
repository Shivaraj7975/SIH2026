import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRealtimeTerritory } from '../hooks/useRealtimeTerritory.js';
import { useToast } from '../lib/toast.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import TerritoryLegend from '../components/ui/TerritoryLegend.jsx';
import { Sparkles, Radio, Compass } from 'lucide-react';
import TerritoryPopup from '../components/map/TerritoryPopup.jsx';
import MapContainer from '../components/map/MapContainer.jsx';
import WorkoutHUD from '../components/WorkoutHUD.jsx';
import { h3ToGeoJsonFeature, getUserColor, H3_CELL_AREA_KM2 } from '../lib/spatial.js';
import { api } from '../lib/api.js';

export default function MapPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [territoryGeoJson, setTerritoryGeoJson] = useState({ type: 'FeatureCollection', features: [] });
  const [userLocation, setUserLocation] = useState({ latitude: 12.9730, longitude: 77.5932 });
  const [activeTrail, setActiveTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [realtimeAlert, setRealtimeAlert] = useState(null);
  const [followUser, setFollowUser] = useState(false);

  const isManualLocationRef = useRef(false);

  const fetchTerritory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTerritory();
      if (data.success && data.data?.features) {
        setTerritoryGeoJson((prev) => {
          const merged = new Map();
          // 1. Populate all authoritative features from server
          for (const feat of data.data.features) {
            const id = feat.id || feat.properties?.cell_id;
            if (id) merged.set(id, feat);
          }
          // 2. Seamlessly merge and preserve any freshly captured cells from active run
          if (prev?.features) {
            for (const feat of prev.features) {
              const id = feat.id || feat.properties?.cell_id;
              if (id && feat.properties?.just_captured) {
                const existing = merged.get(id);
                if (!existing || existing.properties?.is_unclaimed) {
                  merged.set(id, feat);
                }
              }
            }
          }
          return {
            type: 'FeatureCollection',
            features: Array.from(merged.values()),
          };
        });
      } else if (!data.success) {
        setError(data.error || 'Failed to fetch territory grid');
      }
    } catch (err) {
      console.error('Error fetching territory:', err);
      setError('Network error connecting to tactical grid');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerritory();
  }, [fetchTerritory]);

  // Real-Time WebSocket Hook for Live Multi-User Gameplay
  const handleCellCaptured = useCallback((payload) => {
    const isMine = payload.athlete?.id === user?.id;
    const athleteName = payload.athlete?.displayName || 'A runner';
    const cellCount = payload.cells?.length || 1;

    setRealtimeAlert({
      message: `${isMine ? 'You' : athleteName} captured ${cellCount} sector${cellCount > 1 ? 's' : ''}!`,
      avatar: payload.athlete?.avatar || '⚡',
      isMine,
      timestamp: Date.now(),
    });

    setTerritoryGeoJson((prev) => patchTerritoryGeoJson(prev, payload));

    setTimeout(() => {
      setRealtimeAlert(null);
    }, 4500);
  }, [user?.id]);

  const handleTerritoryLost = useCallback((payload) => {
    const athleteName = payload.athlete?.displayName || 'An opponent';
    toast.error(`⚠️ Alert: ${athleteName} just captured your territory!`);
  }, [toast]);

  const {
    connectionStatus,
    patchTerritoryGeoJson,
  } = useRealtimeTerritory({
    activeUser: user,
    onCellCaptured: handleCellCaptured,
    onTerritoryLost: handleTerritoryLost,
  });

  const handleLocationUpdate = useCallback((pt) => {
    if (!pt) return;
    if (pt.isSimulated || pt.forceFly) {
      isManualLocationRef.current = true;
    }
    setUserLocation((prev) => {
      if (
        prev &&
        prev.latitude === pt.latitude &&
        prev.longitude === pt.longitude &&
        !pt.forceFly
      ) {
        return prev;
      }
      return pt;
    });
  }, []);

  const handleTrailUpdate = useCallback((trail) => {
    if (!trail) return;
    setActiveTrail((prev) => {
      if (prev.length === trail.length && JSON.stringify(prev) === JSON.stringify(trail)) {
        return prev;
      }
      return trail;
    });
  }, []);

  const handleNewCellCaptured = useCallback(
    (input) => {
      if (!input) return;
      const hexIds = Array.isArray(input) ? input : [input];
      if (hexIds.length === 0) return;

      const currentUserId = user?.id || 'user-shivaraj';
      const newFeatures = hexIds
        .map((hexId) =>
          h3ToGeoJsonFeature(hexId, {
            cell_id: hexId,
            owner_id: currentUserId,
            owner_name: user?.displayName || 'You',
            owner_avatar: user?.avatar || '⚡',
            owner_color: '#7C3AED',
            is_unclaimed: false,
            just_captured: true,
            captured_at: new Date().toISOString(),
            duration_held_seconds: 0,
            capture_count: 1,
          })
        )
        .filter(Boolean);

      if (newFeatures.length === 0) return;

      setTerritoryGeoJson((prev) => {
        const existing = prev?.features ? [...prev.features] : [];
        const mapById = new Map();
        for (const f of existing) {
          mapById.set(f.id || f.properties?.cell_id, f);
        }
        for (const nf of newFeatures) {
          mapById.set(nf.id || nf.properties?.cell_id, nf);
        }
        return {
          type: 'FeatureCollection',
          features: Array.from(mapById.values()),
        };
      });
    },
    [user]
  );

  const handleWorkoutStart = useCallback(
    ({ isSimulated }) => {
      setActiveTrail([]);
      if (isSimulated) {
        isManualLocationRef.current = true;
        setFollowUser(false);
        setTerritoryGeoJson((prev) => ({
          type: 'FeatureCollection',
          features: (prev?.features || []).filter(
            (f) => f.properties?.owner_id !== (user?.id || 'user-shivaraj') && !f.properties?.just_captured
          ),
        }));
      } else {
        isManualLocationRef.current = false;
        setFollowUser(true);
        setUserLocation((prev) => (prev ? { ...prev, forceFly: true } : prev));
      }
    },
    [user?.id]
  );

  const handleWorkoutComplete = useCallback(
    (data) => {
      setFollowUser(false);
      isManualLocationRef.current = true;

      const finalCells =
        data?.metrics?.uniqueCells ||
        data?.cellsCovered ||
        data?.capturedCells ||
        data?.capturedHexes ||
        (data?.captureDetails ? data.captureDetails.map((c) => (typeof c === 'string' ? c : c.h3CellId || c.h3_cell_id)).filter(Boolean) : []);

      if (finalCells && finalCells.length > 0) {
        handleNewCellCaptured(finalCells);
      }

      // Small delay before fetching territory to ensure database write is committed
      setTimeout(() => {
        fetchTerritory();
        refreshUser();
      }, 600);
    },
    [fetchTerritory, refreshUser, handleNewCellCaptured]
  );

  const totalSectors = territoryGeoJson.features ? territoryGeoJson.features.length : 0;
  const claimedSectors = territoryGeoJson.features
    ? territoryGeoJson.features.filter((f) => !f.properties?.is_unclaimed).length
    : 0;
  const mySectors = territoryGeoJson.features
    ? territoryGeoJson.features.filter(
        (f) => f.properties?.owner_id === (user?.id || 'user-shivaraj') || f.properties?.just_captured
      ).length
    : 0;
  const rivalSectors = Math.max(0, claimedSectors - mySectors);

  return (
    <AppShell fullBleed={true}>
      {/* Tactical Territory Banner - Above everything and below header */}
      <div className="w-full bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 shadow-xs shrink-0 font-sans">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight uppercase truncate">
              Tactical Territory Conquest
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#7C3AED] border border-purple-200/80 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
              <span>Real-World GPS Grid</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 text-xs shrink-0">
          <span className="text-slate-500 font-medium hidden md:inline text-[11px]">
            Run outdoor routes to claim &amp; defend hexagons
          </span>
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>LIVE GRID</span>
          </div>
        </div>
      </div>

      {/* Viewport Container: On mobile stacks vertically with smooth scrolling, on desktop fills remaining viewport */}
      <div className="relative w-full flex flex-col lg:flex-row lg:h-[calc(100vh-108px)] lg:overflow-hidden font-sans bg-slate-50/50">
        
        {/* Start Run Box (WorkoutHUD):
            - On mobile: order-1 (appears ABOVE map in normal flow, px-3 pt-3 pb-1.5)!
            - On desktop: lg:order-none lg:absolute lg:bottom-8 lg:left-6 lg:w-[420px] (unchanged floating card over map)!
        */}
        <div className="order-1 lg:order-none px-3 pt-2 pb-1 sm:px-4 sm:pt-3 sm:pb-1.5 lg:p-0 lg:absolute lg:bottom-9 lg:left-9 lg:w-[420px] lg:max-w-[calc(100%-420px)] z-30 pointer-events-auto">
          <WorkoutHUD
            activeUser={user}
            onLocationUpdate={handleLocationUpdate}
            onTrailUpdate={handleTrailUpdate}
            onNewCellCaptured={handleNewCellCaptured}
            onWorkoutStart={handleWorkoutStart}
            onWorkoutComplete={handleWorkoutComplete}
          />
        </div>

        {/* Main Map Area: Framed with padding, rounded border, and extra top padding in laptop view */}
        <div className="order-2 lg:order-none p-3 pt-1 sm:p-4 sm:pt-1.5 lg:px-5 lg:pb-5 lg:pt-8 relative w-full h-[52vh] sm:h-[56vh] lg:h-full lg:flex-1 shrink-0 min-w-0">
          <div className="w-full h-full rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            <MapContainer
              territoryGeoJson={territoryGeoJson}
              userLocation={userLocation}
              activeTrail={activeTrail}
              activeUser={user}
              onCellClick={(props) => setSelectedSector(props)}
              isLoading={loading}
              error={error}
              onRetry={fetchTerritory}
              initialCenter={[userLocation.longitude, userLocation.latitude]}
              followUser={followUser}
              onFollowUserChange={setFollowUser}
              className="w-full h-full"
            />

            {/* Real-time Alert Toast Notification */}
            {realtimeAlert && (
              <div className="absolute top-4 left-4 z-30 max-w-sm bg-white/95 backdrop-blur-md border-l-4 border-l-[#F59E0B] border border-slate-200 p-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{realtimeAlert.avatar}</span>
                  <div>
                    <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-1">
                      <Radio className="w-3 h-3 text-amber-600 animate-pulse" />
                      <span>Rival Capture Alert</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">{realtimeAlert.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right Side Panel (360px wide, Sector Radar, Legend, Breakdown) */}
        <div className="hidden lg:flex w-[360px] h-full flex-col gap-3 px-4 pb-5 pt-8 bg-slate-50/70 border-l border-slate-200 overflow-y-auto shrink-0 font-sans">
          {/* Selected Sector Radar Inspector */}
          {selectedSector ? (
            <TerritoryPopup
              sector={selectedSector}
              onClose={() => setSelectedSector(null)}
              activeUserId={user?.id}
            />
          ) : (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
              <div className="flex items-center gap-2 text-[#7C3AED] font-semibold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Sector Radar</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Click any hexagon on the map to inspect live ownership, defense duration, and bonus multipliers.
              </p>
            </div>
          )}

          {/* Territory Legend */}
          <TerritoryLegend />

          {/* Tactical Grid Dominance Breakdown */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 block">
              Dominance Breakdown
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-700 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#7C3AED]" />
                  Your Territory:
                </span>
                <span className="font-bold text-[#7C3AED]">
                  {mySectors} hexes
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#06B6D4]" />
                  Rival Sectors:
                </span>
                <span className="font-bold text-cyan-600">
                  {rivalSectors} hexes
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Total Active Grid:</span>
                <span className="font-semibold text-slate-900">{totalSectors} hexes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View: Info Cards Below Map (order-3 ensures it stays below WorkoutHUD and Map) */}
        <div className="order-3 lg:order-none lg:hidden flex flex-col gap-3 px-3 pb-8 sm:px-4 bg-[#F8FAFC]">
          {/* Tactical Grid Dominance Box (Mobile View - Below Map) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5 font-sans">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 block">
              Dominance Breakdown
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-700 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#7C3AED]" />
                  Your Territory:
                </span>
                <span className="font-bold text-[#7C3AED]">
                  {mySectors} hexes
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#06B6D4]" />
                  Rival Sectors:
                </span>
                <span className="font-bold text-cyan-600">
                  {rivalSectors} hexes
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Total Active Grid:</span>
                <span className="font-semibold text-slate-900">{totalSectors} hexes</span>
              </div>
            </div>
          </div>

          {/* Selected Sector Radar on Mobile */}
          {selectedSector && (
            <TerritoryPopup
              sector={selectedSector}
              onClose={() => setSelectedSector(null)}
              activeUserId={user?.id}
            />
          )}

          {/* Territory Legend on Mobile */}
          <TerritoryLegend />
        </div>

      </div>
    </AppShell>
  );
}
