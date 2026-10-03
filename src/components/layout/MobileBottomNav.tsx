import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  BookOpen,
  Menu,
  Package,
} from 'lucide-react';
import { ViewTab } from '../../types';
import { isTabAllowed } from '../../utils/permissions';

interface MobileBottomNavProps {
  onOpenSidebar: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenSidebar }) => {
  const { activeTab, setActiveTab, currentUser, language, products } = useApp();

  const lowStockCount = products.filter(p => p.stock <= p.reorderLevel).length;

  const handleTabClick = (tab: ViewTab) => {
    if (isTabAllowed(currentUser, tab)) {
      setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isSaleActive = activeTab === 'pos' || activeTab === 'sales-list' || activeTab === 'sales-returns';
  const isPurchaseActive = activeTab === 'purchase-entry' || activeTab === 'purchase-list' || activeTab === 'purchase-returns';
  const isDaybookActive = activeTab === 'daybook' || activeTab === 'cash-adjustment' || activeTab === 'expenses' || activeTab === 'wallets';
  const isDashboardActive = activeTab === 'dashboard';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between">
        
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => handleTabClick('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            isDashboardActive
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isDashboardActive ? 'bg-blue-50 dark:bg-blue-950/70 shadow-xs scale-105' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight mt-1 leading-none">
            {language === 'bn' ? 'হোম' : 'Home'}
          </span>
        </button>

        {/* 2. POS / Sales */}
        {isTabAllowed(currentUser, 'pos') && (
          <button
            type="button"
            onClick={() => handleTabClick('pos')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isSaleActive
                ? 'text-[#0284C7] dark:text-[#38BDF8] font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isSaleActive ? 'bg-sky-50 dark:bg-sky-950/70 shadow-xs scale-105' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight mt-1 leading-none">
              {language === 'bn' ? 'বিক্রয়' : 'Sales'}
            </span>
          </button>
        )}

        {/* 3. Purchase */}
        {isTabAllowed(currentUser, 'purchase-entry') && (
          <button
            type="button"
            onClick={() => handleTabClick('purchase-entry')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isPurchaseActive
                ? 'text-[#8A7CFA] dark:text-[#A78BFA] font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isPurchaseActive ? 'bg-purple-50 dark:bg-purple-950/70 shadow-xs scale-105' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight mt-1 leading-none">
              {language === 'bn' ? 'ক্রয়' : 'Purchase'}
            </span>
          </button>
        )}

        {/* 4. Day Book / Transactions */}
        {isTabAllowed(currentUser, 'daybook') && (
          <button
            type="button"
            onClick={() => handleTabClick('daybook')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isDaybookActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isDaybookActive ? 'bg-emerald-50 dark:bg-emerald-950/70 shadow-xs scale-105' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight mt-1 leading-none">
              {language === 'bn' ? 'হিসাব' : 'Day Book'}
            </span>
          </button>
        )}

        {/* 5. Menu Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer relative"
          aria-label="Open Full Menu"
        >
          <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight mt-1 leading-none font-semibold">
            {language === 'bn' ? 'মেনু' : 'Menu'}
          </span>
          {lowStockCount > 0 && (
            <span className="absolute top-1 right-3.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>

      </div>
    </div>
  );
};
