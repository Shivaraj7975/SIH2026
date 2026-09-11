import React from 'react';
import { MapPin } from 'lucide-react';
import Button from './Button';

export function EmptyState({
  title = 'No Activity Recorded',
  description = 'Start walking or running to conquer territory sectors and record your workouts.',
  icon: Icon = MapPin,
  actionLabel = null,
  onAction = null,
  height = 'min-h-[240px]',
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-3 p-8 rounded-2xl glass-panel text-slate-400 ${height} ${className}`}
    >
      <div className="p-3.5 bg-slate-800/80 text-cyan-400 rounded-2xl border border-slate-700 shadow-inner">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-black text-white">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
