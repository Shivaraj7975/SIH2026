import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Avatar({
  avatar = '⚡',
  color = '#00f2fe',
  size = 'md',
  level = null,
  showGlow = false,
  className,
}) {
  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-2xl',
    xl: 'w-20 h-20 text-4xl',
  };

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <div
        className={cn(
          'rounded-2xl flex items-center justify-center bg-slate-900 border-2 font-bold shadow-lg transition-transform',
          sizeStyles[size],
          showGlow && 'shadow-[0_0_15px_rgba(0,242,254,0.4)]',
          className
        )}
        style={{ borderColor: color }}
      >
        <span>{avatar}</span>
      </div>

      {level !== null && (
        <span className="absolute -bottom-1 -right-1 bg-cyan-950 border border-cyan-500 text-cyan-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shadow-md">
          {level}
        </span>
      )}
    </div>
  );
}

export default Avatar;
