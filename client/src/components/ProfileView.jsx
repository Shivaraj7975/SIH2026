import React, { useState, useEffect } from 'react';
import { Activity, Flame, Shield, MapPin, Clock } from 'lucide-react';
import { api } from '../lib/api.js';

export default function ProfileView({ activeUser }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeUser?.id) {
      fetchProfile();
    }
  }, [activeUser]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const json = await api.get(`/activity?userId=${activeUser?.id || 'user-shivaraj'}`);
      if (json.success) {
        setProfileData(json);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const user = profileData?.user || activeUser;
  const activities = profileData?.activities || [];

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border-2 text-3xl shadow-xl border-cyan-400"
          >
            {user?.avatar || '⚡'}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-black text-white">{user?.displayName || user?.username}</h2>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-700 w-fit mx-auto sm:mx-0">
                Rank #{user?.weeklyRank || 1} • Cyber Athlete
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">@{user?.username}</p>

            <div className="mt-3 max-w-md">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Daily Challenge Score</span>
                <span className="font-mono text-cyan-300">{user?.dailyScore || 0} XP</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (user?.dailyScore || 0) / 5)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>Lifetime Distance</span>
            </div>
            <div className="text-xl font-black font-mono text-cyan-300">
              {user?.totalDistanceKm || 0} <span className="text-xs font-sans text-slate-400">km</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>Active Duration</span>
            </div>
            <div className="text-xl font-black font-mono text-white">
              {user?.totalDurationMinutes || 0} <span className="text-xs font-sans text-slate-400">mins</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-400" />
              <span>Workouts</span>
            </div>
            <div className="text-xl font-black font-mono text-rose-400">
              {user?.totalActivities || activities.length} <span className="text-xs font-sans text-slate-400">runs</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>Current Territory</span>
            </div>
            <div className="text-xl font-black font-mono text-amber-300">
              {user?.currentTerritoryCount || 0} <span className="text-xs font-sans text-slate-400">hexes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Permanent Workout Log (Rule 3)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {activities.length} Recorded Runs
          </span>
        </div>

        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No completed workouts yet. Start a run on the Live Map!
          </div>
        ) : (
          <div className="space-y-2.5">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-900/70 hover:bg-slate-800/60 rounded-xl border border-slate-800 transition-colors gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-cyan-300">
                      {parseFloat(((act.distance || 0) / 1000).toFixed(2))} km {act.type || 'Run'}
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded">
                      {act.areaCovered || 0} km² held
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 font-mono">
                    <span>{new Date(act.startedAt || act.createdAt).toLocaleDateString()} at {new Date(act.startedAt || act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right">
                    <div className="text-white font-bold">{Math.round((act.duration || 0) / 60)} mins</div>
                    <div className="text-[10px] text-slate-400">Duration</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
