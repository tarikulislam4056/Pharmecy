import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { getCustomerEmiDue, getCustomerTotalDue, getDueBreakdown } from '../../utils/dueHelpers';
import {
  CreditCard,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Download,
  Send,
  Building,
  Users,
  CheckCircle2,
  CalendarClock,
  MessageCircle,
} from 'lucide-react';

interface DueListViewProps {
  onOpenPaymentInModal: (customerId?: string) => void;
  onOpenPaymentOutModal: (supplierId?: string) => void;
}

export const DueListView: React.FC<DueListViewProps> = ({
  onOpenPaymentInModal,
  onOpenPaymentOutModal,
}) => {
  const {
    language,
    parties,
    installmentSchemes,
    setActiveTab,
    formatCurrency,
    openPrintModal,
    showToast,
    sendDueReminderSms,
    smsConfig,
    companySettings,
  } = useApp();
  const { t } = useTranslation(language);

  const [activeSubTab, setActiveSubTab] = useState<'customer-due' | 'supplier-due'>('customer-due');
  const [search, setSearch] = useState('');
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  // Regular customer dues only (excluding Installment / EMI Hub sales)
  const customerDues = useMemo(() => {
    return parties.filter(p => p.type === 'CUSTOMER' && p.currentBalance > 0);
  }, [parties]);

  const supplierDues = useMemo(() => {
    return parties.filter(p => p.type === 'SUPPLIER' && p.currentBalance > 0);
  }, [parties]);

  const totalCustomerReceivables = useMemo(() => {
    return customerDues.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  }, [customerDues]);

  const totalSupplierPayables = useMemo(() => {
    return supplierDues.reduce((sum, s) => sum + (s.currentBalance || 0), 0);
  }, [supplierDues]);

  const currentList = useMemo(() => {
    const list = activeSubTab === 'customer-due' ? customerDues : supplierDues;
    return list.filter(
      p => p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)
    );
  }, [activeSubTab, customerDues, supplierDues, search]);

  const handleSendReminderSMS = async (party: typeof parties[0]) => {
    const totalDue = party.currentBalance || 0;
    await sendDueReminderSms(party, totalDue);
  };

  const handleSendWhatsAppReminder = (party: typeof parties[0]) => {
    if (!party.phone || party.phone === 'N/A') {
      showToast(language === 'bn' ? 'এই কাস্টমারের কোন ফোন নম্বর নেই।' : 'No phone number available.', 'warning');
      return;
    }
    const cleanPhone = party.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('88') ? cleanPhone : (cleanPhone.startsWith('0') ? '88' + cleanPhone : cleanPhone);
    const shopName = companySettings.name || 'DokanPro Enterprise';
    const text = language === 'bn'
      ? `আসসালামু আলাইকুম ${party.name}, ${shopName}-এ আপনার পূর্বের বকেয়া হিসাব রয়েছে ${formatCurrency(party.currentBalance)} টাকা। অনুগ্রহ করে দ্রুত বকেয়া পরিশোধ করার জন্য অনুরোধ করা হচ্ছে। ধন্যবাদ!`
      : `Dear ${party.name}, gentle reminder from ${shopName} regarding your outstanding due balance of ${formatCurrency(party.currentBalance)}. Kindly settle at your earliest convenience. Thank you!`;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportCSV = () => {
    if (currentList.length === 0) {
      showToast(language === 'bn' ? 'এক্সপোর্ট করার জন্য কোন তথ্য নেই।' : 'No data to export.', 'info');
      return;
    }
    const headers = ['Party Name', 'Phone', 'Type', 'Address', 'Due Amount'];
    const rows = currentList.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.phone || ''}"`,
      `"${p.type}"`,
      `"${(p.address || p.bankDetails || '').replace(/"/g, '""')}"`,
      p.currentBalance || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeSubTab}_due_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(language === 'bn' ? 'CSV ফাইল ডাউনলোড সম্পন্ন হয়েছে!' : 'CSV file downloaded successfully!', 'success');
  };

  const handleSendBulkDueSms = async () => {
    if (customerDues.length === 0) {
      showToast(language === 'bn' ? 'কোন কাস্টমারের বকেয়া নেই।' : 'No customers with due balances.', 'info');
      return;
    }
    setIsSendingBulk(true);
    let sentCount = 0;
    for (const customer of customerDues) {
      if (customer.phone && customer.phone !== 'N/A') {
        const totalDue = customer.currentBalance || 0;
        await sendDueReminderSms(customer, totalDue);
        sentCount++;
      }
    }
    setIsSendingBulk(false);
    showToast(
      language === 'bn'
        ? `মোট ${sentCount} জন কাস্টমারকে বকেয়া তাগাদা SMS পাঠানো সম্পন্ন হয়েছে!`
        : `Sent due reminder SMS to ${sentCount} customers!`,
      'success'
    );
  };

  const handlePrintMasterDueSheet = () => {
    const title = activeSubTab === 'customer-due' ? (language === 'bn' ? 'কাস্টমার বকেয়া তালিকা' : 'Customer Master Due List') : (language === 'bn' ? 'সাপ্লায়ার পাওনা তালিকা' : 'Supplier Master Due List');
    
    openPrintModal({
      type: 'REPORT',
      title: title,
      data: {
        reportTitle: title,
        period: new Date().toLocaleDateString('en-GB'),
        columns: [
          { header: language === 'bn' ? 'নাম' : 'Name', key: 'name' },
          { header: language === 'bn' ? 'ফোন' : 'Phone', key: 'phone' },
          { header: language === 'bn' ? 'বকেয়া' : 'Due Amount', key: 'dueAmount', align: 'right', format: 'currency' },
        ],
        rows: currentList.map(p => ({
          name: p.name,
          phone: p.phone,
          dueAmount: p.currentBalance
        })),
        totals: {
          dueAmount: activeSubTab === 'customer-due' ? totalCustomerReceivables : totalSupplierPayables
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <span>{t('due_list')} & Ledger Reconciliation</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'bn'
              ? 'কাস্টমার বাকী ও ইএমআই/কিস্তির মোট পাওনা এবং মহাজন দেনার বকেয়া তালিকা'
              : 'Complete accounts receivable (regular credit & installment dues) and payable balances'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'customer-due' && customerDues.length > 0 && (
            <button
              type="button"
              disabled={isSendingBulk}
              onClick={handleSendBulkDueSms}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSendingBulk
                  ? language === 'bn'
                    ? 'পাঠানো হচ্ছে...'
                    : 'Sending SMS...'
                  : language === 'bn'
                  ? 'সকলকে বকেয়া SMS পাঠান'
                  : 'Send Bulk Due SMS'}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="Export full list to CSV/Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'এক্সপোর্ট CSV' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrintMasterDueSheet}
            className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Master Due List</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer Due Card */}
        <div
          onClick={() => setActiveSubTab('customer-due')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeSubTab === 'customer-due'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 shadow-xs'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
              <Users className="w-4 h-4" />
              <span>Customer Receivables (কাস্টমার মোট পাওনা)</span>
            </div>
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded font-mono font-bold text-xs">
              {customerDues.length} Parties
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono mt-2">
            {formatCurrency(totalCustomerReceivables)}
          </div>
        </div>

        {/* Supplier Due Card */}
        <div
          onClick={() => setActiveSubTab('supplier-due')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeSubTab === 'supplier-due'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-400 shadow-xs'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
              <Building className="w-4 h-4" />
              <span>Supplier Payables (দোকানের মহাজন দেনা)</span>
            </div>
            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded font-mono font-bold text-xs">
              {supplierDues.length} Vendors
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono mt-2">
            {formatCurrency(totalSupplierPayables)}
          </div>
        </div>
      </div>

      {/* Sub-Tabs & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('customer-due')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'customer-due'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Customer Due List ({customerDues.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('supplier-due')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'supplier-due'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Supplier Due List ({supplierDues.length})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search party by name or phone..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Due Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 font-semibold border-b">
              <tr>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Address / Details</th>
                <th className="py-3 px-4 text-right">Outstanding Due Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                      No pending due balances in this category!
                    </p>
                  </td>
                </tr>
              ) : (
                currentList.map(party => {
                  const dueVal = party.currentBalance || 0;

                  return (
                    <tr key={party.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900 dark:text-white">
                          {party.name}
                        </div>
                        {party.email && <div className="text-[10px] text-zinc-400">{party.email}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        {party.phone}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 max-w-xs truncate">
                        {party.address || party.bankDetails || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="font-black text-sm">
                          <span
                            className={
                              activeSubTab === 'customer-due'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {formatCurrency(dueVal)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {activeSubTab === 'customer-due' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenPaymentInModal(party.id)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>{t('record_payment_in')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendReminderSMS(party)}
                                title="Send Due Reminder SMS"
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:hover:bg-amber-900 dark:text-amber-300 rounded cursor-pointer transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppReminder(party)}
                                title="Send Due Notice via WhatsApp"
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded cursor-pointer transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenPaymentOutModal(party.id)}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>{t('record_payment_out')}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {currentList.length > 0 && (
              <tfoot className="bg-zinc-50 dark:bg-zinc-850 font-bold border-t">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right uppercase">
                    Total Selected Due:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-base font-black">
                    <span
                      className={
                        activeSubTab === 'customer-due'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {formatCurrency(
                        activeSubTab === 'customer-due'
                          ? totalCustomerReceivables
                          : totalSupplierPayables
                      )}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

