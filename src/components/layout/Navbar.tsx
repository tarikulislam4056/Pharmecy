import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import {
  Sun,
  Moon,
  Globe,
  RotateCcw,
  Store,
  ChevronDown,
  Bell,
  Search,
  Settings,
  ShoppingBag,
  Receipt,
  Smile,
  LogOut,
  AlertTriangle,
  AlertCircle,
  Cloud,
  RefreshCw,
  CheckCircle2,
  Menu,
  Keyboard,
  Lock,
  Key,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  X,
  UserCheck,
} from 'lucide-react';
import { VoucherSearchModal } from '../common/VoucherSearchModal';
import { isTabAllowed, getFirstAllowedTab } from '../../utils/permissions';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenPaymentInModal?: () => void;
  onOpenKeyboardShortcuts?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenKeyboardShortcuts }) => {
  const {
    language,
    setLanguage,
    theme,
    toggleTheme,
    currentUser,
    users,
    setCurrentUser,
    updateUser,
    showToast,
    activeTab,
    setActiveTab,
    resetToDemoData,
    logout,
    switchUser,
    products,
    installmentSchemes,
    isSyncingWithServer,
    lastServerSyncTime,
    triggerServerPush,
    triggerServerPull,
    triggerSyncNow,
    syncCountdown,
    autoSyncIntervalSeconds,
    isAutoSyncEnabled,
    companySettings,
  } = useApp();

  const { t } = useTranslation(language);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Switch User Modal State (for non-admin users)
  const [showSwitchUserModal, setShowSwitchUserModal] = useState(false);
  const [targetSwitchUserId, setTargetSwitchUserId] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchError, setSwitchError] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Handle switching user
  const handleUserClick = (targetUser: typeof users[0]) => {
    if (targetUser.id === currentUser.id) {
      setShowUserDropdown(false);
      return;
    }

    if (currentUser.role === 'ADMIN') {
      // Admin privilege: direct 1-click switch without password or ID prompt
      switchUser(targetUser.id);
      setShowUserDropdown(false);
    } else {
      // Non-admin user: password verification is required!
      setTargetSwitchUserId(targetUser.id);
      setSwitchPassword('');
      setSwitchError('');
      setShowPasswordText(false);
      setShowUserDropdown(false);
      setShowSwitchUserModal(true);
    }
  };

  const handleSwitchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError('');
    if (!switchPassword.trim()) {
      setSwitchError(language === 'bn' ? 'পাসওয়ার্ড প্রদান করা আবশ্যক।' : 'Password is required.');
      return;
    }
    const success = switchUser(targetSwitchUserId, switchPassword.trim());
    if (success) {
      setShowSwitchUserModal(false);
      setSwitchPassword('');
      setSwitchError('');
    } else {
      setSwitchError(
        language === 'bn'
          ? 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিয়ে পুনরায় চেষ্টা করুন।'
          : 'Incorrect password! Please try again.'
      );
    }
  };

  // Compute alert counts
  const lowStockCount = products.filter(p => p.stock <= p.reorderLevel).length;
  const overdueEmiCount = installmentSchemes.filter(s =>
    s.schedules.some(sched => sched.status === 'OVERDUE' || (sched.status === 'PENDING' && new Date(sched.dueDate) < new Date()))
  ).length;
  const totalAlerts = lowStockCount + overdueEmiCount;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchModalOpen(true);
  };

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard';
      case 'pos':
        return language === 'bn' ? 'পিওএস বিক্রয়' : 'POS Sales';
      case 'daybook':
        return language === 'bn' ? '১. ডে বুক' : '1. Day Book';
      case 'sales-list':
        return language === 'bn' ? '২. বিক্রয় তালিকা' : '2. Sales List';
      case 'sales-returns':
        return language === 'bn' ? 'বিক্রয় ফেরত' : 'Sales Returns';
      case 'purchase-entry':
        return language === 'bn' ? '৩. ক্রয় চালান' : '3. Purchase Entry';
      case 'purchase-list':
        return language === 'bn' ? 'ক্রয় তালিকা' : 'Purchase List';
      case 'installments':
        return language === 'bn' ? '৪. কিস্তি ও ইএমআই' : '4. Installments & EMI';
      case 'products-list':
        return language === 'bn' ? '৫. প্রোডাক্ট তালিকা' : '5. Products List';
      case 'batch-inventory':
        return language === 'bn' ? 'ব্যাচ ইনভেন্টরি' : 'Batch Inventory';
      case 'categories':
        return language === 'bn' ? 'ক্যাটেগরি তালিকা' : 'Categories';
      case 'customers':
        return language === 'bn' ? '৬. কাস্টমার তালিকা' : '6. Customer List';
      case 'suppliers':
        return language === 'bn' ? 'মহাজন তালিকা' : 'Supplier List';
      case 'due-list':
        return language === 'bn' ? '৭. দেনা-পাওনা' : '7. Due List';
      case 'cash-adjustment':
        return language === 'bn' ? '৮. ক্যাশ অ্যাডজাস্ট' : '8. Cash Adjustment';
      case 'utilities':
        return language === 'bn' ? '৯. ইউটিলিটিস' : '9. Utilities';
      case 'reports':
        return language === 'bn' ? '১০. রিপোর্ট' : '10. Reports';
      case 'hr-payroll':
        return language === 'bn' ? '১১. এইচআর ও পে-রোল' : '11. HR & Payroll';
      case 'users':
        return language === 'bn' ? '১২. ইউজার ও রোল' : '12. Users & Roles';
      case 'expenses':
        return language === 'bn' ? '১৩. খরচের হিসাব' : '13. Expense Vouchers';
      case 'wallets':
        return language === 'bn' ? '১৪. ওয়ালেট ও ব্যাংক' : '14. Wallets & Accounts';
      case 'settings':
        return language === 'bn' ? '১৫. কোম্পানি প্রোফাইল' : '15. Settings';
      default:
        return 'Dashboard';
    }
  };

  // Dynamically update browser tab document title & social share meta whenever store/company name or tab changes
  useEffect(() => {
    const storeName = companySettings.name?.trim();
    const tabName = getActiveTabTitle();
    const titleText = storeName ? `${storeName} | ${tabName}` : `DokanPro ERP | ${tabName}`;
    document.title = titleText;

    try {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', titleText);
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute('content', titleText);
      const metaTitle = document.querySelector('meta[name="title"]');
      if (metaTitle) metaTitle.setAttribute('content', titleText);
    } catch {}
  }, [companySettings.name, activeTab, language]);

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between transition-colors shadow-2xs">
      {/* Left: Mobile trigger & Active Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          {companySettings.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt={companySettings.name || 'Store Logo'}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-contain bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="h-7 w-7 sm:h-8 sm:w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-2xs shrink-0 uppercase">
              {(companySettings.name || 'DokanPro').trim()[0] || 'D'}
            </div>
          )}
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                {companySettings.name || getActiveTabTitle()}
              </h1>
              {companySettings.name && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                  {getActiveTabTitle()}
                </span>
              )}
            </div>
            {companySettings.nameBn && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate leading-none mt-0.5">
                {companySettings.nameBn}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: Purchase button (Purple), Sales button (Blue), Quick Icons & User */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        
        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={() => setIsSearchModalOpen(true)}
          className="xl:hidden p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title="Search Voucher / Invoice"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Search Input (Desktop) */}
        <form onSubmit={handleSearchSubmit} className="relative hidden xl:block mr-1">
          <button
            type="submit"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 cursor-pointer"
            title="Search Voucher / Ref"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setIsSearchModalOpen(true);
              }
            }}
            placeholder={language === 'bn' ? 'Ticket, Serial/IMEI, Invoice বা Voucher...' : 'Search Ticket, Serial/IMEI, Invoice...'}
            className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs w-36 lg:w-48 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all cursor-text"
          />
        </form>

        {/* Purchase Pill Button (Purple) */}
        {isTabAllowed(currentUser, 'purchase-entry') && (
          <button
            type="button"
            onClick={() => setActiveTab('purchase-entry')}
            className="bg-[#8A7CFA] hover:bg-[#7868F7] active:bg-[#6856E8] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>{language === 'bn' ? 'নতুন ক্রয়' : 'New Purchase'}</span>
          </button>
        )}

        {/* Sales Pill Button (Cyan/Blue) */}
        {isTabAllowed(currentUser, 'pos') && (
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className="bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span>{language === 'bn' ? 'নতুন বিক্রয়' : 'New Sales'}</span>
          </button>
        )}

        {/* Keyboard Shortcuts Button */}
        <button
          type="button"
          onClick={onOpenKeyboardShortcuts}
          className="hidden sm:flex items-center gap-1 p-2 text-slate-500 hover:text-[#8572FF] dark:text-slate-400 dark:hover:text-[#8572FF] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Keyboard Shortcuts Guide (Shift + ?)"
        >
          <Keyboard className="w-4 h-4" />
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 hidden lg:inline">
            Shift+?
          </span>
        </button>

        {/* Feedback / Support Icon */}
        {isTabAllowed(currentUser, 'settings') && (
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="hidden md:flex p-2 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Support & Feedback"
          >
            <Smile className="w-4 h-4" />
          </button>
        )}

        {/* Settings Icon */}
        {isTabAllowed(currentUser, 'settings') && (
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="hidden md:flex p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Cloud Auto-Sync & Live SQL Save Status */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => triggerSyncNow()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
              isAutoSyncEnabled
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 border-emerald-200 dark:border-emerald-800 shadow-xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
            title={
              language === 'bn'
                ? 'লাইভ অটো-সেভ সক্রিয়: যেকোনো এন্ট্রি সাথে সাথে SQL ও সার্ভারে অটো জমা হয়। ম্যানুয়াল সিঙ্ক করতে ক্লিক করুন।'
                : 'Live Auto-Save Active: All entries automatically save to SQL & server. Click to sync manually.'
            }
          >
            {isSyncingWithServer ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="hidden sm:inline text-[11px] font-medium">
              {isSyncingWithServer
                ? (language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing...')
                : (language === 'bn' ? 'অটো সেভ চালু' : 'Live Auto-Save')}
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </div>

        {/* Language Switcher (BN/EN) */}
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="px-2 sm:px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
          title="Switch Language"
        >
          <Globe className="w-3 h-3 text-slate-400" />
          <span>{language === 'en' ? 'BN' : 'EN'}</span>
        </button>

        {/* User Profile Avatar with dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer"
            aria-label="User Profile Menu"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-linear-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
              {currentUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) || 'TH'}
            </div>
          </button>

          {showUserDropdown && (
            <div
              className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
              onClick={() => setShowUserDropdown(false)}
            >
              <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white truncate">{currentUser.fullName}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-md font-bold text-[10px]">
                  Role: {currentUser.role}
                </span>
              </div>

              {/* Low Stock Notification Settings Section */}
              <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50" onClick={e => e.stopPropagation()}>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1.5 flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  <span>{language === 'bn' ? 'স্টক নোটিফিকেশন অ্যালার্ট' : 'Low Stock Alerts'}</span>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded transition-colors">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {language === 'bn' ? 'ইমেল অ্যালার্ট' : 'Email Alerts'}
                    </span>
                    <input
                      type="checkbox"
                      checked={!!currentUser.lowStockEmailAlerts}
                      onChange={e => {
                        const val = e.target.checked;
                        updateUser(currentUser.id, { lowStockEmailAlerts: val });
                        setCurrentUser({ ...currentUser, lowStockEmailAlerts: val });
                        showToast(
                          language === 'bn'
                            ? (val ? 'ইমেল স্টক অ্যালার্ট চালু করা হয়েছে' : 'ইমেল স্টক অ্যালার্ট বন্ধ করা হয়েছে')
                            : (val ? 'Email stock alerts enabled' : 'Email stock alerts disabled'),
                          'success'
                        );
                      }}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded transition-colors">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {language === 'bn' ? 'এসএমএস অ্যালার্ট' : 'SMS Alerts'}
                    </span>
                    <input
                      type="checkbox"
                      checked={!!currentUser.lowStockSmsAlerts}
                      onChange={e => {
                        const val = e.target.checked;
                        updateUser(currentUser.id, { lowStockSmsAlerts: val });
                        setCurrentUser({ ...currentUser, lowStockSmsAlerts: val });
                        showToast(
                          language === 'bn'
                            ? (val ? 'এসএমএস স্টক অ্যালার্ট চালু করা হয়েছে' : 'এসএমএস স্টক অ্যালার্ট বন্ধ করা হয়েছে')
                            : (val ? 'SMS stock alerts enabled' : 'SMS stock alerts disabled'),
                          'success'
                        );
                      }}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                  {language === 'bn'
                    ? 'স্টক ন্যূনতম সীমার নিচে নামলে নোটিফিকেশন।'
                    : 'Alerts when stock falls below minimum level.'}
                </p>
              </div>

              <div className="py-1">
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>{language === 'bn' ? 'অ্যাকাউন্ট পরিবর্তন' : 'Switch Active User'}</span>
                  {currentUser.role === 'ADMIN' ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                      {language === 'bn' ? 'এডমিন (সরাসরি)' : 'Admin (1-Click)'}
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      {language === 'bn' ? 'পাসওয়ার্ড আবশ্যক' : 'Password Req'}
                    </span>
                  )}
                </div>
                {users.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleUserClick(u)}
                    className={`w-full text-left px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                      u.id === currentUser.id
                        ? 'font-bold text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className="truncate">{u.fullName}</span>
                      {u.id === currentUser.id && (
                        <span className="text-[9px] px-1 bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded font-bold shrink-0">
                          {language === 'bn' ? 'বর্তমান' : 'Active'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">({u.role})</span>
                      {currentUser.role !== 'ADMIN' && u.id !== currentUser.id && (
                        <Lock className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('settings')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    setShowResetConfirmModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'সকল ডাটা মুছুন' : 'Reset All Data'}</span>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full text-left px-3.5 py-2 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'লগআউট (Log Out)' : 'Log Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Voucher Search Modal */}
      <VoucherSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        initialQuery={searchQuery}
      />

      {/* Switch User Verification Modal (for Non-Admin users) */}
      {showSwitchUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'bn' ? 'ইউজার পরিবর্তন (লগইন পাসওয়ার্ড যাচাই)' : 'Switch User Authentication'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'bn' ? 'অন্য অ্যাকাউন্টে প্রবেশ করতে পাসওয়ার্ড প্রদান করুন' : 'Enter credentials to switch account'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSwitchUserModal(false);
                  setSwitchPassword('');
                  setSwitchError('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {language === 'bn'
                  ? 'নিরাপত্তা নীতি: এডমিন ব্যতীত অন্য যেকোনো ইউজার হিসেবে লগইন করার সময় সংশ্লিষ্ট অ্যাকাউন্টের পাসওয়ার্ড দিয়ে যাচাই করা বাধ্যতামূলক।'
                  : 'Security Policy: Non-admin users must enter the valid password of the target account to switch.'}
              </span>
            </div>

            {switchError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{switchError}</span>
              </div>
            )}

            <form onSubmit={handleSwitchSubmit} className="space-y-4 pt-1">
              {/* Target User Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'bn' ? 'যে আইডিতে সুইচ করবেন (Target Account)' : 'Target User Account'}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={targetSwitchUserId}
                    onChange={e => {
                      setTargetSwitchUserId(e.target.value);
                      setSwitchError('');
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {u.fullName} (@{u.username}) — [{u.role}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'bn' ? 'অ্যাকাউন্টের পাসওয়ার্ড (Password)' : 'Account Password'}
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={switchPassword}
                    onChange={e => {
                      setSwitchPassword(e.target.value);
                      setSwitchError('');
                    }}
                    autoFocus
                    placeholder={language === 'bn' ? 'পাসওয়ার্ড লিখুন...' : 'Enter password...'}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowSwitchUserModal(false);
                    setSwitchPassword('');
                    setSwitchError('');
                  }}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'bn' ? 'লগইন ও সুইচ করুন' : 'Verify & Switch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'bn' ? 'সকল ডাটা মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Reset All Data'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'bn'
                ? 'আপনি কি নিশ্চিত যে সিস্টেমের সমস্ত প্রোডাক্ট, বিক্রয় ইনভয়েস, ক্রয় চালান, কাস্টমার ও মহাজন তথ্য এবং ক্যাশ হিসেব সম্পূর্ণ মুছে সিস্টেম ফাঁকা করতে চান? এই কাজ পরবর্তীতে আর ফিরে পাওয়া সম্ভব নয়।'
                : 'Are you sure you want to permanently clear and reset all products, sales, purchases, customer ledgers, and cash transaction records? This action cannot be undone.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                {language === 'bn' ? 'বাতিল করুন (Cancel)' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetToDemoData();
                  setShowResetConfirmModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{language === 'bn' ? 'হ্যাঁ, সমস্ত ডাটা মুছুন (Reset Now)' : 'Yes, Reset All Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

