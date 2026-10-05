import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductBatch } from '../../types';
import { BatchManagementModal } from './BatchManagementModal';
import { normalizeDateToISO, getDaysRemaining, isExpiredDate } from '../../utils/dateUtils';
import {
  canUserExportProductCsv,
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
  Printer,
  Download,
  Layers,
  TrendingDown,
  Sparkles,
  RotateCcw,
  X,
  Plus,
  Edit2,
  Building2,
  ChevronDown,
  ChevronRight,
  Info,
  RefreshCw,
  Tag,
  ShoppingBag,
  Zap,
  Barcode,
} from 'lucide-react';

export interface FlattenedBatchItem {
  id: string;
  batchId: string;
  batchNumber: string;
  productId: string;
  productName: string;
  productNameBn?: string;
  sku: string;
  barcode?: string;
  categoryName?: string;
  generic?: string;
  manufacturer?: string;
  unit: string;
  rackLocation?: string;
  expDate: string;
  mfgDate?: string;
  purchaseDate?: string;
  purchaseInvoiceNo?: string;
  purchasePrice: number;
  salesPrice: number;
  stock: number;
  initialStock: number;
  supplierName?: string;
  supplierId?: string;
  daysRemaining: number | null;
  shelfLifeStatus: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD' | 'NO_EXPIRY';
  isFefoPriority: boolean;
  productRef: Product;
  strength?: string;
  dosageForm?: string;
  notes?: string;
}

// Convert Bengali digits to English digits
const bnToEnDigits = (str: string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[০-৯]/g, (d) => String(bnDigits.indexOf(d)));
};

// Convert English digits to Bengali digits
const enToBnDigits = (str: string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
};

export const BatchInventoryView: React.FC = () => {
  const {
    products,
    categories,
    language,
    formatCurrency,
    openPrintModal,
    addExpiredReturnLog,
    updateProductBatches,
    showToast,
    currentUser,
  } = useApp();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'EXPIRING_30_DAYS' | 'GOOD' | 'NO_EXPIRY'>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedGeneric, setSelectedGeneric] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'FEFO' | 'EXP_DESC' | 'STOCK_DESC' | 'BATCH_ASC' | 'VALUE_DESC'>('FEFO');
  const [groupByBatch, setGroupByBatch] = useState<boolean>(true);

  // Expanded Batch Accordion State (when grouped)
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  // Modals state
  const [selectedProductForBatchModal, setSelectedProductForBatchModal] = useState<Product | null>(null);
  const [writeOffModalItem, setWriteOffModalItem] = useState<FlattenedBatchItem | null>(null);
  const [writeOffQty, setWriteOffQty] = useState<number>(1);
  const [writeOffReason, setWriteOffReason] = useState<string>('EXPIRY_DAMAGE');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTimestamp = new Date(todayStr).getTime();

  // Helper to calculate shelf life status
  const calculateShelfLife = (expDate?: string) => {
    const diffDays = getDaysRemaining(expDate);
    if (diffDays === null) {
      return { daysRemaining: null, status: 'NO_EXPIRY' as const };
    }
    if (diffDays <= 0) return { daysRemaining: diffDays, status: 'EXPIRED' as const };
    if (diffDays <= 15) return { daysRemaining: diffDays, status: 'CRITICAL' as const };
    if (diffDays <= 45) return { daysRemaining: diffDays, status: 'WARNING' as const };
    return { daysRemaining: diffDays, status: 'GOOD' as const };
  };

  // Extract all batch entries across products
  const allBatchItems = useMemo<FlattenedBatchItem[]>(() => {
    const items: FlattenedBatchItem[] = [];

    products.forEach((p) => {
      const categoryObj = categories.find((c) => c.id === p.categoryId);
      const categoryName = categoryObj ? categoryObj.name : undefined;

      // Identify FEFO priority batch for this product (earliest valid expiring batch with stock > 0)
      let earliestExpDate = '9999-12-31';
      let fefoBatchId: string | null = null;

      if (p.batches && p.batches.length > 0) {
        p.batches.forEach((b) => {
          const bExpISO = normalizeDateToISO(b.expDate);
          if (b.stock > 0 && bExpISO && bExpISO < earliestExpDate && !isExpiredDate(bExpISO, true)) {
            earliestExpDate = bExpISO;
            fefoBatchId = b.id;
          }
        });
      } else if (p.expDate && p.stock > 0 && !isExpiredDate(p.expDate, true)) {
        fefoBatchId = `default-batch-${p.id}`;
      }

      if (p.batches && p.batches.length > 0) {
        p.batches.forEach((b) => {
          const { daysRemaining, status } = calculateShelfLife(b.expDate);
          items.push({
            id: `item-${p.id}-${b.id}`,
            batchId: b.id,
            batchNumber: b.batchNumber || p.batchNumber || 'B-01',
            productId: p.id,
            productName: p.name,
            productNameBn: p.nameBn,
            sku: p.sku,
            barcode: p.barcode,
            categoryName,
            generic: p.generic,
            manufacturer: p.manufacturer,
            unit: p.unit || 'Pcs',
            rackLocation: p.rackLocation,
            expDate: b.expDate || p.expDate || '',
            mfgDate: b.mfgDate,
            purchaseDate: b.purchaseDate || p.createdAt,
            purchaseInvoiceNo: b.purchaseInvoiceNo,
            purchasePrice: Number(b.purchasePrice ?? p.purchasePrice ?? 0),
            salesPrice: Number(b.salesPrice ?? p.salesPrice ?? 0),
            stock: Number(b.stock ?? 0),
            initialStock: Number(b.initialStock ?? b.stock ?? p.stock ?? 0),
            supplierName: b.supplierName,
            supplierId: b.supplierId,
            daysRemaining,
            shelfLifeStatus: status,
            isFefoPriority: b.id === fefoBatchId,
            productRef: p,
            strength: p.strength,
            dosageForm: p.dosageForm,
            notes: b.notes,
          });
        });
      } else {
        // Product has no array of batches yet -> render default batch
        const { daysRemaining, status } = calculateShelfLife(p.expDate);
        items.push({
          id: `item-def-${p.id}`,
          batchId: `default-batch-${p.id}`,
          batchNumber: p.batchNumber && p.batchNumber.trim() ? p.batchNumber.trim() : 'B-DEFAULT',
          productId: p.id,
          productName: p.name,
          productNameBn: p.nameBn,
          sku: p.sku,
          barcode: p.barcode,
          categoryName,
          generic: p.generic,
          manufacturer: p.manufacturer,
          unit: p.unit || 'Pcs',
          rackLocation: p.rackLocation,
          expDate: p.expDate || '',
          purchaseDate: p.createdAt,
          purchaseInvoiceNo: 'INITIAL-STOCK',
          purchasePrice: Number(p.purchasePrice || 0),
          salesPrice: Number(p.salesPrice || 0),
          stock: Number(p.stock || 0),
          initialStock: Number(p.stock || 0),
          daysRemaining,
          shelfLifeStatus: status,
          isFefoPriority: fefoBatchId === `default-batch-${p.id}`,
          productRef: p,
          strength: p.strength,
          dosageForm: p.dosageForm,
          notes: undefined,
        });
      }
    });

    return items;
  }, [products, categories, todayTimestamp]);

  // Unique Generics
  const uniqueGenerics = useMemo(() => {
    const set = new Set<string>();
    allBatchItems.forEach((i) => {
      if (i.generic && i.generic.trim()) set.add(i.generic.trim());
    });
    return Array.from(set).sort();
  }, [allBatchItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    let result = [...allBatchItems];

    // Search query - Multi-term, bilingual digits, batch formatting & field-spanning
    if (searchQuery.trim()) {
      const rawQuery = searchQuery.trim().toLowerCase();
      const enQuery = bnToEnDigits(rawQuery);

      const queryTerms = rawQuery.split(/\s+/).filter(Boolean);
      const enQueryTerms = enQuery.split(/\s+/).filter(Boolean);

      result = result.filter((i) => {
        const prod = i.productRef;
        const bNo = (i.batchNumber || '').toLowerCase();
        const bNoClean = bNo.replace(/[^a-z0-9]/gi, '');

        const searchableTokens: string[] = [
          bNo,
          bNoClean,
          `batch ${bNo}`,
          `batch #${bNo}`,
          `#${bNo}`,
          `batch-${bNo}`,
          i.productName?.toLowerCase() || '',
          i.productNameBn?.toLowerCase() || '',
          i.sku?.toLowerCase() || '',
          i.barcode?.toLowerCase() || '',
          i.generic?.toLowerCase() || '',
          i.manufacturer?.toLowerCase() || '',
          i.categoryName?.toLowerCase() || '',
          i.rackLocation?.toLowerCase() || '',
          i.purchaseInvoiceNo?.toLowerCase() || '',
          i.supplierName?.toLowerCase() || '',
          i.expDate?.toLowerCase() || '',
          i.mfgDate?.toLowerCase() || '',
          i.unit?.toLowerCase() || '',
          prod?.strength?.toLowerCase() || '',
          prod?.dosageForm?.toLowerCase() || '',
          prod?.dosageSchedule?.toLowerCase() || '',
          ...(prod?.diseases || []).map((d) => d.toLowerCase()),
          i.notes?.toLowerCase() || '',
        ];

        const combinedText = searchableTokens.join(' ');
        const combinedEnText = bnToEnDigits(combinedText);
        const combinedBnText = enToBnDigits(combinedText);

        return queryTerms.every((term, idx) => {
          const enTerm = enQueryTerms[idx] || term;
          const cleanTerm = term.replace(/[^a-z0-9]/gi, '');

          // If the user literally typed "batch" or "#", it's an intentional match for batch context
          if (term === 'batch' || term === '#') return true;

          return (
            combinedText.includes(term) ||
            combinedEnText.includes(enTerm) ||
            combinedBnText.includes(term) ||
            (cleanTerm.length > 0 && bNoClean.includes(cleanTerm))
          );
        });
      });
    }

    // Shelf life status
    if (statusFilter === 'EXPIRING_30_DAYS' || statusFilter === 'EXPIRING_30') {
      result = result.filter(
        (i) => i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 30 && i.stock > 0
      );
    } else if (statusFilter !== 'ALL') {
      result = result.filter((i) => i.shelfLifeStatus === statusFilter);
    }

    // Stock availability
    if (stockFilter === 'IN_STOCK') {
      result = result.filter((i) => i.stock > 0);
    } else if (stockFilter === 'OUT_OF_STOCK') {
      result = result.filter((i) => i.stock <= 0);
    }

    // Category
    if (selectedCategory !== 'ALL') {
      const catObj = categories.find((c) => c.id === selectedCategory);
      if (catObj) {
        result = result.filter((i) => i.categoryName === catObj.name);
      }
    }

    // Generic
    if (selectedGeneric !== 'ALL') {
      result = result.filter((i) => i.generic?.trim().toLowerCase() === selectedGeneric.trim().toLowerCase());
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'FEFO') {
        const aExp = normalizeDateToISO(a.expDate);
        const bExp = normalizeDateToISO(b.expDate);
        if (!aExp) return 1;
        if (!bExp) return -1;
        return aExp.localeCompare(bExp);
      }
      if (sortBy === 'EXP_DESC') {
        const aExp = normalizeDateToISO(a.expDate);
        const bExp = normalizeDateToISO(b.expDate);
        if (!aExp) return 1;
        if (!bExp) return -1;
        return bExp.localeCompare(aExp);
      }
      if (sortBy === 'STOCK_DESC') {
        return b.stock - a.stock;
      }
      if (sortBy === 'BATCH_ASC') {
        return a.batchNumber.localeCompare(b.batchNumber);
      }
      if (sortBy === 'VALUE_DESC') {
        return b.stock * b.purchasePrice - a.stock * a.purchasePrice;
      }
      return 0;
    });

    return result;
  }, [
    allBatchItems,
    searchQuery,
    statusFilter,
    stockFilter,
    selectedCategory,
    selectedGeneric,
    sortBy,
    categories,
  ]);

  // Grouped by Batch Number
  const groupedByBatchNumber = useMemo(() => {
    const map = new Map<string, FlattenedBatchItem[]>();
    filteredItems.forEach((item) => {
      const bNo = item.batchNumber || 'Unbatched';
      if (!map.has(bNo)) map.set(bNo, []);
      map.get(bNo)!.push(item);
    });
    return Array.from(map.entries()).map(([batchNumber, items]) => {
      const totalStock = items.reduce((sum, i) => sum + i.stock, 0);
      const totalCostValue = items.reduce((sum, i) => sum + i.stock * i.purchasePrice, 0);
      const totalRetailValue = items.reduce((sum, i) => sum + i.stock * i.salesPrice, 0);
      
      // Nearest expiry date in batch
      const datedItems = items.filter((i) => Boolean(i.expDate)).sort((a, b) => a.expDate.localeCompare(b.expDate));
      const nearestExpDate = datedItems.length > 0 ? datedItems[0].expDate : undefined;
      const { status: worstStatus, daysRemaining } = calculateShelfLife(nearestExpDate);

      return {
        batchNumber,
        items,
        totalStock,
        totalCostValue,
        totalRetailValue,
        nearestExpDate,
        worstStatus,
        daysRemaining,
      };
    });
  }, [filteredItems]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalActiveBatches = groupedByBatchNumber.filter((g) => g.totalStock > 0).length;
    const totalBatchItemsCount = filteredItems.length;
    const totalUnits = filteredItems.reduce((sum, i) => sum + Math.max(0, i.stock), 0);
    const totalCostValuation = filteredItems.reduce((sum, i) => sum + Math.max(0, i.stock) * i.purchasePrice, 0);
    const totalRetailValuation = filteredItems.reduce((sum, i) => sum + Math.max(0, i.stock) * i.salesPrice, 0);

    const expiredItems = filteredItems.filter((i) => i.shelfLifeStatus === 'EXPIRED' && i.stock > 0);
    const expiredCount = expiredItems.length;
    const expiredValuation = expiredItems.reduce((sum, i) => sum + i.stock * i.purchasePrice, 0);

    const criticalItems = filteredItems.filter((i) => i.shelfLifeStatus === 'CRITICAL' && i.stock > 0);
    const criticalCount = criticalItems.length;
    const criticalValuation = criticalItems.reduce((sum, i) => sum + i.stock * i.purchasePrice, 0);

    const warningItems = filteredItems.filter((i) => i.shelfLifeStatus === 'WARNING' && i.stock > 0);
    const warningCount = warningItems.length;
    const warningValuation = warningItems.reduce((sum, i) => sum + i.stock * i.purchasePrice, 0);

    const healthyItems = filteredItems.filter((i) => i.shelfLifeStatus === 'GOOD' && i.stock > 0);
    const healthyCount = healthyItems.length;

    // Items expiring specifically within 30 days (0 <= daysRemaining <= 30) across all active stock
    const expiring30DaysItems = allBatchItems.filter(
      (i) => i.stock > 0 && i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 30
    );
    const expiring30DaysCount = expiring30DaysItems.length;
    const expiring30DaysValuation = expiring30DaysItems.reduce((sum, i) => sum + i.stock * i.purchasePrice, 0);
    const expiring30DaysUnits = expiring30DaysItems.reduce((sum, i) => sum + i.stock, 0);

    return {
      totalActiveBatches,
      totalBatchItemsCount,
      totalUnits,
      totalCostValuation,
      totalRetailValuation,
      expiredCount,
      expiredValuation,
      criticalCount,
      criticalValuation,
      warningCount,
      warningValuation,
      healthyCount,
      expiring30DaysCount,
      expiring30DaysValuation,
      expiring30DaysUnits,
    };
  }, [groupedByBatchNumber, filteredItems, allBatchItems]);

  const toggleBatchExpand = (bNo: string) => {
    setExpandedBatches((prev) => ({ ...prev, [bNo]: !prev[bNo] }));
  };

  const expandAllBatches = () => {
    const next: Record<string, boolean> = {};
    groupedByBatchNumber.forEach((g) => {
      next[g.batchNumber] = true;
    });
    setExpandedBatches(next);
  };

  const collapseAllBatches = () => {
    setExpandedBatches({});
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setStockFilter('ALL');
    setSelectedCategory('ALL');
    setSelectedGeneric('ALL');
    setSortBy('FEFO');
  };

  // Handle Print Report
  const handlePrintBatchReport = () => {
    if (!canUserPrintReportStatement(currentUser)) {
      showToast(
        language === 'bn'
          ? 'আপনার ব্যাচ রিপোর্ট প্রিন্ট বা দেখার পারমিশন নেই।'
          : 'You do not have permission to Print Statement or View Reports.',
        'error'
      );
      return;
    }

    const reportTitle = language === 'bn' ? 'ব্যাচভিত্তিক ইনভেন্টরি ও মেয়াদের অবস্থা রিপোর্ট' : 'BATCH INVENTORY & SHELF-LIFE REPORT';
    openPrintModal({
      type: 'REPORT',
      title: reportTitle,
      data: {
        reportTitle,
        period: `${language === 'bn' ? 'তারিখ:' : 'Report Date:'} ${new Date().toLocaleDateString('en-GB')}`,
        filters: [
          { label: 'Status Filter', value: statusFilter },
          { label: 'Stock Filter', value: stockFilter },
          { label: 'Search Query', value: searchQuery || 'None' },
        ],
        kpis: [
          { label: language === 'bn' ? 'মোট ব্যাচ সংখ্যা' : 'Active Batches', value: `${metrics.totalActiveBatches}` },
          { label: language === 'bn' ? 'মোট পণ্য সংখ্যা' : 'Total Units', value: `${metrics.totalUnits}` },
          { label: language === 'bn' ? 'ক্রয় মূল্য মূল্যায়ন' : 'Total Cost Value', value: metrics.totalCostValuation },
          { label: language === 'bn' ? 'মেয়াদোত্তীর্ণ স্টক মূল্য' : 'Expired Stock Value', value: metrics.expiredValuation },
        ],
        columns: [
          { header: 'Batch #', key: 'batchNumber' },
          { header: 'Product Name', key: 'productName' },
          { header: 'SKU', key: 'sku' },
          { header: 'Expiry Date', key: 'expDate' },
          { header: 'Shelf-Life Status', key: 'statusText' },
          { header: 'Stock Qty', key: 'stock', align: 'right' },
          { header: 'Purchase Price', key: 'purchasePrice', align: 'right', format: 'currency' },
          { header: 'Cost Value', key: 'costValue', align: 'right', format: 'currency' },
        ],
        rows: filteredItems.map((item) => ({
          batchNumber: item.batchNumber,
          productName: item.productName,
          sku: item.sku,
          expDate: item.expDate || 'N/A',
          statusText:
            item.shelfLifeStatus === 'EXPIRED'
              ? '🔴 EXPIRED'
              : item.shelfLifeStatus === 'CRITICAL'
              ? '🟠 CRITICAL (<=15d)'
              : item.shelfLifeStatus === 'WARNING'
              ? '🟡 EXPIRING SOON'
              : item.shelfLifeStatus === 'GOOD'
              ? '🟢 FRESH / GOOD'
              : 'NO EXPIRY',
          stock: item.stock,
          purchasePrice: item.purchasePrice,
          costValue: item.stock * item.purchasePrice,
        })),
        totals: {
          productName: 'TOTAL',
          stock: metrics.totalUnits,
          costValue: metrics.totalCostValuation,
        },
      },
    });
  };

  // Master Action Handlers
  const handleRefreshBatch = () => {
    showToast(
      language === 'bn' ? 'ব্যাচ ইনভেন্টরি ডেটা সফলভাবে সিঙ্ক ও রিফ্রেশ করা হয়েছে!' : 'Batch inventory data successfully synchronized and refreshed!',
      'success'
    );
  };

  const handleFefoGuide = () => {
    showToast(
      language === 'bn'
        ? 'FEFO (First Expired First Out): যে ব্যাচের মেয়াদ সবার আগে শেষ হবে, বিক্রির সময় সেই ব্যাচকে প্রাধিকার দেওয়া হয়।'
        : 'FEFO Strategy: First Expired First Out ensures batches with the earliest expiry date are dispatched first.',
      'info'
    );
  };

  const handlePrintBatchBarcodes = () => {
    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'ব্যাচ বারকোড ও লেবেল তালিকা' : 'BATCH BARCODE & LABEL SHEET',
      data: {
        reportTitle: language === 'bn' ? 'ব্যাচ বারকোড ও লেবেল তালিকা' : 'BATCH BARCODE & LABEL SHEET',
        period: `${new Date().toLocaleDateString('en-GB')}`,
        columns: [
          { header: 'Batch #', key: 'batchNumber' },
          { header: 'Product Name', key: 'productName' },
          { header: 'SKU / Barcode', key: 'sku' },
          { header: 'Expiry Date', key: 'expDate' },
          { header: 'Sales Rate', key: 'salesPrice', align: 'right', format: 'currency' },
        ],
        rows: filteredItems.slice(0, 50).map((item) => ({
          batchNumber: item.batchNumber,
          productName: item.productName,
          sku: `${item.sku} ${item.barcode ? `(${item.barcode})` : ''}`,
          expDate: item.expDate || 'N/A',
          salesPrice: item.salesPrice,
        })),
      },
    });
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!canUserExportProductCsv(currentUser)) {
      showToast(
        language === 'bn'
          ? 'আপনার প্রোডাক্ট ডিরেক্টরি বা ব্যাচ থেকে CSV এক্সপোর্ট করার পারমিশন নেই।'
          : 'You do not have permission to Export CSV from Product Inventory.',
        'error'
      );
      return;
    }

    const headers = [
      'Batch Number',
      'Product Name',
      'SKU',
      'Barcode',
      'Category',
      'Generic',
      'Manufacturer',
      'Expiry Date',
      'Days Remaining',
      'Shelf Life Status',
      'Stock Qty',
      'Unit',
      'Purchase Price',
      'Sales Price',
      'Total Cost Value',
      'Total Sales Value',
      'Supplier Name',
      'Purchase Invoice No',
    ];

    const rows = filteredItems.map((item) => [
      item.batchNumber,
      item.productName,
      item.sku,
      item.barcode || '',
      item.categoryName || '',
      item.generic || '',
      item.manufacturer || '',
      item.expDate || '',
      item.daysRemaining !== null ? item.daysRemaining : '',
      item.shelfLifeStatus,
      item.stock,
      item.unit,
      item.purchasePrice,
      item.salesPrice,
      item.stock * item.purchasePrice,
      item.stock * item.salesPrice,
      item.supplierName || '',
      item.purchaseInvoiceNo || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Batch_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process Quick Write-Off Confirmation
  const confirmWriteOff = () => {
    if (!writeOffModalItem) return;
    if (writeOffQty <= 0) {
      showToast(language === 'bn' ? 'সঠিক স্টক পরিমাণ দিন' : 'Enter valid write-off quantity', 'error');
      return;
    }
    if (writeOffQty > writeOffModalItem.stock) {
      showToast(
        language === 'bn'
          ? `বর্তমান স্টক (${writeOffModalItem.stock}) এর চেয়ে বেশি অবলোপন করা যাবে না`
          : `Write-off quantity cannot exceed current batch stock (${writeOffModalItem.stock})`,
        'error'
      );
      return;
    }

    // Update product batches to reflect the write-off
    const product = products.find(p => p.id === writeOffModalItem.productId);
    if (product) {
      let updatedBatches: ProductBatch[] = [];
      if (product.batches && product.batches.length > 0) {
        updatedBatches = product.batches.map(b => {
          if (b.id === writeOffModalItem.batchId) {
            return { ...b, stock: Math.max(0, b.stock - writeOffQty) };
          }
          return b;
        });
      } else {
        // Handle default batch case
        updatedBatches = [{
          id: `batch-init-${product.id}`,
          batchNumber: product.batchNumber || 'B-01',
          expDate: product.expDate || '',
          purchaseDate: product.createdAt || new Date().toISOString().split('T')[0],
          purchaseInvoiceNo: 'INITIAL-STOCK',
          purchasePrice: product.purchasePrice || 0,
          salesPrice: product.salesPrice || 0,
          stock: Math.max(0, product.stock - writeOffQty),
          initialStock: product.stock,
          supplierName: 'Initial Inventory',
          createdAt: product.createdAt,
        }];
      }
      updateProductBatches(product.id, updatedBatches);
    }

    addExpiredReturnLog({
      productId: writeOffModalItem.productId,
      productName: writeOffModalItem.productName,
      sku: writeOffModalItem.sku,
      batchNumber: writeOffModalItem.batchNumber,
      actionType: 'WRITE_OFF',
      quantity: writeOffQty,
      unit: (writeOffModalItem.unit as any) || 'Pcs',
      purchasePrice: writeOffModalItem.purchasePrice,
      totalValue: writeOffQty * writeOffModalItem.purchasePrice,
      createdBy: currentUser?.fullName || currentUser?.username || 'Admin',
      notes: `${writeOffReason === 'EXPIRY_DAMAGE' ? 'Expired / Damaged Inventory Write-off' : 'Manual Adjustment'} - Batch #${writeOffModalItem.batchNumber}`,
    });

    showToast(
      language === 'bn'
        ? `ব্যাচ #${writeOffModalItem.batchNumber} থেকে ${writeOffQty} টি অবলোপন সম্পন্ন হয়েছে!`
        : `Successfully written off ${writeOffQty} units from Batch #${writeOffModalItem.batchNumber}!`,
      'success'
    );
    setWriteOffModalItem(null);
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* 1. Header Banner & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/20">
              <Boxes className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {language === 'bn' ? 'ব্যাচ ইনভেন্টরি ও মেয়াদের তথ্য' : 'Batch Inventory & Shelf-Life View'}
            </h1>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {language === 'bn'
              ? 'ব্যাচ নম্বর (Batch No) অনুযায়ী পণ্য স্টক, মেয়াদ উত্তীর্ণের সময়সীমা এবং FEFO (First Expired First Out) অনুযায়ী বিক্রয়ের অগ্রাধিকার সহজেই পর্যবেক্ষণ করুন।'
              : 'Manage stock levels, expiry timelines, and FEFO sales priority grouped by Batch Number to prevent inventory loss.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefreshBatch}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Sync & Refresh Batches"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'সিঙ্ক' : 'Sync'}</span>
          </button>
          <button
            type="button"
            onClick={handleFefoGuide}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-colors cursor-pointer"
            title="FEFO Strategy Info"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{language === 'bn' ? 'FEFO নীতি' : 'FEFO Guide'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrintBatchBarcodes}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-indigo-800/80 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl border border-indigo-700 transition-colors cursor-pointer"
            title="Print Barcodes"
          >
            <Barcode className="w-4 h-4" />
            <span>{language === 'bn' ? 'বারকোড' : 'Barcodes'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!canUserExportProductCsv(currentUser)}
            title={
              !canUserExportProductCsv(currentUser)
                ? (language === 'bn' ? 'CSV এক্সপোর্ট করার পারমিশন নেই' : 'No permission to Export CSV')
                : (language === 'bn' ? 'CSV এক্সপোর্ট' : 'Export CSV')
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-xl border shadow-xs transition-colors ${
              canUserExportProductCsv(currentUser)
                ? 'bg-indigo-600/80 hover:bg-indigo-600 text-white border-indigo-400/30 cursor-pointer'
                : 'bg-slate-800/50 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-60'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{language === 'bn' ? 'CSV এক্সপোর্ট' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrintBatchReport}
            disabled={!canUserPrintReportStatement(currentUser)}
            title={
              !canUserPrintReportStatement(currentUser)
                ? (language === 'bn' ? 'রিপোর্ট প্রিন্ট করার পারমিশন নেই' : 'No permission to Print Report')
                : (language === 'bn' ? 'রিপোর্ট' : 'Report')
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-xl border transition-colors ${
              canUserPrintReportStatement(currentUser)
                ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
                : 'bg-slate-800/50 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-60'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'bn' ? 'রিপোর্ট' : 'Report'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Active Batches */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
              {language === 'bn' ? 'সক্রিয় ব্যাচ' : 'Active Batches'}
            </span>
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-2">
            {metrics.totalActiveBatches}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">
            {metrics.totalUnits.toLocaleString()} {language === 'bn' ? 'টি পণ্য স্টক' : 'total items'}
          </div>
        </div>

        {/* Total Cost Valuation */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
              {language === 'bn' ? 'ব্যাচ ইনভেন্টরি মূল্য' : 'Stock Valuation'}
            </span>
            <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
            {formatCurrency(metrics.totalCostValuation)}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1 font-mono">
            {language === 'bn' ? 'বিক্রয় মূল্য:' : 'Retail:'} {formatCurrency(metrics.totalRetailValuation)}
          </div>
        </div>

        {/* Expired Stock Risk */}
        <div className={`p-4 rounded-xl border shadow-2xs transition-all ${
          metrics.expiredCount > 0
            ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-700 dark:text-rose-300 font-bold uppercase tracking-wider">
              {language === 'bn' ? '🔴 মেয়াদোত্তীর্ণ পণ্য' : '🔴 Expired Stock'}
            </span>
            <span className="p-1.5 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-2">
            {metrics.expiredCount} <span className="text-xs font-semibold">{language === 'bn' ? 'টি ব্যাচ' : 'batches'}</span>
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-mono font-bold">
            {language === 'bn' ? 'আটকা পড়া পুঁজি:' : 'Locked Capital:'} {formatCurrency(metrics.expiredValuation)}
          </div>
        </div>

        {/* 30-Day Expiration Alert KPI Card */}
        <div
          onClick={() => setStatusFilter('EXPIRING_30_DAYS')}
          className={`p-4 rounded-xl border shadow-2xs transition-all cursor-pointer ${
            metrics.expiring30DaysCount > 0
              ? 'bg-amber-500/10 dark:bg-amber-950/50 border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/40 hover:bg-amber-500/20'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
              {language === 'bn' ? '⚠️ ৩০ দিনে মেয়াদ শেষ' : '⚠️ 30d Expiry Alert'}
            </span>
            <span className="p-1.5 bg-amber-500 text-white rounded-lg shadow-2xs">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-2">
            {metrics.expiring30DaysCount} <span className="text-xs font-semibold">{language === 'bn' ? 'টি ব্যাচ' : 'batches'}</span>
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-mono font-bold">
            {formatCurrency(metrics.expiring30DaysValuation)} {language === 'bn' ? 'মূল্য' : 'value'}
          </div>
        </div>

        {/* Critical & Near Expiry (<= 15 Days) */}
        <div className={`p-4 rounded-xl border shadow-2xs transition-all ${
          metrics.criticalCount > 0
            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider">
              {language === 'bn' ? '🟠 ১৫ দিনে মেয়াদ শেষ' : '🟠 Critical (<=15d)'}
            </span>
            <span className="p-1.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-2">
            {metrics.criticalCount} <span className="text-xs font-semibold">{language === 'bn' ? 'টি ব্যাচ' : 'batches'}</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-mono font-bold">
            {formatCurrency(metrics.criticalValuation)} {language === 'bn' ? 'মূল্য' : 'value'}
          </div>
        </div>

        {/* Healthy / Fresh Batches */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
              {language === 'bn' ? '🟢 সুরক্ষিত মেয়াদ' : '🟢 Fresh Batches'}
            </span>
            <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
            {metrics.healthyCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">
            {language === 'bn' ? '>৪৫ দিন মেয়াদ অবশিষ্ট' : '>45 days shelf life'}
          </div>
        </div>
      </div>

      {/* 2.5 Prominent Visual Notification Alert Banner for Batches Expiring Within 30 Days */}
      {metrics.expiring30DaysCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/40 dark:border-amber-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shrink-0 animate-bounce">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs animate-pulse">
                  ⚠️ 30-DAY EXPIRY ALERT
                </span>
                <h3 className="text-base font-black text-amber-950 dark:text-amber-100">
                  {language === 'bn'
                    ? `জরুরী অ্যালার্ট: ${metrics.expiring30DaysCount} টি ব্যাচের মেয়াদ আগামী ৩০ দিনের মধ্যে শেষ হতে চলেছে!`
                    : `Action Required: ${metrics.expiring30DaysCount} Batches Expiring Within 30 Days!`}
                </h3>
              </div>
              <p className="text-xs text-amber-900/90 dark:text-amber-200 font-medium leading-relaxed">
                {language === 'bn'
                  ? `এই ব্যাচগুলোতে মোট ${metrics.expiring30DaysUnits.toLocaleString()} টি পণ্য মজুদ রয়েছে যার আনুমানিক ক্রয় মূল্য ${formatCurrency(metrics.expiring30DaysValuation)}। লোকসান এড়াতে অবিলম্বে FEFO সেলস অর্ডার তৈরি করুন বা ক্লিয়ারেন্স ডিসকাউন্ট প্রদান করুন।`
                  : `Total ${metrics.expiring30DaysUnits.toLocaleString()} units with inventory cost value of ${formatCurrency(metrics.expiring30DaysValuation)}. Prioritize FEFO dispatch or promotional clearance immediately.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('EXPIRING_30_DAYS')}
            className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
              statusFilter === 'EXPIRING_30_DAYS'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>
              {statusFilter === 'EXPIRING_30_DAYS'
                ? (language === 'bn' ? 'অ্যালার্ট ফিল্টার সক্রিয়' : 'Filter Active (30 Days)')
                : (language === 'bn' ? '৩০ দিনের মেয়াদ ব্যাচ দেখুন' : 'View 30-Day Expiring Batches')}
            </span>
          </button>
        </div>
      )}

      {/* 3. Multi-Dimension Filters Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {language === 'bn' ? 'সকল ব্যাচ' : 'All Batches'} ({allBatchItems.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('EXPIRING_30_DAYS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                statusFilter === 'EXPIRING_30_DAYS'
                  ? 'bg-amber-500 text-white shadow-xs border-amber-600 ring-2 ring-amber-300/60'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100 border-amber-300 dark:border-amber-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>⚠️ {language === 'bn' ? '৩০ দিনের মেয়াদের অ্যালার্ট' : '30-Day Expiry Alert'}</span>
              <span className="font-mono bg-amber-200/80 dark:bg-amber-900 px-1.5 py-0.2 rounded text-[10px] font-black">
                ({metrics.expiring30DaysCount})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('EXPIRED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'EXPIRED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <span>🔴 {language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Expired'}</span>
              <span className="font-mono">({metrics.expiredCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('CRITICAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'CRITICAL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <span>🟠 {language === 'bn' ? '১৫ দিনে শেষ' : 'Critical (<=15d)'}</span>
              <span className="font-mono">({metrics.criticalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('WARNING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'WARNING'
                  ? 'bg-yellow-500 text-white shadow-xs'
                  : 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100'
              }`}
            >
              <span>🟡 {language === 'bn' ? '১৬-৪৫ দিন' : 'Expiring (16-45d)'}</span>
              <span className="font-mono font-bold">({metrics.warningCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('GOOD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'GOOD'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <span>🟢 {language === 'bn' ? 'সুরক্ষিত' : 'Healthy (>45d)'}</span>
              <span className="font-mono">({metrics.healthyCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher: Grouped vs Flat */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setGroupByBatch(true)}
                className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  groupByBatch
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ব্যাচ নং দলভুক্ত' : 'Grouped by Batch'}</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupByBatch(false)}
                className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  !groupByBatch
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'একক তালিকা' : 'Flat Product Rows'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Inputs & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'সার্চ করুন' : 'Search Query'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'ব্যাচ নং, নাম, SKU, বারকোড, জেনেরিক, ক্যাটাগরি, র‍্যাক...'
                    : 'Search Batch, Product, SKU, Barcode, Category, Rack...'
                }
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {searchQuery && (
                <div className="flex items-center gap-1.5 absolute right-2.5 top-1/2 -translate-y-1/2">
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 font-mono font-bold px-1.5 py-0.5 rounded">
                    {filteredItems.length} {language === 'bn' ? 'টি' : 'found'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-0.5"
                    title={language === 'bn' ? 'সার্চ মুছুন' : 'Clear search'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="ALL">{language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'স্টক উপস্থিতি' : 'Stock Status'}
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="ALL">{language === 'bn' ? 'সকল ব্যাচ (সব স্টক)' : 'All Batches (Inc. 0 Stock)'}</option>
              <option value="IN_STOCK">{language === 'bn' ? 'স্টক উপলব্ধ (Stock > 0)' : 'In Stock (> 0)'}</option>
              <option value="OUT_OF_STOCK">{language === 'bn' ? 'স্টক শেষ (Stock = 0)' : 'Out of Stock (= 0)'}</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'সাজানোর অর্ডার' : 'Sort Order'}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="FEFO">⚡ {language === 'bn' ? 'FEFO (আগে মেয়াদ শেষ আগে)' : 'FEFO (Earliest Expiry First)'}</option>
              <option value="EXP_DESC">⏳ {language === 'bn' ? 'সর্বশেষ মেয়াদ (Latest First)' : 'Expiry Date (Latest)'}</option>
              <option value="STOCK_DESC">📦 {language === 'bn' ? 'সর্বোচ্চ স্টক (Highest Stock)' : 'Highest Stock Qty'}</option>
              <option value="VALUE_DESC">💰 {language === 'bn' ? 'সর্বোচ্চ ইনভেন্টরি মূল্য' : 'Highest Valuation'}</option>
              <option value="BATCH_ASC">🏷️ {language === 'bn' ? 'ব্যাচ নম্বর (A - Z)' : 'Batch No (A-Z)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Batch Inventory Display Section */}
      {groupByBatch ? (
        /* ================= GROUPED BY BATCH NO ================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {language === 'bn' ? 'ব্যাচ ভিত্তিক ফলাফল:' : 'Batch Groups:'} {groupedByBatchNumber.length} {language === 'bn' ? 'টি ব্যাচ গ্রুপ' : 'unique batch groups'}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={expandAllBatches}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                {language === 'bn' ? 'সব প্রসারিত করুন' : 'Expand All'}
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <button
                type="button"
                onClick={collapseAllBatches}
                className="text-zinc-500 hover:underline cursor-pointer font-medium"
              >
                {language === 'bn' ? 'সব সংকুচিত করুন' : 'Collapse All'}
              </button>
            </div>
          </div>

          {groupedByBatchNumber.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-3">
              <Boxes className="w-12 h-12 text-zinc-400 mx-auto" />
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                {language === 'bn' ? 'কোন ব্যাচ রেকর্ড পাওয়া যায়নি' : 'No batch inventory records found'}
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                {searchQuery.trim()
                  ? (language === 'bn'
                      ? `"${searchQuery.trim()}" দিয়ে কোন ব্যাচ বা পণ্য পাওয়া যায়নি। ফিল্টার রিসেট করে আবার চেষ্টা করুন।`
                      : `No batches or products matched "${searchQuery.trim()}". Try resetting filters.`)
                  : (language === 'bn'
                      ? 'আপনার সিলেক্ট করা ফিল্টার দিয়ে কোন ব্যাচের তথ্য পাওয়া যায়নি।'
                      : 'Try adjusting your search criteria or reset filters to see available batch stock.')}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                {language === 'bn' ? 'ফিল্টার ও সার্চ রিসেট করুন' : 'Reset All Filters & Search'}
              </button>
            </div>
          ) : (
            groupedByBatchNumber.map((group) => {
              const isExpanded = searchQuery.trim() ? true : (expandedBatches[group.batchNumber] ?? true);

              return (
                <div
                  key={group.batchNumber}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs transition-all"
                >
                  {/* Batch Group Header Bar */}
                  <div
                    onClick={() => toggleBatchExpand(group.batchNumber)}
                    className="flex flex-wrap items-center justify-between p-4 bg-zinc-50/80 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer select-none transition-colors border-b border-zinc-100 dark:border-zinc-800 gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      >
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            Batch #{group.batchNumber}
                          </span>
                          <span className="text-xs text-zinc-500 font-medium">
                            ({group.items.length} {language === 'bn' ? 'টি আইটেম' : 'products'})
                          </span>
                          {group.daysRemaining !== null && group.daysRemaining >= 0 && group.daysRemaining <= 30 && group.totalStock > 0 && (
                            <span className="inline-flex items-center gap-1 bg-amber-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              <span>⚠️ 30-DAY EXPIRY ALERT</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Batch Summary Badges & Valuation */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {/* Worst Shelf Life Status Tag */}
                      {group.nearestExpDate ? (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-zinc-400 text-[11px] font-sans">{language === 'bn' ? 'নিকটতম মেয়াদ:' : 'Nearest Expiry:'}</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{group.nearestExpDate}</span>

                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            group.worstStatus === 'EXPIRED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300'
                              : group.worstStatus === 'CRITICAL'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300'
                              : group.worstStatus === 'WARNING'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300 border border-yellow-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300'
                          }`}>
                            {group.worstStatus === 'EXPIRED'
                              ? `🔴 Expired (${Math.abs(group.daysRemaining || 0)}d ago)`
                              : group.worstStatus === 'CRITICAL'
                              ? `🟠 Expiring in ${group.daysRemaining}d`
                              : group.worstStatus === 'WARNING'
                              ? `🟡 ${group.daysRemaining}d left`
                              : `🟢 Fresh (${group.daysRemaining}d)`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">{language === 'bn' ? 'মেয়াদ অসংজ্ঞায়িত' : 'No Expiry Set'}</span>
                      )}

                      {/* Total Batch Stock */}
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block font-bold uppercase">{language === 'bn' ? 'মোট স্টক' : 'Batch Stock'}</span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">
                          {group.totalStock.toLocaleString()} units
                        </span>
                      </div>

                      {/* Total Cost Valuation */}
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block font-bold uppercase">{language === 'bn' ? 'ক্রয় মূল্য' : 'Cost Value'}</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(group.totalCostValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Batch Items Nested Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-100/60 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-bold text-[10px] uppercase tracking-wider">
                            <th className="py-2.5 px-4">{language === 'bn' ? 'প্রোডাক্ট বিবরণ' : 'Product Info'}</th>
                            <th className="py-2.5 px-4">{language === 'bn' ? 'মেয়াদ ও সময়সীমা' : 'Expiry & Timeline'}</th>
                            <th className="py-2.5 px-4 text-center">{language === 'bn' ? 'স্টক পরিমাণ' : 'Stock Qty'}</th>
                            <th className="py-2.5 px-4 text-right">{language === 'bn' ? 'ক্রয় মূল্য' : 'Purchase Rate'}</th>
                            <th className="py-2.5 px-4 text-right">{language === 'bn' ? 'বিক্রয় মূল্য' : 'Sales Rate'}</th>
                            <th className="py-2.5 px-4 text-right">{language === 'bn' ? 'মোট মূল্য' : 'Total Valuation'}</th>
                            <th className="py-2.5 px-4 text-center">{language === 'bn' ? 'সরবরাহকারী / চালান' : 'Supplier / Bill'}</th>
                            <th className="py-2.5 px-4 text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                          {group.items.map((item) => (
                            <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                              {/* Product Info */}
                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-zinc-900 dark:text-white">
                                      {item.productName}
                                    </span>
                                    {item.productNameBn && (
                                      <span className="text-zinc-500 text-[11px]">({item.productNameBn})</span>
                                    )}
                                    {item.isFefoPriority && (
                                      <span className="inline-flex items-center gap-1 bg-amber-500 text-white font-black text-[9px] px-2 py-0.5 rounded shadow-2xs tracking-wider animate-pulse">
                                        <Zap className="w-3 h-3 fill-current" /> FEFO SELL FIRST
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-zinc-400 font-mono">
                                    SKU: {item.sku} {item.barcode && `• Barcode: ${item.barcode}`}
                                    {item.categoryName && ` • Cat: ${item.categoryName}`}
                                    {item.generic && ` • Generic: ${item.generic}`}
                                  </div>
                                </div>
                              </td>

                              {/* Expiry & Timeline */}
                              <td className="py-3 px-4">
                                {item.expDate ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 font-mono">
                                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.expDate}</span>
                                    </div>

                                    <div>
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                        item.shelfLifeStatus === 'EXPIRED'
                                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                          : item.shelfLifeStatus === 'CRITICAL'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                          : item.shelfLifeStatus === 'WARNING'
                                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300'
                                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                      }`}>
                                        {item.shelfLifeStatus === 'EXPIRED'
                                          ? `🔴 Expired (${Math.abs(item.daysRemaining || 0)} days ago)`
                                          : item.shelfLifeStatus === 'CRITICAL'
                                          ? `🟠 Critical (${item.daysRemaining} days left)`
                                          : item.shelfLifeStatus === 'WARNING'
                                          ? `🟡 Expiring soon (${item.daysRemaining} days)`
                                          : `🟢 Fresh (${item.daysRemaining} days left)`}
                                      </span>
                                    </div>
                                    {item.daysRemaining !== null && item.daysRemaining >= 0 && item.daysRemaining <= 30 && item.stock > 0 && (
                                      <div className="pt-0.5">
                                        <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-[9px] font-black px-2 py-0.5 rounded-md font-mono shadow-2xs">
                                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
                                          <span>⚠️ 30-Day Expiry Alert ({item.daysRemaining}d left)</span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-zinc-400 text-[11px] font-mono">No expiry date</span>
                                )}
                              </td>

                              {/* Stock Qty */}
                              <td className="py-3 px-4 text-center">
                                <span className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg ${
                                  item.stock <= 0
                                    ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                                    : item.stock <= 5
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-black'
                                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                }`}>
                                  {item.stock} {item.unit}
                                </span>
                              </td>

                              {/* Rates */}
                              <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                                ৳{item.purchasePrice.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                                ৳{item.salesPrice.toLocaleString()}
                              </td>

                              {/* Total Valuation */}
                              <td className="py-3 px-4 text-right font-mono">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                  ৳{(item.stock * item.purchasePrice).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-zinc-400">
                                  Retail: ৳{(item.stock * item.salesPrice).toLocaleString()}
                                </div>
                              </td>

                              {/* Supplier / Invoice */}
                              <td className="py-3 px-4 text-center text-zinc-600 dark:text-zinc-300">
                                <div className="font-medium text-[11px]">
                                  {item.supplierName || 'Initial Stock'}
                                </div>
                                {item.purchaseInvoiceNo && (
                                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                                    #{item.purchaseInvoiceNo}
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProductForBatchModal(item.productRef)}
                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                                    title={language === 'bn' ? 'ব্যাচ ও স্টক সংশোধন করুন' : 'Manage Batch Stock'}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</span>
                                  </button>

                                  {item.stock > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setWriteOffModalItem(item);
                                        setWriteOffQty(item.stock);
                                      }}
                                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                                      title={language === 'bn' ? 'মেয়াদোত্তীর্ণ পণ্য অবলোপন (Write-off) করুন' : 'Write-off Expired Stock'}
                                    >
                                      <TrendingDown className="w-3.5 h-3.5" />
                                      <span>{language === 'bn' ? 'অবলোপন' : 'Write-off'}</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ================= FLAT LIST TABLE VIEW ================= */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-100/70 dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">{language === 'bn' ? 'ব্যাচ নং' : 'Batch #'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'প্রোডাক্ট বিবরণ' : 'Product Info'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'মেয়াদ ও সময়সীমা' : 'Expiry & Timeline'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'স্টক পরিমাণ' : 'Stock Qty'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'ক্রয় মূল্য' : 'Cost Rate'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'বিক্রয় মূল্য' : 'Sales Rate'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'মোট ইনভেন্টরি মূল্য' : 'Total Valuation'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'চালান / উৎস' : 'Source Invoice'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500">
                      <div className="space-y-2 max-w-sm mx-auto">
                        <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {language === 'bn' ? 'কোন ব্যাচ পণ্য পাওয়া যায়নি' : 'No batch inventory items matched filters.'}
                        </p>
                        {searchQuery && (
                          <p className="text-xs text-zinc-400">
                            {language === 'bn' ? `"${searchQuery}" এর জন্য কোন ফলাফল পাওয়া যায়নি` : `No matches for "${searchQuery}"`}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          {language === 'bn' ? 'ফিল্টার ও সার্চ রিসেট করুন' : 'Reset Search & Filters'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      {/* Batch # */}
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          {item.batchNumber}
                        </span>
                      </td>

                      {/* Product Details */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {item.productName}
                            </span>
                            {item.productNameBn && (
                              <span className="text-zinc-500 text-[11px]">({item.productNameBn})</span>
                            )}
                            {item.isFefoPriority && (
                              <span className="inline-flex items-center gap-1 bg-amber-500 text-white font-black text-[9px] px-2 py-0.5 rounded shadow-2xs tracking-wider">
                                FEFO SELL FIRST
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            SKU: {item.sku} {item.barcode && `• Barcode: ${item.barcode}`}
                            {item.categoryName && ` • Cat: ${item.categoryName}`}
                          </div>
                        </div>
                      </td>

                      {/* Expiry & Days Left */}
                      <td className="py-3 px-4">
                        {item.expDate ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.expDate}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              item.shelfLifeStatus === 'EXPIRED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                : item.shelfLifeStatus === 'CRITICAL'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                : item.shelfLifeStatus === 'WARNING'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            }`}>
                              {item.shelfLifeStatus === 'EXPIRED'
                                ? `🔴 Expired (${Math.abs(item.daysRemaining || 0)}d ago)`
                                : item.shelfLifeStatus === 'CRITICAL'
                                ? `🟠 Expiring in ${item.daysRemaining}d`
                                : item.shelfLifeStatus === 'WARNING'
                                ? `🟡 ${item.daysRemaining}d left`
                                : `🟢 Fresh (${item.daysRemaining}d left)`}
                            </span>
                            {item.daysRemaining !== null && item.daysRemaining >= 0 && item.daysRemaining <= 30 && item.stock > 0 && (
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-[9px] font-black px-2 py-0.5 rounded-md font-mono shadow-2xs">
                                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
                                  <span>⚠️ 30-Day Expiry Alert ({item.daysRemaining}d left)</span>
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-mono text-[11px]">No Expiry Date</span>
                        )}
                      </td>

                      {/* Stock Qty */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300">
                          {item.stock} {item.unit}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                        ৳{item.purchasePrice.toLocaleString()}
                      </td>

                      {/* Retail */}
                      <td className="py-3 px-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                        ৳{item.salesPrice.toLocaleString()}
                      </td>

                      {/* Total Valuation */}
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{(item.stock * item.purchasePrice).toLocaleString()}
                        </div>
                      </td>

                      {/* Supplier Invoice */}
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                        {item.supplierName || item.purchaseInvoiceNo || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedProductForBatchModal(item.productRef)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                            <span>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</span>
                          </button>

                          {item.stock > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setWriteOffModalItem(item);
                                setWriteOffQty(item.stock);
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              <TrendingDown className="w-3.5 h-3.5 inline mr-1" />
                              <span>{language === 'bn' ? 'অবলোপন' : 'Write-off'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Batch Stock Management */}
      {selectedProductForBatchModal && (
        <BatchManagementModal
          product={selectedProductForBatchModal}
          onClose={() => setSelectedProductForBatchModal(null)}
        />
      )}

      {/* MODAL: Quick Write-Off Expired Stock */}
      {writeOffModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                  {language === 'bn' ? 'মেয়াদোত্তীর্ণ স্টক অবলোপন (Write-off)' : 'Write-off Expired Batch Inventory'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWriteOffModalItem(null)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-zinc-900 dark:text-white">{writeOffModalItem.productName}</div>
              <div className="text-zinc-600 dark:text-zinc-400 font-mono">
                Batch #{writeOffModalItem.batchNumber} • Current Stock: <strong>{writeOffModalItem.stock} {writeOffModalItem.unit}</strong>
              </div>
              {writeOffModalItem.expDate && (
                <div className="text-rose-700 dark:text-rose-300 font-mono font-bold">
                  Expiry Date: {writeOffModalItem.expDate}
                </div>
              )}
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  {language === 'bn' ? 'অবলোপনকৃত পণ্যের পরিমাণ (Quantity):' : 'Write-off Quantity:'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={writeOffModalItem.stock}
                  value={writeOffQty}
                  onChange={(e) => setWriteOffQty(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono font-bold text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  {language === 'bn' ? 'অবলোপনের কারণ:' : 'Reason for Write-off:'}
                </label>
                <select
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium outline-none cursor-pointer"
                >
                  <option value="EXPIRY_DAMAGE">{language === 'bn' ? 'মেয়াদ শেষ / নষ্ট (Expired & Damaged)' : 'Expired & Damaged'}</option>
                  <option value="MANUAL_ADJUSTMENT">{language === 'bn' ? 'ম্যানুয়াল স্টক এডজাস্টমেন্ট' : 'Manual Stock Inventory Adjustment'}</option>
                </select>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-mono">
                <div className="flex justify-between">
                  <span>Estimated Capital Loss:</span>
                  <strong className="text-rose-600 font-bold">
                    ৳{(writeOffQty * writeOffModalItem.purchasePrice).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setWriteOffModalItem(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmWriteOff}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                {language === 'bn' ? 'অবলোপন সম্পন্ন করুন' : 'Confirm Write-off'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
