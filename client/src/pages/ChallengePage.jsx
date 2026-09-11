import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import ChallengeCard from '../components/ui/ChallengeCard.jsx';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { Target, Award, Info, History, Trophy, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';

export default function ChallengePage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'history'
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchChallenge();
      fetchHistory();
    }
  }, [user]);

  const fetchChallenge = async () => {
    setLoading(true);
    try {
      const json = await api.getChallenges(user.id);
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load challenge:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const json = await api.get(`/challenges/history?userId=${user.id}`);
      if (json.success) {
        setHistory(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load challenge history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const challenge = data?.challenge;
  const progress = data?.progress;
  const leaderboard = data?.leaderboard || [];
  const type = challenge?.challengeType || 'DISTANCE';

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Target className="w-7 h-7 text-amber-400" />
              <span>Universal Daily Challenges</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Universal 24-hour objectives (Rule 5) • Equal credit for 6 AM earlybirds and 10 PM night owls
            </p>
          </div>

          <div className="flex p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-bold self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Today's Challenge
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Past Archive</span>
            </button>
          </div>
        </div>

        {activeTab === 'today' ? (
          loading ? (
            <LoadingState message="Loading today's universal objective..." />
          ) : (
            <div className="space-y-5">
              {/* Main Challenge Card */}
              <ChallengeCard
                challenge={challenge}
                progress={progress?.rawProgress || progress?.progress || 0}
                isCompleted={progress?.completed || false}
              />

              {/* Detailed Progress Metrics Card */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Objective Breakdown & Telemetry</CardTitle>
                  <span className="text-xs text-cyan-400 font-mono">
                    {progress?.percentage || 0}% Completed
                  </span>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-bold">1. Verified Activity Metric:</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {progress?.formattedCurrent || progress?.progress || 0} / {progress?.formattedTarget || challenge?.target}
                      </span>
                    </div>
                    <ProgressBar value={progress?.percentage || 0} variant={progress?.completed ? 'emerald' : 'cyan'} />
                  </div>

                  {/* Rule 5 Callout Banner */}
                  <div className="p-4 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-cyan-200 leading-relaxed">
                      <span className="font-bold text-cyan-300">Rule 5 Universal Guarantee:</span> This daily challenge exists for the entire calendar day. Workouts completed at 6 AM or 10 PM count equally. There is no first-arrival penalty or territorial priority.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Participants Live Leaderboard Card */}
              {leaderboard.length > 0 && (
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <span>Today's Challenge Participants</span>
                    </CardTitle>
                    <span className="text-xs text-slate-400 font-mono">{leaderboard.length} Runners</span>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2">
                      {leaderboard.map((item, idx) => (
                        <div
                          key={item.userId}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-center font-mono font-bold text-slate-500 text-xs">
                              #{idx + 1}
                            </span>
                            <span className="text-xl">{item.avatar || '⚡'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{item.displayName || item.username}</span>
                                {item.completed && (
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    DONE
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">@{item.username}</div>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <div className="text-sm font-bold text-cyan-300">
                              {type === 'DISTANCE'
                                ? `${parseFloat(((item.progress || 0) / 1000).toFixed(2))} km`
                                : type === 'ACTIVE_DURATION'
                                ? `${Math.round((item.progress || 0) / 60)} mins`
                                : `${item.progress || 0}`}
                            </div>
                            <div className="text-[10px] text-purple-400">+{item.score || 0} XP</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )
        ) : (
          /* History Archive Tab */
          <div className="space-y-4">
            {historyLoading ? (
              <LoadingState message="Loading past daily challenges..." />
            ) : history.length === 0 ? (
              <Card variant="glass" className="p-8 text-center text-slate-400 text-sm">
                No past daily challenges logged yet.
              </Card>
            ) : (
              <div className="space-y-3">
                {history.map((hist) => (
                  <Card key={hist.id} variant="glass" className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
                          {hist.configuration?.badge || '🎯'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400">
                              {hist.challengeDate}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800 uppercase">
                              {hist.challengeType?.replace('_', ' ')}
                            </span>
                            {hist.isFinalized && (
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                                FINALIZED
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-white mt-0.5">{hist.configuration?.title}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-white font-bold">
                            {hist.progress?.completed ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Completed
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 text-slate-500" />
                                {hist.progress?.percentage || 0}%
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-purple-400">+{hist.progress?.score || 0} XP</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
