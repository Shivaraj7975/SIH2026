import React, { useState, useEffect } from 'react';
import { Trophy, Shield, Crown, Info } from 'lucide-react';
import { api } from '../lib/api.js';

export default function LeaderboardView() {
  const [timeframe, setTimeframe] = useState('weekly');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard(timeframe);
  }, [timeframe]);

  const fetchLeaderboard = async (tf) => {
    setLoading(true);
    try {
      const data = await api.get(`/leaderboard?timeframe=${tf}`);
      if (data.success) {
        setRankings(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-black tracking-wide text-white">Fitness Champions Leaderboard</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ranked by <span className="text-cyan-400 font-semibold">Historical Workout Distance & Territory Conquests</span>.
            </p>
          </div>

          <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold self-start sm:self-auto">
            {['weekly', 'monthly', 'all_time'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3.5 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3.5 flex items-start gap-2.5 p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-xs text-cyan-200">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-cyan-300">Rule 6 Separation Principle:</span> Runners are ranked by their persistent physical output, ensuring historical volume is rewarded while maintaining dynamic real-time map competition.
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center items-center text-cyan-400 text-sm">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-2" />
            Calculating live standings...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Athlete</th>
                  <th className="py-3 px-3 text-cyan-400 font-extrabold">Historical Distance</th>
                  <th className="py-3 px-3 text-slate-300">Active Duration</th>
                  <th className="py-3 px-3 text-amber-400">Current Territory</th>
                  <th className="py-3 px-3 text-purple-400">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rankings.map((athlete) => {
                  const isTop1 = athlete.rank === 1;
                  const isTop2 = athlete.rank === 2;
                  const isTop3 = athlete.rank === 3;

                  return (
                    <tr
                      key={athlete.userId || athlete.username}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isTop1 ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 font-black font-mono">
                          {isTop1 ? (
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              <Crown className="w-4 h-4" />
                            </span>
                          ) : isTop2 ? (
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-400/20 text-slate-300 border border-slate-400/40">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-700/20 text-amber-600 border border-amber-700/40">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-500 px-2">#{athlete.rank}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border-2 text-sm border-cyan-400"
                          >
                            {athlete.avatar || '⚡'}
                          </span>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {athlete.displayName || athlete.username}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              @{athlete.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-black text-cyan-300 text-sm sm:text-base">
                        {athlete.distanceKm} <span className="text-xs font-sans text-slate-400 font-normal">km</span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-300">
                        {athlete.durationFormatted || '0h 0m'}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-mono font-bold text-amber-300">{athlete.territoryCount}</span>
                          <span className="text-[10px] text-slate-400">hexes</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-purple-300">
                        {athlete.points?.toLocaleString() || 0} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
