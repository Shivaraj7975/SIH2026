import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Button = forwardRef(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    type = 'button',
    icon: Icon = null,
    iconPosition = 'left',
    ...props
  },
  ref
) {
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wide transition-colors duration-100 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none rounded-xl cursor-pointer';

  const variantStyles = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm border border-purple-600',
    purple: 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm border border-purple-600',
    darkblue: 'bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#0F172A] shadow-sm',
    black: 'bg-black hover:bg-neutral-800 text-white border border-black shadow-sm',
    secondary: 'bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#0F172A] shadow-sm',
    track: 'bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#0F172A] shadow-sm',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-sm',
    outline: 'bg-white hover:bg-slate-50 text-slate-800 hover:text-purple-600 border border-slate-300 shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900',
    glow: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
    icon: 'p-2.5 w-10 h-10',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 flex-shrink-0" />}
        </>
      )}
    </button>
  );
});

export default Button;
