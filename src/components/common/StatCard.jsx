import React from 'react';
import { Skeleton } from './Skeleton';

export const StatCard = ({
  title,
  value,
  subtitle,
  trend,
  trendType = 'positive', // 'positive' | 'negative' | 'neutral'
  icon: Icon,
  loading = false,
  className = '',
}) => {
  if (loading) {
    return (
      <div className={`p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  return (
    <div
      className={`p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Icon className="w-4 h-4 stroke-[1.75]" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          {value}
        </span>
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5 text-xs">
          {trend && (
            <span
              className={`font-medium ${
                trendType === 'positive'
                  ? 'text-emerald-600'
                  : trendType === 'negative'
                  ? 'text-rose-600'
                  : 'text-slate-600'
              }`}
            >
              {trend}
            </span>
          )}
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
