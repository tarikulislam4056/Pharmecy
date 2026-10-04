import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductBatch } from '../../types';
import { canUserDelete, canUserEdit } from '../../utils/permissions';
import { getDaysRemaining, isExpiredDate, isExpiringSoonDate } from '../../utils/dateUtils';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Calendar,
  Layers,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Boxes,
  TrendingDown,
  ShoppingBag,
  Printer,
} from 'lucide-react';

interface BatchManagementModalProps {
  product: Product;
  onClose: () => void;
}

export const BatchManagementModal: React.FC<BatchManagementModalProps> = ({
  product,
  onClose,
}) => {
  const { language, formatCurrency, updateProductBatches, showToast, parties, openPrintModal, currentUser } = useApp();

  const hasDeletePermission = canUserDelete(currentUser, 'product');
  const hasEditPermission = canUserEdit(currentUser, 'product');

  const [batches, setBatches] = useState<ProductBatch[]>(() => {
    if (product.batches && product.batches.length > 0) {
      return product.batches;
    }
    // If no explicit batches yet, seed the current product stock as initial batch
    if (product.stock > 0 || product.expDate || product.batchNumber) {
      return [
        {
          id: `batch-init-${product.id}`,
          batchNumber: product.batchNumber || 'B-01',
          expDate: product.expDate || '',
          purchaseDate: product.createdAt || new Date().toISOString().split('T')[0],
          purchaseInvoiceNo: 'INITIAL-STOCK',
          purchasePrice: product.purchasePrice || 0,
          salesPrice: product.salesPrice || 0,
          stock: product.stock,
          initialStock: product.stock,
          supplierName: 'Initial Inventory',
          createdAt: product.createdAt,
        },
      ];
    }
    return [];
  });

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED'>('ALL');
  const [isAddingNewBatch, setIsAddingNewBatch] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  // New batch form state
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newExpDate, setNewExpDate] = useState('');
  const [newPurchaseDate, setNewPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPurchasePrice, setNewPurchasePrice] = useState<string>(String(product.purchasePrice || ''));
  const [newStock, setNewStock] = useState<string>('1');
  const [newSupplierId, setNewSupplierId] = useState('');

  // Editing batch state
  const [editBatchNumber, setEditBatchNumber] = useState('');
  const [editExpDate, setEditExpDate] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');

  const suppliers = useMemo(() => parties.filter(p => p.type === 'SUPPLIER'), [parties]);

  const today = new Date().toISOString().split('T')[0];

  const getBatchStatus = (batch: ProductBatch) => {
    const daysLeft = getDaysRemaining(batch.expDate);
    if (daysLeft === null) return { label: language === 'bn' ? 'মেয়াদহীন' : 'No Exp', color: 'slate', icon: Clock };
    
    if (daysLeft <= 0) {
      return { label: language === 'bn' ? 'মেয়াদোত্তীর্ণ (Expired)' : 'Expired', color: 'rose', icon: AlertTriangle };
    }

    if (daysLeft <= 30) {
      return {
        label: language === 'bn' ? `শীঘ্রই মেয়াদ শেষ (${daysLeft} দিন)` : `Expiring Soon (${daysLeft}d)`,
        color: 'amber',
        icon: AlertTriangle,
      };
    }

    return {
      label: language === 'bn' ? `সতেজ (${daysLeft} দিন বাকি)` : `Valid (${daysLeft}d left)`,
      color: 'emerald',
      icon: ShieldCheck,
    };
  };

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (filterStatus === 'ACTIVE') return b.stock > 0;
      if (filterStatus === 'EXPIRED') return isExpiredDate(b.expDate);
      if (filterStatus === 'EXPIRING') return isExpiringSoonDate(b.expDate, 30);
      return true;
    });
  }, [batches, filterStatus]);

  const totalBatchStock = useMemo(() => {
    return batches.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
  }, [batches]);

  const handleAddNewBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const batchQty = Number(newStock) || 0;
    if (batchQty < 0) {
      showToast(language === 'bn' ? 'স্টক পরিমাণ সঠিক নয়!' : 'Invalid stock quantity!', 'warning');
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === newSupplierId);
    const generatedBatchNumber = newBatchNumber.trim() || `B-${newPurchaseDate.replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`;

    const newBatch: ProductBatch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      batchNumber: generatedBatchNumber,
      expDate: newExpDate,
      purchaseDate: newPurchaseDate,
      purchaseInvoiceNo: 'MANUAL-BATCH',
      purchasePrice: Number(newPurchasePrice) || product.purchasePrice || 0,
      salesPrice: product.salesPrice || 0,
      stock: batchQty,
      initialStock: batchQty,
      supplierId: selectedSupplier?.id,
      supplierName: selectedSupplier?.name || 'Direct Entry',
      createdAt: `${newPurchaseDate} ${new Date().toLocaleTimeString('en-US', { hour12: false })}`,
    };

    const updated = [...batches, newBatch];
    setBatches(updated);
    updateProductBatches(product.id, updated);

    // Reset form
    setNewBatchNumber('');
    setNewExpDate('');
    setNewStock('1');
    setIsAddingNewBatch(false);

    showToast(language === 'bn' ? 'নতুন ব্যাচ সফলভাবে যুক্ত হয়েছে!' : 'New batch added successfully!', 'success');
  };

  const handleStartEditBatch = (batch: ProductBatch) => {
    setEditingBatchId(batch.id);
    setEditBatchNumber(batch.batchNumber);
    setEditExpDate(batch.expDate || '');
    setEditStock(String(batch.stock));
    setEditPurchasePrice(String(batch.purchasePrice || ''));
  };

  const handleSaveEditBatch = (batchId: string) => {
    const updated = batches.map(b => {
      if (b.id === batchId) {
        return {
          ...b,
          batchNumber: editBatchNumber.trim() || b.batchNumber,
          expDate: editExpDate,
          stock: Number(editStock) || 0,
          purchasePrice: Number(editPurchasePrice) || b.purchasePrice,
        };
      }
      return b;
    });

    setBatches(updated);
    updateProductBatches(product.id, updated);
    setEditingBatchId(null);
    showToast(language === 'bn' ? 'ব্যাচ তথ্য আপডেট করা হয়েছে!' : 'Batch updated successfully!', 'success');
  };

  const handleDeleteBatch = (batchId: string) => {
    if (!hasDeletePermission) {
      showToast(language === 'bn' ? 'আপনার ব্যাচ ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete batches', 'error');
      return;
    }

    const batchToDelete = batches.find(b => b.id === batchId);
    if (!window.confirm(language === 'bn' ? `আপনি কি ব্যাচ "${batchToDelete?.batchNumber}" মুছে ফেলতে চান?` : `Are you sure you want to delete batch "${batchToDelete?.batchNumber}"?`)) {
      return;
    }

    const updated = batches.filter(b => b.id !== batchId);
    setBatches(updated);
    updateProductBatches(product.id, updated);
    showToast(language === 'bn' ? 'ব্যাচ মুছে ফেলা হয়েছে!' : 'Batch deleted!', 'info');
  };

  const handlePrintProductBatches = () => {
    const printDate = new Date().toLocaleDateString('en-GB');
    const printTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const todayTime = new Date(today).getTime();

    const reportTitle = `${product.name} - ${language === 'bn' ? 'ব্যাচ ও মেয়াদ রিপোর্ট' : 'Batch & Expiry Report'}`;

    const batchList = filteredBatches.map((b, idx) => {
      const daysDiff = getDaysRemaining(b.expDate);
      const st = getBatchStatus(b);
      return {
        sl: idx + 1,
        batchNumber: b.batchNumber,
        productName: product.name,
        productNameBn: product.nameBn,
        sku: product.sku,
        barcode: product.barcode,
        generic: product.generic,
        categoryName: product.categoryName,
        unit: product.unit,
        purchaseDate: b.purchaseDate || b.createdAt?.split(' ')[0] || today,
        purchaseInvoiceNo: b.purchaseInvoiceNo,
        expDate: b.expDate,
        daysDiff,
        status: isExpiredDate(b.expDate) ? 'EXPIRED' : isExpiringSoonDate(b.expDate, 30) ? 'EXPIRING_30' : 'FRESH',
        statusLabel: st.label,
        purchasePrice: b.purchasePrice || product.purchasePrice || 0,
        salesPrice: b.salesPrice || product.salesPrice || 0,
        initialStock: b.initialStock || b.stock,
        soldQty: Math.max(0, (b.initialStock || b.stock) - b.stock),
        returnedQty: 0,
        stock: b.stock,
        totalCostValuation: b.stock * (b.purchasePrice || product.purchasePrice || 0),
        totalSalesValuation: b.stock * (b.salesPrice || product.salesPrice || 0),
        supplierName: b.supplierName,
      };
    });

    const totalStock = batchList.reduce((s, b) => s + b.stock, 0);
    const totalCost = batchList.reduce((s, b) => s + b.totalCostValuation, 0);
    const totalSales = batchList.reduce((s, b) => s + b.totalSalesValuation, 0);
    const expSoonCount = batchList.filter(b => b.daysDiff !== null && b.daysDiff >= 0 && b.daysDiff <= 30).length;
    const expCount = batchList.filter(b => b.daysDiff !== null && b.daysDiff < 0).length;

    openPrintModal({
      type: 'BATCH_EXPIRY_REPORT',
      title: reportTitle,
      data: {
        reportTitle,
        reportTitleBn: `${product.nameBn || product.name} এর ব্যাচ ও মেয়াদ ভিত্তিক রিপোর্ট`,
        generatedDate: printDate,
        generatedTime: printTime,
        filters: {
          productName: product.name,
          categoryName: product.categoryName || 'General',
          statusFilter: filterStatus === 'ALL' ? 'All Batches' : filterStatus,
          totalBatchesCount: batchList.length,
        },
        kpis: {
          totalBatches: batchList.length,
          totalStockQty: totalStock,
          totalCostValuation: totalCost,
          totalSalesValuation: totalSales,
          expiringSoonCount: expSoonCount,
          expiringSoonValuation: batchList.filter(b => b.daysDiff !== null && b.daysDiff >= 0 && b.daysDiff <= 30).reduce((s, b) => s + b.totalCostValuation, 0),
          expiredCount: expCount,
          expiredValuation: batchList.filter(b => b.daysDiff !== null && b.daysDiff < 0).reduce((s, b) => s + b.totalCostValuation, 0),
          freshCount: batchList.length - expSoonCount - expCount,
        },
        batches: batchList,
        totals: {
          totalInitialStock: batchList.reduce((s, b) => s + b.initialStock, 0),
          totalSoldQty: batchList.reduce((s, b) => s + b.soldQty, 0),
          totalStock,
          totalCostValuation: totalCost,
          totalSalesValuation: totalSales,
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-indigo-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden text-xs">
        
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Boxes className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base tracking-tight">
                  {language === 'bn' ? 'পণ্য ব্যাচ ও মেয়াদ ব্যবস্থাপনা' : 'Product Batch & Expiry Management'}
                </h3>
                <span className="px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/40 rounded-full font-mono text-[10px] text-indigo-200 font-bold">
                  {product.sku}
                </span>
              </div>
              <p className="text-indigo-200/80 text-[11px] mt-0.5 flex items-center gap-2">
                <span className="font-semibold text-white">{product.name}</span>
                <span>•</span>
                <span>{language === 'bn' ? 'মোট স্টক:' : 'Total Stock:'} <strong className="text-emerald-300 font-mono">{totalBatchStock} {product.unit}</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar & Summary Strip */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          {/* Status filter pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {language === 'bn' ? 'সকল ব্যাচ' : 'All Batches'} ({batches.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                filterStatus === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {language === 'bn' ? 'মজুদ আছে' : 'In Stock'} ({batches.filter(b => b.stock > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('EXPIRING')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                filterStatus === 'EXPIRING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {language === 'bn' ? 'শীঘ্রই শেষ' : 'Expiring Soon'} (
              {batches.filter(b => isExpiringSoonDate(b.expDate, 30) && b.stock > 0).length}
              )
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('EXPIRED')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                filterStatus === 'EXPIRED'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Expired'} ({batches.filter(b => isExpiredDate(b.expDate) && b.stock > 0).length})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintProductBatches}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'প্রিন্ট ব্যাচ রিপোর্ট' : 'Print Batches'}</span>
            </button>

            {/* Add New Batch Trigger */}
            <button
              type="button"
              onClick={() => setIsAddingNewBatch(prev => !prev)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'নতুন ব্যাচ যোগ করুন' : 'Add New Batch'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Add New Batch Form */}
        {isAddingNewBatch && (
          <form
            onSubmit={handleAddNewBatch}
            className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="font-bold text-indigo-950 dark:text-indigo-200 mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>{language === 'bn' ? 'নতুন ক্রয়ের ব্যাচ ও মেয়াদ নিবন্ধন' : 'Register New Purchase Batch & Expiry'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Batch Number (ব্যাচ নং)
                </label>
                <input
                  type="text"
                  value={newBatchNumber}
                  onChange={e => setNewBatchNumber(e.target.value)}
                  placeholder="e.g. B-2026-01"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Purchase Date (ক্রয় তারিখ) *
                </label>
                <input
                  type="date"
                  value={newPurchaseDate}
                  onChange={e => setNewPurchaseDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Expiry Date (মেয়াদ শেষ)
                </label>
                <input
                  type="date"
                  value={newExpDate}
                  onChange={e => {
                    const val = e.target.value;
                    setNewExpDate(val);
                    if (val && new Date(val) < new Date(new Date().setHours(0,0,0,0))) {
                      showToast(
                        language === 'bn' 
                          ? 'সতর্কতা: মেয়াদের তারিখ আজকের আগের একটি তারিখ!' 
                          : 'Warning: Expiry date is set to a past date!', 
                        'warning'
                      );
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Quantity (পরিমাণ) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={newStock}
                  onChange={e => setNewStock(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Purchase Cost (৳)
                </label>
                <input
                  type="number"
                  step="any"
                  value={newPurchasePrice}
                  onChange={e => setNewPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Supplier (সাপ্লায়ার)
                </label>
                <select
                  value={newSupplierId}
                  onChange={e => setNewSupplierId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">{language === 'bn' ? 'সাধারণ এন্ট্রি' : 'Direct / None'}</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-2.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNewBatch(false)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-2xs cursor-pointer"
              >
                {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Batch'}
              </button>
            </div>
          </form>
        )}

        {/* Batches Table List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredBatches.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <Boxes className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="font-semibold text-sm">
                {language === 'bn' ? 'কোনো ব্যাচ রেকর্ড পাওয়া যায়নি' : 'No batches found'}
              </p>
              <p className="text-[11px] mt-0.5">
                {language === 'bn'
                  ? 'উপরে "নতুন ব্যাচ যোগ করুন" বাটনে ক্লিক করে ভিন্ন তারিখের ক্রয় বা মেয়াদ যুক্ত করতে পারেন।'
                  : 'Click "Add New Batch" above to record purchases on different dates with specific expiries.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">Batch No</th>
                    <th className="py-2.5 px-3">Purchase Date</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">Stock</th>
                    <th className="py-2.5 px-3">Supplier / Ref</th>
                    <th className="py-2.5 px-3 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBatches.map(batch => {
                    const status = getBatchStatus(batch);
                    const isEditing = editingBatchId === batch.id;
                    const StatusIcon = status.icon;

                    return (
                      <tr
                        key={batch.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          status.color === 'rose'
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : status.color === 'amber'
                            ? 'bg-amber-50/40 dark:bg-amber-950/20'
                            : ''
                        }`}
                      >
                        {/* Batch Number */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editBatchNumber}
                              onChange={e => setEditBatchNumber(e.target.value)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 rounded font-mono text-xs w-28"
                            />
                          ) : (
                            <div className="font-mono font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{batch.batchNumber}</span>
                            </div>
                          )}
                        </td>

                        {/* Purchase Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {batch.purchaseDate || '-'}
                        </td>

                        {/* Expiry Date */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editExpDate}
                              onChange={e => setEditExpDate(e.target.value)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 rounded font-mono text-xs"
                            />
                          ) : (
                            <span
                              className={`font-mono font-semibold ${
                                status.color === 'rose'
                                  ? 'text-rose-600 font-bold'
                                  : status.color === 'amber'
                                  ? 'text-amber-600 font-bold'
                                  : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {batch.expDate || (language === 'bn' ? 'মেয়াদহীন' : 'No Exp')}
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              status.color === 'rose'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : status.color === 'amber'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : status.color === 'emerald'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{status.label}</span>
                          </span>
                        </td>

                        {/* Cost Price */}
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              value={editPurchasePrice}
                              onChange={e => setEditPurchasePrice(e.target.value)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 rounded font-mono text-xs w-20 text-right"
                            />
                          ) : (
                            formatCurrency(batch.purchasePrice)
                          )}
                        </td>

                        {/* Stock */}
                        <td className="py-2.5 px-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              value={editStock}
                              onChange={e => setEditStock(e.target.value)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 rounded font-mono text-xs w-16 text-right font-bold"
                            />
                          ) : (
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {Number(batch.stock)} <span className="text-[10px] font-normal text-slate-400">{product.unit}</span>
                            </div>
                          )}
                        </td>

                        {/* Supplier / Invoice Ref */}
                        <td className="py-2.5 px-3 text-slate-500">
                          <div className="truncate max-w-[140px]">{batch.supplierName || '-'}</div>
                          {batch.purchaseInvoiceNo && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              #{batch.purchaseInvoiceNo}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={() => handleSaveEditBatch(batch.id)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                title="Save changes"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            ) : hasEditPermission ? (
                              <button
                                type="button"
                                onClick={() => handleStartEditBatch(batch)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                                title="Edit batch"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            ) : null}

                            {hasDeletePermission && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBatch(batch.id)}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Delete batch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-slate-500 text-[11px]">
            💡 {language === 'bn'
              ? 'বিক্রয়ের সময় সিস্টেম স্বয়ংক্রিয়ভাবে নিকটবর্তী মেয়াদের ব্যাচ (FEFO) আগে বিক্রি করবে।'
              : 'The POS system automatically prioritizes selling earlier-expiring batches first (FEFO).'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold transition-colors cursor-pointer"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
