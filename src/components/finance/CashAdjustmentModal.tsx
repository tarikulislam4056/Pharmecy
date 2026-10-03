import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { X, Sliders, DollarSign, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface CashAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashAdjustmentModal: React.FC<CashAdjustmentModalProps> = ({ isOpen, onClose }) => {
  const { language, wallets, adjustCash, showToast } = useApp();
  const { t } = useTranslation(language);

  const [type, setType] = useState<'ADD' | 'WITHDRAW'>('ADD');
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('Owner initial capital investment');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      showToast(language === 'bn' ? 'সঠিক টাকার পরিমাণ দিন!' : 'Please enter valid cash amount!', 'warning');
      return;
    }

    adjustCash({
      walletId,
      type,
      amount: numAmount,
      reason: reason.trim() || (type === 'ADD' ? 'Capital injection' : 'Owner drawing'),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">
              {t('cash_adjustment')}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Adjustment Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('ADD');
                  setReason('Owner capital injection');
                }}
                className={`py-2 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                  type === 'ADD'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-zinc-50 dark:bg-zinc-850 text-zinc-600 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Add Cash (মালিকের মূলধন জমা)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('WITHDRAW');
                  setReason('Owner personal drawing');
                }}
                className={`py-2 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                  type === 'WITHDRAW'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-zinc-50 dark:bg-zinc-850 text-zinc-600 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Withdraw (মালিকের উত্তোলন)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Target Wallet / Account *
            </label>
            <select
              value={walletId}
              onChange={e => setWalletId(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} (Current: ৳{w.balance.toLocaleString()})
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
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold text-sm"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Reason / Source Description
              </label>
            </div>
            <div className="flex flex-wrap gap-1 mb-1.5">
              <button
                type="button"
                onClick={() => setReason('দৈনিক বিক্রয় (Daily Sales)')}
                className="text-[10px] bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded font-bold cursor-pointer"
              >
                + দৈনিক বিক্রয় (Daily Sales)
              </button>
              <button
                type="button"
                onClick={() => setReason('Owner capital injection')}
                className="text-[10px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-semibold cursor-pointer"
              >
                Capital Injection
              </button>
              <button
                type="button"
                onClick={() => setReason('Extra cash adjustment')}
                className="text-[10px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded font-semibold cursor-pointer"
              >
                Extra Cash
              </button>
            </div>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
            >
              Confirm Cash Adjustment
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
