import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Pill,
  Search,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Tag,
  Layers,
} from 'lucide-react';
import { canUserExportReportCsv, canUserPrintReportStatement } from '../../utils/permissions';

export const GenericReportView: React.FC = () => {
  const {
    products,
    saleInvoices,
    formatCurrency,
    openPrintModal,
    language,
    currentUser,
    companySettings,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [expandedGeneric, setExpandedGeneric] = useState<string | null>(null);

  // Group products by generic name
  const genericGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        genericName: string;
        products: typeof products;
        totalStock: number;
        totalCostValue: number;
        totalRetailValue: number;
        lowStockCount: number;
        outOfStockCount: number;
        soldQty: number;
        salesRevenue: number;
      }
    > = {};

    // First map all products
    products.forEach(p => {
      const gName = (p.generic && p.generic.trim()) || (language === 'bn' ? 'সাধারণ / অন্যান্য (Unassigned)' : 'Unassigned / General');
      if (!groups[gName]) {
        groups[gName] = {
          genericName: gName,
          products: [],
          totalStock: 0,
          totalCostValue: 0,
          totalRetailValue: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          soldQty: 0,
          salesRevenue: 0,
        };
      }

      const st = Number(p.stock || 0);
      const pp = Number(p.purchasePrice || 0);
      const sp = Number(p.salesPrice || 0);

      groups[gName].products.push(p);
      groups[gName].totalStock += st;
      groups[gName].totalCostValue += st * pp;
      groups[gName].totalRetailValue += st * sp;

      if (st <= 0) {
        groups[gName].outOfStockCount++;
      } else if (st <= (p.reorderLevel || 10)) {
        groups[gName].lowStockCount++;
      }
    });

    // Calculate sales data for each generic
    saleInvoices.forEach(inv => {
      inv.items.forEach(it => {
        const prod = products.find(p => p.id === it.productId);
        const gName = (prod?.generic && prod.generic.trim()) || (language === 'bn' ? 'সাধারণ / অন্যান্য (Unassigned)' : 'Unassigned / General');
        if (groups[gName]) {
          groups[gName].soldQty += Number(it.quantity || 0);
          groups[gName].salesRevenue += Number(it.total || 0);
        }
      });
    });

    return Object.values(groups).sort((a, b) => a.genericName.localeCompare(b.genericName));
  }, [products, saleInvoices, language]);

  // Filtered generics
  const filteredGenerics = useMemo(() => {
    return genericGroups.filter(g => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesGeneric = g.genericName.toLowerCase().includes(q);
        const matchesProducts = g.products.some(
          p =>
            p.name.toLowerCase().includes(q) ||
            (p.nameBn && p.nameBn.toLowerCase().includes(q)) ||
            (p.strength && p.strength.toLowerCase().includes(q)) ||
            (p.manufacturer && p.manufacturer.toLowerCase().includes(q))
        );
        if (!matchesGeneric && !matchesProducts) return false;
      }

      if (stockFilter === 'IN_STOCK' && g.totalStock <= 0) return false;
      if (stockFilter === 'LOW_STOCK' && g.lowStockCount === 0) return false;
      if (stockFilter === 'OUT_OF_STOCK' && g.outOfStockCount === 0) return false;

      return true;
    });
  }, [genericGroups, searchTerm, stockFilter]);

  // Aggregate Metrics
  const totalGenericsCount = genericGroups.length;
  const totalMedicineItems = products.length;
  const totalStockUnits = genericGroups.reduce((sum, g) => sum + g.totalStock, 0);
  const totalStockCostValue = genericGroups.reduce((sum, g) => sum + g.totalCostValue, 0);
  const totalSalesRevenueAll = genericGroups.reduce((sum, g) => sum + g.salesRevenue, 0);

  // CSV Export
  const handleExportCSV = () => {
    if (!canUserExportReportCsv(currentUser)) return;

    const headers = [
      'Generic Name',
      'Medicines Count',
      'Total In Stock',
      'Cost Value (BDT)',
      'Retail Value (BDT)',
      'Total Units Sold',
      'Total Revenue (BDT)',
      'Low Stock Items',
    ];

    const rows = filteredGenerics.map(g => [
      `"${g.genericName.replace(/"/g, '""')}"`,
      g.products.length,
      g.totalStock,
      g.totalCostValue.toFixed(2),
      g.totalRetailValue.toFixed(2),
      g.soldQty,
      g.salesRevenue.toFixed(2),
      g.lowStockCount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Generic_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!canUserPrintReportStatement(currentUser)) return;
    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'ফার্মেসী জেনেরিক রিপোর্ট' : 'Pharmacy Generic Summary Report',
      data: {
        generics: filteredGenerics,
        totalGenerics: totalGenericsCount,
        totalItems: totalMedicineItems,
        totalStockUnits,
        totalCostValue: totalStockCostValue,
        totalRevenue: totalSalesRevenueAll,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <Pill className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {language === 'bn' ? 'মোট জেনেরিক' : 'Total Generics'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {totalGenericsCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {totalMedicineItems} {language === 'bn' ? 'টি ঔষধ আইটেম অন্তর্ভুক্ত' : 'registered medicines'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Package className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {language === 'bn' ? 'বর্তমান মোট স্টক' : 'In Stock Units'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {totalStockUnits.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {language === 'bn' ? 'সকল জেনেরিকের মোট পিস/পাতা' : 'Units across all generics'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
            <DollarSign className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {language === 'bn' ? 'ক্রয়মূল্যে মোট স্টক' : 'Stock Cost Value'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(totalStockCostValue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {language === 'bn' ? 'মোট ইনভেন্টরি সম্পদ মান' : 'Total inventory asset cost'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {language === 'bn' ? 'মোট বিক্রি রেভিনিউ' : 'Sales Revenue'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(totalSalesRevenueAll)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {language === 'bn' ? 'ইনভয়েস ভিত্তিক বিক্রি' : 'Generated sales turnover'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {language === 'bn' ? 'স্টক সংকট অ্যালার্ট' : 'Low Stock Alert'}
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {genericGroups.filter(g => g.lowStockCount > 0 || g.outOfStockCount > 0).length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {language === 'bn' ? 'টি জেনেরিকে রি-অর্ডার দরকার' : 'generics need re-ordering'}
          </p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={
                language === 'bn'
                  ? 'জেনেরিক নাম অথবা ঔষধের নাম দিয়ে খুঁজুন (যেমন: Paracetamol, Napa)...'
                  : 'Search by generic or medicine brand name...'
              }
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">{language === 'bn' ? 'সকল স্টক অবস্থা' : 'All Stock Status'}</option>
              <option value="IN_STOCK">{language === 'bn' ? 'স্টকে আছে (>0)' : 'In Stock Only'}</option>
              <option value="LOW_STOCK">{language === 'bn' ? 'কম স্টক অ্যালার্ট' : 'Low Stock Only'}</option>
              <option value="OUT_OF_STOCK">{language === 'bn' ? 'স্টক শেষ (০ পিস)' : 'Out of Stock'}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {canUserExportReportCsv(currentUser) && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'CSV এক্সপোর্ট' : 'Export CSV'}</span>
            </button>
          )}
          {canUserPrintReportStatement(currentUser) && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">{language === 'bn' ? 'জেনেরিক নাম (Generic Name)' : 'Generic Name'}</th>
                <th className="py-3 px-4 text-center">{language === 'bn' ? 'ঔষধের সংখ্যা' : 'Medicines'}</th>
                <th className="py-3 px-4 text-right">{language === 'bn' ? 'মোট মজুদ (Stock)' : 'Total Stock'}</th>
                <th className="py-3 px-4 text-right">{language === 'bn' ? 'মোট ক্রয়মূল্য' : 'Cost Value'}</th>
                <th className="py-3 px-4 text-right">{language === 'bn' ? 'মোট বিক্রয়মূল্য' : 'Retail Value'}</th>
                <th className="py-3 px-4 text-right">{language === 'bn' ? 'মোট বিক্রয় (Sold)' : 'Units Sold'}</th>
                <th className="py-3 px-4 text-right">{language === 'bn' ? 'বিক্রয় আয় (Revenue)' : 'Sales Revenue'}</th>
                <th className="py-3 px-4 text-center">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="py-3 px-4 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredGenerics.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    {language === 'bn'
                      ? 'কোনো জেনেরিক বা ঔষধ পাওয়া যায়নি।'
                      : 'No generic medicines found matching current filters.'}
                  </td>
                </tr>
              ) : (
                filteredGenerics.map(g => {
                  const isExpanded = expandedGeneric === g.genericName;
                  const hasStockWarning = g.lowStockCount > 0 || g.outOfStockCount > 0;

                  return (
                    <React.Fragment key={g.genericName}>
                      <tr
                        className={`hover:bg-emerald-50/30 dark:hover:bg-slate-800/40 transition-colors ${
                          isExpanded ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                              <Pill className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                                {g.genericName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {g.products.map(p => p.name).slice(0, 3).join(', ')}
                                {g.products.length > 3 ? ` +${g.products.length - 3} more` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold">
                            {g.products.length}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                          {g.totalStock.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-600 dark:text-slate-300">
                          {formatCurrency(g.totalCostValue)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(g.totalRetailValue)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-medium text-purple-700 dark:text-purple-300">
                          {g.soldQty.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(g.salesRevenue)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {g.outOfStockCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                              {language === 'bn' ? 'স্টক শেষ' : 'Out of Stock'}
                            </span>
                          ) : g.lowStockCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                              {language === 'bn' ? 'স্বল্প স্টক' : 'Low Stock'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                              {language === 'bn' ? 'পর্যাপ্ত' : 'In Stock'}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedGeneric(isExpanded ? null : g.genericName)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? (language === 'bn' ? 'লুকান' : 'Hide') : (language === 'bn' ? 'ঔষধ দেখুন' : 'Medicines')}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded View for Individual Medicines */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-850/60 border-y border-slate-200 dark:border-slate-800">
                          <td colSpan={9} className="p-4">
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-inner">
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                                <span>
                                  "{g.genericName}" {language === 'bn' ? 'জেনেরিকের অন্তর্ভুক্ত ঔষধসমূহ:' : 'Registered Medicines List:'}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                                    <tr>
                                      <th className="py-2 px-3">Medicine / Brand Name</th>
                                      <th className="py-2 px-3">Strength</th>
                                      <th className="py-2 px-3">Dosage Form</th>
                                      <th className="py-2 px-3">Manufacturer</th>
                                      <th className="py-2 px-3">Rack</th>
                                      <th className="py-2 px-3 text-right">Stock</th>
                                      <th className="py-2 px-3 text-right">Buy Price</th>
                                      <th className="py-2 px-3 text-right">Sell Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {g.products.map(p => (
                                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                                          {p.name}
                                          {p.nameBn && <span className="text-[11px] text-slate-400 font-normal ml-1.5">({p.nameBn})</span>}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                          {p.strength || '—'}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                          {p.dosageForm || '—'}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                          {p.manufacturer || '—'}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-slate-500">
                                          {p.rackLocation || '—'}
                                        </td>
                                        <td className={`py-2 px-3 text-right font-mono font-bold ${
                                          p.stock <= 0 ? 'text-rose-600' : p.stock <= (p.reorderLevel || 10) ? 'text-amber-600' : 'text-slate-900 dark:text-white'
                                        }`}>
                                          {p.stock} {p.unit}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                          {formatCurrency(p.purchasePrice)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                                          {formatCurrency(p.salesPrice)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
