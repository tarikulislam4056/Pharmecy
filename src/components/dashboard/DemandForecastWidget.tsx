import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  PackageCheck,
  Search,
  Filter,
  RefreshCw,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Brain,
  X,
  ArrowRight,
  TrendingDown,
  Zap,
  DollarSign,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Product, SaleInvoice, Category, ViewTab } from '../../types';
import { calculateDemandForecast, ProductDemandForecast } from '../../utils/demandForecast';
import { generateAiSupplyChainInsight, generateProductDemandInsight } from '../../utils/geminiAi';

interface DemandForecastWidgetProps {
  products: Product[];
  saleInvoices: SaleInvoice[];
  categories: Category[];
  language: 'en' | 'bn';
  formatCurrency: (amount: number) => string;
  onNavigateToPurchase?: (productId?: string) => void;
  onNavigateToProduct?: (productId?: string) => void;
}

type RiskFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'TOP_SELLING' | 'SLOW_MOVING';

export const DemandForecastWidget: React.FC<DemandForecastWidgetProps> = ({
  products,
  saleInvoices,
  categories,
  language,
  formatCurrency,
  onNavigateToPurchase,
  onNavigateToProduct,
}) => {
  // States
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('CRITICAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  
  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiReportContent, setAiReportContent] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);

  // Single Product AI Insight Modal/State
  const [selectedProductForAi, setSelectedProductForAi] = useState<ProductDemandForecast | null>(null);
  const [singleProductAiText, setSingleProductAiText] = useState<string>('');
  const [isGeneratingSingleAi, setIsGeneratingSingleAi] = useState(false);

  // Calculate 90-day forecast metrics
  const forecastSummary = useMemo(() => {
    return calculateDemandForecast(products, saleInvoices, categories);
  }, [products, saleInvoices, categories]);

  // Filter items based on user selection
  const filteredItems = useMemo(() => {
    return forecastSummary.items.filter((item) => {
      // Risk filter
      if (riskFilter === 'CRITICAL' && item.riskLevel !== 'CRITICAL') return false;
      if (riskFilter === 'HIGH' && item.riskLevel !== 'HIGH') return false;
      if (riskFilter === 'MODERATE' && item.riskLevel !== 'MODERATE') return false;
      if (riskFilter === 'TOP_SELLING' && item.totalSold90Days === 0) return false;
      if (riskFilter === 'SLOW_MOVING' && (item.salesTrend !== 'NO_SALES' || item.currentStock === 0)) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && item.product.categoryId !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (item.product.name || '').toLowerCase();
        const pNameBn = (item.product.nameBn || '').toLowerCase();
        const sku = (item.product.sku || '').toLowerCase();
        const barcode = (item.product.barcode || '').toLowerCase();
        return pName.includes(q) || pNameBn.includes(q) || sku.includes(q) || barcode.includes(q);
      }

      return true;
    });
  }, [forecastSummary, riskFilter, selectedCategory, searchQuery]);

  // Handle overall AI Strategy Report Generation
  const handleGenerateAiReport = async () => {
    setIsGeneratingAi(true);
    setIsAiModalOpen(true);
    try {
      const report = await generateAiSupplyChainInsight(forecastSummary, language);
      setAiReportContent(report);
    } catch (err) {
      setAiReportContent(
        language === 'bn'
          ? 'এআই রিপোর্ট তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
          : 'Failed to generate AI report. Please try again.'
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Handle single product deep dive AI analysis
  const handleGenerateSingleProductAi = async (item: ProductDemandForecast) => {
    setSelectedProductForAi(item);
    setIsGeneratingSingleAi(true);
    try {
      const insight = await generateProductDemandInsight(item, language);
      setSingleProductAiText(insight);
    } catch (err) {
      setSingleProductAiText(
        language === 'bn' ? item.aiRecommendationBn : item.aiRecommendationEn
      );
    } finally {
      setIsGeneratingSingleAi(false);
    }
  };

  const handleCopyAiReport = () => {
    if (!aiReportContent) return;
    navigator.clipboard.writeText(aiReportContent);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* 1. Widget Header Bar */}
      <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white rounded-xl shadow-md shrink-0">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>{language === 'bn' ? '🤖 এআই ডিমান্ড ফোরকাস্ট ও রিস্টক গাইড' : '🤖 AI Demand Forecast & Replenishment'}</span>
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{language === 'bn' ? '৯০ দিনের বিক্রয় গতি নির্ভর' : '3-Month Velocity AI'}</span>
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
              {language === 'bn'
                ? 'গত ৩ মাসের বিক্রয় গতির উপর ভিত্তি করে ভবিষ্যতের ইনভেন্টরি চাহিদা ও পুনঃক্রয় পূর্বাভাস'
                : 'Predicts future stock shortages and reorder requirements based on 90-day sales velocity'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards Row */}
      <div className="p-3 bg-zinc-50/60 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Critical Stockout Risk */}
        <div
          onClick={() => setRiskFilter('CRITICAL')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            riskFilter === 'CRITICAL'
              ? 'bg-rose-500/10 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 ring-2 ring-rose-400/40'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-sm text-rose-700 dark:text-rose-300 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              {language === 'bn' ? '🔴 ক্রিসিক্যাল ঝুঁকি (<৭দিন)' : '🔴 Critical (<7 Days)'}
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
            {forecastSummary.totalCriticalItems} <span className="text-xs font-semibold">{language === 'bn' ? 'টি পণ্য' : 'items'}</span>
          </div>
        </div>

        {/* High Risk */}
        <div
          onClick={() => setRiskFilter('HIGH')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            riskFilter === 'HIGH'
              ? 'bg-amber-500/10 dark:bg-amber-950/50 border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/40'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-sm text-amber-800 dark:text-amber-300 font-bold">
            <span>{language === 'bn' ? '🟠 উচ্চ ঝুঁকি (<১৫ দিন)' : '🟠 High Risk (<15 Days)'}</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
            {forecastSummary.totalHighRiskItems} <span className="text-xs font-semibold">{language === 'bn' ? 'টি পণ্য' : 'items'}</span>
          </div>
        </div>

        {/* Moderate Risk */}
        <div
          onClick={() => setRiskFilter('MODERATE')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            riskFilter === 'MODERATE'
              ? 'bg-yellow-500/10 dark:bg-yellow-950/50 border-yellow-400 dark:border-yellow-700 ring-2 ring-yellow-400/40'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-yellow-300'
          }`}
        >
          <div className="flex items-center justify-between text-sm text-yellow-800 dark:text-yellow-300 font-bold">
            <span>{language === 'bn' ? '🟡 মাঝারি ঝুঁকি (<৩০ দিন)' : '🟡 Moderate (<30 Days)'}</span>
            <TrendingUp className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-yellow-600 dark:text-yellow-400 font-mono mt-0.5">
            {forecastSummary.totalModerateRiskItems} <span className="text-xs font-semibold">{language === 'bn' ? 'টি পণ্য' : 'items'}</span>
          </div>
        </div>

        {/* Total Restock Investment Needed */}
        <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between text-sm text-indigo-700 dark:text-indigo-300 font-bold">
            <span>{language === 'bn' ? '💰 আনুমানিক রিস্টক বাজেট' : '💰 Restock Budget (30d)'}</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 truncate">
            {formatCurrency(forecastSummary.totalSuggestedRestockCost)}
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Control Toolbar */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Risk Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setRiskFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                riskFilter === 'ALL'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {language === 'bn' ? 'সব পণ্য' : 'All Products'} ({forecastSummary.items.length})
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                riskFilter === 'CRITICAL'
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>🔴 {language === 'bn' ? 'ক্রিটিক্যাল' : 'Critical'}</span>
              <span className="font-mono bg-rose-200 dark:bg-rose-900 px-1 py-0.2 rounded text-xs font-black">
                ({forecastSummary.totalCriticalItems})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('HIGH')}
              className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                riskFilter === 'HIGH'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <span>🟠 {language === 'bn' ? 'উচ্চ ঝুঁকি' : 'High Risk'}</span>
              <span className="font-mono bg-amber-200 dark:bg-amber-900 px-1 py-0.2 rounded text-xs font-black">
                ({forecastSummary.totalHighRiskItems})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('TOP_SELLING')}
              className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                riskFilter === 'TOP_SELLING'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>{language === 'bn' ? 'টপ সেলিং' : 'Top Selling'}</span>
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('SLOW_MOVING')}
              className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                riskFilter === 'SLOW_MOVING'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <TrendingDown className="w-3 h-3 text-slate-500" />
              <span>{language === 'bn' ? 'অলস পণ্য (Slow Moving)' : 'Slow Moving'}</span>
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">{language === 'bn' ? 'সকল ক্যাটেগরি' : 'All Categories'}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'bn' ? c.nameBn || c.name : c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'পণ্য নাম, বারকোড বা SKU দিয়ে পূর্বাভাস ফিল্টার করুন...'
                : 'Filter demand forecast by product name, SKU, barcode...'
            }
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* 4. Product Demand Table / Cards List */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
            <PackageCheck className="w-6 h-6 mx-auto text-zinc-300 dark:text-zinc-700 mb-1" />
            <p className="text-sm font-bold">
              {language === 'bn' ? 'কোন পণ্য পাওয়া যায়নি' : 'No product forecast items match your filter'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedProduct === item.product.id;

            return (
              <div
                key={item.product.id}
                className="p-2 hover:bg-zinc-50/80 dark:hover:bg-zinc-850/50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                  {/* Left Column: Product Info & Risk Badge */}
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]">
                        {language === 'bn' ? item.product.nameBn || item.product.name : item.product.name}
                      </h3>
                      {item.product.categoryName && (
                        <span className="text-[9px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1 py-0.2 rounded">
                          {item.product.categoryName}
                        </span>
                      )}
                    </div>

                    {/* AI Recommendation Banner line */}
                    <div className="text-sm text-zinc-700 dark:text-zinc-300 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-md py-0.5 px-1.5 flex items-center gap-1">
                      <Brain className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-medium text-xs truncate">
                        {language === 'bn' ? item.aiRecommendationBn : item.aiRecommendationEn}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Stock vs Velocity Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 dark:bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0 text-sm">
                    {/* Current Stock */}
                    <div>
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                        {language === 'bn' ? 'বর্তমান স্টক' : 'Stock'}
                      </div>
                      <div className="text-base font-black font-mono text-zinc-800 dark:text-zinc-200">
                        {item.currentStock} {item.product.unit}
                      </div>
                      <div className="text-[9px] text-zinc-400">
                        {language === 'bn' ? 'রিঅর্ডার লেভেল:' : 'Min:'} {item.reorderLevel}
                      </div>
                    </div>

                    {/* Monthly Velocity */}
                    <div>
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                        {language === 'bn' ? 'মাসিক গতি' : 'Monthly Velocity'}
                      </div>
                      <div className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                        {item.monthlyVelocity.toFixed(1)} <span className="text-xs">/mo</span>
                      </div>
                      <div className="text-[9px] text-zinc-400">
                        90d Total: {item.totalSold90Days}
                      </div>
                    </div>

                    {/* Stock Cover Days */}
                    <div>
                      <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                        {language === 'bn' ? 'স্টক স্থায়ীত্ব' : 'Stock Days'}
                      </div>
                      <div
                        className={`text-base font-black font-mono ${
                          item.riskLevel === 'CRITICAL'
                            ? 'text-rose-600 dark:text-rose-400'
                            : item.riskLevel === 'HIGH'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.daysRemaining > 300 ? '30+ days' : `${item.daysRemaining}d left`}
                      </div>
                      <div className="text-[9px] font-bold">
                        {item.riskLevel === 'CRITICAL' && '🔴 Critical'}
                        {item.riskLevel === 'HIGH' && '🟠 High Risk'}
                        {item.riskLevel === 'MODERATE' && '🟡 Moderate'}
                        {item.riskLevel === 'LOW' && '🟢 Healthy'}
                      </div>
                    </div>

                    {/* 30-Day Demand & Reorder Suggestion */}
                    <div>
                      <div className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
                        {language === 'bn' ? '৩০ দিনের চাহিদা' : '30d Forecast'}
                      </div>
                      <div className="text-base font-black font-mono text-indigo-700 dark:text-indigo-300">
                        ~{item.demand30Days} {item.product.unit}
                      </div>
                      {item.suggestedRestockQty > 0 ? (
                        <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.2 rounded inline-block">
                          Reorder +{item.suggestedRestockQty}
                        </div>
                      ) : (
                        <div className="text-[9px] text-emerald-600 font-bold">OK Cover</div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigateToPurchase?.(item.product.id)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'ক্রয় চালান তৈরি' : 'Restock PO'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedProduct(isExpanded ? null : item.product.id)}
                      className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: 3-Month Breakdown Sparkline & Purchase Cost Calculation */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-50/50 dark:bg-zinc-950/30 p-3 rounded-xl">
                    <div>
                      <span className="text-sm font-bold text-zinc-500 block mb-1">
                        {language === 'bn' ? 'গত ৩ মাসের বিক্রয় হিস্ট্রি:' : '3-Month Sales Trend:'}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-sm">
                        <span className="p-1 bg-white dark:bg-zinc-800 rounded border text-center flex-1">
                          M-3: <strong>{item.month1Sold}</strong>
                        </span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className="p-1 bg-white dark:bg-zinc-800 rounded border text-center flex-1">
                          M-2: <strong>{item.month2Sold}</strong>
                        </span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className="p-1 bg-white dark:bg-zinc-800 rounded border text-center flex-1">
                          M-1: <strong>{item.month3Sold}</strong>
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-bold text-zinc-500 block mb-1">
                        {language === 'bn' ? 'মূল্য ও ক্রয় হার:' : 'Pricing & Margin:'}
                      </span>
                      <div className="text-sm font-mono space-y-0.5">
                        <div>
                          Purchase: <strong>{formatCurrency(item.product.purchasePrice)}</strong>
                        </div>
                        <div>
                          Sales: <strong>{formatCurrency(item.product.salesPrice)}</strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-bold text-zinc-500 block mb-1">
                        {language === 'bn' ? 'প্রয়োজনীয় পুনঃক্রয় বাজেট:' : 'Suggested Reorder Investment:'}
                      </span>
                      <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                        {formatCurrency(item.estimatedRestockCost)}
                      </div>
                      <span className="text-xs text-zinc-400">
                        ({item.suggestedRestockQty} units x {formatCurrency(item.product.purchasePrice)})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
