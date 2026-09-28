import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function BottomSheet({
  children,
  isOpen = true,
  className,
  variant = 'dark', // 'dark' | 'surface'
}) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'w-full rounded-t-3xl shadow-lg border-t transition-all duration-200 z-30 font-sans',
        variant === 'dark'
          ? 'bg-inverse text-text-inverse border-slate-800'
          : 'bg-surface text-text-primary border-border',
        className
      )}
    >
      {/* Visual Grab Handle */}
      <div className="w-full flex items-center justify-center pt-3 pb-1">
        <div className="w-12 h-1.5 rounded-full bg-slate-600/60" />
      </div>

      <div className="p-4 sm:p-6 pt-2">
        {children}
      </div>
    </div>
  );
}
