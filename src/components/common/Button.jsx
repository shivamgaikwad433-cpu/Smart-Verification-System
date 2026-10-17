import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  type = 'button',
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-lg';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 shadow-sm border border-slate-900',
    secondary:
      'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs',
    subtle:
      'bg-slate-100 text-slate-800 hover:bg-slate-200/80 border border-transparent',
    ghost:
      'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm border border-rose-600',
    emerald:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border border-emerald-600',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0 text-current" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};
