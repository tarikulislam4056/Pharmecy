import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Badge } from '../common/Badge';
import { DatePeriodFilter } from '../common/DatePeriodFilter';
import { MultiUserAuditTrail } from '../common/MultiUserAuditTrail';
import { SaleInvoice, DeletedSaleInvoice } from '../../types';
import { canUserDelete, canUserEdit, canUserReturn } from '../../utils/permissions';
import {
  Search,
  Printer,
  Eye,
  RotateCcw,
  ArrowDownLeft,
  Calendar,
  CreditCard,
  User,
  Trash2,
  AlertTriangle,
  FileText,
  Plus,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  X,
  Package,
  Layers,
  ArrowUpRight,
  Send,
  ShieldCheck,
  Download,
  RefreshCw,
  Cloud,
  Lock,
  FileDown,
  Check,
  Undo2,
  AlertCircle,
  Receipt,
} from 'lucide-react';

interface SalesListViewProps {
  initialSubTab?: 'active' | 'deleted';
  onOpenPaymentInModal: (customerId?: string) => void;
  onOpenReturnModal?: (invoice: SaleInvoice) => void;
}

export const SalesListView: React.FC<SalesListViewProps> = ({
  initialSubTab = 'active',
  onOpenPaymentInModal,
  onOpenReturnModal,
}) => {
  const {
    language,
    parties,
    saleInvoices,
    deletedSaleInvoices = [],
    saleReturns,
    users,
    formatCurrency,
    openPrintModal,
    setActiveTab,
    deleteSaleInvoice,
    restoreDeletedSaleInvoice,
    permanentlyDeleteArchivedInvoice,
    clearAllDeletedInvoices,
    exportDeletedInvoicesToFile,
    sendSaleSms,
    showToast,
    currentUser,
    syncCountdown,
    triggerSyncNow,
    isSyncingWithServer,
    autoSyncIntervalSeconds,
    isAutoSyncEnabled,
  } = useApp();
  const { t } = useTranslation(language);

  // Sub-Tab Switcher: 'active' (Active Sales) vs 'deleted' (Delete Invoice Archive)
  const [currentSubTab, setCurrentSubTab] = useState<'active' | 'deleted'>(initialSubTab);

  // Synchronize when prop changes
  useEffect(() => {
    if (initialSubTab) {
      setCurrentSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Active Sales Search & Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cashierFilter, setCashierFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [periodLabel, setPeriodLabel] = useState<string>('');

  // Deleted Invoices Search & Filter states
  const [deletedSearch, setDeletedSearch] = useState('');
  const [deletedUserFilter, setDeletedUserFilter] = useState<string>('ALL');
  const [deletedStartDate, setDeletedStartDate] = useState<string>('');
  const [deletedEndDate, setDeletedEndDate] = useState<string>('');
  const [deletedPeriodLabel, setDeletedPeriodLabel] = useState<string>('');

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [selectedDeletedInvoice, setSelectedDeletedInvoice] = useState<DeletedSaleInvoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SaleInvoice | null>(null);
  const [deleteReasonOption, setDeleteReasonOption] = useState<string>('MISTAKE_ENTRY');
  const [deleteCustomReason, setDeleteCustomReason] = useState<string>('');
  const [invoiceToRestore, setInvoiceToRestore] = useState<DeletedSaleInvoice | null>(null);
  const [invoiceToPermDelete, setInvoiceToPermDelete] = useState<DeletedSaleInvoice | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Granular Permission Checks for current logged in user
  const hasDeletePermission = canUserDelete(currentUser, 'sales');
  const hasEditPermission = canUserEdit(currentUser, 'sales');
  const hasReturnPermission = canUserReturn(currentUser);

  // Helper to resolve creator/cashier information
  const getCreatorInfo = (inv: SaleInvoice) => {
    const user = users.find(
      u =>
        u.id === inv.createdBy ||
        u.username.toLowerCase() === (inv.createdBy || '').toLowerCase() ||
        u.fullName.toLowerCase() === (inv.cashierName || '').toLowerCase() ||
        u.fullName.toLowerCase() === (inv.createdBy || '').toLowerCase()
    );
    const name = inv.cashierName || user?.fullName || inv.createdBy || 'Admin';
    const role = user?.role || (inv.cashierName?.toLowerCase().includes('cashier') ? 'CASHIER' : (inv.cashierName?.toLowerCase().includes('sales') ? 'SALESMAN' : 'ADMIN'));
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

  // Distinct list of creators/cashiers for dropdown filter
  const creatorOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role?: string }>();
    users.forEach(u => {
      map.set(u.id, { id: u.id, name: u.fullName, role: u.role });
    });
    saleInvoices.forEach(inv => {
      const info = getCreatorInfo(inv);
      const key = inv.createdBy || info.name;
      if (!map.has(key)) {
        map.set(key, { id: key, name: info.name, role: info.role });
      }
    });
    return Array.from(map.values());
  }, [users, saleInvoices]);

  // Distinct list of users who performed deletions
  const deletedByOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role?: string }>();
    deletedSaleInvoices.forEach(del => {
      if (del.deletedBy) {
        map.set(del.deletedBy.id || del.deletedBy.username, {
          id: del.deletedBy.id || del.deletedBy.username,
          name: del.deletedBy.fullName || del.deletedBy.username,
          role: del.deletedBy.role,
        });
      }
    });
    return Array.from(map.values());
  }, [deletedSaleInvoices]);

  // Filtered active sales invoices
  const filteredInvoices = useMemo(() => {
    return saleInvoices.filter(inv => {
      const query = search.toLowerCase();
      const creator = getCreatorInfo(inv);
      const matchSearch =
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.customerName.toLowerCase().includes(query) ||
        inv.customerPhone.includes(query) ||
        (inv.cashierName && inv.cashierName.toLowerCase().includes(query)) ||
        (creator.name && creator.name.toLowerCase().includes(query)) ||
        (creator.role && creator.role.toLowerCase().includes(query)) ||
        (inv.walletName && inv.walletName.toLowerCase().includes(query)) ||
        inv.items.some(i => i.name.toLowerCase().includes(query) || (i.nameBn && i.nameBn.includes(query)));
      
      let matchStatus = true;
      if (statusFilter === 'INSTALLMENT') {
        matchStatus = !!inv.isInstallmentSale || inv.paymentMethod === 'INSTALLMENT';
      } else if (statusFilter !== 'ALL') {
        matchStatus = inv.status === statusFilter;
      }

      if (cashierFilter !== 'ALL') {
        const matchesId = inv.createdBy === cashierFilter;
        const matchesName = creator.name === cashierFilter || inv.cashierName === cashierFilter;
        if (!matchesId && !matchesName) return false;
      }

      if (startDate && inv.date < startDate) return false;
      if (endDate && inv.date > endDate) return false;

      return matchSearch && matchStatus;
    });
  }, [saleInvoices, search, statusFilter, cashierFilter, startDate, endDate, users]);

  // Filtered deleted invoices
  const filteredDeletedInvoices = useMemo(() => {
    return deletedSaleInvoices.filter(del => {
      const query = deletedSearch.toLowerCase();
      const matchSearch =
        del.invoiceNumber.toLowerCase().includes(query) ||
        del.customerName.toLowerCase().includes(query) ||
        del.customerPhone.includes(query) ||
        (del.deletedBy?.fullName && del.deletedBy.fullName.toLowerCase().includes(query)) ||
        (del.deletedBy?.username && del.deletedBy.username.toLowerCase().includes(query)) ||
        (del.deletedBy?.role && del.deletedBy.role.toLowerCase().includes(query)) ||
        (del.deletionReason && del.deletionReason.toLowerCase().includes(query)) ||
        del.items.some(i => i.name.toLowerCase().includes(query) || (i.nameBn && i.nameBn.includes(query)));

      if (deletedUserFilter !== 'ALL') {
        const matchesUser =
          del.deletedBy?.id === deletedUserFilter ||
          del.deletedBy?.username === deletedUserFilter ||
          del.deletedBy?.fullName === deletedUserFilter;
        if (!matchesUser) return false;
      }

      if (deletedStartDate && del.date < deletedStartDate) return false;
      if (deletedEndDate && del.date > deletedEndDate) return false;

      return matchSearch;
    });
  }, [deletedSaleInvoices, deletedSearch, deletedUserFilter, deletedStartDate, deletedEndDate]);

  // Totals calculations for active sales
  const totalSalesSum = filteredInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalPaidSum = filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalDueSum = filteredInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
  const totalItemsCount = filteredInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, i) => s + Number(i.quantity), 0),
    0
  );

  // Totals calculations for deleted invoices
  const totalDeletedValue = filteredDeletedInvoices.reduce((sum, del) => sum + del.grandTotal, 0);
  const totalDeletedItemsCount = filteredDeletedInvoices.reduce(
    (sum, del) => sum + del.items.reduce((s, i) => s + Number(i.quantity), 0),
    0
  );

  // Print Handlers
  const handlePrintA4 = (invoice: SaleInvoice) => {
    openPrintModal({
      type: 'INVOICE_A4',
      title: `Sale Invoice #${invoice.invoiceNumber}`,
      data: invoice,
    });
  };

  const handlePrintPOS = (invoice: SaleInvoice) => {
    openPrintModal({
      type: 'POS_80MM',
      title: `POS Receipt #${invoice.invoiceNumber}`,
      data: invoice,
    });
  };

  const handlePrintDeliveryChalan = (invoice: SaleInvoice) => {
    openPrintModal({
      type: 'INVOICE_A4',
      title: `Delivery Chalan (চালান) #${invoice.invoiceNumber}`,
      data: {
        ...invoice,
        isChalan: true,
        documentTitle: language === 'bn' ? 'ডেলিভারি চালান (Delivery Chalan)' : 'Delivery Chalan',
      },
    });
  };

  const handleDownloadPDF = (invoice: SaleInvoice) => {
    openPrintModal({
      type: 'INVOICE_A4',
      title: `Sale Invoice #${invoice.invoiceNumber}`,
      data: invoice,
      autoDownloadPdf: true,
    });
  };

  const handlePrintDeletedList = () => {
    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'ডিলিট ইনভয়েস আর্কাইভ' : 'DELETED INVOICE ARCHIVE',
      data: {
        reportTitle: language === 'bn' ? 'ডিলিট ইনভয়েস আর্কাইভ' : 'DELETED INVOICE ARCHIVE',
        period: 'All Time',
        columns: [
          { header: 'Deleted Date', key: 'deletedAt' },
          { header: 'Invoice No', key: 'invoiceNo' },
          { header: 'Customer', key: 'customerName' },
          { header: 'Total', key: 'total', align: 'right', format: 'currency' },
          { header: 'Reason', key: 'reason' },
        ],
        rows: deletedSaleInvoices.map(inv => ({
          deletedAt: new Date(inv.deletedAt).toLocaleDateString(),
          invoiceNo: inv.invoiceNumber,
          customerName: inv.customerName || 'Walk-in Customer',
          total: inv.grandTotal,
          reason: inv.deletionReason || '-',
        })),
        totals: {
          invoiceNo: `${deletedSaleInvoices.length} Invoices`,
          total: deletedSaleInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
        }
      },
    });
  };

  const handlePrintList = () => {
    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'বিক্রয় তালিকা' : 'SALES LIST',
      data: {
        reportTitle: language === 'bn' ? 'বিক্রয় তালিকা' : 'SALES LIST',
        period: periodLabel || 'All Time',
        columns: [
          { header: 'Date', key: 'date' },
          { header: 'Invoice No', key: 'invoiceNo' },
          { header: 'Customer', key: 'customer' },
          { header: 'Total', key: 'total', align: 'right', format: 'currency' },
          { header: 'Paid', key: 'paid', align: 'right', format: 'currency' },
          { header: 'Due', key: 'due', align: 'right', format: 'currency' },
        ],
        rows: filteredInvoices.map(inv => ({
          date: inv.date,
          invoiceNo: inv.id,
          customer: parties.find(p => p.id === inv.customerId)?.name || 'Walk-in Customer',
          total: inv.grandTotal,
          paid: inv.paidAmount,
          due: inv.grandTotal - inv.paidAmount,
        })),
        totals: {
          total: totalSalesSum,
          paid: totalPaidSum,
          due: totalDueSum,
        }
      }
    });
  };

  // Print/Export single deleted invoice as PDF
  const handlePrintSingleDeletedInvoice = (del: DeletedSaleInvoice) => {
    openPrintModal({
      type: 'INVOICE_A4',
      title: `Deleted Invoice #${del.invoiceNumber}`,
      data: {
        ...del,
        id: del.originalInvoiceId,
        isDeleted: true,
      } as any,
    });
  };

  // Delete Action Confirm (with audit reason & user tracking)
  const handleConfirmDelete = () => {
    if (invoiceToDelete) {
      if (!hasDeletePermission) {
        showToast(
          language === 'bn'
            ? 'আপনার এই বিক্রয় চালান ডিলিট করার অনুমতি নেই (Delete Permission Required)!'
            : 'You do not have permission to delete sales invoices!',
          'error'
        );
        setInvoiceToDelete(null);
        return;
      }

      let finalReason = deleteCustomReason.trim();
      if (!finalReason) {
        switch (deleteReasonOption) {
          case 'MISTAKE_ENTRY':
            finalReason = language === 'bn' ? 'ভুল তথ্য এন্ট্রি / কারেকশন' : 'Mistake / Wrong entry';
            break;
          case 'CUSTOMER_CANCELLED':
            finalReason = language === 'bn' ? 'কাস্টমার অর্ডার বাতিল করেছেন' : 'Customer cancelled order';
            break;
          case 'PRODUCT_EXCHANGE':
            finalReason = language === 'bn' ? 'পণ্য পরিবর্তন / এক্সচেঞ্জ' : 'Product exchange / change';
            break;
          case 'DUPLICATE_ENTRY':
            finalReason = language === 'bn' ? 'ডুপ্লিকেট চালান তৈরি হয়েছিল' : 'Duplicate invoice entry';
            break;
          default:
            finalReason = language === 'bn' ? 'ইউজার কর্তৃক ডিলিট' : 'Deleted by authorized user';
        }
      }

      const success = deleteSaleInvoice(invoiceToDelete.id, finalReason);
      if (success) {
        showToast(
          language === 'bn'
            ? `চালান #${invoiceToDelete.invoiceNumber} ডিলিট করে 'Delete Invoice' আর্কাইভে এবং আলাদা ফাইলে সংরক্ষণ করা হয়েছে।`
            : `Invoice #${invoiceToDelete.invoiceNumber} deleted and archived with audit trail.`,
          'success'
        );
      }
      setInvoiceToDelete(null);
      setDeleteCustomReason('');
      if (selectedInvoice?.id === invoiceToDelete.id) {
        setSelectedInvoice(null);
      }
    }
  };

  // Restore Action Confirm
  const handleConfirmRestore = () => {
    if (invoiceToRestore) {
      if (!hasDeletePermission && currentUser?.role !== 'ADMIN') {
        showToast(
          language === 'bn'
            ? 'চালান পুনরুদ্ধার করার জন্য ডিলিট পারমিশন আবশ্যক।'
            : 'Permission required to restore invoices.',
          'error'
        );
        setInvoiceToRestore(null);
        return;
      }
      const success = restoreDeletedSaleInvoice(invoiceToRestore.id);
      if (success) {
        showToast(
          language === 'bn'
            ? `চালান #${invoiceToRestore.invoiceNumber} সফলভাবে সক্রিয় বিক্রয় তালিকায় পুনরুদ্ধার করা হয়েছে!`
            : `Invoice #${invoiceToRestore.invoiceNumber} restored successfully!`,
          'success'
        );
      }
      setInvoiceToRestore(null);
      if (selectedDeletedInvoice?.id === invoiceToRestore.id) {
        setSelectedDeletedInvoice(null);
      }
    }
  };

  // Permanent Delete Confirm
  const handleConfirmPermDelete = () => {
    if (invoiceToPermDelete) {
      if (!hasDeletePermission) {
        showToast(
          language === 'bn'
            ? 'আর্কাইভ থেকে স্থায়ীভাবে মুছে ফেলার পারমিশন আপনার নেই।'
            : 'Permission required to permanently delete archived records.',
          'error'
        );
        setInvoiceToPermDelete(null);
        return;
      }
      permanentlyDeleteArchivedInvoice(invoiceToPermDelete.id);
      setInvoiceToPermDelete(null);
      if (selectedDeletedInvoice?.id === invoiceToPermDelete.id) {
        setSelectedDeletedInvoice(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header with Title, Auto-Sync Status & Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>
                {currentSubTab === 'active'
                  ? (language === 'bn' ? 'বিক্রয় তালিকা ও হিস্ট্রি (Sales List)' : 'Sales List & Invoices')
                  : (language === 'bn' ? 'ডিলিট ইনভয়েজ আর্কাইভ (Delete Invoice Archive)' : 'Deleted Invoices & File Archive')}
              </span>
            </h2>

            {currentSubTab === 'active' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                {saleInvoices.length} {language === 'bn' ? 'টি চালান' : 'Invoices'}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                {deletedSaleInvoices.length} {language === 'bn' ? 'টি ডিলিট রেকর্ড' : 'Deleted Records'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'bn'
              ? 'ইউজার পারমিশন ভিত্তিক ডিলিট, রিটার্ন ও এডিট নিয়ন্ত্রণ, এবং ডিলিট হওয়া সমস্ত চালান আলাদা ফাইলে অডিট সংরক্ষণ'
              : 'Permission-based Delete, Return & Edit operations with separate file archival & multi-device auto-reload.'}
          </p>
        </div>

        {/* Action Controls & Live Auto-Save Widget */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Real-time Live Save Status Widget */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs shadow-xs">
            {isSyncingWithServer ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            <span className="font-semibold hidden sm:inline">
              {language === 'bn' ? 'অটো SQL সেভ:' : 'Auto SQL Save:'}
            </span>
            <span className="font-medium bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700 text-[11px] text-emerald-700 dark:text-emerald-300">
              {language === 'bn' ? 'সক্রিয়' : 'Active'}
            </span>
            <button
              type="button"
              onClick={() => triggerSyncNow()}
              title={language === 'bn' ? 'অন্য ডিভাইসের নতুন ডাটা পেতে এখনই রিলোড দিন' : 'Reload now from other devices'}
              className="p-1 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 rounded-md text-emerald-700 dark:text-emerald-300 cursor-pointer ml-0.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {currentSubTab === 'active' ? (
            <>
              <button
                type="button"
                onClick={handlePrintList}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'bn' ? 'লিস্ট প্রিন্ট' : 'Print List'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন বিক্রয় (POS)' : 'New Sale (POS)'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePrintDeletedList}
                disabled={deletedSaleInvoices.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'bn' ? '📥 পিডিএফ প্রিন্ট / এক্সপোর্ট' : 'Print / Export PDF'}</span>
              </button>
              {hasDeletePermission && deletedSaleInvoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllModal(true)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'সব মুছুন' : 'Clear All'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Sub-Tab Switcher: Active Sales Invoices vs Delete Invoice Archive */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
        <button
          type="button"
          onClick={() => setCurrentSubTab('active')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentSubTab === 'active'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{language === 'bn' ? 'সক্রিয় বিক্রয় চালান (Active Sales)' : 'Active Sales Invoices'}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {saleInvoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSubTab('deleted')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentSubTab === 'deleted'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200 dark:border-rose-900/60 ring-2 ring-rose-400/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          <Trash2 className="w-4 h-4 text-rose-500" />
          <span>{language === 'bn' ? 'ডিলিট ইনভয়েজ (Delete Invoice Archive)' : 'Delete Invoice Archive'}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {deletedSaleInvoices.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: ACTIVE SALES INVOICES */}
      {/* ========================================================================= */}
      {currentSubTab === 'active' && (
        <>
          {/* Summary Statistics KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                {language === 'bn' ? 'মোট বিক্রয় (Total Sales)' : 'Total Sales'}
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {formatCurrency(totalSalesSum)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {filteredInvoices.length} {language === 'bn' ? 'চালান' : 'invoices'}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-950/60 shadow-xs">
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                {language === 'bn' ? 'আদায়কৃত টাকা (Paid)' : 'Total Collected'}
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {formatCurrency(totalPaidSum)}
              </div>
              <div className="text-[10px] text-emerald-600/70 mt-0.5">
                {language === 'bn' ? 'নগদ / ব্যাংক জমা' : 'Cash & Bank collected'}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-950/60 shadow-xs">
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">
                {language === 'bn' ? 'মোট বকেয়া (Due Balance)' : 'Total Due'}
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                {formatCurrency(totalDueSum)}
              </div>
              <div className="text-[10px] text-rose-500/70 mt-0.5">
                {language === 'bn' ? 'গ্রাহকদের কাছে পাওনা' : 'Receivable balance'}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-950/60 shadow-xs">
              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                {language === 'bn' ? 'বিক্রিত মোট পণ্য' : 'Sold Quantity'}
              </div>
              <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                {totalItemsCount.toLocaleString()} <span className="text-xs font-semibold text-slate-500">pcs</span>
              </div>
              <div className="text-[10px] text-indigo-500/70 mt-0.5">
                {language === 'bn' ? 'মোট পণ্য ইউনিট' : 'Total quantity count'}
              </div>
            </div>
          </div>

          {/* Date Period Filter Bar */}
          <DatePeriodFilter
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e, label) => {
              setStartDate(s);
              setEndDate(e);
              setPeriodLabel(label || '');
            }}
            language={language}
          />

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Live Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'ইনভয়েস নং, কাস্টমার, ফোন, ক্যাশিয়ার/ইউজার বা পণ্য...'
                      : 'Search invoice #, customer, phone, cashier/user or product...'
                  }
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Cashier / User Filter */}
              <select
                value={cashierFilter}
                onChange={e => setCashierFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">
                  {language === 'bn' ? '👤 সকল ক্যাশিয়ার/ইউজার' : '👤 All Cashiers / Users'}
                </option>
                {creatorOptions.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.role ? `(${c.role})` : ''}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">{language === 'bn' ? 'সকল স্ট্যাটাস (All)' : 'All Status'}</option>
                <option value="PAID">PAID (পরিশোধিত)</option>
                <option value="PARTIAL">PARTIAL (আংশিক পরিশোধ)</option>
                <option value="DUE">DUE (বকেয়া)</option>
                <option value="INSTALLMENT">📅 INSTALLMENT / EMI (কিস্তি)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
              {startDate && endDate && (
                <span className="text-emerald-600 dark:text-emerald-400 font-sans font-medium text-xs">
                  {periodLabel || `${startDate} - ${endDate}`}
                </span>
              )}
              <span>{language === 'bn' ? `মোট ${filteredInvoices.length} টি রেকর্ড` : `Showing ${filteredInvoices.length} invoices`}</span>
            </div>
          </div>

          {/* Active Sales Invoices Data Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'চালান নম্বর (INV #)' : 'Invoice #'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'গ্রাহক / কাস্টমার' : 'Customer'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'ফোন নম্বর' : 'Phone'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'তৈরি করেছেন' : 'Created By'}</th>
                    <th className="py-3.5 px-4 text-center">{language === 'bn' ? 'পণ্য ও পরিমাণ' : 'Items'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'মোট বিক্রয়' : 'Grand Total'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'জমা (Paid)' : 'Paid'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'বকেয়া (Due)' : 'Due'}</th>
                    <th className="py-3.5 px-4 text-center">{language === 'bn' ? 'অবস্থা' : 'Status'}</th>
                    <th className="py-3.5 px-4 text-center min-w-[210px]">{language === 'bn' ? 'চালান প্রিন্ট ও অ্যাকশন' : 'Print & Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <span className="font-semibold text-sm">
                            {language === 'bn' ? 'কোনো বিক্রয় চালান পাওয়া যায়নি' : 'No sales invoices found.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('pos')}
                            className="mt-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            + {language === 'bn' ? 'প্রথম বিক্রয় তৈরি করুন' : 'Create First Sale'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => {
                      const creator = getCreatorInfo(inv);
                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Invoice Number */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer text-left"
                            >
                              <span>{inv.invoiceNumber}</span>
                              {inv.isInstallmentSale && (
                                <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded text-[9px] font-extrabold">
                                  EMI
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Date & Time */}
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            <div>{inv.date}</div>
                            {inv.createdAt && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{inv.createdAt.split(' ')[1] || ''}</span>
                              </div>
                            )}
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{inv.customerName}</div>
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-500 font-mono">
                            {inv.customerPhone || '---'}
                          </td>

                          {/* Created By / Cashier Column */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <MultiUserAuditTrail
                              createdBy={inv.createdBy || inv.cashierName}
                              cashierName={inv.cashierName}
                              convertedBy={(inv as any).convertedBy}
                              completedBy={(inv as any).completedBy}
                              contributors={(inv as any).contributors}
                              displayMode="table-cell"
                            />
                          </td>

                          {/* Items */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {inv.items.reduce((s, i) => s + Number(i.quantity), 0)} pcs ({inv.items.length} items)
                            </span>
                          </td>

                          {/* Grand Total */}
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatCurrency(inv.grandTotal)}
                          </td>

                          {/* Paid */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatCurrency(inv.paidAmount)}
                          </td>

                          {/* Due */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {inv.dueAmount > 0 ? formatCurrency(inv.dueAmount) : <span className="text-slate-300 font-normal">-</span>}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge status={inv.status} />
                              {saleReturns?.some(r => r.invoiceId === inv.id) && (
                                <Badge status="RETURNED" variant="rose" />
                              )}
                            </div>
                          </td>

                          {/* Action Buttons with Granular Permission Checks */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              
                              {/* 1. Print Preview */}
                              <button
                                type="button"
                                onClick={() => handlePrintA4(inv)}
                                title={language === 'bn' ? 'প্রিন্ট প্রিভিউ' : 'Print Preview'}
                                className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {/* Download PDF */}
                              <button
                                type="button"
                                onClick={() => handleDownloadPDF(inv)}
                                title={language === 'bn' ? 'পিডিএফ ডাউনলোড করুন' : 'Download PDF'}
                                className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </button>

                              {/* 2. Print A4 Invoice */}
                              <button
                                type="button"
                                onClick={() => handlePrintA4(inv)}
                                title={language === 'bn' ? 'A4 চালান প্রিন্ট করুন' : 'Print A4 Invoice'}
                                className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* 2. Print POS Thermal 80mm */}
                              <button
                                type="button"
                                onClick={() => handlePrintPOS(inv)}
                                title={language === 'bn' ? '৮০মিমি পিওএস রশিদ প্রিন্ট' : 'POS 80mm Receipt'}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer"
                              >
                                POS
                              </button>

                              {/* 3. Print Delivery Chalan */}
                              <button
                                type="button"
                                onClick={() => handlePrintDeliveryChalan(inv)}
                                title={language === 'bn' ? 'ডেলিভারি চালান প্রিন্ট' : 'Print Delivery Chalan'}
                                className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>

                              {/* 4. Send / Resend SMS */}
                              {inv.customerPhone && (
                                <button
                                  type="button"
                                  onClick={() => sendSaleSms(inv)}
                                  title={language === 'bn' ? 'কাস্টমারকে চালানের SMS পাঠান' : 'Send Invoice SMS'}
                                  className="p-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* 5. View Detail */}
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(inv)}
                                title={language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* 6. Receive Payment (If Due) */}
                              {inv.dueAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPaymentInModal(inv.customerId)}
                                  title={language === 'bn' ? 'বকেয়া টাকা গ্রহণ করুন' : 'Receive Due Payment'}
                                  className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* 7. Return Modal (Gated by Return Permission) */}
                              {hasReturnPermission ? (
                                !saleReturns?.some(r => r.invoiceId === inv.id) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onOpenReturnModal) {
                                        onOpenReturnModal(inv);
                                      } else {
                                        setActiveTab('sales-returns');
                                      }
                                    }}
                                    title={language === 'bn' ? 'পণ্য ফেরত (Sales Return)' : 'Return Items'}
                                    className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    title={language === 'bn' ? 'ইতিমধ্যে ফেরত দেওয়া হয়েছে' : 'Already Returned'}
                                    className="p-1.5 text-slate-300 dark:text-slate-600 rounded-lg cursor-not-allowed"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )
                              ) : (
                                <span
                                  title={language === 'bn' ? 'রিটার্ন বাটন ব্যবহারের অনুমতি নেই' : 'Return Permission Required'}
                                  className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed inline-flex"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 opacity-40" />
                                </span>
                              )}

                              {/* 8. Delete Invoice Button (Gated by Delete Permission) */}
                              {hasDeletePermission ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInvoiceToDelete(inv);
                                    setDeleteReasonOption('MISTAKE_ENTRY');
                                    setDeleteCustomReason('');
                                  }}
                                  title={language === 'bn' ? 'চালান ডিলিট ও আলাদা ফাইলে সেভ করুন (Delete Invoice)' : 'Delete Invoice & Save to Archive File'}
                                  className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span
                                  title={language === 'bn' ? 'চালান ডিলিট করার অনুমতি নেই (Delete Permission Required)' : 'Delete Permission Required'}
                                  className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed inline-flex"
                                >
                                  <Lock className="w-3.5 h-3.5 opacity-40 text-slate-400" />
                                </span>
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
        </>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: DELETE INVOICE ARCHIVE (ডিলিট ইনভয়েজ কলাম ও আলাদা ফাইলে রেকর্ড) */}
      {/* ========================================================================= */}
      {currentSubTab === 'deleted' && (
        <>
          {/* Deleted Invoices KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xs">
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'মোট ডিলিট চালান' : 'Deleted Invoices'}</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                {filteredDeletedInvoices.length} <span className="text-xs font-semibold text-slate-500">{language === 'bn' ? 'টি চালান' : 'records'}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {language === 'bn' ? 'আলাদা ফাইলে অডিট সেভ' : 'Saved in audit file'}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-950/60 shadow-xs">
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                {language === 'bn' ? 'ডিলিটকৃত চালানের মোট মূল্য' : 'Total Deleted Value'}
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                {formatCurrency(totalDeletedValue)}
              </div>
              <div className="text-[10px] text-amber-600/70 mt-0.5">
                {language === 'bn' ? 'ব্যালেন্স ও ক্যাশ সমন্বয়কৃত' : 'Reverted from ledger'}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-950/60 shadow-xs">
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
                {language === 'bn' ? 'স্টকে ফেরত পণ্য' : 'Restored Stock'}
              </div>
              <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
                {totalDeletedItemsCount.toLocaleString()} <span className="text-xs font-semibold text-slate-500">pcs</span>
              </div>
              <div className="text-[10px] text-blue-500/70 mt-0.5">
                {language === 'bn' ? 'ইনভেন্টরিতে স্টক যোগকৃত' : 'Re-added to inventory'}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-950/60 shadow-xs">
              <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">
                {language === 'bn' ? 'ডিলিটকারী ইউজার সংখ্যা' : 'Deleting Users'}
              </div>
              <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
                {deletedByOptions.length} <span className="text-xs font-semibold text-slate-500">users</span>
              </div>
              <div className="text-[10px] text-purple-500/70 mt-0.5">
                {language === 'bn' ? 'অডিট লগ ট্র্যাকড' : 'Logged & Audited'}
              </div>
            </div>
          </div>

          {/* Date Period Filter Bar for Deleted Invoices */}
          <DatePeriodFilter
            startDate={deletedStartDate}
            endDate={deletedEndDate}
            onChange={(s, e, label) => {
              setDeletedStartDate(s);
              setDeletedEndDate(e);
              setDeletedPeriodLabel(label || '');
            }}
            language={language}
          />

          {/* Search & Filter Bar for Deleted Invoices */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={deletedSearch}
                  onChange={e => setDeletedSearch(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'ডিলিট ইনভয়েস নং, গ্রাহক, যে ইউজার ডিলিট করেছে, বা কারণ...'
                      : 'Search deleted invoice #, customer, deleted by user, reason...'
                  }
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
                />
                {deletedSearch && (
                  <button
                    type="button"
                    onClick={() => setDeletedSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Deleted By User Filter */}
              <select
                value={deletedUserFilter}
                onChange={e => setDeletedUserFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">
                  {language === 'bn' ? '👤 যে ইউজার ডিলিট করেছে (সকল)' : '👤 All Deleting Users'}
                </option>
                {deletedByOptions.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.role ? `(${u.role})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
              <span>{language === 'bn' ? `মোট ${filteredDeletedInvoices.length} টি ডিলিট চালান সংরক্ষিত` : `Showing ${filteredDeletedInvoices.length} deleted records`}</span>
            </div>
          </div>

          {/* Deleted Invoices Data Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200/80 dark:border-rose-950/60 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold border-b border-rose-200 dark:border-rose-900/60">
                  <tr>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'ডিলিট চালান নং' : 'Deleted Inv #'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'ডিলিট করেছেন যিনি (User)' : 'Deleted By (User)'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'ডিলিটের সময় ও তারিখ' : 'Deletion Time'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'ডিলিটের কারণ (Reason)' : 'Deletion Reason'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'গ্রাহক / কাস্টমার' : 'Customer'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'মূল বিক্রয় মূল্য' : 'Grand Total'}</th>
                    <th className="py-3.5 px-4 text-center">{language === 'bn' ? 'আইটেম সংখ্যা' : 'Items'}</th>
                    <th className="py-3.5 px-4 text-center min-w-[170px]">{language === 'bn' ? 'অ্যাকশন (Actions)' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDeletedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Trash2 className="w-8 h-8 text-rose-300 dark:text-rose-800" />
                          <span className="font-semibold text-sm text-slate-600 dark:text-slate-400">
                            {language === 'bn' ? 'কোনো ডিলিট হওয়া ইনভয়েস রেকর্ড নেই' : 'No deleted invoice records found.'}
                          </span>
                          <p className="text-xs text-slate-400 max-w-sm">
                            {language === 'bn'
                              ? 'বিক্রয় তালিকা থেকে যেকোনো চালান ডিলিট করলে তা স্বয়ংক্রিয়ভাবে এই আর্কাইভে ও আলাদা ফাইলে সংরক্ষিত হবে।'
                              : 'Any deleted invoice from the sales list is automatically saved here with full audit trail.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDeletedInvoices.map(del => {
                      return (
                        <tr
                          key={del.id}
                          className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors group"
                        >
                          {/* Deleted Invoice Number */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => setSelectedDeletedInvoice(del)}
                              className="font-mono font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer text-left"
                            >
                              <span>{del.invoiceNumber}</span>
                              <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded text-[9px] font-extrabold">
                                DELETED
                              </span>
                            </button>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Org Date: {del.date}
                            </span>
                          </td>

                          {/* Deleted By User Column */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px] flex items-center justify-center border border-rose-200 dark:border-rose-800 shrink-0">
                                {del.deletedBy?.fullName?.slice(0, 2).toUpperCase() || 'US'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                                  {del.deletedBy?.fullName || del.deletedBy?.username || 'Unknown'}
                                </div>
                                <div className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold flex items-center gap-1">
                                  <ShieldCheck className="w-2.5 h-2.5 text-rose-500" />
                                  <span>{del.deletedBy?.role || 'USER'}</span>
                                  {del.deletedBy?.username && <span className="text-slate-400 font-normal">(@{del.deletedBy.username})</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Deletion Time & Date */}
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                            <div className="flex items-center gap-1 font-semibold">
                              <Clock className="w-3 h-3 text-rose-500" />
                              <span>{del.deletedAt}</span>
                            </div>
                          </td>

                          {/* Deletion Reason */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-1 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 rounded-lg text-[11px] font-semibold inline-block max-w-[180px] truncate" title={del.deletionReason || 'N/A'}>
                              {del.deletionReason || (language === 'bn' ? 'কারণ উল্লেখ নেই' : 'No reason specified')}
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{del.customerName}</div>
                            {del.customerPhone && (
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{del.customerPhone}</span>
                              </div>
                            )}
                          </td>

                          {/* Grand Total */}
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                            <div>{formatCurrency(del.grandTotal)}</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                              Paid: {formatCurrency(del.paidAmount)}
                            </div>
                          </td>

                          {/* Items */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {del.items.reduce((s, i) => s + Number(i.quantity), 0)} pcs ({del.items.length} items)
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              
                              {/* 1. View Full Details */}
                              <button
                                type="button"
                                onClick={() => setSelectedDeletedInvoice(del)}
                                title={language === 'bn' ? 'ডিলিট হওয়া চালানের বিস্তারিত দেখুন' : 'View Deleted Snapshot'}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* 2. Print/Export PDF of this invoice */}
                              <button
                                type="button"
                                onClick={() => handlePrintSingleDeletedInvoice(del)}
                                title={language === 'bn' ? 'পিডিএফ প্রিন্ট / এক্সপোর্ট' : 'Print / Export PDF'}
                                className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* 3. Restore to Active Sales */}
                              {hasDeletePermission && (
                                <button
                                  type="button"
                                  onClick={() => setInvoiceToRestore(del)}
                                  title={language === 'bn' ? 'পুনরুদ্ধার / রিস্টোর করুন (Restore to Active Sales)' : 'Restore Invoice'}
                                  className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* 4. Permanently Delete from Archive */}
                              {hasDeletePermission && (
                                <button
                                  type="button"
                                  onClick={() => setInvoiceToPermDelete(del)}
                                  title={language === 'bn' ? 'স্থায়ীভাবে মুছে ফেলুন' : 'Permanently Delete'}
                                  className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg transition-colors cursor-pointer"
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
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL: ACTIVE INVOICE DETAIL VIEW */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {selectedInvoice.invoiceNumber}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {language === 'bn' ? 'বিক্রয় চালানের বিবরণ' : 'Sale Invoice Details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">{language === 'bn' ? 'তারিখ' : 'Date'}</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{selectedInvoice.date}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{language === 'bn' ? 'কাস্টমার' : 'Customer'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{selectedInvoice.customerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{language === 'bn' ? 'মোবাইল' : 'Phone'}</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{selectedInvoice.customerPhone || 'N/A'}</span>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <MultiUserAuditTrail
                  createdBy={selectedInvoice.createdBy || selectedInvoice.cashierName}
                  cashierName={selectedInvoice.cashierName}
                  convertedBy={(selectedInvoice as any).convertedBy}
                  completedBy={(selectedInvoice as any).completedBy}
                  contributors={(selectedInvoice as any).contributors}
                  createdAt={selectedInvoice.date}
                  displayMode="detailed"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">{language === 'bn' ? 'পণ্য' : 'Product'}</th>
                    <th className="py-2 px-3 text-center">{language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                    <th className="py-2 px-3 text-right">{language === 'bn' ? 'দর' : 'Rate'}</th>
                    <th className="py-2 px-3 text-right">{language === 'bn' ? 'মোট' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div>{language === 'bn' ? (item.nameBn || item.name) : item.name}</div>
                        {item.batchNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">Batch: {item.batchNumber}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary */}
            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{language === 'bn' ? 'সাবটোটাল' : 'Subtotal'}:</span>
                <span className="font-mono font-semibold">{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              {selectedInvoice.discount > 0 && (
                <div className="flex justify-between text-amber-650 dark:text-amber-400">
                  <span>{language === 'bn' ? 'ডিসকাউন্ট' : 'Discount'}:</span>
                  <span className="font-mono font-semibold">-{formatCurrency(selectedInvoice.discount)}</span>
                </div>
              )}
              {selectedInvoice.vatAmount > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>VAT:</span>
                  <span className="font-mono font-semibold">+{formatCurrency(selectedInvoice.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>{language === 'bn' ? 'সর্বমোট (Grand Total)' : 'Grand Total'}:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{formatCurrency(selectedInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600">
                <span>{language === 'bn' ? 'পরিশোধিত (Paid)' : 'Paid Amount'}:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.paidAmount)}</span>
              </div>
              {selectedInvoice.dueAmount > 0 && (
                <div className="flex justify-between font-bold text-rose-600">
                  <span>{language === 'bn' ? 'বকেয়া (Due)' : 'Due Amount'}:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.dueAmount)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              {hasDeletePermission ? (
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceToDelete(selectedInvoice);
                    setDeleteReasonOption('MISTAKE_ENTRY');
                    setDeleteCustomReason('');
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{language === 'bn' ? 'চালান ডিলিট করুন' : 'Delete Invoice'}</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintA4(selectedInvoice)}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-amber-200 dark:border-amber-800/60"
                >
                  <Eye className="w-4 h-4" />
                  <span>{language === 'bn' ? 'প্রিন্ট প্রিভিউ' : 'Print Preview'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-emerald-200 dark:border-emerald-800/60"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintPOS(selectedInvoice)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  POS 80mm
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintA4(selectedInvoice)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === 'bn' ? 'A4 চালান প্রিন্ট' : 'Print A4'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: DELETED INVOICE AUDIT SNAPSHOT MODAL */}
      {/* ========================================================================= */}
      {selectedDeletedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                      #{selectedDeletedInvoice.invoiceNumber}
                    </span>
                    <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded text-[10px] font-bold">
                      DELETED ARCHIVE
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {language === 'bn' ? 'ডিলিট হওয়া চালানের সম্পূর্ণ অডিট স্ন্যাপশট' : 'Deleted Invoice Full Audit Snapshot'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeletedInvoice(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit Trail Banner */}
            <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-rose-600" />
                  <span className="text-slate-600 dark:text-slate-400">{language === 'bn' ? 'ডিলিট করেছেন:' : 'Deleted By:'}</span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {selectedDeletedInvoice.deletedBy?.fullName || selectedDeletedInvoice.deletedBy?.username}
                  </strong>
                  <span className="px-1.5 py-0.2 bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded text-[10px] font-mono font-bold">
                    {selectedDeletedInvoice.deletedBy?.role}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  <span>{selectedDeletedInvoice.deletedAt}</span>
                </div>
              </div>

              <div className="pt-1 border-t border-rose-200/60 dark:border-rose-900/40">
                <span className="text-slate-500 font-semibold">{language === 'bn' ? 'ডিলিটের কারণ:' : 'Reason for Deletion:'} </span>
                <span className="font-bold text-rose-700 dark:text-rose-300">
                  {selectedDeletedInvoice.deletionReason || (language === 'bn' ? 'কোনো কারণ উল্লেখ করা হয়নি' : 'Not specified')}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">{language === 'bn' ? 'মূল তারিখ' : 'Original Date'}</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{selectedDeletedInvoice.date}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{language === 'bn' ? 'কাস্টমার' : 'Customer'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{selectedDeletedInvoice.customerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{language === 'bn' ? 'মোবাইল' : 'Phone'}</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{selectedDeletedInvoice.customerPhone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{language === 'bn' ? 'মূল বিক্রয় মূল্য' : 'Grand Total'}</span>
                <span className="font-bold font-mono text-rose-600 dark:text-rose-400">{formatCurrency(selectedDeletedInvoice.grandTotal)}</span>
              </div>
            </div>

            {/* Items List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">{language === 'bn' ? 'পণ্য' : 'Product'}</th>
                    <th className="py-2 px-3 text-center">{language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                    <th className="py-2 px-3 text-right">{language === 'bn' ? 'দর' : 'Rate'}</th>
                    <th className="py-2 px-3 text-right">{language === 'bn' ? 'মোট' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedDeletedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div>{language === 'bn' ? (item.nameBn || item.name) : item.name}</div>
                        {item.batchNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">Batch: {item.batchNumber}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handlePrintSingleDeletedInvoice(selectedDeletedInvoice)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'bn' ? 'পিডিএফ প্রিন্ট / এক্সপোর্ট' : 'Print / Export PDF'}</span>
              </button>

              <div className="flex items-center gap-2">
                {hasDeletePermission && (
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceToRestore(selectedDeletedInvoice);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span>{language === 'bn' ? 'পুনরুদ্ধার / রিস্টোর করুন' : 'Restore Invoice'}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: DELETE CONFIRMATION DIALOG (With Reason Selector & User Stamp) */}
      {/* ========================================================================= */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {language === 'bn' ? 'বিক্রয় চালান ডিলিট ও অডিট সংরক্ষণ' : 'Delete Sale Invoice & Archive?'}
                </h3>
                <p className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                  {invoiceToDelete.invoiceNumber} • {invoiceToDelete.customerName}
                </p>
              </div>
            </div>

            {/* Operator Stamp Notice */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                {language === 'bn'
                  ? `ডিলিট রেকর্ডকারী: ${currentUser.fullName} (${currentUser.role})`
                  : `Audit Operator: ${currentUser.fullName} (${currentUser.role})`}
              </span>
            </div>

            {/* Reason Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {language === 'bn' ? 'ডিলিটের কারণ নির্বাচন করুন (Reason for Deletion):' : 'Select Reason for Deletion:'}
              </label>
              <select
                value={deleteReasonOption}
                onChange={e => setDeleteReasonOption(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-rose-500"
              >
                <option value="MISTAKE_ENTRY">{language === 'bn' ? '১. ভুল তথ্য এন্ট্রি / কারেকশন (Wrong Entry)' : '1. Mistake / Wrong Entry'}</option>
                <option value="CUSTOMER_CANCELLED">{language === 'bn' ? '২. কাস্টমার অর্ডার বাতিল করেছে (Customer Cancelled)' : '2. Customer Cancelled Order'}</option>
                <option value="PRODUCT_EXCHANGE">{language === 'bn' ? '৩. পণ্য পরিবর্তন / এক্সচেঞ্জ (Product Exchange)' : '3. Product Exchange'}</option>
                <option value="DUPLICATE_ENTRY">{language === 'bn' ? '৪. ডুপ্লিকেট চালান তৈরি হয়েছিল (Duplicate Invoice)' : '4. Duplicate Invoice'}</option>
                <option value="OTHER">{language === 'bn' ? '৫. অন্যান্য কারণ (Other Reason)' : '5. Other Reason'}</option>
              </select>

              <textarea
                value={deleteCustomReason}
                onChange={e => setDeleteCustomReason(e.target.value)}
                rows={2}
                placeholder={
                  language === 'bn'
                    ? 'অতিরিক্ত কোনো মন্তব্য বা বিস্তারিত কারণ লিখুন (ঐচ্ছিক)...'
                    : 'Additional notes or remarks (optional)...'
                }
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <p className="font-bold">
                {language === 'bn'
                  ? 'ডিলিট করার ফলাফল ও স্বয়ংক্রিয় সমন্বয়:'
                  : 'Automated adjustments on deletion:'}
              </p>
              <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-slate-600 dark:text-slate-400">
                <li>
                  {language === 'bn'
                    ? 'বিক্রিত পণ্যগুলোর স্টক স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে ফেরত যোগ হবে।'
                    : 'Product quantities will be automatically restored back to stock.'}
                </li>
                {invoiceToDelete.dueAmount > 0 && (
                  <li>
                    {language === 'bn'
                      ? `কাস্টমারের বকেয়া ব্যালেন্স থেকে ৳${invoiceToDelete.dueAmount} সমন্বয়/কমানো হবে।`
                      : `Customer due balance will be reduced by ৳${invoiceToDelete.dueAmount}.`}
                  </li>
                )}
                {invoiceToDelete.paidAmount > 0 && (
                  <li>
                    {language === 'bn'
                      ? `ক্যাশ/ওয়ালেট ও ডে বুক থেকে ৳${invoiceToDelete.paidAmount} সমন্বয় করা হবে।`
                      : `Wallet & daybook balance will be adjusted by ৳${invoiceToDelete.paidAmount}.`}
                  </li>
                )}
                <li className="font-semibold text-rose-700 dark:text-rose-300">
                  {language === 'bn'
                    ? "চালানটি 'Delete Invoice' আর্কাইভে এবং আলাদা ফাইলে সেভ থাকবে।"
                    : "The invoice will be preserved in 'Delete Invoice' archive & file."}
                </li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, ডিলিট ও সেভ করুন' : 'Yes, Delete & Save'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: RESTORE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {invoiceToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-900/60 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                <Undo2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {language === 'bn' ? 'চালান সক্রিয় তালিকায় ফিরিয়ে আনবেন?' : 'Restore Sale Invoice?'}
                </h3>
                <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  #{invoiceToRestore.invoiceNumber} • {invoiceToRestore.customerName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {language === 'bn'
                ? `আপনি কি নিশ্চিত যে চালান #${invoiceToRestore.invoiceNumber} পুনরায় সক্রিয় বিক্রয় তালিকায় ফিরিয়ে আনতে চান? পণ্যের স্টক এবং কাস্টমার লেজার ব্যালেন্স স্বয়ংক্রিয়ভাবে পুনরায় সমন্বয় হবে।`
                : `Are you sure you want to restore invoice #${invoiceToRestore.invoiceNumber}? Stock and balances will be re-applied.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToRestore(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, পুনরুদ্ধার করুন' : 'Yes, Restore'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: PERMANENT DELETE DIALOG (Admin Only) */}
      {/* ========================================================================= */}
      {invoiceToPermDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {language === 'bn' ? 'স্থায়ীভাবে মুছে ফেলা' : 'Permanently Delete?'}
                </h3>
                <p className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                  #{invoiceToPermDelete.invoiceNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-rose-700 dark:text-rose-300">
              {language === 'bn'
                ? 'সতর্কতা: এটি সম্পূর্ণ স্থায়ী এবং এই রেকর্ডটি আর্কাইভ থেকে মুছে যাবে। পরবর্তীতে আর পুনরুদ্ধার করা যাবে না।'
                : 'Warning: This will permanently delete this record from the archive. This cannot be undone.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToPermDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmPermDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'স্থায়ীভাবে মুছুন' : 'Delete Permanently'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: CLEAR ALL ARCHIVE DIALOG (Admin Only) */}
      {/* ========================================================================= */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {language === 'bn' ? 'সম্পূর্ণ ডিলিট আর্কাইভ পরিষ্কার করবেন?' : 'Clear Entire Archive?'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {language === 'bn'
                ? `আপনি কি নিশ্চিত যে সমস্ত ${deletedSaleInvoices.length}টি ডিলিট হওয়া চালানের রেকর্ড স্থায়ীভাবে মুছে ফেলতে চান?`
                : `Are you sure you want to clear all ${deletedSaleInvoices.length} archived deleted invoices?`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllDeletedInvoices();
                  setShowClearAllModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'হ্যাঁ, সব মুছুন' : 'Yes, Clear All'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
