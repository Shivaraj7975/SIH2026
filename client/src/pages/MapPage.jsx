import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRealtimeTerritory } from '../hooks/useRealtimeTerritory.js';
import { useToast } from '../lib/toast.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import TerritoryLegend from '../components/ui/TerritoryLegend.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { Shield, Sparkles, Navigation, RefreshCw, MapPin, Wifi, WifiOff, Radio } from 'lucide-react';
import TerritoryPopup from '../components/map/TerritoryPopup.jsx';
import MapContainer from '../components/map/MapContainer.jsx';
import WorkoutHUD from '../components/WorkoutHUD.jsx';
import { h3ToGeoJsonFeature, getUserColor, H3_CELL_AREA_KM2 } from '../lib/spatial.js';
import { api } from '../lib/api.js';

const DEMO_LOCATIONS = [
  { id: 'bengaluru', name: 'Bengaluru (Cubbon)', lat: 12.9716, lng: 77.5946 },
  { id: 'nyc', name: 'NYC (Central Park)', lat: 40.7829, lng: -73.9654 },
  { id: 'london', name: 'London (Hyde Park)', lat: 51.5074, lng: -0.1657 },
];

export default function MapPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [territoryGeoJson, setTerritoryGeoJson] = useState({ type: 'FeatureCollection', features: [] });
  const [userLocation, setUserLocation] = useState({ latitude: 12.9716, longitude: 77.5946 });
  const [activeTrail, setActiveTrail] = useState([]);
  const [selectedCity, setSelectedCity] = useState('bengaluru');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [isHudOpen, setIsHudOpen] = useState(false);
  const [realtimeAlert, setRealtimeAlert] = useState(null);
  const [followUser, setFollowUser] = useState(false);

  const fetchTerritory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTerritory();
      if (data.success) {
        setTerritoryGeoJson(data.data);
      } else {
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

  const isManualLocationRef = useRef(false);

  // Acquire current location on mount to place marker at user's actual position
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isManualLocationRef.current) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (!isNaN(lat) && !isNaN(lng)) {
            setUserLocation({ latitude: lat, longitude: lng, forceFly: true });
          }
        },
        (err) => {
          console.log('Location prompt deferred or defaulted to hub coordinates');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }
  }, []);

  // Real-Time WebSocket Hook (Requirements 1, 4, 6)
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

    // Patch map in-place without full reload
    setTerritoryGeoJson((prev) => patchTerritoryGeoJson(prev, payload));

    // Clear alert after 4 seconds
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

  const handleCitySelect = useCallback((city) => {
    isManualLocationRef.current = true;
    setSelectedCity(city.id);
    setUserLocation({ latitude: city.lat, longitude: city.lng, forceFly: true });
  }, []);

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

      const newFeatures = hexIds
        .map((hexId) =>
          h3ToGeoJsonFeature(hexId, {
            cell_id: hexId,
            owner_id: user?.id,
            owner_name: user?.displayName || 'You',
            owner_avatar: user?.avatar || '⚡',
            owner_color: getUserColor(user?.id),
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
    ({ isSimulated, circuit }) => {
      setActiveTrail([]);
      if (isSimulated) {
        isManualLocationRef.current = true;
        setFollowUser(false);
        // Clear all previous hexes belonging to active user so simulation starts fresh
        setTerritoryGeoJson((prev) => ({
          type: 'FeatureCollection',
          features: (prev?.features || []).filter(
            (f) => f.properties?.owner_id !== user?.id && !f.properties?.just_captured
          ),
        }));
      } else {
        // Real Live GPS tracker: enable live GPS updates, fly camera to current position and follow user
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
      // Retain current view and prevent camera relocation
      isManualLocationRef.current = true;

      const finalCells =
        data?.metrics?.uniqueCells ||
        data?.cellsCovered ||
        data?.capturedCells ||
        (data?.captureDetails ? data.captureDetails.map((c) => (typeof c === 'string' ? c : c.h3CellId || c.h3_cell_id)).filter(Boolean) : []);

      if (finalCells && finalCells.length > 0) {
        handleNewCellCaptured(finalCells);
      }

      fetchTerritory();
      refreshUser();
    },
    [fetchTerritory, refreshUser, handleNewCellCaptured]
  );

  const totalSectors = territoryGeoJson.features ? territoryGeoJson.features.length : 0;
  const claimedSectors = territoryGeoJson.features
    ? territoryGeoJson.features.filter((f) => !f.properties?.is_unclaimed).length
    : 0;
  const mySectors = territoryGeoJson.features
    ? territoryGeoJson.features.filter((f) => f.properties?.owner_id === user?.id).length
    : 0;
  const rivalSectors = claimedSectors - mySectors;

  return (
    <AppShell>
      <div className="space-y-4 min-h-[calc(100vh-140px)] md:min-h-[calc(100vh-100px)] flex flex-col">
        {/* Top Map Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-600" />
                <span>Multiplayer Tactical Map</span>
              </h1>

              {/* Real-time Connection State Badge */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                    : connectionStatus === 'reconnecting'
                    ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500'
                      : connectionStatus === 'reconnecting'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="uppercase">
                  {connectionStatus === 'connected'
                    ? 'Grid Synced'
                    : connectionStatus === 'reconnecting'
                    ? 'Reconnecting'
                    : 'Offline'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              Claimed sectors: <span className="text-purple-700 font-mono font-bold">{claimedSectors}</span> • My dominion: <span className="text-purple-700 font-mono font-bold">{mySectors} hexes</span> • Contested: <span className="text-slate-800 font-mono font-bold">{rivalSectors}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Hub Jump Dropdown */}
            <div className="hidden sm:flex items-center gap-1.5 bg-white border border-slate-200 shadow-xs rounded-xl px-2 py-1 text-xs">
              <MapPin className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-slate-500">Hub:</span>
              {DEMO_LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handleCitySelect(loc)}
                  className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedCity === loc.id
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {loc.name.split(' ')[0]}
                </button>
              ))}
            </div>

            <Button
              variant={isHudOpen ? 'purple' : 'outline'}
              size="sm"
              icon={Navigation}
              onClick={() => setIsHudOpen(!isHudOpen)}
            >
              {isHudOpen ? 'Hide Workout HUD' : 'Live GPS Tracker'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchTerritory}
              isLoading={loading}
            >
              Sync Grid
            </Button>
          </div>
        </div>

        {/* Real-time Broadcast Flash Alert Banner */}
        {realtimeAlert && (
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{realtimeAlert.avatar}</span>
              <div>
                <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                  <span>LIVE CONQUEST DETECTED</span>
                </div>
                <p className="text-xs text-slate-700">{realtimeAlert.message}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-purple-700 bg-white px-2 py-0.5 rounded-full border border-purple-200 font-bold">
              REALTIME
            </span>
          </div>
        )}

        {/* Collapsible Workout HUD Bar */}
        {isHudOpen && (
          <div className="shrink-0 animate-in fade-in slide-in-from-top-4 duration-200">
            <WorkoutHUD
              activeUser={user}
              onLocationUpdate={handleLocationUpdate}
              onTrailUpdate={handleTrailUpdate}
              onNewCellCaptured={handleNewCellCaptured}
              onWorkoutStart={handleWorkoutStart}
              onWorkoutComplete={handleWorkoutComplete}
            />
          </div>
        )}

        {/* Main Map Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          {/* Main Map Container */}
          <div className="lg:col-span-9 h-full min-h-[440px] relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
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
            />
          </div>

          {/* Side Info & Legend Column */}
          <div className="lg:col-span-3 flex flex-col gap-3 shrink-0 overflow-y-auto">
            {/* Selected Sector Inspector */}
            {selectedSector ? (
              <TerritoryPopup
                sector={selectedSector}
                onClose={() => setSelectedSector(null)}
                activeUserId={user?.id}
              />
            ) : (
              <Card variant="glass" className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Interactive Sector Radar</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Click any H3 hexagon on the tactical map to inspect current ownership, duration held, takeover history, and challenge synergy.
                </p>
              </Card>
            )}

            {/* Static Territory Legend */}
            <TerritoryLegend />

            {/* Sector Summary Card */}
            <Card variant="glass" className="p-4 space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Grid Dominance Breakdown
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                    Your Territory:
                  </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {mySectors} hexes ({(mySectors * H3_CELL_AREA_KM2).toFixed(4)} km²)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                    Rival Sectors:
                  </span>
                  <span className="font-mono font-bold text-rose-400">
                    {rivalSectors} hexes ({(rivalSectors * H3_CELL_AREA_KM2).toFixed(4)} km²)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-600" />
                    Total Active Sectors:
                  </span>
                  <span className="font-mono font-bold text-white">
                    {totalSectors} hexes
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
