import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import LeaderboardRow from '../components/ui/LeaderboardRow.jsx';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import Chip from '../components/ui/Chip.jsx';
import { Trophy, Info, Sparkles, HelpCircle, Shield, Zap, Compass, Flame, Award } from 'lucide-react';
import { api } from '../lib/api.js';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('weekly'); // 'daily' or 'weekly'
  const [sector, setSector] = useState('distance'); // 'distance', 'holding', or 'total_area'
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    fetchLeaderboard(timeframe, sector);
  }, [timeframe, sector]);

  const fetchLeaderboard = async (tf, sec) => {
    setLoading(true);
    try {
      const data = await api.getLeaderboard(tf, sec);
      if (data.success) {
        setRankings(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const SECTORS = [
    { id: 'distance', label: 'Distance', fullLabel: 'Distance Covered', icon: Zap, color: 'text-purple-600', unit: 'km' },
    { id: 'holding', label: 'Holding', fullLabel: 'Current Holding Area', icon: Shield, color: 'text-cyan-600', unit: 'm²' },
    { id: 'total_area', label: 'Captured', fullLabel: 'Total Area Captured', icon: Compass, color: 'text-purple-600', unit: 'm²' },
  ];

  // Find if user is in rankings
  const currentUserEntry = rankings.find(
    (r) => user?.id === r.id || user?.id === r.userId || user?.username === r.username
  );

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
        {/* Header with Title & Segmented Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-50 text-brand border border-purple-200 shadow-xs">
                <Trophy className="w-6 h-6" />
              </span>
              <span>Dominion Standings</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live athletic conquest rankings across <span className="text-brand font-semibold">Daily</span> and{' '}
              <span className="text-brand font-semibold">Weekly</span> performance leagues.
            </p>
          </div>

          {/* Timeframe Segmented Control: Daily | Weekly */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTimeframe('daily')}
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer font-medium ${
                  timeframe === 'daily'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('weekly')}
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer font-medium ${
                  timeframe === 'weekly'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Weekly
              </button>
            </div>

            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2.5 bg-white border border-slate-200 hover:border-purple-300 rounded-xl text-slate-500 hover:text-brand transition-colors cursor-pointer shadow-xs"
              title="How rankings and metrics work"
              aria-label="How rankings work"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs: Distance · Holding · Captured */}
        <div className="p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="grid grid-cols-3 gap-1.5">
            {SECTORS.map((sec) => {
              const Icon = sec.icon;
              const isSelected = sector === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSector(sec.id)}
                  className={`flex items-center justify-center sm:justify-start gap-2 py-3 px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50 border-purple-300 text-brand shadow-xs'
                      : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-brand' : sec.color} flex-shrink-0`} />
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="hidden sm:inline">{sec.fullLabel}</span>
                    <span className="sm:hidden">{sec.label}</span>
                    <span className="text-[10px] font-normal text-slate-400 font-display">({sec.unit})</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explainable Metric Rules Callout */}
        {showInfo && (
          <Card variant="surface" className="p-4 border-slate-200 bg-white shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Sector Conquest & Invariant Metric Rules</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div className="font-bold text-brand mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> 1. Distance Covered
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Total verified GPS distance (km) logged during the selected {timeframe} timeframe.
                  </p>
                </div>
                <div className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-100">
                  <div className="font-bold text-cyan-800 mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> 2. Currently Holding
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Live territorial area (m²) currently held. Decreases if opponents capture your cells.
                  </p>
                </div>
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div className="font-bold text-brand mb-1 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" /> 3. Total Area Captured
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Cumulative territory (m²) conquered. This metric is monotonic and <strong className="text-brand">never decreases</strong>!
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Pinned Current User Row (if user not in top 3 or to give immediate glanceability) */}
        {currentUserEntry && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <span>Your Standing</span>
            </div>
            <LeaderboardRow
              rank={currentUserEntry.rank}
              rankChange={currentUserEntry.rankChange || 0}
              user={{
                id: user?.id,
                username: user?.username,
                displayName: user?.displayName || user?.username,
                avatar: user?.avatar || '⚡',
              }}
              distanceKm={currentUserEntry.distanceKm || (currentUserEntry.total_distance_meters ? currentUserEntry.total_distance_meters / 1000 : 0)}
              currentHoldingAreaM2={currentUserEntry.currentHoldingAreaM2 || 0}
              currentCellsOwned={currentUserEntry.currentCellsOwned || 0}
              totalAreaCapturedM2={currentUserEntry.totalAreaCapturedM2 || 0}
              activeSector={sector}
              isCurrentUser={true}
            />
          </div>
        )}

        {/* Standings List */}
        <Card variant="surface" className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              <span>{timeframe === 'daily' ? "Today's" : "This Week's"} League Standings</span>
            </CardTitle>
            <Chip variant="neutral" size="sm">
              {rankings.length} Competitors
            </Chip>
          </CardHeader>

          <CardContent className="pt-3">
            {loading ? (
              <LoadingState message="Aggregating live competition sectors..." />
            ) : rankings.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 font-sans">
                No active competition logs for this timeframe yet. Log a workout to claim your sector standing!
              </div>
            ) : (
              <div className="space-y-2">
                {rankings.map((r) => (
                  <LeaderboardRow
                    key={r.id || r.userId}
                    rank={r.rank}
                    rankChange={r.rankChange || 0}
                    user={{
                      id: r.id || r.userId,
                      username: r.username || r.name?.toLowerCase().replace(/\s+/g, '') || r.id,
                      displayName: r.displayName || r.name,
                      avatar: r.avatar || '⚡',
                    }}
                    distanceKm={r.distanceKm || (r.total_distance_meters ? r.total_distance_meters / 1000 : 0)}
                    currentHoldingAreaM2={r.currentHoldingAreaM2 || 0}
                    currentCellsOwned={r.currentCellsOwned || 0}
                    totalAreaCapturedM2={r.totalAreaCapturedM2 || 0}
                    activeSector={sector}
                    isCurrentUser={user?.id === r.id || user?.id === r.userId || user?.username === r.username}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
