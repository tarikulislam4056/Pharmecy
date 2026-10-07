import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { DatePeriodFilter } from '../common/DatePeriodFilter';
import { BatchReportView } from './BatchReportView';
import { ExpiryReportView } from './ExpiryReportView';
import {
  canUserExportReportCsv,
  canUserDownloadReportPdf,
  canUserPrintReportStatement,
} from '../../utils/permissions';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  CreditCard,
  Printer,
  Download,
  Calendar,
  Layers,
  Search,
  Filter,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  BookOpen,
  User,
  ShoppingBag,
  ShoppingCart,
  Percent,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Tag,
  Boxes,
  Clock,
} from 'lucide-react';

export type ReportKind =
  | 'summary'
  | 'low-stock'
  | 'batch-report'
  | 'ledger'
  | 'item-sales'
  | 'item-purchase'
  | 'pnl'
  | 'cat-sales'
  | 'cat-purchase'
  | 'party-ledger'
  | 'expiry-report';

interface ReportsViewProps {
  initialReportType?: ReportKind;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ initialReportType = 'summary' }) => {
  const {
    language,
    saleInvoices,
    purchaseInvoices,
    products,
    categories,
    expenseVouchers,
    parties,
    dayBookEntries,
    wallets,
    formatCurrency,
    openPrintModal,
    companySettings,
    currentUser,
    showToast,
  } = useApp();
  const { t } = useTranslation(language);

  const isPharmacyMode = companySettings?.businessModule === 'pharmacy';

  const availableGenerics = useMemo(() => {
    const list = [
      ...(companySettings?.productGenerics || []),
      ...products.map(p => p.generic)
    ].filter((g): g is string => Boolean(g && g.trim()));
    return Array.from(new Set(list.map(g => g.trim()))).sort();
  }, [companySettings?.productGenerics, products]);

  const availableManufacturers = useMemo(() => {
    const list = [
      ...(companySettings?.productManufacturers || []),
      ...products.map(p => p.manufacturer)
    ].filter((m): m is string => Boolean(m && m.trim()));
    return Array.from(new Set(list.map(m => m.trim()))).sort();
  }, [companySettings?.productManufacturers, products]);

  // Active Report Category
  const [reportType, setReportType] = useState<ReportKind>(initialReportType);

  useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
    }
  }, [initialReportType]);

  // General States & Stock Summary Filters
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [summaryCategoryId, setSummaryCategoryId] = useState<string>('ALL');
  const [summaryGeneric, setSummaryGeneric] = useState<string>('ALL');
  const [summaryManufacturer, setSummaryManufacturer] = useState<string>('ALL');
  const [summarySearch, setSummarySearch] = useState<string>('');

  const filteredStockSummaryProducts = useMemo(() => {
    return products.filter(prod => {
      if (summaryCategoryId !== 'ALL' && prod.categoryId !== summaryCategoryId) return false;
      if (summaryGeneric !== 'ALL' && (!prod.generic || prod.generic.trim().toLowerCase() !== summaryGeneric.trim().toLowerCase())) return false;
      if (summaryManufacturer !== 'ALL' && (!prod.manufacturer || prod.manufacturer.trim().toLowerCase() !== summaryManufacturer.trim().toLowerCase())) return false;
      if (summarySearch.trim()) {
        const q = summarySearch.toLowerCase();
        const match =
          prod.name.toLowerCase().includes(q) ||
          (prod.nameBn && prod.nameBn.toLowerCase().includes(q)) ||
          (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
          (prod.generic && prod.generic.toLowerCase().includes(q)) ||
          (prod.manufacturer && prod.manufacturer.toLowerCase().includes(q)) ||
          (prod.sku && prod.sku.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [products, summaryCategoryId, summaryGeneric, summaryManufacturer, summarySearch]);

  // Low Stock Report States & Filters
  const [lowStockCategoryId, setLowStockCategoryId] = useState<string>('ALL');
  const [lowStockSupplierId, setLowStockSupplierId] = useState<string>('ALL');
  const [lowStockSearch, setLowStockSearch] = useState<string>('');

  const availableSuppliers = useMemo(() => {
    const set = new Set<string>();
    parties.filter(p => p.type === 'SUPPLIER').forEach(p => set.add(p.name));
    products.forEach(p => {
      if (p.manufacturer) set.add(p.manufacturer.trim());
      p.batches?.forEach(b => {
        if (b.supplierName) set.add(b.supplierName.trim());
      });
    });
    return Array.from(set).sort();
  }, [parties, products]);

  const lowStockReportItems = useMemo(() => {
    return products.filter(prod => {
      const stock = Number(prod.stock || 0);
      const minLevel = Number(prod.reorderLevel || 0);
      if (stock > minLevel) return false;

      if (lowStockCategoryId !== 'ALL' && prod.categoryId !== lowStockCategoryId) return false;

      if (lowStockSupplierId !== 'ALL') {
        const matchManufacturer = prod.manufacturer && prod.manufacturer.toLowerCase() === lowStockSupplierId.toLowerCase();
        const matchBatchSupplier = prod.batches?.some(b => b.supplierName && b.supplierName.toLowerCase() === lowStockSupplierId.toLowerCase());
        const matchPartySupplier = parties.some(pt => pt.type === 'SUPPLIER' && pt.name.toLowerCase() === lowStockSupplierId.toLowerCase());
        if (!matchManufacturer && !matchBatchSupplier && !matchPartySupplier) return false;
      }

      if (lowStockSearch.trim()) {
        const q = lowStockSearch.toLowerCase();
        const match =
          prod.name.toLowerCase().includes(q) ||
          (prod.nameBn && prod.nameBn.toLowerCase().includes(q)) ||
          (prod.sku && prod.sku.toLowerCase().includes(q)) ||
          (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
          (prod.generic && prod.generic.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [products, parties, lowStockCategoryId, lowStockSupplierId, lowStockSearch]);

  const handleExportLowStockCSV = () => {
    const headers = [
      'Product ID',
      'Product Name',
      'SKU',
      'Category',
      'Supplier / Manufacturer',
      'Current Stock',
      'Minimum Reorder Level',
      'Purchase Price',
      'Sales Price',
      'Deficit'
    ];
    const rows = lowStockReportItems.map(p => {
      const stock = Number(p.stock || 0);
      const minLevel = Number(p.reorderLevel || 0);
      const deficit = minLevel - stock;
      const cat = categories.find(c => c.id === p.categoryId)?.name || p.categoryName || 'General';
      const supplier = p.manufacturer || p.batches?.[0]?.supplierName || 'General Supplier';
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.sku || '',
        `"${cat}"`,
        `"${supplier}"`,
        stock,
        minLevel,
        p.purchasePrice,
        p.salesPrice,
        deficit
      ];
    });
    handleExportCSV('Low_Stock_Report', headers, rows);
  };

  // Global Unified Date Range & Period Filter (দৈনিক, মাসিক, ডেট টু ডেট)
  const [globalStartDate, setGlobalStartDate] = useState<string>('');
  const [globalEndDate, setGlobalEndDate] = useState<string>('');
  const [globalPeriodLabel, setGlobalPeriodLabel] = useState<string>('');

  const handlePeriodChange = (start: string, end: string, label?: string) => {
    setGlobalStartDate(start);
    setGlobalEndDate(end);
    setGlobalPeriodLabel(label || '');
    setSalesStartDate(start);
    setSalesEndDate(end);
    setPurchaseStartDate(start);
    setPurchaseEndDate(end);
    setPnlStartDate(start);
    setPnlEndDate(end);
  };

  // 1. Item Wise Sales Filters
  const [salesItemId, setSalesItemId] = useState<string>('ALL');
  const [salesCategoryId, setSalesCategoryId] = useState<string>('ALL');
  const [salesGeneric, setSalesGeneric] = useState<string>('ALL');
  const [salesManufacturer, setSalesManufacturer] = useState<string>('ALL');
  const [salesSearch, setSalesSearch] = useState<string>('');
  const [salesStartDate, setSalesStartDate] = useState<string>('');
  const [salesEndDate, setSalesEndDate] = useState<string>('');

  // 2. Item Wise Purchase Filters
  const [purchaseItemId, setPurchaseItemId] = useState<string>('ALL');
  const [purchaseCategoryId, setPurchaseCategoryId] = useState<string>('ALL');
  const [purchaseGeneric, setPurchaseGeneric] = useState<string>('ALL');
  const [purchaseManufacturer, setPurchaseManufacturer] = useState<string>('ALL');
  const [purchaseSearch, setPurchaseSearch] = useState<string>('');
  const [purchaseStartDate, setPurchaseStartDate] = useState<string>('');
  const [purchaseEndDate, setPurchaseEndDate] = useState<string>('');

  // 3. Item Profit & Loss Filters
  const [pnlItemId, setPnlItemId] = useState<string>('ALL');
  const [pnlCategoryId, setPnlCategoryId] = useState<string>('ALL');
  const [pnlGeneric, setPnlGeneric] = useState<string>('ALL');
  const [pnlManufacturer, setPnlManufacturer] = useState<string>('ALL');
  const [pnlSearch, setPnlSearch] = useState<string>('');
  const [pnlStartDate, setPnlStartDate] = useState<string>('');
  const [pnlEndDate, setPnlEndDate] = useState<string>('');

  // Filtered Core Invoices based on Date Range
  const filteredSalesInvoices = useMemo(() => {
    return saleInvoices.filter(inv => {
      const s = salesStartDate || globalStartDate;
      const e = salesEndDate || globalEndDate;
      if (s && inv.date < s) return false;
      if (e && inv.date > e) return false;
      return true;
    });
  }, [saleInvoices, salesStartDate, salesEndDate, globalStartDate, globalEndDate]);

  const filteredPurchaseInvoices = useMemo(() => {
    return purchaseInvoices.filter(pur => {
      const s = purchaseStartDate || globalStartDate;
      const e = purchaseEndDate || globalEndDate;
      if (s && pur.date < s) return false;
      if (e && pur.date > e) return false;
      return true;
    });
  }, [purchaseInvoices, purchaseStartDate, purchaseEndDate, globalStartDate, globalEndDate]);

  const filteredPnlInvoices = useMemo(() => {
    return saleInvoices.filter(inv => {
      const s = pnlStartDate || globalStartDate;
      const e = pnlEndDate || globalEndDate;
      if (s && inv.date < s) return false;
      if (e && inv.date > e) return false;
      return true;
    });
  }, [saleInvoices, pnlStartDate, pnlEndDate, globalStartDate, globalEndDate]);

  const filteredExpenseVouchers = useMemo(() => {
    return expenseVouchers.filter(exp => {
      if (globalStartDate && exp.date < globalStartDate) return false;
      if (globalEndDate && exp.date > globalEndDate) return false;
      return true;
    });
  }, [expenseVouchers, globalStartDate, globalEndDate]);

  // Overall Global Aggregates (Filtered by Date Range)
  const totalSalesRevenue = filteredSalesInvoices.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalSalesCollected = filteredSalesInvoices.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalCostOfGoodsSold = filteredSalesInvoices
    .flatMap(s => s.items)
    .reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const unitCost = prod ? prod.purchasePrice : item.unitPrice * 0.8;
      return sum + unitCost * item.quantity;
    }, 0);
  const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;
  const grossMarginPct = totalSalesRevenue > 0 ? ((grossProfit / totalSalesRevenue) * 100).toFixed(1) : '0';
  const totalExpenses = filteredExpenseVouchers.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const netMarginPct = totalSalesRevenue > 0 ? ((netProfit / totalSalesRevenue) * 100).toFixed(1) : '0';

  const totalPurchases = filteredPurchaseInvoices.reduce((sum, p) => sum + p.grandTotal, 0);
  const totalPurchasesPaid = filteredPurchaseInvoices.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalStockAssetValue = products.reduce((sum, p) => sum + (Number(p.stock || 0) * Number(p.purchasePrice || 0)), 0);
  const totalRetailStockValue = products.reduce((sum, p) => sum + (Number(p.stock || 0) * Number(p.salesPrice || 0)), 0);

  const itemWiseSalesData = useMemo(() => {
    return products
      .filter(prod => {
        if (salesCategoryId !== 'ALL' && prod.categoryId !== salesCategoryId) return false;
        if (salesGeneric !== 'ALL' && (!prod.generic || prod.generic.trim().toLowerCase() !== salesGeneric.trim().toLowerCase())) return false;
        if (salesManufacturer !== 'ALL' && (!prod.manufacturer || prod.manufacturer.trim().toLowerCase() !== salesManufacturer.trim().toLowerCase())) return false;
        if (salesSearch.trim()) {
          const q = salesSearch.toLowerCase();
          const match =
            prod.name.toLowerCase().includes(q) ||
            (prod.nameBn && prod.nameBn.toLowerCase().includes(q)) ||
            (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
            (prod.generic && prod.generic.toLowerCase().includes(q)) ||
            (prod.manufacturer && prod.manufacturer.toLowerCase().includes(q)) ||
            (prod.sku && prod.sku.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .map(prod => {
        let soldQty = 0;
        let revenue = 0;
        let invoiceCount = 0;

        filteredSalesInvoices.forEach(inv => {
          let itemFoundInInv = false;
          inv.items.forEach(it => {
            if (it.productId === prod.id) {
              soldQty += it.quantity;
              revenue += it.total;
              itemFoundInInv = true;
            }
          });
          if (itemFoundInInv) invoiceCount++;
        });

        const avgPrice = soldQty > 0 ? revenue / soldQty : prod.salesPrice;
        const cogs = soldQty * prod.purchasePrice;
        const itemProfit = revenue - cogs;
        const margin = revenue > 0 ? ((itemProfit / revenue) * 100).toFixed(1) : '0';

        return {
          product: prod,
          soldQty,
          revenue,
          avgPrice,
          invoiceCount,
          cogs,
          profit: itemProfit,
          margin,
        };
      });
  }, [products, filteredSalesInvoices, salesCategoryId, salesGeneric, salesManufacturer, salesSearch]);

  const selectedSalesProduct = useMemo(() => {
    if (salesItemId === 'ALL') return null;
    return products.find(p => p.id === salesItemId) || null;
  }, [salesItemId, products]);

  const selectedSalesProductDrilldown = useMemo(() => {
    if (!selectedSalesProduct) return [];
    const entries: {
      date: string;
      invoiceNumber: string;
      customerName: string;
      customerPhone?: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      discount: number;
      total: number;
    }[] = [];

    filteredSalesInvoices.forEach(inv => {
      inv.items.forEach(it => {
        if (it.productId === selectedSalesProduct.id) {
          entries.push({
            date: inv.date,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            quantity: it.quantity,
            unit: it.unit || selectedSalesProduct.unit || 'Pcs',
            unitPrice: it.unitPrice,
            discount: it.discount || 0,
            total: it.total,
          });
        }
      });
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedSalesProduct, filteredSalesInvoices]);

  const totalSalesUnitsOverall = itemWiseSalesData.reduce((sum, item) => sum + item.soldQty, 0);
  const totalSalesRevenueOverall = itemWiseSalesData.reduce((sum, item) => sum + item.revenue, 0);

  // -------------------------------------------------------------
  // 2. ITEM WISE PURCHASE CALCULATIONS & DRILLDOWN
  // -------------------------------------------------------------
  const itemWisePurchasesData = useMemo(() => {
    return products
      .filter(prod => {
        if (purchaseCategoryId !== 'ALL' && prod.categoryId !== purchaseCategoryId) return false;
        if (purchaseGeneric !== 'ALL' && (!prod.generic || prod.generic.trim().toLowerCase() !== purchaseGeneric.trim().toLowerCase())) return false;
        if (purchaseManufacturer !== 'ALL' && (!prod.manufacturer || prod.manufacturer.trim().toLowerCase() !== purchaseManufacturer.trim().toLowerCase())) return false;
        if (purchaseSearch.trim()) {
          const q = purchaseSearch.toLowerCase();
          const match =
            prod.name.toLowerCase().includes(q) ||
            (prod.nameBn && prod.nameBn.toLowerCase().includes(q)) ||
            (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
            (prod.generic && prod.generic.toLowerCase().includes(q)) ||
            (prod.manufacturer && prod.manufacturer.toLowerCase().includes(q)) ||
            (prod.sku && prod.sku.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .map(prod => {
        let purchasedQty = 0;
        let cost = 0;
        let billCount = 0;

        filteredPurchaseInvoices.forEach(inv => {
          let itemFoundInBill = false;
          inv.items.forEach(it => {
            if (it.productId === prod.id) {
              purchasedQty += it.quantity;
              cost += it.total;
              itemFoundInBill = true;
            }
          });
          if (itemFoundInBill) billCount++;
        });

        const avgCost = purchasedQty > 0 ? cost / purchasedQty : prod.purchasePrice;

        return {
          product: prod,
          purchasedQty,
          cost,
          avgCost,
          billCount,
        };
      });
  }, [products, filteredPurchaseInvoices, purchaseCategoryId, purchaseGeneric, purchaseManufacturer, purchaseSearch]);

  const selectedPurchaseProduct = useMemo(() => {
    if (purchaseItemId === 'ALL') return null;
    return products.find(p => p.id === purchaseItemId) || null;
  }, [purchaseItemId, products]);

  const selectedPurchaseProductDrilldown = useMemo(() => {
    if (!selectedPurchaseProduct) return [];
    const entries: {
      date: string;
      billNumber: string;
      supplierInvoiceNo?: string;
      supplierName: string;
      supplierPhone?: string;
      quantity: number;
      unit: string;
      purchasePrice: number;
      total: number;
    }[] = [];

    filteredPurchaseInvoices.forEach(inv => {
      inv.items.forEach(it => {
        if (it.productId === selectedPurchaseProduct.id) {
          entries.push({
            date: inv.date,
            billNumber: inv.billNumber,
            supplierInvoiceNo: inv.supplierInvoiceNo,
            supplierName: inv.supplierName,
            supplierPhone: inv.supplierPhone,
            quantity: it.quantity,
            unit: it.unit || selectedPurchaseProduct.unit || 'Pcs',
            purchasePrice: it.purchasePrice,
            total: it.total,
          });
        }
      });
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPurchaseProduct, filteredPurchaseInvoices]);

  const totalPurchaseUnitsOverall = itemWisePurchasesData.reduce((sum, item) => sum + item.purchasedQty, 0);
  const totalPurchaseSpendOverall = itemWisePurchasesData.reduce((sum, item) => sum + item.cost, 0);

  // -------------------------------------------------------------
  // 3. ITEM PROFIT & LOSS CALCULATIONS & DRILLDOWN
  // -------------------------------------------------------------
  const itemPnlData = useMemo(() => {
    return products
      .filter(prod => {
        if (pnlCategoryId !== 'ALL' && prod.categoryId !== pnlCategoryId) return false;
        if (pnlGeneric !== 'ALL' && (!prod.generic || prod.generic.trim().toLowerCase() !== pnlGeneric.trim().toLowerCase())) return false;
        if (pnlManufacturer !== 'ALL' && (!prod.manufacturer || prod.manufacturer.trim().toLowerCase() !== pnlManufacturer.trim().toLowerCase())) return false;
        if (pnlSearch.trim()) {
          const q = pnlSearch.toLowerCase();
          const match =
            prod.name.toLowerCase().includes(q) ||
            (prod.nameBn && prod.nameBn.toLowerCase().includes(q)) ||
            (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
            (prod.generic && prod.generic.toLowerCase().includes(q)) ||
            (prod.manufacturer && prod.manufacturer.toLowerCase().includes(q)) ||
            (prod.sku && prod.sku.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .map(prod => {
        let soldQty = 0;
        let revenue = 0;

        filteredPnlInvoices.forEach(inv => {
          inv.items.forEach(it => {
            if (it.productId === prod.id) {
              soldQty += it.quantity;
              revenue += it.total;
            }
          });
        });

        const cogs = soldQty * prod.purchasePrice;
        const profit = revenue - cogs;
        const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';

        return {
          product: prod,
          soldQty,
          revenue,
          cogs,
          profit,
          margin,
        };
      });
  }, [products, filteredPnlInvoices, pnlCategoryId, pnlGeneric, pnlManufacturer, pnlSearch]);

  const selectedPnlProduct = useMemo(() => {
    if (pnlItemId === 'ALL') return null;
    return products.find(p => p.id === pnlItemId) || null;
  }, [pnlItemId, products]);

  const selectedPnlProductDrilldown = useMemo(() => {
    if (!selectedPnlProduct) return [];
    const entries: {
      date: string;
      invoiceNumber: string;
      customerName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      revenue: number;
      unitCost: number;
      totalCost: number;
      grossProfit: number;
      margin: string;
    }[] = [];

    filteredPnlInvoices.forEach(inv => {
      inv.items.forEach(it => {
        if (it.productId === selectedPnlProduct.id) {
          const rev = it.total;
          const cost = it.quantity * selectedPnlProduct.purchasePrice;
          const prof = rev - cost;
          const mgn = rev > 0 ? ((prof / rev) * 100).toFixed(1) : '0';

          entries.push({
            date: inv.date,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName,
            quantity: it.quantity,
            unit: it.unit || selectedPnlProduct.unit || 'Pcs',
            unitPrice: it.unitPrice,
            revenue: rev,
            unitCost: selectedPnlProduct.purchasePrice,
            totalCost: cost,
            grossProfit: prof,
            margin: mgn,
          });
        }
      });
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPnlProduct, filteredPnlInvoices]);

  const totalPnlRevenueOverall = itemPnlData.reduce((sum, item) => sum + item.revenue, 0);
  const totalPnlCogsOverall = itemPnlData.reduce((sum, item) => sum + item.cogs, 0);
  const totalPnlProfitOverall = totalPnlRevenueOverall - totalPnlCogsOverall;
  const totalPnlMarginOverall = totalPnlRevenueOverall > 0 ? ((totalPnlProfitOverall / totalPnlRevenueOverall) * 100).toFixed(1) : '0';

  // -------------------------------------------------------------
  // Other Tab Data (Categories, Ledger, Party)
  // -------------------------------------------------------------
  // Category wise sales (Filtered by Date Range)
  const categorySales = useMemo(() => {
    return categories.map(cat => {
      let totalCatRevenue = 0;
      let totalCatQty = 0;
      filteredSalesInvoices.forEach(inv => {
        inv.items.forEach(it => {
          const p = products.find(prod => prod.id === it.productId);
          if (p && p.categoryId === cat.id) {
            totalCatRevenue += it.total;
            totalCatQty += it.quantity;
          }
        });
      });
      return {
        category: cat,
        revenue: totalCatRevenue,
        qty: totalCatQty,
      };
    });
  }, [categories, filteredSalesInvoices, products]);

  // Category wise purchases (Filtered by Date Range)
  const categoryPurchases = useMemo(() => {
    return categories.map(cat => {
      let totalCatCost = 0;
      let totalCatQty = 0;
      filteredPurchaseInvoices.forEach(inv => {
        inv.items.forEach(it => {
          const p = products.find(prod => prod.id === it.productId);
          if (p && p.categoryId === cat.id) {
            totalCatCost += it.total;
            totalCatQty += it.quantity;
          }
        });
      });
      return {
        category: cat,
        cost: totalCatCost,
        qty: totalCatQty,
      };
    });
  }, [categories, filteredPurchaseInvoices, products]);

  // Selected Product Ledger entries (Filtered by Date Range)
  const selectedProdObj = products.find(p => p.id === selectedProductId) || products[0];
  const prodLedgerEntries = useMemo(() => {
    const entries = [
      ...filteredSalesInvoices.flatMap(inv =>
        inv.items
          .filter(it => it.productId === selectedProdObj?.id)
          .map(it => ({
            date: inv.date,
            ref: inv.invoiceNumber,
            type: 'SALE',
            description: `Sale to ${inv.customerName}`,
            inQty: 0,
            outQty: it.quantity,
            rate: it.unitPrice,
            total: it.total,
          }))
      ),
      ...filteredPurchaseInvoices.flatMap(inv =>
        inv.items
          .filter(it => it.productId === selectedProdObj?.id)
          .map(it => ({
            date: inv.date,
            ref: inv.billNumber,
            type: 'PURCHASE',
            description: `Purchase from ${inv.supplierName}`,
            inQty: it.quantity,
            outQty: 0,
            rate: it.purchasePrice,
            total: it.total,
          }))
      ),
    ];
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSalesInvoices, filteredPurchaseInvoices, selectedProdObj]);

  // Party transaction & item ledger (Filtered by Date Range)
  const selectedPartyObj = parties.find(p => p.id === selectedPartyId);
  const partyTransactions = useMemo(() => {
    if (!selectedPartyObj) return [];
    
    const ledgerEntries: any[] = [];

    // 1. Sales Invoices (Customer Debit)
    if (selectedPartyObj.type === 'CUSTOMER') {
      saleInvoices.forEach(sale => {
        if (sale.customerId === selectedPartyObj.id && sale.paymentMethod !== 'INSTALLMENT' && !sale.isInstallmentSale) {
          ledgerEntries.push({
            date: sale.date,
            type: 'SALE_INVOICE',
            flow: 'OUT', // Custom mapping for UI: it's a charge (Debit)
            voucherNo: sale.invoiceNumber,
            remarks: `Total Bill (Items: ${sale.items.length})`,
            debit: sale.grandTotal,
            credit: 0,
            amount: sale.grandTotal, // For compatibility
            walletName: '-',
            createdAt: sale.createdAt || sale.date
          });
        }
      });
    }

    // 2. Purchase Invoices (Supplier Credit)
    if (selectedPartyObj.type === 'SUPPLIER') {
      purchaseInvoices.forEach(pur => {
        if (pur.supplierId === selectedPartyObj.id) {
          ledgerEntries.push({
            date: pur.date,
            type: 'PURCHASE_BILL',
            flow: 'IN', // Custom mapping for UI: it's a credit to supplier
            voucherNo: pur.billNumber,
            remarks: `Total Bill (Items: ${pur.items.length})`,
            debit: 0,
            credit: pur.grandTotal,
            amount: pur.grandTotal,
            walletName: '-',
            createdAt: pur.createdAt || pur.date
          });
        }
      });
    }

    // 3. Cash flows from dayBookEntries (Payments)
    dayBookEntries.forEach(d => {
      const matchParty = d.partyId === selectedPartyObj.id || (d.partyName === selectedPartyObj.name);
      if (matchParty && d.amount > 0) {
        if (selectedPartyObj.type === 'CUSTOMER') {
          ledgerEntries.push({
            date: d.date,
            type: d.type,
            flow: d.flow,
            voucherNo: d.referenceNo || d.voucherNo,
            remarks: d.remarks || 'Payment',
            debit: d.flow === 'OUT' ? d.amount : 0, // Refund
            credit: d.flow === 'IN' ? d.amount : 0, // Payment Received
            amount: d.amount,
            walletName: d.walletName || '-',
            createdAt: d.createdAt || d.date
          });
        } else if (selectedPartyObj.type === 'SUPPLIER') {
          ledgerEntries.push({
            date: d.date,
            type: d.type,
            flow: d.flow,
            voucherNo: d.referenceNo || d.voucherNo,
            remarks: d.remarks || 'Payment',
            debit: d.flow === 'OUT' ? d.amount : 0, // Payment Made
            credit: d.flow === 'IN' ? d.amount : 0, // Refund received
            amount: d.amount,
            walletName: d.walletName || '-',
            createdAt: d.createdAt || d.date
          });
        }
      }
    });

    const sorted = ledgerEntries.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return timeB - timeA;
    });

    return sorted.filter(d => {
      if (globalStartDate && d.date < globalStartDate) return false;
      if (globalEndDate && d.date > globalEndDate) return false;
      return true;
    });
  }, [dayBookEntries, saleInvoices, purchaseInvoices, selectedPartyObj, globalStartDate, globalEndDate]);

  // CSV Export Handler
  const handleExportCSV = (reportName: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DokanPro_${reportName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic Print Handler for Selected Report
  const handlePrintCurrentReport = (autoDownloadPdf = false) => {
    if (autoDownloadPdf) {
      if (!canUserDownloadReportPdf(currentUser)) {
        showToast(
          language === 'bn'
            ? 'আপনার রিপোর্ট থেকে PDF ডাউনলোড করার অনুমতি নেই।'
            : 'You do not have permission to Download PDF from Reports & Analytics.',
          'error'
        );
        return;
      }
    } else {
      if (!canUserPrintReportStatement(currentUser)) {
        showToast(
          language === 'bn'
            ? 'আপনার রিপোর্ট থেকে স্টেটমেন্ট প্রিন্ট করার অনুমতি নেই।'
            : 'You do not have permission to Print Statement from Reports & Analytics.',
          'error'
        );
        return;
      }
    }

    const printDate = new Date().toLocaleDateString('en-GB');

    if (reportType === 'summary') {
      const reportTitle = language === 'bn' ? 'স্টক সারসংক্ষেপ ও ইনভেন্টরি মূল্যায়ন' : 'STOCK SUMMARY & VALUATION REPORT';
      openPrintModal({
        type: 'PRODUCT_LIST',
        title: reportTitle,
        autoDownloadPdf,
        data: {
          reportHeading: reportTitle,
          generatedDate: printDate,
          totalProducts: products.length,
          totalUnits: products.reduce((s, p) => s + p.stock, 0),
          totalCostValue: totalStockAssetValue,
          totalRetailValue: totalRetailStockValue,
          products,
        },
      });
    } else if (reportType === 'ledger') {
      if (!selectedProdObj) return;
      const reportTitle = language === 'bn' 
        ? `আইটেম মুভমেন্ট লেজার - ${selectedProdObj.name}` 
        : `ITEM STOCK & MOVEMENT LEDGER - ${selectedProdObj.name.toUpperCase()}`;
      openPrintModal({
        type: 'REPORT',
        title: reportTitle,
        autoDownloadPdf,
        data: {
          reportTitle: reportTitle,
          period: language === 'bn' ? 'সম্পূর্ণ লেনদেন হিস্ট্রি' : 'All Time Movement History',
          filters: [
            { label: language === 'bn' ? 'পণ্যের নাম' : 'Item Name', value: selectedProdObj.name },
            { label: language === 'bn' ? 'ক্যাটাগরি' : 'Category', value: selectedProdObj.categoryName },
            { label: language === 'bn' ? 'বারকোড' : 'Barcode', value: selectedProdObj.barcode || '-' },
            { label: language === 'bn' ? 'বর্তমান স্টক' : 'Current Stock', value: `${selectedProdObj.stock} ${selectedProdObj.unit}` },
          ],
          kpis: [
            { label: language === 'bn' ? 'বর্তমান স্টক ব্যালেন্স' : 'Current Stock Balance', value: `${selectedProdObj.stock} ${selectedProdObj.unit}` },
            { label: language === 'bn' ? 'ক্রয়মূল্য' : 'Cost Price', value: selectedProdObj.purchasePrice },
            { label: language === 'bn' ? 'বিক্রয়মূল্য' : 'Sales Price', value: selectedProdObj.salesPrice },
            { label: language === 'bn' ? 'মোট স্টক মূল্য' : 'Total Stock Valuation', value: selectedProdObj.stock * selectedProdObj.purchasePrice },
          ],
          columns: [
            { header: language === 'bn' ? 'তারিখ' : 'Date', key: 'date' },
            { header: language === 'bn' ? 'ধরন' : 'Type', key: 'type', align: 'center' },
            { header: language === 'bn' ? 'ভাউচার / ইনভয়েস #' : 'Voucher / Invoice #', key: 'ref' },
            { header: language === 'bn' ? 'বিবরণ / পার্টি' : 'Description / Party', key: 'description' },
            { header: language === 'bn' ? 'ইন (Qty)' : 'In Qty', key: 'inQty', align: 'center', format: 'number' },
            { header: language === 'bn' ? 'আউট (Qty)' : 'Out Qty', key: 'outQty', align: 'center', format: 'number' },
            { header: language === 'bn' ? 'দর (৳)' : 'Rate', key: 'rate', align: 'right', format: 'currency' },
            { header: language === 'bn' ? 'মোট টাকা (৳)' : 'Total Amount', key: 'total', align: 'right', format: 'currency' },
          ],
          rows: prodLedgerEntries,
        },
      });
    } else if (reportType === 'item-sales') {
      const isSingle = selectedSalesProduct !== null;
      const dateRangeText =
        salesStartDate && salesEndDate
          ? `${salesStartDate} to ${salesEndDate}`
          : salesStartDate
          ? `From ${salesStartDate}`
          : salesEndDate
          ? `Until ${salesEndDate}`
          : (language === 'bn' ? 'সকল সময়' : 'All Time');

      if (isSingle && selectedSalesProduct) {
        const totalDrillQty = selectedSalesProductDrilldown.reduce((sum, r) => sum + r.quantity, 0);
        const totalDrillRev = selectedSalesProductDrilldown.reduce((sum, r) => sum + r.total, 0);
        const reportTitle = language === 'bn' 
          ? `আইটেম বিক্রয় ড্রিলডাউন - ${selectedSalesProduct.name}`
          : `ITEM SALES REPORT - ${selectedSalesProduct.name.toUpperCase()}`;
        openPrintModal({
          type: 'REPORT',
          title: reportTitle,
          data: {
            reportTitle: reportTitle,
            period: dateRangeText,
            filters: [
              { label: language === 'bn' ? 'পণ্যের নাম' : 'Product Name', value: selectedSalesProduct.name },
              { label: language === 'bn' ? 'ক্যাটাগরি' : 'Category', value: selectedSalesProduct.categoryName },
              { label: language === 'bn' ? 'বারকোড' : 'Barcode', value: selectedSalesProduct.barcode || '-' },
            ],
            kpis: [
              { label: language === 'bn' ? 'মোট ইনভয়েস' : 'Invoices Count', value: selectedSalesProductDrilldown.length },
              { label: language === 'bn' ? 'বিক্রিত ইউনিট' : 'Total Units Sold', value: `${totalDrillQty} ${selectedSalesProduct.unit}` },
              { label: language === 'bn' ? 'মোট রাজস্ব' : 'Total Revenue', value: totalDrillRev },
            ],
            columns: [
              { header: language === 'bn' ? 'তারিখ' : 'Date', key: 'date' },
              { header: language === 'bn' ? 'ইনভয়েস #' : 'Invoice #', key: 'invoiceNumber' },
              { header: language === 'bn' ? 'কাস্টমার' : 'Customer', key: 'customerName' },
              { header: language === 'bn' ? 'বিক্রয় পরিমাণ' : 'Qty Sold', key: 'quantity', align: 'center', format: 'number' },
              { header: language === 'bn' ? 'একক দর' : 'Unit Price', key: 'unitPrice', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'ছাড়' : 'Discount', key: 'discount', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'মোট মূল্য' : 'Total Revenue', key: 'total', align: 'right', format: 'currency' },
            ],
            rows: selectedSalesProductDrilldown,
            totals: { quantity: totalDrillQty, total: totalDrillRev },
          },
        });
      } else {
        const reportTitle = language === 'bn' ? 'আইটেম ভিত্তিক বিক্রয় রিপোর্ট' : 'ITEM WISE SALES REPORT';
        openPrintModal({
          type: 'REPORT',
          title: reportTitle,
          data: {
            reportTitle: reportTitle,
            period: dateRangeText,
            filters: [
              {
                label: language === 'bn' ? 'ক্যাটাগরি' : 'Category',
                value:
                  salesCategoryId === 'ALL'
                    ? (language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories')
                    : categories.find(c => c.id === salesCategoryId)?.name || salesCategoryId,
              },
              { label: language === 'bn' ? 'অনুসন্ধান' : 'Search Query', value: salesSearch || (language === 'bn' ? 'সকল আইটেম' : 'None') },
            ],
            kpis: [
              { label: language === 'bn' ? 'তালিকাভুক্ত আইটেম' : 'Items Listed', value: itemWiseSalesData.length },
              { label: language === 'bn' ? 'মোট বিক্রিত ইউনিট' : 'Total Units Sold', value: totalSalesUnitsOverall },
              { label: language === 'bn' ? 'মোট বিক্রয় রাজস্ব' : 'Total Sales Revenue', value: totalSalesRevenueOverall },
            ],
            columns: [
              { header: language === 'bn' ? 'পণ্যের নাম' : 'Item Name', key: 'productName' },
              { header: language === 'bn' ? 'ক্যাটাগরি' : 'Category', key: 'categoryName' },
              { header: language === 'bn' ? 'বারকোড' : 'Barcode', key: 'barcode', align: 'center' },
              { header: language === 'bn' ? 'ইনভয়েস সংখ্যা' : 'Invoices', key: 'invoiceCount', align: 'center', format: 'number' },
              { header: language === 'bn' ? 'বিক্রিত ইউনিট' : 'Units Sold', key: 'soldQty', align: 'center', format: 'number' },
              { header: language === 'bn' ? 'গড় দর' : 'Avg Selling Price', key: 'avgPrice', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'মোট বিক্রয় (৳)' : 'Total Revenue', key: 'revenue', align: 'right', format: 'currency' },
            ],
            rows: itemWiseSalesData.map(i => ({
              productName: i.product.name,
              categoryName: i.product.categoryName,
              barcode: i.product.barcode || '-',
              invoiceCount: i.invoiceCount,
              soldQty: i.soldQty,
              avgPrice: i.avgPrice,
              revenue: i.revenue,
            })),
            totals: { soldQty: totalSalesUnitsOverall, revenue: totalSalesRevenueOverall },
          },
        });
      }
    } else if (reportType === 'item-purchase') {
      const isSingle = selectedPurchaseProduct !== null;
      const dateRangeText =
        purchaseStartDate && purchaseEndDate
          ? `${purchaseStartDate} to ${purchaseEndDate}`
          : purchaseStartDate
          ? `From ${purchaseStartDate}`
          : purchaseEndDate
          ? `Until ${purchaseEndDate}`
          : (language === 'bn' ? 'সকল সময়' : 'All Time');

      if (isSingle && selectedPurchaseProduct) {
        const totalDrillQty = selectedPurchaseProductDrilldown.reduce((sum, r) => sum + r.quantity, 0);
        const totalDrillSpend = selectedPurchaseProductDrilldown.reduce((sum, r) => sum + r.total, 0);
        const reportTitle = language === 'bn'
          ? `আইটেম ক্রয় ড্রিলডাউন - ${selectedPurchaseProduct.name}`
          : `ITEM PURCHASE REPORT - ${selectedPurchaseProduct.name.toUpperCase()}`;
        openPrintModal({
          type: 'REPORT',
          title: reportTitle,
          data: {
            reportTitle: reportTitle,
            period: dateRangeText,
            filters: [
              { label: language === 'bn' ? 'পণ্যের নাম' : 'Product Name', value: selectedPurchaseProduct.name },
              { label: language === 'bn' ? 'ক্যাটাগরি' : 'Category', value: selectedPurchaseProduct.categoryName },
              { label: language === 'bn' ? 'বারকোড' : 'Barcode', value: selectedPurchaseProduct.barcode || '-' },
            ],
            kpis: [
              { label: language === 'bn' ? 'মোট ক্রয় বিল' : 'Bills Count', value: selectedPurchaseProductDrilldown.length },
              { label: language === 'bn' ? 'মোট ক্রয় ইউনিট' : 'Total Units Purchased', value: `${totalDrillQty} ${selectedPurchaseProduct.unit}` },
              { label: language === 'bn' ? 'মোট ক্রয় খরচ' : 'Total Spend', value: totalDrillSpend },
            ],
            columns: [
              { header: language === 'bn' ? 'তারিখ' : 'Date', key: 'date' },
              { header: language === 'bn' ? 'বিল #' : 'Bill #', key: 'billNumber' },
              { header: language === 'bn' ? 'চালান / রেফারেন্স #' : 'Chalan / Ref #', key: 'supplierInvoiceNo' },
              { header: language === 'bn' ? 'সাপ্লায়ার' : 'Supplier', key: 'supplierName' },
              { header: language === 'bn' ? 'ক্রয় পরিমাণ' : 'Qty Purchased', key: 'quantity', align: 'center', format: 'number' },
              { header: language === 'bn' ? 'ক্রয় একক দর' : 'Unit Cost', key: 'purchasePrice', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'মোট খরচ (৳)' : 'Total Spend', key: 'total', align: 'right', format: 'currency' },
            ],
            rows: selectedPurchaseProductDrilldown,
            totals: { quantity: totalDrillQty, total: totalDrillSpend },
          },
        });
      } else {
        const reportTitle = language === 'bn' ? 'আইটেম ভিত্তিক ক্রয় রিপোর্ট' : 'ITEM WISE PURCHASE REPORT';
        openPrintModal({
          type: 'REPORT',
          title: reportTitle,
          data: {
            reportTitle: reportTitle,
            period: dateRangeText,
            filters: [
              {
                label: language === 'bn' ? 'ক্যাটাগরি' : 'Category',
                value:
                  purchaseCategoryId === 'ALL'
                    ? (language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories')
                    : categories.find(c => c.id === purchaseCategoryId)?.name || purchaseCategoryId,
              },
              { label: language === 'bn' ? 'অনুসন্ধান' : 'Search Query', value: purchaseSearch || (language === 'bn' ? 'সকল আইটেম' : 'None') },
            ],
            kpis: [
              { label: language === 'bn' ? 'তালিকাভুক্ত আইটেম' : 'Items Listed', value: itemWisePurchasesData.length },
              { label: language === 'bn' ? 'মোট ক্রয় ইউনিট' : 'Total Units Purchased', value: totalPurchaseUnitsOverall },
              { label: language === 'bn' ? 'মোট ক্রয় খরচ' : 'Total Spend Amount', value: totalPurchaseSpendOverall },
            ],
            columns: [
              { header: language === 'bn' ? 'পণ্যের নাম' : 'Item Name', key: 'productName' },
              { header: language === 'bn' ? 'ক্যাটাগরি' : 'Category', key: 'categoryName' },
              { header: language === 'bn' ? 'বারকোড' : 'Barcode', key: 'barcode', align: 'center' },
              { header: language === 'bn' ? 'বিল সংখ্যা' : 'Bills Count', key: 'billCount', align: 'center', format: 'number' },
              { header: language === 'bn' ? 'ক্রয়কৃত ইউনিট' : 'Units Purchased', key: 'purchasedQty', align: 'center', format: 'number' },
              { header: language === 'bn' ? 'গড় ক্রয় দর' : 'Avg Unit Cost', key: 'avgCost', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'মোট ক্রয় খরচ (৳)' : 'Total Spend', key: 'cost', align: 'right', format: 'currency' },
            ],
            rows: itemWisePurchasesData.map(i => ({
              productName: i.product.name,
              categoryName: i.product.categoryName,
              barcode: i.product.barcode || '-',
              billCount: i.billCount,
              purchasedQty: i.purchasedQty,
              avgCost: i.avgCost,
              cost: i.cost,
            })),
            totals: { purchasedQty: totalPurchaseUnitsOverall, cost: totalPurchaseSpendOverall },
          },
        });
      }
    } else if (reportType === 'pnl') {
      const isSingle = selectedPnlProduct !== null;
      const dateRangeText =
        pnlStartDate && pnlEndDate
          ? `${pnlStartDate} to ${pnlEndDate}`
          : pnlStartDate
          ? `From ${pnlStartDate}`
          : pnlEndDate
          ? `Until ${pnlEndDate}`
          : (language === 'bn' ? 'সকল সময়' : 'All Time');

      if (isSingle && selectedPnlProduct) {
        const totalQty = selectedPnlProductDrilldown.reduce((sum, r) => sum + r.quantity, 0);
        const totalRev = selectedPnlProductDrilldown.reduce((sum, r) => sum + r.revenue, 0);
        const totalCogs = selectedPnlProductDrilldown.reduce((sum, r) => sum + r.totalCost, 0);
        const totalProfit = totalRev - totalCogs;
        const reportTitle = language === 'bn'
          ? `আইটেম লাভ-ক্ষতি ড্রিলডাউন - ${selectedPnlProduct.name}`
          : `ITEM PROFIT & LOSS BREAKDOWN - ${selectedPnlProduct.name.toUpperCase()}`;
        openPrintModal({
          type: 'REPORT',
          title: reportTitle,
          data: {
            reportTitle: reportTitle,
            period: dateRangeText,
            filters: [
              { label: language === 'bn' ? 'পণ্যের নাম' : 'Product Name', value: selectedPnlProduct.name },
              { label: language === 'bn' ? 'ক্যাটাগরি' : 'Category', value: selectedPnlProduct.categoryName },
            ],
            kpis: [
              { label: language === 'bn' ? 'মোট বিক্রয় রাজস্ব' : 'Total Revenue', value: totalRev },
              { label: language === 'bn' ? 'মোট ক্রয় খরচ (COGS)' : 'Total Cost (COGS)', value: totalCogs },
              { label: language === 'bn' ? 'মোট গ্রস লাভ' : 'Gross Profit', value: totalProfit },
            ],
            columns: [
              { header: language === 'bn' ? 'তারিখ' : 'Date', key: 'date' },
              { header: language === 'bn' ? 'ইনভয়েস #' : 'Invoice #', key: 'invoiceNumber' },
              { header: language === 'bn' ? 'কাস্টমার' : 'Customer', key: 'customerName' },
              { header: language === 'bn' ? 'পরিমাণ' : 'Qty', key: 'quantity', align: 'center', format: 'number' },
              { header: language === 'bn' ? 'বিক্রয় মূল্য' : 'Revenue', key: 'revenue', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'ক্রয় খরচ' : 'Cost (COGS)', key: 'totalCost', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'লাভ (Profit)' : 'Gross Profit', key: 'grossProfit', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'মার্জিন %' : 'Margin %', key: 'margin', align: 'center' },
            ],
            rows: selectedPnlProductDrilldown,
            totals: { quantity: totalQty, revenue: totalRev, totalCost: totalCogs, grossProfit: totalProfit },
          },
        });
      } else {
        const reportTitle = language === 'bn' ? 'আইটেম ভিত্তিক লাভ-ক্ষতি ও মার্জিন রিপোর্ট' : 'ITEM PROFIT & LOSS ANALYSIS REPORT';
        openPrintModal({
          type: 'REPORT',
          title: reportTitle,
          data: {
            reportTitle: reportTitle,
            period: dateRangeText,
            filters: [
              {
                label: language === 'bn' ? 'ক্যাটাগরি' : 'Category',
                value:
                  pnlCategoryId === 'ALL'
                    ? (language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories')
                    : categories.find(c => c.id === pnlCategoryId)?.name || pnlCategoryId,
              },
              { label: language === 'bn' ? 'অনুসন্ধান' : 'Search Query', value: pnlSearch || (language === 'bn' ? 'সকল আইটেম' : 'None') },
            ],
            kpis: [
              { label: language === 'bn' ? 'মোট বিক্রয় রাজস্ব' : 'Total Revenue', value: totalPnlRevenueOverall },
              { label: language === 'bn' ? 'মোট ক্রয় খরচ (COGS)' : 'Total Cost (COGS)', value: totalPnlCogsOverall },
              { label: language === 'bn' ? 'মোট গ্রস লাভ' : 'Total Gross Profit', value: totalPnlProfitOverall },
              { label: language === 'bn' ? 'গড় মার্জিন %' : 'Average Margin', value: `${totalPnlMarginOverall}%` },
            ],
            columns: [
              { header: language === 'bn' ? 'পণ্যের নাম' : 'Item Name', key: 'productName' },
              { header: language === 'bn' ? 'ক্যাটাগরি' : 'Category', key: 'categoryName' },
              { header: language === 'bn' ? 'বারকোড' : 'Barcode', key: 'barcode', align: 'center' },
              { header: language === 'bn' ? 'বিক্রিত Qty' : 'Sold Qty', key: 'soldQty', align: 'center', format: 'number' },
              { header: language === 'bn' ? 'মোট বিক্রয়' : 'Revenue', key: 'revenue', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'ক্রয় খরচ (COGS)' : 'Cost (COGS)', key: 'cogs', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'মোট লাভ' : 'Gross Profit', key: 'profit', align: 'right', format: 'currency' },
              { header: language === 'bn' ? 'মার্জিন %' : 'Margin %', key: 'margin', align: 'center' },
            ],
            rows: itemPnlData.map(i => ({
              productName: i.product.name,
              categoryName: i.product.categoryName,
              barcode: i.product.barcode || '-',
              soldQty: i.soldQty,
              revenue: i.revenue,
              cogs: i.cogs,
              profit: i.profit,
              margin: `${i.margin}%`,
            })),
            totals: { revenue: totalPnlRevenueOverall, cogs: totalPnlCogsOverall, profit: totalPnlProfitOverall },
          },
        });
      }
    } else if (reportType === 'party-ledger') {
      if (!selectedPartyObj) return;
      const reportTitle = language === 'bn'
        ? `পার্টি লেজার ও লেনদেন বিবরণী - ${selectedPartyObj.name}`
        : `PARTY STATEMENT & TRANSACTION LEDGER - ${selectedPartyObj.name.toUpperCase()}`;
      openPrintModal({
        type: 'REPORT',
        title: reportTitle,
        data: {
          reportTitle: reportTitle,
          period: language === 'bn' ? 'সম্পূর্ণ লেনদেন হিস্ট্রি' : 'Full Transaction History',
          filters: [
            { label: language === 'bn' ? 'পার্টির নাম' : 'Party Name', value: selectedPartyObj.name },
            { label: language === 'bn' ? 'পার্টির ধরন' : 'Type', value: selectedPartyObj.type },
            { label: language === 'bn' ? 'মোবাইল' : 'Phone', value: selectedPartyObj.phone || '-' },
            { label: language === 'bn' ? 'ঠিকানা' : 'Address', value: selectedPartyObj.address || '-' },
          ],
          kpis: [
            { label: language === 'bn' ? 'প্রারম্ভিক ব্যালেন্স' : 'Opening Balance', value: selectedPartyObj.openingBalance || 0 },
            { label: language === 'bn' ? 'বর্তমান ব্যালেন্স / বকেয়া' : 'Current Balance / Due', value: selectedPartyObj.currentBalance || 0 },
          ],
          columns: [
            { header: language === 'bn' ? 'তারিখ' : 'Date', key: 'date' },
            { header: language === 'bn' ? 'ধরন' : 'Type', key: 'type', align: 'center' },
            { header: language === 'bn' ? 'ভাউচার / রেফারেন্স #' : 'Voucher / Ref #', key: 'refNo' },
            { header: language === 'bn' ? 'বিবরণ / মন্তব্য' : 'Particulars / Remarks', key: 'remarks' },
            { header: language === 'bn' ? 'জমা / ইনফ্লো (৳)' : 'Inflow / Cr (৳)', key: 'credit', align: 'right', format: 'currency' },
            { header: language === 'bn' ? 'খরচ / আউটফ্লো (৳)' : 'Outflow / Dr (৳)', key: 'debit', align: 'right', format: 'currency' },
            { header: language === 'bn' ? 'হিসাব / ওয়ালেট' : 'Account / Wallet', key: 'wallet' },
          ],
          rows: partyTransactions.map(t => ({
            date: t.date,
            type: t.type,
            refNo: t.referenceNo || t.id,
            remarks: t.remarks || '-',
            credit: t.flow === 'IN' ? t.amount : 0,
            debit: t.flow === 'OUT' ? t.amount : 0,
            wallet: t.walletName || '-',
          })),
        },
      });
    }
  };

  const handleExportCurrentReport = () => {
    if (!canUserExportReportCsv(currentUser)) {
      showToast(
        language === 'bn'
          ? 'আপনার রিপোর্ট থেকে CSV এক্সপোর্ট করার অনুমতি নেই।'
          : 'You do not have permission to Export CSV from Reports & Analytics.',
        'error'
      );
      return;
    }

    if (reportType === 'summary') {
      handleExportCSV('Stock_Summary',
        ['Product Name', 'Generic', 'Brand / Manufacturer', 'Category', 'Barcode', 'In Stock', 'Purchase Price', 'Sales Price', 'Total Cost Value', 'Total Retail Value'],
        products.map(p => [p.name, p.generic || '-', p.manufacturer || '-', p.categoryName, p.barcode || '-', `${p.stock} ${p.unit}`, p.purchasePrice, p.salesPrice, p.stock * p.purchasePrice, p.stock * p.salesPrice])
      );
    } else if (reportType === 'ledger') {
      if (!selectedProdObj) return;
      handleExportCSV(`Item_Ledger_${selectedProdObj.name.replace(/\s+/g, '_')}`,
        ['Date', 'Type', 'Voucher / Ref', 'Description', 'In Qty', 'Out Qty', 'Rate', 'Total Amount'],
        prodLedgerEntries.map(e => [e.date, e.type, e.ref, e.description, e.inQty, e.outQty, e.rate, e.total])
      );
    } else if (reportType === 'item-sales') {
      const isSingle = selectedSalesProduct !== null;
      if (isSingle && selectedSalesProduct) {
        handleExportCSV(`Sales_Drilldown_${selectedSalesProduct.name.replace(/\s+/g, '_')}`,
          ['Date', 'Invoice #', 'Customer', 'Qty Sold', 'Unit Price', 'Discount', 'Total Revenue'],
          selectedSalesProductDrilldown.map(r => [r.date, r.invoiceNumber, r.customerName, r.quantity, r.unitPrice, r.discount, r.total])
        );
      } else {
        handleExportCSV('Item_Wise_Sales',
          ['Item Name', 'Generic', 'Brand / Manufacturer', 'Category', 'Barcode', 'Invoices', 'Units Sold', 'Avg Price', 'Total Revenue'],
          itemWiseSalesData.map(i => [i.product.name, i.product.generic || '-', i.product.manufacturer || '-', i.product.categoryName, i.product.barcode || '-', i.invoiceCount, i.soldQty, i.avgPrice.toFixed(2), i.revenue])
        );
      }
    } else if (reportType === 'item-purchase') {
      const isSingle = selectedPurchaseProduct !== null;
      if (isSingle && selectedPurchaseProduct) {
        handleExportCSV(`Purchase_Drilldown_${selectedPurchaseProduct.name.replace(/\s+/g, '_')}`,
          ['Date', 'Bill #', 'Chalan/Ref #', 'Supplier', 'Qty Purchased', 'Unit Cost', 'Total Spend'],
          selectedPurchaseProductDrilldown.map(r => [r.date, r.billNumber, r.supplierInvoiceNo || '-', r.supplierName, r.quantity, r.purchasePrice, r.total])
        );
      } else {
        handleExportCSV('Item_Wise_Purchase',
          ['Item Name', 'Generic', 'Brand / Manufacturer', 'Category', 'Barcode', 'Bills Count', 'Units Purchased', 'Avg Cost', 'Total Spend'],
          itemWisePurchasesData.map(i => [i.product.name, i.product.generic || '-', i.product.manufacturer || '-', i.product.categoryName, i.product.barcode || '-', i.billCount, i.purchasedQty, i.avgCost.toFixed(2), i.cost])
        );
      }
    } else if (reportType === 'pnl') {
      const isSingle = selectedPnlProduct !== null;
      if (isSingle && selectedPnlProduct) {
        handleExportCSV(`Profit_Loss_Drilldown_${selectedPnlProduct.name.replace(/\s+/g, '_')}`,
          ['Date', 'Invoice #', 'Customer', 'Qty', 'Revenue', 'Cost (COGS)', 'Gross Profit', 'Margin %'],
          selectedPnlProductDrilldown.map(r => [r.date, r.invoiceNumber, r.customerName, r.quantity, r.revenue, r.totalCost, r.grossProfit, r.margin])
        );
      } else {
        handleExportCSV('Item_Profit_Loss',
          ['Item Name', 'Generic', 'Brand / Manufacturer', 'Category', 'Barcode', 'Sold Qty', 'Revenue', 'Cost (COGS)', 'Gross Profit', 'Margin %'],
          itemPnlData.map(i => [i.product.name, i.product.generic || '-', i.product.manufacturer || '-', i.product.categoryName, i.product.barcode || '-', i.soldQty, i.revenue, i.cogs, i.profit, i.margin])
        );
      }
    } else if (reportType === 'party-ledger') {
      if (!selectedPartyObj) return;
      handleExportCSV(`Party_Ledger_${selectedPartyObj.name.replace(/\s+/g, '_')}`,
        ['Date', 'Type', 'Voucher / Ref #', 'Remarks', 'Inflow / Cr', 'Outflow / Dr', 'Wallet'],
        partyTransactions.map(t => [t.date, t.type, t.referenceNo || t.id, t.remarks || '-', t.flow === 'IN' ? t.amount : 0, t.flow === 'OUT' ? t.amount : 0, t.walletName || '-'])
      );
    }
  };

  const handlePrint = handlePrintCurrentReport;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>{language === 'bn' ? 'রিপোর্ট ও বিশ্লেষণ কেন্দ্র' : 'Enterprise Reports & Analytics'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'bn'
              ? 'আইটেম ভিত্তিক বিক্রয় ও ক্রয় রিপোর্ট, আইটেম প্রফিট/লস এবং সার্বিক ব্যবসা বিশ্লেষণ'
              : 'Item-wise sales & purchase reports, item profit & loss analysis, and full business ledger'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const hasExportPerm = canUserExportReportCsv(currentUser);
            const hasPdfPerm = canUserDownloadReportPdf(currentUser);
            const hasPrintPerm = canUserPrintReportStatement(currentUser);

            return (
              <>
                <button
                  type="button"
                  onClick={handleExportCurrentReport}
                  title={
                    !hasExportPerm
                      ? (language === 'bn' ? 'CSV এক্সপোর্ট করার পারমিশন নেই' : 'No permission to Export CSV')
                      : (language === 'bn' ? 'এক্সপোর্ট (CSV)' : 'Export CSV')
                  }
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                    hasExportPerm
                      ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 cursor-pointer'
                      : 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-75'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{language === 'bn' ? 'এক্সপোর্ট (CSV)' : 'Export CSV'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintCurrentReport(true)}
                  title={
                    !hasPdfPerm
                      ? (language === 'bn' ? 'PDF ডাউনলোড করার পারমিশন নেই' : 'No permission to Download PDF')
                      : (language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF')
                  }
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs ${
                    hasPdfPerm
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-75'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>{language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintCurrentReport(false)}
                  title={
                    !hasPrintPerm
                      ? (language === 'bn' ? 'স্টেটমেন্ট প্রিন্ট করার পারমিশন নেই' : 'No permission to Print Statement')
                      : (language === 'bn' ? 'প্রিন্ট রিপোর্ট' : 'Print Statement')
                  }
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                    hasPrintPerm
                      ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-pointer'
                      : 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-75'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === 'bn' ? 'প্রিন্ট রিপোর্ট' : 'Print Statement'}</span>
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* Date-to-Date / Daily / Monthly Report Filter Bar */}
      <DatePeriodFilter
        startDate={globalStartDate}
        endDate={globalEndDate}
        onChange={handlePeriodChange}
        language={language}
      />

      {/* Navigation Sub-Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setReportType('summary')}
          className={`py-2 px-1.5 rounded-lg font-semibold truncate transition-colors cursor-pointer text-center ${
            reportType === 'summary'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
          }`}
          title={language === 'bn' ? 'স্টক সারসংক্ষেপ' : 'Stock Summary'}
        >
          {language === 'bn' ? 'স্টক সামারি' : 'Stock Summary'}
        </button>
        <button
          type="button"
          onClick={() => setReportType('low-stock')}
          className={`py-2 px-1.5 rounded-lg font-semibold truncate transition-colors cursor-pointer text-center flex items-center justify-center gap-1 ${
            reportType === 'low-stock'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
          }`}
          title={language === 'bn' ? 'স্টক অ্যালার্ট রিপোর্ট' : 'Low Stock Report'}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'স্টক অ্যালার্ট রিপোর্ট' : 'Low Stock Report'}</span>
        </button>
        <button
          type="button"
          onClick={() => setReportType('batch-report')}
          className={`py-2 px-1.5 rounded-lg font-semibold truncate transition-colors cursor-pointer text-center flex items-center justify-center gap-1 ${
            reportType === 'batch-report'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
          }`}
          title={language === 'bn' ? 'ব্যাচ ও মেয়াদভিত্তিক রিপোর্ট' : 'Batch & Expiry Report'}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'ব্যাচ ও মেয়াদ রিপোর্ট' : 'Batch Report'}</span>
        </button>
        <button
          type="button"
          onClick={() => setReportType('ledger')}
          className={`py-2 px-1.5 rounded-lg font-semibold truncate transition-colors cursor-pointer text-center ${
            reportType === 'ledger'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
          }`}
          title={language === 'bn' ? 'আইটেম লেজার' : 'Item Details & Ledger'}
        >
          {language === 'bn' ? 'আইটেম লেজার' : 'Item Ledger'}
        </button>
        <button
          type="button"
          onClick={() => setReportType('item-sales')}
          className={`py-2 px-1.5 rounded-lg font-semibold truncate transition-colors cursor-pointer text-center ${
            reportType === 'item-sales'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
          }`}
          title={language === 'bn' ? 'আইটেম ভিত্তিক বিক্রয়' : 'Item Wise Sales'}
        >
          {language === 'bn' ? 'আইটেম বিক্রয়' : 'Item Sales'}
        </button>
        <button
          type="button"
          onClick={() => setReportType('item-purchase')}
          className={`py-2 px-1.5 rounded-lg font-semibold truncate transition-colors cursor-pointer text-center ${
            reportType === 'item-purchase'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
          }`}
          title={language === 'bn' ? 'আইটেম ভিত্তিক ক্রয়' : 'Item Wise Purchase'}
        >
          {language === 'bn' ? 'আইটেম ক্রয়' : 'Item Purchase'}
        </button>
        <button
          type="button"
          onClick={() => setReportType('pnl')}
          className={`py-2 px-1.5 rounded-lg font-semibold truncate transition-colors cursor-pointer text-center ${
            reportType === 'pnl'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
          }`}
          title={language === 'bn' ? 'আইটেম লাভ ও ক্ষতি' : 'Item Profit & Loss'}
        >
          {language === 'bn' ? 'লাভ-ক্ষতি (P&L)' : 'Item P&L'}
        </button>
        <button
          type="button"
          onClick={() => setReportType('party-ledger')}
          className={`py-2 px-1.5 rounded-lg font-semibold truncate transition-colors cursor-pointer text-center ${
            reportType === 'party-ledger'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
          }`}
          title={language === 'bn' ? 'পার্টি লেজার ও স্টেটমেন্ট' : 'By Party Item & Transaction'}
        >
          {language === 'bn' ? 'পার্টি লেজার' : 'Party Ledger'}
        </button>
      </div>

      {/* BATCH & EXPIRY REPORT */}
      {reportType === 'batch-report' && <BatchReportView />}

      {/* LOW STOCK REPORT VIEW */}
      {reportType === 'low-stock' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                {language === 'bn' ? 'কম স্টক আইটেম' : 'Low Stock Items'}
              </span>
              <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
                {lowStockReportItems.length} {language === 'bn' ? 'টি পণ্য' : 'Items'}
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {language === 'bn' ? 'মোট ঘাটতি পরিমাণ' : 'Total Deficit Units'}
              </span>
              <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                {lowStockReportItems.reduce((sum, p) => sum + Math.max(0, Number(p.reorderLevel || 0) - Number(p.stock || 0)), 0)} Units
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  {language === 'bn' ? 'পুনরায় পূরণের আনুমানিক খরচ' : 'Restock Cost Value'}
                </span>
                <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                  {formatCurrency(lowStockReportItems.reduce((sum, p) => sum + (Math.max(0, Number(p.reorderLevel || 0) - Number(p.stock || 0)) * Number(p.purchasePrice || 0)), 0))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportLowStockCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{language === 'bn' ? 'CSV এক্সপোর্ট' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {language === 'bn' ? 'ক্যাটাগরি ফিল্টার' : 'Category Filter'}
              </label>
              <select
                value={lowStockCategoryId}
                onChange={e => setLowStockCategoryId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
              >
                <option value="ALL">{language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {language === 'bn' ? 'সাপ্লায়ার / প্রস্তুতকারক' : 'Supplier / Manufacturer'}
              </label>
              <select
                value={lowStockSupplierId}
                onChange={e => setLowStockSupplierId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
              >
                <option value="ALL">{language === 'bn' ? 'সকল সাপ্লায়ার' : 'All Suppliers'}</option>
                {availableSuppliers.map(sup => (
                  <option key={sup} value={sup}>
                    {sup}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {language === 'bn' ? 'অনুসন্ধান (Search)' : 'Search Product'}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'নাম, SKU বা কোড লিখে খুঁজুন...' : 'Search name, SKU...'}
                  value={lowStockSearch}
                  onChange={e => setLowStockSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">{language === 'bn' ? 'পণ্যের নাম ও SKU' : 'Product & SKU'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'সাপ্লায়ার / প্রস্তুতকারক' : 'Supplier'}</th>
                    <th className="py-3 px-4 text-center">{language === 'bn' ? 'বর্তমান স্টক' : 'Current Stock'}</th>
                    <th className="py-3 px-4 text-center">{language === 'bn' ? 'ন্যূনতম লেভেল' : 'Min Level'}</th>
                    <th className="py-3 px-4 text-right">{language === 'bn' ? 'ক্রয় মূল্য' : 'Purchase Price'}</th>
                    <th className="py-3 px-4 text-right">{language === 'bn' ? 'বিক্রয় মূল্য' : 'Sales Price'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lowStockReportItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        {language === 'bn' ? 'কোনো কম স্টক পণ্য পাওয়া যায়নি।' : 'No low stock items found matching filters.'}
                      </td>
                    </tr>
                  ) : (
                    lowStockReportItems.map(p => {
                      const catName = categories.find(c => c.id === p.categoryId)?.name || p.categoryName || 'General';
                      const supplierName = p.manufacturer || p.batches?.[0]?.supplierName || 'General Supplier';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            <div>{p.name}</div>
                            {p.sku && <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{catName}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{supplierName}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                            {Number(p.stock || 0)} {p.unit || 'Pcs'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-500">
                            ≤ {Number(p.reorderLevel || 0)} {p.unit || 'Pcs'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                            {formatCurrency(p.purchasePrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-emerald-600">
                            {formatCurrency(p.salesPrice)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1. PRODUCT & STOCK SUMMARY */}
      {reportType === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Items</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {filteredStockSummaryProducts.length} Products
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Stock Asset Valuation (Cost)</span>
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(filteredStockSummaryProducts.reduce((sum, p) => sum + (Number(p.stock || 0) * Number(p.purchasePrice || 0)), 0))}
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Retail Valuation (Sales)</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(filteredStockSummaryProducts.reduce((sum, p) => sum + (Number(p.stock || 0) * Number(p.salesPrice || 0)), 0))}
              </div>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                </label>
                <select
                  value={summaryCategoryId}
                  onChange={e => setSummaryCategoryId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {isPharmacyMode && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {language === 'bn' ? 'জেনেরিক' : 'Generic'}
                  </label>
                  <select
                    value={summaryGeneric}
                    onChange={e => setSummaryGeneric(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="ALL">All Generics</option>
                    {availableGenerics.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'ব্র্যান্ড' : 'Brand'}
                </label>
                <select
                  value={summaryManufacturer}
                  onChange={e => setSummaryManufacturer(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Brands</option>
                  {availableManufacturers.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'সার্চ' : 'Search Text'}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={summarySearch}
                    onChange={e => setSummarySearch(e.target.value)}
                    placeholder="Search name, barcode..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-4">Item Name & SKU</th>
                  {isPharmacyMode && <th className="py-2.5 px-4">Generic</th>}
                  <th className="py-2.5 px-4">Brand / Manufacturer</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Available Stock</th>
                  <th className="py-2.5 px-4 text-right">Cost Price</th>
                  <th className="py-2.5 px-4 text-right">Sales Price</th>
                  <th className="py-2.5 px-4 text-right">Total Asset Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredStockSummaryProducts.length === 0 ? (
                  <tr>
                    <td colSpan={isPharmacyMode ? 8 : 7} className="py-8 text-center text-slate-400">
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  filteredStockSummaryProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                        {p.name}
                        {p.barcode && <span className="text-[10px] text-slate-400 ml-2 font-mono">({p.barcode})</span>}
                      </td>
                      {isPharmacyMode && (
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-medium">{p.generic || '—'}</td>
                      )}
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-medium">{p.manufacturer || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-500">{p.categoryName}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        <span className={p.stock <= (p.reorderLevel || 5) ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}>
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(p.purchasePrice)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(p.salesPrice)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                        {formatCurrency(p.stock * p.purchasePrice)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. ITEM DETAILS & LEDGER */}
      {reportType === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Select Target Product</span>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="block mt-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedProdObj && (
              <div className="text-right text-xs">
                <span className="text-slate-400">Current In-Stock: </span>
                <span className="font-mono font-bold text-blue-600 text-sm">
                  {selectedProdObj.stock} {selectedProdObj.unit}
                </span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Voucher / Ref</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">In Qty</th>
                  <th className="py-2.5 px-4 text-right">Out Qty</th>
                  <th className="py-2.5 px-4 text-right">Rate</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {prodLedgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No stock movement ledger records found for this product.
                    </td>
                  </tr>
                ) : (
                  prodLedgerEntries.map((e, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-500">{e.date}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {e.ref}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{e.description}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-sky-600 font-bold">
                        {e.inQty > 0 ? `+${e.inQty}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-bold">
                        {e.outQty > 0 ? `-${e.outQty}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(e.rate)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">{formatCurrency(e.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ITEM WISE SALES REPORT (WITH DEDICATED ITEM SELECTOR & DRILLDOWN) */}
      {reportType === 'item-sales' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'bn' ? 'আইটেম ভিত্তিক বিক্রয় রিপোর্ট' : 'Item Wise Sales Analysis & Report'}
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const headers = ['Item Name', 'Generic', 'Brand / Manufacturer', 'Category', 'Barcode', 'Units Sold', 'Avg Sales Price', 'Total Revenue'];
                    const rows = itemWiseSalesData.map(item => [
                      item.product.name,
                      item.product.generic || '—',
                      item.product.manufacturer || '—',
                      item.product.categoryName,
                      item.product.barcode || '',
                      item.soldQty,
                      item.avgPrice.toFixed(2),
                      item.revenue.toFixed(2),
                    ]);
                    handleExportCSV('Item_Sales_Report', headers, rows);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSalesItemId('ALL');
                    setSalesCategoryId('ALL');
                    setSalesGeneric('ALL');
                    setSalesManufacturer('ALL');
                    setSalesSearch('');
                    setSalesStartDate('');
                    setSalesEndDate('');
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
              {/* 1. Item Selector Dropdown */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>{language === 'bn' ? 'নির্দিষ্ট আইটেম নির্বাচন করুন:' : 'Select Specific Item:'}</span>
                </label>
                <select
                  value={salesItemId}
                  onChange={e => setSalesItemId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">🌟 {language === 'bn' ? 'সকল আইটেম (All Items)' : 'All Items (Overview)'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.barcode ? `[${p.barcode}]` : ''} — Stock: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Category Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                </label>
                <select
                  value={salesCategoryId}
                  onChange={e => setSalesCategoryId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2.5 Generic Filter */}
              {isPharmacyMode && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {language === 'bn' ? 'জেনেরিক' : 'Generic'}
                  </label>
                  <select
                    value={salesGeneric}
                    onChange={e => setSalesGeneric(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="ALL">All Generics</option>
                    {availableGenerics.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2.6 Brand Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'ব্র্যান্ড' : 'Brand'}
                </label>
                <select
                  value={salesManufacturer}
                  onChange={e => setSalesManufacturer(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Brands</option>
                  {availableManufacturers.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 3. Search Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'সার্চ' : 'Search Text'}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={salesSearch}
                    onChange={e => setSalesSearch(e.target.value)}
                    placeholder="Search name, barcode..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* 4. Date Range Start */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'তারিখ থেকে' : 'From Date'}
                </label>
                <input
                  type="date"
                  value={salesStartDate}
                  onChange={e => setSalesStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              {/* 5. Date Range End */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'তারিখ পর্যন্ত' : 'To Date'}
                </label>
                <input
                  type="date"
                  value={salesEndDate}
                  onChange={e => setSalesEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedSalesProduct ? 'Item Total Sold' : 'Total Units Sold'}
              </span>
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                {selectedSalesProduct
                  ? `${selectedSalesProductDrilldown.reduce((sum, d) => sum + d.quantity, 0)} ${selectedSalesProduct.unit}`
                  : `${totalSalesUnitsOverall} Units`}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedSalesProduct ? 'Item Sales Revenue' : 'Total Sales Revenue'}
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(
                  selectedSalesProduct
                    ? selectedSalesProductDrilldown.reduce((sum, d) => sum + d.total, 0)
                    : totalSalesRevenueOverall
                )}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedSalesProduct ? 'Avg. Sales Rate' : 'Total Items Listed'}
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {selectedSalesProduct
                  ? formatCurrency(
                      selectedSalesProductDrilldown.reduce((sum, d) => sum + d.quantity, 0) > 0
                        ? selectedSalesProductDrilldown.reduce((sum, d) => sum + d.total, 0) /
                            selectedSalesProductDrilldown.reduce((sum, d) => sum + d.quantity, 0)
                        : selectedSalesProduct.salesPrice
                    )
                  : `${itemWiseSalesData.length} Items`}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedSalesProduct ? 'Current In-Stock' : 'Sales Invoices Count'}
              </span>
              <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {selectedSalesProduct
                  ? `${selectedSalesProduct.stock} ${selectedSalesProduct.unit}`
                  : `${filteredSalesInvoices.length} Invoices`}
              </div>
            </div>
          </div>

          {/* If Single Item Selected: Show Item Drilldown Table */}
          {selectedSalesProduct ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    {language === 'bn' ? 'বিক্রয় চালান ও কাস্টমার বিস্তারিত:' : 'Sales Invoice & Customer Drilldown:'}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded font-semibold text-xs">
                    {selectedSalesProduct.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSalesItemId('ALL')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  ← {language === 'bn' ? 'সকল আইটেমে ফিরে যান' : 'Back to All Items'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Invoice No</th>
                      <th className="py-2.5 px-4">Customer Name & Phone</th>
                      <th className="py-2.5 px-4 text-right">Sold Quantity</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-right">Line Discount</th>
                      <th className="py-2.5 px-4 text-right">Invoice Item Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedSalesProductDrilldown.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          {language === 'bn'
                            ? 'এই আইটেমের জন্য কোনো বিক্রয় রেকর্ড পাওয়া যায়নি।'
                            : 'No sales records found for this item in the selected period.'}
                        </td>
                      </tr>
                    ) : (
                      selectedSalesProductDrilldown.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{row.date}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {row.invoiceNumber}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {row.customerName}
                            {row.customerPhone && (
                              <span className="text-[10px] text-slate-400 ml-1.5">({row.customerPhone})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                            {row.quantity} {row.unit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(row.unitPrice)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                            {row.discount > 0 ? formatCurrency(row.discount) : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(row.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {selectedSalesProductDrilldown.length > 0 && (
                    <tfoot className="bg-slate-50 dark:bg-slate-850 font-bold border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400 uppercase">
                          Item Total:
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-blue-600">
                          {selectedSalesProductDrilldown.reduce((sum, d) => sum + d.quantity, 0)} {selectedSalesProduct.unit}
                        </td>
                        <td colSpan={2}></td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-600 text-sm">
                          {formatCurrency(selectedSalesProductDrilldown.reduce((sum, d) => sum + d.total, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            /* If All Items Selected: Show All Items Summary Table */
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-4">Item Name & SKU</th>
                      {isPharmacyMode && <th className="py-2.5 px-4">Generic</th>}
                      <th className="py-2.5 px-4">Brand / Manufacturer</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">In-Stock</th>
                      <th className="py-2.5 px-4 text-right">Units Sold</th>
                      <th className="py-2.5 px-4 text-right">Avg. Sales Price</th>
                      <th className="py-2.5 px-4 text-right">Total Revenue</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {itemWiseSalesData.length === 0 ? (
                      <tr>
                        <td colSpan={isPharmacyMode ? 9 : 8} className="py-8 text-center text-slate-400">
                          No matching products found for sales report.
                        </td>
                      </tr>
                    ) : (
                      itemWiseSalesData.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                            {s.product.name}
                            {s.product.barcode && (
                              <span className="text-[10px] text-slate-400 ml-1.5 font-mono">[{s.product.barcode}]</span>
                            )}
                          </td>
                          {isPharmacyMode && (
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-medium">{s.product.generic || '—'}</td>
                          )}
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-medium">{s.product.manufacturer || '—'}</td>
                          <td className="py-2.5 px-4 text-slate-500">{s.product.categoryName}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {s.product.stock} {s.product.unit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                            {s.soldQty} {s.product.unit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(s.avgPrice)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(s.revenue)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSalesItemId(s.product.id)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              View Item Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-850 font-bold border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400 uppercase">
                        Total Summary:
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-blue-600">
                        {totalSalesUnitsOverall} Units
                      </td>
                      <td></td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-600 text-sm">
                        {formatCurrency(totalSalesRevenueOverall)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ITEM WISE PURCHASE REPORT (WITH DEDICATED ITEM SELECTOR & DRILLDOWN) */}
      {reportType === 'item-purchase' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'bn' ? 'আইটেম ভিত্তিক ক্রয় রিপোর্ট' : 'Item Wise Purchase Analysis & Report'}
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const headers = ['Item Name', 'Generic', 'Brand / Manufacturer', 'Category', 'Barcode', 'Units Purchased', 'Unit Cost', 'Total Spend'];
                    const rows = itemWisePurchasesData.map(item => [
                      item.product.name,
                      item.product.generic || '—',
                      item.product.manufacturer || '—',
                      item.product.categoryName,
                      item.product.barcode || '',
                      item.purchasedQty,
                      item.avgCost.toFixed(2),
                      item.cost.toFixed(2),
                    ]);
                    handleExportCSV('Item_Purchase_Report', headers, rows);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseItemId('ALL');
                    setPurchaseCategoryId('ALL');
                    setPurchaseGeneric('ALL');
                    setPurchaseManufacturer('ALL');
                    setPurchaseSearch('');
                    setPurchaseStartDate('');
                    setPurchaseEndDate('');
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
              {/* 1. Item Selector Dropdown */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>{language === 'bn' ? 'নির্দিষ্ট আইটেম নির্বাচন করুন:' : 'Select Specific Item:'}</span>
                </label>
                <select
                  value={purchaseItemId}
                  onChange={e => setPurchaseItemId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">🌟 {language === 'bn' ? 'সকল আইটেম (All Items)' : 'All Items (Overview)'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.barcode ? `[${p.barcode}]` : ''} — Current Stock: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Category Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                </label>
                <select
                  value={purchaseCategoryId}
                  onChange={e => setPurchaseCategoryId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2.5 Generic Filter */}
              {isPharmacyMode && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {language === 'bn' ? 'জেনেরিক' : 'Generic'}
                  </label>
                  <select
                    value={purchaseGeneric}
                    onChange={e => setPurchaseGeneric(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="ALL">All Generics</option>
                    {availableGenerics.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2.6 Brand Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'ব্র্যান্ড' : 'Brand'}
                </label>
                <select
                  value={purchaseManufacturer}
                  onChange={e => setPurchaseManufacturer(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Brands</option>
                  {availableManufacturers.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 3. Search Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'সার্চ' : 'Search Text'}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={purchaseSearch}
                    onChange={e => setPurchaseSearch(e.target.value)}
                    placeholder="Search name, barcode..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* 4. Date Range Start */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'তারিখ থেকে' : 'From Date'}
                </label>
                <input
                  type="date"
                  value={purchaseStartDate}
                  onChange={e => setPurchaseStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              {/* 5. Date Range End */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'তারিখ পর্যন্ত' : 'To Date'}
                </label>
                <input
                  type="date"
                  value={purchaseEndDate}
                  onChange={e => setPurchaseEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedPurchaseProduct ? 'Item Units Purchased' : 'Total Units Purchased'}
              </span>
              <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {selectedPurchaseProduct
                  ? `${selectedPurchaseProductDrilldown.reduce((sum, d) => sum + d.quantity, 0)} ${selectedPurchaseProduct.unit}`
                  : `${totalPurchaseUnitsOverall} Units`}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedPurchaseProduct ? 'Total Purchase Spend' : 'Total Purchase Procurement'}
              </span>
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(
                  selectedPurchaseProduct
                    ? selectedPurchaseProductDrilldown.reduce((sum, d) => sum + d.total, 0)
                    : totalPurchaseSpendOverall
                )}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedPurchaseProduct ? 'Avg. Unit Cost' : 'Items Procured Count'}
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {selectedPurchaseProduct
                  ? formatCurrency(
                      selectedPurchaseProductDrilldown.reduce((sum, d) => sum + d.quantity, 0) > 0
                        ? selectedPurchaseProductDrilldown.reduce((sum, d) => sum + d.total, 0) /
                            selectedPurchaseProductDrilldown.reduce((sum, d) => sum + d.quantity, 0)
                        : selectedPurchaseProduct.purchasePrice
                    )
                  : `${itemWisePurchasesData.length} Items`}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedPurchaseProduct ? 'Current In-Stock' : 'Purchase Bills Count'}
              </span>
              <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                {selectedPurchaseProduct
                  ? `${selectedPurchaseProduct.stock} ${selectedPurchaseProduct.unit}`
                  : `${filteredPurchaseInvoices.length} Bills`}
              </div>
            </div>
          </div>

          {/* If Single Item Selected: Show Purchase Drilldown Table */}
          {selectedPurchaseProduct ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    {language === 'bn' ? 'ক্রয় ভাউচার ও সাপ্লায়ার বিস্তারিত:' : 'Purchase Bill & Supplier Drilldown:'}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded font-semibold text-xs">
                    {selectedPurchaseProduct.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPurchaseItemId('ALL')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  ← {language === 'bn' ? 'সকল আইটেমে ফিরে যান' : 'Back to All Items'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Bill No</th>
                      <th className="py-2.5 px-4">Supplier Invoice #</th>
                      <th className="py-2.5 px-4">Supplier Name & Phone</th>
                      <th className="py-2.5 px-4 text-right">Purchased Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Rate</th>
                      <th className="py-2.5 px-4 text-right">Bill Item Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedPurchaseProductDrilldown.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          {language === 'bn'
                            ? 'এই আইটেমের জন্য কোনো ক্রয় রেকর্ড পাওয়া যায়নি।'
                            : 'No purchase records found for this item in the selected period.'}
                        </td>
                      </tr>
                    ) : (
                      selectedPurchaseProductDrilldown.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{row.date}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {row.billNumber}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500">
                            {row.supplierInvoiceNo || '-'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {row.supplierName}
                            {row.supplierPhone && (
                              <span className="text-[10px] text-slate-400 ml-1.5">({row.supplierPhone})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600">
                            {row.quantity} {row.unit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(row.purchasePrice)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                            {formatCurrency(row.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {selectedPurchaseProductDrilldown.length > 0 && (
                    <tfoot className="bg-slate-50 dark:bg-slate-850 font-bold border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400 uppercase">
                          Item Total:
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-indigo-600">
                          {selectedPurchaseProductDrilldown.reduce((sum, d) => sum + d.quantity, 0)} {selectedPurchaseProduct.unit}
                        </td>
                        <td></td>
                        <td className="py-2.5 px-4 text-right font-mono text-rose-600 text-sm">
                          {formatCurrency(selectedPurchaseProductDrilldown.reduce((sum, d) => sum + d.total, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            /* If All Items Selected: Show All Items Purchase Summary Table */
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-4">Item Name & SKU</th>
                      {isPharmacyMode && <th className="py-2.5 px-4">Generic</th>}
                      <th className="py-2.5 px-4">Brand / Manufacturer</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">In-Stock</th>
                      <th className="py-2.5 px-4 text-right">Units Purchased</th>
                      <th className="py-2.5 px-4 text-right">Avg. Unit Cost</th>
                      <th className="py-2.5 px-4 text-right">Total Spend</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {itemWisePurchasesData.length === 0 ? (
                      <tr>
                        <td colSpan={isPharmacyMode ? 9 : 8} className="py-8 text-center text-slate-400">
                          No matching products found for purchase report.
                        </td>
                      </tr>
                    ) : (
                      itemWisePurchasesData.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                            {p.product.name}
                            {p.product.barcode && (
                              <span className="text-[10px] text-slate-400 ml-1.5 font-mono">[{p.product.barcode}]</span>
                            )}
                          </td>
                          {isPharmacyMode && (
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-medium">{p.product.generic || '—'}</td>
                          )}
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-medium">{p.product.manufacturer || '—'}</td>
                          <td className="py-2.5 px-4 text-slate-500">{p.product.categoryName}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {p.product.stock} {p.product.unit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-sky-600">
                            {p.purchasedQty} {p.product.unit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(p.avgCost)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                            {formatCurrency(p.cost)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setPurchaseItemId(p.product.id)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              View Item Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-850 font-bold border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400 uppercase">
                        Total Summary:
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-sky-600">
                        {totalPurchaseUnitsOverall} Units
                      </td>
                      <td></td>
                      <td className="py-2.5 px-4 text-right font-mono text-rose-600 text-sm">
                        {formatCurrency(totalPurchaseSpendOverall)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. ITEM PROFIT & LOSS (WITH DEDICATED ITEM SELECTOR & DRILLDOWN) */}
      {reportType === 'pnl' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'bn' ? 'আইটেম ভিত্তিক লাভ ও ক্ষতি বিশ্লেষণ' : 'Item Wise Profit & Loss (P&L) Statement'}
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const headers = ['Item Name', 'Generic', 'Brand / Manufacturer', 'Category', 'Barcode', 'Sold Qty', 'Revenue', 'COGS', 'Gross Profit', 'Margin %'];
                    const rows = itemPnlData.map(item => [
                      item.product.name,
                      item.product.generic || '—',
                      item.product.manufacturer || '—',
                      item.product.categoryName,
                      item.product.barcode || '',
                      item.soldQty,
                      item.revenue.toFixed(2),
                      item.cogs.toFixed(2),
                      item.profit.toFixed(2),
                      `${item.margin}%`,
                    ]);
                    handleExportCSV('Item_PnL_Report', headers, rows);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPnlItemId('ALL');
                    setPnlCategoryId('ALL');
                    setPnlGeneric('ALL');
                    setPnlManufacturer('ALL');
                    setPnlSearch('');
                    setPnlStartDate('');
                    setPnlEndDate('');
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
              {/* 1. Item Selector Dropdown */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>{language === 'bn' ? 'নির্দিষ্ট আইটেম নির্বাচন করুন:' : 'Select Specific Item:'}</span>
                </label>
                <select
                  value={pnlItemId}
                  onChange={e => setPnlItemId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">🌟 {language === 'bn' ? 'সকল আইটেম (All Items)' : 'All Items (Overview)'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.barcode ? `[${p.barcode}]` : ''} — Cost: ৳{p.purchasePrice} | Sale: ৳{p.salesPrice}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Category Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                </label>
                <select
                  value={pnlCategoryId}
                  onChange={e => setPnlCategoryId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2.5 Generic Filter */}
              {isPharmacyMode && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {language === 'bn' ? 'জেনেরিক' : 'Generic'}
                  </label>
                  <select
                    value={pnlGeneric}
                    onChange={e => setPnlGeneric(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="ALL">All Generics</option>
                    {availableGenerics.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2.6 Brand Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'ব্র্যান্ড' : 'Brand'}
                </label>
                <select
                  value={pnlManufacturer}
                  onChange={e => setPnlManufacturer(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="ALL">All Brands</option>
                  {availableManufacturers.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 3. Search Filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'সার্চ' : 'Search Text'}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pnlSearch}
                    onChange={e => setPnlSearch(e.target.value)}
                    placeholder="Search name, barcode..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* 4. Date Range Start */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'তারিখ থেকে' : 'From Date'}
                </label>
                <input
                  type="date"
                  value={pnlStartDate}
                  onChange={e => setPnlStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              {/* 5. Date Range End */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'তারিখ পর্যন্ত' : 'To Date'}
                </label>
                <input
                  type="date"
                  value={pnlEndDate}
                  onChange={e => setPnlEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedPnlProduct ? 'Item Sales Revenue' : 'Gross Sales Revenue'}
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {formatCurrency(
                  selectedPnlProduct
                    ? selectedPnlProductDrilldown.reduce((sum, d) => sum + d.revenue, 0)
                    : totalPnlRevenueOverall
                )}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedPnlProduct ? 'Item Total Cost (COGS)' : 'Total Cost of Goods (COGS)'}
              </span>
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(
                  selectedPnlProduct
                    ? selectedPnlProductDrilldown.reduce((sum, d) => sum + d.totalCost, 0)
                    : totalPnlCogsOverall
                )}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedPnlProduct ? 'Item Gross Profit' : 'Gross Profit (Margin)'}
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(
                  selectedPnlProduct
                    ? selectedPnlProductDrilldown.reduce((sum, d) => sum + d.grossProfit, 0)
                    : totalPnlProfitOverall
                )}
                <span className="text-xs font-semibold ml-2 text-slate-400">
                  (
                  {selectedPnlProduct
                    ? selectedPnlProductDrilldown.reduce((sum, d) => sum + d.revenue, 0) > 0
                      ? (
                          (selectedPnlProductDrilldown.reduce((sum, d) => sum + d.grossProfit, 0) /
                            selectedPnlProductDrilldown.reduce((sum, d) => sum + d.revenue, 0)) *
                          100
                        ).toFixed(1)
                      : '0'
                    : totalPnlMarginOverall}
                  %)
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                {selectedPnlProduct ? 'Profit Per Unit' : 'Net Business Profit'}
              </span>
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                {selectedPnlProduct
                  ? formatCurrency(Math.max(0, selectedPnlProduct.salesPrice - selectedPnlProduct.purchasePrice))
                  : formatCurrency(netProfit)}
              </div>
            </div>
          </div>

          {/* If Single Item Selected: Show PnL Transaction Drilldown */}
          {selectedPnlProduct ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    {language === 'bn' ? 'বিক্রয়ভিত্তিক লাভ-ক্ষতির বিস্তারিত বিবরণী:' : 'Sales-by-Sales Profit & Loss Drilldown:'}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-semibold text-xs">
                    {selectedPnlProduct.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPnlItemId('ALL')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  ← {language === 'bn' ? 'সকল আইটেমে ফিরে যান' : 'Back to All Items'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Invoice No</th>
                      <th className="py-2.5 px-4">Customer Name</th>
                      <th className="py-2.5 px-4 text-right">Sold Qty</th>
                      <th className="py-2.5 px-4 text-right">Sales Price</th>
                      <th className="py-2.5 px-4 text-right">Total Revenue</th>
                      <th className="py-2.5 px-4 text-right">Unit Cost</th>
                      <th className="py-2.5 px-4 text-right">Total Cost (COGS)</th>
                      <th className="py-2.5 px-4 text-right">Gross Profit</th>
                      <th className="py-2.5 px-4 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedPnlProductDrilldown.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          {language === 'bn'
                            ? 'এই আইটেমের জন্য কোনো বিক্রয় ও লাভ-ক্ষতির রেকর্ড পাওয়া যায়নি।'
                            : 'No sales profitability records found for this item in the selected period.'}
                        </td>
                      </tr>
                    ) : (
                      selectedPnlProductDrilldown.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{row.date}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {row.invoiceNumber}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {row.customerName}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                            {row.quantity} {row.unit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(row.unitPrice)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(row.revenue)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatCurrency(row.unitCost)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-rose-600">
                            {formatCurrency(row.totalCost)}
                          </td>
                          <td className={`py-2.5 px-4 text-right font-mono font-bold ${row.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(row.grossProfit)}
                          </td>
                          <td className={`py-2.5 px-4 text-right font-mono font-bold ${Number(row.margin) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {row.margin}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {selectedPnlProductDrilldown.length > 0 && (
                    <tfoot className="bg-slate-50 dark:bg-slate-850 font-bold border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400 uppercase">
                          Item Total:
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-blue-600">
                          {selectedPnlProductDrilldown.reduce((sum, d) => sum + d.quantity, 0)} {selectedPnlProduct.unit}
                        </td>
                        <td></td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-900 dark:text-white">
                          {formatCurrency(selectedPnlProductDrilldown.reduce((sum, d) => sum + d.revenue, 0))}
                        </td>
                        <td></td>
                        <td className="py-2.5 px-4 text-right font-mono text-rose-600">
                          {formatCurrency(selectedPnlProductDrilldown.reduce((sum, d) => sum + d.totalCost, 0))}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-600 text-sm">
                          {formatCurrency(selectedPnlProductDrilldown.reduce((sum, d) => sum + d.grossProfit, 0))}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                          {(
                            (selectedPnlProductDrilldown.reduce((sum, d) => sum + d.grossProfit, 0) /
                              Math.max(1, selectedPnlProductDrilldown.reduce((sum, d) => sum + d.revenue, 0))) *
                            100
                          ).toFixed(1)}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            /* If All Items Selected: Show All Items PnL Summary Table */
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-4">Item Name & SKU</th>
                      {isPharmacyMode && <th className="py-2.5 px-4">Generic</th>}
                      <th className="py-2.5 px-4">Brand / Manufacturer</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">Sold Qty</th>
                      <th className="py-2.5 px-4 text-right">Sales Turnover</th>
                      <th className="py-2.5 px-4 text-right">COGS (Cost)</th>
                      <th className="py-2.5 px-4 text-right">Gross Profit</th>
                      <th className="py-2.5 px-4 text-right">Margin %</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {itemPnlData.length === 0 ? (
                      <tr>
                        <td colSpan={isPharmacyMode ? 10 : 9} className="py-8 text-center text-slate-400">
                          No matching products found for profit & loss report.
                        </td>
                      </tr>
                    ) : (
                      itemPnlData.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                            {s.product.name}
                            {s.product.barcode && (
                              <span className="text-[10px] text-slate-400 ml-1.5 font-mono">[{s.product.barcode}]</span>
                            )}
                          </td>
                          {isPharmacyMode && (
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-medium">{s.product.generic || '—'}</td>
                          )}
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-medium">{s.product.manufacturer || '—'}</td>
                          <td className="py-2.5 px-4 text-slate-500">{s.product.categoryName}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                            {s.soldQty} {s.product.unit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold">{formatCurrency(s.revenue)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-rose-600">{formatCurrency(s.cogs)}</td>
                          <td className={`py-2.5 px-4 text-right font-mono font-bold ${s.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(s.profit)}
                          </td>
                          <td className={`py-2.5 px-4 text-right font-mono font-bold ${Number(s.margin) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {s.margin}%
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setPnlItemId(s.product.id)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              View Profit Drilldown
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-850 font-bold border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400 uppercase">
                        Total Summary:
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-900 dark:text-white text-sm">
                        {formatCurrency(totalPnlRevenueOverall)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-rose-600 text-sm">
                        {formatCurrency(totalPnlCogsOverall)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-600 text-sm">
                        {formatCurrency(totalPnlProfitOverall)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                        {totalPnlMarginOverall}%
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. CATEGORY WISE SALES */}
      {reportType === 'cat-sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Categories</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {categories.length}
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Items Sold in Period</span>
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                {categorySales.reduce((sum, c) => sum + c.qty, 0)}
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Category Sales Value</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(categorySales.reduce((sum, c) => sum + c.revenue, 0))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Category Name</th>
                  <th className="py-2.5 px-4 text-right">Items Sold (Qty)</th>
                  <th className="py-2.5 px-4 text-right">Sales Turnover</th>
                  <th className="py-2.5 px-4 text-right">Share (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categorySales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No category sales data found for the selected period.
                    </td>
                  </tr>
                ) : (
                  categorySales.map((c, idx) => {
                    const totalRev = categorySales.reduce((sum, cat) => sum + cat.revenue, 0);
                    const sharePct = totalRev > 0 ? ((c.revenue / totalRev) * 100).toFixed(1) : '0';
                    return (
                      <tr key={c.category.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-blue-500" />
                          <span>{c.category.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                          {c.qty}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(c.revenue)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                          {sharePct}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-850 font-bold border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={2} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400 uppercase">
                    Total:
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-blue-600 text-sm">
                    {categorySales.reduce((sum, c) => sum + c.qty, 0)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-600 text-sm">
                    {formatCurrency(categorySales.reduce((sum, c) => sum + c.revenue, 0))}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 7. CATEGORY WISE PURCHASES */}
      {reportType === 'cat-purchase' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Categories</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {categories.length}
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Items Purchased in Period</span>
              <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                {categoryPurchases.reduce((sum, c) => sum + c.qty, 0)}
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Category Purchase Cost</span>
              <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                {formatCurrency(categoryPurchases.reduce((sum, c) => sum + c.cost, 0))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Category Name</th>
                  <th className="py-2.5 px-4 text-right">Items Purchased (Qty)</th>
                  <th className="py-2.5 px-4 text-right">Purchase Cost</th>
                  <th className="py-2.5 px-4 text-right">Cost Share (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoryPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No category purchase data found for the selected period.
                    </td>
                  </tr>
                ) : (
                  categoryPurchases.map((c, idx) => {
                    const totalCost = categoryPurchases.reduce((sum, cat) => sum + cat.cost, 0);
                    const sharePct = totalCost > 0 ? ((c.cost / totalCost) * 100).toFixed(1) : '0';
                    return (
                      <tr key={c.category.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Boxes className="w-3.5 h-3.5 text-sky-500" />
                          <span>{c.category.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-sky-600">
                          {c.qty}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                          {formatCurrency(c.cost)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                          {sharePct}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-850 font-bold border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={2} className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400 uppercase">
                    Total:
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-sky-600 text-sm">
                    {categoryPurchases.reduce((sum, c) => sum + c.qty, 0)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-rose-600 text-sm">
                    {formatCurrency(categoryPurchases.reduce((sum, c) => sum + c.cost, 0))}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 8. BY PARTY ITEM & TRANSACTION */}
      {reportType === 'party-ledger' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Select Customer / Supplier</span>
                <select
                  value={selectedPartyId}
                  onChange={e => setSelectedPartyId(e.target.value)}
                  className="block mt-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="">{language === 'bn' ? '-- কাস্টমার/সাপ্লায়ার নির্বাচন করুন --' : '-- Select Party --'}</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type} - {p.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedPartyObj && (
              <div className="text-right text-xs">
                <span className="text-slate-400">Current Balance: </span>
                <span className="font-mono font-bold text-red-600 text-sm">
                  {formatCurrency(selectedPartyObj.currentBalance)}
                </span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Voucher / Ref</th>
                  <th className="py-2.5 px-4">Transaction Type</th>
                  <th className="py-2.5 px-4">Account / Wallet</th>
                  <th className="py-2.5 px-4">Remarks</th>
                  <th className="py-2.5 px-4 text-right text-emerald-600">Credit / In (৳)</th>
                  <th className="py-2.5 px-4 text-right text-rose-600">Debit / Out (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {partyTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {!selectedPartyId ? (
                        language === 'bn' ? 'তথ্য দেখতে উপরের তালিকা থেকে একজন কাস্টমার বা সাপ্লায়ার নির্বাচন করুন।' : 'Please select a customer or supplier to view their ledger.'
                      ) : (
                        language === 'bn' ? 'এই পার্টির কোনো লেনদেন পাওয়া যায়নি।' : 'No transactions recorded for this party.'
                      )}
                    </td>
                  </tr>
                ) : (
                  partyTransactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-500">{tx.date}</td>
                      <td className="py-2.5 px-4 font-mono font-bold">{tx.voucherNo}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'SALE_INVOICE' || tx.type === 'PURCHASE_BILL'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : tx.credit > 0
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {tx.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{tx.walletName}</td>
                      <td className="py-2.5 px-4 text-slate-500">{tx.remarks}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                        {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                        {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. EXPIRY REPORT */}
      {reportType === 'expiry-report' && <ExpiryReportView />}
    </div>
  );
};
