import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function ProgressBar({
  value = 0,
  max = 100,
  variant = 'cyan',
  size = 'md',
  showLabel = false,
  className,
}) {
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const variantStyles = {
    purple: 'bg-purple-600',
    darkblue: 'bg-slate-900',
    cyan: 'bg-purple-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-600',
    rose: 'bg-rose-600',
  };

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-500">Progress</span>
          <span className="text-purple-600 font-bold">{percent}%</span>
        </div>
      )}
      <div className={cn('w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200', sizeStyles[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', variantStyles[variant])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
