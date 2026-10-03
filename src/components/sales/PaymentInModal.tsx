import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { getCustomerTotalDue, getDueBreakdown } from '../../utils/dueHelpers';
import { X, ArrowDownLeft, Wallet, User, DollarSign } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!partyId || !numAmount || numAmount <= 0 || !walletId) {
      showToast(language === 'bn' ? 'সঠিক তথ্য প্রদান করুন।' : 'Please specify valid information.', 'warning');
      return;
    }

    recordPaymentIn({
      partyId,
      amount: numAmount,
      walletId,
      date,
      remarks,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-emerald-50/50 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                {t('record_payment_in')}
              </h3>
              <p className="text-xs text-zinc-500">
                {language === 'bn' ? 'কাস্টমারের বকেয়া টাকা জমা নিন' : 'Receive customer balance payment'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
              onChange={e => setPartyId(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-900 dark:text-white"
            >
              {customers.map(c => {
                const totalDue = getCustomerTotalDue(c, installmentSchemes);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {totalDue > 0 ? `(Due: ৳${totalDue.toLocaleString()})` : '(No Due)'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Current Due Highlight */}
          {selectedParty && (() => {
            const breakdown = getDueBreakdown(selectedParty, installmentSchemes);
            return (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/60 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-amber-800 dark:text-amber-300 font-medium">
                    {language === 'bn' ? 'বর্তমান মোট বকেয়া (Total Due):' : 'Current Total Due Balance:'}
                  </span>
                  <span className="text-base font-bold font-mono text-amber-900 dark:text-amber-200">
                    {formatCurrency(breakdown.totalDue)}
                  </span>
                </div>
                {breakdown.hasEmiDue && (
                  <div className="flex justify-between text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                    <span>Regular Credit: ৳{breakdown.regularDue.toLocaleString()}</span>
                    <span>EMI Pending: ৳{breakdown.emiDue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                {t('received_amount')} (৳) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
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
                {t('wallet_account')} *
              </label>
              <select
                value={walletId}
                onChange={e => setWalletId(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
              >
                {wallets.filter(w => w.type === paymentMethod).map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.accountNumber ? `(${w.accountNumber})` : ''} (Balance: ৳{w.balance.toLocaleString()})
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
              placeholder="e.g. Received via bKash TrxID #91823"
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
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
            >
              {t('submit')} & Print Receipt
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
