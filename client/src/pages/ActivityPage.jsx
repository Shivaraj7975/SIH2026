import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import WorkoutDetailModal from '../components/workout/WorkoutDetailModal.jsx';
import { Activity, Clock, Flame, MapPin, Calendar, Shield, ChevronRight, Sparkles, Map } from 'lucide-react';
import { api } from '../lib/api.js';

export default function ActivityPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const json = await api.getActivities(user?.id);
      if (json.success) {
        const list = json.activities || json.data?.recentActivities || json.data || [];
        setActivities(list);
        setProfileData(json.user || json.data?.stats);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = profileData?.stats || user?.stats;

  const handleWorkoutClick = (act) => {
    setSelectedActivity(act);
    setIsDetailModalOpen(true);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-purple-600" />
              <span>Workout & Activity Logs</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Permanent immutable workout records • Click any session to inspect its route path and conquered territory
            </p>
          </div>
        </div>

        {/* 4 Lifetime Fitness StatCards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Distance"
            value={stats?.totalDistanceKm || ((stats?.lifetimeDistance || 0) / 1000).toFixed(1)}
            unit="km"
            icon={MapPin}
            color="purple"
          />

          <StatCard
            title="Total Workouts"
            value={activities.length || stats?.totalActivities || 0}
            unit="sessions"
            icon={Activity}
            color="darkblue"
          />

          <StatCard
            title="Active Duration"
            value={Math.round((stats?.totalDurationSeconds || stats?.lifetimeDuration || 0) / 60)}
            unit="mins"
            icon={Clock}
            color="purple"
          />

          <StatCard
            title="Calories Burned"
            value={stats?.totalCalories || Math.round((stats?.lifetimeDistance || 0) * 0.065)}
            unit="kcal"
            icon={Flame}
            color="darkblue"
          />
        </div>

        {/* Activity List */}
        <Card variant="glass" className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-slate-900 font-bold">Recorded Fitness Activities</CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              {activities.length} Recorded Sessions
            </span>
          </CardHeader>

          <CardContent>
            {loading ? (
              <LoadingState message="Loading activity archive..." />
            ) : activities.length === 0 ? (
              <EmptyState
                title="No Workouts Found"
                description="Your completed running and walking workouts will permanently appear here."
                icon={Activity}
              />
            ) : (
              <div className="space-y-3">
                {activities.map((act) => {
                  const distKm = act.distance_km || (act.distance ? (act.distance / 1000).toFixed(2) : '0.00');
                  const durationMins = act.duration_minutes || (act.duration ? Math.round(act.duration / 60) : 1);
                  const cellsCount = act.unique_cells_count || (act.cells ? act.cells.length : 0);
                  const areaKm2 = Number(act.areaCovered || act.area_covered || 0);
                  const areaM2 = Math.round(areaKm2 * 1000000);

                  return (
                    <div
                      key={act.id}
                      onClick={() => handleWorkoutClick(act)}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 hover:bg-purple-50/50 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all gap-3 cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-2xl flex-shrink-0 transition-all">
                          {act.type === 'WALK' ? '🚶' : '🏃'}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-base text-slate-900 group-hover:text-purple-700">
                              {distKm} km {act.type === 'WALK' ? 'Walk' : 'Run'}
                            </span>
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 font-mono flex items-center gap-1 font-bold">
                              <Sparkles className="w-2.5 h-2.5" />
                              {cellsCount} hexes
                            </span>
                            {areaM2 > 0 && (
                              <span className="text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-mono flex items-center gap-1 font-medium">
                                <Shield className="w-2.5 h-2.5" />
                                {areaM2 >= 10000 ? `${areaKm2.toFixed(3)} km²` : `${areaM2} m²`}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(act.startedAt || act.started_at || act.createdAt || Date.now()).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}{' '}
                              at{' '}
                              {new Date(act.startedAt || act.started_at || act.createdAt || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 text-xs font-mono">
                        <div className="text-right">
                          <div className="text-slate-900 font-bold">{durationMins} mins</div>
                          <div className="text-[10px] text-slate-500">{act.avg_pace_min_km || '--:--'} min/km</div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-900 font-bold">{act.calories || Math.round(Number(distKm) * 65)} kcal</div>
                          <div className="text-[10px] text-slate-400">burned</div>
                        </div>
                        <div className="p-2 rounded-xl bg-white group-hover:bg-purple-600 group-hover:text-white text-slate-700 border border-slate-200 transition-colors flex items-center gap-1 text-[11px] font-sans font-bold shadow-xs">
                          <Map className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View Map</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <WorkoutDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedActivity(null);
        }}
        activity={selectedActivity}
        activeUserId={user?.id}
      />
    </AppShell>
  );
}
