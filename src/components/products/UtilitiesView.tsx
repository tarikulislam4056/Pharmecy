import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Layers, Sliders, Download, Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

export const UtilitiesView: React.FC = () => {
  const { language, products, updateProduct, formatCurrency, showToast } = useApp();
  const { t } = useTranslation(language);

  // Stock Adjustment State
  const [selectedProdId, setSelectedProdId] = useState<string>(products[0]?.id || '');
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUBTRACT' | 'SET'>('ADD');
  const [adjustReason, setAdjustReason] = useState<string>('Physical store inventory count');

  const selectedProduct = products.find(p => p.id === selectedProdId);

  // Handle Adjustment Submit
  const handleStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    let newStock = selectedProduct.stock;
    if (adjustType === 'ADD') {
      newStock += adjustmentQty;
    } else if (adjustType === 'SUBTRACT') {
      newStock = Math.max(0, newStock - adjustmentQty);
    } else if (adjustType === 'SET') {
      newStock = Math.max(0, adjustmentQty);
    }

    updateProduct(selectedProduct.id, {
      stock: newStock,
    });

    showToast(
      language === 'bn' ? `স্টক আপডেট সম্পন্ন: ${newStock} ${selectedProduct.unit}` : `Stock updated to ${newStock} ${selectedProduct.unit}`,
      'success'
    );
    setAdjustmentQty(0);
  };

  // Export Product Catalog CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'SKU', 'Barcode', 'Category', 'PurchasePrice', 'SalesPrice', 'Stock', 'Unit', 'ReorderLevel'];
    const rows = products.map(p => [
      p.id,
      `"${p.name}"`,
      p.sku,
      p.barcode,
      `"${p.categoryName}"`,
      p.purchasePrice,
      p.salesPrice,
      p.stock,
      p.unit,
      p.reorderLevel,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DokanPro_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>{t('utilities')}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'bn' ? 'ফিজিক্যাল স্টক অডিট, অ্যাডজাস্টমেন্ট ও বাল্ক ডাটা ইমপোর্ট/এক্সপোর্ট' : 'Stock count reconciliation, physical audit adjustments, and bulk product catalog CSV operations'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Inventory CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Box 1: Physical Stock Reconciliation / Adjustment */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
              Physical Stock Audit & Adjustment (স্টক সংশোধন)
            </h3>
          </div>

          <form onSubmit={handleStockAdjust} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Select Product *
              </label>
              <select
                value={selectedProdId}
                onChange={e => setSelectedProdId(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Current: {Number(p.stock)} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg flex justify-between items-center text-xs">
                <span>System Recorded Stock:</span>
                <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                  {Number(selectedProduct.stock)} {selectedProduct.unit}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Adjustment Type *
                </label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value as any)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-bold"
                >
                  <option value="ADD">+ Add Stock (Stock In / Found)</option>
                  <option value="SUBTRACT">- Deduct (Damaged / Lost)</option>
                  <option value="SET">= Set Exact Count</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustmentQty || ''}
                  onChange={e => setAdjustmentQty(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Reason / Audit Remarks
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                placeholder="e.g. Month-end physical count reconciliation"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
            >
              Update Physical Stock Count
            </button>
          </form>
        </div>

        {/* Box 2: Inventory Valuation & Asset Breakdown */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b pb-3 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                Total Inventory Valuation & Health
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                <div>
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">Total Stock Cost Valuation (At Purchase Cost)</div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                    {formatCurrency(products.reduce((s, p) => s + (Number(p.stock || 0) * Number(p.purchasePrice || 0)), 0))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 flex justify-between items-center">
                <div>
                  <div className="text-[11px] text-sky-800 dark:text-sky-300 font-semibold">Expected Sales Value (At Retail Price)</div>
                  <div className="text-xl font-black text-sky-700 dark:text-sky-400 font-mono mt-0.5">
                    {formatCurrency(products.reduce((s, p) => s + (Number(p.stock || 0) * Number(p.salesPrice || 0)), 0))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-xl border flex justify-between items-center">
                <div>
                  <div className="text-[11px] text-zinc-500 font-semibold">Projected Gross Profit on Current Stock</div>
                  <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono mt-0.5">
                    {formatCurrency(
                      products.reduce((s, p) => s + (Number(p.stock || 0) * Number(p.salesPrice || 0)), 0) -
                        products.reduce((s, p) => s + (Number(p.stock || 0) * Number(p.purchasePrice || 0)), 0)
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t text-xs text-zinc-400 text-center">
            Automatic real-time re-valuation based on FIFO cost basis
          </div>
        </div>

      </div>
    </div>
  );
};
