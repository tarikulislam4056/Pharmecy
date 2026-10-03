import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Wallet, CashAdjustment } from '../../types';
import { canUserDelete, canUserEdit } from '../../utils/permissions';
import {
  Wallet as WalletIcon,
  Plus,
  ArrowRightLeft,
  Building,
  Smartphone,
  Banknote,
  Sliders,
  TrendingUp,
  X,
  Save,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  HelpCircle,
  CreditCard,
  History,
  Calendar,
  User,
  Printer,
  Download,
  FileText,
  Filter,
} from 'lucide-react';

const COMMON_BANKS = [
  'Islami Bank Bangladesh',
  'BRAC Bank',
  'Dutch-Bangla Bank (DBBL)',
  'City Bank',
  'Sonali Bank',
  'Eastern Bank (EBL)',
  'Pubali Bank',
  'Mutual Trust Bank (MTB)',
  'Prime Bank',
  'Southeast Bank',
  'Standard Chartered Bank',
];

const COMMON_MFS = [
  'bKash (বিকাশ)',
  'Nagad (নগদ)',
  'Rocket (রকেট)',
  'Upay (উপায়)',
  'CellFin (সেলফিন)',
  'SureCash',
];

export const WalletsView: React.FC = () => {
  const {
    language,
    activeTab,
    wallets,
    cashAdjustments,
    dayBookEntries,
    users,
    currentUser,
    addWallet,
    updateWallet,
    deleteWallet,
    deleteCashAdjustment,
    transferBetweenWallets,
    adjustCash,
    formatCurrency,
    showToast,
    openPrintModal,
  } = useApp();
  const { t } = useTranslation(language);

  const hasDeletePermission = canUserDelete(currentUser, 'accounts');
  const hasEditPermission = canUserEdit(currentUser, 'accounts');

  // Active Main Sub-Tab: 'ACCOUNTS' or 'ADJUSTMENTS'
  const [activeMainTab, setActiveMainTab] = useState<'ACCOUNTS' | 'ADJUSTMENTS'>(
    activeTab === 'cash-adjustment' ? 'ADJUSTMENTS' : 'ACCOUNTS'
  );

  // Wallet Transaction History Modal State
  const [historyWallet, setHistoryWallet] = useState<Wallet | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Search & Filter for Accounts
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BANK' | 'MFS' | 'CASH'>('ALL');

  // Search & Filter for Cash Adjustments
  const [adjSearch, setAdjSearch] = useState('');
  const [adjFilterType, setAdjFilterType] = useState<'ALL' | 'CASH_ADD' | 'CASH_WITHDRAW'>('ALL');
  const [cashierFilter, setCashierFilter] = useState<string>('ALL');

  // Helper to resolve creator / cashier info
  const getCreatorInfo = (creatorIdOrName?: string) => {
    const user = users.find(
      u =>
        u.id === creatorIdOrName ||
        u.username.toLowerCase() === (creatorIdOrName || '').toLowerCase() ||
        u.fullName.toLowerCase() === (creatorIdOrName || '').toLowerCase()
    );
    const name = user?.fullName || creatorIdOrName || currentUser?.fullName || 'Admin';
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

  // New Wallet Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [type, setType] = useState<'CASH' | 'BANK' | 'MFS'>('BANK');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');

  // Edit Wallet Modal
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameBn, setEditNameBn] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete Wallet Confirmation Modal (No window.confirm!)
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);

  // Delete Cash Adjustment Confirmation Modal
  const [adjToDelete, setAdjToDelete] = useState<CashAdjustment | null>(null);

  // Quick Cash Adjust Modal (Deposit/Withdraw)
  const [isCashAdjustOpen, setIsCashAdjustOpen] = useState(false);
  const [adjustTargetWalletId, setAdjustTargetWalletId] = useState(wallets[0]?.id || '');
  const [adjustType, setAdjustType] = useState<'ADD' | 'WITHDRAW'>('ADD');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Inter-Wallet Transfer Modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [fromWalletId, setFromWalletId] = useState(wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');

  const totalLiquidAssets = wallets.reduce((sum, w) => sum + w.balance, 0);

  // -------------------------------------------------------------
  // PRINT HANDLERS FOR WALLETS & ACCOUNTS
  // -------------------------------------------------------------
  const handlePrintWalletsSummary = (targetCategory: 'ALL' | 'BANK' | 'MFS' | 'CASH' = filterType, autoDownloadPdf = false) => {
    const filtered = wallets.filter(w => {
      if (targetCategory === 'ALL') return true;
      return w.type === targetCategory;
    });

    const totalBank = wallets.filter(w => w.type === 'BANK').reduce((s, w) => s + w.balance, 0);
    const totalMfs = wallets.filter(w => w.type === 'MFS').reduce((s, w) => s + w.balance, 0);
    const totalCash = wallets.filter(w => w.type === 'CASH').reduce((s, w) => s + w.balance, 0);
    const grandTotal = wallets.reduce((s, w) => s + w.balance, 0);

    const reportTitle = language === 'bn' 
      ? 'ওয়ালেট ও ব্যাংক অ্যাকাউন্টস ব্যালেন্স স্টেটমেন্ট' 
      : 'WALLETS & LIQUID ACCOUNTS BALANCE SHEET';

    const printDate = `${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    openPrintModal({
      type: 'REPORT',
      title: reportTitle,
      autoDownloadPdf,
      data: {
        reportTitle: reportTitle,
        period: `Balance as of ${printDate}`,
        filters: [
          { label: language === 'bn' ? 'অ্যাকাউন্ট ফিল্টার' : 'Category Filter', value: targetCategory === 'ALL' ? 'All Accounts' : targetCategory },
          { label: language === 'bn' ? 'মোট সক্রিয় অ্যাকাউন্ট' : 'Active Accounts', value: wallets.filter(w => w.isActive).length },
        ],
        kpis: [
          { label: language === 'bn' ? 'মোট তরল সম্পদ' : 'Total Liquid Assets', value: grandTotal },
          { label: language === 'bn' ? 'ব্যাংক ব্যালেন্স' : 'Bank Balances', value: totalBank },
          { label: language === 'bn' ? 'বিকাশ/নগদ/MFS' : 'MFS Wallets', value: totalMfs },
          { label: language === 'bn' ? 'ক্যাশ ড্রয়ার' : 'Cash Drawers', value: totalCash },
        ],
        columns: [
          { header: language === 'bn' ? 'অ্যাকাউন্টের নাম' : 'Account Name', key: 'accountName' },
          { header: language === 'bn' ? 'ধরন' : 'Type', key: 'type', align: 'center' },
          { header: language === 'bn' ? 'ব্যাংক / মাধ্যম' : 'Bank / Provider', key: 'bank' },
          { header: language === 'bn' ? 'শাখা' : 'Branch', key: 'branch' },
          { header: language === 'bn' ? 'হিসাব / মোবাইল নং' : 'Account / Mobile No', key: 'accNo', align: 'center' },
          { header: language === 'bn' ? 'অবস্থা' : 'Status', key: 'status', align: 'center' },
          { header: language === 'bn' ? 'বর্তমান ব্যালেন্স (৳)' : 'Current Balance (৳)', key: 'balance', align: 'right', format: 'currency' },
        ],
        rows: filtered.map(w => ({
          accountName: w.name,
          type: w.type,
          bank: w.bankName || (w.type === 'CASH' ? 'Cash Counter' : '-'),
          branch: w.branch || '-',
          accNo: w.accountNumber || '-',
          status: w.isActive ? 'ACTIVE' : 'INACTIVE',
          balance: w.balance,
        })),
        totals: {
          accountName: 'TOTAL LIQUID BALANCE:',
          balance: filtered.reduce((s, w) => s + w.balance, 0),
        },
        notes: language === 'bn' 
          ? 'সকল ব্যাংক, ক্যাশ ড্রয়ার ও এমএফএস ওয়ালেটের রিয়েল-টাইম হিসাব বিবরণী। অফিসিয়াল নিরীক্ষা ও রেকর্ড সংরক্ষণের জন্য প্রস্তুতকৃত।' 
          : 'Official Liquid Funds & Account Balances Summary. Generated from live POS financial records.',
      },
    });
  };

  const handlePrintSingleWalletStatement = (
    wallet: Wallet,
    startDate?: string,
    endDate?: string,
    search?: string
  ) => {
    let txs = dayBookEntries.filter(e => e.walletId === wallet.id);

    if (startDate) {
      txs = txs.filter(e => (e.date || '').slice(0, 10) >= startDate);
    }
    if (endDate) {
      txs = txs.filter(e => (e.date || '').slice(0, 10) <= endDate);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      txs = txs.filter(
        e =>
          (e.voucherNo && e.voucherNo.toLowerCase().includes(q)) ||
          (e.partyName && e.partyName.toLowerCase().includes(q)) ||
          (e.remarks && e.remarks.toLowerCase().includes(q)) ||
          (e.type && e.type.toLowerCase().includes(q))
      );
    }

    // Sort chronological for ledger running balance
    const sortedChronological = [...txs].sort(
      (a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
    );

    let running = 0;
    const ledgerRows = sortedChronological.map(tx => {
      const inAmt = tx.flow === 'IN' ? (tx.amount || 0) : 0;
      const outAmt = tx.flow === 'OUT' ? (tx.amount || 0) : 0;
      running += (inAmt - outAmt);

      return {
        date: tx.createdAt || tx.date,
        voucherNo: tx.voucherNo || '-',
        type: tx.type || (tx.flow === 'IN' ? 'DEPOSIT' : 'PAYMENT'),
        particulars: tx.partyName ? `${tx.partyName}${tx.remarks ? ` (${tx.remarks})` : ''}` : tx.remarks || 'Transaction Entry',
        moneyIn: inAmt > 0 ? inAmt : 0,
        moneyOut: outAmt > 0 ? outAmt : 0,
      };
    });

    const totalIn = txs.filter(e => e.flow === 'IN').reduce((s, e) => s + (e.amount || 0), 0);
    const totalOut = txs.filter(e => e.flow === 'OUT').reduce((s, e) => s + (e.amount || 0), 0);

    const dateRangeText = startDate && endDate
      ? `${startDate} to ${endDate}`
      : startDate
      ? `From ${startDate}`
      : endDate
      ? `Until ${endDate}`
      : (language === 'bn' ? 'সম্পূর্ণ লেনদেন হিস্ট্রি' : 'All Time History');

    const reportTitle = language === 'bn'
      ? `অ্যাকাউন্ট স্টেটমেন্ট ও লেজার - ${wallet.name}`
      : `ACCOUNT STATEMENT & LEDGER - ${wallet.name.toUpperCase()}`;

    openPrintModal({
      type: 'STATEMENT',
      title: reportTitle,
      data: {
        reportTitle: reportTitle,
        period: dateRangeText,
        filters: [
          { label: language === 'bn' ? 'অ্যাকাউন্টের নাম' : 'Account Name', value: wallet.name },
          { label: language === 'bn' ? 'হিসাবের ধরন' : 'Account Type', value: wallet.type },
          { label: language === 'bn' ? 'ব্যাংক / মাধ্যম' : 'Bank / MFS', value: wallet.bankName || (wallet.type === 'CASH' ? 'Cash Counter' : '-') },
          { label: language === 'bn' ? 'অ্যাকাউন্ট নম্বর' : 'Account Number', value: wallet.accountNumber || '-' },
        ],
        kpis: [
          { label: language === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Current Balance', value: wallet.balance },
          { label: language === 'bn' ? 'মোট জমা (Money In)' : 'Total Deposits (+)', value: totalIn },
          { label: language === 'bn' ? 'মোট খরচ/উত্তোলন (Money Out)' : 'Total Debits (-)', value: totalOut },
          { label: language === 'bn' ? 'নেট মুভমেন্ট' : 'Net Movement', value: totalIn - totalOut },
        ],
        columns: [
          { header: language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time', key: 'date' },
          { header: language === 'bn' ? 'ভাউচার / রেফারেন্স' : 'Voucher / Ref #', key: 'voucherNo', align: 'center' },
          { header: language === 'bn' ? 'লেনদেনের ধরন' : 'Transaction Type', key: 'type', align: 'center' },
          { header: language === 'bn' ? 'বিবরণ ও পার্টি' : 'Particulars / Remarks', key: 'particulars' },
          { header: language === 'bn' ? 'জমা / ক্রেডিট (+)' : 'Money In / Cr (৳)', key: 'moneyIn', align: 'right', format: 'currency' },
          { header: language === 'bn' ? 'খরচ / ডেবিট (-)' : 'Money Out / Dr (৳)', key: 'moneyOut', align: 'right', format: 'currency' },
        ],
        rows: ledgerRows,
        totals: {
          particulars: 'TOTAL IN & OUTFLOW:',
          moneyIn: totalIn,
          moneyOut: totalOut,
        },
        notes: language === 'bn'
          ? `"${wallet.name}" অ্যাকাউন্টের সম্পূর্ণ লেজার বিবরণী। কোনো অসঙ্গতি পরিলক্ষিত হলে অবিলম্বে হিসাব বিভাগে যোগাযোগ করুন।`
          : `Official Account Statement for "${wallet.name}". Valid for internal audit and reconciliation.`,
      },
    });
  };

  const handlePrintCashAdjustmentVoucher = (adj: CashAdjustment) => {
    const targetW = wallets.find(w => w.id === adj.walletId);
    openPrintModal({
      type: 'CASH_ADJUSTMENT_VOUCHER',
      title: `Cash Adjustment Voucher - ${adj.voucherNo}`,
      data: {
        voucherNo: adj.voucherNo,
        date: adj.date,
        time: adj.createdAt || '',
        type: adj.type,
        amount: adj.amount,
        walletName: adj.walletName || targetW?.name || 'Account',
        accountNumber: targetW?.accountNumber,
        reason: adj.reason,
        authorizedBy: adj.authorizedBy || 'Admin',
      },
    });
  };

  const handlePrintAdjustmentsReport = () => {
    const totalAdd = filteredAdjustments.filter(a => a.type === 'CASH_ADD').reduce((s, a) => s + a.amount, 0);
    const totalWithdraw = filteredAdjustments.filter(a => a.type === 'CASH_WITHDRAW').reduce((s, a) => s + a.amount, 0);

    const reportTitle = language === 'bn'
      ? 'ক্যাশ অ্যাডজাস্টমেন্ট ও মূলধন সমন্বয় রিপোর্ট'
      : 'CASH ADJUSTMENT & CAPITAL MOVEMENT REPORT';

    openPrintModal({
      type: 'REPORT',
      title: reportTitle,
      data: {
        reportTitle: reportTitle,
        period: language === 'bn' ? 'সকল সমন্বয় রেকর্ড' : 'All Recorded Adjustments',
        filters: [
          { label: language === 'bn' ? 'ফিল্টার ধরন' : 'Filter Type', value: adjFilterType === 'ALL' ? 'All Adjustments' : adjFilterType === 'CASH_ADD' ? 'Capital Deposits' : 'Drawings' },
          { label: language === 'bn' ? 'অনুসন্ধান' : 'Search', value: adjSearch || 'None' },
        ],
        kpis: [
          { label: language === 'bn' ? 'মোট ভাউচার সংখ্যা' : 'Total Vouchers', value: filteredAdjustments.length },
          { label: language === 'bn' ? 'মোট মূলধন জমা (Add)' : 'Total Capital Added', value: totalAdd },
          { label: language === 'bn' ? 'মোট ব্যক্তিগত উত্তোলন' : 'Total Drawings', value: totalWithdraw },
          { label: language === 'bn' ? 'নেট ক্যাশ পরিবর্তন' : 'Net Cash Movement', value: totalAdd - totalWithdraw },
        ],
        columns: [
          { header: language === 'bn' ? 'ভাউচার #' : 'Voucher #', key: 'voucherNo' },
          { header: language === 'bn' ? 'তারিখ' : 'Date', key: 'date' },
          { header: language === 'bn' ? 'ধরন' : 'Adjustment Type', key: 'type', align: 'center' },
          { header: language === 'bn' ? 'অ্যাকাউন্ট / ওয়ালেট' : 'Wallet / Account', key: 'wallet' },
          { header: language === 'bn' ? 'কারণ / বিবরণ' : 'Description / Reason', key: 'reason' },
          { header: language === 'bn' ? 'অনুমোদনকারী' : 'Authorized By', key: 'authorizedBy' },
          { header: language === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)', key: 'amount', align: 'right', format: 'currency' },
        ],
        rows: filteredAdjustments.map(a => ({
          voucherNo: a.voucherNo,
          date: a.date,
          type: a.type === 'CASH_ADD' ? 'CAPITAL ADD (+)' : 'WITHDRAW (-)',
          wallet: a.walletName,
          reason: a.reason,
          authorizedBy: a.authorizedBy || 'Admin',
          amount: a.amount,
        })),
        totals: {
          authorizedBy: 'NET ADJUSTMENT:',
          amount: totalAdd - totalWithdraw,
        },
        notes: language === 'bn'
          ? 'দোকানের ক্যাশ ড্রয়ার ও ব্যাংক অ্যাকাউন্টে মালিকের মূলধন বিনিয়োগ ও ব্যক্তিগত উত্তোলনের অফিশিয়াল বিবরণী।'
          : 'Official summary of owner capital investments and personal withdrawals across all liquid accounts.',
      },
    });
  };

  const handlePrintTransferVoucherDirect = (fromW: Wallet, toW: Wallet, amt: number, note: string) => {
    openPrintModal({
      type: 'WALLET_TRANSFER_VOUCHER',
      title: 'Inter-Account Transfer Voucher',
      data: {
        voucherNo: 'TRF-' + Date.now().toString().slice(-6),
        date: new Date().toLocaleDateString('en-GB'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: amt,
        fromWalletName: fromW.name,
        fromWalletAccount: fromW.accountNumber,
        fromWalletType: fromW.type,
        toWalletName: toW.name,
        toWalletAccount: toW.accountNumber,
        toWalletType: toW.type,
        note: note || 'Inter-account fund transfer',
        authorizedBy: 'Admin',
      },
    });
  };

  // Open Add Modal with specific type
  const handleOpenAddModal = (defaultType: 'CASH' | 'BANK' | 'MFS' = 'BANK') => {
    setType(defaultType);
    setName('');
    setNameBn('');
    setAccountNumber('');
    setBankName(defaultType === 'BANK' ? 'BRAC Bank' : defaultType === 'MFS' ? 'bKash' : '');
    setBranch('');
    setOpeningBalance('0');
    setIsAddOpen(true);
  };

  const handleCreateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(
        language === 'bn' ? 'অ্যাকাউন্টের নাম প্রদান করুন!' : 'Please enter an account name!',
        'warning'
      );
      return;
    }

    const initBal = parseFloat(openingBalance) || 0;
    if (initBal < 0) {
      showToast(
        language === 'bn' ? 'প্রারম্ভিক ব্যালেন্স ঋণাত্মক হতে পারে না।' : 'Opening balance cannot be negative.',
        'warning'
      );
      return;
    }

    addWallet({
      name: name.trim(),
      nameBn: nameBn.trim() || name.trim(),
      type,
      accountNumber: accountNumber.trim() || undefined,
      bankName: bankName.trim() || (type === 'BANK' ? 'Bank Account' : type === 'MFS' ? 'MFS Account' : undefined),
      branch: branch.trim() || undefined,
      balance: initBal,
      isActive: true,
    });

    setIsAddOpen(false);
    setName('');
    setNameBn('');
    setAccountNumber('');
    setBankName('');
    setBranch('');
    setOpeningBalance('0');
  };

  const handleOpenEdit = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setEditName(wallet.name);
    setEditNameBn(wallet.nameBn || wallet.name);
    setEditAccountNumber(wallet.accountNumber || '');
    setEditBankName(wallet.bankName || '');
    setEditBranch(wallet.branch || '');
    setEditIsActive(wallet.isActive ?? true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet) return;
    if (!editName.trim()) {
      showToast(language === 'bn' ? 'অ্যাকাউন্টের নাম দিন!' : 'Account name is required!', 'warning');
      return;
    }

    updateWallet(editingWallet.id, {
      name: editName.trim(),
      nameBn: editNameBn.trim() || editName.trim(),
      accountNumber: editAccountNumber.trim() || undefined,
      bankName: editBankName.trim() || undefined,
      branch: editBranch.trim() || undefined,
      isActive: editIsActive,
    });

    setEditingWallet(null);
  };

  const handleConfirmDeleteWallet = () => {
    if (!walletToDelete) return;
    if (!hasDeletePermission) {
      showToast(language === 'bn' ? 'আপনার একাউন্ট ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete accounts', 'error');
      setWalletToDelete(null);
      return;
    }
    deleteWallet(walletToDelete.id);
    setWalletToDelete(null);
  };

  const handleConfirmDeleteAdj = () => {
    if (!adjToDelete) return;
    if (!hasDeletePermission) {
      showToast(language === 'bn' ? 'আপনার ক্যাশ অ্যাডজাস্টমেন্ট ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete cash adjustments', 'error');
      setAdjToDelete(null);
      return;
    }
    deleteCashAdjustment(adjToDelete.id);
    setAdjToDelete(null);
  };

  const handleOpenAdjustModalForWallet = (wallet: Wallet, mode: 'ADD' | 'WITHDRAW') => {
    setAdjustTargetWalletId(wallet.id);
    setAdjustType(mode);
    setAdjustAmount('');
    setAdjustReason(
      mode === 'ADD'
        ? (language === 'bn' ? 'মালিকের মূলধন জমা' : 'Owner Capital Deposit')
        : (language === 'bn' ? 'মালিকের ব্যক্তিগত উত্তোলন' : 'Owner Personal Drawing')
    );
    setIsCashAdjustOpen(true);
  };

  const handleSaveAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    const targetW = wallets.find(w => w.id === adjustTargetWalletId) || wallets[0];
    if (!targetW) return;

    const numAmt = parseFloat(adjustAmount);
    if (!numAmt || numAmt <= 0) {
      showToast(language === 'bn' ? 'সঠিক টাকার পরিমাণ দিন!' : 'Please enter valid amount!', 'warning');
      return;
    }

    if (adjustType === 'WITHDRAW' && targetW.balance < numAmt) {
      showToast(
        language === 'bn'
          ? `অপর্যাপ্ত ব্যালেন্স! "${targetW.name}"-এ বর্তমান ব্যালেন্স: ৳${targetW.balance.toLocaleString()}`
          : `Insufficient funds! Available in "${targetW.name}": ৳${targetW.balance.toLocaleString()}`,
        'error'
      );
      return;
    }

    adjustCash({
      walletId: targetW.id,
      type: adjustType,
      amount: numAmt,
      reason: adjustReason.trim() || (adjustType === 'ADD' ? 'Funds Deposit' : 'Funds Drawing'),
    });

    setIsCashAdjustOpen(false);
    setAdjustAmount('');
    setAdjustReason('');
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(transferAmount);
    if (!numAmount || numAmount <= 0) {
      showToast(language === 'bn' ? 'সঠিক স্থানান্তর পরিমাণ দিন!' : 'Please enter valid transfer amount!', 'warning');
      return;
    }
    if (fromWalletId === toWalletId) {
      showToast(language === 'bn' ? 'উৎস ও গন্তব্য একই অ্যাকাউন্ট হতে পারবে না!' : 'Source and destination accounts must be different!', 'warning');
      return;
    }

    const sourceWallet = wallets.find(w => w.id === fromWalletId);
    if (sourceWallet && sourceWallet.balance < numAmount) {
      showToast(
        language === 'bn'
          ? `উৎস অ্যাকাউন্ট "${sourceWallet.name}"-এ পর্যাপ্ত ব্যালেন্স নেই! আছে: ৳${sourceWallet.balance.toLocaleString()}`
          : `Insufficient funds in source account "${sourceWallet.name}"! Available: ৳${sourceWallet.balance.toLocaleString()}`,
        'error'
      );
      return;
    }

    transferBetweenWallets(fromWalletId, toWalletId, numAmount, transferNote);
    setIsTransferOpen(false);
    setTransferAmount('');
    setTransferNote('');
  };

  // Filtered accounts
  const filteredWallets = wallets.filter(w => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.bankName && w.bankName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.accountNumber && w.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.branch && w.branch.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filterType === 'ALL' || w.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const bankWallets = filteredWallets.filter(w => w.type === 'BANK');
  const cashWallets = filteredWallets.filter(w => w.type === 'CASH');
  const mfsWallets = filteredWallets.filter(w => w.type === 'MFS');

  // Filtered adjustments
  const filteredAdjustments = cashAdjustments.filter(adj => {
    const creator = getCreatorInfo(adj.authorizedBy);
    const matchesSearch =
      adj.voucherNo.toLowerCase().includes(adjSearch.toLowerCase()) ||
      adj.walletName.toLowerCase().includes(adjSearch.toLowerCase()) ||
      adj.reason.toLowerCase().includes(adjSearch.toLowerCase()) ||
      creator.name.toLowerCase().includes(adjSearch.toLowerCase()) ||
      (adj.authorizedBy && adj.authorizedBy.toLowerCase().includes(adjSearch.toLowerCase()));

    const matchesType = adjFilterType === 'ALL' || adj.type === adjFilterType;
    const matchesCashier =
      cashierFilter === 'ALL' ||
      adj.authorizedBy === cashierFilter ||
      creator.user?.id === cashierFilter ||
      creator.name.toLowerCase() === cashierFilter.toLowerCase();
    return matchesSearch && matchesType && matchesCashier;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-indigo-600" />
            <span>{t('wallets')} & Liquid Accounts</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'bn'
              ? 'ক্যাশ ড্রয়ার, ব্যাংক অ্যাকাউন্ট, বিকাশ/নগদ ওয়ালেট ও ক্যাশ অ্যাডজাস্টমেন্ট হিস্ট্রি'
              : 'Cash drawers, bank accounts, mobile financial services (bKash/Nagad), and cash adjustments'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handlePrintWalletsSummary('ALL', true)}
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-colors"
            title="Download PDF Summary"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}</span>
          </button>
          <button
            type="button"
            onClick={() => handlePrintWalletsSummary('ALL')}
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-colors"
            title="Print Full Liquid Accounts & Balance Sheet"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{language === 'bn' ? 'ব্যালেন্স শিট প্রিন্ট' : 'Print Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdjustTargetWalletId(wallets[0]?.id || '');
              setAdjustType('ADD');
              setAdjustAmount('');
              setAdjustReason(language === 'bn' ? 'মালিকের মূলধন জমা' : 'Owner Capital Deposit');
              setIsCashAdjustOpen(true);
            }}
            className="px-3 py-2 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-amber-200 dark:border-amber-800"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'ক্যাশ অ্যাডজাস্টমেন্ট' : 'Cash Adjustment'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTransferOpen(true)}
            className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Inter-Transfer</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal('BANK')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? '+ নতুন অ্যাকাউন্ট' : '+ Add Account'}</span>
          </button>
        </div>
      </div>

      {/* Main Highlights Card */}
      <div className="p-5 bg-gradient-to-r from-indigo-950 via-zinc-900 to-slate-900 text-white rounded-2xl border border-indigo-900/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            {language === 'bn' ? 'দোকানের মূল ক্যাশ ও মোট তরল তহবিল' : 'Total Shop Main Cash & Liquid Assets'}
          </div>
          <div className="text-3xl font-black font-mono mt-1 text-white tracking-tight">
            {formatCurrency(totalLiquidAssets)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 bg-white/10 dark:bg-black/20 p-2.5 rounded-xl backdrop-blur-xs border border-white/10 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-950/60 text-sky-200 rounded-lg border border-sky-800/60 font-medium">
            <Building className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Bank: <strong className="font-bold text-white">{wallets.filter(w => w.type === 'BANK').length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-pink-950/60 text-pink-200 rounded-lg border border-pink-800/60 font-medium">
            <Smartphone className="w-3.5 h-3.5 text-pink-400" />
            <span>
              MFS: <strong className="font-bold text-white">{wallets.filter(w => w.type === 'MFS').length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/60 text-emerald-200 rounded-lg border border-emerald-800/60 font-medium">
            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Cash: <strong className="font-bold text-white">{wallets.filter(w => w.type === 'CASH').length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveMainTab('ACCOUNTS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'ACCOUNTS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <WalletIcon className="w-4 h-4" />
          <span>{language === 'bn' ? 'ওয়ালেট ও অ্যাকাউন্টসমূহ' : 'Wallets & Accounts'} ({wallets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('ADJUSTMENTS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'ADJUSTMENTS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{language === 'bn' ? 'ক্যাশ অ্যাডজাস্টমেন্ট হিস্ট্রি' : 'Cash Adjustments History'} ({cashAdjustments.length})</span>
        </button>
      </div>

      {/* ======================= TAB 1: WALLETS & ACCOUNTS ======================= */}
      {activeMainTab === 'ACCOUNTS' && (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  filterType === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {language === 'bn' ? 'সকল' : 'All'} ({wallets.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('BANK')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  filterType === 'BANK'
                    ? 'bg-sky-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {language === 'bn' ? 'ব্যাংক' : 'Banks'} ({wallets.filter(w => w.type === 'BANK').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('MFS')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  filterType === 'MFS'
                    ? 'bg-pink-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {language === 'bn' ? 'বিকাশ/নগদ' : 'MFS'} ({wallets.filter(w => w.type === 'MFS').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('CASH')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  filterType === 'CASH'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {language === 'bn' ? 'ক্যাশ ড্রয়ার' : 'Cash'} ({wallets.filter(w => w.type === 'CASH').length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={language === 'bn' ? 'অ্যাকাউন্ট বা ব্যাংক খুঁজুন...' : 'Search accounts or bank...'}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Account Sections */}
          <div className="space-y-8">
            
            {/* Bank Accounts */}
            {(filterType === 'ALL' || filterType === 'BANK') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-lg">
                      <Building className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">
                      {language === 'bn' ? 'ব্যাংক অ্যাকাউন্টসমূহ' : 'Bank Accounts'} ({bankWallets.length})
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddModal('BANK')}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '+ ব্যাংক যোগ করুন' : '+ Add Bank'}</span>
                  </button>
                </div>

                {bankWallets.length === 0 ? (
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-2">
                    <Building className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p className="text-xs text-zinc-500 font-medium">
                      {language === 'bn' ? 'কোনো ব্যাংক অ্যাকাউন্ট পাওয়া যায়নি' : 'No bank accounts found'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bankWallets.map(wallet => {
                      const Icon = Building;
                      const colorTheme = 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-200';

                      return (
                        <div
                          key={wallet.id}
                          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-sky-300 dark:hover:border-sky-800 transition-colors"
                        >
                          <div>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={`p-2.5 rounded-xl border ${colorTheme}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                                    {wallet.name}
                                  </h3>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                                    BANK {wallet.isActive ? '• ACTIVE' : '• INACTIVE'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(wallet)}
                                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                  title={language === 'bn' ? 'সম্পাদনা' : 'Edit Account'}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {hasDeletePermission && (
                                  <button
                                    type="button"
                                    onClick={() => setWalletToDelete(wallet)}
                                    className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                    title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete Account'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1 text-xs">
                              {wallet.bankName && (
                                <div className="text-zinc-500">
                                  Bank: <strong className="text-zinc-700 dark:text-zinc-300">{wallet.bankName}</strong>{' '}
                                  {wallet.branch ? `(${wallet.branch})` : ''}
                                </div>
                              )}
                              {wallet.accountNumber && (
                                <div className="text-zinc-500 font-mono text-[11px]">
                                  A/C: {wallet.accountNumber}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                            <div className="flex items-end justify-between">
                              <div>
                                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                                  Available Balance
                                </div>
                                <div className="text-xl font-black font-mono text-zinc-900 dark:text-white mt-0.5">
                                  {formatCurrency(wallet.balance)}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <button
                                  type="button"
                                  onClick={() => handlePrintSingleWalletStatement(wallet)}
                                  className="p-1.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Print Statement (লেজার প্রিন্ট)"
                                >
                                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                  <span className="hidden sm:inline">Print</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHistoryWallet(wallet)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Transaction History"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">History</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjustModalForWallet(wallet, 'ADD')}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Deposit Money"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Deposit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setFromWalletId(wallet.id);
                                    setIsTransferOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Transfer</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Cash Drawers */}
            {(filterType === 'ALL' || filterType === 'CASH') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">
                      {language === 'bn' ? 'প্রধান ক্যাশ ড্রয়ার' : 'Main Cash Drawer'} ({cashWallets.length})
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddModal('CASH')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '+ ক্যাশ যোগ করুন' : '+ Add Cash Drawer'}</span>
                  </button>
                </div>

                {cashWallets.length === 0 ? (
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-2">
                    <Banknote className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p className="text-xs text-zinc-500 font-medium">
                      {language === 'bn' ? 'কোনো ক্যাশ ড্রয়ার পাওয়া যায়নি' : 'No cash drawer found'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cashWallets.map(wallet => {
                      const Icon = Banknote;
                      const colorTheme = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200';

                      return (
                        <div
                          key={wallet.id}
                          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
                        >
                          <div>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={`p-2.5 rounded-xl border ${colorTheme}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                                    {wallet.name}
                                  </h3>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    CASH DRAWER {wallet.isActive ? '• ACTIVE' : '• INACTIVE'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(wallet)}
                                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {hasDeletePermission && (
                                  <button
                                    type="button"
                                    onClick={() => setWalletToDelete(wallet)}
                                    className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                            <div className="flex items-end justify-between">
                              <div>
                                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                                  Available Balance
                                </div>
                                <div className="text-xl font-black font-mono text-zinc-900 dark:text-white mt-0.5">
                                  {formatCurrency(wallet.balance)}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <button
                                  type="button"
                                  onClick={() => handlePrintSingleWalletStatement(wallet)}
                                  className="p-1.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Print Statement (লেজার প্রিন্ট)"
                                >
                                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="hidden sm:inline">Print</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHistoryWallet(wallet)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Transaction History"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">History</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjustModalForWallet(wallet, 'ADD')}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Deposit Cash"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Deposit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setFromWalletId(wallet.id);
                                    setIsTransferOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Transfer</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MFS Wallets */}
            {(filterType === 'ALL' || filterType === 'MFS') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 rounded-lg">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">
                      {language === 'bn' ? 'এমএফএস অ্যাকাউন্টসমূহ (বিকাশ/নগদ)' : 'MFS Wallets'} ({mfsWallets.length})
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddModal('MFS')}
                    className="text-xs font-bold text-pink-600 hover:text-pink-700 dark:text-pink-400 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '+ এমএফএস যোগ করুন' : '+ Add MFS'}</span>
                  </button>
                </div>

                {mfsWallets.length === 0 ? (
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-2">
                    <Smartphone className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p className="text-xs text-zinc-500 font-medium">
                      {language === 'bn' ? 'কোনো এমএফএস অ্যাকাউন্ট পাওয়া যায়নি' : 'No MFS account found'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mfsWallets.map(wallet => {
                      const Icon = Smartphone;
                      const colorTheme = 'text-pink-600 bg-pink-50 dark:bg-pink-950/40 border-pink-200';

                      return (
                        <div
                          key={wallet.id}
                          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-pink-300 dark:hover:border-pink-800 transition-colors"
                        >
                          <div>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={`p-2.5 rounded-xl border ${colorTheme}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                                    {wallet.name}
                                  </h3>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                                    MFS {wallet.isActive ? '• ACTIVE' : '• INACTIVE'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(wallet)}
                                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {hasDeletePermission && (
                                  <button
                                    type="button"
                                    onClick={() => setWalletToDelete(wallet)}
                                    className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1 text-xs">
                              {wallet.accountNumber && (
                                <div className="text-zinc-500 font-mono text-[11px]">
                                  Number: <strong className="text-zinc-700 dark:text-zinc-300">{wallet.accountNumber}</strong>
                                </div>
                              )}
                              {wallet.bankName && (
                                <div className="text-zinc-500 text-[11px]">
                                  Provider: {wallet.bankName}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                            <div className="flex items-end justify-between">
                              <div>
                                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                                  Available Balance
                                </div>
                                <div className="text-xl font-black font-mono text-zinc-900 dark:text-white mt-0.5">
                                  {formatCurrency(wallet.balance)}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <button
                                  type="button"
                                  onClick={() => handlePrintSingleWalletStatement(wallet)}
                                  className="p-1.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Print Statement (লেজার প্রিন্ট)"
                                >
                                  <Printer className="w-3.5 h-3.5 text-pink-600" />
                                  <span className="hidden sm:inline">Print</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHistoryWallet(wallet)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Transaction History"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">History</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjustModalForWallet(wallet, 'ADD')}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Deposit"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Deposit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setFromWalletId(wallet.id);
                                    setIsTransferOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Transfer</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================= TAB 2: CASH ADJUSTMENTS HISTORY ======================= */}
      {activeMainTab === 'ADJUSTMENTS' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setAdjFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  adjFilterType === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {language === 'bn' ? 'সকল সমন্বয়' : 'All Adjustments'} ({cashAdjustments.length})
              </button>
              <button
                type="button"
                onClick={() => setAdjFilterType('CASH_ADD')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  adjFilterType === 'CASH_ADD'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {language === 'bn' ? 'মূলধন জমা (Add)' : 'Cash In / Deposit'}
              </button>
              <button
                type="button"
                onClick={() => setAdjFilterType('CASH_WITHDRAW')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  adjFilterType === 'CASH_WITHDRAW'
                    ? 'bg-rose-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {language === 'bn' ? 'মালিকের উত্তোলন (Withdraw)' : 'Cash Out / Drawings'}
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={cashierFilter}
                onChange={e => setCashierFilter(e.target.value)}
                className="py-1.5 px-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]"
              >
                <option value="ALL">{language === 'bn' ? 'সকল ক্যাশিয়ার/ইউজার' : 'All Cashiers/Users'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handlePrintAdjustmentsReport}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer border border-zinc-200 dark:border-zinc-700 transition-colors"
                title="Print Cash Adjustments Report"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{language === 'bn' ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}</span>
              </button>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={adjSearch}
                  onChange={e => setAdjSearch(e.target.value)}
                  placeholder={language === 'bn' ? 'ভাউচার নং বা কারণ খুঁজুন...' : 'Search voucher or reason...'}
                  className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setAdjustTargetWalletId(wallets[0]?.id || '');
                  setAdjustType('ADD');
                  setAdjustAmount('');
                  setAdjustReason(language === 'bn' ? 'মালিকের মূলধন জমা' : 'Owner Capital Deposit');
                  setIsCashAdjustOpen(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? '+ নতুন সমন্বয়' : '+ New Adjustment'}</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            {filteredAdjustments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Sliders className="w-10 h-10 text-zinc-400 mx-auto" />
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  {language === 'bn' ? 'কোনো ক্যাশ অ্যাডজাস্টমেন্ট রেকর্ড পাওয়া যায়নি' : 'No cash adjustments found'}
                </p>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  {language === 'bn'
                    ? 'দোকানে নতুন মূলধন বিনিয়োগ বা ব্যক্তিগত উত্তোলনের হিসাব রাখতে "+ নতুন সমন্বয়" বাটনে ক্লিক করুন।'
                    : 'Record new capital injections or drawings by clicking the "+ New Adjustment" button.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Voucher #</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Type (ধরন)</th>
                      <th className="px-4 py-3">Wallet / Account</th>
                      <th className="px-4 py-3">Description / Reason</th>
                      <th className="px-4 py-3 text-right">Amount (৳)</th>
                      <th className="px-4 py-3">Authorized By</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                    {filteredAdjustments.map(adj => {
                      const isAdd = adj.type === 'CASH_ADD';
                      return (
                        <tr key={adj.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-zinc-900 dark:text-white">
                            {adj.voucherNo}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              <span>{adj.date}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                                isAdd
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {isAdd ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              <span>{isAdd ? 'CASH ADD (মূলধন জমা)' : 'WITHDRAW (উত্তোলন)'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                            {adj.walletName}
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 max-w-xs truncate">
                            {adj.reason}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${
                            isAdd ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isAdd ? '+' : '-'}{formatCurrency(adj.amount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {(() => {
                              const creator = getCreatorInfo(adj.authorizedBy);
                              return (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                                    {creator.initials}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">{creator.name}</div>
                                    <div className="text-[9px] text-zinc-400 font-mono">{creator.role}</div>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handlePrintCashAdjustmentVoucher(adj)}
                                className="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                title="Print Voucher (ভাউচার প্রিন্ট)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {hasDeletePermission && (
                                <button
                                  type="button"
                                  onClick={() => setAdjToDelete(adj)}
                                  className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                  title={language === 'bn' ? 'মুছে ফেলুন ও ব্যালেন্স রিভার্স করুন' : 'Delete and Reverse Balance'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= MODAL: IN-APP WALLET DELETE CONFIRMATION ======================= */}
      {walletToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/60">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  {language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Account Deletion'}
                </h3>
                <p className="text-zinc-500 text-[11px]">
                  {language === 'bn' ? 'স্থায়ীভাবে অ্যাকাউন্টটি সরিয়ে ফেলা হবে' : 'This action will permanently delete the account'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-1">
              <div className="font-bold text-zinc-900 dark:text-white text-sm">
                {walletToDelete.name}
              </div>
              <div className="text-zinc-500 flex justify-between">
                <span>Account Type: <strong className="text-zinc-700 dark:text-zinc-300">{walletToDelete.type}</strong></span>
                <span>Current Balance: <strong className="text-zinc-700 dark:text-zinc-300 font-mono">৳{walletToDelete.balance.toLocaleString()}</strong></span>
              </div>
            </div>

            {walletToDelete.balance > 0 && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  {language === 'bn'
                    ? `সতর্কতা: এই অ্যাকাউন্টে এখনও ৳${walletToDelete.balance.toLocaleString()} অবশিষ্ট রয়েছে। মুছে ফেলার আগে আপনি চাইলে "Inter-Transfer" দিয়ে টাকা অন্য অ্যাকাউন্টে স্থানান্তর করে নিতে পারেন।`
                    : `Warning: This account has a remaining balance of ৳${walletToDelete.balance.toLocaleString()}. You may transfer it before deletion.`}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setWalletToDelete(null)}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteWallet}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: IN-APP CASH ADJUSTMENT DELETE CONFIRMATION ======================= */}
      {adjToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/60">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  {language === 'bn' ? 'সমন্বয় ভাউচার মুছে ফেলা ও রিভার্স' : 'Delete & Reverse Cash Adjustment'}
                </h3>
                <p className="text-zinc-500 text-[11px]">
                  {language === 'bn' ? 'ভাউচারটি মুছে সংশ্লিষ্ট অ্যাকাউন্টের ব্যালেন্স পূর্বাবস্থায় ফিরিয়ে দেওয়া হবে' : 'Voucher will be deleted and wallet balance will be restored'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-zinc-900 dark:text-white">{adjToDelete.voucherNo}</span>
                <span className="text-zinc-500">{adjToDelete.date}</span>
              </div>
              <div className="text-zinc-600 dark:text-zinc-300">
                Type: <strong>{adjToDelete.type === 'CASH_ADD' ? 'Cash In (জমা)' : 'Withdraw (উত্তোলন)'}</strong> | Account: <strong>{adjToDelete.walletName}</strong>
              </div>
              <div className="text-zinc-600 dark:text-zinc-300">
                Amount: <strong className="font-mono font-bold text-indigo-600">৳{adjToDelete.amount.toLocaleString()}</strong>
              </div>
              <div className="text-zinc-500 text-[11px]">
                Reason: {adjToDelete.reason}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setAdjToDelete(null)}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAdj}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'মুছে ফেলুন ও রিভার্স করুন' : 'Delete & Restore Balance'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: CASH ADJUSTMENT (DEPOSIT / WITHDRAW) ======================= */}
      {isCashAdjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 bg-amber-50/50 dark:bg-amber-950/30 -mx-5 -mt-5 p-5">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    {language === 'bn' ? 'ক্যাশ সমন্বয় (মালিকের মূলধন জমা / উত্তোলন)' : 'Cash Adjustment Entry'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {language === 'bn' ? 'দোকানের ক্যাশ বা ব্যাংকে মালিকের জমা ও উত্তোলন' : 'Capital injection or owner drawing'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCashAdjustOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="space-y-3 pt-2">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Adjustment Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('ADD');
                      setAdjustReason(language === 'bn' ? 'মালিকের মূলধন জমা' : 'Owner Capital Deposit');
                    }}
                    className={`py-2 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      adjustType === 'ADD'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'মূলধন জমা (Cash In)' : 'Cash In (Deposit)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('WITHDRAW');
                      setAdjustReason(language === 'bn' ? 'মালিকের ব্যক্তিগত উত্তোলন' : 'Owner Personal Drawing');
                    }}
                    className={`py-2 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      adjustType === 'WITHDRAW'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'উত্তোলন (Drawing)' : 'Cash Out (Drawing)'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Target Wallet / Account *
                </label>
                <select
                  value={adjustTargetWalletId}
                  onChange={e => setAdjustTargetWalletId(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} [{w.type}] (Balance: ৳{w.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Amount (৳) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Reason / Source Description
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g. Additional capital investment / Shop expansion fund"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCashAdjustOpen(false)}
                  className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Confirm Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: INTER-ACCOUNT FUND TRANSFER ======================= */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                <span>{language === 'bn' ? 'আন্তঃ-অ্যাকাউন্ট তহবিল স্থানান্তর' : 'Inter-Account Fund Transfer'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  From Source Account (উৎস অ্যাকাউন্ট) *
                </label>
                <select
                  value={fromWalletId}
                  onChange={e => setFromWalletId(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} [{w.type}] (Balance: ৳{w.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  To Destination Account (গন্তব্য অ্যাকাউন্ট) *
                </label>
                <select
                  value={toWalletId}
                  onChange={e => setToWalletId(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} [{w.type}] (Balance: ৳{w.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Transfer Amount (৳) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Transfer Note / Remarks
                </label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={e => setTransferNote(e.target.value)}
                  placeholder="e.g. Deposited cash drawer surplus into Bank / bKash Cash In"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Execute Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: ADD NEW WALLET / ACCOUNT ======================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 text-xs my-8">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-600 text-white">
                  <WalletIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    {language === 'bn' ? 'নতুন অ্যাকাউন্ট / ওয়ালেট যুক্ত করুন' : 'Add Liquid Account / Wallet'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {language === 'bn' ? 'ব্যাংক, বিকাশ/নগদ বা নতুন ক্যাশ ড্রয়ার তৈরি করুন' : 'Setup Bank, MFS or Cash Drawer'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWallet} className="space-y-4">
              {/* Account Type Buttons */}
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
                  {language === 'bn' ? 'অ্যাকাউন্টের ধরন (Account Type) *' : 'Account Type *'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setType('BANK');
                      if (!bankName) setBankName('BRAC Bank');
                    }}
                    className={`py-2.5 px-3 rounded-lg font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      type === 'BANK'
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-500 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <Building className="w-4 h-4 text-sky-600" />
                    <span>Bank Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setType('MFS');
                      if (!bankName) setBankName('bKash');
                    }}
                    className={`py-2.5 px-3 rounded-lg font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      type === 'MFS'
                        ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-500 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-pink-600" />
                    <span>MFS (bKash/Nagad)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setType('CASH');
                      setBankName('');
                    }}
                    className={`py-2.5 px-3 rounded-lg font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      type === 'CASH'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash Drawer</span>
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              {type === 'BANK' && (
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 block mb-1">
                    Quick Select Popular Bank:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_BANKS.slice(0, 6).map(b => (
                      <button
                        type="button"
                        key={b}
                        onClick={() => {
                          setBankName(b);
                          if (!name) setName(`${b} Account`);
                        }}
                        className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-sky-50 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {type === 'MFS' && (
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 block mb-1">
                    Quick Select Provider:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_MFS.map(m => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => {
                          setBankName(m.split(' ')[0]);
                          if (!name) setName(`${m.split(' ')[0]} Merchant`);
                        }}
                        className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-pink-50 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    {language === 'bn' ? 'অ্যাকাউন্টের নাম (Account Display Name) *' : 'Account Display Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={
                      type === 'BANK'
                        ? 'e.g. BRAC Bank - Principal Branch'
                        : type === 'MFS'
                        ? 'e.g. bKash Merchant Wallet'
                        : 'e.g. Main Cash Drawer - Counter 1'
                    }
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {type === 'BANK' && (
                  <>
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Bank Name (ব্যাংকের নাম)
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        placeholder="e.g. BRAC Bank Ltd"
                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Branch Name (শাখা)
                      </label>
                      <input
                        type="text"
                        value={branch}
                        onChange={e => setBranch(e.target.value)}
                        placeholder="e.g. Gulshan Branch"
                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Account Number (হিসাব নম্বর)
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value)}
                        placeholder="e.g. 1501203456789001"
                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </>
                )}

                {type === 'MFS' && (
                  <>
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        MFS Provider (সার্ভিস)
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        placeholder="e.g. bKash / Nagad / Rocket"
                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Account / Mobile Number
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value)}
                        placeholder="e.g. 01712345678"
                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    {language === 'bn' ? 'প্রারম্ভিক ব্যালেন্স (Opening Balance ৳)' : 'Opening Balance (৳)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={openingBalance}
                    onChange={e => setOpeningBalance(e.target.value)}
                    placeholder="0"
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    {language === 'bn'
                      ? 'অ্যাকাউন্ট যুক্ত করার সময় এটি প্রারম্ভিক তহবিল হিসেবে ক্যাশবুক ও ডে-বুকে রেকর্ড হবে।'
                      : 'This initial amount will be recorded as opening balance.'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'অ্যাকাউন্ট সেভ করুন' : 'Save Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: EDIT WALLET ======================= */}
      {editingWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <span>{language === 'bn' ? 'অ্যাকাউন্ট সম্পাদনা' : 'Edit Account Details'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingWallet(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-semibold"
                />
              </div>

              {editingWallet.type === 'BANK' && (
                <>
                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={editBankName}
                      onChange={e => setEditBankName(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={editBranch}
                      onChange={e => setEditBranch(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={editAccountNumber}
                      onChange={e => setEditAccountNumber(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono"
                    />
                  </div>
                </>
              )}

              {editingWallet.type === 'MFS' && (
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Mobile / MFS Account Number
                  </label>
                  <input
                    type="text"
                    value={editAccountNumber}
                    onChange={e => setEditAccountNumber(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="walletActiveCheckbox"
                  checked={editIsActive}
                  onChange={e => setEditIsActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="walletActiveCheckbox" className="font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  Account is Active (লেনদেনের জন্য সক্রিয়)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingWallet(null)}
                  className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet Transaction History Modal */}
      {historyWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh] overflow-hidden text-xs">
            
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-zinc-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <History className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    <span>{historyWallet.name}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded font-mono">
                      {historyWallet.type}
                    </span>
                  </h3>
                  <p className="text-[11px] text-indigo-200 font-mono">
                    {historyWallet.bankName ? `${historyWallet.bankName} • ` : ''}
                    {historyWallet.accountNumber ? `A/C: ${historyWallet.accountNumber} • ` : ''}
                    Current Balance: <strong className="text-white">৳{historyWallet.balance.toLocaleString()}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handlePrintSingleWalletStatement(historyWallet)}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-white/20"
                  title="Print Ledger Statement"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'লেজার প্রিন্ট' : 'Print Statement'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryWallet(null);
                    setHistorySearch('');
                    setHistoryStartDate('');
                    setHistoryEndDate('');
                  }}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter toolbar inside history modal */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-850/80 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder={language === 'bn' ? 'ভাউচার বা বিবরণ খুঁজুন...' : 'Search voucher, party...'}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-zinc-500 font-medium">From:</span>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={e => setHistoryStartDate(e.target.value)}
                    className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-zinc-500 font-medium">To:</span>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={e => setHistoryEndDate(e.target.value)}
                    className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300"
                  />
                </div>
                {(historySearch || historyStartDate || historyEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearch('');
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                    }}
                    className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Wallet History Content */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {(() => {
                let txs = dayBookEntries.filter(e => e.walletId === historyWallet.id);

                if (historySearch.trim()) {
                  const q = historySearch.toLowerCase();
                  txs = txs.filter(
                    e =>
                      (e.voucherNo && e.voucherNo.toLowerCase().includes(q)) ||
                      (e.partyName && e.partyName.toLowerCase().includes(q)) ||
                      (e.remarks && e.remarks.toLowerCase().includes(q)) ||
                      (e.type && e.type.toLowerCase().includes(q))
                  );
                }

                if (historyStartDate) {
                  txs = txs.filter(e => {
                    const d = (e.date || e.createdAt || '').slice(0, 10);
                    return d >= historyStartDate;
                  });
                }

                if (historyEndDate) {
                  txs = txs.filter(e => {
                    const d = (e.date || e.createdAt || '').slice(0, 10);
                    return d <= historyEndDate;
                  });
                }

                const totalIn = txs.filter(e => e.flow === 'IN').reduce((s, e) => s + (e.amount || 0), 0);
                const totalOut = txs.filter(e => e.flow === 'OUT').reduce((s, e) => s + (e.amount || 0), 0);

                return (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                        <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                          {language === 'bn' ? 'মোট জমাকৃত (Total Money In)' : 'Total Money Added (+)'}
                        </div>
                        <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                          +{formatCurrency(totalIn)}
                        </div>
                      </div>

                      <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/60">
                        <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">
                          {language === 'bn' ? 'মোট উত্তোলিত/খরচ (Total Money Out)' : 'Total Money Subtracted (-)'}
                        </div>
                        <div className="text-lg font-black font-mono text-rose-700 dark:text-rose-400 mt-1">
                          -{formatCurrency(totalOut)}
                        </div>
                      </div>

                      <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60">
                        <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                          {language === 'bn' ? 'বর্তমান ব্যালেন্স (Current Balance)' : 'Available Balance'}
                        </div>
                        <div className="text-lg font-black font-mono text-indigo-700 dark:text-indigo-300 mt-1">
                          {formatCurrency(historyWallet.balance)}
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="py-2.5 px-3">Date & Time</th>
                            <th className="py-2.5 px-3">Voucher No</th>
                            <th className="py-2.5 px-3 text-center">Type</th>
                            <th className="py-2.5 px-3">Party / Description</th>
                            <th className="py-2.5 px-3">{language === 'bn' ? 'ইউজার / ক্যাশিয়ার' : 'Created By'}</th>
                            <th className="py-2.5 px-3 text-right">Money In (+)</th>
                            <th className="py-2.5 px-3 text-right">Money Out (-)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {txs.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-10 text-center text-zinc-400">
                                {language === 'bn' ? 'এই অ্যাকাউন্টে কোনো লেনদেনের ইতিহাস নেই।' : 'No transaction history found for this account.'}
                              </td>
                            </tr>
                          ) : (
                            txs.map((tx, idx) => {
                              const creator = getCreatorInfo(tx.createdBy);
                              return (
                                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-850">
                                  <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap">
                                    {tx.createdAt || tx.date}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                    {tx.voucherNo}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      tx.flow === 'IN' 
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    }`}>
                                      {tx.type}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                                    <div>{tx.partyName || tx.remarks}</div>
                                    {tx.partyName && tx.remarks && (
                                      <div className="text-[10px] text-zinc-400">{tx.remarks}</div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                                        {creator.initials}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px]">{creator.name}</div>
                                        <div className="text-[9px] text-zinc-400 font-mono">{creator.role}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    {tx.flow === 'IN' && tx.amount > 0 ? `+${formatCurrency(tx.amount)}` : '-'}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                    {tx.flow === 'OUT' && tx.amount > 0 ? `-${formatCurrency(tx.amount)}` : '-'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handlePrintSingleWalletStatement(historyWallet)}
                className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl cursor-pointer flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'bn' ? 'স্টেটমেন্ট প্রিন্ট' : 'Print Statement'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHistoryWallet(null);
                  setHistorySearch('');
                  setHistoryStartDate('');
                  setHistoryEndDate('');
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white font-bold rounded-xl cursor-pointer"
              >
                Close (বন্ধ করুন)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
