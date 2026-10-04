
import React from 'react';
import { AlertTriangle, Clock, ArrowRight, TrendingDown } from 'lucide-react';
import { Product } from '../../types';
import { getProductExpirySummary } from '../../utils/dateUtils';
import { useTranslation } from '../../i18n/translations';
import { useApp } from '../../context/AppContext';

interface ExpiryDashboardWidgetProps {
  products: Product[];
  language: 'bn' | 'en';
}

export const ExpiryDashboardWidget: React.FC<ExpiryDashboardWidgetProps> = ({ products, language }) => {
  const { t } = useTranslation(language);
  const { setActiveTab } = useApp();

  const expirySummary = products.reduce((acc, p) => {
    const summary = getProductExpirySummary(p, 30);
    // Only count if in stock
    if (p.stock > 0) {
        if (summary.hasExpired) acc.expired++;
        else if (summary.hasExpiringSoon) acc.expiringSoon++;
    }
    return acc;
  }, { expired: 0, expiringSoon: 0 });

  if (expirySummary.expired === 0 && expirySummary.expiringSoon === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-rose-100 dark:border-rose-900/30 overflow-hidden animate-in slide-in-from-top duration-700">
      <div className="bg-rose-50/50 dark:bg-rose-950/20 px-4 py-3 flex items-center justify-between border-b border-rose-100 dark:border-rose-900/30">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm uppercase tracking-tight">
          <AlertTriangle className="w-4 h-4" />
          <h3>{language === 'bn' ? 'স্টক মেয়াদোত্তীর্ণ সতর্কতা' : 'Stock Expiry Alerts'}</h3>
        </div>
        <button
          onClick={() => setActiveTab('reports')}
          className="text-[10px] font-black text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 transition-colors uppercase tracking-widest cursor-pointer"
        >
          {language === 'bn' ? 'বিস্তারিত রিপোর্ট' : 'Full Report'}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Expired'}</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{expirySummary.expired}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{language === 'bn' ? 'শীঘ্রই শেষ হবে' : 'Expiring Soon'}</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{expirySummary.expiringSoon}</span>
          </div>
        </div>

        <div className="h-10 w-[1px] bg-slate-100 dark:bg-slate-800" />

        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
           </div>
           <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                 {language === 'bn' ? 'অবিলম্বে ব্যবস্থা গ্রহণ প্রয়োজন' : 'Action Required Immediately'}
              </p>
              <button 
                onClick={() => setActiveTab('reports')}
                className="text-[11px] font-black text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                {language === 'bn' ? 'পণ্যসমূহ দেখুন' : 'View Affected Items'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
