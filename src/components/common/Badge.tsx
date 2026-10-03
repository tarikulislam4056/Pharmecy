import React from 'react';

interface BadgeProps {
  status: string;
  variant?: 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'slate' | 'auto';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, variant = 'auto', className = '' }) => {
  let colorStyle = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  if (variant === 'auto') {
    const s = status.toUpperCase();
    if (['PAID', 'ACTIVE', 'COMPLETED', 'IN'].includes(s)) {
      colorStyle = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
    } else if (['SALE', 'CASH_ADD', 'PAYMENT_IN', 'SALE_RETURN'].includes(s)) {
      colorStyle = 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
    } else if (['DUE', 'DEFAULTED', 'OUT', 'OVERDUE', 'RESIGNED'].includes(s)) {
      colorStyle = 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300';
    } else if (['PARTIAL', 'PENDING', 'ON_LEAVE'].includes(s)) {
      colorStyle = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
    } else if (['PURCHASE', 'EXPENSE', 'SALARY', 'ADVANCE_SALARY', 'PAYMENT_OUT'].includes(s)) {
      colorStyle = 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
    }
  } else if (variant === 'emerald') {
    colorStyle = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
  } else if (variant === 'blue') {
    colorStyle = 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
  } else if (variant === 'rose') {
    colorStyle = 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300';
  } else if (variant === 'amber') {
    colorStyle = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
  } else if (variant === 'purple') {
    colorStyle = 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
  }

  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase whitespace-nowrap shrink-0 inline-flex items-center font-mono ${colorStyle} ${className}`}
    >
      {status}
    </span>
  );
};
