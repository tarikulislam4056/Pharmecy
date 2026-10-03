import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { getCustomerTotalDue, getDueBreakdown } from '../../utils/dueHelpers';
import { Party } from '../../types';
import { canUserDelete, canUserEdit } from '../../utils/permissions';
import { getPartyDisplaySerial } from '../../utils/partyHelpers';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  CreditCard,
  ArrowDownLeft,
  Edit2,
  Trash2,
  Receipt,
  FileText,
  Printer,
  Send,
  CheckSquare,
  Square,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  X,
} from 'lucide-react';

interface CustomersViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (party: Party) => void;
  onOpenPaymentInModal: (customerId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenAddModal,
  onOpenEditModal,
  onOpenPaymentInModal,
}) => {
  const { language, parties, saleInvoices, installmentSchemes, formatCurrency, deleteParty, openPrintModal, sendDueReminderSms, sendManualSms, companySettings, showToast, currentUser } = useApp();
  const { t } = useTranslation(language);

  const [search, setSearch] = useState('');
  const [onlyDue, setOnlyDue] = useState(false);
  const [selectedCustomerLedger, setSelectedCustomerLedger] = useState<Party | null>(null);

  // Bulk SMS State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [showBulkSmsModal, setShowBulkSmsModal] = useState(false);
  const [bulkSmsType, setBulkSmsType] = useState<'PROMOTIONAL' | 'DUE_REMINDER' | 'CUSTOM'>('PROMOTIONAL');
  const [bulkMessageText, setBulkMessageText] = useState(
    language === 'bn'
      ? `প্রিয় গ্রাহক, ${companySettings.name || 'আমাদের স্টোর'} থেকে আপনার জন্য বিশেষ অফার ও ডিসকাউন্ট চলছে! ভিজিট করুন বা যোগাযোগ করুন: ${companySettings.phone}`
      : `Dear Customer, special offers and discounts are live now at ${companySettings.name || 'our store'}! Contact: ${companySettings.phone}`
  );
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ sent: number; total: number } | null>(null);

  // Single Customer Quick SMS State
  const [singleSmsCustomer, setSingleSmsCustomer] = useState<Party | null>(null);
  const [singleSmsPreset, setSingleSmsPreset] = useState<'DUE_REMINDER' | 'PROMOTIONAL' | 'STATEMENT' | 'CUSTOM'>('DUE_REMINDER');
  const [singleSmsMessage, setSingleSmsMessage] = useState('');
  const [isSendingSingleSms, setIsSendingSingleSms] = useState(false);

  const buildCustomerSmsMessage = (
    type: 'DUE_REMINDER' | 'PROMOTIONAL' | 'STATEMENT' | 'CUSTOM',
    cust: Party
  ) => {
    const store = companySettings.name || 'আমাদের শপ';
    const phone = companySettings.phone || '';
    const due = getCustomerTotalDue(cust, installmentSchemes);

    if (type === 'DUE_REMINDER') {
      return `সম্মানিত ${cust.name}, ${store}-এ আপনার বর্তমান জের/বকেয়ার পরিমাণ ৳${due.toLocaleString()}। বকেয়া টাকা দ্রুত পরিশোধের জন্য অনুরোধ করা হচ্ছে। হেল্পলাইন: ${phone}`;
    }
    if (type === 'PROMOTIONAL') {
      return `সম্মানিত ${cust.name}, ${store}-এ কেনাকাটার জন্য ধন্যবাদ! আমাদের নতুন আইটেম ও অফার দেখতে আসুন। হেল্পলাইন: ${phone}`;
    }
    if (type === 'STATEMENT') {
      return `সম্মানিত ${cust.name}, ${store}-এ আপনার খতিয়ানের মোট বকেয়া ৳${due.toLocaleString()}। বিস্তারিত জানতে ও খতিয়ান পরিশোধ করতে যোগাযোগ করুন: ${phone}`;
    }
    return `সম্মানিত ${cust.name}, ${store}-এর পক্ষ থেকে বিশেষ বার্তা: `;
  };

  const openSingleSmsModal = (cust: Party, defaultPreset?: 'DUE_REMINDER' | 'PROMOTIONAL' | 'STATEMENT' | 'CUSTOM') => {
    setSingleSmsCustomer(cust);
    const due = getCustomerTotalDue(cust, installmentSchemes);
    const preset = defaultPreset || (due > 0 ? 'DUE_REMINDER' : 'PROMOTIONAL');
    setSingleSmsPreset(preset);
    setSingleSmsMessage(buildCustomerSmsMessage(preset, cust));
  };

  const handleSendSingleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleSmsCustomer || !singleSmsCustomer.phone) {
      showToast(language === 'bn' ? 'গ্রাহকের ফোন নম্বর পাওয়া যায়নি!' : 'Customer phone number not found!', 'warning');
      return;
    }
    if (!singleSmsMessage.trim()) {
      showToast(language === 'bn' ? 'মেসেজ টেক্সট লিখুন।' : 'Write message text.', 'warning');
      return;
    }

    setIsSendingSingleSms(true);
    const success = await sendManualSms(
      singleSmsCustomer.phone,
      singleSmsCustomer.name,
      singleSmsMessage,
      singleSmsPreset === 'DUE_REMINDER' ? 'DUE_REMINDER' : 'TEST'
    );
    setIsSendingSingleSms(false);
    if (success) {
      setSingleSmsCustomer(null);
    }
  };

  const customers = parties.filter(p => p.type === 'CUSTOMER');

  const filteredCustomers = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.serialNumber && c.serialNumber.toLowerCase().includes(search.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()));
    const totalDue = getCustomerTotalDue(c, installmentSchemes);
    const matchDue = !onlyDue || totalDue > 0;
    return matchSearch && matchDue;
  });

  const totalDueReceivables = customers.reduce((sum, c) => sum + getCustomerTotalDue(c, installmentSchemes), 0);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedCustomerIds.length === filteredCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleToggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSendBulkSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomerIds.length === 0) {
      showToast(language === 'bn' ? 'কোনো কাস্টমার নির্বাচন করা হয়নি!' : 'No customers selected!', 'warning');
      return;
    }
    if (!bulkMessageText.trim()) {
      showToast(language === 'bn' ? 'মেসেজ টেক্সট খালি রাখা যাবে না।' : 'Message text cannot be empty.', 'warning');
      return;
    }

    setIsSendingBulk(true);
    setBulkProgress({ sent: 0, total: selectedCustomerIds.length });

    let sentCount = 0;
    const targetCustomers = customers.filter(c => selectedCustomerIds.includes(c.id) && c.phone);

    for (const cust of targetCustomers) {
      try {
        let msg = bulkMessageText;
        if (bulkSmsType === 'DUE_REMINDER') {
          msg = `সম্মানিত ${cust.name}, ${companySettings.name}-এ আপনার বর্তমান বকেয়া ৳${cust.currentBalance.toLocaleString()} টাকা। অনুগ্রহ করে পরিশোধ করুন। হেল্পলাইন: ${companySettings.phone}`;
        }
        await sendManualSms(cust.phone, cust.name, msg, bulkSmsType === 'DUE_REMINDER' ? 'DUE_REMINDER' : 'TEST');
        sentCount++;
        setBulkProgress({ sent: sentCount, total: targetCustomers.length });
      } catch (err) {
        console.warn('Failed bulk SMS for customer:', cust.name, err);
      }
    }

    setIsSendingBulk(false);
    setShowBulkSmsModal(false);
    showToast(
      language === 'bn'
        ? `✅ সফলভাবে ${sentCount} জন কাস্টমারকে বাল্ক SMS পাঠানো হয়েছে!`
        : `✅ Successfully dispatched bulk SMS to ${sentCount} customers!`,
      'success'
    );
    setSelectedCustomerIds([]);
  };

  const hasDeletePermission = canUserDelete(currentUser, 'party');
  const hasEditPermission = canUserEdit(currentUser, 'party');

  const handleDelete = (party: Party) => {
    if (!hasDeletePermission) {
      showToast(language === 'bn' ? 'আপনার কাস্টমার ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete customers', 'error');
      return;
    }
    if (confirm(`Delete customer "${party.name}"?`)) {
      deleteParty(party.id);
    }
  };

  const handlePrintCustomerStatement = (cust: Party) => {
    const custInvoices = saleInvoices.filter(i => i.customerId === cust.id);
    const totalSales = custInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalPaid = custInvoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalDue = cust.currentBalance;

    const cols = [
      { key: 'invoiceNumber', header: 'Invoice #', align: 'left' as const },
      { key: 'date', header: 'Date', align: 'center' as const },
      { key: 'grandTotal', header: 'Total Amount', align: 'right' as const, format: 'currency' },
      { key: 'paidAmount', header: 'Paid', align: 'right' as const, format: 'currency' },
      { key: 'dueAmount', header: 'Due', align: 'right' as const, format: 'currency' },
    ];

    openPrintModal({
      type: 'STATEMENT',
      title: `Customer Statement - ${cust.name}`,
      data: {
        reportTitle: 'CUSTOMER ACCOUNT STATEMENT (গ্রাহক খতিয়ান)',
        partyName: cust.name,
        partyPhone: cust.phone,
        partyAddress: cust.address || 'Bangladesh',
        generatedDate: new Date().toLocaleDateString('en-GB'),
        filters: [
          { label: 'Customer Name', value: cust.name },
          { label: 'Phone', value: cust.phone || '-' },
          { label: 'Credit Limit', value: formatCurrency(cust.creditLimit || 0) },
        ],
        kpis: [
          { label: 'Total Invoices', value: custInvoices.length },
          { label: 'Total Billed Amount', value: totalSales },
          { label: 'Total Paid', value: totalPaid },
          { label: 'Current Outstanding Due', value: totalDue },
        ],
        columns: cols,
        rows: custInvoices.map(inv => ({
          invoiceNumber: `#${inv.invoiceNumber}`,
          date: inv.date,
          grandTotal: inv.grandTotal,
          paidAmount: inv.paidAmount,
          dueAmount: inv.dueAmount,
        })),
        totals: {
          date: '',
          grandTotal: totalSales,
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
            <Users className="w-5 h-5 text-emerald-600" />
            <span>{t('customers')}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'bn' ? 'কাস্টমার প্রোফাইল, বাকি খতিয়ান ও বাল্ক এসএমএস ক্যাম্পেইন' : 'Customer CRM directory, credit limits, sales ledger and bulk SMS campaigns'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedCustomerIds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkSmsModal(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer animate-bounce"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? `বাল্ক SMS পাঠান (${selectedCustomerIds.length})` : `Send Bulk SMS (${selectedCustomerIds.length})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('add_new_customer')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 font-medium">Registered Customers:</div>
          <div className="text-xl font-black text-zinc-900 dark:text-white font-mono mt-0.5">
            {customers.length}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Total Customer Due Balance:</div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
            {formatCurrency(totalDueReceivables)}
          </div>
        </div>

        <div
          onClick={() => setOnlyDue(!onlyDue)}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            onlyDue
              ? 'bg-amber-100 border-amber-400 dark:bg-amber-950/60 dark:border-amber-700'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-300'
          }`}
        >
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium flex items-center justify-between">
            <span>Customers with Due Balance:</span>
            {onlyDue && <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">Filter Active</span>}
          </div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono mt-0.5">
            {customers.filter(c => getCustomerTotalDue(c, installmentSchemes) > 0).length} parties
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer by name, mobile, address..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {selectedCustomerIds.length > 0 && (
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-900">
              {selectedCustomerIds.length} selected
            </span>
          )}
          <span className="text-xs text-zinc-500 font-mono">
            Showing {filteredCustomers.length} customers
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 font-semibold border-b">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button type="button" onClick={handleSelectAll} className="cursor-pointer text-zinc-500 hover:text-zinc-800">
                    {selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-zinc-600 dark:text-zinc-400 w-28">
                  {language === 'bn' ? 'সিরিয়াল নং' : 'SL / Code'}
                </th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Phone / Contact</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Current Due Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => {
                  const breakdown = getDueBreakdown(cust, installmentSchemes);
                  const hasDue = breakdown.totalDue > 0;
                  const isSelected = selectedCustomerIds.includes(cust.id);
                  const custInvoices = saleInvoices.filter(i => i.customerId === cust.id);
                  const totalSales = custInvoices.reduce((s, i) => s + i.grandTotal, 0);
                  let totalPaid = custInvoices.reduce((s, i) => s + i.paidAmount, 0);
                  if (!hasDue) {
                    totalPaid = totalSales;
                  }

                  return (
                    <tr key={cust.id} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${isSelected ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''}`}>
                      <td className="py-3 px-3 text-center">
                        <button type="button" onClick={() => handleToggleSelectCustomer(cust.id)} className="cursor-pointer">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center font-mono font-black text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded shadow-2xs">
                          #{getPartyDisplaySerial(cust, idx)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{cust.name}</span>
                          <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold rounded">
                            📦 {saleInvoices.filter(i => i.customerId === cust.id).length} Invoices
                          </span>
                          {breakdown.hasEmiDue && (
                            <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded">
                              EMI
                            </span>
                          )}
                        </div>
                        {cust.email && <div className="text-[10px] text-zinc-400">{cust.email}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        {cust.phone}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 max-w-xs truncate">
                        {cust.address || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-500">
                        {cust.creditLimit ? formatCurrency(cust.creditLimit) : 'No Limit'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600">
                        {formatCurrency(totalSales)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sky-600">
                        {formatCurrency(totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        {hasDue ? (
                          <div>
                            <span className="text-amber-600 dark:text-amber-400">{formatCurrency(breakdown.totalDue)}</span>
                            {breakdown.hasEmiDue && breakdown.hasRegularDue && (
                              <div className="text-[10px] text-zinc-400 font-normal">
                                Reg: ৳{breakdown.regularDue.toLocaleString()} | EMI: ৳{breakdown.emiDue.toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Clear</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {hasDue && (
                            <button
                              type="button"
                              onClick={() => onOpenPaymentInModal(cust.id)}
                              title="Receive Payment"
                              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>Pay Due</span>
                            </button>
                          )}
                          {cust.phone && (
                            <button
                              type="button"
                              onClick={() => openSingleSmsModal(cust)}
                              title={language === 'bn' ? 'এসএমএস পাঠান (SMS Customer)' : 'Send SMS'}
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900 dark:text-purple-300 rounded transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerLedger(cust)}
                            title="View Statement / Invoices"
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {hasEditPermission && (
                            <button
                              type="button"
                              onClick={() => onOpenEditModal(cust)}
                              title="Edit Customer"
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasDeletePermission && (
                            <button
                              type="button"
                              onClick={() => handleDelete(cust)}
                              title="Delete Customer"
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

      {/* ========================================================================= */}
      {/* BULK SMS MODAL */}
      {/* ========================================================================= */}
      {showBulkSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-purple-50 dark:bg-purple-950/40">
              <h3 className="font-bold text-sm text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span>{language === 'bn' ? `বাল্ক SMS ক্যাম্পেইন (${selectedCustomerIds.length} জন কাস্টমার)` : `Bulk SMS Campaign (${selectedCustomerIds.length} Customers)`}</span>
              </h3>
              <button type="button" onClick={() => setShowBulkSmsModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBulkSmsSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  {language === 'bn' ? 'মেসেজ ক্যাটাগরি / উদ্দেশ্য' : 'Campaign Type'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkSmsType('PROMOTIONAL');
                      setBulkMessageText(
                        language === 'bn'
                          ? `প্রিয় গ্রাহক, ${companySettings.name}-এ নতুন কালেকশন ও ডিসকাউন্ট অফার চলছে! আজই ভিজিট করুন। যোগাযোগ: ${companySettings.phone}`
                          : `Dear Customer, new arrivals & discount offers are live at ${companySettings.name}! Contact: ${companySettings.phone}`
                      );
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      bulkSmsType === 'PROMOTIONAL'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600'
                    }`}
                  >
                    🎉 Promotional Offer
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBulkSmsType('DUE_REMINDER');
                      setBulkMessageText(
                        language === 'bn'
                          ? `সম্মানিত গ্রাহক, ${companySettings.name}-এ আপনার বকেয়া টাকা পরিশোধের অনুরোধ করা হচ্ছে। হেল্পলাইন: ${companySettings.phone}`
                          : `Dear Customer, please clear your outstanding due balance at ${companySettings.name}. Helpline: ${companySettings.phone}`
                      );
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      bulkSmsType === 'DUE_REMINDER'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600'
                    }`}
                  >
                    ⚠️ Payment Due Reminder
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBulkSmsType('CUSTOM');
                      setBulkMessageText('');
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      bulkSmsType === 'CUSTOM'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600'
                    }`}
                  >
                    ✍️ Custom Message
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  {language === 'bn' ? 'এসএমএস টেক্সট (SMS Body)' : 'SMS Text Body'} *
                </label>
                <textarea
                  rows={4}
                  value={bulkMessageText}
                  onChange={e => setBulkMessageText(e.target.value)}
                  placeholder="Type promotional or reminder message here..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-xs focus:outline-none focus:border-purple-500"
                  required
                />
                <div className="flex justify-between items-center mt-1 text-[10px] text-zinc-400">
                  <span>Characters: {bulkMessageText.length}</span>
                  <span>Estimated SMS count: {Math.ceil(bulkMessageText.length / 160) || 1} SMS/recipient</span>
                </div>
              </div>

              {isSendingBulk && bulkProgress && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 space-y-2">
                  <div className="flex justify-between font-bold text-purple-800 dark:text-purple-300">
                    <span>Sending Bulk SMS...</span>
                    <span>{bulkProgress.sent} / {bulkProgress.total}</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.sent / bulkProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowBulkSmsModal(false)}
                  disabled={isSendingBulk}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingBulk}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingBulk ? 'Dispatching...' : `Dispatch to ${selectedCustomerIds.length} Customers`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Ledger History Modal */}
      {selectedCustomerLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-6">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-zinc-50 dark:bg-zinc-850">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Customer Statement: {selectedCustomerLedger.name}
                  </h3>
                  <span className="font-mono font-bold text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                    #{getPartyDisplaySerial(selectedCustomerLedger)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">Phone: {selectedCustomerLedger.phone}</p>
              </div>
              <button type="button" onClick={() => setSelectedCustomerLedger(null)} className="text-zinc-400 cursor-pointer">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border rounded-lg flex justify-between items-center">
                <span>Current Outstanding Due Balance:</span>
                <span className="font-bold font-mono text-base text-amber-700">
                  {formatCurrency(selectedCustomerLedger.currentBalance)}
                </span>
              </div>

              <h4 className="font-bold text-zinc-700 dark:text-zinc-300">
                {language === 'bn' ? 'এই কাস্টমারের সকল বিক্রয় ইনভয়েস:' : 'Sales Invoices for this customer:'}
              </h4>
              <table className="w-full text-left text-xs border rounded-lg overflow-hidden">
                <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600">
                  <tr>
                    <th className="p-2">{language === 'bn' ? 'চালান #' : 'Invoice #'}</th>
                    <th className="p-2">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="p-2">{language === 'bn' ? 'ক্যাশিয়ার' : 'Cashier / User'}</th>
                    <th className="p-2 text-right">{language === 'bn' ? 'মোট' : 'Total'}</th>
                    <th className="p-2 text-right">{language === 'bn' ? 'জমা' : 'Paid'}</th>
                    <th className="p-2 text-right">{language === 'bn' ? 'বকেয়া' : 'Due'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {saleInvoices.filter(i => i.customerId === selectedCustomerLedger.id).map(inv => (
                    <tr key={inv.id}>
                      <td className="p-2 font-mono font-bold text-blue-600 dark:text-blue-400">{inv.invoiceNumber}</td>
                      <td className="p-2 text-slate-500 font-mono text-[11px]">{inv.date}</td>
                      <td className="p-2 text-slate-700 dark:text-slate-300 font-medium">
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px]">
                          👤 {inv.cashierName || 'Admin'}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(inv.grandTotal)}</td>
                      <td className="p-2 text-right font-mono text-emerald-600 font-semibold">{formatCurrency(inv.paidAmount)}</td>
                      <td className="p-2 text-right font-mono text-rose-600 font-bold">{formatCurrency(inv.dueAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t bg-zinc-50 dark:bg-zinc-850 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handlePrintCustomerStatement(selectedCustomerLedger)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'স্টেটমেন্ট প্রিন্ট করুন' : 'Print Statement'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCustomerLedger(null)}
                className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Customer Quick SMS Modal */}
      {singleSmsCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-purple-50/60 dark:bg-purple-950/30">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                  {language === 'bn' ? 'কাস্টমারকে এসএমএস পাঠান' : 'Send Customer SMS'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSingleSmsCustomer(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendSingleSmsSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">{singleSmsCustomer.name}</div>
                  <div className="text-[11px] font-mono text-zinc-500">{singleSmsCustomer.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400">বর্তমান জের (Due):</div>
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {formatCurrency(getCustomerTotalDue(singleSmsCustomer, installmentSchemes))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  {language === 'bn' ? 'মেসেজ টেমপ্লেট:' : 'Message Template:'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'DUE_REMINDER', label: '🚨 বকেয়া তাগাদা' },
                    { id: 'PROMOTIONAL', label: '🎁 অফার/প্রোমোশন' },
                    { id: 'STATEMENT', label: '📄 খতিয়ান তথ্য' },
                    { id: 'CUSTOM', label: '✍️ কাস্টম মেসেজ' },
                  ].map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        const p = tpl.id as any;
                        setSingleSmsPreset(p);
                        setSingleSmsMessage(buildCustomerSmsMessage(p, singleSmsCustomer));
                      }}
                      className={`p-2 rounded-lg font-bold text-left border transition-colors cursor-pointer ${
                        singleSmsPreset === tpl.id
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
                    {singleSmsMessage.length} chars ({Math.ceil(singleSmsMessage.length / 160) || 1} SMS)
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={singleSmsMessage}
                  onChange={e => setSingleSmsMessage(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-sans text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSingleSmsCustomer(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingSingleSms}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingSingleSms ? 'পাঠানো হচ্ছে...' : 'এসএমএস পাঠান'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
