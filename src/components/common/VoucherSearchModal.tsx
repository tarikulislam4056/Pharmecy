import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Receipt,
  ShoppingBag,
  CreditCard,
  FileText,
  DollarSign,
  Printer,
  ExternalLink,
  X,
  User,
  Calendar,
  Wallet,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  CheckCircle2,
  AlertCircle,
  Tag,
  ShieldCheck,
  ShieldAlert,
  Wrench,
  FileCheck,
} from 'lucide-react';
import { SaleInvoice, PurchaseInvoice, DayBookEntry, ExpenseVoucher, InstallmentScheme, WarrantyRecord, WarrantyClaim, Quotation } from '../../types';

export interface SearchResultItem {
  id: string;
  type: 'SALE' | 'PURCHASE' | 'DAYBOOK' | 'EXPENSE' | 'INSTALLMENT' | 'WARRANTY_RECORD' | 'WARRANTY_CLAIM' | 'QUOTATION';
  voucherNo: string;
  refNo?: string;
  date: string;
  title: string;
  subtitle: string;
  amount: number;
  status?: string;
  raw: any;
}

interface VoucherSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const VoucherSearchModal: React.FC<VoucherSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
}) => {
  const {
    language,
    saleInvoices,
    purchaseInvoices,
    dayBookEntries,
    expenseVouchers,
    installmentSchemes,
    warrantyRecords,
    warrantyClaims,
    quotations,
    formatCurrency,
    openPrintModal,
    setActiveTab,
  } = useApp();

  const [query, setQuery] = useState(initialQuery);
  const [selectedResult, setSelectedResult] = useState<SearchResultItem | null>(null);

  // Update internal query if initialQuery changes
  React.useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Search through all vouchers, invoices, daybook entries, expenses, installments
  const searchResults: SearchResultItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    // 1. Sale Invoices
    saleInvoices.forEach(inv => {
      const matchInvNo = inv.invoiceNumber.toLowerCase().includes(q);
      const matchCustomer = inv.customerName.toLowerCase().includes(q);
      const matchPhone = inv.customerPhone ? inv.customerPhone.toLowerCase().includes(q) : false;
      const matchItem = inv.items.some(i => i.name.toLowerCase().includes(q) || (i.nameBn && i.nameBn.toLowerCase().includes(q)));
      const matchNotes = inv.notes ? inv.notes.toLowerCase().includes(q) : false;

      if (matchInvNo || matchCustomer || matchPhone || matchItem || matchNotes) {
        results.push({
          id: `sale-${inv.id}`,
          type: 'SALE',
          voucherNo: inv.invoiceNumber,
          refNo: inv.invoiceNumber,
          date: inv.date,
          title: `Sales Invoice #${inv.invoiceNumber}`,
          subtitle: `Customer: ${inv.customerName} ${inv.customerPhone ? `(${inv.customerPhone})` : ''} • ${inv.items.length} items`,
          amount: inv.grandTotal,
          status: inv.status,
          raw: inv,
        });
      }
    });

    // 2. Purchase Invoices
    purchaseInvoices.forEach(pur => {
      const matchBillNo = pur.billNumber.toLowerCase().includes(q);
      const matchSupplierInv = pur.supplierInvoiceNo ? pur.supplierInvoiceNo.toLowerCase().includes(q) : false;
      const matchSupplier = pur.supplierName.toLowerCase().includes(q);
      const matchPhone = pur.supplierPhone ? pur.supplierPhone.toLowerCase().includes(q) : false;
      const matchItem = pur.items.some(i => i.productName.toLowerCase().includes(q));
      const matchNotes = pur.notes ? pur.notes.toLowerCase().includes(q) : false;

      if (matchBillNo || matchSupplierInv || matchSupplier || matchPhone || matchItem || matchNotes) {
        results.push({
          id: `pur-${pur.id}`,
          type: 'PURCHASE',
          voucherNo: pur.billNumber,
          refNo: pur.supplierInvoiceNo || pur.billNumber,
          date: pur.date,
          title: `Purchase Bill #${pur.billNumber}`,
          subtitle: `Supplier: ${pur.supplierName} ${pur.supplierInvoiceNo ? `[Ref: ${pur.supplierInvoiceNo}]` : ''} • ${pur.items.length} items`,
          amount: pur.grandTotal,
          status: pur.status,
          raw: pur,
        });
      }
    });

    // 3. Day Book Entries
    dayBookEntries.forEach(db => {
      const matchVoucher = db.voucherNo.toLowerCase().includes(q);
      const matchRef = db.referenceNo ? db.referenceNo.toLowerCase().includes(q) : false;
      const matchParty = db.partyName ? db.partyName.toLowerCase().includes(q) : false;
      const matchRemarks = db.remarks ? db.remarks.toLowerCase().includes(q) : false;
      const matchWallet = db.walletName ? db.walletName.toLowerCase().includes(q) : false;

      if (matchVoucher || matchRef || matchParty || matchRemarks || matchWallet) {
        results.push({
          id: `db-${db.id}`,
          type: 'DAYBOOK',
          voucherNo: db.voucherNo,
          refNo: db.referenceNo || db.voucherNo,
          date: db.date,
          title: `Day Book Voucher #${db.voucherNo}`,
          subtitle: `${db.flow === 'IN' ? 'Money In (Receipt)' : 'Money Out (Payment)'} • ${db.partyName || db.walletName || 'Transaction'} ${db.remarks ? `(${db.remarks})` : ''}`,
          amount: db.amount,
          status: db.flow === 'IN' ? 'MONEY_IN' : 'MONEY_OUT',
          raw: db,
        });
      }
    });

    // 4. Expense Vouchers
    expenseVouchers.forEach(exp => {
      const matchVoucher = exp.voucherNo.toLowerCase().includes(q);
      const matchCategory = exp.categoryName.toLowerCase().includes(q);
      const matchPayee = exp.payee ? exp.payee.toLowerCase().includes(q) : false;
      const matchNote = exp.note ? exp.note.toLowerCase().includes(q) : (exp.remarks ? exp.remarks.toLowerCase().includes(q) : false);

      if (matchVoucher || matchCategory || matchPayee || matchNote) {
        results.push({
          id: `exp-${exp.id}`,
          type: 'EXPENSE',
          voucherNo: exp.voucherNo,
          refNo: exp.receiptNo || exp.voucherNo,
          date: exp.date,
          title: `Expense Voucher #${exp.voucherNo}`,
          subtitle: `Category: ${exp.categoryName} ${exp.payee ? `• Payee: ${exp.payee}` : ''} ${exp.note ? `(${exp.note})` : ''}`,
          amount: exp.amount,
          status: 'EXPENSE',
          raw: exp,
        });
      }
    });

    // 5. Installment Schemes
    installmentSchemes.forEach(ins => {
      const matchScheme = ins.schemeNumber.toLowerCase().includes(q);
      const matchCustomer = ins.customerName.toLowerCase().includes(q);
      const matchProduct = ins.productName.toLowerCase().includes(q);
      const matchInvoiceRef = ins.invoiceNumber ? ins.invoiceNumber.toLowerCase().includes(q) : false;

      if (matchScheme || matchCustomer || matchProduct || matchInvoiceRef) {
        results.push({
          id: `ins-${ins.id}`,
          type: 'INSTALLMENT',
          voucherNo: ins.schemeNumber,
          refNo: ins.invoiceNumber || ins.schemeNumber,
          date: ins.startDate,
          title: `Installment Scheme #${ins.schemeNumber}`,
          subtitle: `Customer: ${ins.customerName} • Product: ${ins.productName} • ${ins.totalInstallments} Months EMI`,
          amount: ins.totalPayable,
          status: ins.status,
          raw: ins,
        });
      }
    });

    // 6. Warranty Records (Search by Serial/IMEI, Warranty Code, Product Name, Customer Name/Phone, Invoice No)
    (warrantyRecords || []).forEach(rec => {
      const matchCode = rec.warrantyCode ? rec.warrantyCode.toLowerCase().includes(q) : false;
      const matchSerial = rec.serialNumber ? rec.serialNumber.toLowerCase().includes(q) : false;
      const matchInvoice = rec.invoiceNumber ? rec.invoiceNumber.toLowerCase().includes(q) : false;
      const matchProduct = rec.productName ? rec.productName.toLowerCase().includes(q) : false;
      const matchCustomer = rec.customerName ? rec.customerName.toLowerCase().includes(q) : false;
      const matchPhone = rec.customerPhone ? rec.customerPhone.toLowerCase().includes(q) : false;

      if (matchCode || matchSerial || matchInvoice || matchProduct || matchCustomer || matchPhone) {
        results.push({
          id: `war-rec-${rec.id}`,
          type: 'WARRANTY_RECORD',
          voucherNo: rec.warrantyCode || rec.serialNumber || rec.invoiceNumber,
          refNo: rec.serialNumber || rec.invoiceNumber,
          date: rec.saleDate || rec.createdAt,
          title: `Warranty Card #${rec.warrantyCode || rec.serialNumber}`,
          subtitle: `SN/IMEI: ${rec.serialNumber || 'N/A'} • Product: ${rec.productName} • Customer: ${rec.customerName} ${rec.customerPhone ? `(${rec.customerPhone})` : ''}`,
          amount: 0,
          status: rec.status,
          raw: rec,
        });
      }
    });

    // 7. Warranty Claims (Search by Ticket No, Serial/IMEI, Product Name, Customer Name/Phone, Issue)
    (warrantyClaims || []).forEach(claim => {
      const matchTicket = claim.claimTicketNo ? claim.claimTicketNo.toLowerCase().includes(q) : false;
      const matchSerial = claim.serialNumber ? claim.serialNumber.toLowerCase().includes(q) : false;
      const matchProduct = claim.productName ? claim.productName.toLowerCase().includes(q) : false;
      const matchCustomer = claim.customerName ? claim.customerName.toLowerCase().includes(q) : false;
      const matchPhone = claim.customerPhone ? claim.customerPhone.toLowerCase().includes(q) : false;
      const matchIssue = claim.issueDescription ? claim.issueDescription.toLowerCase().includes(q) : false;

      if (matchTicket || matchSerial || matchProduct || matchCustomer || matchPhone || matchIssue) {
        results.push({
          id: `war-claim-${claim.id}`,
          type: 'WARRANTY_CLAIM',
          voucherNo: claim.claimTicketNo,
          refNo: claim.serialNumber || claim.claimTicketNo,
          date: claim.createdAt,
          title: `Warranty Claim Ticket #${claim.claimTicketNo}`,
          subtitle: `SN/IMEI: ${claim.serialNumber || 'N/A'} • Product: ${claim.productName} • Issue: ${claim.issueDescription}`,
          amount: claim.customerCharge || claim.repairCost || 0,
          status: claim.status,
          raw: claim,
        });
      }
    });

    // 8. Price Quotations (Search by Quotation No, Customer, Phone, Items, Notes, or if query matches "price quotation", "quotation", "price", "কোটেশন", "প্রাইস কোটেশন", "qt-")
    (quotations || []).forEach(qItem => {
      const matchNo = qItem.quotationNumber ? qItem.quotationNumber.toLowerCase().includes(q) : false;
      const matchCustomer = qItem.customerName ? qItem.customerName.toLowerCase().includes(q) : false;
      const matchPhone = qItem.customerPhone ? qItem.customerPhone.toLowerCase().includes(q) : false;
      const matchItem = (qItem.items || []).some(i => (i.name && i.name.toLowerCase().includes(q)) || (i.nameBn && i.nameBn.toLowerCase().includes(q)));
      const matchNotes = qItem.notes ? qItem.notes.toLowerCase().includes(q) : false;

      const isQuotationKeywordMatch = q.length >= 3 && (
        'price quotation'.includes(q) ||
        'quotation'.includes(q) ||
        'কোটেশন'.includes(q) ||
        'প্রাইস কোটেশন'.includes(q) ||
        q.startsWith('qt')
      );

      if (isQuotationKeywordMatch || matchNo || matchCustomer || matchPhone || matchItem || matchNotes) {
        results.push({
          id: `quot-${qItem.id}`,
          type: 'QUOTATION',
          voucherNo: qItem.quotationNumber,
          refNo: qItem.quotationNumber,
          date: qItem.date,
          title: `Price Quotation #${qItem.quotationNumber}`,
          subtitle: `Customer: ${qItem.customerName} ${qItem.customerPhone ? `(${qItem.customerPhone})` : ''} • ${(qItem.items || []).length} items`,
          amount: qItem.grandTotal,
          status: qItem.status,
          raw: qItem,
        });
      }
    });

    return results;
  }, [query, saleInvoices, purchaseInvoices, dayBookEntries, expenseVouchers, installmentSchemes, warrantyRecords, warrantyClaims, quotations]);

  if (!isOpen) return null;

  const handlePrintDocument = (item: SearchResultItem) => {
    if (item.type === 'SALE') {
      openPrintModal({
        type: 'INVOICE_A4',
        title: `Sales Invoice #${item.raw.invoiceNumber}`,
        data: item.raw,
      });
    } else if (item.type === 'PURCHASE') {
      openPrintModal({
        type: 'PURCHASE_VOUCHER',
        title: `Purchase Bill #${item.raw.billNumber}`,
        data: item.raw,
      });
    } else if (item.type === 'DAYBOOK') {
      if (item.raw.flow === 'OUT' || item.raw.type === 'PAYMENT_OUT') {
        openPrintModal({
          type: 'PAYMENT_OUT_VOUCHER',
          title: `Payment Voucher #${item.raw.voucherNo}`,
          data: item.raw,
        });
      } else {
        openPrintModal({
          type: 'MONEY_RECEIPT',
          title: `Money Receipt #${item.raw.voucherNo}`,
          data: item.raw,
        });
      }
    } else if (item.type === 'EXPENSE') {
      openPrintModal({
        type: 'EXPENSE_VOUCHER',
        title: `Expense Voucher #${item.raw.voucherNo}`,
        data: item.raw,
      });
    } else if (item.type === 'INSTALLMENT') {
      openPrintModal({
        type: 'EMI_RECEIPT',
        title: `Installment Scheme #${item.raw.schemeNumber}`,
        data: item.raw,
      });
    } else if (item.type === 'QUOTATION') {
      openPrintModal({
        type: 'INVOICE_A4',
        title: `Price Quotation #${item.raw.quotationNumber}`,
        data: {
          ...item.raw,
          invoiceNumber: item.raw.quotationNumber,
          documentTitle: language === 'bn' ? 'প্রাইস কোটেশন' : 'Price Quotation',
          isQuotation: true,
          dueAmount: item.raw.grandTotal,
          paidAmount: 0,
        },
      });
    }
  };

  const handleNavigateToModule = (item: SearchResultItem) => {
    onClose();
    if (item.type === 'SALE') {
      setActiveTab('sales-list');
    } else if (item.type === 'PURCHASE') {
      setActiveTab('purchase-list');
    } else if (item.type === 'DAYBOOK') {
      setActiveTab('daybook');
    } else if (item.type === 'EXPENSE') {
      setActiveTab('expenses');
    } else if (item.type === 'INSTALLMENT') {
      setActiveTab('installments');
    } else if (item.type === 'WARRANTY_RECORD' || item.type === 'WARRANTY_CLAIM') {
      setActiveTab('warranties');
    } else if (item.type === 'QUOTATION') {
      setActiveTab('quotations');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setSelectedResult(null);
              }}
              placeholder={
                language === 'bn'
                  ? 'যে কোন Voucher No, Invoice (INV-...), Bill (PUR-...), Expense বা Ref নম্বর লিখুন...'
                  : 'Search any Voucher No, Invoice (INV-...), Bill (PUR-...), Expense, or Ref number...'
              }
              className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedResult(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* If a result is selected for drilldown details */}
          {selectedResult ? (
            <div className="space-y-4">
              {/* Back to results button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedResult(null)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  ← {language === 'bn' ? 'অনুসন্ধান তালিকায় ফিরে যান' : 'Back to Search Results'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintDocument(selectedResult)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিন্ট ভাউচার' : 'Print Voucher'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigateToModule(selectedResult)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'মডিউলে দেখুন' : 'Open in Module'}</span>
                  </button>
                </div>
              </div>

              {/* Detailed Voucher Card */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {selectedResult.type}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {selectedResult.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{selectedResult.date}</span>
                      {selectedResult.raw.createdAt && (
                        <>
                          <span>•</span>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{selectedResult.raw.createdAt}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-medium block">Total Amount</span>
                    <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                      {formatCurrency(selectedResult.amount)}
                    </span>
                  </div>
                </div>

                {/* Specific details based on voucher type */}
                {/* 1. SALE INVOICE DETAIL */}
                {selectedResult.type === 'SALE' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedResult.raw.customerName}
                        </span>
                        {selectedResult.raw.customerPhone && (
                          <span className="text-slate-500 block text-[11px]">{selectedResult.raw.customerPhone}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Status</span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            selectedResult.raw.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : selectedResult.raw.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {selectedResult.raw.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Paid / Due</span>
                        <span className="text-emerald-600 font-bold font-mono">
                          Paid: {formatCurrency(selectedResult.raw.paidAmount)}
                        </span>
                        {selectedResult.raw.dueAmount > 0 && (
                          <span className="text-rose-600 block font-bold font-mono">
                            Due: {formatCurrency(selectedResult.raw.dueAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold border-b">
                          <tr>
                            <th className="py-2 px-3">Item</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Rate</th>
                            <th className="py-2 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedResult.raw.items?.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                {item.productName || item.name}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-blue-600">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. PURCHASE BILL DETAIL */}
                {selectedResult.type === 'PURCHASE' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedResult.raw.supplierName}
                        </span>
                        {selectedResult.raw.supplierPhone && (
                          <span className="text-slate-500 block text-[11px]">{selectedResult.raw.supplierPhone}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier Inv Ref</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {selectedResult.raw.supplierInvoiceNo || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Paid / Due</span>
                        <span className="text-emerald-600 font-bold font-mono">
                          Paid: {formatCurrency(selectedResult.raw.paidAmount)}
                        </span>
                        {selectedResult.raw.dueAmount > 0 && (
                          <span className="text-rose-600 block font-bold font-mono">
                            Due: {formatCurrency(selectedResult.raw.dueAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold border-b">
                          <tr>
                            <th className="py-2 px-3">Purchased Item</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Purchase Price</th>
                            <th className="py-2 px-3 text-right">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedResult.raw.items?.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                {item.productName || item.name}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-sky-600">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono">{formatCurrency(item.purchasePrice)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. DAY BOOK / VOUCHER DETAIL */}
                {selectedResult.type === 'DAYBOOK' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Party / Account</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedResult.raw.partyName || selectedResult.raw.walletName || 'General Account'}
                        </span>
                        {selectedResult.raw.partyType && (
                          <span className="text-[10px] text-slate-500 block">Type: {selectedResult.raw.partyType}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Wallet / Mode</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {selectedResult.raw.walletName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Flow Type</span>
                        <span
                          className={`font-bold font-mono ${
                            selectedResult.raw.flow === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {selectedResult.raw.flow === 'IN' ? 'Cash In (+)' : 'Cash Out (-)'}
                        </span>
                      </div>
                    </div>
                    {selectedResult.raw.remarks && (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Remarks / Notes</span>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selectedResult.raw.remarks}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. EXPENSE DETAIL */}
                {selectedResult.type === 'EXPENSE' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedResult.raw.categoryName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Paid To / Payee</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {selectedResult.raw.payee || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Method</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {selectedResult.raw.paymentMethod || 'CASH'}
                        </span>
                      </div>
                    </div>
                    {(selectedResult.raw.note || selectedResult.raw.remarks) && (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Expense Notes</span>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                          {selectedResult.raw.note || selectedResult.raw.remarks}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. WARRANTY RECORD DETAIL */}
                {selectedResult.type === 'WARRANTY_RECORD' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                            {selectedResult.raw.productName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {language === 'bn' ? 'ওয়ারেন্টি কার্ড: ' : 'Warranty Card: '}
                            <strong className="text-slate-700 dark:text-slate-300 font-mono">{selectedResult.raw.warrantyCode}</strong>
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                          selectedResult.raw.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : selectedResult.raw.status === 'CLAIMED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {selectedResult.raw.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Serial / IMEI No</span>
                        <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm block">
                          {selectedResult.raw.serialNumber || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Invoice Ref</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                          #{selectedResult.raw.invoiceNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Info</span>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {selectedResult.raw.customerName}
                        </span>
                        {selectedResult.raw.customerPhone && (
                          <span className="text-slate-500 text-[11px] block">{selectedResult.raw.customerPhone}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Purchase Date</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">
                          {selectedResult.raw.saleDate || selectedResult.raw.createdAt}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Warranty Period</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {selectedResult.raw.duration} {selectedResult.raw.durationUnit} ({selectedResult.raw.warrantyType})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Expiry Date</span>
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                          {selectedResult.raw.expiryDate}
                        </span>
                      </div>
                    </div>

                    {selectedResult.raw.terms && (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Terms & Conditions</span>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selectedResult.raw.terms}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. WARRANTY CLAIM DETAIL */}
                {selectedResult.type === 'WARRANTY_CLAIM' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Wrench className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                            Ticket #{selectedResult.raw.claimTicketNo}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {language === 'bn' ? 'সিরিয়াল / IMEI: ' : 'Serial / IMEI: '}
                            <strong className="text-slate-700 dark:text-slate-300 font-mono">{selectedResult.raw.serialNumber || 'N/A'}</strong>
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {selectedResult.raw.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Product Name</span>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {selectedResult.raw.productName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Info</span>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {selectedResult.raw.customerName}
                        </span>
                        {selectedResult.raw.customerPhone && (
                          <span className="text-slate-500 text-[11px] block">{selectedResult.raw.customerPhone}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Service Charge</span>
                        <span className="font-mono font-extrabold text-slate-900 dark:text-white block">
                          {formatCurrency(selectedResult.raw.customerCharge || selectedResult.raw.repairCost || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Reported Problem / Issue</span>
                      <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{selectedResult.raw.issueDescription}</p>
                    </div>

                    {selectedResult.raw.technicianNotes && (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Technician / Service Notes</span>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selectedResult.raw.technicianNotes}</p>
                      </div>
                    )}

                    {selectedResult.raw.actionsHistory && selectedResult.raw.actionsHistory.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Status Action Timeline</span>
                        <div className="space-y-1.5 border-l-2 border-amber-300 dark:border-amber-700 pl-3">
                          {selectedResult.raw.actionsHistory.map((act: any) => (
                            <div key={act.id} className="text-[11px]">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-amber-700 dark:text-amber-400">{act.status}</span>
                                <span className="text-slate-400">• {act.date}</span>
                                {act.updatedBy && <span className="text-slate-400">({act.updatedBy})</span>}
                              </div>
                              {act.note && <p className="text-slate-600 dark:text-slate-400">{act.note}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 7. QUOTATION DETAIL */}
                {selectedResult.type === 'QUOTATION' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <div className="bg-purple-50/70 dark:bg-purple-950/40 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileCheck className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0" />
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                            {language === 'bn' ? 'প্রাইস কোটেশন' : 'Price Quotation'} #{selectedResult.raw.quotationNumber}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {language === 'bn' ? 'তারিখ: ' : 'Date: '}
                            <strong className="text-slate-700 dark:text-slate-300 font-mono">{selectedResult.raw.date}</strong>
                            {selectedResult.raw.expiryDate && (
                              <span> • Expiry: <strong className="text-slate-700 dark:text-slate-300 font-mono">{selectedResult.raw.expiryDate}</strong></span>
                            )}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                          selectedResult.raw.status === 'APPROVED' || selectedResult.raw.status === 'CONVERTED_TO_SALE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : selectedResult.raw.status === 'REJECTED' || selectedResult.raw.status === 'EXPIRED'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {selectedResult.raw.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Name</span>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {selectedResult.raw.customerName}
                        </span>
                        {selectedResult.raw.customerPhone && (
                          <span className="text-slate-500 text-[11px] block">{selectedResult.raw.customerPhone}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Items</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {(selectedResult.raw.items || []).length} Items
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Grand Total</span>
                        <span className="font-mono font-extrabold text-purple-600 dark:text-purple-400 text-sm block">
                          {formatCurrency(selectedResult.raw.grandTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Items List Table */}
                    {selectedResult.raw.items && selectedResult.raw.items.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-[11px] text-slate-600 dark:text-slate-400">
                          {language === 'bn' ? 'কোটেশন আইটেম বিবরণ' : 'Quotation Item Details'}
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedResult.raw.items.map((item: any, idx: number) => (
                            <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                  {item.name || item.nameBn}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {item.quantity} {item.unit || 'Pcs'} × {formatCurrency(item.unitPrice)}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {formatCurrency(item.total)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedResult.raw.notes && (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Notes / Terms</span>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selectedResult.raw.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Results List */
            <div className="space-y-2">
              {query.trim() === '' ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'bn'
                      ? 'Price Quotation, Ticket No, Serial/IMEI, ইনভয়েস বা কাস্টমার দিয়ে খুঁজুন'
                      : 'Search by Price Quotation, Ticket No, Serial / IMEI No, Invoice or Customer'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'উদাহরণ: Price Quotation (QT-2026-001), RMA-2026-001 (Ticket), SN-DL-9948'
                      : 'Examples: Price Quotation (QT-2026-001), RMA-2026-001 (Ticket), SN-DL-9948'}
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-amber-500/70" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'bn'
                      ? `"${query}" এর সাথে কোনো প্রাইস কোটেশন, টিকিট বা ভাউচার মেলেনি`
                      : `No Price Quotation, Ticket, Serial/IMEI, or voucher found matching "${query}"`}
                  </p>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'দয়া করে কোটেশন নম্বর বা কাস্টমারের তথ্য সঠিক কি না যাচাই করুন।'
                      : 'Please check the quotation number or customer details and try again.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-xs font-bold text-slate-500">
                      {searchResults.length} {language === 'bn' ? 'টি ফলাফল পাওয়া গেছে' : 'records found'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {searchResults.map(item => {
                      const isSale = item.type === 'SALE';
                      const isPurchase = item.type === 'PURCHASE';
                      const isDayBook = item.type === 'DAYBOOK';
                      const isExpense = item.type === 'EXPENSE';
                      const isInstallment = item.type === 'INSTALLMENT';
                      const isWarrantyRec = item.type === 'WARRANTY_RECORD';
                      const isWarrantyClaim = item.type === 'WARRANTY_CLAIM';
                      const isQuotation = item.type === 'QUOTATION';

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedResult(item)}
                          className="p-3.5 bg-white dark:bg-slate-800/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isSale
                                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                                  : isPurchase
                                  ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                                  : isExpense
                                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                                  : isInstallment
                                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                                  : isWarrantyRec
                                  ? 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400'
                                  : isWarrantyClaim
                                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                                  : isQuotation
                                  ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                              }`}
                            >
                              {isSale && <Receipt className="w-5 h-5" />}
                              {isPurchase && <ShoppingBag className="w-5 h-5" />}
                              {isExpense && <DollarSign className="w-5 h-5" />}
                              {isInstallment && <CreditCard className="w-5 h-5" />}
                              {isWarrantyRec && <ShieldCheck className="w-5 h-5" />}
                              {isWarrantyClaim && <Wrench className="w-5 h-5" />}
                              {isQuotation && <FileCheck className="w-5 h-5" />}
                              {isDayBook && <FileText className="w-5 h-5" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono">
                                  {item.voucherNo}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    isSale
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                      : isPurchase
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                      : isExpense
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                      : isInstallment
                                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                      : isWarrantyRec
                                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                      : isWarrantyClaim
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                      : isQuotation
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}
                                >
                                  {item.type}
                                </span>
                                {item.status && (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    • {item.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                {item.subtitle}
                              </p>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                <span>{item.date}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {item.amount > 0 && (
                              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white block">
                                {formatCurrency(item.amount)}
                              </span>
                            )}
                            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold group-hover:underline inline-flex items-center gap-1 mt-1">
                              View Details →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{language === 'bn' ? 'দ্রুত ভাউচার সার্চ সিস্টেম' : 'Instant Voucher Lookup Engine'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold cursor-pointer"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
