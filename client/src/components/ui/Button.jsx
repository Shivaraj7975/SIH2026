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
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-tight transition-all duration-120 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2';

  const variantStyles = {
    primary: 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-sm border border-[#7C3AED] active:scale-[0.98]',
    purple: 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-sm border border-[#7C3AED] active:scale-[0.98]',
    secondary: 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 shadow-xs active:scale-[0.98]',
    dark: 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 shadow-sm active:scale-[0.98]',
    lime: 'bg-[#A3E635] hover:bg-[#8ee01e] text-slate-950 font-black shadow-md border border-[#A3E635] active:scale-[0.98]',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-sm active:scale-[0.98]',
    outline: 'bg-white hover:bg-slate-50 text-slate-900 hover:text-[#7C3AED] border border-slate-300 shadow-xs',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900',
    soft: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold',
    runFab: 'w-[72px] h-[72px] rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xl shadow-purple-600/30 border-2 border-white flex items-center justify-center active:scale-95',
  };

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 min-h-[38px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[42px] gap-2',
    lg: 'text-base px-6 py-3.5 min-h-[48px] gap-2.5',
    xl: 'text-lg px-8 py-4 min-h-[56px] gap-3 font-black',
    icon: 'p-2.5 w-10 h-10 min-h-[40px]',
    fab: 'p-0',
  };

  const isFab = variant === 'runFab';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variantStyles[variant] || variantStyles.primary, !isFab && sizeStyles[size], className)}
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
