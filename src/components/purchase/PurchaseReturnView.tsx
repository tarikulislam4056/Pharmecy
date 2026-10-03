import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { PurchaseInvoice, UnitType, PurchaseReturn } from '../../types';
import { canUserDelete, canUserReturn } from '../../utils/permissions';
import { RotateCcw, Package, DollarSign, Calendar, Printer, Download, Filter, Trash2, User, ShieldCheck, Clock } from 'lucide-react';

interface PurchaseReturnViewProps {
  initialInvoice?: PurchaseInvoice | null;
  onClose?: () => void;
}

export const PurchaseReturnView: React.FC<PurchaseReturnViewProps> = ({ initialInvoice, onClose }) => {
  const {
    language,
    purchaseInvoices,
    purchaseReturns,
    parties,
    wallets,
    users,
    currentUser,
    formatCurrency,
    createPurchaseReturn,
    deletePurchaseReturn,
    openPrintModal,
    setActiveTab,
    showToast,
  } = useApp();
  const { t } = useTranslation(language);

  const hasDeletePermission = canUserDelete(currentUser, 'purchase');
  const hasReturnPermission = canUserReturn(currentUser);

  const suppliers = parties.filter(p => p.type === 'SUPPLIER');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');

  // Helper to resolve creator / cashier info
  const getCreatorInfo = (ret: PurchaseReturn) => {
    const user = users.find(
      u =>
        u.id === ret.createdBy ||
        u.username.toLowerCase() === (ret.createdBy || '').toLowerCase() ||
        u.fullName.toLowerCase() === (ret.createdBy || '').toLowerCase()
    );
    const name = user?.fullName || ret.createdBy || currentUser?.fullName || 'Admin';
    const role = user?.role || (name.toLowerCase().includes('cashier') ? 'CASHIER' : 'ADMIN');
    const initials =
      name
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'AD';
    return { name, role, initials, user };
  };

  const filteredPurchaseReturns = useMemo(() => {
    if (selectedSupplierId === 'ALL') return purchaseReturns;
    return purchaseReturns.filter(ret => ret.supplierId === selectedSupplierId);
  }, [purchaseReturns, selectedSupplierId]);

  const handlePrintReport = (autoDownloadPdf = false) => {
    const printDate = new Date().toLocaleDateString('en-GB');
    const selectedSup = suppliers.find(s => s.id === selectedSupplierId);
    const reportTitle = language === 'bn' ? 'ক্রয় ফেরত খাতা ও রিপোর্ট' : 'PURCHASE RETURN REPORT';
    const totalRefundAmt = filteredPurchaseReturns.reduce((sum, r) => sum + r.totalRefund, 0);

    openPrintModal({
      type: 'REPORT',
      title: reportTitle,
      autoDownloadPdf,
      data: {
        reportTitle,
        period: `${language === 'bn' ? 'তৈরির তারিখ:' : 'Report Date:'} ${printDate}`,
        filters: [
          {
            label: language === 'bn' ? 'সাপ্লায়ার' : 'Supplier',
            value: selectedSupplierId === 'ALL' ? (language === 'bn' ? 'সকল সাপ্লায়ার' : 'All Suppliers') : (selectedSup?.name || selectedSupplierId),
          },
        ],
        kpis: [
          { label: language === 'bn' ? 'মোট ফেরত এন্ট্রি' : 'Total Return Count', value: `${filteredPurchaseReturns.length}` },
          { label: language === 'bn' ? 'মোট রিফান্ড পরিমাণ' : 'Total Refund Amount', value: totalRefundAmt },
        ],
        columns: [
          { header: 'Return #', key: 'returnNumber' },
          { header: language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time', key: 'date' },
          { header: language === 'bn' ? 'মূল ক্রয় বিল নং' : 'Original Bill #', key: 'originalBillNumber' },
          { header: language === 'bn' ? 'সাপ্লায়ার' : 'Supplier', key: 'supplierName' },
          { header: language === 'bn' ? 'ফেরতকৃত পণ্যসমূহ' : 'Returned Items', key: 'returnedItems' },
          { header: language === 'bn' ? 'ফেরতের কারণ' : 'Reason', key: 'reason' },
          { header: language === 'bn' ? 'রিফান্ড মোট' : 'Refund Total', key: 'totalRefund', align: 'right', format: 'currency' },
        ],
        rows: filteredPurchaseReturns.map(r => ({
          returnNumber: r.returnNumber,
          date: r.createdAt || r.date,
          originalBillNumber: `#${r.originalBillNumber}`,
          supplierName: r.supplierName,
          returnedItems: r.items.map(it => `${it.productName} (${it.returnQuantity} ${it.unit})`).join(', '),
          reason: r.reason || '-',
          totalRefund: r.totalAmount,
        })),
        totals: {
          supplierName: 'TOTAL',
          totalRefund: totalRefundAmt,
        },
      },
    });
  };

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoice?.id || '');
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [refundWalletId, setRefundWalletId] = useState<string>(wallets[0]?.id || '');
  const [reason, setReason] = useState<string>('Defective goods or supplier return');

  const selectedInvoice = purchaseInvoices.find(i => i.id === selectedInvoiceId);

  const handleQtyChange = (productId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(qty, maxQty));
    setReturnItems(prev => ({
      ...prev,
      [productId]: validQty,
    }));
  };

  const calculatedRefund = selectedInvoice
    ? selectedInvoice.items.reduce((sum, item) => {
        const retQty = returnItems[item.productId] || 0;
        return sum + retQty * item.purchasePrice;
      }, 0)
    : 0;

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasReturnPermission) {
      showToast(language === 'bn' ? 'পণ্য ফেরত দেওয়ার অনুমতি আপনার নেই।' : 'You do not have permission to process returns.', 'error');
      return;
    }
    if (!selectedInvoice) return;

    const itemsToReturn = selectedInvoice.items
      .filter(i => (returnItems[i.productId] || 0) > 0)
      .map(i => ({
        productId: i.productId,
        productName: i.productName,
        unit: i.unit,
        purchasePrice: i.purchasePrice,
        returnQuantity: returnItems[i.productId],
        totalAmount: returnItems[i.productId] * i.purchasePrice,
      }));

    if (itemsToReturn.length === 0) {
      showToast(language === 'bn' ? 'ফেরতের জন্য অন্তত একটি পণ্যের পরিমাণ দিন!' : 'Please specify return quantity for at least one item!', 'warning');
      return;
    }

    createPurchaseReturn({
      purchaseId: selectedInvoice.id,
      originalBillNumber: selectedInvoice.billNumber,
      supplierId: selectedInvoice.supplierId,
      supplierName: selectedInvoice.supplierName,
      items: itemsToReturn,
      totalAmount: calculatedRefund,
      refundWalletId,
      reason,
    });

    if (onClose) {
      onClose();
    } else {
      setSelectedInvoiceId('');
      setReturnItems({});
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            <span>{language === 'bn' ? 'ক্রয় ফেরত (Purchase Returns)' : 'Purchase Returns'}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'bn'
              ? 'সরবরাহকারীকে পণ্য ফেরত দেওয়া এবং স্টক আপডেট ও রিফান্ড ট্র্যাক করুন'
              : 'Return purchased goods to suppliers, deduct stock and record refunds'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('purchase-list')}
          className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold"
        >
          ← {language === 'bn' ? 'ক্রয় তালিকা' : 'Purchase List'}
        </button>
      </div>

      {/* Return Creation Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
        <h3 className="font-bold text-zinc-900 dark:text-white text-sm mb-4 border-b pb-2">
          {language === 'bn' ? 'নতুন ক্রয় ফেরত প্রক্রিয়া' : 'Process New Purchase Return'}
        </h3>

        <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                {language === 'bn' ? 'মূল ক্রয় বিল সিলেক্ট করুন *' : 'Select Original Purchase Bill *'}
              </label>
              <select
                value={selectedInvoiceId}
                onChange={e => {
                  setSelectedInvoiceId(e.target.value);
                  setReturnItems({});
                }}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
              >
                <option value="">-- Choose Purchase Bill --</option>
                {purchaseInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.billNumber} • {inv.supplierName} ({inv.date}) - ৳{inv.grandTotal.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                {language === 'bn' ? 'রিফান্ড / ক্যাশ রিসিভ অ্যাকাউন্ট *' : 'Refund Wallet / Account *'}
              </label>
              <select
                value={refundWalletId}
                onChange={e => setRefundWalletId(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} (Balance: ৳{w.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bill Items */}
          {selectedInvoice && (
            <div className="mt-4 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <div className="bg-zinc-50 dark:bg-zinc-850 p-3 flex flex-wrap justify-between items-center text-xs font-medium gap-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">{language === 'bn' ? 'মূল ক্রয় বিল নং:' : 'Original Bill No:'}</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                    #{selectedInvoice.billNumber}
                  </span>
                </div>
                <div>Supplier: <strong className="text-zinc-900 dark:text-white">{selectedInvoice.supplierName}</strong></div>
                <div>Original Total: <strong className="font-mono">৳{selectedInvoice.grandTotal.toLocaleString()}</strong></div>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Purchased Qty</th>
                    <th className="py-2.5 px-3 text-right">Purchase Price</th>
                    <th className="py-2.5 px-3 text-center w-36">Return Qty</th>
                    <th className="py-2.5 px-3 text-right">Refund Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {selectedInvoice.items.map(item => {
                    const retQty = returnItems[item.productId] || 0;
                    return (
                      <tr key={item.productId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-white">
                          {item.productName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.quantity} {item.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono">৳{item.purchasePrice}</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={retQty}
                            onChange={e => handleQtyChange(item.productId, parseInt(e.target.value) || 0, item.quantity)}
                            className="w-20 p-1 text-center font-mono font-bold bg-zinc-50 dark:bg-zinc-800 border rounded"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          ৳{(retQty * item.purchasePrice).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border-t flex items-center justify-between">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-0.5">Return Reason Note:</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Reason for return..."
                    className="p-1.5 bg-white dark:bg-zinc-800 border rounded text-xs w-72"
                  />
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-zinc-500 font-semibold">Total Refund / Deduction:</div>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                    {formatCurrency(calculatedRefund)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          {selectedInvoice && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={calculatedRefund <= 0}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 ${
                  calculatedRefund <= 0
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Purchase Return & Deduct Stock</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Purchase Return History Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
            <span>{language === 'bn' ? 'পূর্ববর্তী ক্রয় ফেরতের তালিকা ও রিপোর্ট' : 'Purchase Return History & Reports'}</span>
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] rounded-full font-mono">
              {filteredPurchaseReturns.length}
            </span>
          </h3>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
              >
                <option value="ALL">{language === 'bn' ? 'সকল সাপ্লায়ার (All Suppliers)' : 'All Suppliers'}</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => handlePrintReport(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintReport(false)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'প্রিন্ট রিপোর্ট' : 'Print Report'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 font-semibold border-b">
              <tr>
                <th className="py-2.5 px-3">Return #</th>
                <th className="py-2.5 px-3">{language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                <th className="py-2.5 px-3">{language === 'bn' ? 'মূল ক্রয় বিল নং' : 'Original Bill #'}</th>
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3">{language === 'bn' ? 'ইউজার / ক্যাশিয়ার' : 'Created By'}</th>
                <th className="py-2.5 px-3">Returned Products & Qty</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3 text-right">Refund Total</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredPurchaseReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    No purchase return records found.
                  </td>
                </tr>
              ) : (
                filteredPurchaseReturns.map(ret => {
                  const creator = getCreatorInfo(ret);
                  return (
                    <tr key={ret.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-600">{ret.returnNumber}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">{ret.date}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{ret.createdAt || ret.date}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900 text-xs">
                          #{ret.originalBillNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-white">{ret.supplierName}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {creator.initials}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">{creator.name}</div>
                            <div className="text-[9px] text-zinc-400 font-mono">{creator.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          {ret.items.map((it, idx) => (
                            <div key={idx} className="text-zinc-700 dark:text-zinc-300 font-medium">
                              • {it.productName} — <strong className="font-mono text-amber-600">{it.returnQuantity} {it.unit}</strong> (@৳{it.purchasePrice})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-500 italic">{ret.reason}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                        {formatCurrency(ret.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              const printData = {
                                billNumber: ret.returnNumber,
                                originalBillNumber: ret.originalBillNumber,
                                date: ret.createdAt || ret.date,
                                supplierName: ret.supplierName,
                                cashierName: creator.name,
                                createdBy: ret.createdBy,
                                items: ret.items.map(i => ({
                                  name: i.productName,
                                  quantity: i.returnQuantity,
                                  unitPrice: i.purchasePrice,
                                })),
                                grandTotal: ret.totalAmount,
                                paidAmount: ret.totalAmount,
                                dueAmount: 0,
                                documentTitle: language === 'bn' ? 'ক্রয় ফেরত ভাউচার' : 'PURCHASE RETURN',
                              };
                              openPrintModal({ type: 'PURCHASE_VOUCHER', title: 'Purchase Return', data: printData });
                            }}
                            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded cursor-pointer transition-colors"
                            title={language === 'bn' ? 'প্রিন্ট করুন' : 'Print'}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {hasDeletePermission && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(language === 'bn' ? 'আপনি কি নিশ্চিত যে এই রিটার্নটি ডিলিট করতে চান? স্টক এবং ব্যালেন্স পুনরায় ঠিক করা হবে।' : 'Are you sure you want to delete this return? Stock and balance will be reverted.')) {
                                  deletePurchaseReturn(ret.id || ret.returnNumber);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded cursor-pointer transition-colors"
                              title={language === 'bn' ? 'ডিলিট করুন' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
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
