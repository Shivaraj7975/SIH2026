import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sounds } from '../../lib/audio.js';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { Trophy, Flame, Shield, Zap, Award, CheckCircle, ArrowRight, Share2, Sparkles, MapPin, Coffee, Layers } from 'lucide-react';

function formatArea(areaM2, areaKm2) {
  const m2 = areaM2 || (areaKm2 ? areaKm2 * 1000000 : 0);
  const km2 = areaKm2 || m2 / 1000000;
  if (m2 >= 100000) {
    return { val: km2.toFixed(3), unit: 'km²' };
  }
  if (m2 >= 1000) {
    return { val: Math.round(m2).toLocaleString(), unit: 'm²' };
  }
  return { val: Math.round(m2).toString(), unit: 'm²' };
}

export default function DailyResultModal({
  isOpen,
  onClose,
  resultData,
}) {
  useEffect(() => {
    if (isOpen) {
      if (resultData?.challengeJustCompleted || (resultData?.newlyUnlockedAchievements && resultData.newlyUnlockedAchievements.length > 0)) {
        sounds.play('fanfare');
        try {
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 },
            colors: ['#00f2fe', '#4facfe', '#10b981', '#f59e0b', '#ec4899', '#a855f7'],
          });
        } catch (e) {}
      } else {
        sounds.play('victory');
      }
    }
  }, [isOpen, resultData]);

  if (!resultData) return null;

  const activity = resultData.activity || {};
  const metrics = resultData.metrics || {};
  const distanceKm = resultData.distanceKm || (activity.distance ? (activity.distance / 1000).toFixed(2) : metrics.distanceMeters ? (metrics.distanceMeters / 1000).toFixed(2) : '0.00');
  
  const activeDurationSec = resultData.activeDuration || activity.duration || metrics.durationSeconds || resultData.durationSeconds || 0;
  const activeMinutes = Math.floor(activeDurationSec / 60);
  const activeSeconds = activeDurationSec % 60;
  
  const breakDurationSec = resultData.totalBreakDuration || 0;
  const breakMinutes = Math.floor(breakDurationSec / 60);
  const breakSeconds = breakDurationSec % 60;
  const breaksCount = resultData.breaksCount || (resultData.breaks ? resultData.breaks.length : 0);

  const pace = metrics.avgPaceMinKm || (Number(distanceKm) > 0 ? ((activeDurationSec / 60) / Number(distanceKm)).toFixed(2) : '0.00');
  const calories = metrics.caloriesBurned || resultData.caloriesBurned || Math.round(Number(distanceKm) * 65);
  const newCaptures = resultData.newCaptures || 0;
  const stolenCaptures = resultData.stolenCaptures || 0;
  const totalSectors = resultData.cellsCoveredCount || (newCaptures + stolenCaptures);
  const streak = resultData.streak || 1;
  const newlyUnlocked = resultData.newlyUnlockedAchievements || [];

  const areaM2 = resultData.totalAreaM2 || metrics.areaCoveredM2 || (activity.area_covered ? activity.area_covered * 1000000 : 0);
  const areaKm2 = resultData.totalAreaKm2 || metrics.areaCoveredKm2 || activity.area_covered || 0;
  const areaDisplay = formatArea(areaM2, areaKm2);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6 text-center font-sans">
        {/* Header Badge */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 border border-purple-200 flex items-center justify-center text-3xl shadow-sm animate-bounce">
            ⚡
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Workout Complete!
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily conquest and training report recorded to tactical grid
            </p>
          </div>
        </div>

        {/* 4-Stat Core Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-[10px] font-mono uppercase text-slate-500">Distance</span>
            <div className="text-lg font-black text-purple-700 mt-0.5 font-mono">
              {distanceKm} <span className="text-xs font-normal text-slate-500">km</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-[10px] font-mono uppercase text-slate-500">Active Time</span>
            <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
              {activeMinutes}:{activeSeconds.toString().padStart(2, '0')}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-[10px] font-mono uppercase text-slate-500">Pace</span>
            <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
              {pace} <span className="text-xs font-normal text-slate-500">min/km</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-[10px] font-mono uppercase text-slate-500">Calories</span>
            <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
              {calories} <span className="text-xs font-normal text-slate-500">kcal</span>
            </div>
          </div>
        </div>

        {/* Territory Conquest & Area Details */}
        <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Enclosed Territory Impact</span>
            </span>
            <span className="text-[10px] font-mono text-purple-700 bg-white border border-purple-200 px-2.5 py-0.5 rounded-full font-bold">
              +{totalSectors} HEXES CONQUERED
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-[10px]">Geographic Area:</span>
              <div className="font-mono font-bold text-purple-700 text-sm">
                {areaDisplay.val} {areaDisplay.unit}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-[10px]">Pioneer Claims:</span>
              <div className="font-mono font-bold text-slate-900 text-sm">{newCaptures} New Sectors</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-slate-500 text-[10px]">Contested Steals:</span>
              <div className="font-mono font-bold text-slate-900 text-sm">{stolenCaptures} Rival Sectors</div>
            </div>
          </div>

          {/* Break Summary Info */}
          {breaksCount > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-purple-200/60">
              <span className="flex items-center gap-1">
                <Coffee className="w-3.5 h-3.5 text-purple-600" />
                <span>{breaksCount} Break{breaksCount > 1 ? 's' : ''} Taken</span>
              </span>
              <span className="font-mono">
                Total Rest Time: {breakMinutes}:{breakSeconds.toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>

        {/* Challenge & Streak Boosters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Streak Card */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center gap-3 text-left">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Active Streak</span>
              <p className="text-sm font-black text-slate-900">{streak} Days in a Row 🔥</p>
            </div>
          </div>

          {/* Daily Challenge State */}
          <div className={`border p-3.5 rounded-2xl flex items-center gap-3 text-left ${
            resultData.challengeJustCompleted
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`p-2 rounded-xl shrink-0 ${
              resultData.challengeJustCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {resultData.challengeJustCompleted ? <CheckCircle className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                {resultData.challengeJustCompleted ? 'Challenge Completed!' : 'Daily Challenge'}
              </span>
              <p className="text-xs font-bold text-slate-900">
                {resultData.challengeJustCompleted ? '+250 XP Awarded' : 'Progress Updated'}
              </p>
            </div>
          </div>
        </div>

        {/* Newly Unlocked Achievements */}
        {newlyUnlocked.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-left space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
              <Award className="w-4 h-4 text-purple-600" />
              <span>New Achievement Unlocked!</span>
            </div>
            <div className="space-y-2">
              {newlyUnlocked.map((ach) => (
                <div key={ach.id || ach.type} className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-purple-200">
                  <span className="text-2xl">{ach.icon || '🏆'}</span>
                  <div>
                    <div className="text-xs font-black text-slate-900">{ach.title}</div>
                    <div className="text-[11px] text-slate-500">{ach.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="purple" size="md" onClick={onClose} className="w-full sm:w-auto">
            <span>Continue Conquest</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
