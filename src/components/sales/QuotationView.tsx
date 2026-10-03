import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Quotation, QuotationStatus, QuotationItem, Party, Product, PaymentMethod } from '../../types';
import { canUserDelete } from '../../utils/permissions';
import { MultiUserAuditTrail } from '../common/MultiUserAuditTrail';
import { 
  FileText, Plus, Search, Filter, Printer, Download, Trash2, 
  CheckCircle2, Send, Clock, AlertTriangle, X, Phone, Calendar, 
  Receipt, ShoppingCart, User, ArrowRight, ClipboardList,
  TrendingUp, Wallet, CreditCard, Coins, BarChart3, PieChart, Layers,
  MessageCircle
} from 'lucide-react';

export const QuotationView: React.FC = () => {
  const { 
    quotations, addQuotation, updateQuotationStatus, convertQuotationToSale, deleteQuotation,
    parties, products, wallets, language, showToast, currentUser, users, openPrintModal,
    formatCurrency, saleInvoices
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);

  // New Quotation form state
  const [customerId, setCustomerId] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [qItems, setQItems] = useState<QuotationItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('flat');

  // Selected product input helper
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  // Convert to Sale state
  const [convertingQ, setConvertingQ] = useState<Quotation | null>(null);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [walletId, setWalletId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Auto-set defaults when converting modal opens
  React.useEffect(() => {
    if (convertingQ) {
      setPaidAmount(convertingQ.grandTotal);
      if (wallets.length > 0) {
        const activeWallet = wallets.find(w => w.isActive) || wallets[0];
        setWalletId(activeWallet.id);
      }
    }
  }, [convertingQ, wallets]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const matchSearch =
        !searchQuery ||
        q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customerPhone.includes(searchQuery);

      const matchStatus = selectedStatus === 'ALL' || q.status === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [quotations, searchQuery, selectedStatus]);

  const customers = useMemo(() => parties.filter(p => p.type === 'CUSTOMER'), [parties]);

  const handleAddItem = () => {
    if (!selectedProductId) {
      showToast(language === 'bn' ? 'দয়া করে একটি পণ্য সিলেক্ট করুন।' : 'Please select a product.', 'error');
      return;
    }
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const qty = Number(quantity) || 1;
    const price = Number(unitPrice) || prod.salesPrice || 0;

    const existingIndex = qItems.findIndex(i => i.productId === prod.id);
    if (existingIndex > -1) {
      const updated = [...qItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].unitPrice = price;
      updated[existingIndex].total = updated[existingIndex].quantity * price;
      setQItems(updated);
    } else {
      setQItems([
        ...qItems,
        {
          productId: prod.id,
          name: prod.name,
          nameBn: prod.nameBn,
          unit: prod.unit || 'Pcs',
          quantity: qty,
          unitPrice: price,
          discount: 0,
          discountType: 'flat',
          taxPercent: 0,
          total: qty * price,
        }
      ]);
    }
    setSelectedProductId('');
    setQuantity(1);
    setUnitPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setQItems(qItems.filter((_, idx) => idx !== index));
  };

  const subtotal = qItems.reduce((acc, item) => acc + item.total, 0);
  const calculatedDiscount = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const grandTotal = Math.max(0, subtotal - (Number(calculatedDiscount) || 0));

  const handleSaveQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      showToast(language === 'bn' ? 'দয়া করে কাস্টমার সিলেক্ট করুন।' : 'Please select a customer.', 'error');
      return;
    }
    if (qItems.length === 0) {
      showToast(language === 'bn' ? 'কোটেশনে অন্তত একটি পণ্য যোগ করুন।' : 'Add at least one item to quotation.', 'error');
      return;
    }

    const cust = customers.find(c => c.id === customerId);

    addQuotation({
      date: new Date().toISOString().split('T')[0],
      expiryDate,
      customerId,
      customerName: cust?.name || 'Customer',
      customerPhone: cust?.phone || '',
      customerAddress: cust?.address || '',
      items: qItems,
      subtotal,
      discount: Number(discount) || 0,
      discountType,
      taxAmount: 0,
      grandTotal,
      status: 'DRAFT',
      notes,
    });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCustomerId('');
    setExpiryDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setNotes('');
    setQItems([]);
    setDiscount(0);
    setDiscountType('flat');
  };

  const handleConfirmConvert = () => {
    if (!convertingQ) return;
    
    const finalWallet = walletId || (wallets.length > 0 ? wallets[0].id : '');
    if (!finalWallet && paymentMethod !== 'DUE') {
      showToast(language === 'bn' ? 'দয়া করে একটি ওয়ালেট সিলেক্ট করুন।' : 'Please select a wallet.', 'error');
      return;
    }

    const sale = convertQuotationToSale(convertingQ.id, paidAmount, finalWallet, paymentMethod);
    if (sale) {
      setConvertingQ(null);
      setPaidAmount(0);
      setWalletId('');
      setPaymentMethod('CASH');
    }
  };

  const handlePrintList = () => {
    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'কোটেশন তালিকা' : 'PRICE QUOTATION LIST',
      data: {
        reportTitle: language === 'bn' ? 'কোটেশন তালিকা' : 'PRICE QUOTATION LIST',
        period: 'All Time',
        columns: [
          { header: 'Date', key: 'date' },
          { header: 'Quote No', key: 'quoteNo' },
          { header: 'Customer', key: 'customer' },
          { header: 'Status', key: 'status', align: 'center' },
          { header: 'Total', key: 'total', align: 'right', format: 'currency' }
        ],
        rows: filteredQuotations.map(q => ({
          date: q.date,
          quoteNo: q.id,
          customer: q.customerName,
          status: q.status,
          total: q.grandTotal
        })),
        totals: {
          total: filteredQuotations.reduce((acc, q) => acc + q.grandTotal, 0)
        }
      }
    });
  };

  const handlePrintQuotation = (q: Quotation) => {
    // Get the latest version from state to ensure we have convertedSaleInvoiceId if it was just converted
    const latestQ = quotations.find(item => item.id === q.id) || q;
    
    let printDue = latestQ.grandTotal;
    let printPaid = 0;

    if (latestQ.status === 'CONVERTED_TO_SALE') {
      // Try to find the sale by ID first, then fallback to quotation number in notes
      const sale = saleInvoices.find(s => 
        (latestQ.convertedSaleInvoiceId && s.id === latestQ.convertedSaleInvoiceId) || 
        (s.notes && s.notes.includes(`#${latestQ.quotationNumber}`))
      );
      
      if (sale) {
        printDue = sale.dueAmount;
        printPaid = sale.paidAmount;
      }
    }

    openPrintModal({
      type: 'INVOICE_A4',
      title: `Price Quotation #${latestQ.quotationNumber}`,
      data: {
        ...latestQ,
        invoiceNumber: latestQ.quotationNumber,
        documentTitle: language === 'bn' ? 'প্রাইস কোটেশন' : 'Price Quotation',
        isQuotation: true,
        dueAmount: printDue,
        paidAmount: printPaid
      },
    });
  };

  const handleExportCSV = () => {
    if (quotations.length === 0) {
      showToast(language === 'bn' ? 'এক্সপোর্ট করার জন্য কোনো কোটেশন নেই।' : 'No quotations to export.', 'info');
      return;
    }
    const headers = ['Quotation No', 'Date', 'Customer Name', 'Customer Phone', 'Status', 'Total Items', 'Grand Total', 'Expiry Date'];
    const rows = filteredQuotations.map(q => [
      `"${q.quotationNumber}"`,
      `"${q.date}"`,
      `"${(q.customerName || '').replace(/"/g, '""')}"`,
      `"${q.customerPhone || ''}"`,
      `"${q.status}"`,
      q.items.length,
      q.grandTotal,
      `"${q.expiryDate || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `quotations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(language === 'bn' ? 'কোটেশন CSV ডাউনলোড সম্পন্ন হয়েছে!' : 'Quotations exported to CSV successfully!', 'success');
  };

  const handleShareWhatsApp = (q: Quotation) => {
    const cleanPhone = (q.customerPhone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('88') ? cleanPhone : (cleanPhone.startsWith('0') ? '88' + cleanPhone : cleanPhone);
    const itemList = q.items.map((it, idx) => `${idx + 1}. ${it.name} - ${it.quantity} x ${formatCurrency(it.unitPrice)} = ${formatCurrency(it.total)}`).join('\n');
    const text = language === 'bn'
      ? `সম্মানিত ${q.customerName},\nআপনার জন্য প্রস্তুতকৃত প্রাইস কোটেশন (#${q.quotationNumber}):\n\n${itemList}\n\nমোট মূল্য: ${formatCurrency(q.grandTotal)}\nমেয়াদ: ${q.expiryDate || 'N/A'}\n\nধন্যবাদ!`
      : `Dear ${q.customerName},\nPrice Quotation #${q.quotationNumber}:\n\n${itemList}\n\nGrand Total: ${formatCurrency(q.grandTotal)}\nValid Until: ${q.expiryDate || 'N/A'}\n\nThank you!`;
    const url = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const quotationMetrics = useMemo(() => {
    let totalCount = quotations.length;
    let totalValue = 0;

    let draftCount = 0;
    let draftValue = 0;

    let sentCount = 0;
    let sentValue = 0;

    let approvedCount = 0;
    let approvedValue = 0;

    let deliveredCount = 0; // CONVERTED_TO_SALE
    let deliveredValue = 0;

    let totalPaid = 0;
    let totalDue = 0;

    quotations.forEach(q => {
      const val = q.grandTotal;
      totalValue += val;

      if (q.status === 'DRAFT') {
        draftCount++;
        draftValue += val;
        totalDue += val;
      } else if (q.status === 'SENT') {
        sentCount++;
        sentValue += val;
        totalDue += val;
      } else if (q.status === 'APPROVED') {
        approvedCount++;
        approvedValue += val;
        totalDue += val;
      } else if (q.status === 'CONVERTED_TO_SALE') {
        deliveredCount++;
        deliveredValue += val;

        const sale = saleInvoices.find(s => 
          (q.convertedSaleInvoiceId && s.id === q.convertedSaleInvoiceId) ||
          (s.notes && s.notes.includes(`#${q.quotationNumber}`))
        );

        if (sale) {
          totalPaid += sale.paidAmount;
          totalDue += sale.dueAmount;
        } else {
          totalDue += val;
        }
      } else if (q.status === 'CANCELLED') {
        // We can track cancelled or let it be
      }
    });

    return {
      totalCount,
      totalValue,
      draftCount,
      draftValue,
      sentCount,
      sentValue,
      approvedCount,
      approvedValue,
      deliveredCount,
      deliveredValue,
      totalPaid,
      totalDue
    };
  }, [quotations, saleInvoices]);

  return (
    <div className="p-1 sm:p-4 space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {language === 'bn' ? 'প্রাইস কোটেশন ম্যানেজমেন্ট' : 'Price Quotation Management'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {language === 'bn' ? 'কাস্টমারদের জন্য কোটেশন তৈরি ও পরিচালনা করুন' : 'Create and manage quotations for customers'}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
          title="Export Quotations to CSV/Excel"
        >
          <Download className="w-5 h-5" />
          <span>{language === 'bn' ? 'এক্সপোর্ট CSV' : 'Export CSV'}</span>
        </button>
        <button
          type="button"
          onClick={handlePrintList}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
        >
          <Printer className="w-5 h-5" />
          <span>{language === 'bn' ? 'লিস্ট প্রিন্ট' : 'Print List'}</span>
        </button>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>{language === 'bn' ? 'নতুন কোটেশন' : 'New Quotation'}</span>
        </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'bn' ? 'কোটেশন নং বা কাস্টমার দিয়ে খুঁজুন...' : 'Search by QT # or Customer...'}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-hidden text-slate-900 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-900 dark:text-white"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">{language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="CONVERTED_TO_SALE">{language === 'bn' ? 'বিক্রয়ে রূপান্তরিত' : 'CONVERTED TO SALE'}</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Price Quotations */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {language === 'bn' ? 'মোট কোটেশন' : 'Total Quotations'}
              </span>
              <div className="text-lg font-black font-mono text-slate-950 dark:text-white mt-1.5 break-all">
                {formatCurrency(quotationMetrics.totalValue)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>{language === 'bn' ? `মোট: ${quotationMetrics.totalCount} পিস` : `Total: ${quotationMetrics.totalCount} Pcs`}</span>
          </div>
        </div>

        {/* Draft */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? 'খসড়া (Draft)' : 'Draft'}
              </span>
              <div className="text-lg font-black font-mono text-slate-600 dark:text-slate-400 mt-1.5 break-all">
                {formatCurrency(quotationMetrics.draftValue)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>{language === 'bn' ? `সংখ্যা: ${quotationMetrics.draftCount} পিস` : `Count: ${quotationMetrics.draftCount} Pcs`}</span>
          </div>
        </div>

        {/* Sent */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">
                {language === 'bn' ? 'পাঠানো হয়েছে (Sent)' : 'Sent'}
              </span>
              <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-500 mt-1.5 break-all">
                {formatCurrency(quotationMetrics.sentValue)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{language === 'bn' ? `সংখ্যা: ${quotationMetrics.sentCount} পিস` : `Count: ${quotationMetrics.sentCount} Pcs`}</span>
          </div>
        </div>

        {/* Approved */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-sky-500 uppercase tracking-wider block">
                {language === 'bn' ? 'অনুমোদিত (Approved)' : 'Approved'}
              </span>
              <div className="text-lg font-black font-mono text-sky-600 dark:text-sky-400 mt-1.5 break-all">
                {formatCurrency(quotationMetrics.approvedValue)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-sky-600 dark:text-sky-400 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span>{language === 'bn' ? `সংখ্যা: ${quotationMetrics.approvedCount} পিস` : `Count: ${quotationMetrics.approvedCount} Pcs`}</span>
          </div>
        </div>

        {/* Delivered / Converted */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">
                {language === 'bn' ? 'ডেলিভারড (Deliver)' : 'Deliver'}
              </span>
              <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-500 mt-1.5 break-all">
                {formatCurrency(quotationMetrics.deliveredValue)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{language === 'bn' ? `সংখ্যা: ${quotationMetrics.deliveredCount} পিস` : `Count: ${quotationMetrics.deliveredCount} Pcs`}</span>
          </div>
        </div>

        {/* Paid & Due balances */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider block">
                {language === 'bn' ? 'পরিশোধ ও বকেয়া' : 'Paid / Due'}
              </span>
              <div className="grid grid-cols-2 gap-1 mt-1.5">
                <div>
                  <div className="text-[9px] text-teal-600 dark:text-teal-400 font-bold uppercase">{language === 'bn' ? 'পেইড' : 'Paid'}</div>
                  <div className="text-xs font-black font-mono text-teal-600 dark:text-teal-400">{formatCurrency(quotationMetrics.totalPaid)}</div>
                </div>
                <div className="border-l border-slate-150 dark:border-slate-800 pl-2">
                  <div className="text-[9px] text-rose-500 font-bold uppercase">{language === 'bn' ? 'বাকি' : 'Due'}</div>
                  <div className="text-xs font-black font-mono text-rose-600 dark:text-rose-500">{formatCurrency(quotationMetrics.totalDue)}</div>
                </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-2xs">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-2 font-semibold">
            <span>{language === 'bn' ? 'লেনদেনের হার' : 'Pay Ratio'}</span>
            <span className="text-teal-600 dark:text-teal-400 font-mono">
              {quotationMetrics.totalValue > 0 ? Math.round((quotationMetrics.totalPaid / quotationMetrics.totalValue) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Status Wise Value Comparison (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'bn' ? 'অবস্থা ভিত্তিক টাকার চার্ট' : 'Status-wise Value Breakdown'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              {language === 'bn' ? 'কোটেশনের স্থিতি অনুযায়ী মোট টাকার বিশ্লেষণ' : 'Distribution of financial values across various quotation states'}
            </p>

            {/* Custom Interactive SVG/HTML Bar Chart */}
            <div className="space-y-4">
              {[
                { 
                  label: language === 'bn' ? 'খসড়া (DRAFT)' : 'DRAFT', 
                  value: quotationMetrics.draftValue, 
                  count: quotationMetrics.draftCount,
                  colorClass: 'bg-slate-400 dark:bg-slate-600',
                  textColor: 'text-slate-600 dark:text-slate-400',
                  badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                },
                { 
                  label: language === 'bn' ? 'পাঠানো হয়েছে (SENT)' : 'SENT', 
                  value: quotationMetrics.sentValue, 
                  count: quotationMetrics.sentCount,
                  colorClass: 'bg-amber-500',
                  textColor: 'text-amber-600 dark:text-amber-400',
                  badgeColor: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                },
                { 
                  label: language === 'bn' ? 'অনুমোদিত (APPROVED)' : 'APPROVED', 
                  value: quotationMetrics.approvedValue, 
                  count: quotationMetrics.approvedCount,
                  colorClass: 'bg-sky-500',
                  textColor: 'text-sky-600 dark:text-sky-400',
                  badgeColor: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400'
                },
                { 
                  label: language === 'bn' ? 'ডেলিভারড (DELIVER)' : 'DELIVER', 
                  value: quotationMetrics.deliveredValue, 
                  count: quotationMetrics.deliveredCount,
                  colorClass: 'bg-emerald-500',
                  textColor: 'text-emerald-600 dark:text-emerald-400',
                  badgeColor: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                }
              ].map((status, index) => {
                const percent = quotationMetrics.totalValue > 0 ? (status.value / quotationMetrics.totalValue) * 100 : 0;
                return (
                  <div key={index} className="group/bar space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status.badgeColor}`}>
                          {status.label}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 font-medium">
                          ({status.count} {language === 'bn' ? 'পিস' : 'Pcs'})
                        </span>
                      </div>
                      <div className="text-right font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(status.value)} <span className="text-[10px] font-normal text-slate-400 font-sans">({Math.round(percent)}%)</span>
                      </div>
                    </div>
                    {/* Progress Track */}
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/60 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${status.colorClass} rounded-full transition-all duration-1000 ease-out origin-left group-hover/bar:brightness-105`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/50 pt-4 mt-6 flex justify-between text-xs text-slate-400 font-medium">
            <span>{language === 'bn' ? '* খসড়া ব্যতীত বাকি কোটেশনগুলো প্রক্রিয়াধীন থাকে।' : '* Values reflect final grand totals per state.'}</span>
            <span className="font-bold text-slate-500 dark:text-slate-400">
              {language === 'bn' ? `মোট মূল্য: ${formatCurrency(quotationMetrics.totalValue)}` : `Sum: ${formatCurrency(quotationMetrics.totalValue)}`}
            </span>
          </div>
        </div>

        {/* Right Card: Financial Health & Conversion (Donut & Balance chart) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'bn' ? 'আর্থিক লেনদেন ও আদায় চার্ট' : 'Quotation Payment & Outstanding Chart'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              {language === 'bn' ? 'মোট মূল্যের বিপরীতে পরিশোধিত ও বাকী টাকার তুলনামূলক অনুপাত' : 'Comparison of paid vs outstanding due values of quotations'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Custom SVG Circular Ring Visualizer */}
              <div className="md:col-span-5 flex justify-center relative">
                {(() => {
                  const paidPct = quotationMetrics.totalValue > 0 ? (quotationMetrics.totalPaid / quotationMetrics.totalValue) * 100 : 0;
                  const duePct = quotationMetrics.totalValue > 0 ? (quotationMetrics.totalDue / quotationMetrics.totalValue) * 100 : 100;
                  const strokeWidth = 10;
                  const radius = 50;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (paidPct / 100) * circumference;

                  return (
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        {/* Background track (Total/Due track color) */}
                        <circle
                          cx="72"
                          cy="72"
                          r={radius}
                          className="stroke-rose-100 dark:stroke-rose-950/40 fill-transparent"
                          strokeWidth={strokeWidth}
                        />
                        {/* Interactive dynamic paid track */}
                        <circle
                          cx="72"
                          cy="72"
                          r={radius}
                          className="stroke-teal-500 dark:stroke-teal-400 fill-transparent transition-all duration-1000 ease-out"
                          strokeWidth={strokeWidth}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      {/* Central textual label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black font-mono text-slate-950 dark:text-white">
                          {Math.round(paidPct)}%
                        </span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">
                          {language === 'bn' ? 'পরিশোধিত' : 'Paid'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Legendary Information list */}
              <div className="md:col-span-7 space-y-4">
                {/* Total Item */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">{language === 'bn' ? 'মোট টাকা (Total)' : 'Total Amount'}</span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">{formatCurrency(quotationMetrics.totalValue)}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-slate-600 dark:bg-slate-400 h-full w-full" />
                  </div>
                </div>

                {/* Paid Item */}
                <div className="p-3 bg-teal-50/50 dark:bg-teal-950/10 rounded-xl border border-teal-100/50 dark:border-teal-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-teal-700 dark:text-teal-400 font-bold">{language === 'bn' ? 'পেইড (Paid)' : 'Paid Amount'}</span>
                    <span className="font-black text-xs text-teal-600 dark:text-teal-400 font-mono">
                      {formatCurrency(quotationMetrics.totalPaid)} 
                      <span className="text-[10px] font-normal text-slate-400 ml-1">
                        ({quotationMetrics.totalValue > 0 ? Math.round((quotationMetrics.totalPaid / quotationMetrics.totalValue) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-teal-100 dark:bg-teal-950/55 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="bg-teal-500 h-full transition-all duration-1000 ease-out" 
                      style={{ width: `${quotationMetrics.totalValue > 0 ? (quotationMetrics.totalPaid / quotationMetrics.totalValue) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Due Item */}
                <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 rounded-xl border border-rose-100/50 dark:border-rose-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">{language === 'bn' ? 'বাকী (Due)' : 'Due Amount'}</span>
                    <span className="font-black text-xs text-rose-600 dark:text-rose-500 font-mono">
                      {formatCurrency(quotationMetrics.totalDue)}
                      <span className="text-[10px] font-normal text-slate-400 ml-1">
                        ({quotationMetrics.totalValue > 0 ? Math.round((quotationMetrics.totalDue / quotationMetrics.totalValue) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-rose-100 dark:bg-rose-950/55 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full transition-all duration-1000 ease-out" 
                      style={{ width: `${quotationMetrics.totalValue > 0 ? (quotationMetrics.totalDue / quotationMetrics.totalValue) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/50 pt-4 mt-6 flex justify-between text-xs text-slate-400 font-medium">
            <span>{language === 'bn' ? '* আদায়কৃত ও বকেয়া হিসাব রিয়েল-টাইম আপডেট হয়।' : '* Live tracking based on converted invoice stats.'}</span>
            <span className="text-slate-500 font-semibold">
              {language === 'bn' ? `সংগ্রহের হার: ${quotationMetrics.totalValue > 0 ? Math.round((quotationMetrics.totalPaid / quotationMetrics.totalValue) * 100) : 0}%` : `Col. Rate: ${quotationMetrics.totalValue > 0 ? Math.round((quotationMetrics.totalPaid / quotationMetrics.totalValue) * 100) : 0}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-6">{language === 'bn' ? 'কোটেশন ও তারিখ' : 'QT # & Date'}</th>
                <th className="py-4 px-6">{language === 'bn' ? 'সেল ইনভয়েস #' : 'Sale INV #'}</th>
                <th className="py-4 px-6">{language === 'bn' ? 'পেমেন্ট টাইপ' : 'Payment Type'}</th>
                <th className="py-4 px-6">{language === 'bn' ? 'কাস্টমার বিবরণ' : 'Customer Details'}</th>
                <th className="py-4 px-6">{language === 'bn' ? 'আইটেম' : 'Items'}</th>
                <th className="py-4 px-6">{language === 'bn' ? 'ইউজার তথ্য' : 'User Info'}</th>
                <th className="py-4 px-6 text-right">{language === 'bn' ? 'মোট টাকা' : 'Total Amount'}</th>
                <th className="py-4 px-6 text-center">{language === 'bn' ? 'অবস্থা' : 'Status'}</th>
                <th className="py-4 px-6 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="w-12 h-12 opacity-20" />
                      <p>{language === 'bn' ? 'কোনো কোটেশন পাওয়া যায়নি।' : 'No quotations found.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 dark:text-white">{q.quotationNumber}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {q.date}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {q.convertedSaleInvoiceId ? (
                        <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-bold inline-block">
                          {saleInvoices.find(s => s.id === q.convertedSaleInvoiceId)?.invoiceNumber || 'INV-Linked'}
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">---</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {q.status === 'CONVERTED_TO_SALE' && q.convertedSaleInvoiceId ? (
                        (() => {
                          const sale = saleInvoices.find(s => s.id === q.convertedSaleInvoiceId);
                          if (!sale) return <span className="text-slate-300 dark:text-slate-700">---</span>;
                          
                          // More robust status detection
                          const isFullyPaid = sale.paidAmount >= sale.grandTotal || (sale.dueAmount <= 0 && sale.paidAmount > 0);
                          const isPartial = sale.dueAmount > 0 && sale.paidAmount > 0;
                          const isFullyDue = sale.paidAmount === 0 || sale.paymentMethod === 'DUE';

                          return (
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                              isFullyPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                              isPartial ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                              'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                            }`}>
                              {isFullyPaid ? (language === 'bn' ? 'নগদ (PAID)' : 'PAID') :
                               isPartial ? (language === 'bn' ? 'আংশিক বাকি' : 'PARTIAL') :
                               (language === 'bn' ? 'বাকি (DUE)' : 'DUE')}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">---</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900 dark:text-white">{q.customerName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {q.customerPhone}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {q.items.length} {language === 'bn' ? 'টি আইটেম' : 'Items'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <MultiUserAuditTrail
                        createdBy={q.createdBy}
                        approvedBy={q.approvedBy}
                        convertedBy={q.convertedBy}
                        completedBy={q.completedBy}
                        contributors={q.contributors}
                        displayMode="table-cell"
                      />
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(q.grandTotal)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        q.status === 'CONVERTED_TO_SALE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                        q.status === 'APPROVED' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400' :
                        q.status === 'SENT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                        q.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {q.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        {q.status === 'DRAFT' && (
                          <button
                            onClick={() => updateQuotationStatus(q.id, 'SENT')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                            title="Mark as Sent"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'পাঠান' : 'Send'}</span>
                          </button>
                        )}
                        {q.status === 'SENT' && (
                          <button
                            onClick={() => updateQuotationStatus(q.id, 'APPROVED')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'অ্যাপ্রুভ' : 'Approve'}</span>
                          </button>
                        )}
                        {q.status === 'APPROVED' && (
                          <button
                            onClick={() => setConvertingQ(q)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                            title="Deliver / Convert to Sale"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'ডেলিভারি' : 'Deliver'}</span>
                          </button>
                        )}
                        
                        <div className="flex items-center gap-1 ml-2 border-l border-slate-200 dark:border-slate-800 pl-2">
                          <button
                            onClick={() => setViewingQuotation(q)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                            title="View"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(q)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                            title={language === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান' : 'Share via WhatsApp'}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintQuotation(q)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                            title="Print"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {q.status !== 'CONVERTED_TO_SALE' && canUserDelete(currentUser, 'sales') && (
                            <button
                              onClick={() => {
                                if (confirm(language === 'bn' ? 'আপনি কি নিশ্চিত এই কোটেশনটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this quotation?')) {
                                  deleteQuotation(q.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                              title={language === 'bn' ? 'কোটেশন মুছুন (Delete)' : 'Delete Quotation'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Quotation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                {language === 'bn' ? 'নতুন প্রাইস কোটেশন তৈরি' : 'Create New Price Quotation'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {language === 'bn' ? 'কাস্টমার সিলেক্ট করুন' : 'Select Customer'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-900 dark:text-white"
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                      >
                        <option value="">{language === 'bn' ? 'কাস্টমার নির্বাচন করুন' : 'Select a customer'}</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {language === 'bn' ? 'মেয়াদ শেষ হওয়ার তারিখ' : 'Expiry Date'}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-900 dark:text-white"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {language === 'bn' ? 'নোট / শর্তাবলী' : 'Notes / Terms'}
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-900 dark:text-white resize-none"
                    placeholder={language === 'bn' ? 'অতিরিক্ত কোনো তথ্য বা শর্তাবলী লিখুন...' : 'Enter any terms, conditions or internal notes...'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Product Selection Area */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl mb-6 border border-slate-100 dark:border-slate-800/50">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      {language === 'bn' ? 'পণ্য নির্বাচন করুন' : 'Select Product'}
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-900 dark:text-white"
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const p = products.find(prod => prod.id === e.target.value);
                        if (p) setUnitPrice(p.salesPrice);
                      }}
                    >
                      <option value="">{language === 'bn' ? 'পণ্য বেছে নিন' : 'Choose a product'}</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      {language === 'bn' ? 'পরিমাণ' : 'Quantity'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-900 dark:text-white"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        {language === 'bn' ? 'ইউনিট মূল্য' : 'Unit Price'}
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-900 dark:text-white"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      {language === 'bn' ? 'যোগ করুন' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden mb-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                      <th className="py-3 px-4">{language === 'bn' ? 'পণ্য' : 'Product'}</th>
                      <th className="py-3 px-4 text-center">{language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                      <th className="py-3 px-4 text-right">{language === 'bn' ? 'ইউনিট মূল্য' : 'Unit Price'}</th>
                      <th className="py-3 px-4 text-right">{language === 'bn' ? 'মোট' : 'Total'}</th>
                      <th className="py-3 px-4 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {qItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                          {language === 'bn' ? 'এখনো কোনো পণ্য যোগ করা হয়নি' : 'No items added yet'}
                        </td>
                      </tr>
                    ) : (
                      qItems.map((item, idx) => (
                        <tr key={idx} className="text-sm">
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{item.name}</td>
                          <td className="py-3 px-4 text-center font-mono">{item.quantity} {item.unit}</td>
                          <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(item.total)}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Area */}
              <div className="flex flex-col md:flex-row gap-8 justify-between items-start bg-slate-50 dark:bg-slate-800/20 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex-1 w-full space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                        {language === 'bn' ? 'ডিসকাউন্ট টাইপ' : 'Discount Type'}
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'flat')}
                      >
                        <option value="flat">Fixed Amount (৳)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                        {language === 'bn' ? 'ডিসকাউন্ট পরিমাণ' : 'Discount Value'}
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-80 space-y-3">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="text-sm">{language === 'bn' ? 'সাবটোটাল' : 'Subtotal'}:</span>
                    <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                    <span className="text-sm">{language === 'bn' ? 'মোট ডিসকাউন্ট' : 'Total Discount'}:</span>
                    <span className="font-mono font-bold">- {formatCurrency(calculatedDiscount)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                      {language === 'bn' ? 'সর্বমোট' : 'Grand Total'}
                    </span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-3xl shrink-0">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveQuotation}
                  className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                >
                  {language === 'bn' ? 'কোটেশন সেভ করুন' : 'Save Quotation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Sale Modal */}
      {convertingQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                {language === 'bn' ? 'বিক্রয়ে রূপান্তর (Convert to Sale)' : 'Convert to Sale'}
              </h3>
              <button onClick={() => setConvertingQ(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1">
                  {language === 'bn' ? 'পরিশোধযোগ্য মোট টাকা' : 'Total Payable Amount'}
                </div>
                <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {formatCurrency(convertingQ.grandTotal)}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {language === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'}
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    value={paymentMethod}
                    onChange={(e) => {
                      const method = e.target.value as PaymentMethod;
                      setPaymentMethod(method);
                      if (method === 'DUE') {
                        setPaidAmount(0);
                      } else {
                        setPaidAmount(convertingQ.grandTotal);
                      }
                    }}
                  >
                    <option value="CASH">{language === 'bn' ? 'নগদ পেমেন্ট' : 'Cash Payment'}</option>
                    <option value="BANK">{language === 'bn' ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</option>
                    <option value="MFS">{language === 'bn' ? 'মোবাইল ব্যাংকিং' : 'Mobile Banking'}</option>
                    <option value="DUE">{language === 'bn' ? 'সম্পূর্ণ বাকি' : 'Full Due'}</option>
                  </select>
                </div>

                {paymentMethod !== 'DUE' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {language === 'bn' ? 'জমা দেওয়া পরিমাণ' : 'Paid Amount'}
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Number(e.target.value))}
                        max={convertingQ.grandTotal}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {language === 'bn' ? 'ওয়ালেট / অ্যাকাউন্ট' : 'Payment Wallet'}
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        value={walletId}
                        onChange={(e) => setWalletId(e.target.value)}
                      >
                        <option value="">{language === 'bn' ? 'ওয়ালেট নির্বাচন করুন' : 'Select a wallet'}</option>
                        {wallets.filter(w => w.isActive).map(w => (
                          <option key={w.id} value={w.id}>{w.name} (৳{w.balance.toLocaleString()})</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button
                  onClick={handleConfirmConvert}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
                >
                  {language === 'bn' ? 'বিক্রয় ও ডেলিভারি নিশ্চিত করুন' : 'Confirm Sale & Delivery'}
                </button>
                <div className="text-[10px] text-center text-slate-400 italic">
                  {language === 'bn' ? '* নিশ্চিত করার পর স্টক থেকে পণ্য স্বয়ংক্রিয়ভাবে কমে যাবে।' : '* Confirming will automatically deduct items from product stock.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Quotation Detail: {viewingQuotation.quotationNumber}
                </h3>
                <div className="text-xs text-slate-500">{viewingQuotation.date}</div>
              </div>
              <button onClick={() => setViewingQuotation(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">{language === 'bn' ? 'কাস্টমার' : 'Customer'}</h4>
                  <div className="font-bold text-slate-800 dark:text-white">{viewingQuotation.customerName}</div>
                  <div className="text-xs text-slate-500">{viewingQuotation.customerPhone}</div>
                  <div className="text-xs text-slate-500">{viewingQuotation.customerAddress}</div>
                </div>
                <div className="text-right">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</h4>
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {viewingQuotation.status}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <MultiUserAuditTrail
                  createdBy={viewingQuotation.createdBy}
                  approvedBy={viewingQuotation.approvedBy}
                  convertedBy={viewingQuotation.convertedBy}
                  completedBy={viewingQuotation.completedBy}
                  contributors={viewingQuotation.contributors}
                  createdAt={viewingQuotation.createdAt}
                  displayMode="detailed"
                />
              </div>

              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
                    <tr>
                      <th className="py-2 px-3">{language === 'bn' ? 'পণ্য' : 'Product'}</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {viewingQuotation.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3">{item.name}</td>
                        <td className="py-2 px-3 text-center">{item.quantity}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-bold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="w-48 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-bold">{formatCurrency(viewingQuotation.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-rose-500">
                    <span>Discount:</span>
                    <span className="font-bold">- {formatCurrency(viewingQuotation.discount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-blue-600 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(viewingQuotation.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {viewingQuotation.notes && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                  <div className="font-bold mb-1 uppercase text-[9px] text-slate-400">Notes & Terms</div>
                  {viewingQuotation.notes}
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => handlePrintQuotation(viewingQuotation)}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                <Printer className="w-4 h-4" />
                {language === 'bn' ? 'প্রিন্ট কোটেশন' : 'Print Quotation'}
              </button>
              {viewingQuotation.status === 'SENT' && (
                <button
                  onClick={() => { updateQuotationStatus(viewingQuotation.id, 'APPROVED'); setViewingQuotation(null); }}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'bn' ? 'অ্যাপ্রুভ করুন' : 'Approve Quotation'}
                </button>
              )}
              {viewingQuotation.status === 'APPROVED' && (
                <button
                  onClick={() => { setViewingQuotation(null); setConvertingQ(viewingQuotation); }}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {language === 'bn' ? 'ডেলিভারি / সেল' : 'Deliver / Sale'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
