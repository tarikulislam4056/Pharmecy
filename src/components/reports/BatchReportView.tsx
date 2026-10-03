import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductBatch, SaleInvoice, PurchaseInvoice } from '../../types';
import { BatchManagementModal } from '../products/BatchManagementModal';
import { normalizeDateToISO, getDaysRemaining } from '../../utils/dateUtils';
import {
  canUserExportReportCsv,
  canUserDownloadReportPdf,
  canUserPrintReportStatement,
} from '../../utils/permissions';
import {
  Boxes,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Download,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Building2,
  ShoppingBag,
  RotateCcw,
  X,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export interface BatchReportItem {
  id: string;
  productId: string;
  productName: string;
  productNameBn?: string;
  sku: string;
  barcode?: string;
  categoryName?: string;
  generic?: string;
  manufacturer?: string;
  unit: string;
  batchNumber: string;
  expDate: string;
  purchaseDate: string;
  purchaseInvoiceNo?: string;
  purchasePrice: number;
  salesPrice: number;
  stock: number;
  initialStock: number;
  soldQty: number;
  returnedQty: number;
  supplierName?: string;
  supplierId?: string;
  productRef: Product;
}

interface BatchReportViewProps {
  onExportCsv?: (headers: string[], rows: (string | number)[][], fileName: string) => void;
  onPrint?: () => void;
}

export const BatchReportView: React.FC<BatchReportViewProps> = () => {
  const {
    language,
    formatCurrency,
    products,
    categories,
    parties,
    saleInvoices,
    purchaseInvoices,
    saleReturns,
    expiredReturnLogs,
    openPrintModal,
    companySettings,
    currentUser,
    showToast,
  } = useApp();

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<string>('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'IN_STOCK' | 'EXPIRING_30' | 'EXPIRING_60' | 'EXPIRING_90' | 'EXPIRED' | 'FRESH' | 'DEPLETED'
  >('ALL');
  const [expDateStart, setExpDateStart] = useState<string>('');
  const [expDateEnd, setExpDateEnd] = useState<string>('');
  const [purchaseDateStart, setPurchaseDateStart] = useState<string>('');
  const [purchaseDateEnd, setPurchaseDateEnd] = useState<string>('');

  // Modals state
  const [selectedBatchForDrilldown, setSelectedBatchForDrilldown] = useState<BatchReportItem | null>(null);
  const [productForBatchManage, setProductForBatchManage] = useState<Product | null>(null);
  const [selectedBatchLedgerView, setSelectedBatchLedgerView] = useState<'DAILY' | 'DETAILED'>('DAILY');
  const [batchLedgerDateFilter, setBatchLedgerDateFilter] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];

  // 1. Gather all batches with full sold and returned analytics
  const allBatchItems = useMemo<BatchReportItem[]>(() => {
    const list: BatchReportItem[] = [];

    products.forEach(prod => {
      const productBatches: ProductBatch[] =
        prod.batches && prod.batches.length > 0
          ? prod.batches
          : [
              {
                id: `batch-default-${prod.id}`,
                batchNumber: prod.batchNumber || 'B-01',
                expDate: prod.expDate || '',
                purchaseDate: prod.createdAt ? prod.createdAt.split(' ')[0] : today,
                purchaseInvoiceNo: 'INITIAL-STOCK',
                purchasePrice: prod.purchasePrice || 0,
                salesPrice: prod.salesPrice || 0,
                stock: prod.stock,
                initialStock: prod.stock,
                supplierName: 'Initial Inventory',
                createdAt: prod.createdAt,
              },
            ];

      productBatches.forEach(b => {
        // Calculate units sold for this specific batch across all sales
        let soldForBatch = 0;
        saleInvoices.forEach(inv => {
          inv.items.forEach(it => {
            if (it.productId === prod.id) {
              if (it.batchId === b.id || (it.batchNumber && it.batchNumber === b.batchNumber)) {
                soldForBatch += Number(it.quantity) || 0;
              } else if (!it.batchId && !it.batchNumber && productBatches.length === 1) {
                // If single batch existed, assign sales to it
                soldForBatch += Number(it.quantity) || 0;
              }
            }
          });
        });

        // Calculate returned quantity
        let returnedForBatch = 0;
        saleReturns.forEach(ret => {
          ret.items.forEach(it => {
            if (it.productId === prod.id && (!it.batchNumber || it.batchNumber === b.batchNumber)) {
              returnedForBatch += Number(it.returnQuantity) || 0;
            }
          });
        });

        const initialQty = b.initialStock !== undefined ? b.initialStock : (b.stock + soldForBatch - returnedForBatch);

        list.push({
          id: b.id,
          productId: prod.id,
          productName: prod.name,
          productNameBn: prod.nameBn,
          sku: prod.sku,
          barcode: prod.barcode,
          categoryName: prod.categoryName || 'General',
          generic: prod.generic,
          manufacturer: prod.manufacturer,
          unit: prod.unit,
          batchNumber: b.batchNumber || prod.batchNumber || 'B-01',
          expDate: b.expDate || prod.expDate || '',
          purchaseDate: b.purchaseDate || prod.createdAt?.split(' ')[0] || today,
          purchaseInvoiceNo: b.purchaseInvoiceNo,
          purchasePrice: b.purchasePrice || prod.purchasePrice || 0,
          salesPrice: b.salesPrice || prod.salesPrice || 0,
          stock: Number(b.stock) || 0,
          initialStock: initialQty,
          soldQty: soldForBatch,
          returnedQty: returnedForBatch,
          supplierName: b.supplierName,
          supplierId: b.supplierId,
          productRef: prod,
        });
      });
    });

    return list;
  }, [products, saleInvoices, saleReturns, today]);

  // Unique Batch Numbers list for quick select
  const uniqueBatchNumbers = useMemo(() => {
    const set = new Set<string>();
    allBatchItems.forEach(b => {
      if (b.batchNumber) set.add(b.batchNumber);
    });
    return Array.from(set).sort();
  }, [allBatchItems]);

  const suppliersList = useMemo(() => {
    return parties.filter(p => p.type === 'SUPPLIER');
  }, [parties]);

  // Helpers for Status Calculation
  const getBatchStatusDetails = (batch: BatchReportItem) => {
    if (batch.stock <= 0) {
      return {
        status: 'DEPLETED',
        label: language === 'bn' ? 'স্টক শেষ (Depleted)' : 'Out of Stock',
        badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
        icon: Clock,
        daysDiff: null,
      };
    }

    const daysDiff = getDaysRemaining(batch.expDate);
    if (daysDiff === null) {
      return {
        status: 'NO_EXP',
        label: language === 'bn' ? 'মেয়াদহীন (No Exp)' : 'No Expiry',
        badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        icon: Clock,
        daysDiff: null,
      };
    }

    if (daysDiff <= 0) {
      return {
        status: 'EXPIRED',
        label: language === 'bn' ? `মেয়াদোত্তীর্ণ (${Math.abs(daysDiff)} দিন আগে)` : `Expired (${Math.abs(daysDiff)}d ago)`,
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800 font-bold',
        icon: AlertTriangle,
        daysDiff,
      };
    }

    if (daysDiff <= 30) {
      return {
        status: 'EXPIRING_30',
        label: language === 'bn' ? `🚨 শীঘ্রই মেয়াদ শেষ (${daysDiff} দিন)` : `Expiring Soon (${daysDiff}d)`,
        badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold',
        icon: AlertTriangle,
        daysDiff,
      };
    }

    if (daysDiff <= 60) {
      return {
        status: 'EXPIRING_60',
        label: language === 'bn' ? `⚠️ ৬০ দিনের মধ্যে শেষ (${daysDiff} দিন)` : `Expiring 60d (${daysDiff}d)`,
        badgeClass: 'bg-orange-50 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
        icon: AlertTriangle,
        daysDiff,
      };
    }

    if (daysDiff <= 90) {
      return {
        status: 'EXPIRING_90',
        label: language === 'bn' ? `৯০ দিনের মধ্যে শেষ (${daysDiff} দিন)` : `Expiring 90d (${daysDiff}d)`,
        badgeClass: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/70 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
        icon: AlertTriangle,
        daysDiff,
      };
    }

    return {
      status: 'FRESH',
      label: language === 'bn' ? `✅ সতেজ (${daysDiff} দিন বাকি)` : `Fresh / Valid (${daysDiff}d)`,
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      icon: ShieldCheck,
      daysDiff,
    };
  };

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return allBatchItems.filter(b => {
      // 1. Text Search (Batch No, Product Name, SKU, Barcode, Generic)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          b.batchNumber.toLowerCase().includes(q) ||
          b.productName.toLowerCase().includes(q) ||
          (b.productNameBn && b.productNameBn.toLowerCase().includes(q)) ||
          b.sku.toLowerCase().includes(q) ||
          (b.barcode && b.barcode.toLowerCase().includes(q)) ||
          (b.generic && b.generic.toLowerCase().includes(q)) ||
          (b.manufacturer && b.manufacturer.toLowerCase().includes(q)) ||
          (b.purchaseInvoiceNo && b.purchaseInvoiceNo.toLowerCase().includes(q)) ||
          (b.supplierName && b.supplierName.toLowerCase().includes(q));

        if (!match) return false;
      }

      // 2. Specific Batch Number Filter
      if (selectedBatchNumber !== 'ALL' && b.batchNumber !== selectedBatchNumber) {
        return false;
      }

      // 3. Product Filter
      if (selectedProductId !== 'ALL' && b.productId !== selectedProductId) {
        return false;
      }

      // 4. Category Filter
      if (selectedCategoryId !== 'ALL' && b.productRef.categoryId !== selectedCategoryId) {
        return false;
      }

      // 5. Supplier Filter
      if (selectedSupplierId !== 'ALL' && b.supplierId !== selectedSupplierId && b.supplierName !== selectedSupplierId) {
        return false;
      }

      // 6. Expiry Date Range Filter
      const bExpISO = normalizeDateToISO(b.expDate);
      if (expDateStart && (!bExpISO || bExpISO < expDateStart)) return false;
      if (expDateEnd && (!bExpISO || bExpISO > expDateEnd)) return false;

      // 7. Purchase Date Range Filter
      const bPurISO = normalizeDateToISO(b.purchaseDate);
      if (purchaseDateStart && (!bPurISO || bPurISO < purchaseDateStart)) return false;
      if (purchaseDateEnd && (!bPurISO || bPurISO > purchaseDateEnd)) return false;

      // 8. Status Filter
      if (statusFilter !== 'ALL') {
        const details = getBatchStatusDetails(b);
        if (statusFilter === 'IN_STOCK' && b.stock <= 0) return false;
        if (statusFilter === 'DEPLETED' && b.stock > 0) return false;
        if (statusFilter === 'EXPIRED' && (details.status !== 'EXPIRED' || b.stock <= 0)) return false;
        if ((statusFilter === 'EXPIRING_30' || statusFilter === 'EXPIRING_30_DAYS') && (details.status !== 'EXPIRING_30' || b.stock <= 0)) return false;
        if (statusFilter === 'EXPIRING_60' && !['EXPIRING_30', 'EXPIRING_60'].includes(details.status)) return false;
        if (statusFilter === 'EXPIRING_90' && !['EXPIRING_30', 'EXPIRING_60', 'EXPIRING_90'].includes(details.status)) return false;
        if (statusFilter === 'FRESH' && details.status !== 'FRESH') return false;
      }

      return true;
    });
  }, [
    allBatchItems,
    searchQuery,
    selectedBatchNumber,
    selectedProductId,
    selectedCategoryId,
    selectedSupplierId,
    expDateStart,
    expDateEnd,
    purchaseDateStart,
    purchaseDateEnd,
    statusFilter,
    today,
  ]);

  // Aggregated KPI Stats
  const kpiStats = useMemo(() => {
    let totalStockQty = 0;
    let totalCostValuation = 0;
    let totalSalesValuation = 0;
    let expiringSoonCount = 0;
    let expiringSoonValuation = 0;
    let expiredCount = 0;
    let expiredValuation = 0;
    let freshCount = 0;

    filteredBatches.forEach(b => {
      const stock = Number(b.stock) || 0;
      const costVal = stock * (Number(b.purchasePrice) || 0);
      const saleVal = stock * (Number(b.salesPrice) || 0);

      totalStockQty += stock;
      totalCostValuation += costVal;
      totalSalesValuation += saleVal;

      if (stock > 0 && b.expDate) {
        const daysDiff = getDaysRemaining(b.expDate);
        if (daysDiff !== null) {
          if (daysDiff <= 0) {
            expiredCount++;
            expiredValuation += costVal;
          } else if (daysDiff <= 30) {
            expiringSoonCount++;
            expiringSoonValuation += costVal;
          } else {
            freshCount++;
          }
        }
      }
    });

    return {
      totalBatches: filteredBatches.length,
      totalStockQty,
      totalCostValuation,
      totalSalesValuation,
      expiringSoonCount,
      expiringSoonValuation,
      expiredCount,
      expiredValuation,
      freshCount,
    };
  }, [filteredBatches, today]);

  // Helper to compute rich date-wise purchase & sales ledger data for any batch
  const getBatchLedgerData = (targetBatchNumber: string, targetProductId?: string) => {
    if (!targetBatchNumber || targetBatchNumber === 'ALL') return null;

    const matchingBatches = allBatchItems.filter(
      b => b.batchNumber === targetBatchNumber && (!targetProductId || b.productId === targetProductId)
    );

    if (matchingBatches.length === 0) return null;

    const primaryBatch = matchingBatches[0];
    const targetProductIds = new Set(matchingBatches.map(b => b.productId));

    type BatchTx = {
      id: string;
      date: string;
      type: 'INITIAL' | 'PURCHASE' | 'SALE' | 'SALE_RETURN' | 'PURCHASE_RETURN' | 'EXPIRED_RETURN';
      typeLabel: string;
      docNo: string;
      partyName: string;
      inQty: number;
      outQty: number;
      rate: number;
      total: number;
      runningBalance: number;
      notes?: string;
    };

    const entries: BatchTx[] = [];

    // 1. Initial Stock Registration (if any)
    matchingBatches.forEach(b => {
      if (b.initialStock > 0 || b.purchaseInvoiceNo === 'INITIAL-STOCK') {
        entries.push({
          id: `init-${b.id}`,
          date: b.purchaseDate || today,
          type: 'INITIAL',
          typeLabel: language === 'bn' ? 'প্রারম্ভিক স্টক (Initial)' : 'Initial Stock',
          docNo: b.purchaseInvoiceNo || 'INITIAL-STOCK',
          partyName: b.supplierName || (language === 'bn' ? 'প্রারম্ভিক মজুদ' : 'Initial Stock'),
          inQty: b.initialStock,
          outQty: 0,
          rate: b.purchasePrice,
          total: b.initialStock * b.purchasePrice,
          runningBalance: 0,
          notes: `Batch ${b.batchNumber} registered`,
        });
      }
    });

    // 2. Purchases from Purchase Invoices
    purchaseInvoices.forEach(pur => {
      pur.items.forEach((it, itIdx) => {
        if (
          it.batchNumber === targetBatchNumber ||
          (targetProductIds.has(it.productId) && it.batchNumber === targetBatchNumber)
        ) {
          entries.push({
            id: `pur-${pur.id}-${itIdx}`,
            date: pur.date,
            type: 'PURCHASE',
            typeLabel: language === 'bn' ? 'ক্রয় চালান (Purchase)' : 'Purchase Bill',
            docNo: pur.billNumber || pur.supplierInvoiceNo || `PUR-${pur.id}`,
            partyName: pur.supplierName || 'Supplier',
            inQty: Number(it.quantity) || 0,
            outQty: 0,
            rate: Number(it.purchasePrice) || 0,
            total: Number(it.total) || (Number(it.quantity) * Number(it.purchasePrice)),
            runningBalance: 0,
            notes: `Purchase Bill #${pur.billNumber || ''}`,
          });
        }
      });
    });

    // 3. Sales from Sale Invoices
    saleInvoices.forEach(inv => {
      inv.items.forEach((it, itIdx) => {
        if (
          it.batchNumber === targetBatchNumber ||
          (targetProductIds.has(it.productId) &&
            (it.batchNumber === targetBatchNumber ||
              matchingBatches.some(b => b.id === it.batchId)))
        ) {
          entries.push({
            id: `sale-${inv.id}-${itIdx}`,
            date: inv.date,
            type: 'SALE',
            typeLabel: language === 'bn' ? 'বিক্রয় (Sale)' : 'Sale Memo',
            docNo: inv.invoiceNumber,
            partyName: inv.customerName || (language === 'bn' ? 'সাধারণ ক্রেতা' : 'Cash Customer'),
            inQty: 0,
            outQty: Number(it.quantity) || 0,
            rate: Number(it.unitPrice) || 0,
            total: Number(it.total) || (Number(it.quantity) * Number(it.unitPrice)),
            runningBalance: 0,
            notes: `Sale Memo #${inv.invoiceNumber}`,
          });
        }
      });
    });

    // 4. Sale Returns
    saleReturns.forEach(ret => {
      ret.items.forEach((it, itIdx) => {
        if (
          it.batchNumber === targetBatchNumber ||
          (targetProductIds.has(it.productId) && it.batchNumber === targetBatchNumber)
        ) {
          entries.push({
            id: `sret-${ret.id}-${itIdx}`,
            date: ret.date,
            type: 'SALE_RETURN',
            typeLabel: language === 'bn' ? 'বিক্রয় ফেরত (Return)' : 'Sale Return',
            docNo: ret.returnNumber,
            partyName: ret.customerName || 'Customer Return',
            inQty: Number(it.returnQuantity) || 0,
            outQty: 0,
            rate: Number(it.unitPrice) || 0,
            total: Number(it.totalRefund) || 0,
            runningBalance: 0,
            notes: `Customer return for batch ${targetBatchNumber}`,
          });
        }
      });
    });

    // 5. Expired / Loss adjustments
    expiredReturnLogs.forEach(log => {
      if (
        log.batchNumber === targetBatchNumber ||
        (targetProductIds.has(log.productId) && log.batchNumber === targetBatchNumber)
      ) {
        entries.push({
          id: `exp-${log.id}`,
          date: log.date,
          type: 'EXPIRED_RETURN',
          typeLabel: language === 'bn' ? 'মেয়াদোত্তীর্ণ বাদ (Expired)' : 'Expired Write-Off',
          docNo: log.actionType || 'EXPIRED-ADJ',
          partyName: 'Supplier / Loss Adjustment',
          inQty: 0,
          outQty: Number(log.quantity) || 0,
          rate: Number(log.purchasePrice) || 0,
          total: Number(log.totalValue) || 0,
          runningBalance: 0,
          notes: log.notes || 'Expired stock deduction',
        });
      }
    });

    // Sort chronologically ascending to compute running balances correctly
    entries.sort((a, b) => {
      const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      // If same date, purchases/initials come before sales
      if (a.inQty > 0 && b.outQty > 0) return -1;
      if (a.outQty > 0 && b.inQty > 0) return 1;
      return 0;
    });

    let currentBalance = 0;
    const entriesWithRunningBalance: BatchTx[] = entries.map(e => {
      currentBalance += (e.inQty - e.outQty);
      return {
        ...e,
        runningBalance: currentBalance,
      };
    });

    // Group transactions by date for Daily Summary
    type DailySummary = {
      date: string;
      purchasedQty: number;
      purchasedAmount: number;
      soldQty: number;
      soldAmount: number;
      returnedQty: number;
      returnedAmount: number;
      otherOutQty: number;
      otherOutAmount: number;
      netDayMovement: number;
      closingBalance: number;
      transactionCount: number;
      entries: BatchTx[];
    };

    const dailyMap = new Map<string, DailySummary>();

    entriesWithRunningBalance.forEach(e => {
      let day = dailyMap.get(e.date);
      if (!day) {
        day = {
          date: e.date,
          purchasedQty: 0,
          purchasedAmount: 0,
          soldQty: 0,
          soldAmount: 0,
          returnedQty: 0,
          returnedAmount: 0,
          otherOutQty: 0,
          otherOutAmount: 0,
          netDayMovement: 0,
          closingBalance: e.runningBalance,
          transactionCount: 0,
          entries: [],
        };
        dailyMap.set(e.date, day);
      }

      if (e.type === 'PURCHASE' || e.type === 'INITIAL') {
        day.purchasedQty += e.inQty;
        day.purchasedAmount += e.total;
      } else if (e.type === 'SALE') {
        day.soldQty += e.outQty;
        day.soldAmount += e.total;
      } else if (e.type === 'SALE_RETURN') {
        day.returnedQty += e.inQty;
        day.returnedAmount += e.total;
      } else if (e.type === 'EXPIRED_RETURN' || e.type === 'PURCHASE_RETURN') {
        day.otherOutQty += e.outQty;
        day.otherOutAmount += e.total;
      }

      day.netDayMovement = day.purchasedQty + day.returnedQty - day.soldQty - day.otherOutQty;
      day.closingBalance = e.runningBalance; // latest balance of that day
      day.transactionCount += 1;
      day.entries.push(e);
    });

    const dailySummaryList = Array.from(dailyMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const totalPurchased = entriesWithRunningBalance.reduce((s, e) => s + (e.type === 'PURCHASE' || e.type === 'INITIAL' ? e.inQty : 0), 0);
    const totalPurchasedAmount = entriesWithRunningBalance.reduce((s, e) => s + (e.type === 'PURCHASE' || e.type === 'INITIAL' ? e.total : 0), 0);
    const totalSold = entriesWithRunningBalance.reduce((s, e) => s + (e.type === 'SALE' ? e.outQty : 0), 0);
    const totalSoldAmount = entriesWithRunningBalance.reduce((s, e) => s + (e.type === 'SALE' ? e.total : 0), 0);
    const totalReturned = entriesWithRunningBalance.reduce((s, e) => s + (e.type === 'SALE_RETURN' ? e.inQty : 0), 0);
    const totalOtherOut = entriesWithRunningBalance.reduce((s, e) => s + (e.type === 'EXPIRED_RETURN' || e.type === 'PURCHASE_RETURN' ? e.outQty : 0), 0);
    const currentStock = totalPurchased + totalReturned - totalSold - totalOtherOut;

    return {
      batch: primaryBatch,
      matchingBatches,
      entriesAscending: entriesWithRunningBalance,
      entriesDescending: [...entriesWithRunningBalance].reverse(),
      dailySummaries: dailySummaryList,
      kpis: {
        totalPurchased,
        totalPurchasedAmount,
        totalSold,
        totalSoldAmount,
        totalReturned,
        totalOtherOut,
        currentStock,
        currentCostValuation: currentStock * primaryBatch.purchasePrice,
        currentSalesValuation: currentStock * primaryBatch.salesPrice,
      },
    };
  };

  // Selected Batch Ledger Active Dataset
  const selectedBatchLedgerData = useMemo(() => {
    if (selectedBatchNumber === 'ALL') return null;
    return getBatchLedgerData(
      selectedBatchNumber,
      selectedProductId !== 'ALL' ? selectedProductId : undefined
    );
  }, [
    selectedBatchNumber,
    selectedProductId,
    allBatchItems,
    purchaseInvoices,
    saleInvoices,
    saleReturns,
    expiredReturnLogs,
    today,
  ]);

  // Batch Movement / Traceability History for Drilldown Modal
  const batchMovementHistory = useMemo(() => {
    if (!selectedBatchForDrilldown) return [];
    const data = getBatchLedgerData(selectedBatchForDrilldown.batchNumber, selectedBatchForDrilldown.productId);
    return data ? data.entriesDescending : [];
  }, [selectedBatchForDrilldown, allBatchItems, purchaseInvoices, saleInvoices, saleReturns, expiredReturnLogs, today]);

  // Export to CSV Handler for All Batches
  const handleExportCSV = () => {
    if (!canUserExportReportCsv(currentUser)) {
      showToast(
        language === 'bn'
          ? 'আপনার রিপোর্ট থেকে CSV এক্সপোর্ট করার অনুমতি নেই।'
          : 'You do not have permission to Export CSV from Reports & Analytics.',
        'error'
      );
      return;
    }

    const headers = [
      'Sl',
      'Batch Number',
      'Product Name',
      'Bangla Name',
      'SKU',
      'Barcode',
      'Category',
      'Generic',
      'Manufacturer',
      'Purchase Date',
      'Expiry Date',
      'Days Left',
      'Status',
      'Cost Price (Tk)',
      'Sales Price (Tk)',
      'Initial Qty',
      'Sold Qty',
      'Current Stock',
      'Unit',
      'Total Asset Valuation (Cost)',
      'Supplier',
    ];

    const rows = filteredBatches.map((b, idx) => {
      const details = getBatchStatusDetails(b);
      return [
        idx + 1,
        `"${b.batchNumber}"`,
        `"${b.productName.replace(/"/g, '""')}"`,
        `"${(b.productNameBn || '').replace(/"/g, '""')}"`,
        `"${b.sku}"`,
        `"${b.barcode || ''}"`,
        `"${b.categoryName || ''}"`,
        `"${b.generic || ''}"`,
        `"${b.manufacturer || ''}"`,
        b.purchaseDate,
        b.expDate || 'N/A',
        details.daysDiff !== null ? details.daysDiff : 'N/A',
        `"${details.label}"`,
        b.purchasePrice.toFixed(2),
        b.salesPrice.toFixed(2),
        b.initialStock,
        b.soldQty,
        b.stock,
        b.unit,
        (b.stock * b.purchasePrice).toFixed(2),
        `"${b.supplierName || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DokanPro_Batch_Expiry_Report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Specific Batch Date-wise Ledger to CSV
  const handleExportBatchLedgerCSV = () => {
    if (!canUserExportReportCsv(currentUser)) {
      showToast(
        language === 'bn'
          ? 'আপনার রিপোর্ট থেকে CSV এক্সপোর্ট করার অনুমতি নেই।'
          : 'You do not have permission to Export CSV from Reports & Analytics.',
        'error'
      );
      return;
    }

    if (!selectedBatchLedgerData) return;
    const data = selectedBatchLedgerData;
    const headers = [
      'Date',
      'Transaction Type',
      'Document / Invoice #',
      'Customer / Supplier',
      'Inflow Qty (Purchase/Initial)',
      'Outflow Qty (Sold)',
      'Unit Rate (Tk)',
      'Total Amount (Tk)',
      'Running Balance Stock',
      'Notes',
    ];

    const rows = data.entriesDescending.map(e => [
      e.date,
      `"${e.typeLabel}"`,
      `"${e.docNo}"`,
      `"${e.partyName.replace(/"/g, '""')}"`,
      e.inQty,
      e.outQty,
      e.rate.toFixed(2),
      e.total.toFixed(2),
      e.runningBalance,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Batch_${selectedBatchNumber}_Datewise_Purchase_Sales_Ledger_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Statement Handler
  const handlePrintBatchReport = (autoDownloadPdf = false) => {
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

    const reportTitle = language === 'bn' ? 'পণ্য ব্যাচ ও মেয়াদভিত্তিক ইনভেন্টরি রিপোর্ট' : 'PRODUCT BATCH & EXPIRY INVENTORY REPORT';
    const printDate = new Date().toLocaleDateString('en-GB');
    const printTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const selectedProd = products.find(p => p.id === selectedProductId);
    const selectedCat = categories.find(c => c.id === selectedCategoryId);
    const selectedSup = suppliersList.find(s => s.id === selectedSupplierId);

    openPrintModal({
      type: 'BATCH_EXPIRY_REPORT',
      title: reportTitle,
      autoDownloadPdf,
      data: {
        reportTitle,
        reportTitleBn: 'পণ্য ব্যাচ ও মেয়াদভিত্তিক পূর্ণাঙ্গ ইনভেন্টরি রিপোর্ট',
        generatedDate: printDate,
        generatedTime: printTime,
        period: `${language === 'bn' ? 'রিপোর্ট তৈরির তারিখ:' : 'Report Date:'} ${printDate}`,
        filters: {
          batchNumber: selectedBatchNumber === 'ALL' ? (language === 'bn' ? 'সকল ব্যাচ' : 'All Batches') : selectedBatchNumber,
          productName: selectedProductId === 'ALL' ? (language === 'bn' ? 'সকল পণ্য' : 'All Products') : (selectedProd?.name || selectedProductId),
          categoryName: selectedCategoryId === 'ALL' ? (language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories') : (selectedCat?.name || selectedCategoryId),
          supplierName: selectedSupplierId === 'ALL' ? (language === 'bn' ? 'সকল সাপ্লায়ার' : 'All Suppliers') : (selectedSup?.name || selectedSupplierId),
          statusFilter: statusFilter === 'ALL' ? (language === 'bn' ? 'সকল অবস্থা (All Status)' : 'All Status') : statusFilter,
          expDateRange: expDateStart || expDateEnd ? `${expDateStart || 'Start'} - ${expDateEnd || 'End'}` : '',
          totalBatchesCount: filteredBatches.length,
        },
        kpis: {
          totalBatches: kpiStats.totalBatches,
          totalStockQty: kpiStats.totalStockQty,
          totalCostValuation: kpiStats.totalCostValuation,
          totalSalesValuation: kpiStats.totalSalesValuation,
          expiringSoonCount: kpiStats.expiringSoonCount,
          expiringSoonValuation: kpiStats.expiringSoonValuation,
          expiredCount: kpiStats.expiredCount,
          expiredValuation: kpiStats.expiredValuation,
          freshCount: kpiStats.freshCount,
        },
        batches: filteredBatches.map((b, idx) => {
          const det = getBatchStatusDetails(b);
          return {
            sl: idx + 1,
            batchNumber: b.batchNumber,
            productName: b.productName,
            productNameBn: b.productNameBn,
            sku: b.sku,
            barcode: b.barcode,
            generic: b.generic,
            categoryName: b.categoryName,
            manufacturer: b.manufacturer,
            unit: b.unit,
            purchaseDate: b.purchaseDate,
            purchaseInvoiceNo: b.purchaseInvoiceNo,
            expDate: b.expDate,
            daysDiff: det.daysDiff,
            status: det.status,
            statusLabel: det.label,
            purchasePrice: b.purchasePrice,
            salesPrice: b.salesPrice,
            initialStock: b.initialStock,
            soldQty: b.soldQty,
            returnedQty: b.returnedQty,
            stock: b.stock,
            totalCostValuation: b.stock * b.purchasePrice,
            totalSalesValuation: b.stock * b.salesPrice,
            supplierName: b.supplierName,
          };
        }),
        totals: {
          totalInitialStock: filteredBatches.reduce((s, b) => s + (b.initialStock || 0), 0),
          totalSoldQty: filteredBatches.reduce((s, b) => s + (b.soldQty || 0), 0),
          totalStock: kpiStats.totalStockQty,
          totalCostValuation: kpiStats.totalCostValuation,
          totalSalesValuation: kpiStats.totalSalesValuation,
        },
      },
    });
  };

  // Print Individual Batch Statement (Detailed Invoices & Vouchers OR Daily Summary)
  const handlePrintBatchLedgerStatement = (customBatch?: BatchReportItem, modeOverride?: 'DAILY' | 'DETAILED') => {
    if (!canUserPrintReportStatement(currentUser)) {
      showToast(
        language === 'bn'
          ? 'আপনার রিপোর্ট থেকে স্টেটমেন্ট প্রিন্ট করার অনুমতি নেই।'
          : 'You do not have permission to Print Statement from Reports & Analytics.',
        'error'
      );
      return;
    }

    const targetBatch = customBatch || selectedBatchLedgerData?.batch;
    if (!targetBatch) return;

    const data = getBatchLedgerData(targetBatch.batchNumber, targetBatch.productId);
    if (!data) return;

    const activeView = modeOverride || (customBatch ? 'DETAILED' : selectedBatchLedgerView);
    const det = getBatchStatusDetails(targetBatch);
    const printDate = new Date().toLocaleDateString('en-GB');
    const printTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Filter by date if set
    const filteredEntries = batchLedgerDateFilter
      ? data.entriesDescending.filter(
          e =>
            e.date === batchLedgerDateFilter ||
            e.docNo.toLowerCase().includes(batchLedgerDateFilter.toLowerCase()) ||
            e.partyName.toLowerCase().includes(batchLedgerDateFilter.toLowerCase())
        )
      : data.entriesDescending;

    const filteredDaily = batchLedgerDateFilter
      ? data.dailySummaries.filter(d => d.date === batchLedgerDateFilter)
      : data.dailySummaries;

    openPrintModal({
      type: 'BATCH_DETAILED_LEDGER',
      title: `Batch #${targetBatch.batchNumber} - ${activeView === 'DETAILED' ? 'Detailed Invoices & Vouchers' : 'Daily Movement Summary'}`,
      data: {
        viewMode: activeView,
        dateFilter: batchLedgerDateFilter || undefined,
        generatedDate: printDate,
        generatedTime: printTime,
        batchNumber: targetBatch.batchNumber,
        productName: targetBatch.productName,
        productNameBn: targetBatch.productNameBn,
        sku: targetBatch.sku,
        barcode: targetBatch.barcode,
        generic: targetBatch.generic,
        categoryName: targetBatch.categoryName,
        manufacturer: targetBatch.manufacturer,
        unit: targetBatch.unit,
        purchaseDate: targetBatch.purchaseDate,
        purchaseInvoiceNo: targetBatch.purchaseInvoiceNo,
        supplierName: targetBatch.supplierName,
        expDate: targetBatch.expDate,
        daysDiff: det.daysDiff,
        statusLabel: det.label,
        purchasePrice: targetBatch.purchasePrice,
        salesPrice: targetBatch.salesPrice,
        initialStock: data.kpis.totalPurchased,
        soldQty: data.kpis.totalSold,
        returnedQty: data.kpis.totalReturned,
        stock: data.kpis.currentStock,
        totalCostValuation: data.kpis.currentCostValuation,
        transactions: filteredEntries,
        dailySummaries: filteredDaily,
        kpis: data.kpis,
        totals: {
          totalPurchased: data.kpis.totalPurchased,
          totalPurchasedAmount: data.kpis.totalPurchasedAmount,
          totalSold: data.kpis.totalSold,
          totalSoldAmount: data.kpis.totalSoldAmount,
          totalReturned: data.kpis.totalReturned,
          totalInflow: data.kpis.totalPurchased + data.kpis.totalReturned,
          totalOutflow: data.kpis.totalSold + data.kpis.totalOtherOut,
          currentStock: data.kpis.currentStock,
          currentCostValuation: data.kpis.currentCostValuation,
          currentSalesValuation: data.kpis.currentSalesValuation,
        },
      },
    });
  };

  // Print Individual Batch Traceability Audit Slip
  const handlePrintBatchTraceability = (batch: BatchReportItem) => {
    handlePrintBatchLedgerStatement(batch, 'DETAILED');
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP SUMMARY KPI METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'bn' ? 'মোট ব্যাচ' : 'Total Batches'}
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
            {kpiStats.totalBatches}
          </div>
          <span className="text-[10px] text-slate-400">{filteredBatches.length} items recorded</span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'bn' ? 'মোট মজুদ পরিমাণ' : 'Total Units'}
          </span>
          <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
            {kpiStats.totalStockQty.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">across all batches</span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'bn' ? 'স্টক ক্রয় মূল্য' : 'Cost Valuation'}
          </span>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
            {formatCurrency(kpiStats.totalCostValuation)}
          </div>
          <span className="text-[10px] text-slate-400">Total asset value</span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'bn' ? 'সম্ভাব্য বিক্রয় মান' : 'Retail Valuation'}
          </span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(kpiStats.totalSalesValuation)}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">
            +{formatCurrency(kpiStats.totalSalesValuation - kpiStats.totalCostValuation)} profit
          </span>
        </div>

        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            {language === 'bn' ? 'শীঘ্রই মেয়াদ শেষ' : 'Expiring Soon'}
          </span>
          <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-0.5">
            {kpiStats.expiringSoonCount} <span className="text-xs font-normal">Batches</span>
          </div>
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
            {formatCurrency(kpiStats.expiringSoonValuation)} at risk
          </span>
        </div>

        <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            {language === 'bn' ? 'মেয়াদোত্তীর্ণ স্টক' : 'Expired Stock'}
          </span>
          <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300 mt-0.5">
            {kpiStats.expiredCount} <span className="text-xs font-normal">Batches</span>
          </div>
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400">
            {formatCurrency(kpiStats.expiredValuation)} loss value
          </span>
        </div>
      </div>

      {/* 2. ADVANCED MULTI-FILTER CONTROL PANEL */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {language === 'bn' ? 'ব্যাচ ও মেয়াদভিত্তিক পূর্ণাঙ্গ ফিল্টার ও সার্চ' : 'Batch & Expiry Multi-Filter Panel'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'bn'
                  ? 'ব্যাচ নং, মেয়াদ তারিখ, সাপ্লায়ার বা অবস্থা অনুযায়ী নিখুঁত তথ্য খুঁজুন'
                  : 'Filter by batch number, expiry countdown, supplier, or product category'}
              </p>
            </div>
          </div>

          {/* Export and Print Action Buttons */}
          <div className="flex items-center gap-2">
            {(() => {
              const hasExportPerm = canUserExportReportCsv(currentUser);
              const hasPdfPerm = canUserDownloadReportPdf(currentUser);
              const hasPrintPerm = canUserPrintReportStatement(currentUser);

              return (
                <>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    title={
                      !hasExportPerm
                        ? (language === 'bn' ? 'CSV এক্সপোর্ট করার পারমিশন নেই' : 'No permission to Export CSV')
                        : (language === 'bn' ? 'ব্যাচ CSV এক্সপোর্ট' : 'Export Batches CSV')
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors ${
                      hasExportPerm
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ব্যাচ CSV এক্সপোর্ট' : 'Export Batches CSV'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintBatchReport(true)}
                    title={
                      !hasPdfPerm
                        ? (language === 'bn' ? 'PDF ডাউনলোড করার পারমিশন নেই' : 'No permission to Download PDF')
                        : (language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF')
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors ${
                      hasPdfPerm
                        ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintBatchReport(false)}
                    title={
                      !hasPrintPerm
                        ? (language === 'bn' ? 'স্টেটমেন্ট প্রিন্ট করার পারমিশন নেই' : 'No permission to Print Statement')
                        : (language === 'bn' ? 'প্রিন্ট স্টেটমেন্ট' : 'Print Statement')
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors ${
                      hasPrintPerm
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিন্ট স্টেটমেন্ট' : 'Print Statement'}</span>
                  </button>
                </>
              );
            })()}
          </div>
        </div>

        {/* Filter Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Universal Search Input */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              {language === 'bn' ? 'অনুসন্ধান (ব্যাচ নং, পণ্যের নাম, বারকোড)' : 'Search (Batch, Product, Barcode)'}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search batch # (e.g. B-01), name..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-medium text-slate-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Specific Batch Number Dropdown */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              {language === 'bn' ? 'নির্দিষ্ট ব্যাচ নং' : 'Select Batch No'}
            </label>
            <select
              value={selectedBatchNumber}
              onChange={e => setSelectedBatchNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="ALL">{language === 'bn' ? 'সকল ব্যাচ (All Batches)' : 'All Batches'}</option>
              {uniqueBatchNumbers.map(bn => (
                <option key={bn} value={bn}>
                  {bn}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Product Dropdown */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              {language === 'bn' ? 'নির্দিষ্ট পণ্য' : 'Filter by Product'}
            </label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="ALL">{language === 'bn' ? 'সকল পণ্য' : 'All Products'}</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Status Filter Dropdown */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              {language === 'bn' ? 'ব্যাচ অবস্থা / মেয়াদ' : 'Status & Expiry Filter'}
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="ALL">{language === 'bn' ? 'সকল অবস্থা (All Status)' : 'All Status'}</option>
              <option value="IN_STOCK">{language === 'bn' ? '🟢 মজুদ আছে (In Stock)' : 'In Stock'}</option>
              <option value="EXPIRING_30">{language === 'bn' ? '🚨 শীঘ্রই মেয়াদ শেষ (৩০ দিন)' : 'Expiring in 30 Days'}</option>
              <option value="EXPIRING_60">{language === 'bn' ? '⚠️ শীঘ্রই মেয়াদ শেষ (৬০ দিন)' : 'Expiring in 60 Days'}</option>
              <option value="EXPIRING_90">{language === 'bn' ? 'মেয়াদ শেষ আসন্ন (৯০ দিন)' : 'Expiring in 90 Days'}</option>
              <option value="EXPIRED">{language === 'bn' ? '🔴 মেয়াদোত্তীর্ণ (Expired)' : 'Expired'}</option>
              <option value="FRESH">{language === 'bn' ? '✅ সতেজ স্টক (>৯০ দিন)' : 'Fresh / Valid'}</option>
              <option value="DEPLETED">{language === 'bn' ? '⚪ স্টক শেষ (Out of Stock)' : 'Out of Stock'}</option>
            </select>
          </div>

          {/* 5. Supplier Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              {language === 'bn' ? 'সাপ্লায়ার / মহাজন' : 'Supplier'}
            </label>
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="ALL">{language === 'bn' ? 'সকল সাপ্লায়ার' : 'All Suppliers'}</option>
              {suppliersList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Date Range Filters */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">
              {language === 'bn' ? 'মেয়াদ তারিখ (হতে)' : 'Expiry Date From'}
            </label>
            <input
              type="date"
              value={expDateStart}
              onChange={e => setExpDateStart(e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">
              {language === 'bn' ? 'মেয়াদ তারিখ (পর্যন্ত)' : 'Expiry Date To'}
            </label>
            <input
              type="date"
              value={expDateEnd}
              onChange={e => setExpDateEnd(e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">
              {language === 'bn' ? 'ক্রয় তারিখ (হতে)' : 'Purchase Date From'}
            </label>
            <input
              type="date"
              value={purchaseDateStart}
              onChange={e => setPurchaseDateStart(e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">
              {language === 'bn' ? 'ক্রয় তারিখ (পর্যন্ত)' : 'Purchase Date To'}
            </label>
            <input
              type="date"
              value={purchaseDateEnd}
              onChange={e => setPurchaseDateEnd(e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>
        </div>

        {/* Active Filters Pill Strip & Reset */}
        {(searchQuery ||
          selectedBatchNumber !== 'ALL' ||
          selectedProductId !== 'ALL' ||
          selectedSupplierId !== 'ALL' ||
          statusFilter !== 'ALL' ||
          expDateStart ||
          expDateEnd ||
          purchaseDateStart ||
          purchaseDateEnd) && (
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Active Filters:</span>
            {selectedBatchNumber !== 'ALL' && (
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 rounded font-mono text-[10px] font-bold flex items-center gap-1">
                Batch: {selectedBatchNumber}
                <button type="button" onClick={() => setSelectedBatchNumber('ALL')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded text-[10px] font-bold flex items-center gap-1">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter('ALL')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedBatchNumber('ALL');
                setSelectedProductId('ALL');
                setSelectedCategoryId('ALL');
                setSelectedSupplierId('ALL');
                setStatusFilter('ALL');
                setExpDateStart('');
                setExpDateEnd('');
                setPurchaseDateStart('');
                setPurchaseDateEnd('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer ml-auto"
            >
              {language === 'bn' ? 'সব ফিল্টার রিসেট' : 'Clear All Filters'}
            </button>
          </div>
        )}
      </div>

      {/* 2.1 QUICK BATCH SELECTOR STRIP */}
      <div className="bg-slate-50 dark:bg-slate-850/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap shrink-0 flex items-center gap-1">
          <Boxes className="w-3.5 h-3.5 text-indigo-600" />
          {language === 'bn' ? 'দ্রুত ব্যাচ লেজার ও ক্রয়-বিক্রয় দেখতে ক্লিক করুন:' : 'Quick Batch Traceability:'}
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => setSelectedBatchNumber('ALL')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
              selectedBatchNumber === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            {language === 'bn' ? 'সকল ব্যাচ (All)' : 'All Batches'}
          </button>
          {uniqueBatchNumbers.slice(0, 15).map(bn => {
            const isSelected = selectedBatchNumber === bn;
            const batchMatches = allBatchItems.filter(b => b.batchNumber === bn);
            const totalStock = batchMatches.reduce((s, b) => s + b.stock, 0);
            return (
              <button
                key={bn}
                type="button"
                onClick={() => {
                  setSelectedBatchNumber(bn);
                  // Auto-focus this batch
                }}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300 dark:ring-indigo-800'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300'
                }`}
              >
                <span>{bn}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                    isSelected
                      ? 'bg-indigo-800 text-indigo-100'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {totalStock}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2.2 SPECIFIC BATCH DATE-WISE PURCHASE & SALES LEDGER (TRIGGERED BY BATCH NO SELECTION) */}
      {selectedBatchLedgerData && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-500/40 dark:border-indigo-600/50 shadow-lg overflow-hidden transition-all animate-in fade-in-50 duration-200">
          {/* Header Card */}
          <div className="p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-indigo-500 text-white font-mono font-black text-xs rounded-md shadow-2xs">
                    BATCH #{selectedBatchLedgerData.batch.batchNumber}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold tracking-tight">
                    {language === 'bn'
                      ? 'তারিখভিত্তিক ক্রয় ও বিক্রয় হিসাব বিবরণী'
                      : 'Date-wise Purchase & Sales Movement Ledger'}
                  </h3>
                </div>
                <div className="text-xs text-indigo-200/90 font-medium mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white">{selectedBatchLedgerData.batch.productName}</span>
                  {selectedBatchLedgerData.batch.productNameBn && (
                    <span className="text-indigo-300">({selectedBatchLedgerData.batch.productNameBn})</span>
                  )}
                  <span className="text-indigo-400 font-mono">• SKU: {selectedBatchLedgerData.batch.sku}</span>
                  {selectedBatchLedgerData.batch.categoryName && (
                    <span className="text-indigo-300">• {selectedBatchLedgerData.batch.categoryName}</span>
                  )}
                  {selectedBatchLedgerData.batch.expDate && (
                    <span className="text-amber-300 font-mono">• Exp: {selectedBatchLedgerData.batch.expDate}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions for this Batch */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePrintBatchLedgerStatement(selectedBatchLedgerData.batch, selectedBatchLedgerView)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title={
                  selectedBatchLedgerView === 'DETAILED'
                    ? 'Print Detailed Invoices & Vouchers Statement'
                    : 'Print Daily Date-wise Summary Statement'
                }
              >
                <Printer className="w-3.5 h-3.5" />
                <span>
                  {selectedBatchLedgerView === 'DETAILED'
                    ? language === 'bn'
                      ? 'প্রিন্ট Detailed Invoices'
                      : 'Print Detailed Invoices'
                    : language === 'bn'
                    ? 'প্রিন্ট Daily Summary'
                    : 'Print Daily Summary'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleExportBatchLedgerCSV}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Export this batch ledger to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'CSV ডাউনলোড' : 'CSV'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedBatchNumber('ALL')}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                title="Close and return to all batches"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar for Selected Batch */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-indigo-50/40 dark:bg-slate-850/60 border-b border-indigo-100 dark:border-slate-800">
            {/* Total Purchased / Inflow */}
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? '📥 মোট ক্রয় / ইনফ্লো' : 'Total Inflow (Purchase)'}
              </span>
              <div className="text-base sm:text-lg font-bold font-mono text-indigo-700 dark:text-indigo-400 mt-0.5">
                {selectedBatchLedgerData.kpis.totalPurchased} <span className="text-xs font-normal text-slate-500">{selectedBatchLedgerData.batch.unit}</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500">
                ৳{selectedBatchLedgerData.kpis.totalPurchasedAmount.toLocaleString()} Purchase Cost
              </span>
            </div>

            {/* Total Sold / Outflow */}
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? '📤 মোট বিক্রয়' : 'Total Sold (Outflow)'}
              </span>
              <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {selectedBatchLedgerData.kpis.totalSold} <span className="text-xs font-normal text-slate-500">{selectedBatchLedgerData.batch.unit}</span>
              </div>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 font-bold">
                ৳{selectedBatchLedgerData.kpis.totalSoldAmount.toLocaleString()} Sales Revenue
              </span>
            </div>

            {/* Total Returns */}
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? '🔄 গ্রাহক ফেরত' : 'Customer Returns'}
              </span>
              <div className="text-base sm:text-lg font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                {selectedBatchLedgerData.kpis.totalReturned} <span className="text-xs font-normal text-slate-500">{selectedBatchLedgerData.batch.unit}</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500">
                Restocked into Batch
              </span>
            </div>

            {/* Current Stock */}
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">
                {language === 'bn' ? '📦 বর্তমান অবশিষ্ট মজুদ' : 'Current Batch Stock'}
              </span>
              <div className="text-lg sm:text-xl font-black font-mono text-white mt-0.5">
                {selectedBatchLedgerData.kpis.currentStock} <span className="text-xs font-normal text-indigo-200">{selectedBatchLedgerData.batch.unit}</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-100">
                ৳{selectedBatchLedgerData.kpis.currentCostValuation.toLocaleString()} Asset Value
              </span>
            </div>
          </div>

          {/* Sub-toolbar: View Switcher & Date Filter */}
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedBatchLedgerView('DAILY')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  selectedBatchLedgerView === 'DAILY'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {language === 'bn' ? '📅 তারিখভিত্তিক সারাংশ (Daily Summary)' : '📅 Daily Date-wise Summary'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedBatchLedgerView('DETAILED')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  selectedBatchLedgerView === 'DETAILED'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {language === 'bn' ? '🧾 চালানভিত্তিক বিস্তারিত তালিকা (Detailed Invoices)' : '🧾 Detailed Invoices & Vouchers'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={batchLedgerDateFilter}
                onChange={e => setBatchLedgerDateFilter(e.target.value)}
                placeholder="Filter by date"
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
              />
              {batchLedgerDateFilter && (
                <button
                  type="button"
                  onClick={() => setBatchLedgerDateFilter('')}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table Area for Selected Batch */}
          <div className="overflow-x-auto">
            {selectedBatchLedgerView === 'DAILY' ? (
              /* Daily Summary Table */
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                    <th className="py-2.5 px-3">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'ক্রয় পরিমাণ (+)' : 'Purchased Inflow (+)'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'বিক্রয় পরিমাণ (-)' : 'Sold Outflow (-)'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'ফেরত (+)' : 'Customer Return (+)'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'দিনের ক্রয় মূল্য' : 'Daily Purchase ৳'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'দিনের বিক্রয় মূল্য' : 'Daily Sales ৳'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'দিনের নেট তারতম্য' : 'Net Movement'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'দিন শেষে অবশিষ্ট ব্যালেন্স' : 'Closing Stock Balance'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'চালান সংখ্যা' : 'Transactions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedBatchLedgerData.dailySummaries
                    .filter(d => !batchLedgerDateFilter || d.date === batchLedgerDateFilter)
                    .map(day => (
                      <tr key={day.date} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/40">
                        {/* Date */}
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {day.date}
                        </td>

                        {/* Purchase Qty */}
                        <td className="py-2.5 px-3 text-center">
                          {day.purchasedQty > 0 ? (
                            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full font-mono font-black text-xs inline-flex items-center gap-1">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              +{day.purchasedQty} {selectedBatchLedgerData.batch.unit}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>

                        {/* Sold Qty */}
                        <td className="py-2.5 px-3 text-center">
                          {day.soldQty > 0 ? (
                            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-full font-mono font-black text-xs inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3 text-amber-600" />
                              -{day.soldQty} {selectedBatchLedgerData.batch.unit}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>

                        {/* Return Qty */}
                        <td className="py-2.5 px-3 text-center">
                          {day.returnedQty > 0 ? (
                            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full font-mono font-bold text-xs">
                              +{day.returnedQty}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>

                        {/* Daily Purchase Amount */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {day.purchasedAmount > 0 ? `৳${day.purchasedAmount.toLocaleString()}` : '-'}
                        </td>

                        {/* Daily Sales Amount */}
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {day.soldAmount > 0 ? `৳${day.soldAmount.toLocaleString()}` : '-'}
                        </td>

                        {/* Net Movement */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          <span
                            className={
                              day.netDayMovement > 0
                                ? 'text-emerald-600'
                                : day.netDayMovement < 0
                                ? 'text-amber-600'
                                : 'text-slate-400'
                            }
                          >
                            {day.netDayMovement > 0 ? `+${day.netDayMovement}` : day.netDayMovement} {selectedBatchLedgerData.batch.unit}
                          </span>
                        </td>

                        {/* Closing Stock Balance */}
                        <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-900 dark:text-indigo-200 bg-indigo-50/40 dark:bg-slate-800/40 whitespace-nowrap">
                          {day.closingBalance} {selectedBatchLedgerData.batch.unit}
                        </td>

                        {/* Transaction Count */}
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold">
                            {day.transactionCount} {day.transactionCount === 1 ? 'Entry' : 'Entries'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              /* Detailed Transaction Table */
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                    <th className="py-2.5 px-3">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="py-2.5 px-3">{language === 'bn' ? 'লেনদেনের ধরন' : 'Type'}</th>
                    <th className="py-2.5 px-3">{language === 'bn' ? 'ভাউচার / ইনভয়েস নং' : 'Doc / Invoice #'}</th>
                    <th className="py-2.5 px-3">{language === 'bn' ? 'মেয়াদ তারিখ' : 'Expiry Date'}</th>
                    <th className="py-2.5 px-3">{language === 'bn' ? 'কাস্টমার / সরবরাহকারী' : 'Customer / Supplier'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'ক্রয় (+)' : 'Inflow (+)'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'বিক্রয় (-)' : 'Outflow (-)'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'দর / রেট' : 'Rate (৳)'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'মোট টাকা' : 'Total (৳)'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'রানিং ব্যালেন্স' : 'Running Stock'}</th>
                    <th className="py-2.5 px-3">{language === 'bn' ? 'নোট' : 'Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedBatchLedgerData.entriesDescending
                    .filter(
                      e =>
                        !batchLedgerDateFilter ||
                        e.date === batchLedgerDateFilter ||
                        e.docNo.toLowerCase().includes(batchLedgerDateFilter.toLowerCase()) ||
                        e.partyName.toLowerCase().includes(batchLedgerDateFilter.toLowerCase())
                    )
                    .map(entry => (
                      <tr key={entry.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/40">
                        {/* Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {entry.date}
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.type === 'PURCHASE'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                                : entry.type === 'SALE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                : entry.type === 'SALE_RETURN'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200'
                                : entry.type === 'EXPIRED_RETURN'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {entry.typeLabel}
                          </span>
                        </td>

                        {/* Doc / Invoice No */}
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {entry.docNo}
                        </td>

                        {/* Expiry Date */}
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                          {selectedBatchLedgerData.batch.expDate || 'N/A'}
                        </td>

                        {/* Customer / Supplier */}
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {entry.partyName}
                        </td>

                        {/* Inflow (+) */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {entry.inQty > 0 ? `+${entry.inQty}` : '-'}
                        </td>

                        {/* Outflow (-) */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                          {entry.outQty > 0 ? `-${entry.outQty}` : '-'}
                        </td>

                        {/* Rate */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          ৳{Number(entry.rate || 0).toLocaleString()}
                        </td>

                        {/* Total */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ৳{Number(entry.total || 0).toLocaleString()}
                        </td>

                        {/* Running Balance */}
                        <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-900 dark:text-indigo-200 bg-indigo-50/40 dark:bg-slate-800/40 whitespace-nowrap">
                          {entry.runningBalance} {selectedBatchLedgerData.batch.unit}
                        </td>

                        {/* Notes */}
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[150px]">
                          {entry.notes || '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 3. BATCH INVENTORY MASTER TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
              {language === 'bn' ? 'ব্যাচ ও মেয়াদভিত্তিক স্টক তালিকা' : 'Batch Inventory Records'}
            </span>
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-full font-mono text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
              {filteredBatches.length} Batches Found
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {language === 'bn' ? 'বিস্তারিত দেখতে ব্যাচ লাইনে ক্লিক করুন' : 'Click trace button to view movement history'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF9FE] dark:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                <th className="py-3 px-3 text-center w-8">Sl</th>
                <th className="py-3 px-3">Batch Number</th>
                <th className="py-3 px-3 min-w-[200px]">Product Details</th>
                <th className="py-3 px-3">Purchase Date</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3 text-center">Expiry Status</th>
                <th className="py-3 px-3 text-right">Cost (৳)</th>
                <th className="py-3 px-3 text-right">Sales (৳)</th>
                <th className="py-3 px-3 text-center">Initial</th>
                <th className="py-3 px-3 text-center">Sold</th>
                <th className="py-3 px-3 text-right">Current Stock</th>
                <th className="py-3 px-3 text-right">Total Value (৳)</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <Boxes className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-sm">
                      {language === 'bn' ? 'কোনো ব্যাচ পাওয়া যায়নি' : 'No batches match the filter criteria'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {language === 'bn'
                        ? 'অনুগ্রহ করে উপরের ফিল্টার বা সার্চ কিওয়ার্ড পরিবর্তন করে চেষ্টা করুন।'
                        : 'Try adjusting the search query or clearing some filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch, index) => {
                  const statusDetails = getBatchStatusDetails(batch);
                  const StatusIcon = statusDetails.icon;
                  const totalLineValuation = batch.stock * batch.purchasePrice;

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        statusDetails.status === 'EXPIRED' && batch.stock > 0
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : statusDetails.status === 'EXPIRING_30' && batch.stock > 0
                          ? 'bg-amber-50/30 dark:bg-amber-950/10'
                          : ''
                      }`}
                    >
                      {/* Sl */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Batch Number */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedBatchNumber(batch.batchNumber)}
                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded font-mono font-bold text-xs cursor-pointer transition-all hover:scale-105"
                            title={language === 'bn' ? 'তারিখভিত্তিক ক্রয়-বিক্রয় হিসাব দেখতে ক্লিক করুন' : 'Click to inspect date-wise purchase & sales ledger'}
                          >
                            {batch.batchNumber}
                          </button>
                        </div>
                      </td>

                      {/* Product Details */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{batch.productName}</span>
                          {batch.productNameBn && (
                            <span className="text-slate-500 font-normal">({batch.productNameBn})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{batch.sku}</span>
                          {batch.categoryName && <span>• {batch.categoryName}</span>}
                          {batch.generic && <span>• {batch.generic}</span>}
                        </div>
                      </td>

                      {/* Purchase Date */}
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                        {batch.purchaseDate || '-'}
                        {batch.purchaseInvoiceNo && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            #{batch.purchaseInvoiceNo}
                          </div>
                        )}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-2.5 px-3 font-mono">
                        {batch.expDate ? (
                          <span
                            className={`font-semibold text-xs ${
                              statusDetails.status === 'EXPIRED'
                                ? 'text-rose-600 font-bold'
                                : statusDetails.status === 'EXPIRING_30'
                                ? 'text-amber-600 font-bold'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {batch.expDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {language === 'bn' ? 'মেয়াদহীন' : 'No Exp'}
                          </span>
                        )}
                      </td>

                      {/* Expiry Status Badge */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${statusDetails.badgeClass}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusDetails.label}</span>
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(batch.purchasePrice)}
                      </td>

                      {/* Sales Price */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(batch.salesPrice)}
                      </td>

                      {/* Initial Stock */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                        {batch.initialStock}
                      </td>

                      {/* Sold Qty */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                        {batch.soldQty > 0 ? `+${batch.soldQty}` : '0'}
                      </td>

                      {/* Current Stock */}
                      <td className="py-2.5 px-3 text-right">
                        <div
                          className={`font-mono font-bold text-xs ${
                            batch.stock <= 0
                              ? 'text-slate-400 line-through'
                              : batch.stock <= 5
                              ? 'text-amber-600'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {batch.stock} <span className="text-[10px] font-normal text-slate-400">{batch.unit}</span>
                        </div>
                      </td>

                      {/* Total Asset Valuation */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(totalLineValuation)}
                      </td>

                      {/* Supplier */}
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[130px]">
                        {batch.supplierName || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedBatchNumber(batch.batchNumber)}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                            title={language === 'bn' ? 'তারিখভিত্তিক ক্রয় ও বিক্রয় লেজার' : 'View Date-wise Purchase & Sales Ledger'}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBatchForDrilldown(batch)}
                            className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                            title={language === 'bn' ? 'ব্যাচ ট্রেস ও ভাউচার হিস্ট্রি' : 'View Batch Traceability Ledger'}
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductForBatchManage(batch.productRef)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            title={language === 'bn' ? 'ব্যাচ সম্পাদনা / পরিচালনা' : 'Manage Batches'}
                          >
                            <Boxes className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. BATCH TRACEABILITY & MOVEMENT DRILLDOWN MODAL */}
      {selectedBatchForDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-indigo-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Layers className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base tracking-tight">
                      {language === 'bn' ? 'ব্যাচ ট্রেস ও ইনভেন্টরি হিস্ট্রি' : 'Batch Movement & Traceability Audit'}
                    </h3>
                    <span className="px-2 py-0.5 bg-indigo-500/40 border border-indigo-300/40 rounded-full font-mono text-[10px] text-indigo-200 font-bold">
                      Batch #{selectedBatchForDrilldown.batchNumber}
                    </span>
                  </div>
                  <p className="text-indigo-200/80 text-[11px] mt-0.5">
                    {selectedBatchForDrilldown.productName} ({selectedBatchForDrilldown.sku})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBatchForDrilldown(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick KPI Strip */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Purchase Date</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedBatchForDrilldown.purchaseDate}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Expiry Date</span>
                <span className="font-mono font-bold text-rose-600">
                  {selectedBatchForDrilldown.expDate || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Sold</span>
                <span className="font-mono font-bold text-emerald-600">
                  {selectedBatchForDrilldown.soldQty} {selectedBatchForDrilldown.unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Stock</span>
                <span className="font-mono font-bold text-indigo-600">
                  {selectedBatchForDrilldown.stock} {selectedBatchForDrilldown.unit}
                </span>
              </div>
            </div>

            {/* Movement Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Doc Type</th>
                      <th className="py-2.5 px-3">Voucher / Invoice</th>
                      <th className="py-2.5 px-3">Party Name</th>
                      <th className="py-2.5 px-3 text-right">In Qty</th>
                      <th className="py-2.5 px-3 text-right">Out Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Total (৳)</th>
                      <th className="py-2.5 px-3 text-center">Stock Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {batchMovementHistory.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No transactions recorded for this batch.
                        </td>
                      </tr>
                    ) : (
                      batchMovementHistory.map((mv, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{mv.date}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                mv.type === 'INITIAL' || mv.type === 'PURCHASE'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                                  : mv.type === 'SALE'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                  : mv.type === 'SALE_RETURN'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                              }`}
                            >
                              {mv.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-100">
                            {mv.docNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {mv.partyName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600">
                            {mv.inQty > 0 ? `+${mv.inQty}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                            {mv.outQty > 0 ? `-${mv.outQty}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(mv.rate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(mv.total)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/40 dark:bg-slate-800/40">
                            {mv.runningBalance} {selectedBatchForDrilldown.unit}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handlePrintBatchTraceability(selectedBatchForDrilldown)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ট্রেস হিস্ট্রি প্রিন্ট করুন' : 'Print Traceability Slip'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedBatchForDrilldown(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. EDIT / MANAGE BATCHES MODAL */}
      {productForBatchManage && (
        <BatchManagementModal
          product={productForBatchManage}
          onClose={() => setProductForBatchManage(null)}
        />
      )}
    </div>
  );
};
