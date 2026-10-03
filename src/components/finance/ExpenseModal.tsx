import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { X, DollarSign, Save, ShieldAlert, Wallet as WalletIcon, Printer } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose }) => {
  const { language, wallets, expenseCategories, addExpenseVoucher, openPrintModal, showToast, formatCurrency } = useApp();
  const { t } = useTranslation(language);

  const [categoryId, setCategoryId] = useState<string>(expenseCategories[0]?.id || 'exp-cat-1');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'MFS'>('CASH');
  const [walletId, setWalletId] = useState<string>(wallets.find(w => w.type === 'CASH')?.id || wallets[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payee, setPayee] = useState<string>('');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    const filteredWallets = wallets.filter(w => w.type === paymentMethod);
    if (filteredWallets.length > 0) {
      setWalletId(prev => {
        const stillValid = filteredWallets.some(w => w.id === prev);
        return stillValid ? prev : filteredWallets[0].id;
      });
    } else {
      setWalletId('');
    }
  }, [paymentMethod, wallets.length]);

  if (!isOpen) return null;

  const selectedWallet = wallets.find(w => w.id === walletId) || null;
  const walletBalance = selectedWallet?.balance || 0;
  const numAmount = parseFloat(amount) || 0;
  const isInsufficient = numAmount > walletBalance;

  const processSave = (shouldPrint: boolean) => {
    if (!numAmount || numAmount <= 0) {
      showToast(language === 'bn' ? 'সঠিক খরচের পরিমাণ দিন!' : 'Please enter valid expense amount!', 'warning');
      return;
    }

    if (!selectedWallet) {
      showToast(language === 'bn' ? 'অনুগ্রহ করে ওয়ালেট নির্বাচন করুন।' : 'Please select a wallet.', 'warning');
      return;
    }

    if (numAmount > selectedWallet.balance) {
      showToast(
        language === 'bn'
          ? `নির্বাচিত ওয়ালেটে (${selectedWallet.name}) পর্যাপ্ত টাকা নেই! বর্তমান ব্যালেন্স: ৳${selectedWallet.balance.toLocaleString()} | খরচ: ৳${numAmount.toLocaleString()}`
          : `Insufficient balance in ${selectedWallet.name}! Available: ৳${selectedWallet.balance.toLocaleString()} | Expense: ৳${numAmount.toLocaleString()}`,
        'error'
      );
      return;
    }

    const selectedCat = expenseCategories.find(c => c.id === categoryId);

    const result = addExpenseVoucher({
      categoryId: categoryId || 'exp-cat-1',
      categoryName: selectedCat ? (language === 'bn' ? selectedCat.nameBn : selectedCat.name) : 'General Expense',
      amount: numAmount,
      walletId: selectedWallet.id,
      walletName: selectedWallet.name || 'Cash',
      date,
      payee: payee.trim() || 'Direct Vendor',
      receiptNo: receiptNo.trim() || undefined,
      note: note.trim() || `${selectedCat?.name || 'Expense'} payment`,
    });

    if (result) {
      onClose();
      if (shouldPrint) {
        openPrintModal({
          type: 'EXPENSE_VOUCHER',
          title: `Expense Voucher ${result.voucherNo}`,
          data: {
            voucherNo: result.voucherNo,
            date: result.date,
            category: result.categoryName || result.category || 'General Expense',
            categoryName: result.categoryName || result.category || 'General Expense',
            payee: result.payee || '-',
            walletName: result.walletName || 'Cash',
            amount: result.amount,
            receiptNo: result.receiptNo || '',
            note: result.note || result.remarks || '-',
            remarks: result.note || result.remarks || '-',
          },
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processSave(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-purple-50/70 dark:bg-purple-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-600 text-white shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                {language === 'bn' ? 'নতুন খরচের ভাউচার' : 'New Expense Voucher'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {language === 'bn' ? 'অফিস বা দোকান পরিচালনার খরচ লিপিবদ্ধ করুন' : 'Record business / operating expenses'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Expense Category (খরচের খাত) *
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {expenseCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {language === 'bn' ? `${cat.nameBn} (${cat.name})` : `${cat.name} (${cat.nameBn})`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Expense Amount (৳) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className={`w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold text-sm focus:outline-none ${
                  isInsufficient && numAmount > 0
                    ? 'border-rose-500 text-rose-600 focus:ring-2 focus:ring-rose-500'
                    : 'border-zinc-200 dark:border-zinc-700 text-purple-600 dark:text-purple-400 focus:ring-2 focus:ring-purple-500'
                }`}
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                {t('date')} *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Payment Method & Wallet */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                {language === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'} *
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as 'CASH' | 'BANK' | 'MFS')}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
              >
                <option value="CASH">{language === 'bn' ? 'ক্যাশ' : 'Cash'}</option>
                <option value="BANK">{language === 'bn' ? 'ব্যাংক' : 'Bank'}</option>
                <option value="MFS">{language === 'bn' ? 'এমএফএস (MFS)' : 'MFS'}</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Paid From Wallet / Account *
              </label>
              <select
                value={walletId}
                onChange={e => setWalletId(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {wallets.filter(w => w.type === paymentMethod).map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.accountNumber ? `(${w.accountNumber})` : ''} [{w.type}] — ব্যালেন্স: ৳{w.balance.toLocaleString()} {w.balance <= 0 ? '(ব্যালেন্স নেই / ৳0)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Wallet Balance Highlight */}
          {selectedWallet && (
            <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
              walletBalance <= 0
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-800 dark:text-rose-300'
                : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/60 text-purple-800 dark:text-purple-300'
            }`}>
              <span className="font-medium">
                {language === 'bn' ? 'নির্বাচিত ওয়ালেটে প্রাপ্ত ব্যালেন্স:' : 'Available Wallet Balance:'}
              </span>
              <span className="font-mono font-bold text-sm">
                {formatCurrency(walletBalance)}
              </span>
            </div>
          )}

          {/* Insufficient Funds Warning Banner */}
          {isInsufficient && numAmount > 0 && (
            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg flex items-start gap-2 text-rose-800 dark:text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold block">
                  {language === 'bn' ? 'অপর্যাপ্ত ওয়ালেট ব্যালেন্স!' : 'Insufficient Wallet Balance!'}
                </span>
                <span>
                  {language === 'bn'
                    ? `"${selectedWallet?.name}"-এ মাত্র ৳${walletBalance.toLocaleString()} আছে। খরচ করার মতো পর্যাপ্ত ব্যালেন্স নেই।`
                    : `Only ৳${walletBalance.toLocaleString()} in "${selectedWallet?.name}". Not enough funds for this expense.`}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Payee / Vendor Name
              </label>
              <input
                type="text"
                value={payee}
                onChange={e => setPayee(e.target.value)}
                placeholder="e.g. Landlord, DPDC, Tea Vendor"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Money Receipt / Ref No
              </label>
              <input
                type="text"
                value={receiptNo}
                onChange={e => setReceiptNo(e.target.value)}
                placeholder="e.g. MR-9941"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Particulars / Notes
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Paid shop rent for current month"
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => processSave(true)}
              disabled={isInsufficient || numAmount <= 0}
              className={`px-4 py-2.5 rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-all ${
                isInsufficient || numAmount <= 0
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-300 dark:border-zinc-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-md'
              }`}
              title={language === 'bn' ? 'ভাউচার সেভ করুন এবং সাথে সাথে প্রিন্ট উইন্ডো খুলুন' : 'Save and immediately print voucher'}
            >
              <Printer className="w-4 h-4" />
              <span>
                {language === 'bn' ? 'সংরক্ষণ ও প্রিন্ট' : 'Save & Print'}
              </span>
            </button>
            <button
              type="submit"
              disabled={isInsufficient || numAmount <= 0}
              className={`px-4 py-2.5 rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-all ${
                isInsufficient || numAmount <= 0
                  ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-300 dark:border-zinc-700'
                  : 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:shadow-md'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>
                {isInsufficient
                  ? language === 'bn' ? 'অপর্যাপ্ত ব্যালেন্স' : 'Insufficient Funds'
                  : language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Voucher'}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
