import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Badge } from '../common/Badge';
import { DatePeriodFilter } from '../common/DatePeriodFilter';
import { DayBookEntry, TransactionType } from '../../types';
import {
  BookOpen,
  Search,
  Filter,
  Printer,
  Download,
  Calendar,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  User,
} from 'lucide-react';

export const DayBookView: React.FC = () => {
  const {
    language,
    dayBookEntries,
    wallets,
    users,
    formatCurrency,
    companySettings,
    openPrintModal,
    saleInvoices,
    expenseVouchers,
    payrollHistory,
    advanceSalaries,
    installmentSchemes,
    cashAdjustments,
    parties,
  } = useApp();
  const { t } = useTranslation(language);

  const [search, setSearch] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string>('ALL');
  const [selectedFlow, setSelectedFlow] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedCashier, setSelectedCashier] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [periodLabel, setPeriodLabel] = useState<string>('');

  // Helper to resolve creator/cashier information
  const getCreatorInfo = (entry: DayBookEntry) => {
    const user = users.find(
      u =>
        u.id === entry.createdBy ||
        u.username.toLowerCase() === (entry.createdBy || '').toLowerCase() ||
        u.fullName.toLowerCase() === (entry.createdBy || '').toLowerCase()
    );
    const name = user?.fullName || entry.createdBy || 'Admin';
    const role = user?.role || 'ADMIN';
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
    dayBookEntries.forEach(entry => {
      const info = getCreatorInfo(entry);
      const key = entry.createdBy || info.name;
      if (!map.has(key)) {
        map.set(key, { id: key, name: info.name, role: info.role });
      }
    });
    return Array.from(map.values());
  }, [users, dayBookEntries]);

  // Filtered DayBook Entries
  const filteredEntries = useMemo(() => {
    return dayBookEntries.filter(entry => {
      const matchSearch =
        entry.voucherNo.toLowerCase().includes(search.toLowerCase()) ||
        (entry.partyName && entry.partyName.toLowerCase().includes(search.toLowerCase())) ||
        entry.remarks.toLowerCase().includes(search.toLowerCase()) ||
        getCreatorInfo(entry).name.toLowerCase().includes(search.toLowerCase());

      const matchWallet = selectedWallet === 'ALL' || entry.walletId === selectedWallet;
      const matchFlow = selectedFlow === 'ALL' || entry.flow === selectedFlow;
      const matchType = selectedType === 'ALL' || entry.type === selectedType;
      
      const creatorInfo = getCreatorInfo(entry);
      const matchCashier =
        selectedCashier === 'ALL' ||
        entry.createdBy === selectedCashier ||
        creatorInfo.name.toLowerCase() === selectedCashier.toLowerCase() ||
        (creatorInfo.user && creatorInfo.user.id === selectedCashier);

      let matchDate = true;
      if (startDate && entry.date < startDate) matchDate = false;
      if (endDate && entry.date > endDate) matchDate = false;

      return matchSearch && matchWallet && matchFlow && matchType && matchCashier && matchDate;
    });
  }, [dayBookEntries, search, selectedWallet, selectedFlow, selectedType, selectedCashier, startDate, endDate, users]);

  // Aggregate Totals
  const totalMoneyIn = filteredEntries
    .filter(e => e.flow === 'IN')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalMoneyOut = filteredEntries
    .filter(e => e.flow === 'OUT')
    .reduce((sum, e) => sum + e.amount, 0);

  const netCashFlow = totalMoneyIn - totalMoneyOut;

  // Print full Day Book Statement Report
  const handlePrint = (autoDownloadPdf = false) => {
    const printDate = new Date().toLocaleDateString('en-GB');
    const selectedWalletObj = wallets.find(w => w.id === selectedWallet);

    const activePeriodText = periodLabel || (startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `To ${endDate}` : (language === 'bn' ? 'সকল তারিখ' : 'All Dates'));

    const filtersApplied: { label: string; value: string }[] = [];
    if (startDate || endDate) {
      filtersApplied.push({
        label: language === 'bn' ? 'সময়কাল' : 'Period',
        value: activePeriodText,
      });
    }
    if (selectedWallet !== 'ALL' && selectedWalletObj) {
      filtersApplied.push({
        label: language === 'bn' ? 'অ্যাকাউন্ট/ওয়ালেট' : 'Wallet',
        value: selectedWalletObj.name,
      });
    }
    if (selectedFlow !== 'ALL') {
      filtersApplied.push({
        label: language === 'bn' ? 'ক্যাশ প্রবাহ' : 'Cash Flow',
        value: selectedFlow === 'IN' ? 'Money In (Credit)' : 'Money Out (Debit)',
      });
    }
    if (selectedType !== 'ALL') {
      filtersApplied.push({
        label: language === 'bn' ? 'লেনদেনের ধরন' : 'Type',
        value: selectedType,
      });
    }

    const reportTitle =
      language === 'bn'
        ? 'দৈনিক নগদ ও ব্যাংক খাতা (ডে-বুক স্টেটমেন্ট)'
        : 'DAILY CASH & BANK DAY BOOK STATEMENT';

    const rows = filteredEntries.map(entry => {
      const creatorInfo = getCreatorInfo(entry);
      return {
        voucherNo: entry.voucherNo,
        date: entry.createdAt || entry.date,
        type: entry.type,
        partyName: entry.partyName || '-',
        walletName: entry.walletName,
        cashier: creatorInfo.name,
        remarks: entry.remarks || '-',
        debitOut: entry.flow === 'OUT' ? entry.amount : 0,
        creditIn: entry.flow === 'IN' ? entry.amount : 0,
      };
    });

    openPrintModal({
      type: 'REPORT',
      title: reportTitle,
      autoDownloadPdf,
      data: {
        reportTitle,
        period: periodLabel,
        generatedDate: printDate,
        filters: filtersApplied,
        kpis: [
          {
            label: language === 'bn' ? 'মোট প্রাপ্তি (Cash In / Credit)' : 'Total Received (In / Credit)',
            value: totalMoneyIn,
          },
          {
            label: language === 'bn' ? 'মোট প্রদান (Cash Out / Debit)' : 'Total Paid (Out / Debit)',
            value: totalMoneyOut,
          },
          {
            label: language === 'bn' ? 'নেট ক্যাশ ব্যালেন্স' : 'Net Cash Position',
            value: netCashFlow,
          },
          {
            label: language === 'bn' ? 'মোট লেনদেন সংখ্যা' : 'Total Transactions',
            value: `${filteredEntries.length} entries`,
          },
        ],
        columns: [
          { header: language === 'bn' ? 'ভাউচার নং' : 'Voucher No', key: 'voucherNo' },
          { header: language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time', key: 'date' },
          { header: language === 'bn' ? 'ধরন' : 'Type', key: 'type', align: 'center' },
          { header: language === 'bn' ? 'পার্টি / উৎস' : 'Party / Source', key: 'partyName' },
          { header: language === 'bn' ? 'অ্যাকাউন্ট' : 'Wallet', key: 'walletName' },
          { header: language === 'bn' ? 'ক্যাশিয়ার / ইউজার' : 'Cashier / User', key: 'cashier' },
          { header: language === 'bn' ? 'বিবরণ' : 'Remarks', key: 'remarks' },
          { header: language === 'bn' ? 'ডেবিট (Out ৳)' : 'Debit (Out ৳)', key: 'debitOut', align: 'right', format: 'currency' },
          { header: language === 'bn' ? 'ক্রেডিট (In ৳)' : 'Credit (In ৳)', key: 'creditIn', align: 'right', format: 'currency' },
        ],
        rows,
        totals: {
          partyName: 'TOTALS',
          debitOut: totalMoneyOut,
          creditIn: totalMoneyIn,
        },
        notes:
          language === 'bn'
            ? 'এই স্টেটমেন্টটি DokanPro POS অ্যাকাউন্টিং সিস্টেমের অটোমেটেড অডিট ট্রেইল থেকে তৈরি।'
            : 'Generated from DokanPro automated day book double-entry audit trail.',
      },
    });
  };

  // Print individual transaction voucher
  const handlePrintEntry = (entry: DayBookEntry) => {
    if (entry.type === 'SALE') {
      const inv = saleInvoices.find(
        s => s.id === entry.referenceId || s.invoiceNumber === entry.referenceNo || s.invoiceNumber === entry.voucherNo
      );
      if (inv) {
        openPrintModal({
          type: 'INVOICE_A4',
          title: `Sale Invoice #${inv.invoiceNumber}`,
          data: inv,
        });
        return;
      }
    }

    if (entry.type === 'EXPENSE') {
      const exp = expenseVouchers.find(
        e => e.id === entry.referenceId || e.voucherNo === entry.referenceNo || e.voucherNo === entry.voucherNo
      );
      if (exp) {
        openPrintModal({
          type: 'EXPENSE_VOUCHER',
          title: `Expense Voucher #${exp.voucherNo}`,
          data: exp,
        });
        return;
      } else {
        openPrintModal({
          type: 'EXPENSE_VOUCHER',
          title: `Expense Voucher #${entry.voucherNo}`,
          data: {
            voucherNo: entry.voucherNo,
            date: entry.date,
            categoryName: entry.partyName || 'Business Expense',
            payee: entry.partyName,
            walletName: entry.walletName,
            amount: entry.amount,
            note: entry.remarks,
          },
        });
        return;
      }
    }

    if (entry.type === 'PAYMENT_IN') {
      const partyObj = parties.find(p => p.id === entry.partyId || p.name === entry.partyName);
      openPrintModal({
        type: 'MONEY_RECEIPT',
        title: `Money Receipt #${entry.voucherNo}`,
        data: {
          voucherNo: entry.voucherNo,
          date: entry.date,
          partyName: entry.partyName || 'Customer',
          partyPhone: partyObj?.phone || '',
          walletName: entry.walletName,
          remarks: entry.remarks,
          amount: entry.amount,
          remainingDue: partyObj?.currentBalance,
        },
      });
      return;
    }

    if (entry.type === 'PAYMENT_OUT') {
      const partyObj = parties.find(p => p.id === entry.partyId || p.name === entry.partyName);
      openPrintModal({
        type: 'PAYMENT_OUT_VOUCHER',
        title: `Payment Voucher #${entry.voucherNo}`,
        data: {
          voucherNo: entry.voucherNo,
          date: entry.date,
          partyName: entry.partyName || 'Supplier / Payee',
          partyPhone: partyObj?.phone || '',
          walletName: entry.walletName,
          remarks: entry.remarks,
          amount: entry.amount,
          remainingDue: partyObj?.currentBalance,
        },
      });
      return;
    }

    if (entry.type === 'SALARY') {
      const payslip = payrollHistory.find(
        p => p.id === entry.referenceId || p.voucherNo === entry.referenceNo || p.voucherNo === entry.voucherNo
      );
      if (payslip) {
        openPrintModal({
          type: 'PAYSLIP',
          title: `Salary Payslip - ${payslip.employeeName}`,
          data: payslip,
        });
        return;
      }
    }

    if (entry.type === 'ADVANCE_SALARY') {
      const adv = advanceSalaries.find(
        a => a.id === entry.referenceId || a.voucherNo === entry.referenceNo || a.voucherNo === entry.voucherNo
      );
      if (adv) {
        openPrintModal({
          type: 'EXPENSE_VOUCHER',
          title: `Advance Salary Voucher #${adv.voucherNo}`,
          data: {
            voucherNo: adv.voucherNo,
            date: adv.date,
            categoryName: 'Advance Salary / HR',
            payee: adv.employeeName,
            walletName: adv.walletName,
            amount: adv.amount,
            note: adv.reason,
          },
        });
        return;
      }
    }

    if (entry.type === 'EMI_COLLECTION') {
      const scheme = installmentSchemes.find(
        s => s.id === entry.referenceId || s.schemeNumber === entry.referenceNo
      );
      if (scheme) {
        openPrintModal({
          type: 'EMI_RECEIPT',
          title: `EMI Receipt #${entry.voucherNo}`,
          data: {
            receiptNo: entry.voucherNo,
            date: entry.date,
            schemeNumber: scheme.schemeNumber,
            customerName: scheme.customerName,
            customerPhone: scheme.customerPhone,
            productName: scheme.productName,
            walletName: entry.walletName,
            paymentMethod: 'Cash',
            amount: entry.amount,
            penalty: 0,
            totalCollected: entry.amount,
            installmentNo: 1,
          },
        });
        return;
      }
    }

    if (entry.type === 'CASH_ADD' || entry.type === 'CASH_WITHDRAW') {
      const adj = cashAdjustments.find(
        c => c.id === entry.referenceId || c.voucherNo === entry.voucherNo
      );
      openPrintModal({
        type: 'CASH_ADJUSTMENT_VOUCHER',
        title: `Cash Adjustment Voucher #${entry.voucherNo}`,
        data: adj || {
          voucherNo: entry.voucherNo,
          date: entry.date,
          time: '',
          type: entry.type,
          walletName: entry.walletName,
          amount: entry.amount,
          reason: entry.remarks,
          authorizedBy: entry.createdBy || 'Admin',
        },
      });
      return;
    }

    if (entry.type === 'WALLET_TRANSFER') {
      openPrintModal({
        type: 'WALLET_TRANSFER_VOUCHER',
        title: `Transfer Slip #${entry.voucherNo}`,
        data: {
          voucherNo: entry.voucherNo,
          date: entry.date,
          time: '',
          fromWalletName: entry.flow === 'OUT' ? entry.walletName : 'Source Wallet',
          toWalletName: entry.flow === 'IN' ? entry.walletName : (entry.partyName || 'Destination Wallet'),
          amount: entry.amount,
          note: entry.remarks,
          authorizedBy: entry.createdBy || 'Admin',
        },
      });
      return;
    }

    // Default fallback: Money receipt or Expense voucher depending on flow
    if (entry.flow === 'IN') {
      openPrintModal({
        type: 'MONEY_RECEIPT',
        title: `Receipt Voucher #${entry.voucherNo}`,
        data: {
          voucherNo: entry.voucherNo,
          date: entry.date,
          partyName: entry.partyName || 'Cash Inflow',
          walletName: entry.walletName,
          remarks: entry.remarks,
          amount: entry.amount,
        },
      });
    } else {
      openPrintModal({
        type: 'EXPENSE_VOUCHER',
        title: `Payment Voucher #${entry.voucherNo}`,
        data: {
          voucherNo: entry.voucherNo,
          date: entry.date,
          categoryName: entry.type,
          payee: entry.partyName || 'Payee',
          walletName: entry.walletName,
          amount: entry.amount,
          note: entry.remarks,
        },
      });
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Voucher No', 'Date', 'Type', 'Flow', 'Party/Account', 'Wallet', 'Cashier / User', 'Amount', 'Remarks'];
    const rows = filteredEntries.map(e => {
      const creatorInfo = getCreatorInfo(e);
      return [
        e.voucherNo,
        e.date,
        e.type,
        e.flow,
        `"${e.partyName || ''}"`,
        `"${e.walletName}"`,
        `"${creatorInfo.name}"`,
        e.amount,
        `"${e.remarks.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DokanPro_DayBook_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            <span>{t('day_book')}</span>
          </h2>
          <p className="text-[13.5px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'bn'
              ? 'দৈনিক নগদ ও ব্যাংক খাতার রিয়েল-টাইম অডিট ট্রেইল'
              : 'Real-time double-entry day book ledger tracking all financial cash & bank movements'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t('export_csv')}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePrint(true)}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePrint(false)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'bn' ? 'প্রিন্ট ডে বুক' : 'Print Day Book'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4.5 h-4.5" />
              <span>{t('money_in')} (Cash Received)</span>
            </div>
            <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1.5">
              +{formatCurrency(totalMoneyIn)}
            </div>
          </div>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-700 dark:text-emerald-300 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <ArrowUpRight className="w-4.5 h-4.5" />
              <span>{t('money_out')} (Cash Disbursed)</span>
            </div>
            <div className="text-3xl font-black text-rose-700 dark:text-rose-400 font-mono mt-1.5">
              -{formatCurrency(totalMoneyOut)}
            </div>
          </div>
          <div className="p-3 bg-rose-100 dark:bg-rose-900/50 rounded-lg text-rose-700 dark:text-rose-300 shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
              <Wallet className="w-4.5 h-4.5" />
              <span>{language === 'bn' ? 'মোট নেট ক্যাশফ্লো' : 'Net Cash Flow'}</span>
            </div>
            <div
              className={`text-3xl font-black font-mono mt-1.5 ${
                netCashFlow >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {netCashFlow >= 0 ? `+${formatCurrency(netCashFlow)}` : formatCurrency(netCashFlow)}
            </div>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-700 dark:text-blue-300 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Date Period Filter Bar (দৈনিক, মাসিক, ডেট টু ডেট) */}
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

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4.5 h-4.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by voucher #, party, note..."
              className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
            />
          </div>

          {/* Wallet Filter */}
          <div>
            <select
              value={selectedWallet}
              onChange={e => setSelectedWallet(e.target.value)}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium"
            >
              <option value="ALL">All Wallets / Accounts</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Flow Filter */}
          <div>
            <select
              value={selectedFlow}
              onChange={e => setSelectedFlow(e.target.value)}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium"
            >
              <option value="ALL">All Flows (In & Out)</option>
              <option value="IN">Money In (Receipts)</option>
              <option value="OUT">Money Out (Payments)</option>
            </select>
          </div>

          {/* Transaction Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="SALE">SALE</option>
              <option value="PURCHASE">PURCHASE</option>
              <option value="PAYMENT_IN">PAYMENT_IN</option>
              <option value="PAYMENT_OUT">PAYMENT_OUT</option>
              <option value="EXPENSE">EXPENSE</option>
              <option value="SALARY">SALARY</option>
              <option value="ADVANCE_SALARY">ADVANCE_SALARY</option>
              <option value="EMI_COLLECTION">EMI_COLLECTION</option>
              <option value="CASH_ADD">CASH_ADD</option>
              <option value="CASH_WITHDRAW">CASH_WITHDRAW</option>
              <option value="WALLET_TRANSFER">WALLET_TRANSFER</option>
            </select>
          </div>

          {/* Cashier / User Filter */}
          <div>
            <select
              value={selectedCashier}
              onChange={e => setSelectedCashier(e.target.value)}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium"
            >
              <option value="ALL">{language === 'bn' ? 'সকল ক্যাশিয়ার / ইউজার' : 'All Cashiers / Users'}</option>
              {creatorOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} ({opt.role || 'User'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-zinc-500 font-mono text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/60 mt-1">
          <span>Showing {filteredEntries.length} of {dayBookEntries.length} entries</span>
          {startDate && endDate && (
            <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
              Filtered: {periodLabel || `${startDate} - ${endDate}`}
            </span>
          )}
        </div>
      </div>

      {/* Day Book Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-4 px-4 font-extrabold uppercase tracking-wider">Voucher No</th>
                <th className="py-4 px-4 font-extrabold uppercase tracking-wider">Date & Time</th>
                <th className="py-4 px-4 text-center font-extrabold uppercase tracking-wider">Type</th>
                <th className="py-4 px-4 font-extrabold uppercase tracking-wider">Party / Source</th>
                <th className="py-4 px-4 font-extrabold uppercase tracking-wider">Wallet / Account</th>
                <th className="py-4 px-4 font-extrabold uppercase tracking-wider">User / Approver</th>
                <th className="py-4 px-4 font-extrabold uppercase tracking-wider">Remarks</th>
                <th className="py-4 px-4 text-right font-extrabold uppercase tracking-wider">Debit (Out)</th>
                <th className="py-4 px-4 text-right font-extrabold uppercase tracking-wider">Credit (In)</th>
                <th className="py-4 px-4 text-center font-extrabold uppercase tracking-wider">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-zinc-400 font-medium">
                    No day book transactions found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const creatorInfo = getCreatorInfo(entry);
                  const approverUser = entry.approvedBy ? users.find(u => u.id === entry.approvedBy) : null;
                  const approverName = approverUser?.fullName || entry.approvedBy || '';
                  
                  return (
                    <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-4 px-4 font-mono font-black text-zinc-950 dark:text-white">
                        {entry.voucherNo}
                      </td>
                      <td className="py-4 px-4 text-zinc-500 whitespace-nowrap font-medium">
                        {entry.createdAt || entry.date}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge status={entry.type} />
                      </td>
                      <td className="py-4 px-4 font-bold text-zinc-900 dark:text-white">
                        {entry.partyName || '-'}
                      </td>
                      <td className="py-4 px-4 text-zinc-600 dark:text-zinc-300 font-semibold">
                        {entry.walletName}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black text-[11px] flex items-center justify-center shrink-0 shadow-3xs">
                              {creatorInfo.initials}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-white truncate max-w-[130px] text-xs" title={creatorInfo.name}>
                                {creatorInfo.name}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono font-semibold">
                                {language === 'bn' ? 'এন্ট্রি' : 'Entry'}
                              </div>
                            </div>
                          </div>
                          {approverName && (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-[11px] flex items-center justify-center shrink-0 shadow-3xs">
                                {approverName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-zinc-900 dark:text-white truncate max-w-[130px] text-xs" title={approverName}>
                                  {approverName}
                                </div>
                                <div className="text-[10px] text-zinc-400 font-mono font-semibold">
                                  {language === 'bn' ? 'অ্যাপ্রুভড' : 'Approved'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-zinc-500 max-w-xs truncate font-medium" title={entry.remarks}>
                        {entry.remarks}
                      </td>
                    {/* Debit / Out Column */}
                    <td className="py-4 px-4 text-right font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                      {entry.flow === 'OUT' ? (
                        entry.amount > 0 ? (
                          formatCurrency(entry.amount)
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 font-normal text-xs">
                            {language === 'bn' ? '৳০ (বাকি)' : '৳0 (Credit)'}
                          </span>
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                    {/* Credit / In Column */}
                    <td className="py-4 px-4 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {entry.flow === 'IN' ? (
                        entry.amount > 0 ? (
                          formatCurrency(entry.amount)
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 font-normal text-xs">
                            {language === 'bn' ? '৳০ (বাকি)' : '৳0 (Due)'}
                          </span>
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                    {/* Action button */}
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handlePrintEntry(entry)}
                        title={language === 'bn' ? 'ভাউচার প্রিন্ট করুন' : 'Print Voucher / Receipt'}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-zinc-50 dark:bg-zinc-850 font-bold border-t border-zinc-300 dark:border-zinc-700 text-sm">
              <tr>
                <td colSpan={7} className="py-4 px-4 text-right text-zinc-700 dark:text-zinc-300 uppercase font-black">
                  Total Summary:
                </td>
                <td className="py-4 px-4 text-right font-mono text-rose-600 dark:text-rose-400 text-base font-black">
                  {formatCurrency(totalMoneyOut)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-base font-black">
                  {formatCurrency(totalMoneyIn)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
