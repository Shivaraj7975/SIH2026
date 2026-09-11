import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Flame, MapPin, Timer, Shield, Sparkles, Swords, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function ActivitySummaryModal({
  isOpen,
  onClose,
  summaryData,
  activityType = 'RUN',
}) {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#00f2fe', '#f43f5e', '#10b981', '#fbbf24', '#8b5cf6'],
        });
      } catch (e) {}
    }
  }, [isOpen]);

  if (!summaryData) return null;

  const metrics = summaryData.metrics || {};
  const distanceKm = summaryData.distanceKm || (metrics.distanceMeters ? (metrics.distanceMeters / 1000).toFixed(2) : summaryData.distance ? (summaryData.distance / 1000).toFixed(2) : '0.00');
  const durationSec = summaryData.durationSeconds || metrics.durationSeconds || summaryData.duration || 0;
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const timeFormatted = `${mins}m ${secs}s`;
  const areaCovered = summaryData.areaCoveredKm2 || metrics.areaCoveredKm2 || summaryData.areaCovered || (summaryData.cellsCoveredCount ? (summaryData.cellsCoveredCount * 0.1).toFixed(2) : '0.00');
  const uniqueCells = summaryData.cellsCoveredCount || metrics.uniqueCellsCount || 0;
  const newCaptures = summaryData.newCaptures || summaryData.newCapturesCount || 0;
  const stolenCaptures = summaryData.stolenCaptures || summaryData.stolenCapturesCount || 0;
  const recaptures = summaryData.recaptures || summaryData.recapturedCount || 0;
  const xpGained = summaryData.xpGained || 250;
  const challengeDone = summaryData.challengeJustCompleted || summaryData.challengeCompletedNow || false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Workout Complete — Territory Claimed!"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-slate-200">
        <div className="relative p-5 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-indigo-950/80 border border-cyan-500/30 rounded-2xl overflow-hidden text-center shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>{activityType === 'RUN' ? '🏃 Outdoor Run' : '🚶 Outdoor Walk'}</span>
          </div>

          <div className="text-4xl font-black font-mono text-white tracking-tight">
            {distanceKm} <span className="text-xl font-sans font-medium text-cyan-400">km</span>
          </div>
          <p className="text-xs text-slate-300 mt-1 font-mono">
            {timeFormatted} • {metrics.avgPaceMinKm ? `${metrics.avgPaceMinKm} min/km pace` : 'Live Workout'}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>+{xpGained} Experience Points Earned</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] mb-1">
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>Distance</span>
            </div>
            <div className="text-base font-bold font-mono text-cyan-300">{distanceKm} km</div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] mb-1">
              <Timer className="w-3 h-3 text-indigo-400" />
              <span>Duration</span>
            </div>
            <div className="text-base font-bold font-mono text-white">{timeFormatted}</div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] mb-1">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>Area Held</span>
            </div>
            <div className="text-base font-bold font-mono text-amber-300">{areaCovered} km²</div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] mb-1">
              <Flame className="w-3 h-3 text-rose-400" />
              <span>Hexes Claimed</span>
            </div>
            <div className="text-base font-bold font-mono text-rose-300">{uniqueCells}</div>
          </div>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Tactical Sector Conquest Breakdown</span>
            <span className="text-[11px] font-mono text-cyan-400">Total: {uniqueCells} hexes</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-900/50">
              <div className="font-mono font-bold text-emerald-400 text-base">{newCaptures}</div>
              <div className="text-[10px] text-slate-400">New Sectors</div>
            </div>
            <div className="p-2 bg-rose-950/40 rounded-lg border border-rose-900/50">
              <div className="font-mono font-bold text-rose-400 text-base">{stolenCaptures}</div>
              <div className="text-[10px] text-slate-400">Stolen from Rivals</div>
            </div>
            <div className="p-2 bg-indigo-950/40 rounded-lg border border-indigo-900/50">
              <div className="font-mono font-bold text-indigo-400 text-base">{recaptures}</div>
              <div className="text-[10px] text-slate-400">Defended</div>
            </div>
          </div>
        </div>

        {challengeDone && (
          <div className="flex items-center gap-2.5 p-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Daily Challenge Complete! +250 XP bonus recorded.</span>
          </div>
        )}

        <Button variant="primary" size="lg" className="w-full" onClick={onClose}>
          Return to Command Map
        </Button>
      </div>
    </Modal>
  );
}
