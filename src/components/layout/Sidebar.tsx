import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { getCustomerTotalDue } from '../../utils/dueHelpers';
import { ViewTab, PartyType, InstallmentSubTab } from '../../types';
import { getDashboardTheme } from '../../utils/brandTheme';
import { ReportKind } from '../reports/ReportsView';
import {
  hasPermission,
  hasAnyPermission,
  isTabAllowed,
} from '../../utils/permissions';
import {
  LayoutDashboard,
  BookOpen,
  Receipt,
  Truck,
  Package,
  Users,
  CreditCard,
  Sliders,
  DollarSign,
  Wallet as WalletIcon,
  UserCheck,
  Settings,
  BarChart3,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Plus,
  Pill,
  Search,
  Stethoscope,
  X,
  Code2,
  Phone,
  MapPin,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  onOpenPaymentIn?: (partyId?: string) => void;
  onOpenPaymentOut?: (supplierId?: string) => void;
  onOpenAddProduct?: () => void;
  onOpenAddParty?: (type: PartyType) => void;
  onOpenExpenseModal?: () => void;
  onOpenCashAdjustModal?: (type?: 'CASH_ADD' | 'CASH_WITHDRAW') => void;
  onOpenCategoryModal?: () => void;
  onSelectReportType?: (type: ReportKind) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onOpenPaymentIn,
  onOpenPaymentOut,
  onOpenAddProduct,
  onOpenAddParty,
  onOpenExpenseModal,
  onOpenCashAdjustModal,
  onSelectReportType,
}) => {
  const {
    activeTab,
    setActiveTab,
    language,
    setLanguage,
    currentUser,
    products,
    installmentSchemes,
    parties,
    employees,
    deletedSaleInvoices,
    deletedPurchaseInvoices,
    setActiveHrSubTab,
    activeInstallmentSubTab,
    setActiveInstallmentSubTab,
    companySettings,
  } = useApp();
  const { t } = useTranslation(language);

  const sidebarTheme = getDashboardTheme(
    companySettings.sidebarColorTheme || companySettings.dashboardColorTheme || 'INDIGO',
    companySettings.sidebarCustomColor
  );

  // Compute counts
  const lowStockCount = products.filter(p => p.stock <= p.reorderLevel).length;
  const customerDueCount = parties.filter(p => p.type === 'CUSTOMER' && p.currentBalance > 0).length;
  const activeEmiCount = installmentSchemes.filter(s => s.status === 'ACTIVE').length;
  const staffCount = employees.length;
  const activeStaffCount = employees.filter(e => e.status === 'ACTIVE').length;
  const resignedStaffCount = employees.filter(e => e.status === 'RESIGNED' || e.status === 'ON_LEAVE').length;
  const medicineCount = products.filter(
    p => p.categoryId === 'cat-medicine' ||
         p.categoryName?.toLowerCase().includes('medicine') ||
         p.categoryName?.toLowerCase().includes('ঔষধ') ||
         p.generic ||
         p.dosageForm
  ).length;

  // Single active expanded section: ONLY the clicked button opens
  const [expandedSection, setExpandedSection] = useState<string | null>(() => {
    if (activeTab === 'pos' || activeTab === 'sales-list' || activeTab === 'sales-returns' || activeTab === 'quotations' || activeTab === 'deleted-invoices') return 'sale';
    if (activeTab === 'purchase-entry' || activeTab === 'purchase-list' || activeTab === 'purchase-orders' || activeTab === 'purchase-returns' || activeTab === 'deleted-purchases') return 'purchase';
    if (activeTab === 'installments') return 'installments';
    if (activeTab === 'products-list' || activeTab === 'batch-inventory' || activeTab === 'categories' || activeTab === 'warranties') return 'products';
    if (activeTab === 'medicine') return 'medicine';
    if (activeTab === 'customers' || activeTab === 'suppliers') return 'parties';
    if (activeTab === 'cash-adjustment') return 'cashAdjust';
    if (activeTab === 'utilities') return 'utilities';
    if (activeTab === 'reports') return 'reports';
    if (activeTab === 'hr-payroll') return 'hr';
    if (activeTab === 'users') return 'users';
    if (activeTab === 'expenses') return 'expenses';
    if (activeTab === 'wallets') return 'wallets';
    return 'sale';
  });

  const toggleSection = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedSection(prev => (prev === key ? null : key));
  };

  const handleHeaderClick = (key: string, defaultTab: ViewTab) => {
    // Open only this clicked button's section
    setExpandedSection(prev => (prev === key ? null : key));
    if (isTabAllowed(currentUser, defaultTab)) {
      handleSelectTab(defaultTab);
    }
  };

  const handleSelectTab = (tab: ViewTab) => {
    if (!isTabAllowed(currentUser, tab)) {
      return;
    }
    setActiveTab(tab);
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleHrSubClick = (subTab: 'employees' | 'resigned' | 'advance' | 'payroll') => {
    if (!hasPermission(currentUser, 'HR_PAYROLL')) return;
    setActiveHrSubTab(subTab);
    handleSelectTab('hr-payroll');
  };

  const handleInstallmentSubClick = (subTab: InstallmentSubTab) => {
    if (!hasPermission(currentUser, 'INSTALLMENTS')) return;
    setActiveInstallmentSubTab(subTab);
    handleSelectTab('installments');
  };

  const handleSubReportClick = (reportKind: ReportKind) => {
    if (!hasPermission(currentUser, 'REPORTS')) return;
    setActiveTab('reports');
    if (onSelectReportType) {
      onSelectReportType(reportKind);
    }
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-2xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Modern Enterprise Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-76 sm:w-84 h-full max-h-screen flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between py-2 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarTheme.isCustom && (
          <style>{`
            .custom-sidebar-active {
              background-color: ${sidebarTheme.primaryHex}22 !important;
              color: ${sidebarTheme.primaryHex} !important;
            }
            .custom-sidebar-active:hover {
              background-color: ${sidebarTheme.primaryHex}38 !important;
            }
            .custom-sidebar-hover:hover {
              background-color: ${sidebarTheme.primaryHex}18 !important;
              color: ${sidebarTheme.primaryHex} !important;
            }
            .custom-sidebar-icon {
              color: ${sidebarTheme.primaryHex} !important;
            }
          `}</style>
        )}
        {/* Brand Header */}
        <div className="px-3 pb-1 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div
              onClick={() => handleSelectTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer select-none max-w-[240px]"
            >
              {companySettings.logoUrl ? (
                <img
                  src={companySettings.logoUrl}
                  alt={companySettings.name || 'Store Logo'}
                  className="h-9 w-9 rounded-lg object-contain bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-base shadow-xs shrink-0 uppercase">
                  {(companySettings.name || 'DokanPro').trim()[0] || 'D'}
                </div>
              )}
              <div className="truncate min-w-0">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight block truncate" title={companySettings.name || 'DokanPro ERP'}>
                  {companySettings.name || 'DokanPro ERP'}
                </span>
                <span className="text-xs text-slate-400 font-medium block truncate" title={companySettings.nameBn || companySettings.slogan || (language === 'bn' ? 'দোকান ও ব্যবসা ম্যানেজমেন্ট' : 'Enterprise Management')}>
                  {companySettings.nameBn || companySettings.slogan || (language === 'bn' ? 'দোকান ও ব্যবসা ম্যানেজমেন্ট' : 'Enterprise Management')}
                </span>
              </div>
            </div>

            {/* Mobile close */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 space-y-1.5 overscroll-contain pr-1.5 focus:outline-none">
          
          {/* Dashboard */}
          {isTabAllowed(currentUser, 'dashboard') && (
            <button
              type="button"
              onClick={() => handleSelectTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[18px] sm:text-[19px] font-bold rounded-xl transition-colors cursor-pointer text-left ${
                activeTab === 'dashboard'
                  ? sidebarTheme.activeBg
                  : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
              }`}
            >
              <LayoutDashboard className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
              <span>{t('dashboard')}</span>
            </button>
          )}

          {/* 1. DAY BOOK (TRANSACTION) */}
          {hasPermission(currentUser, 'FINANCE_CASH') && (
            <button
              type="button"
              onClick={() => handleSelectTab('daybook')}
              className={`w-full flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold rounded-xl transition-colors cursor-pointer text-left ${
                activeTab === 'daybook'
                  ? sidebarTheme.activeBg
                  : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                <span>{language === 'bn' ? 'ডে বুক (লেনদেন খতিয়ান)' : 'Day Book (Transaction)'}</span>
              </div>
            </button>
          )}

          {/* 2. SALE */}
          {hasAnyPermission(currentUser, ['POS_ACCESS', 'SALES_MANAGEMENT']) && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
              <div
                onClick={() => handleHeaderClick('sale', hasPermission(currentUser, 'SALES_MANAGEMENT') ? 'sales-list' : 'pos')}
                className={`flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'sales-list' || activeTab === 'pos' || activeTab === 'sales-returns'
                    ? sidebarTheme.activeBg
                    : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                  <span>{language === 'bn' ? 'বিক্রয় (Sale)' : 'Sale'}</span>
                </div>
                <button
                  type="button"
                  onClick={e => toggleSection('sale', e)}
                  className={`p-0.5 rounded cursor-pointer transition-colors ${sidebarTheme.sidebarHover}`}
                >
                  {expandedSection === 'sale' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
              </div>

              {expandedSection === 'sale' && (
                <div className="pl-5 pr-2 py-1 space-y-1 border-t border-slate-100 dark:border-slate-800/60 text-[16.5px] sm:text-[17px]">
                  {hasPermission(currentUser, 'POS_ACCESS') && (
                    <button
                      type="button"
                      onClick={() => handleSelectTab('pos')}
                      className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                        activeTab === 'pos' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                      }`}
                    >
                      <span className="flex items-center gap-1.5">{language === 'bn' ? 'নতুন বিক্রয় (New Sale)' : 'New Sale'}</span>
                      <Plus className={`w-4 h-4 ${sidebarTheme.iconColor} shrink-0`} />
                    </button>
                  )}
                  {hasPermission(currentUser, 'SALES_MANAGEMENT') && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('sales-list')}
                        className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                          activeTab === 'sales-list' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                        }`}
                      >
                        <span>{language === 'bn' ? 'বিক্রয় তালিকা (Sales List)' : 'Sales List'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('quotations')}
                        className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                          activeTab === 'quotations' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                        }`}
                      >
                        <span>{language === 'bn' ? 'প্রাইস কোটেশন (Quotation)' : 'Price Quotation'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('sales-returns')}
                        className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                          activeTab === 'sales-returns' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                        }`}
                      >
                        <span>{language === 'bn' ? 'বিক্রয় ফেরত (Sales Returns)' : 'Sales Returns'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('deleted-invoices')}
                        className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                          activeTab === 'deleted-invoices' ? 'text-rose-600 font-bold bg-rose-50/70 dark:bg-rose-950/40' : 'text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                          {language === 'bn' ? 'ডিলিট ইনভয়েজ (Delete Invoice)' : 'Delete Invoice Archive'}
                        </span>
                        {deletedSaleInvoices.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-full text-xs font-mono font-extrabold">
                            {deletedSaleInvoices.length}
                          </span>
                        )}
                      </button>
                    </>
                  )}
                  {hasAnyPermission(currentUser, ['POS_ACCESS', 'SALES_MANAGEMENT', 'PARTIES_LEDGER']) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenPaymentIn) onOpenPaymentIn();
                        else if (hasPermission(currentUser, 'SALES_MANAGEMENT')) handleSelectTab('sales-list');
                        else handleSelectTab('pos');
                      }}
                      className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">{language === 'bn' ? 'টাকা গ্রহণ (Payment In)' : 'Payment In'}</span>
                      <Plus className="w-4 h-4 shrink-0" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. PURCHASE */}
          {hasPermission(currentUser, 'PURCHASE_MANAGEMENT') && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
              <div
                onClick={() => handleHeaderClick('purchase', 'purchase-list')}
                className={`flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'purchase-entry' || activeTab === 'purchase-list' || activeTab === 'purchase-orders' || activeTab === 'purchase-returns' || activeTab === 'deleted-purchases'
                    ? sidebarTheme.activeBg
                    : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Truck className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                  <span>{language === 'bn' ? 'ক্রয় (Purchase)' : 'Purchase'}</span>
                </div>
                <button
                  type="button"
                  onClick={e => toggleSection('purchase', e)}
                  className={`p-0.5 rounded cursor-pointer transition-colors ${sidebarTheme.sidebarHover}`}
                >
                  {expandedSection === 'purchase' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
              </div>

              {expandedSection === 'purchase' && (
                <div className="pl-5 pr-2 py-1 space-y-1 border-t border-slate-100 dark:border-slate-800/60 text-[16.5px] sm:text-[17px]">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('purchase-list')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'purchase-list' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                    }`}
                  >
                    <span>{language === 'bn' ? 'ক্রয় তালিকা (Purchase List)' : 'Purchase List'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('purchase-entry')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'purchase-entry' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                    }`}
                  >
                    <span>{language === 'bn' ? 'নতুন ক্রয় চালান (Purchase Entry)' : 'New Purchase Entry'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('purchase-orders')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'purchase-orders' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                    }`}
                  >
                    <span>{language === 'bn' ? 'ক্রয় আদেশ (Purchase Orders)' : 'Purchase Orders'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('purchase-returns')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'purchase-returns' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                    }`}
                  >
                    <span>{language === 'bn' ? 'ক্রয় ফেরত (Purchase Returns)' : 'Purchase Returns'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('deleted-purchases')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'deleted-purchases' ? 'text-rose-600 font-bold bg-rose-50/70 dark:bg-rose-950/40' : 'text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                      {language === 'bn' ? 'ডিলিট ক্রয় (Delete Purchase)' : 'Delete Purchase Archive'}
                    </span>
                    {deletedPurchaseInvoices.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-full text-xs font-mono font-extrabold">
                        {deletedPurchaseInvoices.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenPaymentOut) onOpenPaymentOut();
                      else handleSelectTab('purchase-list');
                    }}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">{language === 'bn' ? 'মহাজন পরিশোধ (Payment Out)' : 'Payment Out'}</span>
                    <Plus className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. INSTALLMENT SALES & EMI MANAGEMENT */}
          {hasPermission(currentUser, 'INSTALLMENTS') && (
            <button
              type="button"
              onClick={() => handleSelectTab('installments')}
              className={`w-full flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold rounded-xl transition-colors cursor-pointer text-left ${
                activeTab === 'installments'
                  ? sidebarTheme.activeBg
                  : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CalendarCheck className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                <span className="truncate">{language === 'bn' ? 'কিস্তি ও ইএমআই (EMI)' : 'Installment & EMI'}</span>
              </div>
              {activeEmiCount > 0 && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-md font-mono font-bold">
                  {activeEmiCount}
                </span>
              )}
            </button>
          )}

          {/* 5. PRODUCTS */}
          {hasPermission(currentUser, 'PRODUCTS_INVENTORY') && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
              <div
                onClick={() => handleHeaderClick('products', 'products-list')}
                className={`flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'products-list' || activeTab === 'categories' || activeTab === 'batch-inventory' || activeTab === 'warranties'
                    ? sidebarTheme.activeBg
                    : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                  <span>{language === 'bn' ? 'প্রোডাক্টস (Products)' : 'Products'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {lowStockCount > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-amber-500 text-white dark:bg-amber-600 font-extrabold rounded-full flex items-center gap-1 animate-pulse shadow-2xs" title={`${lowStockCount} items low stock`}>
                      <span>⚠️</span>
                      <span>{lowStockCount}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={e => toggleSection('products', e)}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${sidebarTheme.sidebarHover}`}
                  >
                    {expandedSection === 'products' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  </button>
                </div>
              </div>

              {expandedSection === 'products' && (
                <div className="pl-5 pr-2 py-1 space-y-1 border-t border-slate-100 dark:border-slate-800/60 text-[16.5px] sm:text-[17px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAddProduct) onOpenAddProduct();
                      else handleSelectTab('products-list');
                    }}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-left transition-colors cursor-pointer"
                  >
                    <span className="truncate">{language === 'bn' ? 'নতুন প্রোডাক্ট (Products New)' : 'Products New (Add)'}</span>
                    <Plus className="w-4 h-4 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('products-list')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'products-list' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                    }`}
                  >
                    <span>{language === 'bn' ? 'প্রোডাক্ট তালিকা (Products List)' : 'Products List'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('batch-inventory')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'batch-inventory' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                    }`}
                  >
                    <span>{language === 'bn' ? 'ব্যাচ ইনভেন্টরি (Batch Inventory)' : 'Batch Inventory'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('categories')}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 text-left transition-colors cursor-pointer ${sidebarTheme.sidebarHover}"
                  >
                    <span>{language === 'bn' ? 'নতুন ক্যাটেগরি (Category New)' : 'Category New'}</span>
                    <Plus className="w-4 h-4 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('categories')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'categories' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                    }`}
                  >
                    <span>{language === 'bn' ? 'ক্যাটেগরি তালিকা (Category List)' : 'Category List'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('warranties')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'warranties' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                      {language === 'bn' ? 'ওয়ারেন্টি ম্যানেজমেন্ট (Warranty Mgmt)' : 'Warranty Management'}
                    </span>
                    <ShieldAlert className="w-4 h-4 text-indigo-500 shrink-0" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MEDICINE */}
          {isTabAllowed(currentUser, 'medicine') && (
            <button
              type="button"
              onClick={() => handleSelectTab('medicine')}
              className={`w-full flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold rounded-xl transition-colors cursor-pointer text-left ${
                activeTab === 'medicine'
                  ? sidebarTheme.activeBg
                  : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Pill className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                <span>{language === 'bn' ? 'মেডিসিন (Medicine)' : 'Medicine'}</span>
              </div>
            </button>
          )}

          {/* 6. CUSTOMER & SUPPLIER */}
          {hasPermission(currentUser, 'PARTIES_LEDGER') && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
              <div
                onClick={() => handleHeaderClick('parties', 'customers')}
                className={`flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'customers' || activeTab === 'suppliers'
                    ? sidebarTheme.activeBg
                    : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                  <span className="truncate">{language === 'bn' ? 'কাস্টমার ও মহাজন' : 'Customer & Supplier'}</span>
                </div>
                <button
                  type="button"
                  onClick={e => toggleSection('parties', e)}
                  className={`p-0.5 rounded cursor-pointer transition-colors ${sidebarTheme.sidebarHover}`}
                >
                  {expandedSection === 'parties' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
              </div>

              {expandedSection === 'parties' && (
                <div className="pl-5 pr-2 py-1 space-y-1 border-t border-slate-100 dark:border-slate-800/60 text-[16.5px] sm:text-[17px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAddParty) onOpenAddParty('CUSTOMER');
                      else handleSelectTab('customers');
                    }}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-colors cursor-pointer"
                  >
                    <span>{language === 'bn' ? 'নতুন কাস্টমার/মহাজন যোগ' : 'Customer & Supplier New'}</span>
                    <Plus className="w-4 h-4 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('customers')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'customers' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                    }`}
                  >
                    <span>{language === 'bn' ? 'কাস্টমার তালিকা (Customer List)' : 'Customer List'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('suppliers')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-left transition-colors cursor-pointer ${
                      activeTab === 'suppliers' ? `${sidebarTheme.activeBg} font-bold` : `text-slate-700 dark:text-slate-300 transition-colors ${sidebarTheme.sidebarHover}`
                    }`}
                  >
                    <span>{language === 'bn' ? 'মহাজন তালিকা (Supplier List)' : 'Supplier List'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 7. DUE LIST */}
          {hasAnyPermission(currentUser, ['PARTIES_LEDGER', 'SALES_MANAGEMENT']) && (
            <button
              type="button"
              onClick={() => handleSelectTab('due-list')}
              className={`w-full flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold rounded-xl transition-colors cursor-pointer text-left ${
                activeTab === 'due-list'
                  ? sidebarTheme.activeBg
                  : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                <span>{language === 'bn' ? 'বাকি / দেনা-পাওনা (Due List)' : 'Due List'}</span>
              </div>
              {customerDueCount > 0 && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 font-bold rounded-md">
                  {customerDueCount}
                </span>
              )}
            </button>
          )}

          {/* 8. CASH ADJUSTMENT */}
          {hasPermission(currentUser, 'FINANCE_CASH') && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
              <div
                onClick={() => handleHeaderClick('cashAdjust', 'cash-adjustment')}
                className={`flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'cash-adjustment'
                    ? sidebarTheme.activeBg
                    : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                  <span className="truncate">{language === 'bn' ? 'ক্যাশ অ্যাডজাস্টমেন্ট' : 'Cash Adjustment'}</span>
                </div>
                <button
                  type="button"
                  onClick={e => toggleSection('cashAdjust', e)}
                  className={`p-0.5 rounded cursor-pointer transition-colors ${sidebarTheme.sidebarHover}`}
                >
                  {expandedSection === 'cashAdjust' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
              </div>

              {expandedSection === 'cashAdjust' && (
                <div className="pl-5 pr-2 py-1 space-y-1 border-t border-slate-100 dark:border-slate-800/60 text-[16.5px] sm:text-[17px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenCashAdjustModal) onOpenCashAdjustModal('CASH_ADD');
                      else handleSelectTab('cash-adjustment');
                    }}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-colors cursor-pointer"
                  >
                    <span>{language === 'bn' ? 'ক্যাশ জমা (Cash Add)' : 'Cash Add (+)'}</span>
                    <Plus className="w-4 h-4 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenCashAdjustModal) onOpenCashAdjustModal('CASH_WITHDRAW');
                      else handleSelectTab('cash-adjustment');
                    }}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-left transition-colors cursor-pointer"
                  >
                    <span>{language === 'bn' ? 'ক্যাশ উত্তোলন (Cash Withdrawal)' : 'Cash Withdrawal (-)'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 10. REPORT (8 Sub-reports) */}
          {hasPermission(currentUser, 'REPORTS') && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
              <div
                onClick={() => handleHeaderClick('reports', 'reports')}
                className={`flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'reports'
                    ? sidebarTheme.activeBg
                    : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                  <span>{language === 'bn' ? 'রিপোর্ট (Reports)' : 'Report'}</span>
                </div>
                <button
                  type="button"
                  onClick={e => toggleSection('reports', e)}
                  className={`p-0.5 rounded cursor-pointer transition-colors ${sidebarTheme.sidebarHover}`}
                >
                  {expandedSection === 'reports' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
              </div>

              {expandedSection === 'reports' && (
                <div className="pl-5 pr-2 py-1 space-y-1 border-t border-slate-100 dark:border-slate-800/60 text-[16.5px] sm:text-[17px]">
                  <button
                    type="button"
                    onClick={() => handleSubReportClick('summary')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer truncate"
                  >
                    {language === 'bn' ? 'স্টক সামারি' : 'Product & Stock Summary'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubReportClick('low-stock')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-amber-950/40 transition-colors cursor-pointer truncate flex items-center gap-1"
                  >
                    <span>⚠️</span>
                    <span>{language === 'bn' ? 'স্টক অ্যালার্ট রিপোর্ট' : 'Low Stock Report'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubReportClick('batch-report')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer truncate flex items-center gap-1"
                  >
                    <span>{language === 'bn' ? '📦 ব্যাচ ও মেয়াদ রিপোর্ট' : '📦 Batch & Expiry Report'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubReportClick('ledger')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer truncate"
                  >
                    {language === 'bn' ? 'আইটেম লেজার' : 'Item Details & Ledger'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubReportClick('item-sales')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer truncate"
                  >
                    Item Wise Sales Report
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubReportClick('item-purchase')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer truncate"
                  >
                    Item Wise Purchase Report
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubReportClick('pnl')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer truncate"
                  >
                    Item Profit &amp; Loss
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubReportClick('party-ledger')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer truncate"
                  >
                    By Party Item &amp; Transaction
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 11. HR & PAYROLL MANAGEMENT */}
          {hasPermission(currentUser, 'HR_PAYROLL') && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
              <div
                onClick={() => handleHeaderClick('hr', 'hr-payroll')}
                className={`flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'hr-payroll'
                    ? sidebarTheme.activeBg
                    : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                  <span className="truncate">{language === 'bn' ? 'এইচআর ও পে-রোল' : 'HR & Payroll'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-bold rounded-md">
                    {staffCount}
                  </span>
                  <button
                    type="button"
                    onClick={e => toggleSection('hr', e)}
                    className={`p-0.5 rounded cursor-pointer transition-colors ${sidebarTheme.sidebarHover}`}
                  >
                    {expandedSection === 'hr' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  </button>
                </div>
              </div>

              {expandedSection === 'hr' && (
                <div className="pl-5 pr-2 py-1 space-y-1 border-t border-slate-100 dark:border-slate-800/60 text-[16.5px] sm:text-[17px]">
                  <button
                    type="button"
                    onClick={() => handleHrSubClick('employees')}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-left transition-colors cursor-pointer"
                  >
                    <span>Staff Directory ({staffCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHrSubClick('payroll')}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-left transition-colors cursor-pointer"
                  >
                    <span>Run Monthly Payroll</span>
                    <Plus className="w-4 h-4 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHrSubClick('advance')}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-left transition-colors cursor-pointer"
                  >
                    <span>Advance Salary Voucher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHrSubClick('payroll')}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-left transition-colors cursor-pointer"
                  >
                    <span>Monthly Salary Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHrSubClick('employees')}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-left transition-colors cursor-pointer"
                  >
                    <span>Active Employees ({activeStaffCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHrSubClick('resigned')}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                  >
                    <span>Resigned/Ex-Staff ({resignedStaffCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHrSubClick('employees')}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-left transition-colors cursor-pointer"
                  >
                    <span>All Employees</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 13. EXPENSE VOUCHERS */}
          {hasPermission(currentUser, 'EXPENSES') && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
              <div
                onClick={() => handleHeaderClick('expenses', 'expenses')}
                className={`flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'expenses'
                    ? sidebarTheme.activeBg
                    : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                  <span className="truncate">{language === 'bn' ? 'খরচের হিসাব (Expenses)' : 'Expense Vouchers'}</span>
                </div>
                <button
                  type="button"
                  onClick={e => toggleSection('expenses', e)}
                  className={`p-0.5 rounded cursor-pointer transition-colors ${sidebarTheme.sidebarHover}`}
                >
                  {expandedSection === 'expenses' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
              </div>

              {expandedSection === 'expenses' && (
                <div className="pl-5 pr-2 py-1 space-y-1 border-t border-slate-100 dark:border-slate-800/60 text-[16.5px] sm:text-[17px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenExpenseModal) onOpenExpenseModal();
                      else handleSelectTab('expenses');
                    }}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-pink-700 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40 text-left transition-colors cursor-pointer"
                  >
                    <span>Expense New (ভাউচার)</span>
                    <Plus className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 14. WALLETS & ACCOUNTS */}
          {hasPermission(currentUser, 'FINANCE_CASH') && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
              <div
                onClick={() => handleHeaderClick('wallets', 'wallets')}
                className={`flex items-center justify-between px-3 py-2 text-[18px] sm:text-[19px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'wallets'
                    ? sidebarTheme.activeBg
                    : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <WalletIcon className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
                  <span className="truncate">{language === 'bn' ? 'ওয়ালেট ও অ্যাকাউন্টস' : 'Wallets & Accounts'}</span>
                </div>
                <button
                  type="button"
                  onClick={e => toggleSection('wallets', e)}
                  className={`p-0.5 rounded cursor-pointer transition-colors ${sidebarTheme.sidebarHover}`}
                >
                  {expandedSection === 'wallets' ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
              </div>

              {expandedSection === 'wallets' && (
                <div className="pl-5 pr-2 py-1 space-y-1 border-t border-slate-100 dark:border-slate-800/60 text-[16.5px] sm:text-[17px]">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('wallets')}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-colors cursor-pointer"
                  >
                    <span>{language === 'bn' ? 'সকল ওয়ালেট ও অ্যাকাউন্টস' : 'All Wallets & Accounts'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY LOGS (SENSITIVE ACTIONS) */}
          {hasPermission(currentUser, 'SETTINGS') && (
            <button
              type="button"
              onClick={() => handleSelectTab('activity-logs')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[18px] sm:text-[19px] font-bold rounded-xl transition-colors cursor-pointer text-left ${
                activeTab === 'activity-logs'
                  ? sidebarTheme.activeBg
                  : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
              }`}
            >
              <ShieldAlert className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
              <span className="truncate">{language === 'bn' ? 'অ্যাক্টিভিটি লগ' : 'Activity Log'}</span>
            </button>
          )}

          {/* 15. COMPANY PROFILE & BRANDING SETTINGS */}
          {hasPermission(currentUser, 'SETTINGS') && (
            <button
              type="button"
              onClick={() => handleSelectTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[18px] sm:text-[19px] font-bold rounded-xl transition-colors cursor-pointer text-left ${
                activeTab === 'settings'
                  ? sidebarTheme.activeBg
                  : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
              }`}
            >
              <Settings className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
              <span className="truncate">{language === 'bn' ? 'কোম্পানি প্রোফাইল ও সেটিংস' : 'Profile & Settings'}</span>
            </button>
          )}

          {/* 16. USER MANAGEMENT & ROLES */}
          {hasPermission(currentUser, 'USER_MANAGEMENT') && (
            <button
              type="button"
              onClick={() => handleSelectTab('users')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[18px] sm:text-[19px] font-bold rounded-xl transition-colors cursor-pointer text-left ${
                activeTab === 'users'
                  ? sidebarTheme.activeBg
                  : `text-slate-800 dark:text-slate-200 transition-colors ${sidebarTheme.sidebarHover}`
              }`}
            >
              <UserCheck className={`w-5.5 h-5.5 ${sidebarTheme.iconColor} shrink-0`} />
              <span className="truncate">{language === 'bn' ? 'ইউজার ম্যানেজমেন্ট ও পারমিশন' : 'User Management & Roles'}</span>
            </button>
          )}

        </div>

        {/* User Card & Language Switcher at Bottom */}
        <div className="px-2.5 border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-0.5 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1 mb-1">
            <span>LANG: {language.toUpperCase()}</span>
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer text-[11px]"
            >
              {language === 'en' ? 'বাংলা' : 'ENGLISH'}
            </button>
          </div>

          <div
            onClick={() => handleSelectTab('users')}
            className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
          >
            <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-xs">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold truncate text-slate-900 dark:text-white leading-tight">
                {currentUser.fullName}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono truncate leading-tight">
                {currentUser.role} Role
              </p>
            </div>
          </div>

          {/* Developer Attribution Card */}
          <div className="mt-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-[10px] space-y-0.5">
            <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
              <Code2 className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate">Developer: Md. Tarikul Islam</span>
            </div>
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <Phone className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <a href="tel:01312305225" className="font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:underline">
                01312305225
              </a>
              <span className="text-slate-400">•</span>
              <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
              <span className="truncate">Sherpur</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
