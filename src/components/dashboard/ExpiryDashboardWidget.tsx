
import React from 'react';
import { AlertTriangle, Clock, RotateCcw } from 'lucide-react';
import { Product } from '../../types';
import { getProductExpirySummary } from '../../utils/dateUtils';
import { useTranslation } from '../../i18n/translations';

interface ExpiryDashboardWidgetProps {
  products: Product[];
  language: 'bn' | 'en';
}

export const ExpiryDashboardWidget: React.FC<ExpiryDashboardWidgetProps> = ({ products, language }) => {
  const { t } = useTranslation(language);

  const expirySummary = products.reduce((acc, p) => {
    const summary = getProductExpirySummary(p, 30);
    if (summary.hasExpired && p.stock > 0) acc.expired++;
    else if (summary.hasExpiringSoon && p.stock > 0) acc.expiringSoon++;
    return acc;
  }, { expired: 0, expiringSoon: 0 });

  if (expirySummary.expired === 0 && expirySummary.expiringSoon === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
        <AlertTriangle className="w-5 h-5" />
        <h3>{language === 'bn' ? 'মেয়াদোত্তীর্ণ সতর্কতা' : 'Expiry Alert'}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-rose-50 dark:bg-rose-950/50 p-3 rounded-lg border border-rose-100 dark:border-rose-900">
          <div className="text-2xl font-black text-rose-700 dark:text-rose-300">{expirySummary.expired}</div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{language === 'bn' ? 'মেয়াদ শেষ' : 'Expired'}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-100 dark:border-amber-900">
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{expirySummary.expiringSoon}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">{language === 'bn' ? 'শীঘ্রই মেয়াদ শেষ হবে' : 'Expiring Soon'}</div>
        </div>
      </div>
    </div>
  );
};
