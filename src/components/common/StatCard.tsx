import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'danger' | 'success';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  onClick,
}) => {
  if (variant === 'primary') {
    return (
      <div
        onClick={onClick}
        className={`bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 rounded-xl shadow-xs transition-all ${
          onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <p className="text-xs text-blue-100 font-bold uppercase tracking-wider mb-1">
            {title}
          </p>
          {Icon && <Icon className="w-4 h-4 text-blue-200 opacity-80" />}
        </div>
        <h3 className="text-2xl font-bold text-white font-mono tracking-tight my-1">
          {value}
        </h3>
        {subtitle && (
          <p className="text-xs text-blue-200 font-medium mt-2 truncate">
            {subtitle}
          </p>
        )}
      </div>
    );
  }

  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">
          {title}
        </p>
        {Icon && (
          <div className="p-1 rounded-md text-slate-400 dark:text-slate-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <h3
        className={`text-2xl font-bold font-mono tracking-tight my-1 ${
          isDanger
            ? 'text-red-600 dark:text-red-400'
            : isSuccess
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </h3>

      <div className="flex items-center justify-between mt-2 text-xs">
        {subtitle && (
          <span
            className={`font-medium truncate ${
              isDanger
                ? 'text-slate-400'
                : isSuccess
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {subtitle}
          </span>
        )}
        {trend && (
          <span
            className={`font-semibold shrink-0 ml-auto ${
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
