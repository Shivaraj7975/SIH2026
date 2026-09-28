import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Card = forwardRef(function Card(
  {
    children,
    className,
    variant = 'surface',
    hover = false,
    ...props
  },
  ref
) {
  const baseStyles = 'rounded-2xl transition-all duration-120';

  const variantStyles = {
    surface: 'bg-surface border border-border shadow-sm text-text-primary',
    elevated: 'bg-surface border border-border shadow-md text-text-primary',
    glass: 'bg-white/85 backdrop-blur-md border border-white/60 shadow-lg text-text-primary',
    glassMap: 'bg-white/85 backdrop-blur-md border border-white/60 shadow-lg text-text-primary',
    dark: 'bg-inverse border border-slate-800 shadow-lg text-text-inverse',
    brand: 'bg-brand-soft border border-purple-200 text-brand',
    subtle: 'bg-canvas border border-border text-text-primary',
  };

  const hoverStyles = hover ? 'hover:border-brand/40 hover:shadow-md cursor-pointer' : '';

  return (
    <div ref={ref} className={cn(baseStyles, variantStyles[variant] || variantStyles.surface, hoverStyles, className)} {...props}>
      {children}
    </div>
  );
});

export const CardHeader = ({ children, className, ...props }) => (
  <div className={cn('p-5 pb-3 border-b border-border flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }) => (
  <h3 className={cn('text-base font-display font-bold tracking-tight text-text-primary flex items-center gap-2', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className, ...props }) => (
  <p className={cn('text-xs text-text-secondary mt-0.5', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className, ...props }) => (
  <div className={cn('p-5', className)} {...props}>
    {children}
  </div>
);

export default Card;
