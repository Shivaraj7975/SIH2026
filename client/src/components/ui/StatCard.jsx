import React from 'react';
import { Card } from './Card';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function StatCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  color = 'cyan',
  subtitle,
  className,
}) {
  const colorMap = {
    purple: {
      text: 'text-purple-700',
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-purple-50 text-purple-700 border border-purple-200',
    },
    darkblue: {
      text: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
    },
    volt: {
      text: 'text-purple-700',
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-purple-50 text-purple-700 border border-purple-200',
    },
    track: {
      text: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-900 border border-slate-200',
    },
    cyan: {
      text: 'text-purple-700',
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-purple-50 text-purple-700 border border-purple-200',
    },
    emerald: {
      text: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    amber: {
      text: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
    },
    rose: {
      text: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-rose-50 text-rose-700 border border-rose-200',
    },
  };

  const scheme = colorMap[color] || colorMap.purple;

  return (
    <Card variant="glass" className={cn('p-4 sm:p-5 relative overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-2xl sm:text-3xl font-black font-mono tracking-tight', scheme.text)}>
              {value}
            </span>
            {unit && <span className="text-xs font-sans text-slate-400 font-medium">{unit}</span>}
          </div>
          {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        </div>

        {Icon && (
          <div className={cn('p-2.5 rounded-xl border border-white/5 shadow-inner', scheme.iconBg)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">{trend.label}</span>
          <span className={cn('font-mono font-bold', trend.positive ? 'text-emerald-400' : 'text-slate-300')}>
            {trend.value}
          </span>
        </div>
      )}
    </Card>
  );
}

export default StatCard;
