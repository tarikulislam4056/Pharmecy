
import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { getProductExpirySummary } from '../../utils/dateUtils';
import { AlertCircle, Package, Clock } from 'lucide-react';

export const ExpiryReportView: React.FC = () => {
  const { products, language, formatCurrency } = useApp();
  const { t } = useTranslation(language);

  const expiryReportItems = useMemo(() => {
    return products
      .filter(p => p.stock > 0)
      .map(p => ({ p, summary: getProductExpirySummary(p, 30) }))
      .filter(item => item.summary.hasAnyExpiry)
      .sort((a, b) => (a.summary.minDaysRemaining || 0) - (b.summary.minDaysRemaining || 0));
  }, [products]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-slate-800 dark:text-white">
        {language === 'bn' ? 'মেয়াদোত্তীর্ণ পণ্যের তালিকা' : 'Expiry Tracking Report'}
      </h2>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-3 px-4">{language === 'bn' ? 'পণ্য' : 'Product'}</th>
              <th className="py-3 px-4">{language === 'bn' ? 'অবস্থা' : 'Status'}</th>
              <th className="py-3 px-4">{language === 'bn' ? 'মেয়াদ শেষ হবে' : 'Expiry Date'}</th>
              <th className="py-3 px-4">{language === 'bn' ? 'বাকি দিন' : 'Days Remaining'}</th>
              <th className="py-3 px-4">{language === 'bn' ? 'স্টক' : 'Stock'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {expiryReportItems.map(({ p, summary }) => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-bold">{p.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    summary.displayStatus === 'EXPIRED' ? 'bg-rose-100 text-rose-700' : 
                    summary.displayStatus === 'EXPIRING_SOON' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {summary.displayStatus}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono">{summary.earliestExpDate || '—'}</td>
                <td className="py-3 px-4 font-mono text-center">
                  {summary.minDaysRemaining !== null ? summary.minDaysRemaining : '—'}
                </td>
                <td className="py-3 px-4 font-mono font-bold">{Number(p.stock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
