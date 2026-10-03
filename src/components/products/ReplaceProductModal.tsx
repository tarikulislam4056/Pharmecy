import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductBatch } from '../../types';
import { isExpiredDate, normalizeDateToISO } from '../../utils/dateUtils';
import { RefreshCw, X, AlertTriangle, CheckCircle2, Calendar, Sparkles, Layers } from 'lucide-react';

interface ReplaceProductModalProps {
  product: Product;
  onClose: () => void;
}

export const ReplaceProductModal: React.FC<ReplaceProductModalProps> = ({
  product,
  onClose,
}) => {
  const { language, updateProduct, addExpiredReturnLog, purchaseInvoices, showToast, currentUser } = useApp();

  // Find expired or default batch
  const expiredBatches = useMemo(() => {
    if (!product.batches || product.batches.length === 0) return [];
    return product.batches.filter(b => isExpiredDate(b.expDate) && Number(b.stock) > 0);
  }, [product.batches]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => {
    if (expiredBatches.length > 0) return expiredBatches[0].id;
    if (product.batches && product.batches.length > 0) return product.batches[0].id;
    return '';
  });

  const selectedBatch = useMemo(() => {
    if (!product.batches) return null;
    return product.batches.find(b => b.id === selectedBatchId) || null;
  }, [product.batches, selectedBatchId]);

  const maxAvailableQty = useMemo(() => {
    if (selectedBatch) {
      return Number(selectedBatch.stock || 0);
    }
    return Number(product.stock || 0);
  }, [selectedBatch, product.stock]);

  // Compute a default 1-year future date for fresh batch
  const defaultFutureDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const [quantity, setQuantity] = useState<number>(() => {
    const max = maxAvailableQty;
    return max > 0 ? max : 1;
  });
  const [replaceType, setReplaceType] = useState<'FRESH_BATCH' | 'RETURN_SUPPLIER' | 'WRITE_OFF'>('FRESH_BATCH');
  const [newExpDate, setNewExpDate] = useState<string>(defaultFutureDate());
  const [newBatch, setNewBatch] = useState<string>(`BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [notes, setNotes] = useState<string>('');

  const setPresetMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setNewExpDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      showToast(language === 'bn' ? 'অনুগ্রহ করে সঠিক পরিমাণ লিখুন।' : 'Please enter a valid quantity to replace.', 'error');
      return;
    }

    if (replaceType === 'FRESH_BATCH' && !newExpDate) {
      showToast(language === 'bn' ? 'নতুন পণ্যের এক্সপায়ারি ডেট দিন।' : 'Please provide a new Expiry Date for the replacement batch.', 'error');
      return;
    }

    const effectiveBatchNum = selectedBatch?.batchNumber || product.batchNumber;
    const effectiveExpDate = selectedBatch?.expDate || product.expDate;
    const linkedPur = purchaseInvoices?.find(pur => pur.items.some(it => it.productId === product.id));
    const purchaseInvoiceNo = selectedBatch?.purchaseInvoiceNo || linkedPur?.billNumber || 'PUR-STOCK';

    let updatedStock = Number(product.stock || 0);
    let updatedExpDate: string | undefined = product.expDate;
    let updatedBatch: string | undefined = product.batchNumber;
    let updatedBatches: ProductBatch[] | undefined = product.batches ? [...product.batches] : undefined;

    if (replaceType === 'RETURN_SUPPLIER' || replaceType === 'WRITE_OFF') {
      // Deduct replaced expired items from stock
      updatedStock = Math.max(0, updatedStock - quantity);

      if (updatedBatches && selectedBatchId) {
        updatedBatches = updatedBatches.map(b => {
          if (b.id === selectedBatchId) {
            const nextStock = Math.max(0, (Number(b.stock) || 0) - quantity);
            return { ...b, stock: nextStock };
          }
          return b;
        });
        const activeBatches = updatedBatches.filter(b => Number(b.stock) > 0 && b.expDate);
        activeBatches.sort((a, b) => (normalizeDateToISO(a.expDate) || '').localeCompare(normalizeDateToISO(b.expDate) || ''));
        updatedExpDate = activeBatches[0]?.expDate || undefined;
        updatedBatch = activeBatches[0]?.batchNumber || updatedBatch;
      } else {
        if (updatedStock === 0) {
          updatedExpDate = undefined;
        }
      }

      addExpiredReturnLog({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: quantity,
        purchasePrice: product.purchasePrice,
        totalValue: quantity * product.purchasePrice,
        actionType: replaceType,
        batchNumber: effectiveBatchNum,
        purchaseInvoiceNo,
        expDate: effectiveExpDate,
        createdBy: currentUser?.fullName || currentUser?.username || 'Admin',
        notes: notes.trim() || (replaceType === 'RETURN_SUPPLIER' ? 'Returned to supplier due to expiration' : 'Written off due to expiration'),
      });
    } else if (replaceType === 'FRESH_BATCH') {
      // Replaced with fresh batch & new expiry date
      const freshBatchName = newBatch ? newBatch.trim() : `BATCH-${Date.now().toString().slice(-4)}`;

      if (updatedBatches && selectedBatchId) {
        // Deduct from expired batch
        updatedBatches = updatedBatches.map(b => {
          if (b.id === selectedBatchId) {
            const nextStock = Math.max(0, (Number(b.stock) || 0) - quantity);
            return { ...b, stock: nextStock };
          }
          return b;
        });

        // Add the new fresh replacement batch
        const freshBatchObj: ProductBatch = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          batchNumber: freshBatchName,
          expDate: newExpDate,
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseInvoiceNo: selectedBatch?.purchaseInvoiceNo || 'REPLACEMENT-BATCH',
          purchasePrice: selectedBatch?.purchasePrice ?? product.purchasePrice,
          salesPrice: selectedBatch?.salesPrice ?? product.salesPrice,
          stock: quantity,
          initialStock: quantity,
          supplierId: selectedBatch?.supplierId,
          supplierName: selectedBatch?.supplierName,
          createdAt: new Date().toISOString(),
        };
        updatedBatches.push(freshBatchObj);

        // Recalculate earliest expiry and batch
        const activeBatches = updatedBatches.filter(b => Number(b.stock) > 0 && b.expDate);
        activeBatches.sort((a, b) => (normalizeDateToISO(a.expDate) || '').localeCompare(normalizeDateToISO(b.expDate) || ''));
        updatedExpDate = activeBatches[0]?.expDate || newExpDate;
        updatedBatch = freshBatchName;
        updatedStock = updatedBatches.reduce((s, b) => s + (Number(b.stock) || 0), 0);
      } else {
        updatedExpDate = newExpDate;
        if (newBatch) updatedBatch = freshBatchName;
      }

      addExpiredReturnLog({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: quantity,
        purchasePrice: product.purchasePrice,
        totalValue: quantity * product.purchasePrice,
        actionType: 'REPLACEMENT',
        batchNumber: freshBatchName,
        purchaseInvoiceNo,
        expDate: newExpDate,
        createdBy: currentUser?.fullName || currentUser?.username || 'Admin',
        notes: notes.trim() || (language === 'bn' ? `নতুন মেয়াদ (${newExpDate}) দিয়ে রিপ্লেস করা হয়েছে` : `Replaced with fresh batch (Exp: ${newExpDate})`),
      });
    }

    updateProduct(product.id, {
      stock: updatedStock,
      expDate: updatedExpDate,
      batchNumber: updatedBatch,
      batches: updatedBatches,
    });

    if (replaceType === 'FRESH_BATCH') {
      showToast(
        language === 'bn'
          ? `পণ্যটি নতুন মেয়াদ (${newExpDate}) দিয়ে সফলভাবে প্রতিস্থাপন করা হয়েছে এবং মেয়াদোত্তীর্ণ তালিকা থেকে সরানো হয়েছে!`
          : `Replaced with new expiry date (${newExpDate}). Product is removed from Exp Date list!`,
        'success'
      );
    } else if (replaceType === 'RETURN_SUPPLIER') {
      showToast(
        language === 'bn'
          ? `মহাজনে ${quantity} ${product.unit} ফেরত দেওয়া হয়েছে এবং মেয়াদোত্তীর্ণ তালিকা থেকে সরানো হয়েছে!`
          : `Returned ${quantity} ${product.unit} to supplier and removed from Exp Date list.`,
        'success'
      );
    } else {
      showToast(
        language === 'bn'
          ? `নষ্ট ${quantity} ${product.unit} স্টক থেকে বাদ দেওয়া হয়েছে!`
          : `Written off ${quantity} ${product.unit} from inventory.`,
        'info'
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'মেয়াদোত্তীর্ণ পণ্য প্রতিস্থাপন / রিপ্লেস' : 'Replace Exp Date Product'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-normal">
                  {language === 'bn' ? 'নতুন পণ্য • নতুন ডেট' : 'Fresh Batch • New Date'}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500">
                {product.name} ({product.sku})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Current Expiry Notice */}
          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900 grid grid-cols-2 gap-2">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">
                {language === 'bn' ? 'বর্তমান মোট স্টক:' : 'Current Total Stock:'}
              </span>
              <strong className="text-zinc-900 dark:text-white font-mono text-sm">
                {Number(product.stock)} {product.unit}
              </strong>
            </div>
            <div>
              <span className="text-rose-600 dark:text-rose-400 block text-[11px] font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {language === 'bn' ? 'পূর্ববর্তী মেয়াদ (Exp Date):' : 'Current Exp. Date:'}
              </span>
              <strong className="text-rose-700 dark:text-rose-300 font-mono text-sm">
                {selectedBatch?.expDate || product.expDate || 'N/A'}
              </strong>
            </div>
          </div>

          {/* Batch Selector if multiple batches exist */}
          {product.batches && product.batches.length > 1 && (
            <div>
              <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>{language === 'bn' ? 'নির্দিষ্ট ব্যাচ নির্বাচন করুন:' : 'Select Target Batch:'}</span>
              </label>
              <select
                value={selectedBatchId}
                onChange={e => {
                  setSelectedBatchId(e.target.value);
                  const b = product.batches?.find(x => x.id === e.target.value);
                  if (b && b.stock > 0) setQuantity(Number(b.stock));
                }}
                className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-medium"
              >
                {product.batches.map(b => (
                  <option key={b.id} value={b.id}>
                    Batch: {b.batchNumber} | Stock: {b.stock} {product.unit} | Exp: {b.expDate || 'N/A'} {isExpiredDate(b.expDate) ? '(EXPIRED)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Replacement Action Type */}
          <div>
            <label className="font-semibold block mb-1.5 text-zinc-700 dark:text-zinc-300">
              {language === 'bn' ? 'প্রতিস্থাপনের ধরন (Replacement Method):' : 'Replacement Action:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setReplaceType('FRESH_BATCH')}
                className={`p-2.5 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                  replaceType === 'FRESH_BATCH'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>Fresh Batch</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">নতুন পণ্য ও নতুন মেয়াদ</div>
              </button>

              <button
                type="button"
                onClick={() => setReplaceType('RETURN_SUPPLIER')}
                className={`p-2.5 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                  replaceType === 'RETURN_SUPPLIER'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div className="font-bold">Return Supplier</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">মহাজনের কাছে ফেরত</div>
              </button>

              <button
                type="button"
                onClick={() => setReplaceType('WRITE_OFF')}
                className={`p-2.5 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                  replaceType === 'WRITE_OFF'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div className="font-bold">Write-off</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">নষ্ট হিসেবে বাদ</div>
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
              {language === 'bn' ? `প্রতিস্থাপনের পরিমাণ (${product.unit}):` : `Quantity to Replace (${product.unit}):`}
            </label>
            <input
              type="number"
              min="1"
              max={maxAvailableQty > 0 ? maxAvailableQty : 9999}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-sm"
              required
            />
          </div>

          {/* Conditional Fresh Batch Fields */}
          {replaceType === 'FRESH_BATCH' && (
            <div className="space-y-2.5 p-3.5 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-900">
              <div className="flex items-center justify-between">
                <label className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>{language === 'bn' ? 'নতুন এক্সপায়ারি ডেট (New Expiry Date):' : 'New Expiry Date:'}</span>
                </label>
                {/* Quick Date Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPresetMonths(6)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-purple-100 hover:bg-purple-200 text-purple-700 rounded cursor-pointer transition-colors"
                  >
                    +6 Mo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetMonths(12)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-purple-200 hover:bg-purple-300 text-purple-800 rounded cursor-pointer transition-colors"
                  >
                    +1 Yr
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetMonths(24)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-purple-100 hover:bg-purple-200 text-purple-700 rounded cursor-pointer transition-colors"
                  >
                    +2 Yr
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={newExpDate}
                    onChange={e => setNewExpDate(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-purple-300 dark:border-purple-800 rounded-lg font-mono font-bold text-sm text-purple-900 dark:text-purple-200"
                    required
                  />
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 block">
                    {language === 'bn' ? '✓ নতুন মেয়াদ সেট হলে মেয়াদোত্তীর্ণ তালিকা থেকে সরে যাবে' : '✓ Product will auto-exit Exp Date list once given new valid date'}
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    value={newBatch}
                    onChange={e => setNewBatch(e.target.value)}
                    placeholder="New Batch (e.g. BATCH-2027)"
                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-xs"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    {language === 'bn' ? 'নতুন ব্যাচ নম্বর (ঐচ্ছিক)' : 'New Batch Number (Optional)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
              {language === 'bn' ? 'মন্তব্য বা মেমো নম্বর (Notes / Remarks):' : 'Notes / Remarks:'}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Received new stock from supplier against expired batch..."
              rows={2}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {replaceType === 'FRESH_BATCH' 
                ? (language === 'bn' ? '• নতুন মেয়াদ যুক্ত হয়ে তালিকা আপডেট হবে' : '• Updated with new valid expiry date')
                : (language === 'bn' ? '• স্টক সমন্বয় সম্পন্ন হবে' : '• Stock will be adjusted')}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'প্রতিস্থাপন সম্পন্ন করুন' : 'Confirm Replacement'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
