import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Chip({
  children,
  variant = 'brand', // 'brand' | 'lime' | 'amber' | 'danger' | 'success' | 'neutral' | 'dark'
  size = 'md', // 'sm' | 'md'
  icon: Icon,
  pulse = false,
  className,
  ...props
}) {
  const variantStyles = {
    brand: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    lime: 'bg-[#A3E635] text-slate-950 border-[#8ee01e] font-black',
    limeDark: 'bg-slate-800 text-[#A3E635] border-lime-500/40 font-black',
    amber: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    danger: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    success: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    neutral: 'bg-slate-100 text-slate-700 border-slate-300 font-bold',
    dark: 'bg-slate-900 text-white border-slate-700 font-bold',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono rounded-full border shadow-2xs transition-colors',
        variantStyles[variant] || variantStyles.brand,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
}
