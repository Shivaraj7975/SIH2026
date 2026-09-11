import React from 'react';
import { Target, CheckCircle2, Clock, Award, Shield, MapPin, Activity } from 'lucide-react';
import Card, { CardContent } from './Card.jsx';
import ProgressBar from './ProgressBar.jsx';

export function ChallengeCard({
  challenge,
  progress = 0,
  isCompleted = false,
  className,
}) {
  const target = challenge?.target || 3500;
  const current = typeof progress === 'object' ? (progress.rawProgress ?? progress.progress ?? 0) : progress;
  const percent = Math.min(100, Math.round((current / target) * 100));

  const type = challenge?.challengeType || challenge?.challenge_type || 'DISTANCE';

  let targetDisplay = `${(target / 1000).toFixed(1)} km`;
  let currentDisplay = `${(current / 1000).toFixed(2)} km`;
  let TypeIcon = Target;

  switch (type) {
    case 'DISTANCE':
      targetDisplay = `${(target / 1000).toFixed(1)} km`;
      currentDisplay = `${(current / 1000).toFixed(2)} km`;
      TypeIcon = MapPin;
      break;
    case 'AREA':
      targetDisplay = `${(target / 1000000).toFixed(2)} km²`;
      currentDisplay = `${(current / 1000000).toFixed(3)} km²`;
      TypeIcon = Shield;
      break;
    case 'UNIQUE_CELLS':
      targetDisplay = `${Math.round(target)} hexes`;
      currentDisplay = `${Math.round(current)} hexes`;
      TypeIcon = Shield;
      break;
    case 'ACTIVE_DURATION':
      targetDisplay = `${Math.round(target / 60)} mins`;
      currentDisplay = `${Math.round(current / 60)} mins`;
      TypeIcon = Activity;
      break;
  }

  return (
    <Card variant="glass" className={`border-slate-200 bg-white shadow-sm ${className || ''}`}>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl border border-purple-200">
              <span className="text-2xl">{challenge?.configuration?.badge || '🎯'}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 uppercase">
                  {type.replace('_', ' ')} OBJECTIVE
                </span>
                {challenge?.isFinalized && (
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    FINALIZED
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-slate-900 mt-1">
                {challenge?.configuration?.title || 'Hex Grid Vanguard'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 text-xs font-mono font-bold">
            <Award className="w-4 h-4 text-purple-600" />
            <span>+{challenge?.configuration?.xpBonus || 250} XP</span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {challenge?.configuration?.description || 'Run or walk today to complete the universal community challenge.'}
        </p>

        <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <TypeIcon className="w-3.5 h-3.5 text-purple-600" />
              <span>Challenge Target:</span>
            </span>
            <span className="font-mono font-bold text-slate-900">
              {currentDisplay} / {targetDisplay}
            </span>
          </div>
          <ProgressBar value={percent} variant={isCompleted ? 'emerald' : 'purple'} />
          <div className="flex justify-between items-center pt-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Universal 24-Hour Window</span>
            </span>
            <span className="font-mono font-bold text-purple-600">{percent}%</span>
          </div>
        </div>

        {isCompleted && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Challenge Completed! +{challenge?.configuration?.xpBonus || 250} XP reward claimed.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ChallengeCard;
