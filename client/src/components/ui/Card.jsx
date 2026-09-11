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
    variant = 'glass',
    glowColor = 'cyan',
    hover = false,
    ...props
  },
  ref
) {
  const baseStyles = 'rounded-2xl transition-colors duration-100';

  const variantStyles = {
    glass: 'bg-white border border-slate-200 shadow-sm text-slate-900',
    glow: 'bg-white border border-purple-200 shadow-md text-slate-900',
    solid: 'bg-white border border-slate-200 shadow-sm text-slate-900',
    subtle: 'bg-slate-50/80 border border-slate-200 text-slate-900',
  };

  const hoverStyles = hover ? 'hover:border-purple-300 hover:shadow-md' : '';

  return (
    <div ref={ref} className={cn(baseStyles, variantStyles[variant], hoverStyles, className)} {...props}>
      {children}
    </div>
  );
});

export const CardHeader = ({ children, className, ...props }) => (
  <div className={cn('p-5 pb-3 border-b border-slate-100 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }) => (
  <h3 className={cn('text-base font-bold tracking-tight text-slate-900 flex items-center gap-2', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className, ...props }) => (
  <p className={cn('text-xs text-slate-500 mt-0.5', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className, ...props }) => (
  <div className={cn('p-5', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }) => (
  <div className={cn('p-5 pt-3 border-t border-slate-100 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export default Card;
