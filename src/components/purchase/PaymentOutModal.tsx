import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { X, ArrowUpRight, Wallet as WalletIcon, ShieldAlert, CheckCircle2, Sparkles } from 'lucide-react';

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
  const supplierPayableDue = selectedSupplier ? Math.max(0, Number(selectedSupplier.currentBalance || 0)) : 0;
  const hasZeroDue = supplierPayableDue <= 0;

  const selectedWallet = wallets.find(w => w.id === walletId) || null;
  const walletBalance = selectedWallet?.balance || 0;
  const numAmount = parseFloat(amount) || 0;

  const isExceedingSupplierDue = numAmount > supplierPayableDue;
  const remainingPayableDue = Math.max(0, supplierPayableDue - numAmount);
  const isInsufficient = numAmount > walletBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      showToast(
        language === 'bn' ? 'সাপ্লায়ার/মহাজন নির্বাচন করুন।' : 'Please select a supplier.',
        'warning'
      );
      return;
    }

    if (hasZeroDue) {
      showToast(
        language === 'bn'
          ? 'এই সাপ্লায়ারের কোনো বকেয়া বিল নেই (দেনা ৳০)! দেনা ছাড়া টাকা পরিশোধ করা যাবে না।'
          : 'Supplier has no payable due balance (৳0)! Cannot make payment.',
        'error'
      );
      return;
    }

    if (numAmount <= 0) {
      showToast(
        language === 'bn' ? 'সঠিক পরিশোধের পরিমাণ লিখুন।' : 'Please enter a valid payment amount.',
        'warning'
      );
      return;
    }

    if (numAmount > supplierPayableDue) {
      showToast(
        language === 'bn'
          ? `⚠️ মহাজন পাওনা বিলের চেয়ে বেশি টাকা পরিশোধ করা যাবে না! মোট বকেয়া ৳${supplierPayableDue.toLocaleString()}। আপনি ৳${numAmount.toLocaleString()} লিখেছেন। সর্বোচ্চ ৳${supplierPayableDue.toLocaleString()} বা তার কম পরিশোধ করুন।`
          : `Cannot pay more than payable due! Total due is ৳${supplierPayableDue.toLocaleString()}, but attempted ৳${numAmount.toLocaleString()}. Maximum allowed is ৳${supplierPayableDue.toLocaleString()}.`,
        'error'
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
        
        {/* Header */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Supplier Selection */}
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              {t('suppliers')} *
            </label>
            <select
              value={partyId}
              onChange={e => {
                setPartyId(e.target.value);
                setAmount('');
              }}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {suppliers.length === 0 ? (
                <option value="">{language === 'bn' ? 'কোনো সাপ্লায়ার পাওয়া যায়নি' : 'No suppliers available'}</option>
              ) : (
                suppliers.map(s => {
                  const sBal = Math.max(0, Number(s.currentBalance || 0));
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} {sBal > 0 ? `(পাওনা দেনা: ৳${sBal.toLocaleString()})` : '(দেনা নেই / ৳০)'}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Current Payable Due Highlight Banner */}
          {selectedSupplier && (
            <div className={`p-3.5 rounded-lg border flex justify-between items-center transition-colors ${
              hasZeroDue
                ? 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'
                : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
            }`}>
              <div>
                <span className={`font-bold text-xs block ${
                  hasZeroDue ? 'text-zinc-600 dark:text-zinc-300' : 'text-rose-800 dark:text-rose-300'
                }`}>
                  {language === 'bn' ? 'বর্তমান মহাজন দেনা (Total Payable Due):' : 'Current Payable Due:'}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {selectedSupplier.phone ? `মোবাইল: ${selectedSupplier.phone}` : 'সাপ্লায়ার অ্যাকাউন্ট'}
                </span>
              </div>
              <span className={`text-xl font-black font-mono ${
                hasZeroDue ? 'text-zinc-500 dark:text-zinc-400' : 'text-rose-900 dark:text-rose-200'
              }`}>
                {formatCurrency(supplierPayableDue)}
              </span>
            </div>
          )}

          {/* Zero Due Warning Alert */}
          {hasZeroDue && selectedSupplier && (
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center gap-2.5 text-zinc-600 dark:text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs">
                {language === 'bn'
                  ? 'এই সাপ্লায়ারের কোনো বকেয়া পাওনা বিল নেই (দেনা ৳০)। কোনো টাকা পরিশোধ করার প্রয়োজন নেই।'
                  : 'This supplier has zero payable balance (৳0). No payment is required.'}
              </p>
            </div>
          )}

          {/* Payment Method & Wallet Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                {language === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'} *
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as 'CASH' | 'BANK' | 'MFS')}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium"
              >
                <option value="CASH">{language === 'bn' ? 'ক্যাশ (Cash)' : 'Cash'}</option>
                <option value="BANK">{language === 'bn' ? 'ব্যাংক (Bank)' : 'Bank'}</option>
                <option value="MFS">{language === 'bn' ? 'মোবাইল ব্যাংকিং (bKash/Nagad)' : 'MFS'}</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <WalletIcon className="w-3.5 h-3.5 text-rose-600" />
                  <span>{language === 'bn' ? 'পরিশোধ অ্যাকাউন্ট' : 'Pay From Wallet'} *</span>
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
                      {w.name} {w.accountNumber ? `(${w.accountNumber})` : ''} — ব্যালেন্স: ৳{w.balance.toLocaleString()} {isZero ? '(ব্যালেন্স নেই / ৳০)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Wallet Balance Indicator */}
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

          {/* Amount & Date Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Payment Amount (৳) *
                </label>
                {supplierPayableDue > 0 && (
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                    সর্বোচ্চ: ৳{supplierPayableDue.toLocaleString()}
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                max={supplierPayableDue > 0 ? supplierPayableDue : undefined}
                required
                disabled={hasZeroDue}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={hasZeroDue ? 'দেনা নেই' : 'টাকার পরিমাণ লিখুন'}
                className={`w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold text-sm focus:outline-none ${
                  hasZeroDue
                    ? 'border-zinc-200 dark:border-zinc-700 text-zinc-400 cursor-not-allowed'
                    : (isExceedingSupplierDue || isInsufficient) && numAmount > 0
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
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium"
              />
            </div>
          </div>

          {/* Quick Amount Settlement Buttons */}
          {!hasZeroDue && supplierPayableDue > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-500" />
                {language === 'bn' ? 'দ্রুত পরিশোধের পরিমাণ নির্বাচন করুন (আংশিক বা সম্পূর্ণ):' : 'Quick select payment amount:'}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAmount(supplierPayableDue.toString())}
                  className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  ১০০% দেনা (৳{supplierPayableDue.toLocaleString()})
                </button>
                {supplierPayableDue >= 10 && (
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(supplierPayableDue * 0.5).toString())}
                    className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    ৫০% আংশিক (৳{Math.round(supplierPayableDue * 0.5).toLocaleString()})
                  </button>
                )}
                {supplierPayableDue >= 20 && (
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(supplierPayableDue * 0.25).toString())}
                    className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    ২৫% আংশিক (৳{Math.round(supplierPayableDue * 0.25).toLocaleString()})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Real-time Exceeding Due Error Alert */}
          {isExceedingSupplierDue && numAmount > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg flex items-start gap-2.5 text-rose-800 dark:text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs">
                  {language === 'bn' ? '⚠️ মহাজন পাওনা বিলের চেয়ে বেশি টাকা পরিশোধ করা যাবে না!' : 'Cannot Pay More Than Payable Due!'}
                </p>
                <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                  {language === 'bn'
                    ? `সাপ্লায়ারের মোট দেনা মাত্র ৳${supplierPayableDue.toLocaleString()}। আপনি ৳${numAmount.toLocaleString()} পরিশোধের চেষ্টা করছেন (৳${(numAmount - supplierPayableDue).toLocaleString()} বেশি)। আপনি কম বা সর্বোচ্চ ৳${supplierPayableDue.toLocaleString()} পরিশোধ করতে পারবেন।`
                    : `Supplier payable bill is only ৳${supplierPayableDue.toLocaleString()}. You entered ৳${numAmount.toLocaleString()}. Maximum allowed is ৳${supplierPayableDue.toLocaleString()} or less.`}
                </p>
              </div>
            </div>
          )}

          {/* Valid Amount Preview (Remaining Balance Calculation) */}
          {!isExceedingSupplierDue && numAmount > 0 && !hasZeroDue && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">
                  {remainingPayableDue === 0
                    ? (language === 'bn' ? 'সম্পূর্ণ দেনা পরিশোধ (দেনা ৳০ হবে):' : 'Full settlement (Payable will be ৳0):')
                    : (language === 'bn' ? 'আংশিক পরিশোধের পর অবশিষ্ট দেনা থাকবে:' : 'Remaining payable after partial payment:')}
                </span>
              </div>
              <span className="font-mono font-bold text-sm">
                ৳{remainingPayableDue.toLocaleString()}
              </span>
            </div>
          )}

          {/* Insufficient Wallet Balance Alert */}
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

          {/* Remarks */}
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

          {/* Actions */}
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
              disabled={hasZeroDue || isExceedingSupplierDue || isInsufficient || numAmount <= 0 || !partyId}
              className={`px-5 py-2.5 rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-all ${
                hasZeroDue || isExceedingSupplierDue || isInsufficient || numAmount <= 0 || !partyId
                  ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-300 dark:border-zinc-700'
                  : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer hover:shadow-md'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>
                {hasZeroDue
                  ? (language === 'bn' ? 'দেনা নেই (পরিশোধ অসম্ভব)' : 'No Due Balance')
                  : isExceedingSupplierDue
                  ? (language === 'bn' ? 'দেনার বেশি পরিশোধ নিষেধ' : 'Exceeds Due Balance')
                  : isInsufficient
                  ? (language === 'bn' ? 'অপর্যাপ্ত ব্যালেন্স' : 'Insufficient Funds')
                  : (language === 'bn' ? 'সাপ্লায়ার দেনা পরিশোধ নিশ্চিত করুন' : 'Confirm Supplier Payment')}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
