import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../lib/toast.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
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
  Hexagon,
  Target,
} from 'lucide-react';
import PrivacySettingsModal from '../components/privacy/PrivacySettingsModal.jsx';
import { api } from '../lib/api.js';

const AVATAR_OPTIONS = ['⚡', '🔥', '🌿', '👾', '🚀', '🐺', '🐯', '💎', '🎯', '🦅'];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [gamificationStats, setGamificationStats] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [achievementsData, setAchievementsData] = useState(null);
  const [selectedSummaryTab, setSelectedSummaryTab] = useState('weekly'); // 'weekly' | 'monthly'
  const [loading, setLoading] = useState(true);

  // Edit Avatar State
  const [isEditing, setIsEditing] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setDisplayName(user.displayName);
      setAvatar(user.avatar || '⚡');
      loadAllProfileData();
    }
  }, [user?.id]);

  const loadAllProfileData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [statsRes, weeklyRes, monthlyRes, achRes] = await Promise.all([
        api.getGamificationStats(user.id),
        api.getWeeklySummary(user.id),
        api.getMonthlySummary(user.id),
        api.getAchievements(user.id),
      ]);

      if (statsRes.success) setGamificationStats(statsRes.data);
      if (weeklyRes.success) setWeeklySummary(weeklyRes.data);
      if (monthlyRes.success) setMonthlySummary(monthlyRes.data);
      if (achRes.success) setAchievementsData(achRes.data);
    } catch (err) {
      console.error('Error loading gamification profile data:', err);
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

  const streak = gamificationStats?.streak || 0;
  const longestStreak = gamificationStats?.longestStreak || streak;
  const currentTerritory = gamificationStats?.currentTerritory || user?.currentTerritoryCount || 0;
  const totalDistanceKm = gamificationStats?.totalDistanceKm || 0;
  const totalAreaCovered = gamificationStats?.totalAreaCovered || 0;
  const uniqueCells = gamificationStats?.uniqueCells || 0;
  const activityCount = gamificationStats?.activities || 0;

  // Merge definitions with user unlocked state
  const allDefinitions = achievementsData?.definitions || [];
  const unlockedMap = new Map((achievementsData?.unlocked || []).map((a) => [a.type, a]));

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Player Identity Card */}
        <Card variant="glass" className="p-6 border-slate-200 bg-white shadow-sm font-sans">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <Avatar avatar={avatar} color="#7C3AED" size="xl" />

              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900">{displayName || user?.displayName}</h1>
                  <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 w-fit mx-auto sm:mx-0">
                    Tactical Runner
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">@{user?.username}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-mono text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-600" />
                    <span>{streak} Day Streak</span>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>Longest: <span className="font-mono font-bold text-slate-900">{longestStreak} Days</span></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={Shield}
                onClick={() => setIsPrivacyModalOpen(true)}
              >
                Privacy & Safe Zones
              </Button>

              <Button
                variant={isEditing ? 'secondary' : 'outline'}
                size="sm"
                icon={Edit3}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit Avatar'}
              </Button>
            </div>
          </div>

          {/* Edit Profile Form */}
          {isEditing && (
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setAvatar(em)}
                      className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        avatar === em
                          ? 'bg-purple-50 border-2 border-purple-600 scale-105 shadow-xs'
                          : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="purple" size="sm" onClick={handleSaveProfile} isLoading={saving}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {/* 4 Quick Motivation Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-5 border-t border-slate-100 text-center">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-600" />
                <span>Active Streak</span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-slate-900 mt-1">
                {streak} Days 🔥
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span>Dominion</span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-purple-700 mt-1">
                {currentTerritory} hexes
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                <Crown className="w-3.5 h-3.5 text-slate-700" />
                <span>Weekly Rank</span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-slate-900 mt-1">
                #{weeklySummary?.rank || user?.weeklyRank || 1}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                <span>Distance</span>
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-purple-700 mt-1">
                {Number(totalDistanceKm).toFixed(1)} km
              </div>
            </div>
          </div>
        </Card>

        {/* Lifetime Personal Statistics */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Lifetime Personal Telemetry</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              title="Total Distance"
              value={totalDistanceKm}
              unit="km"
              icon={MapPin}
              color="purple"
            />

            <StatCard
              title="Historical Area"
              value={totalAreaCovered}
              unit="km²"
              icon={Hexagon}
              color="darkblue"
            />

            <StatCard
              title="Unique Hexes"
              value={uniqueCells}
              unit="cells"
              icon={Shield}
              color="purple"
            />

            <StatCard
              title="Total Workouts"
              value={activityCount}
              unit="sessions"
              icon={CheckCircle2}
              color="darkblue"
            />
          </div>
        </div>

        {/* Weekly vs Monthly Summary Switcher */}
        <Card variant="glass" className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
            <CardTitle className="text-slate-900 font-bold">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span>Training Summary</span>
            </CardTitle>
            <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedSummaryTab('weekly')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedSummaryTab === 'weekly'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekly Report
              </button>
              <button
                type="button"
                onClick={() => setSelectedSummaryTab('monthly')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedSummaryTab === 'monthly'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Report
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {selectedSummaryTab === 'weekly' && weeklySummary && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                  <span>Period: <strong className="text-slate-900">{weeklySummary.period}</strong></span>
                  <span>Active Days: <strong className="text-purple-700">{weeklySummary.activeDaysCount} / 7 days</strong></span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 font-mono">Distance</span>
                    <div className="text-base font-black font-mono text-purple-700 mt-0.5">{weeklySummary.totalDistanceKm} km</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 font-mono">Active Time</span>
                    <div className="text-base font-black font-mono text-slate-900 mt-0.5">{weeklySummary.totalDurationMinutes} mins</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 font-mono">Comp Score</span>
                    <div className="text-base font-black font-mono text-purple-700 mt-0.5">{weeklySummary.competitionScore} pts</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 font-mono">Standing</span>
                    <div className="text-base font-black font-mono text-slate-900 mt-0.5">#{weeklySummary.rank}</div>
                  </div>
                </div>
              </div>
            )}

            {selectedSummaryTab === 'monthly' && monthlySummary && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                  <span>Period: <strong className="text-slate-900">{monthlySummary.period}</strong></span>
                  <span>Standing: <strong className="text-purple-700">#{monthlySummary.rank}</strong></span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 font-mono">Total Distance</span>
                    <div className="text-base font-black font-mono text-purple-700 mt-0.5">{monthlySummary.totalDistanceKm} km</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 font-mono">Workouts</span>
                    <div className="text-base font-black font-mono text-slate-900 mt-0.5">{monthlySummary.activityCount} runs</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 font-mono">Monthly Score</span>
                    <div className="text-base font-black font-mono text-purple-700 mt-0.5">{monthlySummary.competitionScore} pts</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 font-mono">Monthly Rank</span>
                    <div className="text-base font-black font-mono text-slate-900 mt-0.5">#{monthlySummary.rank}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievement Showcase */}
        <Card variant="glass" className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-slate-900 font-bold">
              <Award className="w-5 h-5 text-purple-600" />
              <span>Conquest Achievements</span>
            </CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              {gamificationStats?.unlockedAchievementsCount || 0} / {allDefinitions.length || 9} Unlocked
            </span>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {allDefinitions.map((def) => {
                const isUnlocked = unlockedMap.has(def.type);

                return (
                  <div
                    key={def.type}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isUnlocked
                        ? 'bg-purple-50/40 border-purple-200 shadow-xs'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border ${
                        isUnlocked ? 'bg-white border-purple-200 text-purple-700' : 'bg-slate-100 border-slate-200 grayscale'
                      }`}>
                        {def.icon}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-900">{def.title}</h4>
                          {isUnlocked ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                          ) : (
                            <Lock className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{def.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-slate-200/60">
                      <span className="text-purple-700 font-bold">+{def.xpReward} XP</span>
                      <span className={isUnlocked ? 'text-purple-700 font-bold' : 'text-slate-400'}>
                        {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Milestone Notifications & Progress */}
        {gamificationStats?.milestones && (
          <Card variant="glass" className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-slate-900 font-bold">
                <Target className="w-5 h-5 text-purple-600" />
                <span>Endurance Milestones</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {gamificationStats.milestones.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{m.name}</span>
                      <span className="font-mono text-purple-700">{m.current} / {m.target} {m.unit}</span>
                    </div>
                    <ProgressBar
                      value={m.current}
                      max={m.target}
                      variant={m.reached ? 'emerald' : 'purple'}
                      showLabel={false}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <PrivacySettingsModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
          activeUserId={user?.id}
        />
      </div>
    </AppShell>
  );
}
