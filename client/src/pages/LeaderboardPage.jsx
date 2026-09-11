import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import LeaderboardRow from '../components/ui/LeaderboardRow.jsx';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { Trophy, Info, Sparkles, HelpCircle, Shield, MapPin, Award, Compass, Zap, Flame } from 'lucide-react';
import { api } from '../lib/api.js';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('weekly'); // 'daily' or 'weekly' only
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
    { id: 'distance', label: 'Distance Covered', icon: Zap, color: 'text-purple-600' },
    { id: 'holding', label: 'Current Holding Area', icon: Shield, color: 'text-slate-900' },
    { id: 'total_area', label: 'Total Area Captured', icon: FlagSectorIcon, color: 'text-purple-600' },
  ];

  function FlagSectorIcon(props) {
    return <Compass {...props} />;
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto font-sans">
        {/* Header with Title & Timeframe Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2.5">
              <Trophy className="w-7 h-7 text-purple-600" />
              <span>Athletic Competition</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live ranking across <span className="text-purple-600 font-black">Daily & Weekly</span> performance sectors
            </p>
          </div>

          {/* Timeframe Filter: Strictly Daily & Weekly */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setTimeframe('daily')}
                className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  timeframe === 'daily'
                    ? 'bg-purple-600 text-white font-black shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('weekly')}
                className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  timeframe === 'weekly'
                    ? 'bg-purple-600 text-white font-black shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekly
              </button>
            </div>

            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2.5 bg-white border border-slate-200 hover:border-purple-300 rounded-xl text-slate-500 hover:text-purple-600 transition-colors cursor-pointer shadow-sm"
              title="How rankings and sectors work"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The 3 Sectors Selector */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span>Select Sector Ranking:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SECTORS.map((sec) => {
              const Icon = sec.icon;
              const isSelected = sector === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSector(sec.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-black uppercase tracking-wider transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${sec.color} flex-shrink-0`} />
                  <div className="min-w-0">
                    <div className="truncate">{sec.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explainable Sector Rules Callout */}
        {showInfo && (
          <Card variant="glass" className="p-4 border-slate-200 bg-white shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-black text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Sector Mechanics & Non-Decreasing Total Area</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-purple-700 mb-1">🏃 1. Distance Covered</div>
                  <p className="text-[11px] text-slate-500">Total verified distance in km logged by the athlete during the selected {timeframe} window.</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">🛡️ 2. Current Holding Area</div>
                  <p className="text-[11px] text-slate-500">The live territory area (m²) currently held by the athlete on the map. Decreases if opponents capture your cells.</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-purple-700 mb-1">🚩 3. Total Area Captured</div>
                  <p className="text-[11px] text-slate-500">The cumulative territory (m²) conquered by the athlete. Irrespective of opponents stealing cells, this total never decreases!</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Sector Explainer Banner */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-600 shadow-sm">
          <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Currently ranked by <span className="font-black text-purple-700 uppercase">{sector.replace('_', ' ')}</span> in the <span className="font-black text-slate-900 uppercase">{timeframe}</span> league. Notice that while <span className="text-slate-900 font-bold">Current Holding</span> shifts as other runners take cells, your <span className="text-purple-700 font-bold">Total Area Captured</span> is permanent and never decrements.
          </div>
        </div>

        {/* Standings List */}
        <Card variant="glass" className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900">
              <span>{timeframe === 'daily' ? "Today's" : "This Week's"} Standings</span>
            </CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              {rankings.length} Competitors
            </span>
          </CardHeader>

          <CardContent>
            {loading ? (
              <LoadingState message="Aggregating live competition sectors..." />
            ) : rankings.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
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
