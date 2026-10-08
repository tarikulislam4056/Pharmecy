import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { getCustomerTotalDue } from '../../utils/dueHelpers';
import {
  Sparkles,
  Filter,
  ArrowDown,
  ArrowUp,
  Calendar,
  DollarSign,
  Info,
  Eye,
  EyeOff,
  Receipt,
  ChevronRight,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  Package,
  Check,
  Building,
  Users,
  Search,
  CreditCard,
  CheckCircle2,
  Clock,
  Keyboard,
} from 'lucide-react';
import { VoucherSearchModal } from '../common/VoucherSearchModal';
import { DemandForecastWidget } from './DemandForecastWidget';
import { ExpiryDashboardWidget } from './ExpiryDashboardWidget';
import { isTabAllowed, hasPermission } from '../../utils/permissions';
import { ViewTab } from '../../types';

interface DashboardViewProps {
  onOpenPaymentInModal: () => void;
  onOpenPaymentOutModal: () => void;
  onOpenCashAdjustModal: () => void;
  onOpenProductModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenKeyboardShortcuts?: () => void;
}

type FilterPeriod = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'thisYear' | 'all';

// Reusable SVG Vertical Mini-Bar Sparkline Chart matching the exact visual in the screenshot
const SparklineMiniBars: React.FC<{
  color: 'green' | 'blue' | 'coral' | 'yellow';
  heights?: number[];
}> = ({ color, heights = [20, 35, 15, 45, 60, 30, 75, 40, 65, 80, 50, 90] }) => {
  const getBarColor = (index: number) => {
    switch (color) {
      case 'green':
        return index % 2 === 0 ? '#10B981' : '#6EE7B7';
      case 'blue':
        return index % 2 === 0 ? '#38BDF8' : '#7DD3FC';
      case 'coral':
        return index % 2 === 0 ? '#F43F5E' : '#FDA4AF';
      case 'yellow':
        return index % 2 === 0 ? '#F59E0B' : '#FCD34D';
      default:
        return '#94A3B8';
    }
  };

  return (
    <svg className="w-16 h-10 overflow-visible" viewBox="0 0 64 36" fill="none">
      {heights.map((h, i) => {
        const barWidth = 2.5;
        const x = i * 5;
        const barHeight = (h / 100) * 32;
        const y = 34 - barHeight;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={1.2}
            fill={getBarColor(i)}
            opacity={0.7 + (i / heights.length) * 0.3}
          />
        );
      })}
    </svg>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenPaymentInModal,
  onOpenPaymentOutModal,
  onOpenCashAdjustModal,
  onOpenProductModal,
  onOpenExpenseModal,
  onOpenKeyboardShortcuts,
}) => {
  const {
    language,
    currentUser,
    companySettings,
    setActiveTab,
    formatCurrency,
    saleInvoices,
    purchaseInvoices,
    parties,
    wallets,
    products,
    categories,
    dayBookEntries,
    expenseVouchers,
    installmentSchemes,
    showToast,
  } = useApp();
  const { t } = useTranslation(language);

  // States
  const [showBalance, setShowBalance] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterPeriod>('today');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [infoTooltip, setInfoTooltip] = useState<string | null>(null);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [isVoucherSearchOpen, setIsVoucherSearchOpen] = useState(false);

  const handleSafeNavigate = (tab: ViewTab) => {
    if (isTabAllowed(currentUser, tab)) {
      setActiveTab(tab);
    } else {
      showToast(
        language === 'bn'
          ? 'আপনার এই মডিউলে প্রবেশের অনুমতি নেই।'
          : 'You do not have permission to access this module.',
        'warning'
      );
    }
  };

  // Dynamic Greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return language === 'bn' ? 'শুভ সকাল' : 'Good Morning';
    } else if (hour < 17) {
      return language === 'bn' ? 'শুভ অপরাহ্ন' : 'Good Afternoon';
    } else {
      return language === 'bn' ? 'শুভ সন্ধ্যা' : 'Good Evening';
    }
  };

  // Date Filter Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Filtered sales and transactions based on chosen period
  const filteredSales = useMemo(() => {
    if (activeFilter === 'today') {
      return saleInvoices.filter(s => s.date === todayStr);
    }
    if (activeFilter === 'yesterday') {
      return saleInvoices.filter(s => s.date === yesterdayStr);
    }
    if (activeFilter === 'last7') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return saleInvoices.filter(s => new Date(s.date) >= d);
    }
    return saleInvoices;
  }, [saleInvoices, activeFilter, todayStr, yesterdayStr]);

  const filteredPurchases = useMemo(() => {
    if (activeFilter === 'today') {
      return purchaseInvoices.filter(p => p.date === todayStr);
    }
    if (activeFilter === 'yesterday') {
      return purchaseInvoices.filter(p => p.date === yesterdayStr);
    }
    if (activeFilter === 'last7') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return purchaseInvoices.filter(p => new Date(p.date) >= d);
    }
    return purchaseInvoices;
  }, [purchaseInvoices, activeFilter, todayStr, yesterdayStr]);

  const filteredExpenses = useMemo(() => {
    if (activeFilter === 'today') {
      return expenseVouchers.filter(e => e.date === todayStr);
    }
    if (activeFilter === 'yesterday') {
      return expenseVouchers.filter(e => e.date === yesterdayStr);
    }
    if (activeFilter === 'last7') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return expenseVouchers.filter(e => new Date(e.date) >= d);
    }
    return expenseVouchers;
  }, [expenseVouchers, activeFilter, todayStr, yesterdayStr]);

  const filteredDayBook = useMemo(() => {
    if (activeFilter === 'today') {
      return dayBookEntries.filter(e => e.date === todayStr);
    }
    if (activeFilter === 'yesterday') {
      return dayBookEntries.filter(e => e.date === yesterdayStr);
    }
    if (activeFilter === 'last7') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return dayBookEntries.filter(e => new Date(e.date) >= d);
    }
    return dayBookEntries;
  }, [dayBookEntries, activeFilter, todayStr, yesterdayStr]);

  // Cash In calculation for the filtered period (Actual liquid money received)
  const cashInAmount = useMemo(() => {
    return filteredDayBook
      .filter(e => e.flow === 'IN')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredDayBook]);

  // Cash Out calculation for the filtered period (Only actual wallet deductions and expenses)
  const cashOutAmount = useMemo(() => {
    return filteredDayBook
      .filter(e => e.flow === 'OUT')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredDayBook]);

  // Total Receivables (Customer Dues including EMI/Installment)
  const totalReceivables = useMemo(() => {
    return parties
      .filter(p => p.type === 'CUSTOMER')
      .reduce((sum, p) => sum + getCustomerTotalDue(p, installmentSchemes), 0);
  }, [parties, installmentSchemes]);

  // Total Payables (Supplier Dues)
  const totalPayables = useMemo(() => {
    return parties
      .filter(p => p.type === 'SUPPLIER')
      .reduce((sum, p) => sum + (p.currentBalance > 0 ? p.currentBalance : 0), 0);
  }, [parties]);

  // Total Cash in Hand / Wallets Balance
  const totalCashInHand = useMemo(() => {
    const sum = wallets.reduce((acc, w) => acc + w.balance, 0);
    return sum;
  }, [wallets]);

  // Total Stock Value (Inventory Valuation based on current stock quantity * purchase price for all items)
  const totalStockValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.stock || 0) * Number(p.purchasePrice || 0)), 0);
  }, [products]);

  // Total Stock Quantity & Items Count
  const totalStockQty = useMemo(() => {
    return products.reduce((acc, p) => acc + Number(p.stock || 0), 0);
  }, [products]);
  const totalItemsCount = products.length;

  // Total Profit (Based on Sales)
  const totalProfit = useMemo(() => {
    return filteredSales.reduce((sum, invoice) => {
      let invoiceCogs = 0;
      invoice.items.forEach(item => {
        let cost = item.purchasePrice;
        if (cost === undefined || cost === null || cost === 0) {
          const p = products.find(p => p.id === item.productId);
          cost = p ? (p.purchasePrice || 0) : 0;
        }
        invoiceCogs += (cost * item.quantity);
      });
      
      let invoiceDiscount = invoice.discount || 0;
      if (invoice.discountType === 'percentage') {
        invoiceDiscount = invoice.subtotal * (invoice.discount / 100);
      }
      
      const revenue = invoice.subtotal - invoiceDiscount;
      return sum + (revenue - invoiceCogs);
    }, 0);
  }, [filteredSales, products]);

  // Total Expenses
  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Installments & EMI Totals
  const installmentSummary = useMemo(() => {
    let totalEmiSales = 0;
    let totalEmiCollected = 0;
    let activeSchemesCount = 0;

    (installmentSchemes || []).forEach(scheme => {
      // Total EMI sale value
      const schemeTotal = Number(scheme.totalPayable || (scheme.totalPrice + (scheme.interestAmount || 0)));
      totalEmiSales += schemeTotal;

      // Down payment collected
      const dp = Number(scheme.downPayment || 0);

      // Schedules collected
      let schedulesPaid = 0;
      (scheme.schedules || []).forEach(sched => {
        if (sched.status === 'PAID') {
          schedulesPaid += Number(sched.paidAmount || sched.amount || 0);
        } else if (sched.paidAmount) {
          schedulesPaid += Number(sched.paidAmount);
        }
      });

      totalEmiCollected += (dp + schedulesPaid);

      if (scheme.status === 'ACTIVE') {
        activeSchemesCount++;
      }
    });

    const totalEmiDue = Math.max(0, totalEmiSales - totalEmiCollected);

    return {
      totalSales: totalEmiSales,
      totalCollected: totalEmiCollected,
      totalDue: totalEmiDue,
      totalSchemes: (installmentSchemes || []).length,
      activeSchemes: activeSchemesCount,
    };
  }, [installmentSchemes]);

  // Customer vs Supplier Counts
  const customerCount = useMemo(() => parties.filter(p => p.type === 'CUSTOMER').length, [parties]);
  const supplierCount = useMemo(() => parties.filter(p => p.type === 'SUPPLIER').length, [parties]);
  const totalParties = customerCount + supplierCount;
  const customerPercentage = totalParties > 0 ? Math.round((customerCount / totalParties) * 100) : 0;

  // Best Selling & Lowest Selling Products logic
  const productSalesMap = useMemo(() => {
    const map: { [prodId: string]: { name: string; qty: number; revenue: number; stock: number } } = {};
    
    // Seed with all products
    products.forEach(p => {
      map[p.id] = { name: p.name, qty: 0, revenue: 0, stock: p.stock };
    });

    saleInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (map[item.productId]) {
          map[item.productId].qty += item.quantity;
          map[item.productId].revenue += item.total;
        } else {
          map[item.productId] = {
            name: item.name,
            qty: item.quantity,
            revenue: item.total,
            stock: 0,
          };
        }
      });
    });

    return Object.entries(map).map(([id, data]) => ({ id, ...data }));
  }, [products, saleInvoices]);

  const bestSellingProducts = useMemo(() => {
    return [...productSalesMap].sort((a, b) => b.qty - a.qty).slice(0, 3);
  }, [productSalesMap]);

  const lowestSellingProducts = useMemo(() => {
    return [...productSalesMap].sort((a, b) => a.qty - b.qty).slice(0, 3);
  }, [productSalesMap]);

  const totalTransactionsCount = filteredSales.length;

  const lowStockProducts = useMemo(() => {
    return products.filter(p => Number(p.stock || 0) <= Number(p.reorderLevel || 0));
  }, [products]);

  return (
    <div className="space-y-5 pb-8">
      {/* 1. Top Greeting Bar with Search & Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
        {/* Left: Greeting with purple sparkle icon */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-[#8271FE] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 fill-[#8271FE]/20 text-[#8271FE]" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              {getGreeting()}, <span className="font-extrabold">{currentUser.fullName}</span>
            </h2>
          </div>
        </div>

        {/* Middle: Dashboard Voucher & Ref Search Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            setIsVoucherSearchOpen(true);
          }}
          className="flex-1 max-w-xl relative flex items-center"
        >
          <div className="relative w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              value={dashboardSearchQuery}
              onChange={e => setDashboardSearchQuery(e.target.value)}
              placeholder={
                language === 'bn'
                  ? 'Price Quotation (QT-...), Ticket No, Serial/IMEI, Invoice দিয়ে খুঁজুন...'
                  : 'Search Price Quotation (QT-...), Ticket No, Serial/IMEI, Invoice...'
              }
              className="w-full pl-10 pr-24 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-lg font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8271FE] shadow-2xs transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-[#8271FE] hover:bg-[#7260FD] text-white rounded-lg text-base sm:text-lg font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'Search' : 'Search'}</span>
            </button>
          </div>
        </form>

        {/* Right: Filters Button & Shortcuts */}
        <div className="relative shrink-0 self-end lg:self-center flex items-center gap-2">
          {/* Shortcuts Info Pill */}
          <button
            type="button"
            onClick={onOpenKeyboardShortcuts}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-400 rounded-xl text-base sm:text-lg font-bold shadow-2xs transition-all cursor-pointer"
            title="Keyboard Shortcuts Guide (Shift + ?)"
          >
            <Keyboard className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">{language === 'bn' ? 'শর্টকাট' : 'Shortcuts'}</span>
            <kbd className="px-1.5 py-0.2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[9px] text-slate-500 font-mono font-black shadow-2xs">
              Shift+?
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 text-slate-800 dark:text-slate-100 rounded-xl text-base sm:text-lg font-bold shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="capitalize">
              {activeFilter === 'today' && (language === 'bn' ? 'আজকের' : 'Filters')}
              {activeFilter === 'yesterday' && 'Yesterday'}
              {activeFilter === 'last7' && 'Last 7 Days'}
              {activeFilter === 'thisMonth' && 'This Month'}
              {activeFilter === 'all' && 'All Time'}
            </span>
          </button>

          {/* Filter Dropdown */}
          {isFilterOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-30 text-sm">
              <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                Select Time Period
              </div>
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last7', label: 'Last 7 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'all', label: 'All Time' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setActiveFilter(f.id as FilterPeriod);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    activeFilter === f.id ? 'font-bold text-[#8271FE] bg-purple-50/50 dark:bg-purple-950/30' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{f.label}</span>
                  {activeFilter === f.id && <Check className="w-3.5 h-3.5 text-[#8271FE]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Top 4 Stat Metric Cards (Row 1) - 2x2 on Mobile, 4 Cols on Large Screen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        
        {/* 1. Cash In */}
        <div
          onClick={() => handleSafeNavigate('daybook')}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5"
        >
          <div className="flex flex-col justify-between space-y-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-bold block truncate">
                {language === 'bn' ? 'ক্যাশ ইন' : 'Cash In'}
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight block truncate mt-0.5">
                {formatCurrency(cashInAmount)}
              </span>
            </div>
          </div>
          <div className="hidden sm:block self-end pb-0.5 shrink-0">
            <SparklineMiniBars color="green" heights={[25, 45, 30, 60, 50, 75, 40, 85, 95]} />
          </div>
        </div>

        {/* 2. Cash Out */}
        <div
          onClick={() => handleSafeNavigate('daybook')}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5"
        >
          <div className="flex flex-col justify-between space-y-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0">
              <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-bold block truncate">
                {language === 'bn' ? 'ক্যাশ আউট' : 'Cash Out'}
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight block truncate mt-0.5">
                {formatCurrency(cashOutAmount)}
              </span>
            </div>
          </div>
          <div className="hidden sm:block self-end pb-0.5 shrink-0">
            <SparklineMiniBars color="blue" heights={[15, 30, 20, 55, 40, 65, 35, 70, 80]} />
          </div>
        </div>

        {/* 3. Total Receivable */}
        <div
          onClick={() => handleSafeNavigate('due-list')}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5"
        >
          <div className="flex flex-col justify-between space-y-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-bold truncate">
                  {language === 'bn' ? 'মোট পাওনা' : 'Total Receivable'}
                </span>
                <span
                  title="Total outstanding dues from customers"
                  className="text-slate-400 hover:text-slate-600 cursor-pointer hidden sm:inline"
                >
                  <Info className="w-3 h-3" />
                </span>
              </div>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight block truncate mt-0.5">
                {formatCurrency(totalReceivables)}
              </span>
            </div>
          </div>
          <div className="hidden sm:block self-end pb-0.5 shrink-0">
            <SparklineMiniBars color="coral" heights={[40, 60, 35, 80, 55, 90, 70, 85, 95]} />
          </div>
        </div>

        {/* 4. Total Payable */}
        <div
          onClick={() => handleSafeNavigate('due-list')}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5"
        >
          <div className="flex flex-col justify-between space-y-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-bold truncate">
                  {language === 'bn' ? 'মোট দেনা' : 'Total Payable'}
                </span>
                <span
                  title="Total payable bills to suppliers"
                  className="text-slate-400 hover:text-slate-600 cursor-pointer hidden sm:inline"
                >
                  <Info className="w-3 h-3" />
                </span>
              </div>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight block truncate mt-0.5">
                {formatCurrency(totalPayables)}
              </span>
            </div>
          </div>
          <div className="hidden sm:block self-end pb-0.5 shrink-0">
            <SparklineMiniBars color="yellow" heights={[30, 45, 25, 70, 50, 60, 40, 75, 80]} />
          </div>
        </div>

      </div>

      {/* Expiry Tracking Widget */}
      <ExpiryDashboardWidget products={products} language={language} />

      {/* 3. Row 2: Cash In Hand, Total Stock Value, Total Profit, & Total Expense */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Cash In Hand (Purple Hero Card matching exact design) */}
        <div className="lg:col-span-3 bg-[#8572FF] rounded-xl p-3 sm:p-3.5 text-white shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[100px]">
          {/* Top Title & Visibility Toggle */}
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                {language === 'bn' ? 'হাতে নগদ (Cash In Hand)' : 'Cash In Hand'}
              </h3>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer p-0.5"
                title={showBalance ? 'Hide Balance' : 'Show Balance'}
              >
                {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-sm text-white/90 font-semibold mt-0.5">
              {language === 'bn' ? 'ক্যাশ ও ওয়ালেট ব্যালেন্স' : 'Total wallet balance'}
            </p>
          </div>

          {/* Amount Box (Crisp White Pill Container) */}
          <div className="mt-2">
            <div className="inline-flex items-center px-3 py-1 bg-white rounded-lg shadow-2xs">
              <span className="text-lg sm:text-xl font-black text-[#8572FF] font-mono tracking-tight">
                {showBalance ? formatCurrency(totalCashInHand) : '৳ ••••••••'}
              </span>
            </div>
          </div>

          {/* Subtle Decorative Gradient Shapes */}
          <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute top-0 right-12 w-20 h-20 bg-indigo-400/20 rounded-full blur-lg pointer-events-none" />
        </div>

        {/* Total Stock Value */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 sm:p-3.5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[100px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center">
                <Package className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white">
                {language === 'bn' ? 'স্টক ভ্যালু' : 'Stock Value'}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => handleSafeNavigate('products-list')}
              className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <span>{language === 'bn' ? 'সব দেখুন' : 'View'}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-1.5 z-10">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-bold block">
              {language === 'bn' ? 'স্টকের কেনা মূল্য' : 'Total Inventory Value'}
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
              {formatCurrency(totalStockValue)}
            </span>
            <div className="mt-1 flex items-center gap-1 flex-wrap">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.2 rounded border border-indigo-100 dark:border-indigo-800/50">
                {totalItemsCount} {language === 'bn' ? 'টি পণ্য' : 'Products'}
              </span>
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.2 rounded border border-indigo-100 dark:border-indigo-800/50">
                {totalStockQty.toLocaleString()} {language === 'bn' ? 'টি পিস' : 'Units'}
              </span>
            </div>
          </div>

          <div className="absolute -right-8 -bottom-8 pointer-events-none opacity-40 dark:opacity-10">
            <div className="w-28 h-28 rounded-full border-8 border-indigo-50 dark:border-indigo-900/20" />
            <div className="w-16 h-16 rounded-full border-8 border-indigo-50 dark:border-indigo-900/20 absolute inset-0 m-auto" />
          </div>
        </div>

        {/* Total Profit */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 sm:p-3.5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[100px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white">
                {language === 'bn' ? 'মোট লাভ' : 'Total Profit'}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => handleSafeNavigate('reports')}
              className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <span>{language === 'bn' ? 'রিপোর্ট' : 'Reports'}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-1.5 z-10">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-bold block">
              {language === 'bn' ? 'বিক্রয় থেকে আয়' : 'Profit from Sales'}
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
              {formatCurrency(totalProfit)}
            </span>
          </div>

          <div className="absolute -right-8 -bottom-8 pointer-events-none opacity-40 dark:opacity-10">
            <div className="w-28 h-28 rounded-full border-8 border-emerald-50 dark:border-emerald-900/20" />
            <div className="w-16 h-16 rounded-full border-8 border-emerald-50 dark:border-emerald-900/20 absolute inset-0 m-auto" />
          </div>
        </div>

        {/* Total Expense Card */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 sm:p-3.5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[100px]">
          {/* Header with Orange Icon & View All Link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-500 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white">
                {language === 'bn' ? 'মোট খরচ' : 'Total Expense'}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => handleSafeNavigate('expenses')}
              className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-[#8572FF] dark:hover:text-[#8572FF] flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <span>{language === 'bn' ? 'সব দেখুন' : 'View All'}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Amount Content */}
          <div className="mt-1.5">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-bold block">
              {language === 'bn' ? 'মোট খরচ' : 'Total Expense'}
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
              {formatCurrency(totalExpenseAmount)}
            </span>
          </div>

          {/* Background Concentric Rings Watermark */}
          <div className="absolute -right-8 -bottom-8 pointer-events-none opacity-40 dark:opacity-10">
            <div className="w-28 h-28 rounded-full border-8 border-slate-100 dark:border-slate-800" />
            <div className="w-16 h-16 rounded-full border-8 border-slate-100 dark:border-slate-800 absolute inset-0 m-auto" />
          </div>
        </div>

      </div>

      {/* Dedicated Low Stock Alert Section (Placed in the middle of Dashboard) */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <span>{language === 'bn' ? 'স্টক অ্যালার্ট: ন্যূনতম সীমার নিচে পণ্য!' : 'Low Stock Warning Alert'}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-extrabold font-mono">
                    {lowStockProducts.length} {language === 'bn' ? 'টি পণ্য' : 'Items'}
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                  {language === 'bn'
                    ? 'নিম্নলিখিত পণ্যগুলির স্টক তাদের নির্ধারিত রিঅর্ডার লেভেল বা ন্যূনতম সীমার নিচে নেমে গেছে। দ্রুত স্টক রিফিল করুন।'
                    : 'The following inventory items have fallen below their defined minimum stock / reorder level. Restock soon to avoid stockouts.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSafeNavigate('products-list')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-100 bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 px-3.5 py-2 rounded-xl transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
            >
              <span>{language === 'bn' ? 'সব স্টক ম্যানেজ করুন' : 'Manage Inventory'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-amber-900/40 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-300 dark:scrollbar-thumb-amber-800">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-amber-100/90 dark:bg-amber-950/90 backdrop-blur-xs">
                  <tr className="text-amber-900 dark:text-amber-200 font-bold uppercase tracking-wider text-xs">
                    <th className="py-2 px-3">{language === 'bn' ? 'পণ্যের নাম' : 'Product Name'}</th>
                    <th className="py-2 px-3">{language === 'bn' ? 'ক্যাটেগরি' : 'Category'}</th>
                    <th className="py-2 px-3 text-center">{language === 'bn' ? 'বর্তমান স্টক' : 'Current Stock'}</th>
                    <th className="py-2 px-3 text-center">{language === 'bn' ? 'ন্যূনতম লেভেল' : 'Min Reorder Level'}</th>
                    <th className="py-2 px-3 text-right">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 dark:divide-amber-950/40">
                  {lowStockProducts.map(prod => (
                    <tr key={prod.id} className="hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                          <span className="truncate max-w-[180px]">{prod.name}</span>
                          {prod.sku && <span className="text-xs text-slate-400 font-mono">({prod.sku})</span>}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                        {prod.categoryName || prod.category || 'General'}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
                        {Number(prod.stock)} {prod.unit || 'pcs'}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                        ≤ {Number(prod.reorderLevel)} {prod.unit || 'pcs'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSafeNavigate('products-list')}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                        >
                          {language === 'bn' ? 'স্টক যোগ' : 'Restock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI-Powered Demand Forecast Widget */}
      <DemandForecastWidget
        products={products}
        saleInvoices={saleInvoices}
        categories={categories}
        language={language}
        formatCurrency={formatCurrency}
        onNavigateToPurchase={(productId) => handleSafeNavigate('purchase-entry')}
        onNavigateToProduct={(productId) => handleSafeNavigate('products-list')}
      />

      {/* 3.5 Installments & EMI Overview Card Section (Excluded in Pharmacy Mode) */}
      {companySettings?.businessModule !== 'pharmacy' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'কিস্তি ও ইএমআই হিসাব (Installments & EMI)' : 'Installments & EMI Overview'}</span>
                <span className="text-sm px-2 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold font-mono">
                  {installmentSummary.activeSchemes} {language === 'bn' ? 'টি সক্রিয় কিস্তি' : 'Active Schemes'}
                </span>
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {language === 'bn'
                  ? 'কিস্তিতে মোট বিক্রি, আদায়কৃত ডাউনপেমেন্ট ও কিস্তির টাকা এবং অবশিষ্ট বকেয়া'
                  : 'Total EMI sales value, collected amounts, and remaining outstanding balance'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSafeNavigate('installments')}
            className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/40 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            <span>{language === 'bn' ? 'কিস্তি ম্যানেজারে যান' : 'Manage Installments'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Total EMI Sales */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                {language === 'bn' ? 'মোট কিস্তিতে বিক্রি' : 'Total EMI Sales'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold font-mono">
                ৳
              </div>
            </div>
            <div className="mt-2 z-10">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
                {formatCurrency(installmentSummary.totalSales)}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 block font-medium">
                {language === 'bn'
                  ? `সর্বমোট ${installmentSummary.totalSchemes} টি কিস্তি চুক্তি`
                  : `Across ${installmentSummary.totalSchemes} total agreements`}
              </span>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <CreditCard className="w-16 h-16 text-slate-900 dark:text-white" />
            </div>
          </div>

          {/* 2. Total EMI Collected */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl p-3 sm:p-4 border border-emerald-200/80 dark:border-emerald-900/40 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                {language === 'bn' ? 'মোট আদায়কৃত টাকা' : 'Total Collected'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 z-10">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight block">
                {formatCurrency(installmentSummary.totalCollected)}
              </span>
              <span className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5 block font-medium">
                {language === 'bn'
                  ? 'ডাউনপেমেন্ট ও জমাকৃত কিস্তির টাকা'
                  : 'Downpayment + collected installments'}
              </span>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <CheckCircle2 className="w-16 h-16 text-emerald-600" />
            </div>
          </div>

          {/* 3. Total EMI Due / Remaining */}
          <div className="bg-rose-50/60 dark:bg-rose-950/20 rounded-xl p-3 sm:p-4 border border-rose-200/80 dark:border-rose-900/40 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <span className="text-sm font-extrabold text-rose-800 dark:text-rose-300">
                {language === 'bn' ? 'অবশিষ্ট বকেয়া / বাকী' : 'Total Remaining Due'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 z-10">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight block">
                {formatCurrency(installmentSummary.totalDue)}
              </span>
              <span className="text-sm text-rose-700 dark:text-rose-400 mt-0.5 block font-medium">
                {language === 'bn'
                  ? 'ভবিষ্যতে কাস্টমার থেকে আদায়যোগ্য'
                  : 'Outstanding balance to be collected'}
              </span>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <Clock className="w-16 h-16 text-rose-600" />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 4. Row 3: Most and Least Selling Products & Customer/Supplier Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left (8 Cols): Most and Least Selling Products */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Card Header */}
            <div className="pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                {language === 'bn' ? 'সর্বোচ্চ ও সর্বনিম্ন বিক্রীত পণ্য' : 'Most and Least Selling Products'}
              </h3>
            </div>

            {/* 3 Metric Headers */}
            <div className="grid grid-cols-3 gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-800 text-center sm:text-left">
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold block">
                  {language === 'bn' ? 'মোট ট্রানজেকশন' : 'Total Transaction'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {totalTransactionsCount}
                </span>
              </div>

              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold block">
                  {language === 'bn' ? 'বেস্ট সেলিং' : 'Best Selling'}
                </span>
                <div className="mt-0.5">
                  {bestSellingProducts.filter(p => p.qty > 0).length > 0 ? (
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 truncate block">
                      {bestSellingProducts[0].name} ({bestSellingProducts[0].qty})
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 italic">No sales yet</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold block">
                  {language === 'bn' ? 'লোয়েস্ট সেলিং' : 'Lowest Selling'}
                </span>
                <div className="mt-0.5">
                  {lowestSellingProducts.length > 0 ? (
                    <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300 truncate block">
                      {lowestSellingProducts[0].name}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 italic">N/A</span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Products Quick Table List */}
            <div className="mt-2 overflow-x-auto max-h-[110px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-1 pt-0.5">Product Name</th>
                    <th className="pb-1 pt-0.5 text-center">In Stock</th>
                    <th className="pb-1 pt-0.5 text-center">Units Sold</th>
                    <th className="pb-1 pt-0.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {products.slice(0, 3).map((prod, idx) => {
                    const salesInfo = productSalesMap.find(p => p.id === prod.id);
                    const soldQty = salesInfo ? salesInfo.qty : 0;
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-1 font-bold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[160px] text-sm">{prod.name}</span>
                          </div>
                        </td>
                        <td className="py-1 text-center font-mono text-sm">
                          <span className={prod.stock <= prod.reorderLevel ? 'text-amber-600 font-bold' : 'text-slate-600 dark:text-slate-400'}>
                            {Number(prod.stock)} {prod.unit}
                          </span>
                        </td>
                        <td className="py-1 text-center font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {soldQty}
                        </td>
                        <td className="py-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleSafeNavigate('pos')}
                            className="text-[#8572FF] font-bold hover:underline cursor-pointer text-xs"
                          >
                            Sell →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 flex items-center justify-between text-sm text-slate-500 font-medium">
            <span>Inventory tracking enabled</span>
            <button
              type="button"
              onClick={() => handleSafeNavigate('products-list')}
              className="text-[#8572FF] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>Manage Products</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right (4 Cols): Customer / Supplier Donut Chart Card */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              {language === 'bn' ? 'কাস্টমার / মহাজন' : 'Customer/Supplier'}
            </h3>
            <button
              type="button"
              onClick={() => handleSafeNavigate('customers')}
              className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-[#8572FF] flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <span>{language === 'bn' ? 'সব দেখুন' : 'View All'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Donut Chart & Legend in side-by-side or stacked layout */}
          <div className="my-auto py-2 flex items-center justify-around gap-3">
            
            {/* SVG Donut Chart */}
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#E2E8F0"
                  strokeWidth="15"
                  className="dark:stroke-slate-800"
                />

                {/* Customer Segment (Purple #8271FE) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#8271FE"
                  strokeWidth="15"
                  strokeDasharray={`${(customerPercentage * 238.76) / 100} 238.76`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />

                {/* Supplier Segment (Cyan #60A5FA) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#60A5FA"
                  strokeWidth="15"
                  strokeDasharray={`${((100 - customerPercentage) * 238.76) / 100} 238.76`}
                  strokeDashoffset={`-${(customerPercentage * 238.76) / 100}`}
                  strokeLinecap="round"
                />
              </svg>

              {/* Center party count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-800 dark:text-white font-mono leading-none">
                  {totalParties}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-extrabold">Total</span>
              </div>
            </div>

            {/* Legend on the right */}
            <div className="space-y-2 text-sm">
              <div
                onClick={() => handleSafeNavigate('customers')}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#8271FE] shrink-0" />
                <span className="text-slate-800 dark:text-slate-200 font-bold group-hover:text-[#8271FE] transition-colors">
                  {customerCount} {language === 'bn' ? 'কাস্টমার' : 'Customer'}
                </span>
              </div>

              <div
                onClick={() => handleSafeNavigate('suppliers')}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#60A5FA] shrink-0" />
                <span className="text-slate-800 dark:text-slate-200 font-bold group-hover:text-[#60A5FA] transition-colors">
                  {supplierCount} {language === 'bn' ? 'মহাজন' : 'Supplier'}
                </span>
              </div>
            </div>

          </div>

          {/* Quick Actions Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm font-bold">
            <button
              type="button"
              onClick={() => handleSafeNavigate('customers')}
              className="text-[#8271FE] hover:underline cursor-pointer"
            >
              + Add Customer
            </button>
            <button
              type="button"
              onClick={() => handleSafeNavigate('suppliers')}
              className="text-[#60A5FA] hover:underline cursor-pointer"
            >
              + Add Supplier
            </button>
          </div>
        </div>

      </div>

      {/* Global Voucher & Ref Search Modal */}
      <VoucherSearchModal
        isOpen={isVoucherSearchOpen}
        onClose={() => setIsVoucherSearchOpen(false)}
        initialQuery={dashboardSearchQuery}
      />
    </div>
  );
};
