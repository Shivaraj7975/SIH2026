import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Award, Clock, MapPin, Shield, Activity } from 'lucide-react';
import { api } from '../lib/api.js';
import Modal from './ui/Modal.jsx';
import ProgressBar from './ui/ProgressBar.jsx';

export default function DailyChallengeModal({ activeUser, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchChallenge();
    }
  }, [isOpen, activeUser]);

  const fetchChallenge = async () => {
    setLoading(true);
    try {
      const json = await api.get(`/challenges?userId=${activeUser?.id || 'user-shivaraj'}`);
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load challenge:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const challenge = data?.challenge;
  const progress = data?.progress;
  const leaderboard = data?.leaderboard || [];
  const type = challenge?.challengeType || 'DISTANCE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Universal 24H Daily Challenge"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-slate-800 font-sans">
        <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white text-purple-700 rounded-2xl border border-purple-200 shadow-xs text-2xl">
              {challenge?.configuration?.badge || '🎯'}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded-full border border-purple-200 uppercase">
                {type.replace('_', ' ')} OBJECTIVE
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1">
                {challenge?.configuration?.title || 'Hex Grid Blitz'}
              </h3>
            </div>
          </div>
          <div className="px-3 py-1 bg-white text-purple-700 border border-purple-200 rounded-xl text-xs font-mono font-bold flex items-center gap-1 shadow-xs">
            <Award className="w-4 h-4 text-purple-600" />
            +{challenge?.configuration?.xpBonus || 250} XP
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-purple-600 text-xs font-mono">Loading objective status...</div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              {challenge?.configuration?.description || 'Run or walk today to conquer sectors and complete the objective.'}
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Your Progress Today:</span>
                <span className="font-mono font-bold text-slate-900">
                  {progress?.formattedCurrent || `${progress?.progress || 0}`} / {progress?.formattedTarget || `${challenge?.target || 3500}`}
                </span>
              </div>
              <ProgressBar value={progress?.percentage || 0} variant={progress?.completed ? 'emerald' : 'purple'} />
              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>24-Hour Window (Equal Fairness)</span>
                </span>
                <span className="font-mono font-bold text-purple-600">{progress?.percentage || 0}%</span>
              </div>
            </div>

            {progress?.completed && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Objective Complete! +{challenge?.configuration?.xpBonus || 250} XP bonus claimed.</span>
              </div>
            )}

            {leaderboard.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Today's Challenge Participants
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {leaderboard.map((item, idx) => (
                    <div
                      key={item.userId}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                        <span className="font-bold text-slate-900">{item.displayName || item.username}</span>
                        {item.completed && (
                          <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                            DONE
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-purple-700 font-bold">
                        {type === 'DISTANCE'
                          ? `${parseFloat(((item.progress || 0) / 1000).toFixed(2))} km`
                          : type === 'ACTIVE_DURATION'
                          ? `${Math.round((item.progress || 0) / 60)} min`
                          : `${item.progress || 0}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
