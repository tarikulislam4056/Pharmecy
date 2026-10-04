import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseOrder, POStatus, PurchaseItem, Party } from '../../types';
import { canUserDelete } from '../../utils/permissions';
import { MultiUserAuditTrail } from '../common/MultiUserAuditTrail';
import { ShoppingCart, Plus, Search, Filter, Printer, Download, Trash2, CheckCircle2, Send, Clock, AlertTriangle, FileText, ArrowRight, X, Building2, Phone, Calendar, Receipt, CreditCard, Wallet } from 'lucide-react';

export const PurchaseOrdersView: React.FC = () => {
  const { purchaseOrders, purchaseInvoices, addPurchaseOrder, updatePurchaseOrderStatus, convertPOToPurchaseBill, deletePurchaseOrder, parties, products, wallets, language, showToast, currentUser, users, openPrintModal, formatCurrency } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);

  // New PO form state
  const [supplierId, setSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState<PurchaseItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);

  // Selected product input helper for PO form
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);

  // Receive PO state
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receivingItems, setReceivingItems] = useState<PurchaseItem[]>([]);
  const [receivingDiscount, setReceivingDiscount] = useState<number>(0);
  const [receivingPaidAmount, setReceivingPaidAmount] = useState<number>(0);
  const [receivingWalletId, setReceivingWalletId] = useState<string>('');
  
  // New product addition inside receive modal
  const [receivingSelectedProductId, setReceivingSelectedProductId] = useState('');
  const [receivingProductQuantity, setReceivingProductQuantity] = useState<number>(1);
  const [receivingProductPrice, setReceivingProductPrice] = useState<number>(0);

  const handleAddReceiveItem = () => {
    if (!receivingSelectedProductId) {
      showToast(language === 'bn' ? 'দয়া করে একটি পণ্য সিলেক্ট করুন।' : 'Please select a product.', 'error');
      return;
    }
    const prod = products.find(p => p.id === receivingSelectedProductId);
    if (!prod) return;

    const qty = Number(receivingProductQuantity) || 1;
    const price = Number(receivingProductPrice) || prod.purchasePrice || 0;

    const existingIndex = receivingItems.findIndex(i => i.productId === prod.id);
    if (existingIndex > -1) {
      const updated = [...receivingItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].purchasePrice = price;
      updated[existingIndex].total = updated[existingIndex].quantity * price;
      setReceivingItems(updated);
    } else {
      setReceivingItems([
        ...receivingItems,
        {
          productId: prod.id,
          productName: prod.name,
          unit: prod.unit || 'Pcs',
          quantity: qty,
          purchasePrice: price,
          total: qty * price,
        }
      ]);
    }

    setReceivingSelectedProductId('');
    setReceivingProductQuantity(1);
    setReceivingProductPrice(0);
  };

  const handleReceiveItemChange = (index: number, field: keyof PurchaseItem, value: string | number) => {
    const updated = [...receivingItems];
    updated[index] = { ...updated[index], [field]: value };
    updated[index].total = updated[index].quantity * updated[index].purchasePrice;
    setReceivingItems(updated);
  };

  const handleRemoveReceiveItem = (index: number) => {
    setReceivingItems(receivingItems.filter((_, idx) => idx !== index));
  };

  const handleConfirmReceive = () => {
    if (!receivingPO) return;
    if (receivingItems.length === 0) {
      showToast(language === 'bn' ? 'অন্তত একটি পণ্য থাকতে হবে।' : 'At least one item is required.', 'error');
      return;
    }
    const finalWallet = receivingWalletId || (wallets.length > 0 ? wallets[0].id : undefined);
    const createdBill = convertPOToPurchaseBill(receivingPO.id, receivingItems, receivingDiscount, receivingPaidAmount, finalWallet);
    setReceivingPO(null);

    if (createdBill) {
      showToast(
        language === 'bn' ? `বিল #${createdBill.billNumber} সফলভাবে তৈরি হয়েছে!` : `Bill #${createdBill.billNumber} created successfully!`,
        'success'
      );
      openPrintModal({
        type: 'PURCHASE_VOUCHER',
        title: `Purchase Bill #${createdBill.billNumber}`,
        data: {
          ...createdBill,
          documentTitle: language === 'bn' ? 'ক্রয় বিল / চালান' : 'Purchase Invoice / Bill',
        },
      });
    }
  };

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchSearch =
        !searchQuery ||
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierPhone.includes(searchQuery);

      const matchStatus = selectedStatus === 'ALL' || po.status === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, searchQuery, selectedStatus]);

  const suppliers = useMemo(() => parties.filter(p => p.type === 'SUPPLIER'), [parties]);

  const handleAddItem = () => {
    if (!selectedProductId) {
      showToast(language === 'bn' ? 'দয়া করে একটি পণ্য সিলেক্ট করুন।' : 'Please select a product.', 'error');
      return;
    }
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const qty = Number(quantity) || 1;
    const price = Number(purchasePrice) || prod.purchasePrice || 0;

    const existingIndex = poItems.findIndex(i => i.productId === prod.id);
    if (existingIndex > -1) {
      const updated = [...poItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].purchasePrice = price;
      updated[existingIndex].total = updated[existingIndex].quantity * price;
      setPoItems(updated);
    } else {
      setPoItems([
        ...poItems,
        {
          productId: prod.id,
          productName: prod.name,
          unit: prod.unit || 'Pcs',
          quantity: qty,
          purchasePrice: price,
          total: qty * price,
        }
      ]);
    }
    setSelectedProductId('');
    setQuantity(1);
    setPurchasePrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setPoItems(poItems.filter((_, idx) => idx !== index));
  };

  const subtotal = poItems.reduce((acc, item) => acc + item.total, 0);
  const grandTotal = Math.max(0, subtotal - (Number(discount) || 0));

  const handleSavePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      showToast(language === 'bn' ? 'দয়া করে মহাজন বা সাপ্লায়ার সিলেক্ট করুন।' : 'Please select a supplier.', 'error');
      return;
    }
    if (poItems.length === 0) {
      showToast(language === 'bn' ? 'ক্রয় আদেশে অন্তত একটি পণ্য যোগ করুন।' : 'Add at least one item to purchase order.', 'error');
      return;
    }

    const sup = suppliers.find(s => s.id === supplierId);

    addPurchaseOrder({
      date: new Date().toISOString().split('T')[0],
      expectedDeliveryDate,
      supplierId,
      supplierName: sup?.name || 'Supplier',
      supplierPhone: sup?.phone || '',
      items: poItems,
      subtotal,
      discount: Number(discount) || 0,
      taxAmount: 0,
      grandTotal,
      status: 'PENDING_APPROVAL',
      notes,
    });

    setIsModalOpen(false);
    setSupplierId('');
    setPoItems([]);
    setDiscount(0);
    setNotes('');
  };

  // Helper to determine real payment status for a PO
  const getPoPaymentInfo = (po: PurchaseOrder) => {
    const linkedBill = purchaseInvoices.find(
      inv => inv.supplierInvoiceNo === po.poNumber || (inv.notes && inv.notes.includes(po.poNumber))
    );

    if (linkedBill) {
      return {
        status: linkedBill.status, // 'PAID' | 'PARTIAL' | 'DUE'
        paidAmount: linkedBill.paidAmount,
        dueAmount: linkedBill.dueAmount,
        billNumber: linkedBill.billNumber,
        paymentMethod: linkedBill.paymentMethod,
        walletName: linkedBill.walletName,
      };
    }

    // Unbilled / Unpaid PO defaults to DUE (বাকী)
    return {
      status: 'DUE' as const,
      paidAmount: 0,
      dueAmount: po.grandTotal,
      billNumber: null,
      paymentMethod: 'DUE',
      walletName: 'Credit / বাকি',
    };
  };

  const handlePrintPO = (po: PurchaseOrder, autoDownloadPdf = false) => {
    const paymentInfo = getPoPaymentInfo(po);
    openPrintModal({
      type: 'PURCHASE_VOUCHER',
      title: `Purchase Order #${po.poNumber}`,
      autoDownloadPdf,
      data: {
        ...po,
        documentTitle: language === 'bn' ? 'ক্রয় আদেশ (Purchase Order)' : 'Purchase Order',
        billNumber: po.poNumber,
        paidAmount: paymentInfo.paidAmount,
        dueAmount: paymentInfo.dueAmount,
        paymentMethod: paymentInfo.paymentMethod,
        walletName: paymentInfo.walletName,
        status: paymentInfo.status,
        items: po.items.map(i => ({ ...i, name: i.productName, unitPrice: i.purchasePrice }))
      }
    });
  };

  const handlePrintPurchaseBill = (po: PurchaseOrder, autoDownloadPdf = false) => {
    const linkedBill = purchaseInvoices.find(
      inv => inv.supplierInvoiceNo === po.poNumber || (inv.notes && inv.notes.includes(po.poNumber))
    );

    if (linkedBill) {
      openPrintModal({
        type: 'PURCHASE_VOUCHER',
        title: `Purchase Bill #${linkedBill.billNumber}`,
        autoDownloadPdf,
        data: {
          ...linkedBill,
          documentTitle: language === 'bn' ? 'ক্রয় বিল / চালান' : 'Purchase Invoice / Bill',
        },
      });
    } else {
      openPrintModal({
        type: 'PURCHASE_VOUCHER',
        title: `Purchase Bill (PO #${po.poNumber})`,
        autoDownloadPdf,
        data: {
          id: `pur-po-${po.id}`,
          billNumber: `PUR-BILL-${po.poNumber}`,
          supplierInvoiceNo: po.poNumber,
          date: po.date,
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          supplierPhone: po.supplierPhone,
          items: po.items.map(i => ({ ...i, name: i.productName, unitPrice: i.purchasePrice })),
          subtotal: po.subtotal,
          discount: po.discount,
          taxAmount: po.taxAmount || 0,
          grandTotal: po.grandTotal,
          paidAmount: 0,
          dueAmount: po.grandTotal,
          paymentMethod: 'DUE',
          walletName: 'Credit / বাকি',
          status: 'DUE',
          notes: `Purchase Bill for PO #${po.poNumber}`,
          documentTitle: language === 'bn' ? 'ক্রয় বিল / চালান' : 'Purchase Invoice / Bill',
        },
      });
    }
  };

  const handlePrintPOsReport = (autoDownloadPdf = false) => {
    const printDate = new Date().toLocaleDateString('en-GB');
    const reportTitle = language === 'bn' ? 'ক্রয় আদেশ (PO) পূর্ণাঙ্গ রিপোর্ট' : 'PURCHASE ORDERS SUMMARY REPORT';
    const totalAmount = filteredPOs.reduce((sum, p) => sum + p.grandTotal, 0);

    openPrintModal({
      type: 'REPORT',
      title: reportTitle,
      autoDownloadPdf,
      data: {
        reportTitle,
        period: `${language === 'bn' ? 'তৈরির তারিখ:' : 'Report Date:'} ${printDate}`,
        filters: [
          {
            label: language === 'bn' ? 'স্ট্যাটাস ফিল্টার' : 'Status Filter',
            value: selectedStatus === 'ALL' ? (language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses') : selectedStatus,
          },
        ],
        kpis: [
          { label: language === 'bn' ? 'মোট ক্রয় আদেশ' : 'Total PO Count', value: `${filteredPOs.length}` },
          { label: language === 'bn' ? 'সর্বমোট আদেশ মূল্য' : 'Total PO Value', value: totalAmount },
        ],
        columns: [
          { header: 'PO #', key: 'poNumber' },
          { header: 'Date', key: 'date' },
          { header: 'Supplier', key: 'supplierName' },
          { header: 'Order Status', key: 'status' },
          { header: 'Payment Status', key: 'paymentStatus' },
          { header: 'Grand Total', key: 'grandTotal', align: 'right', format: 'currency' },
          { header: 'Paid', key: 'paidAmount', align: 'right', format: 'currency' },
          { header: 'Due', key: 'dueAmount', align: 'right', format: 'currency' },
        ],
        rows: filteredPOs.map(p => {
          const pInfo = getPoPaymentInfo(p);
          return {
            poNumber: p.poNumber,
            date: p.date,
            supplierName: p.supplierName,
            status: p.status,
            paymentStatus: pInfo.status === 'PAID' ? 'PAID / পরিশোধিত' : pInfo.status === 'PARTIAL' ? 'PARTIAL / আংশিক' : 'DUE / বাকী',
            grandTotal: p.grandTotal,
            paidAmount: pInfo.paidAmount,
            dueAmount: pInfo.dueAmount,
          };
        }),
        totals: {
          supplierName: 'TOTAL',
          grandTotal: totalAmount,
          paidAmount: filteredPOs.reduce((sum, p) => sum + getPoPaymentInfo(p).paidAmount, 0),
          dueAmount: filteredPOs.reduce((sum, p) => sum + getPoPaymentInfo(p).dueAmount, 0),
        },
      },
    });
  };

  const totalPaid = useMemo(() => {
    return purchaseOrders.reduce((sum, p) => sum + getPoPaymentInfo(p).paidAmount, 0);
  }, [purchaseOrders, purchaseInvoices]);

  const totalDue = useMemo(() => {
    return purchaseOrders.reduce((sum, p) => sum + getPoPaymentInfo(p).dueAmount, 0);
  }, [purchaseOrders, purchaseInvoices]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shadow-inner shrink-0">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {language === 'bn' ? 'ক্রয় আদেশ (Purchase Orders - PO)' : 'Purchase Orders Master Management'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'bn' 
                ? 'সাপ্লায়ারদের নিকট পণ্য ক্রয়ের জন্য আদেশ তৈরি করুন, স্ট্যাটাস ট্র্যাক করুন এবং প্রাপ্তির পর এক ক্লিকে পার্চেস বিলে রূপান্তর করুন।'
                : 'Manage procurement requisitions, supplier orders, approval workflows, and seamless conversion into inventory purchase bills.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handlePrintPOsReport(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}</span>
          </button>
          <button
            type="button"
            onClick={() => handlePrintPOsReport(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'bn' ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? '+ নতুন ক্রয় আদেশ (New PO)' : '+ Create Purchase Order'}</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total POs */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? 'মোট ক্রয় আদেশ' : 'Total Purchase Orders'}
              </span>
              <div className="text-xl font-black font-mono text-slate-950 dark:text-white mt-1.5 break-all">
                ৳{purchaseOrders.reduce((acc, p) => acc + p.grandTotal, 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 shadow-2xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>{language === 'bn' ? `মোট: ${purchaseOrders.length} পিস` : `Total: ${purchaseOrders.length} Pcs`}</span>
          </div>
        </div>

        {/* Pending POs */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">
                {language === 'bn' ? 'অনুমোদনের অপেক্ষায়' : 'Pending Orders'}
              </span>
              <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-500 mt-1.5 break-all">
                ৳{purchaseOrders.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT').reduce((acc, p) => acc + p.grandTotal, 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{language === 'bn' ? `সংখ্যা: ${purchaseOrders.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT').length} পিস` : `Count: ${purchaseOrders.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT').length} Pcs`}</span>
          </div>
        </div>

        {/* Approved POs */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-sky-500 uppercase tracking-wider block">
                {language === 'bn' ? 'অনুমোদিত আদেশ' : 'Approved Orders'}
              </span>
              <div className="text-xl font-black font-mono text-sky-600 dark:text-sky-400 mt-1.5 break-all">
                ৳{purchaseOrders.filter(p => p.status === 'APPROVED' || p.status === 'SENT_TO_SUPPLIER').reduce((acc, p) => acc + p.grandTotal, 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-sky-600 dark:text-sky-400 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span>{language === 'bn' ? `সংখ্যা: ${purchaseOrders.filter(p => p.status === 'APPROVED' || p.status === 'SENT_TO_SUPPLIER').length} পিস` : `Count: ${purchaseOrders.filter(p => p.status === 'APPROVED' || p.status === 'SENT_TO_SUPPLIER').length} Pcs`}</span>
          </div>
        </div>

        {/* Fully Received POs */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">
                {language === 'bn' ? 'সম্পূর্ণ প্রাপ্ত' : 'Fully Received'}
              </span>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-500 mt-1.5 break-all">
                ৳{purchaseOrders.filter(p => p.status === 'FULLY_RECEIVED').reduce((acc, p) => acc + p.grandTotal, 0).toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{language === 'bn' ? `সংখ্যা: ${purchaseOrders.filter(p => p.status === 'FULLY_RECEIVED').length} পিস` : `Count: ${purchaseOrders.filter(p => p.status === 'FULLY_RECEIVED').length} Pcs`}</span>
          </div>
        </div>

        {/* Paid Amount */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
                {language === 'bn' ? 'পরিশোধিত (Paid)' : 'Paid Amount'}
              </span>
              <div className="text-xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1.5 break-all">
                ৳{totalPaid.toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 shadow-2xs">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-teal-600 dark:text-teal-400 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />
            <span>{language === 'bn' ? 'পরিশোধ সম্পন্ন' : 'Paid Payments'}</span>
          </div>
        </div>

        {/* Due Amount */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">
                {language === 'bn' ? 'বাকি (Due)' : 'Due Amount'}
              </span>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-500 mt-1.5 break-all">
                ৳{totalDue.toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{language === 'bn' ? 'বকেয়া পাওনা' : 'Due Outstanding'}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            {language === 'bn' ? 'স্ট্যাটাস ফিল্টার' : 'Filter by Status'}
          </label>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
          >
            <option value="ALL">{language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="SENT_TO_SUPPLIER">Sent to Supplier</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="FULLY_RECEIVED">Fully Received / Converted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            {language === 'bn' ? 'অনুসন্ধান (Search PO)' : 'Search PO / Supplier'}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={language === 'bn' ? 'PO নম্বর বা মহাজনের নাম দিয়ে খুঁজুন...' : 'Search PO number, supplier...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">{language === 'bn' ? 'PO নম্বর' : 'PO #'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'বিল নম্বর' : 'Bill #'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'মহাজন' : 'Supplier'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'ফোন নম্বর' : 'Phone'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'প্রত্যাশিত ডেলিভারি' : 'Expected Delivery'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'আইটেম' : 'Items'}</th>
                <th className="py-3 px-4 text-right">{language === 'bn' ? 'গড় ইউনিট দর' : 'Avg. Unit Price'}</th>
                <th className="py-3 px-4 text-right">{language === 'bn' ? 'সর্বমোট মূল্য' : 'Grand Total'}</th>
                <th className="py-3 px-4 text-center">{language === 'bn' ? 'তৈরি / অনুমোদন' : 'Created / Approved'}</th>
                <th className="py-3 px-4 text-center">{language === 'bn' ? 'অর্ডার স্ট্যাটাস' : 'Order Status'}</th>
                <th className="py-3 px-4 text-center">{language === 'bn' ? 'পেমেন্ট স্ট্যাটাস' : 'Payment Status'}</th>
                <th className="py-3 px-4 text-right">{language === 'bn' ? 'কার্যক্রম' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400 font-medium">
                    {language === 'bn' ? 'কোনো ক্রয় আদেশ পাওয়া যায়নি।' : 'No purchase orders found matching filters.'}
                  </td>
                </tr>
              ) : (
                filteredPOs.map(po => {
                  const isConverted = po.status === 'FULLY_RECEIVED';
                  const creator = users.find(u => u.id === po.createdBy);
                  const approver = users.find(u => u.id === po.approvedBy);
                  const payInfo = getPoPaymentInfo(po);

                  return (
                    <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white font-mono">
                          {po.poNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[10px] text-slate-500 font-mono">
                        {po.date}
                      </td>
                      <td className="py-3 px-4">
                        {po.status === 'FULLY_RECEIVED' && payInfo.billNumber ? (
                          <div className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800/50 w-fit">
                            {payInfo.billNumber}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">---</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {po.supplierName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[10px] text-slate-400 font-mono">
                        {po.supplierPhone}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {po.expectedDeliveryDate}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {po.items.length} {language === 'bn' ? 'টি আইটেম' : 'Items'}
                          <span className="block text-[10px] text-slate-400 font-bold">
                            {po.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} {language === 'bn' ? 'পিস' : 'Pcs'}
                          </span>
                          <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] max-h-16 overflow-y-auto">
                            {po.items.map((item, idx) => (
                              <div key={idx} className="truncate" title={`${item.name}: ${formatCurrency(item.unitPrice)}`}>
                                {item.name}: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{formatCurrency(item.unitPrice)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs">
                        {formatCurrency(po.items.length > 0 ? (po.items.reduce((sum, item) => sum + item.unitPrice, 0) / po.items.length) : 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ৳{po.grandTotal.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <MultiUserAuditTrail
                          createdBy={po.createdBy}
                          approvedBy={po.approvedBy}
                          convertedBy={po.convertedBy}
                          completedBy={po.completedBy}
                          contributors={po.contributors}
                          displayMode="table-cell"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          po.status === 'FULLY_RECEIVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' :
                          po.status === 'APPROVED' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200' :
                          po.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          payInfo.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300' :
                          payInfo.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
                        }`}>
                          {payInfo.status === 'PAID' ? (language === 'bn' ? 'পরিশোধিত (PAID)' : 'PAID') :
                           payInfo.status === 'PARTIAL' ? (language === 'bn' ? `আংশিক (৳${payInfo.dueAmount})` : `PARTIAL (৳${payInfo.dueAmount})`) :
                           (language === 'bn' ? 'বাকী (DUE)' : 'DUE')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isConverted && po.status === 'PENDING_APPROVAL' && currentUser?.role === 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => updatePurchaseOrderStatus(po.id, 'APPROVED')}
                              title="Approve Purchase Order"
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{language === 'bn' ? 'অনুমোদন করুন' : 'Approve'}</span>
                            </button>
                          )}
                          {!isConverted && po.status === 'APPROVED' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                            <button
                              type="button"
                              onClick={() => {
                                setReceivingPO(po);
                                setReceivingItems(po.items.map(i => ({ ...i })));
                                setReceivingDiscount(po.discount);
                                setReceivingPaidAmount(0);
                                setReceivingWalletId(wallets.length > 0 ? wallets[0].id : '');
                              }}
                              title="Confirm PO & Receive Stock"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <span>{language === 'bn' ? 'স্টক গ্রহণ করুন' : 'Receive Items'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setViewingPO(po)}
                            title={language === 'bn' ? 'PO এর বিস্তারিত দেখুন' : 'View PO Details'}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          
                          {/* PO Print */}
                          <button
                            type="button"
                            onClick={() => handlePrintPO(po)}
                            title={language === 'bn' ? 'ক্রয় আদেশ (PO) প্রিন্ট' : 'Print Purchase Order (PO)'}
                            className="p-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Purchase Bill Print */}
                          <button
                            type="button"
                            onClick={() => handlePrintPurchaseBill(po)}
                            title={language === 'bn' ? 'পার্চেস বিল (Purchase Bill) প্রিন্ট' : 'Print Purchase Bill'}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg cursor-pointer flex items-center gap-1 font-semibold text-[10px]"
                          >
                            <Receipt className="w-4 h-4" />
                            <span className="hidden xl:inline">{language === 'bn' ? 'বিল প্রিন্ট' : 'Bill'}</span>
                          </button>

                          {/* Purchase Bill Download PDF */}
                          <button
                            type="button"
                            onClick={() => handlePrintPurchaseBill(po, true)}
                            title={language === 'bn' ? 'পার্চেস বিল (Bill) পিডিএফ ডাউনলোড' : 'Download Purchase Bill PDF'}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {!isConverted && canUserDelete(currentUser, 'purchase') && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(language === 'bn' ? 'আপনি কি নিশ্চিত এই ক্রয় আদেশটি (PO) মুছে ফেলতে চান?' : 'Are you sure you want to delete this purchase order?')) {
                                  deletePurchaseOrder(po.id);
                                }
                              }}
                              title={language === 'bn' ? 'PO মুছুন (Delete)' : 'Delete PO'}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'bn' ? 'নতুন ক্রয় আদেশ তৈরি করুন (Create Purchase Order)' : 'Create New Purchase Order'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'bn' ? 'সাপ্লায়ার নির্বাচন করে প্রয়োজনীয় পণ্যের তালিকা ও পরিমাণ দিন।' : 'Select supplier and add required requisition items.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSavePO} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'bn' ? 'মহাজন / সাপ্লায়ার *' : 'Supplier *'}
                  </label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                    required
                  >
                    <option value="">{language === 'bn' ? '-- সাপ্লায়ার নির্বাচন করুন --' : '-- Select Supplier --'}</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'bn' ? 'প্রত্যাশিত ডেলিভারি তারিখ *' : 'Expected Delivery Date *'}
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={e => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                    required
                  />
                </div>
              </div>

              {/* Add Product Line */}
              <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {language === 'bn' ? 'পণ্য সংযোজন (Add Requisition Items)' : 'Add Requisition Items'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <select
                      value={selectedProductId}
                      onChange={e => {
                        setSelectedProductId(e.target.value);
                        const p = products.find(prod => prod.id === e.target.value);
                        if (p) setPurchasePrice(p.purchasePrice || 0);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    >
                      <option value="">{language === 'bn' ? '-- পণ্য নির্বাচন করুন --' : '-- Select Product --'}</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      placeholder="Est. Price"
                      value={purchasePrice}
                      onChange={e => setPurchasePrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{language === 'bn' ? 'যোগ' : 'Add'}</span>
                    </button>
                  </div>
                </div>

                {/* Items Table inside Modal */}
                {poItems.length > 0 && (
                  <div className="mt-3 overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[9px]">
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">Est. Price</th>
                          <th className="py-2 px-3 text-right">Total</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {poItems.map((item, index) => (
                          <tr key={index}>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{item.productName}</td>
                            <td className="py-2 px-3 text-right font-mono">{item.quantity} {item.unit}</td>
                            <td className="py-2 px-3 text-right font-mono">৳{item.purchasePrice.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">৳{item.total.toLocaleString()}</td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totals & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'bn' ? 'বিশেষ নোট বা শর্তাবলী' : 'Notes & Terms'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Delivery required with 1 year warranty certificate..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-mono font-bold">৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Discount:</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={e => setDiscount(Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 rounded text-right text-xs font-mono"
                    />
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-slate-200 dark:border-slate-700 pt-2 text-slate-900 dark:text-white">
                    <span>Grand Total:</span>
                    <span className="font-mono text-sky-600">৳{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  {language === 'bn' ? 'ক্রয় আদেশ সংরক্ষণ করুন' : 'Save Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PO Details Modal */}
      {viewingPO && (() => {
        const vPayInfo = getPoPaymentInfo(viewingPO);
        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-sky-600">{viewingPO.poNumber}</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    Purchase Order for {viewingPO.supplierName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingPO(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block font-medium">Date:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{viewingPO.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Expected Delivery:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{viewingPO.expectedDeliveryDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Supplier Phone:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{viewingPO.supplierPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Order Status:</span>
                  <span className="font-bold uppercase text-sky-600 font-mono">{viewingPO.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Payment Status:</span>
                  <span className={`font-bold uppercase font-mono ${
                    vPayInfo.status === 'PAID' ? 'text-emerald-600' :
                    vPayInfo.status === 'PARTIAL' ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {vPayInfo.status === 'PAID' ? (language === 'bn' ? 'পরিশোধিত (PAID)' : 'PAID') :
                     vPayInfo.status === 'PARTIAL' ? (language === 'bn' ? 'আংশিক (PARTIAL)' : 'PARTIAL') :
                     (language === 'bn' ? 'বাকী (DUE)' : 'DUE')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Paid Amount:</span>
                  <span className="font-bold text-emerald-600 font-mono">৳{vPayInfo.paidAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Due Amount:</span>
                  <span className="font-bold text-rose-600 font-mono">৳{vPayInfo.dueAmount.toLocaleString()}</span>
                </div>
                <div className="md:col-span-3">
                  <MultiUserAuditTrail
                    createdBy={viewingPO.createdBy}
                    approvedBy={viewingPO.approvedBy}
                    convertedBy={viewingPO.convertedBy}
                    completedBy={viewingPO.completedBy}
                    contributors={viewingPO.contributors}
                    createdAt={viewingPO.createdAt}
                    displayMode="detailed"
                  />
                </div>
              </div>

            {/* Items table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[9px]">
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingPO.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{item.productName}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{item.quantity} {item.unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono">৳{item.purchasePrice.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">৳{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end text-xs font-mono space-y-1 flex-col items-end border-t border-slate-100 dark:border-slate-800 pt-3">
              <div>Subtotal: ৳{viewingPO.subtotal.toLocaleString()}</div>
              {viewingPO.discount > 0 && <div>Discount: ৳{viewingPO.discount.toLocaleString()}</div>}
              <div className="text-sm font-bold text-slate-900 dark:text-white">Grand Total: ৳{viewingPO.grandTotal.toLocaleString()}</div>
            </div>

            {viewingPO.notes && (
              <div className="text-xs bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                <strong>Notes:</strong> {viewingPO.notes}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              {viewingPO.status === 'PENDING_APPROVAL' && currentUser?.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => {
                    updatePurchaseOrderStatus(viewingPO.id, 'APPROVED');
                    setViewingPO(null);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'bn' ? 'অনুমোদন করুন' : 'Approve'}</span>
                </button>
              )}
              {viewingPO.status === 'APPROVED' && currentUser?.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => {
                    setReceivingPO(viewingPO);
                    setReceivingItems(viewingPO.items.map(i => ({ ...i })));
                    setReceivingDiscount(viewingPO.discount);
                    setReceivingPaidAmount(0);
                    setReceivingWalletId(wallets.length > 0 ? wallets[0].id : '');
                    setViewingPO(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{language === 'bn' ? 'স্টক গ্রহণ করুন' : 'Receive Items'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handlePrintPO(viewingPO)}
                className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-sky-600" />
                <span>{language === 'bn' ? 'PO প্রিন্ট' : 'Print PO'}</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintPO(viewingPO, true)}
                className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-sky-600" />
                <span>{language === 'bn' ? 'PO পিডিএফ' : 'PO PDF'}</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintPurchaseBill(viewingPO)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Receipt className="w-4 h-4" />
                <span>{language === 'bn' ? 'পার্চেস বিল প্রিন্ট' : 'Print Purchase Bill'}</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintPurchaseBill(viewingPO, true)}
                className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>{language === 'bn' ? 'বিল পিডিএফ' : 'Bill PDF'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingPO(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        );
      })()}
      {/* Receive PO Modal */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'bn' ? 'স্টক গ্রহণ ও বিল রূপান্তর' : 'Receive Stock & Convert to Bill'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    PO #{receivingPO.poNumber} • {receivingPO.supplierName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceivingPO(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === 'bn' ? 'পণ্য নির্বাচন করুন (নতুন যোগ করতে)' : 'Select Product (To Add New)'}
                </label>
                <select
                  value={receivingSelectedProductId}
                  onChange={e => {
                    setReceivingSelectedProductId(e.target.value);
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod) {
                      setReceivingProductPrice(prod.purchasePrice || 0);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="">{language === 'bn' ? 'পণ্য নির্বাচন করুন...' : 'Select product...'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - ৳{p.purchasePrice || 0}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-24">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === 'bn' ? 'পরিমাণ' : 'Qty'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={receivingProductQuantity}
                  onChange={e => setReceivingProductQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-center"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === 'bn' ? 'ক্রয় মূল্য' : 'Price'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={receivingProductPrice}
                  onChange={e => setReceivingProductPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-center"
                />
              </div>
              <button
                type="button"
                onClick={handleAddReceiveItem}
                className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-sm inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'যোগ করুন' : 'Add'}</span>
              </button>
            </div>

            <div className="overflow-x-auto bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[9px]">
                    <th className="py-2 px-3">{language === 'bn' ? 'পণ্য' : 'Product'}</th>
                    <th className="py-2 px-3 text-left">{language === 'bn' ? 'ব্যাচ নং' : 'Batch No'}</th>
                    <th className="py-2 px-3 text-left">{language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Exp Date'}</th>
                    <th className="py-2 px-3 text-right">{language === 'bn' ? 'পরিমাণ' : 'Qty Received'}</th>
                    <th className="py-2 px-3 text-right">{language === 'bn' ? 'ক্রয় মূল্য' : 'Purchase Price'}</th>
                    <th className="py-2 px-3 text-right">{language === 'bn' ? 'মোট' : 'Total'}</th>
                    <th className="py-2 px-3 text-center">{language === 'bn' ? 'কার্যক্রম' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {receivingItems.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white min-w-[120px]">{item.productName}</td>
                      <td className="py-2 px-3 text-left">
                        <input
                          type="text"
                          placeholder={language === 'bn' ? 'ব্যাচ...' : 'Batch...'}
                          value={item.batchNumber || ''}
                          onChange={e => handleReceiveItemChange(index, 'batchNumber', e.target.value)}
                          className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 text-left">
                        <input
                          type="date"
                          value={item.expDate || ''}
                          onChange={e => handleReceiveItemChange(index, 'expDate', e.target.value)}
                          className="w-32 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => handleReceiveItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.purchasePrice}
                          onChange={e => handleReceiveItemChange(index, 'purchasePrice', Number(e.target.value))}
                          className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">৳{item.total.toLocaleString()}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveReceiveItem(index)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end items-end flex-col space-y-2 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex justify-between w-64">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-mono font-bold">
                  ৳{receivingItems.reduce((acc, item) => acc + item.total, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center w-64">
                <span className="text-slate-500">Discount:</span>
                <input
                  type="number"
                  value={receivingDiscount}
                  onChange={e => setReceivingDiscount(Number(e.target.value))}
                  className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right text-xs font-mono"
                />
              </div>
              <div className="flex justify-between w-64 text-sm font-bold border-t border-slate-200 dark:border-slate-700 pt-2 text-slate-900 dark:text-white">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-600">
                  ৳{Math.max(0, receivingItems.reduce((acc, item) => acc + item.total, 0) - receivingDiscount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center w-64 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-bold">{language === 'bn' ? 'পরিশোধ (Paid):' : 'Paid Amount:'}</span>
                <input
                  type="number"
                  min="0"
                  value={receivingPaidAmount}
                  onChange={e => setReceivingPaidAmount(Number(e.target.value))}
                  className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right text-xs font-mono font-bold text-sky-600"
                />
              </div>
              {receivingPaidAmount > 0 && (
                <div className="flex justify-between items-center w-64 mt-1">
                  <span className="text-slate-500 text-[10px]">{language === 'bn' ? 'পেমেন্ট ওয়ালেট:' : 'Wallet:'}</span>
                  <select
                    value={receivingWalletId}
                    onChange={e => setReceivingWalletId(e.target.value)}
                    className="w-28 px-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right text-[10px]"
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name} (৳{w.balance})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-between w-64 text-sm font-bold pt-1 text-slate-900 dark:text-white">
                <span className="text-rose-600">{language === 'bn' ? 'বাকি (Due):' : 'Due Amount:'}</span>
                <span className="font-mono text-rose-600">
                  ৳{Math.max(0, Math.max(0, receivingItems.reduce((acc, item) => acc + item.total, 0) - receivingDiscount) - receivingPaidAmount).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReceivingPO(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                {language === 'bn' ? 'নিশ্চিত করুন ও বিল তৈরি করুন' : 'Confirm & Create Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
