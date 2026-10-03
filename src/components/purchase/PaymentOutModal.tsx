import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { X, ArrowUpRight, Wallet as WalletIcon, ShieldAlert } from 'lucide-react';

interface PaymentOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSupplierId?: string;
}

export const PaymentOutModal: React.FC<PaymentOutModalProps> = ({
  isOpen,
  onClose,
  initialSupplierId,
}) => {
  const { language, parties, wallets, recordPaymentOut, formatCurrency, showToast } = useApp();
  const { t } = useTranslation(language);

  const suppliers = parties.filter(p => p.type === 'SUPPLIER');

  const [partyId, setPartyId] = useState<string>(initialSupplierId || suppliers[0]?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'MFS'>('CASH');
  const [walletId, setWalletId] = useState<string>(wallets.find(w => w.type === 'CASH')?.id || wallets[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');

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

  useEffect(() => {
    if (initialSupplierId) {
      setPartyId(initialSupplierId);
    }
  }, [initialSupplierId]);

  if (!isOpen) return null;

  const selectedSupplier = suppliers.find(s => s.id === partyId);
  const selectedWallet = wallets.find(w => w.id === walletId) || null;
  const walletBalance = selectedWallet?.balance || 0;
  const numAmount = parseFloat(amount) || 0;
  const isInsufficient = numAmount > walletBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId || numAmount <= 0) {
      showToast(
        language === 'bn' ? 'সঠিক পরিমাণ ও সাপ্লায়ার প্রদান করুন।' : 'Please specify valid amount and supplier.',
        'warning'
      );
      return;
    }

    if (!selectedWallet) {
      showToast(
        language === 'bn' ? 'অনুগ্রহ করে ওয়ালেট নির্বাচন করুন।' : 'Please select a payment wallet.',
        'warning'
      );
      return;
    }

    if (numAmount > selectedWallet.balance) {
      showToast(
        language === 'bn'
          ? `নির্বাচিত ওয়ালেটে (${selectedWallet.name}) পর্যাপ্ত টাকা নেই! বর্তমান ব্যালেন্স: ৳${selectedWallet.balance.toLocaleString()} | পরিশোধ চেষ্টা: ৳${numAmount.toLocaleString()}`
          : `Insufficient balance in ${selectedWallet.name}! Available: ৳${selectedWallet.balance.toLocaleString()} | Trying to pay: ৳${numAmount.toLocaleString()}`,
        'error'
      );
      return;
    }

    const success = recordPaymentOut({
      partyId,
      amount: numAmount,
      walletId: selectedWallet.id,
      date,
      remarks,
    });

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-rose-50/70 dark:bg-rose-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-600 text-white shadow-xs">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                {t('record_payment_out')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {language === 'bn' ? 'সাপ্লায়ার / মহাজনের বকেয়া বিল পরিশোধ' : 'Pay pending bills to vendor / supplier'}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              {t('suppliers')} *
            </label>
            <select
              value={partyId}
              onChange={e => setPartyId(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {suppliers.length === 0 ? (
                <option value="">{language === 'bn' ? 'কোনো সাপ্লায়ার পাওয়া যায়নি' : 'No suppliers available'}</option>
              ) : (
                suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.currentBalance > 0 ? `(Payable: ৳${s.currentBalance.toLocaleString()})` : '(Clear)'}
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedSupplier && (
            <div className="p-3 bg-rose-50/80 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900/60 flex justify-between items-center">
              <div>
                <span className="text-rose-800 dark:text-rose-300 font-semibold block">
                  {language === 'bn' ? 'বর্তমান মহাজন দেনা (Total Payable Due):' : 'Current Payable Due:'}
                </span>
                <span className="text-[11px] text-rose-600/80 dark:text-rose-400">
                  {selectedSupplier.phone ? `Phone: ${selectedSupplier.phone}` : 'Vendor Account'}
                </span>
              </div>
              <span className="text-lg font-black font-mono text-rose-900 dark:text-rose-200">
                {formatCurrency(selectedSupplier.currentBalance)}
              </span>
            </div>
          )}

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
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <WalletIcon className="w-3.5 h-3.5 text-rose-600" />
                  <span>{language === 'bn' ? 'অ্যাকাউন্ট নির্বাচন' : 'Pay From Wallet / Account'} *</span>
                </label>
              </div>
              <select
                value={walletId}
                onChange={e => setWalletId(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {wallets.filter(w => w.type === paymentMethod).map(w => {
                  const isZero = w.balance <= 0;
                  return (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.accountNumber ? `(${w.accountNumber})` : ''} [{w.type}] — ব্যালেন্স: ৳{w.balance.toLocaleString()} {isZero ? '(ব্যালেন্স নেই / ৳0)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {selectedWallet && (
            <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
              walletBalance <= 0
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-800 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${walletBalance > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="font-medium">
                  {language === 'bn' ? 'নির্বাচিত ওয়ালেটে প্রাপ্ত ব্যালেন্স:' : 'Available Wallet Balance:'}
                </span>
              </div>
              <span className="font-mono font-bold text-sm">
                {formatCurrency(walletBalance)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Payment Amount (৳) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className={`w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold text-sm focus:outline-none ${
                  isInsufficient && numAmount > 0
                    ? 'border-rose-500 text-rose-600 focus:ring-2 focus:ring-rose-500'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500'
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

          {isInsufficient && numAmount > 0 && (
            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg flex items-start gap-2.5 text-rose-800 dark:text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs">
                  {language === 'bn' ? 'অপর্যাপ্ত ওয়ালেট ব্যালেন্স!' : 'Insufficient Wallet Balance!'}
                </p>
                <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                  {language === 'bn'
                    ? `"${selectedWallet?.name}" ওয়ালেটে মাত্র ৳${walletBalance.toLocaleString()} আছে। পরিশোধ করতে আরও ৳${(numAmount - walletBalance).toLocaleString()} প্রয়োজন। দয়া করে ব্যালেন্স আছে এমন অন্য ওয়ালেট নির্বাচন করুন অথবা ওয়ালেটে টাকা জমা দিন।`
                    : `Only ৳${walletBalance.toLocaleString()} available in "${selectedWallet?.name}". Short of ৳${(numAmount - walletBalance).toLocaleString()}. Please select another wallet or add funds.`}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              {t('notes')}
            </label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Cheque No #882910, Bank Transfer, or Cash Paid"
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isInsufficient || numAmount <= 0 || !partyId}
              className={`px-5 py-2.5 rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-all ${
                isInsufficient || numAmount <= 0 || !partyId
                  ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-300 dark:border-zinc-700'
                  : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer hover:shadow-md'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>
                {isInsufficient
                  ? language === 'bn' ? 'অপর্যাপ্ত ব্যালেন্স (পরিশোধ সম্ভব নয়)' : 'Insufficient Funds'
                  : language === 'bn' ? 'সাপ্লায়ার দেনা পরিশোধ নিশ্চিত করুন' : 'Confirm Supplier Payment'}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
