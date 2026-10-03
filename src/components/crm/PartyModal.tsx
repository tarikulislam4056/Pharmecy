import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Party, PartyType } from '../../types';
import { X, User, Building, Save, Hash, Sparkles, RotateCcw, AlertCircle, Edit3 } from 'lucide-react';
import { findDuplicatePartySerial } from '../../utils/partyHelpers';

interface PartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyToEdit?: Party | null;
  defaultType?: PartyType;
}

export const PartyModal: React.FC<PartyModalProps> = ({
  isOpen,
  onClose,
  partyToEdit,
  defaultType = 'CUSTOMER',
}) => {
  const { language, parties, addParty, updateParty, showToast, getNextPartySerialNumber } = useApp();
  const { t } = useTranslation(language);

  const [type, setType] = useState<PartyType>(defaultType);
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<string>('50000');
  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [bankDetails, setBankDetails] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (partyToEdit) {
      const pType: PartyType = partyToEdit.type === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER';
      setType(pType);
      setSerialNumber(partyToEdit.serialNumber || getNextPartySerialNumber(pType));
      setName(partyToEdit.name || '');
      setCompanyName(partyToEdit.companyName || '');
      setPhone(partyToEdit.phone || '');
      setEmail(partyToEdit.email || '');
      setAddress(partyToEdit.address || '');
      setCreditLimit(partyToEdit.creditLimit?.toString() || '0');
      setOpeningBalance(partyToEdit.openingBalance?.toString() || '0');
      setBankDetails(partyToEdit.bankDetails || '');
    } else {
      const targetType: PartyType = defaultType === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER';
      setType(targetType);
      setSerialNumber(getNextPartySerialNumber(targetType));
      setName('');
      setCompanyName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCreditLimit('50000');
      setOpeningBalance('0');
      setBankDetails('');
    }
  }, [isOpen, partyToEdit?.id, defaultType]);

  const handleTypeChange = (newType: PartyType) => {
    setType(newType);
    if (!partyToEdit) {
      setSerialNumber(getNextPartySerialNumber(newType));
    }
  };

  const trimmedSerial = serialNumber.trim();
  const duplicateParty = trimmedSerial
    ? findDuplicatePartySerial(trimmedSerial, parties, partyToEdit?.id)
    : null;
  const isDuplicateSerial = Boolean(duplicateParty);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast(language === 'bn' ? 'নাম ও মোবাইল নম্বর প্রদান করুন।' : 'Please enter name and phone number.', 'warning');
      return;
    }

    if (isDuplicateSerial) {
      showToast(
        language === 'bn'
          ? `আগে থেকে এই নং এন্ট্রি আছে! (${trimmedSerial}) ইতিমধ্যে "${duplicateParty?.name}"-এর জন্য ব্যবহৃত। একই নং দুইবার এন্ট্রি হবে না।`
          : `This number is already entered previously! (${trimmedSerial}) Duplicate entry not allowed.`,
        'error'
      );
      return;
    }

    const payload = {
      type,
      serialNumber: trimmedSerial || undefined,
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      openingBalance: parseFloat(openingBalance) || 0,
      creditLimit: parseFloat(creditLimit) || 0,
      bankDetails: bankDetails.trim() || undefined,
      status: 'ACTIVE' as const,
    };

    if (partyToEdit) {
      updateParty(partyToEdit.id, payload);
    } else {
      addParty(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850">
          <div className="flex items-center gap-2">
            {type === 'CUSTOMER' ? (
              <User className="w-5 h-5 text-emerald-600" />
            ) : (
              <Building className="w-5 h-5 text-sky-600" />
            )}
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">
              {partyToEdit
                ? (language === 'bn' ? `${type === 'CUSTOMER' ? 'ক্রেতা' : 'সরবরাহকারী'} সম্পাদনা` : `Edit ${type}`)
                : (language === 'bn' ? `নতুন ${type === 'CUSTOMER' ? 'ক্রেতা' : 'সরবরাহকারী'} যুক্ত করুন` : `New ${type} (Contact New)`)}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Account Type (ধরন) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('CUSTOMER')}
                className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                  type === 'CUSTOMER'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                Customer (ক্রেতা)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('SUPPLIER')}
                className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                  type === 'SUPPLIER'
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                Supplier (মহাজন / সরবরাহকারী)
              </button>
            </div>
          </div>

          {/* Serial Number / Party Code Field */}
          <div className={`p-3 rounded-xl border transition-colors ${
            isDuplicateSerial
              ? 'bg-red-50/80 dark:bg-red-950/30 border-red-300 dark:border-red-800'
              : type === 'CUSTOMER'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/60'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`font-bold text-xs flex items-center gap-1.5 ${
                isDuplicateSerial
                  ? 'text-red-700 dark:text-red-300'
                  : type === 'CUSTOMER' ? 'text-emerald-900 dark:text-emerald-200' : 'text-sky-900 dark:text-sky-200'
              }`}>
                <Hash className="w-3.5 h-3.5" />
                <span>
                  {type === 'CUSTOMER'
                    ? (language === 'bn' ? 'কাস্টমার সিরিয়াল নম্বর (Serial No)' : 'Customer Serial No')
                    : (language === 'bn' ? 'সাপ্লায়ার সিরিয়াল নম্বর (Serial No)' : 'Supplier Serial No')
                  } *
                </span>
              </label>
              
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSerialNumber('')}
                  className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-semibold cursor-pointer transition-colors"
                  title="Clear to type manual serial"
                >
                  {language === 'bn' ? 'ম্যানুয়াল লিখুন' : 'Manual'}
                </button>
                <button
                  type="button"
                  onClick={() => setSerialNumber(getNextPartySerialNumber(type))}
                  className={`text-[10px] text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs cursor-pointer transition-colors ${
                    type === 'CUSTOMER' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                  title="Auto generate next serial number"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{language === 'bn' ? 'অটো সিরিয়াল' : 'Auto S/N'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder={language === 'bn' ? 'যেকোনো সিরিয়াল নং লিখুন (যেমন: 1, 101, CUST-0001)' : 'Enter any serial no (e.g. 1, 101, CUST-0001)'}
                className={`flex-1 py-2 px-3 bg-white dark:bg-zinc-900 border rounded-lg font-mono font-black text-sm tracking-wider shadow-2xs transition-colors ${
                  isDuplicateSerial
                    ? 'border-red-500 text-red-600 dark:text-red-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/40 bg-red-50/40 dark:bg-red-950/20'
                    : 'border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40'
                }`}
              />
              <button
                type="button"
                onClick={() => setSerialNumber(getNextPartySerialNumber(type))}
                className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                  type === 'CUSTOMER'
                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:hover:bg-emerald-900 dark:text-emerald-200'
                    : 'bg-sky-100 hover:bg-sky-200 text-sky-800 dark:bg-sky-900/60 dark:hover:bg-sky-900 dark:text-sky-200'
                }`}
                title={language === 'bn' ? 'স্বয়ংক্রিয় নতুন সিরিয়াল নিন' : 'Get new unique auto serial'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'নতুন নম্বর' : 'New S/N'}</span>
              </button>
            </div>

            {isDuplicateSerial && (
              <div className="mt-2 p-2.5 rounded-lg bg-red-100 dark:bg-red-950/60 border border-red-400 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-bold flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-1.5 flex-1">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="font-black text-[13px] text-red-700 dark:text-red-300">
                      {language === 'bn'
                        ? `⚠️ আগে থেকে এই নং এন্ট্রি আছে!`
                        : `⚠️ This number is already entered previously!`}
                    </p>
                    <p className="text-[11px] font-medium text-red-600 dark:text-red-300">
                      {language === 'bn'
                        ? `"${trimmedSerial}" সিরিয়াল নম্বরটি ইতিমধ্যে "${duplicateParty?.name || 'অন্য রেকর্ড'}"-এর জন্য এন্ট্রি করা আছে। একই নং দুইবার এন্ট্রি হবে না।`
                        : `Serial number "${trimmedSerial}" is already assigned to "${duplicateParty?.name || 'another record'}". Duplicate entry is not allowed.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSerialNumber(getNextPartySerialNumber(type))}
                  className="px-2.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] whitespace-nowrap transition cursor-pointer shadow-xs"
                >
                  {language === 'bn' ? 'অটো সিরিয়াল নিন' : 'Get Auto S/N'}
                </button>
              </div>
            )}

            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              {language === 'bn'
                ? '💡 সিরিয়াল নং আপনি চাইলে মেনুয়ালি যেকোনো সংখ্যা বা কোড লিখতে পারেন। পূর্বে ব্যবহৃত একই সিরিয়াল দুইবার সেভ হবে না।'
                : '💡 You can type any manual serial number or code. Previously entered serials cannot be saved twice.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                {type === 'CUSTOMER' ? 'Customer Name (নাম)' : 'Supplier Contact Person'} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rahim Ahmed"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Company Name (প্রতিষ্ঠানের নাম)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Al-Madina Enterprise"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Phone Number (মোবাইল) *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Email Address (ইমেইল)
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contact@mail.com"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Address (ঠিকানা)
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Shop #12, Stadium Market, Dhaka"
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Opening Balance Due (৳)
              </label>
              <input
                type="number"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Credit Limit (৳)
              </label>
              <input
                type="number"
                value={creditLimit}
                onChange={e => setCreditLimit(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono"
              />
            </div>
          </div>

          {type === 'SUPPLIER' && (
            <div>
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Bank / Routing Details
              </label>
              <input
                type="text"
                value={bankDetails}
                onChange={e => setBankDetails(e.target.value)}
                placeholder="Bank Name, A/C No, Branch"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
              />
            </div>
          )}

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
              className={`px-5 py-2 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5 ${
                type === 'CUSTOMER' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Contact'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
