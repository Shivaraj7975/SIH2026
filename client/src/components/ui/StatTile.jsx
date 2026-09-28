import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  delta,
  deltaType = 'positive', // 'positive' | 'negative' | 'neutral'
  size = 'md', // 'hero' (72px) | 'lg' (32px) | 'md' (24px) | 'sm' (20px)
  variant = 'surface', // 'surface' | 'dark' | 'glass'
  className,
  valueClassName,
}) {
  const sizeStyles = {
    hero: 'text-[56px] sm:text-[72px] font-display font-bold leading-none tracking-[-0.02em]',
    lg: 'text-2xl sm:text-3xl font-display font-bold leading-tight',
    md: 'text-xl sm:text-2xl font-display font-bold leading-tight',
    sm: 'text-lg font-display font-bold leading-tight',
  };

  const variantStyles = {
    surface: 'bg-surface border border-border text-text-primary',
    dark: 'bg-inverse border border-slate-800 text-text-inverse',
    glass: 'glass-map-panel text-text-primary',
    subtle: 'bg-canvas border border-border text-text-primary',
  };

  return (
    <div className={cn('p-4 rounded-2xl transition-all', variantStyles[variant], className)}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-secondary flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-brand" />}
          {label}
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border',
              deltaType === 'positive'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : deltaType === 'negative'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            )}
          >
            {delta}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={cn('tabular-nums font-bold', sizeStyles[size], valueClassName)}
          aria-live="polite"
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-text-secondary">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
