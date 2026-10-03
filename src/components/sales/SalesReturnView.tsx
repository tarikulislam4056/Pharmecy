import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { SaleInvoice, UnitType, SaleReturn } from '../../types';
import { canUserDelete, canUserReturn } from '../../utils/permissions';
import { RotateCcw, Search, X, CheckCircle, ArrowLeft, Package, DollarSign, Printer, Download, Filter, Trash2, User, ShieldCheck, Clock } from 'lucide-react';

interface SalesReturnViewProps {
  initialInvoice?: SaleInvoice | null;
  onClose?: () => void;
}

export const SalesReturnView: React.FC<SalesReturnViewProps> = ({ initialInvoice, onClose }) => {
  const {
    language,
    saleInvoices,
    saleReturns,
    parties,
    wallets,
    users,
    currentUser,
    formatCurrency,
    createSaleReturn,
    deleteSaleReturn,
    openPrintModal,
    setActiveTab,
    showToast,
  } = useApp();
  const { t } = useTranslation(language);

  const hasDeletePermission = canUserDelete(currentUser, 'sales');
  const hasReturnPermission = canUserReturn(currentUser);

  const customers = parties.filter(p => p.type === 'CUSTOMER');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');

  // Helper to resolve creator / cashier info
  const getCreatorInfo = (ret: SaleReturn) => {
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

  const filteredSaleReturns = useMemo(() => {
    if (selectedCustomerId === 'ALL') return saleReturns;
    return saleReturns.filter(ret => ret.customerId === selectedCustomerId);
  }, [saleReturns, selectedCustomerId]);

  const handlePrintReport = (autoDownloadPdf = false) => {
    const printDate = new Date().toLocaleDateString('en-GB');
    const selectedCust = customers.find(c => c.id === selectedCustomerId);
    const reportTitle = language === 'bn' ? 'বিক্রয় ফেরত খাতা ও রিপোর্ট' : 'SALES RETURN REPORT';
    const totalRefundAmt = filteredSaleReturns.reduce((sum, r) => sum + r.totalRefund, 0);

    openPrintModal({
      type: 'REPORT',
      title: reportTitle,
      autoDownloadPdf,
      data: {
        reportTitle,
        period: `${language === 'bn' ? 'তৈরির তারিখ:' : 'Report Date:'} ${printDate}`,
        filters: [
          {
            label: language === 'bn' ? 'কাস্টমার' : 'Customer',
            value: selectedCustomerId === 'ALL' ? (language === 'bn' ? 'সকল কাস্টমার' : 'All Customers') : (selectedCust?.name || selectedCustomerId),
          },
        ],
        kpis: [
          { label: language === 'bn' ? 'মোট ফেরত এন্ট্রি' : 'Total Return Count', value: `${filteredSaleReturns.length}` },
          { label: language === 'bn' ? 'মোট রিফান্ড পরিমাণ' : 'Total Refund Amount', value: totalRefundAmt },
        ],
        columns: [
          { header: 'Return #', key: 'returnNumber' },
          { header: language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time', key: 'date' },
          { header: language === 'bn' ? 'মূল ইনভয়েস নং' : 'Original Invoice #', key: 'originalInvoiceNumber' },
          { header: language === 'bn' ? 'কাস্টমার' : 'Customer', key: 'customerName' },
          { header: language === 'bn' ? 'ফেরতকৃত পণ্যসমূহ' : 'Returned Items', key: 'returnedItems' },
          { header: language === 'bn' ? 'ফেরতের কারণ' : 'Reason', key: 'reason' },
          { header: language === 'bn' ? 'রিফান্ড মোট' : 'Refund Total', key: 'totalRefund', align: 'right', format: 'currency' },
        ],
        rows: filteredSaleReturns.map(r => ({
          returnNumber: r.returnNumber,
          date: r.createdAt || r.date,
          originalInvoiceNumber: `#${r.originalInvoiceNumber}`,
          customerName: r.customerName,
          returnedItems: r.items.map(it => `${it.productName} (${it.returnQuantity} ${it.unit})`).join(', '),
          reason: r.reason || '-',
          totalRefund: r.totalRefund,
        })),
        totals: {
          customerName: 'TOTAL',
          totalRefund: totalRefundAmt,
        },
      },
    });
  };

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoice?.id || '');
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [refundWalletId, setRefundWalletId] = useState<string>(wallets[0]?.id || '');
  const [reason, setReason] = useState<string>('Defective or Customer exchange request');

  const selectedInvoice = saleInvoices.find(i => i.id === selectedInvoiceId);

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
        return sum + retQty * item.unitPrice;
      }, 0)
    : 0;

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasReturnPermission) {
      showToast(language === 'bn' ? 'পণ্য ফেরত নেওয়ার অনুমতি আপনার নেই।' : 'You do not have permission to return items.', 'error');
      return;
    }
    if (!selectedInvoice) return;

    const itemsToReturn = selectedInvoice.items
      .filter(i => (returnItems[i.productId] || 0) > 0)
      .map(i => ({
        productId: i.productId,
        productName: i.name,
        unit: i.unit,
        unitPrice: i.unitPrice,
        returnQuantity: returnItems[i.productId],
        totalRefund: returnItems[i.productId] * i.unitPrice,
      }));

    if (itemsToReturn.length === 0) {
      showToast(language === 'bn' ? 'ফেরতের জন্য অন্তত একটি পণ্যের পরিমাণ দিন!' : 'Please specify return quantity for at least one item!', 'warning');
      return;
    }

    createSaleReturn({
      invoiceId: selectedInvoice.id,
      originalInvoiceNumber: selectedInvoice.invoiceNumber,
      customerId: selectedInvoice.customerId,
      customerName: selectedInvoice.customerName,
      items: itemsToReturn,
      totalRefund: calculatedRefund,
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
            <RotateCcw className="w-5 h-5 text-rose-600" />
            <span>{t('sales_returns')}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'bn'
              ? 'বিক্রয়কৃত পণ্য ফেরত নেওয়া ও ইনভেন্টরি স্বয়ংক্রিয় রিস্টোরেশন'
              : 'Process customer product returns, restock inventory and issue refunds'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('sales-list')}
          className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold"
        >
          ← {t('sales_list')}
        </button>
      </div>

      {/* Return Creation Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
        <h3 className="font-bold text-zinc-900 dark:text-white text-sm mb-4 border-b pb-2">
          {language === 'bn' ? 'নতুন বিক্রয় ফেরত প্রক্রিয়া' : 'Process New Sale Return'}
        </h3>

        <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs">
          {/* Select Invoice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Select Original Sales Invoice *
              </label>
              <select
                value={selectedInvoiceId}
                onChange={e => {
                  setSelectedInvoiceId(e.target.value);
                  setReturnItems({});
                }}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
              >
                <option value="">-- Choose Sales Invoice --</option>
                {saleInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} • {inv.customerName} ({inv.date}) - ৳{inv.grandTotal.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Refund Wallet / Account *
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

          {/* Invoice Items to Return */}
          {selectedInvoice && (
            <div className="mt-4 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <div className="bg-zinc-50 dark:bg-zinc-850 p-3 flex flex-wrap justify-between items-center text-xs font-medium gap-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">{language === 'bn' ? 'মূল ইনভয়েস নং:' : 'Original Invoice No:'}</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                    #{selectedInvoice.invoiceNumber}
                  </span>
                </div>
                <div>Customer: <strong className="text-zinc-900 dark:text-white">{selectedInvoice.customerName}</strong></div>
                <div>Original Total: <strong className="font-mono">৳{selectedInvoice.grandTotal.toLocaleString()}</strong></div>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Sold Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-center w-36">Return Qty</th>
                    <th className="py-2.5 px-3 text-right">Refund Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {selectedInvoice.items.map(item => {
                    const retQty = returnItems[item.productId] || 0;
                    return (
                      <tr key={item.productId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.quantity} {item.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono">৳{item.unitPrice}</td>
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
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          ৳{(retQty * item.unitPrice).toLocaleString()}
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
                  <div className="text-[11px] text-zinc-500 font-semibold">Total Refund Amount:</div>
                  <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
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
                    : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Return & Restock Inventory</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Return History Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
            <span>{language === 'bn' ? 'পূর্ববর্তী বিক্রয় ফেরতের তালিকা ও রিপোর্ট' : 'Sales Return History & Reports'}</span>
            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] rounded-full font-mono">
              {filteredSaleReturns.length}
            </span>
          </h3>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
              >
                <option value="ALL">{language === 'bn' ? 'সকল কাস্টমার (All Customers)' : 'All Customers'}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
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
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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
                <th className="py-2.5 px-3">{language === 'bn' ? 'মূল ইনভয়েস নং' : 'Original Invoice #'}</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">{language === 'bn' ? 'ইউজার / ক্যাশিয়ার' : 'Created By'}</th>
                <th className="py-2.5 px-3">Returned Products & Qty</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3 text-right">Refund Total</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredSaleReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    No return records found.
                  </td>
                </tr>
              ) : (
                filteredSaleReturns.map(ret => {
                  const creator = getCreatorInfo(ret);
                  return (
                    <tr key={ret.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-600">{ret.returnNumber}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">{ret.date}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{ret.createdAt || ret.date}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-xs">
                          #{ret.originalInvoiceNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-white">{ret.customerName}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[9px] flex items-center justify-center shrink-0">
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
                              • {it.productName} — <strong className="font-mono text-rose-600">{it.returnQuantity} {it.unit}</strong> (@৳{it.unitPrice})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-500 italic">{ret.reason}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                        {formatCurrency(ret.totalRefund)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              const printData = {
                                invoiceNumber: ret.returnNumber,
                                originalInvoiceNumber: ret.originalInvoiceNumber,
                                date: ret.createdAt || ret.date,
                                customerName: ret.customerName,
                                cashierName: creator.name,
                                createdBy: ret.createdBy,
                                items: ret.items.map(i => ({
                                  name: i.productName,
                                  quantity: i.returnQuantity,
                                  unitPrice: i.unitPrice,
                                })),
                                grandTotal: ret.totalRefund,
                                paidAmount: ret.totalRefund,
                                dueAmount: 0,
                                documentTitle: language === 'bn' ? 'বিক্রয় ফেরত চালান' : 'SALE RETURN',
                              };
                              openPrintModal({ type: 'INVOICE_A4', title: 'Sale Return', data: printData });
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
                                  deleteSaleReturn(ret.id || ret.returnNumber);
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
