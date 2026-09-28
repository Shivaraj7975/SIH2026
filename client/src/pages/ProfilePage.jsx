import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../lib/toast.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import ChallengeCard from '../components/ui/ChallengeCard.jsx';
import WorkoutDetailModal from '../components/workout/WorkoutDetailModal.jsx';
import PrivacySettingsModal from '../components/privacy/PrivacySettingsModal.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import {
  Award,
  Flame,
  Shield,
  Crown,
  MapPin,
  Clock,
  CheckCircle2,
  Lock,
  Edit3,
  Calendar,
  Sparkles,
  TrendingUp,
  Target,
  Activity,
  History,
  ChevronRight,
  RefreshCw,
  Zap,
  Radio,
  User,
} from 'lucide-react';
import { api } from '../lib/api.js';

const AVATAR_OPTIONS = ['⚡', '🔥', '🌿', '👾', '🚀', '🐺', '🐯', '💎', '🎯', '🦅'];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // Active top-level tab: 'profile' | 'workouts' | 'objectives'
  const [activeTab, setActiveTab] = useState('profile');

  // Profile / Gamification Data
  const [gamificationStats, setGamificationStats] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [achievementsData, setAchievementsData] = useState(null);
  const [selectedSummaryTab, setSelectedSummaryTab] = useState('weekly');

  // Workouts / Activities Data
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Daily Objectives / Challenges Data
  const [challengeData, setChallengeData] = useState(null);
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [challengeTab, setChallengeTab] = useState('today'); // 'today' | 'history'
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      setDisplayName(user.displayName || user.username);
      setAvatar(user.avatar || '⚡');
      loadAllAthleteData();
    }
  }, [user?.id]);

  const loadAllAthleteData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [statsRes, weeklyRes, monthlyRes, achRes, actRes, chalRes, chalHistRes] = await Promise.all([
        api.getGamificationStats(user.id).catch(() => ({ success: false })),
        api.getWeeklySummary(user.id).catch(() => ({ success: false })),
        api.getMonthlySummary(user.id).catch(() => ({ success: false })),
        api.getAchievements(user.id).catch(() => ({ success: false })),
        api.getActivities(user.id).catch(() => ({ success: false })),
        api.getChallenges(user.id).catch(() => ({ success: false })),
        api.get(`/challenges/history?userId=${user.id}`).catch(() => ({ success: false })),
      ]);

      if (statsRes.success) setGamificationStats(statsRes.data);
      if (weeklyRes.success) setWeeklySummary(weeklyRes.data);
      if (monthlyRes.success) setMonthlySummary(monthlyRes.data);
      if (achRes.success) setAchievementsData(achRes.data);

      if (actRes.success) {
        const list = actRes.activities || actRes.data?.recentActivities || actRes.data || [];
        setActivities(list);
      }

      if (chalRes.success) setChallengeData(chalRes.data);
      if (chalHistRes.success) setChallengeHistory(chalHistRes.data || []);
    } catch (err) {
      console.error('Error loading athlete profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      await refreshUser();
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculateChallenge = async () => {
    setIsRecalculating(true);
    try {
      const res = await api.post('/challenges/recalculate', { userId: user.id });
      if (res.success) {
        toast.success('Challenge progress synced from valid workouts!');
        const chalRes = await api.getChallenges(user.id);
        if (chalRes.success) setChallengeData(chalRes.data);
      }
    } catch (e) {
      toast.error('Recalculation failed');
    } finally {
      setIsRecalculating(false);
    }
  };

  const streak = gamificationStats?.streak || 0;
  const longestStreak = gamificationStats?.longestStreak || streak;
  const currentTerritory = gamificationStats?.currentTerritory || user?.currentTerritoryCount || 0;
  const totalDistanceKm = gamificationStats?.totalDistanceKm || (activities.reduce((sum, a) => sum + (Number(a.distance) || 0), 0) / 1000).toFixed(1);
  const totalCalories = gamificationStats?.totalCalories || activities.reduce((sum, a) => sum + (Number(a.calories) || 0), 0);
  const totalDurationSecs = activities.reduce((sum, a) => sum + (Number(a.duration) || 0), 0);

  const challenge = challengeData?.challenge;
  const challengeProgress = challengeData?.progress;

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto pb-10 font-sans">
        {/* Top Hub Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-purple-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Athlete Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('workouts')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'workouts'
                  ? 'bg-purple-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Workouts &amp; Logs ({activities.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('objectives')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'objectives'
                  ? 'bg-purple-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Target className="w-4 h-4 text-amber-500" />
              <span>Daily Objectives</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-purple-600 bg-slate-50 hover:bg-purple-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span>Data Privacy &amp; GPX Export</span>
          </button>
        </div>

        {/* TAB 1: ATHLETE PROFILE & DOMINION */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Athlete Header Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="flex items-center justify-center w-20 h-20 rounded-3xl bg-purple-100 border-2 border-purple-300 text-4xl shadow-md">
                      {avatar}
                    </span>
                    <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-xs">
                      Lv.{user?.level || 1}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        {user?.displayName || user?.username}
                      </h1>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                        {user?.team || 'Team Alpha'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      @{user?.username} • Rank #{user?.weeklyRank || 1} in City Standing
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        <strong className="text-slate-900">{streak} Day Streak</strong> (Best: {longestStreak}d)
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-purple-600" />
                        <strong className="text-purple-700 font-mono">{currentTerritory}</strong> Hexagon Dominion
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Cancel Edit' : 'Edit Avatar & Bio'}</span>
                  </button>
                </div>
              </div>

              {/* Edit Avatar Selector */}
              {isEditing && (
                <div className="mt-6 pt-5 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">Choose Avatar Symbol:</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OPTIONS.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setAvatar(av)}
                          className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer border ${
                            avatar === av
                              ? 'bg-purple-600 text-white border-purple-600 scale-110 shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display Name"
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4 Primary Lifetime Fitness StatCards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="Total Distance"
                value={totalDistanceKm}
                unit="km"
                icon={MapPin}
                color="purple"
              />
              <StatCard
                title="Territory Dominion"
                value={currentTerritory}
                unit="hexes"
                icon={Shield}
                color="darkblue"
              />
              <StatCard
                title="Active Time"
                value={Math.round(totalDurationSecs / 60)}
                unit="mins"
                icon={Clock}
                color="purple"
              />
              <StatCard
                title="Calories Burned"
                value={totalCalories}
                unit="kcal"
                icon={Flame}
                color="darkblue"
              />
            </div>

            {/* Weekly & Monthly Performance Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card variant="glass" className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                      Weekly Performance Report
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    7-DAY AGGREGATE
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-center">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Distance</span>
                    <span className="text-base font-black text-purple-700">{weeklySummary?.totalDistanceKm || '0.0'} km</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Workouts</span>
                    <span className="text-base font-black text-slate-900">{weeklySummary?.workoutCount || 0}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Hexes Visited</span>
                    <span className="text-base font-black text-purple-700">{weeklySummary?.uniqueCells || 0}</span>
                  </div>
                </div>
              </Card>

              <Card variant="glass" className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                      Monthly Endurance Summary
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    30-DAY WINDOW
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-center">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Distance</span>
                    <span className="text-base font-black text-purple-700">{monthlySummary?.totalDistanceKm || '0.0'} km</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Workouts</span>
                    <span className="text-base font-black text-slate-900">{monthlySummary?.workoutCount || 0}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Hexes Conquered</span>
                    <span className="text-base font-black text-purple-700">{monthlySummary?.uniqueCells || 0}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: WORKOUT & ACTIVITY HISTORY */}
        {activeTab === 'workouts' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span>Permanent Workout Records</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any workout session to inspect its GPS route path and conquered territory on the tactical map.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                {activities.length} Recorded Sessions
              </span>
            </div>

            {activities.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No workouts recorded yet"
                description="Start a test run or real GPS run on the Tactical Map to log your first exercise conquest!"
              />
            ) : (
              <div className="space-y-3">
                {activities.map((act) => {
                  const distKm = ((Number(act.distance) || 0) / 1000).toFixed(2);
                  const durMin = Math.round((Number(act.duration) || 0) / 60);
                  const dateStr = new Date(act.start_time || act.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={act.id}
                      onClick={() => {
                        setSelectedActivity(act);
                        setIsDetailModalOpen(true);
                      }}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                          {act.activity_type === 'WALK' ? '🚶' : '🏃'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">
                              {act.title || (act.activity_type === 'WALK' ? 'Outdoor Walk' : 'Outdoor Run')}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                              {dateStr}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono">
                            <span>{distKm} km</span>
                            <span>•</span>
                            <span>{durMin} mins</span>
                            <span>•</span>
                            <span>{act.calories || Math.round(Number(act.distance || 0) * 0.065)} kcal</span>
                            <span>•</span>
                            <span className="text-purple-700 font-bold">{act.hex_count || act.uniqueCellsCount || 1} hexes</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-600 hover:underline">View Map &amp; Details</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DAILY OBJECTIVES & UNIVERSAL CHALLENGES */}
        {activeTab === 'objectives' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Objectives Header & Sync */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  <span>Universal 24-Hour Daily Challenges</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standardized daily objectives reset every 24 hours. Complete the distance/sector target to earn bonus XP!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRecalculateChallenge}
                  disabled={isRecalculating}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                  <span>Sync Workout Progress</span>
                </button>
              </div>
            </div>

            {/* Active Challenge Card */}
            {challenge ? (
              <ChallengeCard
                challenge={challenge}
                progress={challengeProgress}
              />
            ) : (
              <Card variant="glass" className="p-6 text-center space-y-2">
                <Target className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
                <h3 className="font-bold text-slate-900">Generating Today's Universal Challenge...</h3>
                <p className="text-xs text-slate-500">Run any route on the live map to begin making progress!</p>
              </Card>
            )}

            {/* Challenge Archive / History */}
            {challengeHistory.length > 0 && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" />
                  <span>Past Challenge Archive</span>
                </h3>
                <div className="space-y-2">
                  {challengeHistory.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{item.title || 'Daily Objective'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.challenge_date} • Target: {item.target_value}</div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        item.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.completed ? 'COMPLETED ✓' : 'EXPIRED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Workout Detail Modal */}
        <WorkoutDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedActivity(null);
          }}
          activity={selectedActivity}
        />

        {/* Privacy Settings Modal */}
        <PrivacySettingsModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
          userId={user?.id}
        />
      </div>
    </AppShell>
  );
}
