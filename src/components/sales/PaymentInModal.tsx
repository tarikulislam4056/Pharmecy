import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { getCustomerTotalDue, getDueBreakdown } from '../../utils/dueHelpers';
import { X, ArrowDownLeft, ShieldAlert, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface PaymentInModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPartyId?: string;
}

export const PaymentInModal: React.FC<PaymentInModalProps> = ({
  isOpen,
  onClose,
  initialPartyId,
}) => {
  const { language, parties, installmentSchemes, wallets, recordPaymentIn, formatCurrency, showToast, smsConfig } = useApp();
  const { t } = useTranslation(language);

  const customers = parties.filter(p => p.type === 'CUSTOMER');

  const [partyId, setPartyId] = useState<string>(initialPartyId || customers[0]?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'MFS'>('CASH');
  const [walletId, setWalletId] = useState<string>(wallets.find(w => w.type === 'CASH')?.id || wallets[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');
  const [sendSmsReceipt, setSendSmsReceipt] = useState<boolean>(smsConfig.enabled && smsConfig.autoSendOnPaymentIn);

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
    if (initialPartyId) {
      setPartyId(initialPartyId);
    }
  }, [initialPartyId]);

  if (!isOpen) return null;

  const selectedParty = parties.find(p => p.id === partyId);
  const totalCustomerDue = selectedParty
    ? Math.max(0, Math.max(Number(selectedParty.currentBalance || 0), getCustomerTotalDue(selectedParty, installmentSchemes)))
    : 0;

  const numAmount = parseFloat(amount) || 0;
  const hasZeroDue = totalCustomerDue <= 0;
  const isExceedingDue = numAmount > totalCustomerDue;
  const remainingDue = Math.max(0, totalCustomerDue - numAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      showToast(language === 'bn' ? 'কাস্টমার নির্বাচন করুন।' : 'Please select a customer.', 'warning');
      return;
    }

    if (hasZeroDue) {
      showToast(
        language === 'bn'
          ? 'এই কাস্টমারের কোনো বকেয়া নেই (৳০)! বকেয়া ছাড়া টাকা আদায় করা যাবে না।'
          : 'Customer has no outstanding due (৳0)! Cannot collect payment.',
        'error'
      );
      return;
    }

    if (!numAmount || numAmount <= 0) {
      showToast(language === 'bn' ? 'সঠিক আদায়ের পরিমাণ লিখুন।' : 'Please specify a valid collection amount.', 'warning');
      return;
    }

    if (numAmount > totalCustomerDue) {
      showToast(
        language === 'bn'
          ? `⚠️ বকেয়ার চেয়ে বেশি টাকা আদায় করা যাবে না! মোট বকেয়া ৳${totalCustomerDue.toLocaleString()}। আপনি ৳${numAmount.toLocaleString()} লিখেছেন। কম বা সর্বোচ্চ ৳${totalCustomerDue.toLocaleString()} আদায় করুন।`
          : `Cannot collect more than outstanding due! Total due is ৳${totalCustomerDue.toLocaleString()}, but attempted ৳${numAmount.toLocaleString()}. Maximum allowed is ৳${totalCustomerDue.toLocaleString()}.`,
        'error'
      );
      return;
    }

    if (!walletId) {
      showToast(language === 'bn' ? 'পেমেন্ট ওয়ালেট নির্বাচন করুন।' : 'Please select a payment wallet.', 'warning');
      return;
    }

    const success = recordPaymentIn({
      partyId,
      amount: numAmount,
      walletId,
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-emerald-50/70 dark:bg-emerald-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                {t('record_payment_in')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {language === 'bn' ? 'কাস্টমারের বকেয়া টাকা আদায় ও জমা গ্রহণ' : 'Receive customer balance payment'}
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
          
          {/* Customer Selection */}
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              {t('customers')} *
            </label>
            <select
              value={partyId}
              onChange={e => {
                setPartyId(e.target.value);
                setAmount('');
              }}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {customers.map(c => {
                const totalDue = Math.max(0, Math.max(Number(c.currentBalance || 0), getCustomerTotalDue(c, installmentSchemes)));
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {totalDue > 0 ? `(বকেয়া: ৳${totalDue.toLocaleString()})` : '(বকেয়া নেই / ৳০)'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Current Due Highlight Banner */}
          {selectedParty && (() => {
            const breakdown = getDueBreakdown(selectedParty, installmentSchemes);
            return (
              <div className={`p-3.5 rounded-lg border space-y-2 transition-colors ${
                hasZeroDue
                  ? 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'
                  : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`font-bold text-xs block ${
                      hasZeroDue ? 'text-zinc-600 dark:text-zinc-300' : 'text-amber-800 dark:text-amber-300'
                    }`}>
                      {language === 'bn' ? 'বর্তমান মোট বকেয়া (Customer Due):' : 'Current Outstanding Due:'}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {selectedParty.phone ? `মোবাইল: ${selectedParty.phone}` : 'কাস্টমার অ্যাকাউন্ট'}
                    </span>
                  </div>
                  <span className={`text-xl font-black font-mono ${
                    hasZeroDue ? 'text-zinc-500 dark:text-zinc-400' : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {formatCurrency(totalCustomerDue)}
                  </span>
                </div>

                {breakdown.hasEmiDue && !hasZeroDue && (
                  <div className="flex justify-between text-[11px] text-amber-700 dark:text-amber-400 font-mono pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                    <span>সাধারণ বাকি: ৳{breakdown.regularDue.toLocaleString()}</span>
                    <span>কিস্তি (EMI) বাকি: ৳{breakdown.emiDue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Zero Due Warning Alert */}
          {hasZeroDue && selectedParty && (
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center gap-2.5 text-zinc-600 dark:text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs">
                {language === 'bn'
                  ? 'এই কাস্টমারের কোনো বকেয়া নেই (বকেয়া ৳০)। কোনো টাকা আদায় করার প্রয়োজন নেই।'
                  : 'This customer has zero outstanding due balance. No collection is required.'}
              </p>
            </div>
          )}

          {/* Amount & Date Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('received_amount')} (৳) *
                </label>
                {totalCustomerDue > 0 && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    সর্বোচ্চ: ৳{totalCustomerDue.toLocaleString()}
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                max={totalCustomerDue > 0 ? totalCustomerDue : undefined}
                required
                disabled={hasZeroDue}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={hasZeroDue ? 'বকেয়া নেই' : 'টাকার পরিমাণ লিখুন'}
                className={`w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-xs font-mono font-bold focus:outline-none ${
                  hasZeroDue
                    ? 'border-zinc-200 dark:border-zinc-700 text-zinc-400 cursor-not-allowed'
                    : isExceedingDue
                    ? 'border-rose-500 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500'
                    : 'border-zinc-200 dark:border-zinc-700 text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500'
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
          {!hasZeroDue && totalCustomerDue > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                {language === 'bn' ? 'দ্রুত আদায়ের পরিমাণ নির্বাচন করুন (আংশিক বা সম্পূর্ণ):' : 'Quick select collection amount:'}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAmount(totalCustomerDue.toString())}
                  className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  ১০০% বকেয়া (৳{totalCustomerDue.toLocaleString()})
                </button>
                {totalCustomerDue >= 10 && (
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(totalCustomerDue * 0.5).toString())}
                    className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    ৫০% আংশিক (৳{Math.round(totalCustomerDue * 0.5).toLocaleString()})
                  </button>
                )}
                {totalCustomerDue >= 20 && (
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(totalCustomerDue * 0.25).toString())}
                    className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    ২৫% আংশিক (৳{Math.round(totalCustomerDue * 0.25).toLocaleString()})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Real-time Exceeding Due Error Alert */}
          {isExceedingDue && numAmount > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg flex items-start gap-2.5 text-rose-800 dark:text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs">
                  {language === 'bn' ? '⚠️ বকেয়ার চেয়ে বেশি টাকা আদায় করা যাবে না!' : 'Cannot Collect More Than Outstanding Due!'}
                </p>
                <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                  {language === 'bn'
                    ? `কাস্টমারের মোট বকেয়া মাত্র ৳${totalCustomerDue.toLocaleString()}। আপনি ৳${numAmount.toLocaleString()} আদায়ের চেষ্টা করছেন (৳${(numAmount - totalCustomerDue).toLocaleString()} বেশি)। আপনি কম টাকা বা সর্বোচ্চ ৳${totalCustomerDue.toLocaleString()} আদায় করতে পারবেন।`
                    : `Customer's total due is only ৳${totalCustomerDue.toLocaleString()}. You entered ৳${numAmount.toLocaleString()}. Maximum allowed collection is ৳${totalCustomerDue.toLocaleString()} or less.`}
                </p>
              </div>
            </div>
          )}

          {/* Valid Amount Preview (Remaining Balance Calculation) */}
          {!isExceedingDue && numAmount > 0 && !hasZeroDue && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">
                  {remainingDue === 0
                    ? (language === 'bn' ? 'সম্পূর্ণ বকেয়া পরিশোধ (ব্যালেন্স ৳০ হবে):' : 'Full settlement (Due will be ৳0):')
                    : (language === 'bn' ? 'আংশিক আদায়ের পর অবশিষ্ট বকেয়া থাকবে:' : 'Remaining due after partial payment:')}
                </span>
              </div>
              <span className="font-mono font-bold text-sm">
                ৳{remainingDue.toLocaleString()}
              </span>
            </div>
          )}

          {/* Payment Method & Wallet */}
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
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                {t('wallet_account')} *
              </label>
              <select
                value={walletId}
                onChange={e => setWalletId(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {wallets.filter(w => w.type === paymentMethod).map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.accountNumber ? `(${w.accountNumber})` : ''} (বর্তমান: ৳{w.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              {t('notes')}
            </label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Received via Cash / bKash TrxID #91823"
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
            />
          </div>

          {/* SMS Confirmation Toggle */}
          {selectedParty?.phone && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendSmsPaymentIn"
                  checked={sendSmsReceipt}
                  onChange={e => setSendSmsReceipt(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-600"
                />
                <label htmlFor="sendSmsPaymentIn" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                  {language === 'bn' ? 'কাস্টমারকে টাকা জমার SMS পাঠান' : 'Send Payment Receipt SMS'}
                </label>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">{selectedParty.phone}</span>
            </div>
          )}

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
              disabled={hasZeroDue || isExceedingDue || numAmount <= 0 || !partyId || !walletId}
              className={`px-5 py-2.5 rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-all ${
                hasZeroDue || isExceedingDue || numAmount <= 0 || !partyId || !walletId
                  ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-300 dark:border-zinc-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-md'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>
                {hasZeroDue
                  ? (language === 'bn' ? 'বকেয়া নেই (আদায় অসম্ভব)' : 'No Due Balance')
                  : isExceedingDue
                  ? (language === 'bn' ? 'বকেয়ার বেশি আদায় নিষেধ' : 'Exceeds Due Balance')
                  : (language === 'bn' ? 'টাকা জমা ও রসিদ প্রিন্ট করুন' : `${t('submit')} & Print Receipt`)}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
