
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { getProductExpirySummary, normalizeDateToISO } from '../../utils/dateUtils';
import { 
  AlertTriangle, 
  Package, 
  Clock, 
  Filter, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  Download,
  AlertCircle,
  Calendar,
  Boxes,
  ArrowRight,
  Info
} from 'lucide-react';

export const ExpiryReportView: React.FC = () => {
  const { products, categories, language, formatCurrency, openPrintModal } = useApp();
  const { t } = useTranslation(language);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EXPIRED' | 'EXPIRING_SOON'>('ALL');
  const [withinDays, setWithinDays] = useState(30);

  const expiryReportItems = useMemo(() => {
    return products
      .map(p => ({ 
        p, 
        summary: getProductExpirySummary(p, withinDays) 
      }))
      .filter(item => {
        // Must have some expiry info
        if (!item.summary.hasAnyExpiry) return false;
        
        // Stock filter (usually only care about items in stock, but maybe user wants all)
        // Let's show all but highlight if stock > 0
        
        // Search filter
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const match = 
            item.p.name.toLowerCase().includes(q) || 
            (item.p.nameBn && item.p.nameBn.toLowerCase().includes(q)) ||
            (item.p.sku && item.p.sku.toLowerCase().includes(q)) ||
            (item.p.barcode && item.p.barcode.toLowerCase().includes(q));
          if (!match) return false;
        }

        // Category filter
        if (selectedCategory !== 'ALL' && item.p.categoryId !== selectedCategory) return false;

        // Status filter
        if (statusFilter === 'EXPIRED' && !item.summary.hasExpired) return false;
        if (statusFilter === 'EXPIRING_SOON' && !item.summary.hasExpiringSoon) return false;

        return true;
      })
      .sort((a, b) => {
        const daysA = a.summary.minDaysRemaining ?? 9999;
        const daysB = b.summary.minDaysRemaining ?? 9999;
        return daysA - daysB;
      });
  }, [products, searchTerm, selectedCategory, statusFilter, withinDays]);

  const stats = useMemo(() => {
    return expiryReportItems.reduce((acc, item) => {
      if (item.summary.hasExpired && item.p.stock > 0) acc.expired++;
      else if (item.summary.hasExpiringSoon && item.p.stock > 0) acc.soon++;
      acc.totalStockValue += (Number(item.p.stock) * Number(item.p.purchasePrice));
      return acc;
    }, { expired: 0, soon: 0, totalStockValue: 0 });
  }, [expiryReportItems]);

  const handleExportCSV = () => {
    const headers = ['Product', 'SKU', 'Category', 'Status', 'Expiry Date', 'Days Left', 'Current Stock', 'Stock Value'];
    const rows = expiryReportItems.map(({ p, summary }) => [
      p.name,
      p.sku || '',
      p.categoryName || '',
      summary.displayStatus,
      summary.earliestExpDate || '',
      summary.minDaysRemaining ?? '',
      p.stock,
      (p.stock * p.purchasePrice).toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Expiry_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-rose-600" />
            {language === 'bn' ? 'মাস্টার মেয়াদোত্তীর্ণ ট্র্যাকিং রিপোর্ট' : 'Master Expiry Tracking Report'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {language === 'bn' ? 'আপনার স্টকের মেয়াদোত্তীর্ণ এবং শীঘ্রই মেয়াদ শেষ হবে এমন পণ্যগুলি পরিচালনা করুন।' : 'Monitor and manage expired or soon-to-expire stock across your entire inventory.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {language === 'bn' ? 'এক্সপোর্ট CSV' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50 dark:bg-rose-950/30 p-5 rounded-2xl border border-rose-100 dark:border-rose-900 shadow-sm relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className="w-24 h-24 text-rose-600" />
          </div>
          <div className="relative z-10">
            <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">{language === 'bn' ? 'বর্তমানে মেয়াদোত্তীর্ণ' : 'Currently Expired'}</span>
            <div className="text-3xl font-black text-rose-700 dark:text-rose-300 mt-1">{stats.expired} <span className="text-sm font-bold text-rose-500">{language === 'bn' ? 'টি পণ্য' : 'Items'}</span></div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-100 dark:border-amber-900 shadow-sm relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-24 h-24 text-amber-600" />
          </div>
          <div className="relative z-10">
            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">{language === 'bn' ? 'শীঘ্রই শেষ হবে (৩০ দিন)' : 'Expiring Soon (30 Days)'}</span>
            <div className="text-3xl font-black text-amber-700 dark:text-amber-300 mt-1">{stats.soon} <span className="text-sm font-bold text-amber-500">{language === 'bn' ? 'টি পণ্য' : 'Items'}</span></div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:opacity-20 transition-opacity">
            <Boxes className="w-24 h-24 text-slate-600" />
          </div>
          <div className="relative z-10">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{language === 'bn' ? 'ঝুঁকিপূর্ণ স্টকের মূল্য' : 'Risk Stock Value'}</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{formatCurrency(stats.totalStockValue)}</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'bn' ? 'পণ্য, SKU বা বারকোড খুঁজুন...' : 'Search product, SKU, barcode...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-rose-500 transition-all"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-rose-500"
        >
          <option value="ALL">{language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-rose-500"
        >
          <option value="ALL">{language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
          <option value="EXPIRED" className="text-rose-600">❌ {language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Expired'}</option>
          <option value="EXPIRING_SOON" className="text-amber-600">⚠️ {language === 'bn' ? 'শীঘ্রই শেষ হবে' : 'Expiring Soon'}</option>
        </select>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border-none">
          <span className="text-[10px] font-black text-slate-400 uppercase">{language === 'bn' ? 'সীমা:' : 'Limit:'}</span>
          <select
            value={withinDays}
            onChange={(e) => setWithinDays(Number(e.target.value))}
            className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-0"
          >
            <option value={15}>15 {language === 'bn' ? 'দিন' : 'Days'}</option>
            <option value={30}>30 {language === 'bn' ? 'দিন' : 'Days'}</option>
            <option value={60}>60 {language === 'bn' ? 'দিন' : 'Days'}</option>
            <option value={90}>90 {language === 'bn' ? 'দিন' : 'Days'}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-4 px-6">{language === 'bn' ? 'পণ্যের বিবরণ' : 'Product Details'}</th>
                <th className="py-4 px-4">{language === 'bn' ? 'অবস্থা' : 'Status'}</th>
                <th className="py-4 px-4">{language === 'bn' ? 'মেয়াদ তারিখ' : 'Expiry Date'}</th>
                <th className="py-4 px-4 text-center">{language === 'bn' ? 'বাকি দিন' : 'Days Left'}</th>
                <th className="py-4 px-4 text-right">{language === 'bn' ? 'মজুদ (Stock)' : 'Stock'}</th>
                <th className="py-4 px-4 text-right">{language === 'bn' ? 'মজুদ মূল্য' : 'Stock Value'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expiryReportItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Package className="w-12 h-12" />
                      <p className="text-lg font-bold">
                        {language === 'bn' ? 'কোনো মেয়াদোত্তীর্ণ পণ্য পাওয়া যায়নি' : 'No expiry items found'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                expiryReportItems.map(({ p, summary }) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku || 'N/A'} | {p.categoryName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm ${
                        summary.displayStatus === 'EXPIRED' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 
                        summary.displayStatus === 'EXPIRING_SOON' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                        'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {summary.displayStatus === 'EXPIRED' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {summary.displayStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {summary.earliestExpDate || '—'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`font-mono font-black text-sm ${
                        (summary.minDaysRemaining ?? 99) <= 0 ? 'text-rose-600' : 
                        (summary.minDaysRemaining ?? 99) <= 15 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {summary.minDaysRemaining !== null ? summary.minDaysRemaining : '—'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold ${Number(p.stock) > 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {Number(p.stock)} {p.unit}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(Number(p.stock) * Number(p.purchasePrice))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold italic px-2">
        <Info className="w-3 h-3" />
        <span>* {language === 'bn' ? 'মেয়াদোত্তীর্ণ পণ্য বিক্রয় থেকে স্বয়ংক্রিয়ভাবে ব্লক করা হবে।' : 'Expired items will be automatically blocked from sales.'}</span>
      </div>
    </div>
  );
};
