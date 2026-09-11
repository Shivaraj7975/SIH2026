import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import ChallengeCard from '../components/ui/ChallengeCard.jsx';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { Flame, Shield, Crown, MapPin, ArrowRight, Activity, Sparkles, Map, Compass, Zap } from 'lucide-react';
import { api } from '../lib/api.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const [challengeData, setChallengeData] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [chalRes, actRes] = await Promise.all([
        api.getChallenges(user.id),
        api.getActivities(user.id),
      ]);

      if (chalRes.success) setChallengeData(chalRes.data);
      if (actRes.success) setRecentActivities(actRes.data.recentActivities || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentHoldingM2 = user?.currentHoldingAreaM2 || Math.round((user?.currentTerritoryCount || 0) * 43.58);
  const totalCapturedM2 = user?.totalAreaCapturedM2 || 0;
  const distanceKm = user?.totalDistanceKm || 0;

  return (
    <AppShell>
      <div className="space-y-6 font-sans">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{user?.avatar || '⚡'}</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                Athlete {user?.displayName}!
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Athletic telemetry active • System status: <span className="text-purple-600 font-bold">ONLINE</span>
            </p>
          </div>

          <Link to="/map">
            <Button variant="purple" size="md" icon={Map}>
              Open Sector Map
            </Button>
          </Link>
        </div>

        {/* 4 Core Athletic StatCards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Distance"
            value={distanceKm}
            unit="km"
            icon={Zap}
            color="purple"
            subtitle="Verified movement"
          />

          <StatCard
            title="Current Holding"
            value={currentHoldingM2.toLocaleString()}
            unit="m²"
            icon={Shield}
            color="darkblue"
            subtitle={`${user?.currentTerritoryCount || 0} active cells`}
          />

          <StatCard
            title="Total Captured"
            value={totalCapturedM2.toLocaleString()}
            unit="m²"
            icon={Compass}
            color="purple"
            subtitle="Monotonic total area"
          />

          <StatCard
            title="Leaderboard Rank"
            value={`#${user?.weeklyRank || 1}`}
            unit="standing"
            icon={Crown}
            color="darkblue"
            subtitle="Competition standing"
          />
        </div>

        {/* Middle Section: Daily Challenge & Live Sector Launch */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Daily Challenge Card */}
          <div className="lg:col-span-7">
            {loading ? (
              <LoadingState message="Loading daily athletic challenge..." height="min-h-[220px]" />
            ) : (
              <ChallengeCard
                challenge={challengeData?.challenge}
                progress={challengeData?.progress?.distanceMeters || 0}
                isCompleted={challengeData?.progress?.isCompleted || false}
              />
            )}
          </div>

          {/* Quick Multiplayer Map Launch Widget */}
          <div className="lg:col-span-5">
            <Card variant="glass" className="h-full flex flex-col justify-between p-5 border-slate-200 bg-white shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-purple-600 font-black text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>ATHLETIC TERRITORY RUN</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Live Territory Grid</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-world GPS running grid. Every curve you run captures ground into your permanent conquest tally.
                </p>
              </div>

              <div className="pt-4">
                <Link to="/map" className="w-full block">
                  <Button variant="purple" size="md" className="w-full text-xs font-black tracking-wider" icon={ArrowRight} iconPosition="right">
                    Launch Running Map
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {/* Recent Workouts Log */}
        <Card variant="glass" className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900">
              <Activity className="w-5 h-5 text-purple-600" />
              <span>Permanent Activity Log</span>
            </CardTitle>
            <Link to="/activity" className="text-xs font-bold text-purple-600 hover:underline uppercase tracking-wider">
              View All Runs
            </Link>
          </CardHeader>

          <CardContent>
            {loading ? (
              <LoadingState message="Loading recent workouts..." height="min-h-[120px]" />
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No recent workout sessions. Head to the Map to record your first run!
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivities.slice(0, 3).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-black text-xs">
                        🏃
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 font-mono">
                          {act.distanceKm} km Run
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {new Date(act.created_at).toLocaleDateString()} • {Math.round(act.duration_seconds / 60)} mins
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-black text-purple-600">
                        {act.unique_cells_count} hexes
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono font-bold">
                        {act.calories} kcal
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
