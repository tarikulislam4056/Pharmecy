import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Party } from '../../types';
import { canUserDelete, canUserEdit } from '../../utils/permissions';
import { getPartyDisplaySerial } from '../../utils/partyHelpers';
import {
  Building,
  Search,
  Plus,
  ArrowUpRight,
  Edit2,
  Trash2,
  FileText,
  Printer,
  Send,
  MessageSquare,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';

interface SuppliersViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (party: Party) => void;
  onOpenPaymentOutModal: (supplierId: string) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  onOpenAddModal,
  onOpenEditModal,
  onOpenPaymentOutModal,
}) => {
  const {
    language,
    parties,
    purchaseInvoices,
    formatCurrency,
    deleteParty,
    openPrintModal,
    sendManualSms,
    companySettings,
    showToast,
    currentUser,
  } = useApp();
  const { t } = useTranslation(language);

  const [search, setSearch] = useState('');
  const [onlyPayable, setOnlyPayable] = useState(false);
  const [selectedSupplierLedger, setSelectedSupplierLedger] = useState<Party | null>(null);

  // Bulk Supplier SMS State
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [showSupplierBulkSmsModal, setShowSupplierBulkSmsModal] = useState(false);
  const [supplierBulkSmsType, setSupplierBulkSmsType] = useState<'PAYMENT_NOTICE' | 'PURCHASE_ORDER' | 'CUSTOM'>('PAYMENT_NOTICE');
  const [supplierBulkMessageText, setSupplierBulkMessageText] = useState(
    language === 'bn'
      ? `প্রিয় সরবরাহকারী, ${companySettings.name || 'আমাদের শপ'}-এর পক্ষ থেকে বকেয়া বিল পরিশোধ/নতুন অর্ডারের আপডেট বার্তা। যোগাযোগ: ${companySettings.phone}`
      : `Dear Vendor, payment notice / purchase order update from ${companySettings.name || 'our shop'}. Contact: ${companySettings.phone}`
  );
  const [isSendingSupplierBulk, setIsSendingSupplierBulk] = useState(false);
  const [supplierBulkProgress, setSupplierBulkProgress] = useState<{ sent: number; total: number } | null>(null);

  // Single Supplier SMS State
  const [singleSmsSupplier, setSingleSmsSupplier] = useState<Party | null>(null);
  const [singleSupplierSmsPreset, setSingleSupplierSmsPreset] = useState<'PAYMENT_NOTICE' | 'PURCHASE_ORDER' | 'ACCOUNT_RECONCILE' | 'CUSTOM'>('PAYMENT_NOTICE');
  const [singleSupplierSmsMessage, setSingleSupplierSmsMessage] = useState('');
  const [isSendingSingleSupplierSms, setIsSendingSingleSupplierSms] = useState(false);

  const suppliers = parties.filter(p => p.type === 'SUPPLIER');

  const filteredSuppliers = suppliers.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      (s.serialNumber && s.serialNumber.toLowerCase().includes(search.toLowerCase())) ||
      (s.bankDetails && s.bankDetails.toLowerCase().includes(search.toLowerCase()));
    const matchPayable = !onlyPayable || s.currentBalance > 0;
    return matchSearch && matchPayable;
  });

  const totalSupplierPayables = suppliers.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0);

  // Selection handlers for Bulk SMS
  const handleSelectAllSuppliers = () => {
    if (selectedSupplierIds.length === filteredSuppliers.length) {
      setSelectedSupplierIds([]);
    } else {
      setSelectedSupplierIds(filteredSuppliers.map(s => s.id));
    }
  };

  const handleToggleSelectSupplier = (id: string) => {
    setSelectedSupplierIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const buildSupplierSmsMessage = (
    type: 'PAYMENT_NOTICE' | 'PURCHASE_ORDER' | 'ACCOUNT_RECONCILE' | 'CUSTOM',
    sup: Party
  ) => {
    const store = companySettings.name || 'আমাদের শপ';
    const phone = companySettings.phone || '';

    if (type === 'PAYMENT_NOTICE') {
      return `সম্মানিত ${sup.name}, ${store}-এর পক্ষ থেকে শুভেচ্ছা। আপনার বকেয়া বিল পরিশোধ সংক্রান্ত তথ্যের জন্য সাথে থাকুন। হেল্পলাইন: ${phone}`;
    }
    if (type === 'PURCHASE_ORDER') {
      return `সম্মানিত ${sup.name}, ${store}-এর জন্য নতুন স্টক/পণ্য সরবরাহের জরুরি তাগাদা পাঠানো হচ্ছে। অনুগ্রহ করে যোগাযোগ করুন: ${phone}`;
    }
    if (type === 'ACCOUNT_RECONCILE') {
      return `সম্মানিত ${sup.name}, ${store}-এর সাথে আপনার খতিয়ান ও হিসাব মেলানোর জন্য ব্যাংকিং তথ্য/স্টেটমেন্ট প্রেরণের অনুরোধ করা হচ্ছে। যোগাযোগ: ${phone}`;
    }
    return `সম্মানিত ${sup.name}, ${store}-এর পক্ষ থেকে বিশেষ বার্তা: `;
  };

  const openSingleSupplierSmsModal = (sup: Party, defaultPreset?: 'PAYMENT_NOTICE' | 'PURCHASE_ORDER' | 'ACCOUNT_RECONCILE' | 'CUSTOM') => {
    setSingleSmsSupplier(sup);
    const preset = defaultPreset || (sup.currentBalance > 0 ? 'PAYMENT_NOTICE' : 'PURCHASE_ORDER');
    setSingleSupplierSmsPreset(preset);
    setSingleSupplierSmsMessage(buildSupplierSmsMessage(preset, sup));
  };

  const handleSendSingleSupplierSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleSmsSupplier || !singleSmsSupplier.phone) {
      showToast(language === 'bn' ? 'সরবরাহকারীর ফোন নম্বর পাওয়া যায়নি!' : 'Supplier phone number not found!', 'warning');
      return;
    }
    if (!singleSupplierSmsMessage.trim()) {
      showToast(language === 'bn' ? 'মেসেজ টেক্সট খালি রাখা যাবে না।' : 'Message text cannot be empty.', 'warning');
      return;
    }

    setIsSendingSingleSupplierSms(true);
    const success = await sendManualSms(
      singleSmsSupplier.phone,
      singleSmsSupplier.name,
      singleSupplierSmsMessage,
      'TEST'
    );
    setIsSendingSingleSupplierSms(false);
    if (success) {
      setSingleSmsSupplier(null);
    }
  };

  const handleSendSupplierBulkSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSupplierIds.length === 0) {
      showToast(language === 'bn' ? 'কোনো সরবরাহকারী নির্বাচন করা হয়নি!' : 'No suppliers selected!', 'warning');
      return;
    }
    if (!supplierBulkMessageText.trim()) {
      showToast(language === 'bn' ? 'মেসেজ টেক্সট খালি রাখা যাবে না।' : 'Message text cannot be empty.', 'warning');
      return;
    }

    setIsSendingSupplierBulk(true);
    setSupplierBulkProgress({ sent: 0, total: selectedSupplierIds.length });

    let sentCount = 0;
    const targetSuppliers = suppliers.filter(s => selectedSupplierIds.includes(s.id) && s.phone);

    for (const sup of targetSuppliers) {
      try {
        await sendManualSms(sup.phone, sup.name, supplierBulkMessageText, 'TEST');
        sentCount++;
        setSupplierBulkProgress({ sent: sentCount, total: targetSuppliers.length });
      } catch (err) {
        console.warn('Failed bulk SMS for supplier:', sup.name, err);
      }
    }

    setIsSendingSupplierBulk(false);
    setShowSupplierBulkSmsModal(false);
    showToast(
      language === 'bn'
        ? `✅ সফলভাবে ${sentCount} জন সরবরাহকারীকে SMS পাঠানো হয়েছে!`
        : `✅ Successfully dispatched SMS to ${sentCount} suppliers!`,
      'success'
    );
    setSelectedSupplierIds([]);
  };

  const hasDeletePermission = canUserDelete(currentUser, 'party');
  const hasEditPermission = canUserEdit(currentUser, 'party');

  const handleDelete = (party: Party) => {
    if (!hasDeletePermission) {
      showToast(language === 'bn' ? 'আপনার সাপ্লায়ার ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete suppliers', 'error');
      return;
    }
    if (confirm(`Delete supplier "${party.name}"?`)) {
      deleteParty(party.id);
    }
  };

  const handlePrintSupplierStatement = (sup: Party) => {
    const supBills = purchaseInvoices.filter(p => p.supplierId === sup.id);
    const totalPurchases = supBills.reduce((s, i) => s + i.grandTotal, 0);
    const totalPaid = supBills.reduce((s, i) => s + i.paidAmount, 0);
    const totalDue = sup.currentBalance;

    const cols = [
      { key: 'billNumber', header: 'Bill #', align: 'left' as const },
      { key: 'date', header: 'Date', align: 'center' as const },
      { key: 'grandTotal', header: 'Total Cost', align: 'right' as const, format: 'currency' },
      { key: 'paidAmount', header: 'Paid', align: 'right' as const, format: 'currency' },
      { key: 'dueAmount', header: 'Due Payable', align: 'right' as const, format: 'currency' },
    ];

    openPrintModal({
      type: 'STATEMENT',
      title: `Supplier Statement - ${sup.name}`,
      data: {
        reportTitle: 'SUPPLIER PURCHASE STATEMENT (সরবরাহকারী খতিয়ান)',
        partyName: sup.name,
        partyPhone: sup.phone,
        partyAddress: sup.address || 'Bangladesh',
        generatedDate: new Date().toLocaleDateString('en-GB'),
        filters: [
          { label: 'Supplier Name', value: sup.name },
          { label: 'Phone', value: sup.phone || '-' },
          { label: 'Address', value: sup.address || '-' },
        ],
        kpis: [
          { label: 'Total Purchase Bills', value: supBills.length },
          { label: 'Total Invoiced Cost', value: totalPurchases },
          { label: 'Total Paid to Vendor', value: totalPaid },
          { label: 'Current Outstanding Payable', value: totalDue },
        ],
        columns: cols,
        rows: supBills.map(pur => ({
          billNumber: `#${pur.billNumber}`,
          date: pur.date,
          grandTotal: pur.grandTotal,
          paidAmount: pur.paidAmount,
          dueAmount: pur.dueAmount,
        })),
        totals: {
          date: '',
          grandTotal: totalPurchases,
          paidAmount: totalPaid,
          dueAmount: totalDue,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-sky-600" />
            <span>{t('suppliers')}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'bn' ? 'সরবরাহকারী / মহাজন খতিয়ান, বকেয়া বিল পরিশোধ ও এসএমএস নোটিশ' : 'Vendor directory, bank accounts, purchase history, payable settlement and SMS notices'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedSupplierIds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSupplierBulkSmsModal(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer animate-bounce"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? `বাল্ক SMS পাঠান (${selectedSupplierIds.length})` : `Send Bulk SMS (${selectedSupplierIds.length})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Supplier</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 font-medium">Registered Suppliers:</div>
          <div className="text-xl font-black text-zinc-900 dark:text-white font-mono mt-0.5">
            {suppliers.length}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Total Supplier Payables Due:</div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
            {formatCurrency(totalSupplierPayables)}
          </div>
        </div>

        <div
          onClick={() => setOnlyPayable(!onlyPayable)}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            onlyPayable
              ? 'bg-rose-100 border-rose-400 dark:bg-rose-950/60 dark:border-rose-700'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-rose-300'
          }`}
        >
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium flex items-center justify-between">
            <span>Suppliers with Due Balance:</span>
            {onlyPayable && <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded">Filter Active</span>}
          </div>
          <div className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono mt-0.5">
            {suppliers.filter(s => s.currentBalance > 0).length} vendors
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search supplier by name, phone, bank info..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
          />
        </div>

        <span className="text-xs text-zinc-500 font-mono">
          Showing {filteredSuppliers.length} suppliers
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 font-semibold border-b">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAllSuppliers}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    title="Select All"
                  >
                    {selectedSupplierIds.length > 0 && selectedSupplierIds.length === filteredSuppliers.length ? (
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-zinc-600 dark:text-zinc-400 w-28">
                  {language === 'bn' ? 'সিরিয়াল নং' : 'SL / Code'}
                </th>
                <th className="py-3 px-4">Supplier Company</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Bank / Routing Details</th>
                <th className="py-3 px-4 text-right">Total Purchased</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Total Payable Due</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup, idx) => {
                  const hasPayable = sup.currentBalance > 0;
                  const isSelected = selectedSupplierIds.includes(sup.id);
                  const supBills = purchaseInvoices.filter(p => p.supplierId === sup.id);
                  const totalPurchased = supBills.reduce((s, i) => s + i.grandTotal, 0);
                  let totalPaid = supBills.reduce((s, i) => s + i.paidAmount, 0);
                  if (!hasPayable) {
                    totalPaid = totalPurchased;
                  }

                  return (
                    <tr key={sup.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectSupplier(sup.id)}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center font-mono font-black text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded shadow-2xs">
                          #{getPartyDisplaySerial(sup, idx)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{sup.name}</span>
                          <span className="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-[10px] font-mono font-bold rounded">
                            📦 {purchaseInvoices.filter(p => p.supplierId === sup.id).length} Bills
                          </span>
                        </div>
                        {sup.address && <div className="text-[10px] text-zinc-400">{sup.address}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        {sup.phone}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                        {sup.bankDetails || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600">
                        {formatCurrency(totalPurchased)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sky-600">
                        {formatCurrency(totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        {hasPayable ? (
                          <span className="text-rose-600 dark:text-rose-400">{formatCurrency(sup.currentBalance)}</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Settled</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {hasPayable && (
                            <button
                              type="button"
                              onClick={() => onOpenPaymentOutModal(sup.id)}
                              title="Pay Supplier Bill"
                              className="px-2 py-1 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Pay Bill</span>
                            </button>
                          )}
                          {sup.phone && (
                            <button
                              type="button"
                              onClick={() => openSingleSupplierSmsModal(sup)}
                              title={language === 'bn' ? 'এসএমএস পাঠান (SMS Supplier)' : 'Send SMS'}
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900 dark:text-purple-300 rounded transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedSupplierLedger(sup)}
                            title="View Purchase Bills"
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {hasEditPermission && (
                            <button
                              type="button"
                              onClick={() => onOpenEditModal(sup)}
                              title="Edit Supplier"
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasDeletePermission && (
                            <button
                              type="button"
                              onClick={() => handleDelete(sup)}
                              title="Delete Supplier"
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 rounded transition-colors cursor-pointer"
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

      {/* Supplier Purchase Ledger Modal */}
      {selectedSupplierLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-6">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-zinc-50 dark:bg-zinc-850">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Supplier Bills: {selectedSupplierLedger.name}
                  </h3>
                  <span className="font-mono font-bold text-xs bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-800">
                    #{getPartyDisplaySerial(selectedSupplierLedger)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">Phone: {selectedSupplierLedger.phone}</p>
              </div>
              <button type="button" onClick={() => setSelectedSupplierLedger(null)} className="text-zinc-400 cursor-pointer">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border rounded-lg flex justify-between items-center">
                <span>Current Total Payable Due:</span>
                <span className="font-bold font-mono text-base text-rose-700">
                  {formatCurrency(selectedSupplierLedger.currentBalance)}
                </span>
              </div>

              <h4 className="font-bold text-zinc-700 dark:text-zinc-300">Purchase Bills from this vendor:</h4>
              <table className="w-full text-left text-xs border rounded-lg overflow-hidden">
                <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600">
                  <tr>
                    <th className="p-2">Bill #</th>
                    <th className="p-2">Date</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {purchaseInvoices.filter(p => p.supplierId === selectedSupplierLedger.id).map(pur => (
                    <tr key={pur.id}>
                      <td className="p-2 font-mono font-bold">{pur.billNumber}</td>
                      <td className="p-2">{pur.date}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(pur.grandTotal)}</td>
                      <td className="p-2 text-right font-mono text-sky-600">{formatCurrency(pur.paidAmount)}</td>
                      <td className="p-2 text-right font-mono text-rose-600 font-bold">{formatCurrency(pur.dueAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t bg-zinc-50 dark:bg-zinc-850 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handlePrintSupplierStatement(selectedSupplierLedger)}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'স্টেটমেন্ট প্রিন্ট করুন' : 'Print Statement'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSupplierLedger(null)}
                className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Supplier SMS Modal */}
      {singleSmsSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-purple-50/60 dark:bg-purple-950/30">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                  {language === 'bn' ? 'সরবরাহকারীকে এসএমএস পাঠান' : 'Send Supplier SMS'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSingleSmsSupplier(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendSingleSupplierSmsSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">{singleSmsSupplier.name}</div>
                  <div className="text-[11px] font-mono text-zinc-500">{singleSmsSupplier.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400">পাওনা বিল (Payable):</div>
                  <div className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                    {formatCurrency(singleSmsSupplier.currentBalance)}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  {language === 'bn' ? 'মেসেজ টেমপ্লেট:' : 'Message Template:'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'PAYMENT_NOTICE', label: '💳 পেমেন্ট নোটিশ' },
                    { id: 'PURCHASE_ORDER', label: '🛒 নতুন স্টক অর্ডারের তাগাদা' },
                    { id: 'ACCOUNT_RECONCILE', label: '🏦 হিসাব মিলকরণ অনুরোধ' },
                    { id: 'CUSTOM', label: '✍️ কাস্টম মেসেজ' },
                  ].map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        const p = tpl.id as any;
                        setSingleSupplierSmsPreset(p);
                        setSingleSupplierSmsMessage(buildSupplierSmsMessage(p, singleSmsSupplier));
                      }}
                      className={`p-2 rounded-lg font-bold text-left border transition-colors cursor-pointer ${
                        singleSupplierSmsPreset === tpl.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">
                    {language === 'bn' ? 'এসএমএস টেক্সট (সম্পাদনাযোগ্য):' : 'SMS Text (Editable):'}
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {singleSupplierSmsMessage.length} chars ({Math.ceil(singleSupplierSmsMessage.length / 160) || 1} SMS)
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={singleSupplierSmsMessage}
                  onChange={e => setSingleSupplierSmsMessage(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-sans text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSingleSmsSupplier(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingSingleSupplierSms}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingSingleSupplierSms ? 'পাঠানো হচ্ছে...' : 'এসএমএস পাঠান'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Supplier SMS Modal */}
      {showSupplierBulkSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-purple-50/60 dark:bg-purple-950/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                    {language === 'bn' ? 'সরবরাহকারীকে বাল্ক SMS পাঠান' : 'Dispatch Bulk Supplier SMS'}
                  </h3>
                  <p className="text-[10px] text-zinc-500">
                    Selected Suppliers: <span className="font-bold text-purple-600">{selectedSupplierIds.length} recipients</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierBulkSmsModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendSupplierBulkSmsSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  {language === 'bn' ? 'এসএমএস ক্যাটাগরি:' : 'SMS Category:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSupplierBulkSmsType('PAYMENT_NOTICE');
                      setSupplierBulkMessageText(`প্রিয় সরবরাহকারী, ${companySettings.name || 'আমাদের শপ'}-এর পক্ষ থেকে বকেয়া বিল পরিশোধ/পেমেন্ট নোটিশ। যোগাযোগ: ${companySettings.phone}`);
                    }}
                    className={`p-2 rounded-xl text-left font-bold border ${
                      supplierBulkSmsType === 'PAYMENT_NOTICE'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200'
                    }`}
                  >
                    💳 পেমেন্ট নোটিশ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSupplierBulkSmsType('PURCHASE_ORDER');
                      setSupplierBulkMessageText(`প্রিয় সরবরাহকারী, ${companySettings.name || 'আমাদের শপ'}-এর জন্য নতুন স্টক/পণ্য সরবরাহ আপডেট পাঠানো প্রয়োজন। যোগাযোগ: ${companySettings.phone}`);
                    }}
                    className={`p-2 rounded-xl text-left font-bold border ${
                      supplierBulkSmsType === 'PURCHASE_ORDER'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200'
                    }`}
                  >
                    🛒 পণ্য অর্ডারের তাগাদা
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  {language === 'bn' ? 'এসএমএস টেক্সট (SMS Body)' : 'SMS Text Body'} *
                </label>
                <textarea
                  rows={4}
                  value={supplierBulkMessageText}
                  onChange={e => setSupplierBulkMessageText(e.target.value)}
                  placeholder="Type vendor update or notice message here..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-xs focus:outline-none focus:border-purple-500"
                  required
                />
                <div className="flex justify-between items-center mt-1 text-[10px] text-zinc-400">
                  <span>Characters: {supplierBulkMessageText.length}</span>
                  <span>Estimated SMS count: {Math.ceil(supplierBulkMessageText.length / 160) || 1} SMS/recipient</span>
                </div>
              </div>

              {isSendingSupplierBulk && supplierBulkProgress && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 space-y-2">
                  <div className="flex justify-between font-bold text-purple-800 dark:text-purple-300">
                    <span>Sending Bulk SMS to Vendors...</span>
                    <span>{supplierBulkProgress.sent} / {supplierBulkProgress.total}</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full transition-all duration-300"
                      style={{ width: `${(supplierBulkProgress.sent / supplierBulkProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowSupplierBulkSmsModal(false)}
                  disabled={isSendingSupplierBulk}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingSupplierBulk}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingSupplierBulk ? 'Dispatching...' : `Dispatch to ${selectedSupplierIds.length} Suppliers`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
