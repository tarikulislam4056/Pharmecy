import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Product } from '../../types';
import { ReplaceProductModal } from './ReplaceProductModal';
import { ProductImportModal } from './ProductImportModal';
import { BatchManagementModal } from './BatchManagementModal';
import { BatchInventoryView } from './BatchInventoryView';
import { DatePeriodFilter } from '../common/DatePeriodFilter';
import { CameraBarcodeScannerModal } from '../common/CameraBarcodeScannerModal';
import { MultiUserAuditTrail } from '../common/MultiUserAuditTrail';
import { canUserDelete, canUserEdit, canUserExportProductCsv } from '../../utils/permissions';
import { getProductExpirySummary } from '../../utils/dateUtils';
import {
  Package,
  Search,
  Plus,
  Barcode,
  Edit2,
  Trash2,
  Printer,
  Download,
  AlertTriangle,
  Tag,
  RefreshCw,
  Upload,
  Calendar,
  Filter,
  RotateCcw,
  Boxes,
  Layers,
  Building2,
  FileText,
  Clock,
  ArrowUpDown,
  Camera,
} from 'lucide-react';

interface ProductsListViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (product: Product) => void;
}

export const ProductsListView: React.FC<ProductsListViewProps> = ({
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const {
    language,
    products,
    categories,
    formatCurrency,
    deleteProduct,
    deleteAllProducts,
    expiredReturnLogs,
    deleteExpiredReturnLog,
    openPrintModal,
    showToast,
    companySettings,
    currentUser,
    users,
  } = useApp();
  const { t } = useTranslation(language);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'all' | 'batch-inventory' | 'expiry' | 'low-stock' | 'return-logs' | 'write-off-logs' | 'replace-logs'>('all');
  const [expirySubFilter, setExpirySubFilter] = useState<'expired' | 'expiring-soon' | 'fresh' | 'all-dated'>('expired');

  // Search and Multi-Dimension Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedGeneric, setSelectedGeneric] = useState<string>('ALL');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK'>('ALL');

  // Date Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [periodLabel, setPeriodLabel] = useState<string>('');
  const [dateFilterTarget, setDateFilterTarget] = useState<'createdAt' | 'expDate'>('createdAt');

  // Barcode Label Generation Modal State
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [barcodeCount, setBarcodeCount] = useState<number>(12);
  const [replaceProduct, setReplaceProduct] = useState<Product | null>(null);
  const [batchProduct, setBatchProduct] = useState<Product | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);

  // Date & Expiry Status Logic (Aware of both product expDate and sub-batches)
  const productExpirySummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getProductExpirySummary>>();
    products.forEach(p => {
      map.set(p.id, getProductExpirySummary(p, 30));
    });
    return map;
  }, [products]);

  // Expiry & Stock Counts
  const expiredCount = useMemo(() => {
    return products.filter(p => {
      const summary = productExpirySummaries.get(p.id);
      return Boolean(summary?.hasExpired);
    }).length;
  }, [products, productExpirySummaries]);

  const expiringSoonCount = useMemo(() => {
    return products.filter(p => {
      const summary = productExpirySummaries.get(p.id);
      return Boolean(summary?.hasExpiringSoon);
    }).length;
  }, [products, productExpirySummaries]);

  const totalDatedCount = useMemo(() => {
    return products.filter(p => {
      const summary = productExpirySummaries.get(p.id);
      return Boolean(summary?.hasAnyExpiry);
    }).length;
  }, [products, productExpirySummaries]);

  const freshDatedCount = useMemo(() => {
    return products.filter(p => {
      const summary = productExpirySummaries.get(p.id);
      return Boolean(summary?.hasFresh);
    }).length;
  }, [products, productExpirySummaries]);
  const lowStockCount = useMemo(() => products.filter(p => p.stock <= p.reorderLevel).length, [products]);
  const supplierReturnsCount = useMemo(() => (expiredReturnLogs || []).filter(l => l.actionType === 'RETURN_SUPPLIER').length, [expiredReturnLogs]);
  const writeOffsCount = useMemo(() => (expiredReturnLogs || []).filter(l => l.actionType === 'WRITE_OFF').length, [expiredReturnLogs]);
  const replacementsCount = useMemo(() => (expiredReturnLogs || []).filter(l => l.actionType === 'REPLACEMENT').length, [expiredReturnLogs]);

  const totalSupplierReturnValuation = useMemo(() => (expiredReturnLogs || []).filter(l => l.actionType === 'RETURN_SUPPLIER').reduce((s, l) => s + Number(l.totalValue || 0), 0), [expiredReturnLogs]);
  const totalSupplierReturnQty = useMemo(() => (expiredReturnLogs || []).filter(l => l.actionType === 'RETURN_SUPPLIER').reduce((s, l) => s + Number(l.quantity || 0), 0), [expiredReturnLogs]);

  const totalWriteOffValuation = useMemo(() => (expiredReturnLogs || []).filter(l => l.actionType === 'WRITE_OFF').reduce((s, l) => s + Number(l.totalValue || 0), 0), [expiredReturnLogs]);
  const totalWriteOffQty = useMemo(() => (expiredReturnLogs || []).filter(l => l.actionType === 'WRITE_OFF').reduce((s, l) => s + Number(l.quantity || 0), 0), [expiredReturnLogs]);

  const totalReplacementValuation = useMemo(() => (expiredReturnLogs || []).filter(l => l.actionType === 'REPLACEMENT').reduce((s, l) => s + Number(l.totalValue || 0), 0), [expiredReturnLogs]);
  const totalReplacementQty = useMemo(() => (expiredReturnLogs || []).filter(l => l.actionType === 'REPLACEMENT').reduce((s, l) => s + Number(l.quantity || 0), 0), [expiredReturnLogs]);

  // Unique Generics & Brands
  const uniqueGenerics = useMemo(() => {
    const set = new Set<string>();
    (companySettings.productGenerics || []).forEach(g => g && g.trim() && set.add(g.trim()));
    products.forEach(p => p.generic && p.generic.trim() && set.add(p.generic.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [companySettings.productGenerics, products]);

  const uniqueManufacturers = useMemo(() => {
    const set = new Set<string>();
    (companySettings.productManufacturers || []).forEach(m => m && m.trim() && set.add(m.trim()));
    products.forEach(p => p.manufacturer && p.manufacturer.trim() && set.add(p.manufacturer.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [companySettings.productManufacturers, products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const query = search.toLowerCase();
      const matchSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.nameBn && p.nameBn.toLowerCase().includes(query)) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query) ||
        (p.generic && p.generic.toLowerCase().includes(query)) ||
        (p.manufacturer && p.manufacturer.toLowerCase().includes(query)) ||
        (p.strength && p.strength.toLowerCase().includes(query)) ||
        (p.dosageForm && p.dosageForm.toLowerCase().includes(query)) ||
        (p.dosageSchedule && p.dosageSchedule.toLowerCase().includes(query)) ||
        (p.batchNumber && p.batchNumber.toLowerCase().includes(query)) ||
        (p.batches && p.batches.some(b => b.batchNumber && b.batchNumber.toLowerCase().includes(query)));

      const matchCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      const matchGen = selectedGeneric === 'ALL' || (Boolean(p.generic) && p.generic!.trim().toLowerCase() === selectedGeneric.trim().toLowerCase());
      const matchMan = selectedManufacturer === 'ALL' || (Boolean(p.manufacturer) && p.manufacturer!.trim().toLowerCase() === selectedManufacturer.trim().toLowerCase());

      // Stock status filter
      let matchStock = true;
      if (stockStatusFilter === 'IN_STOCK') matchStock = p.stock > 0;
      else if (stockStatusFilter === 'OUT_OF_STOCK') matchStock = p.stock <= 0;
      else if (stockStatusFilter === 'LOW_STOCK') matchStock = p.stock <= p.reorderLevel;

      // Tab matching
      let matchTab = true;
      if (activeTab === 'low-stock') {
        matchTab = p.stock <= p.reorderLevel;
      } else if (activeTab === 'expiry') {
        const summary = productExpirySummaries.get(p.id);
        if (expirySubFilter === 'expired') {
          matchTab = Boolean(summary?.hasExpired);
        } else if (expirySubFilter === 'expiring-soon') {
          matchTab = Boolean(summary?.hasExpiringSoon);
        } else if (expirySubFilter === 'fresh') {
          matchTab = Boolean(summary?.hasFresh);
        } else {
          matchTab = Boolean(summary?.hasAnyExpiry);
        }
      }

      // Date Period matching
      let matchDate = true;
      if (startDate && endDate) {
        if (dateFilterTarget === 'createdAt') {
          const productCreatedDate = (p.createdAt || '').substring(0, 10);
          if (productCreatedDate) {
            matchDate = productCreatedDate >= startDate && productCreatedDate <= endDate;
          } else {
            matchDate = true;
          }
        } else if (dateFilterTarget === 'expDate') {
          const allExpDates: string[] = [];
          if (p.expDate) allExpDates.push(p.expDate);
          if (p.batches && p.batches.length > 0) {
            p.batches.forEach(b => {
              if (b.expDate) allExpDates.push(b.expDate);
            });
          }
          if (allExpDates.length > 0) {
            matchDate = allExpDates.some(d => d >= startDate && d <= endDate);
          } else {
            matchDate = false;
          }
        }
      }

      return matchSearch && matchCat && matchGen && matchMan && matchStock && matchTab && matchDate;
    });
  }, [
    products,
    search,
    selectedCategory,
    selectedGeneric,
    selectedManufacturer,
    stockStatusFilter,
    activeTab,
    expirySubFilter,
    startDate,
    endDate,
    dateFilterTarget,
  ]);

  // Helper to resolve creator / user display name
  const getUserDisplayName = (creatorKey?: string) => {
    if (!creatorKey) return currentUser?.fullName || currentUser?.username || 'Admin';
    const matched = users?.find(
      u =>
        u.id === creatorKey ||
        u.username.toLowerCase() === creatorKey.toLowerCase() ||
        u.fullName.toLowerCase() === creatorKey.toLowerCase()
    );
    if (matched) {
      return matched.fullName || matched.username;
    }
    if (creatorKey === 'usr-1' || creatorKey === 'usr-admin') {
      const adminUser = users?.find(u => u.role === 'ADMIN');
      return adminUser?.fullName || currentUser?.fullName || 'Super Admin';
    }
    if (creatorKey === 'usr-2' || creatorKey === 'cashier-1') {
      const cashierUser = users?.find(u => u.role === 'CASHIER');
      return cashierUser?.fullName || 'Cashier';
    }
    return creatorKey;
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return (expiredReturnLogs || []).filter(log => {
      // Tab matching
      if (activeTab === 'return-logs' && log.actionType !== 'RETURN_SUPPLIER') return false;
      if (activeTab === 'write-off-logs' && log.actionType !== 'WRITE_OFF') return false;
      if (activeTab === 'replace-logs' && log.actionType !== 'REPLACEMENT') return false;

      const query = search.trim().toLowerCase();
      const creatorName = getUserDisplayName(log.createdBy).toLowerCase();
      const matchSearch =
        !query ||
        log.productName.toLowerCase().includes(query) ||
        log.sku.toLowerCase().includes(query) ||
        (log.batchNumber && log.batchNumber.toLowerCase().includes(query)) ||
        (log.notes && log.notes.toLowerCase().includes(query)) ||
        creatorName.includes(query) ||
        (log.createdBy && log.createdBy.toLowerCase().includes(query));

      let matchDate = true;
      if (startDate && endDate && log.date) {
        matchDate = log.date >= startDate && log.date <= endDate;
      }

      return matchSearch && matchDate;
    });
  }, [expiredReturnLogs, search, startDate, endDate, activeTab, users, currentUser]);

  // Filter Active Check
  const isAnyFilterActive =
    Boolean(search) ||
    selectedCategory !== 'ALL' ||
    selectedGeneric !== 'ALL' ||
    selectedManufacturer !== 'ALL' ||
    stockStatusFilter !== 'ALL' ||
    Boolean(startDate) ||
    Boolean(endDate);

  const resetAllFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedGeneric('ALL');
    setSelectedManufacturer('ALL');
    setStockStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPeriodLabel('');
    setDateFilterTarget('createdAt');
  };

  // Aggregated Financials
  const totalStockCount = filteredProducts.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const totalCostValuation = filteredProducts.reduce((sum, p) => sum + Number(p.stock || 0) * Number(p.purchasePrice || 0), 0);
  const totalRetailValuation = filteredProducts.reduce((sum, p) => sum + Number(p.stock || 0) * Number(p.salesPrice || 0), 0);
  const totalEstimatedMargin = totalRetailValuation - totalCostValuation;
  const marginPercentage = totalRetailValuation > 0 ? ((totalEstimatedMargin / totalRetailValuation) * 100).toFixed(1) : '0.0';

  const hasDeletePermission = canUserDelete(currentUser, 'product');
  const hasEditPermission = canUserEdit(currentUser, 'product');

  const handleDelete = (p: Product) => {
    if (!hasDeletePermission) {
      showToast(language === 'bn' ? 'আপনার পণ্য ডিলিট করার পারমিশন নেই' : 'You do not have permission to delete products', 'error');
      return;
    }
    if (confirm(language === 'bn' ? `আপনি কি নিশ্চিত যে "${p.name}" পণ্যটি মুছে ফেলতে চান?` : `Are you sure you want to delete product "${p.name}"?`)) {
      deleteProduct(p.id);
    }
  };

  // Print Stock List / Valuation Report
  const handlePrintProductList = () => {
    const selectedCatObj = categories.find(c => c.id === selectedCategory);
    let heading = language === 'bn' ? 'পণ্য স্টক ও ইনভেন্টরি মূল্যায়ন রিপোর্ট' : 'PRODUCT STOCK & VALUATION REPORT';
    let filterTag = language === 'bn' ? 'সকল সক্রিয় পণ্য' : 'All Active Inventory';

    if (activeTab === 'expiry') {
      heading = language === 'bn' ? 'মেয়াদোত্তীর্ণ ও মেয়াদযুক্ত পণ্য রিপোর্ট' : 'EXPIRY DATE TRACKING REPORT';
      filterTag = language === 'bn' ? 'মেয়াদভিত্তিক পণ্য' : 'Products with Expiry Date';
    } else if (activeTab === 'low-stock') {
      heading = language === 'bn' ? 'অল্প স্টক ও রি-অর্ডার এলার্ট রিপোর্ট' : 'LOW STOCK REORDER ALERT REPORT';
      filterTag = language === 'bn' ? 'অল্প স্টক আইটেম' : 'Low Stock Items (Below Threshold)';
    } else if (activeTab === 'return-logs') {
      heading = language === 'bn' ? 'মহাজনে ফেরত পণ্য হিসাব রিপোর্ট' : 'SUPPLIER RETURNS REPORT';
      filterTag = language === 'bn' ? 'মহাজনে ফেরত হিসাব' : 'Supplier Returns';
    } else if (activeTab === 'write-off-logs') {
      heading = language === 'bn' ? 'নষ্ট / অবলোপন (Write-off) হিসাব রিপোর্ট' : 'WRITE-OFFS REPORT';
      filterTag = language === 'bn' ? 'নষ্ট/অবলোপন হিসাব' : 'Write-offs';
    } else if (activeTab === 'replace-logs') {
      heading = language === 'bn' ? 'পণ্য রিপ্লেসমেন্ট (Replace) হিসাব রিপোর্ট' : 'REPLACED PRODUCTS REPORT';
      filterTag = language === 'bn' ? 'পণ্য রিপ্লেসমেন্ট হিসাব' : 'Replaced Products';
    }

    const filterTagsArr: string[] = [];
    if (periodLabel) filterTagsArr.push(`${language === 'bn' ? 'সময়কাল' : 'Period'}: ${periodLabel}`);
    else if (startDate && endDate) filterTagsArr.push(`${startDate} to ${endDate}`);
    if (search) filterTagsArr.push(`Search: "${search}"`);
    if (selectedCategory !== 'ALL' && selectedCatObj) filterTagsArr.push(`Category: ${selectedCatObj.name}`);
    if (selectedGeneric !== 'ALL') filterTagsArr.push(`Generic: ${selectedGeneric}`);
    if (selectedManufacturer !== 'ALL') filterTagsArr.push(`Brand: ${selectedManufacturer}`);

    openPrintModal({
      type: 'PRODUCT_LIST',
      title: heading,
      data: {
        reportHeading: heading,
        period: periodLabel || (startDate && endDate ? `${startDate} to ${endDate}` : (language === 'bn' ? 'সকল সময়' : 'All Time')),
        generatedDate: new Date().toLocaleDateString('en-GB'),
        categoryFilter: selectedCategory === 'ALL' ? undefined : (selectedCatObj?.name || selectedCategory),
        filterTag: filterTagsArr.length > 0 ? `${filterTag} (${filterTagsArr.join(', ')})` : filterTag,
        totalProducts: filteredProducts.length,
        totalUnits: totalStockCount,
        totalCostValue: totalCostValuation,
        totalRetailValue: totalRetailValuation,
        products: filteredProducts,
      },
    });
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    if (!canUserExportProductCsv(currentUser)) {
      showToast(
        language === 'bn'
          ? 'আপনার প্রোডাক্ট ডিরেক্টরি থেকে CSV এক্সপোর্ট করার অনুমতি নেই।'
          : 'You do not have permission to Export CSV from Product Directory.',
        'error'
      );
      return;
    }

    const headers = [
      'Product Name',
      'Bangla Name',
      'SKU',
      'Barcode',
      'Category',
      'Generic',
      'Brand / Manufacturer',
      'Strength',
      'Dosage Form',
      'Dosage Schedule',
      'Date Added',
      'Expiry Date',
      'Purchase Price (Tk)',
      'Sales Price (Tk)',
      'Stock Qty',
      'Unit',
      'Reorder Level',
      'Total Cost Valuation (Tk)',
      'Total Sales Valuation (Tk)',
    ];

    const rows = filteredProducts.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.nameBn || '').replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.barcode}"`,
      `"${p.categoryName || ''}"`,
      `"${p.generic || ''}"`,
      `"${p.manufacturer || ''}"`,
      `"${p.strength || ''}"`,
      `"${p.dosageForm || ''}"`,
      `"${p.dosageSchedule || ''}"`,
      p.createdAt || '',
      p.expDate || '',
      p.purchasePrice,
      p.salesPrice,
      p.stock,
      p.unit,
      p.reorderLevel,
      (p.stock * p.purchasePrice).toFixed(2),
      (p.stock * p.salesPrice).toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Product_Directory_${startDate || 'all'}_to_${endDate || 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(language === 'bn' ? 'CSV ফাইল ডাউনলোড সম্পন্ন হয়েছে।' : 'CSV exported successfully.');
  };

  const handlePrintBarcodes = () => {
    if (!barcodeProduct) return;
    openPrintModal({
      type: 'BARCODE_SHEET',
      title: `Barcode Labels - ${barcodeProduct.name}`,
      data: {
        product: barcodeProduct,
        quantity: barcodeCount,
      },
    });
    setBarcodeProduct(null);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>{language === 'bn' ? 'প্রোডাক্ট ডাইরেক্টরি ও স্টক' : t('products_list')}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'bn'
              ? 'দৈনিক, মাসিক, ডেট টু ডেট যোগকৃত পণ্য ও ইনভেন্টরি স্টক মূল্যায়ন'
              : 'Daily, Monthly, Date-to-Date stock directory, expiry tracking and valuation analysis'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'পণ্য আপলোড / ইমপোর্ট' : 'Import Products'}</span>
          </button>

          {(() => {
            const hasExportPerm = canUserExportProductCsv(currentUser);
            return (
              <button
                type="button"
                onClick={handleExportCsv}
                title={
                  !hasExportPerm
                    ? (language === 'bn' ? 'CSV এক্সপোর্ট করার পারমিশন নেই' : 'No permission to Export CSV')
                    : (language === 'bn' ? 'CSV ডাউনলোড' : 'Export CSV')
                }
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors border ${
                  hasExportPerm
                    ? 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 cursor-pointer'
                    : 'bg-zinc-100/60 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 cursor-not-allowed opacity-75'
                }`}
              >
                <Download className={`w-3.5 h-3.5 ${hasExportPerm ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-600'}`} />
                <span>{language === 'bn' ? 'CSV ডাউনলোড' : 'Export CSV'}</span>
              </button>
            );
          })()}

          <button
            type="button"
            onClick={handlePrintProductList}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === 'bn' ? 'স্টক রিপোর্ট প্রিন্ট' : 'Print Stock List'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCameraScannerOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            title={language === 'bn' ? 'ক্যামেরা দিয়ে বারকোড স্ক্যান করুন' : 'Scan Barcode with Camera'}
          >
            <Camera className="w-3.5 h-3.5 animate-pulse" />
            <span>{language === 'bn' ? '📷 ক্যামেরা স্ক্যান' : 'Camera Scan'}</span>
          </button>

          {products.length > 0 && currentUser?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => {
                if (currentUser?.role !== 'ADMIN') {
                  showToast(
                    language === 'bn' 
                      ? 'শুধুমাত্র অ্যাডমিন (ADMIN) সমস্ত পণ্য মুছে ফেলার অনুমতি রাখেন!' 
                      : 'Only ADMIN users are authorized to clear all products!', 
                    'error'
                  );
                  return;
                }
                const promptMsg = language === 'bn' 
                  ? `[অ্যাডমিন নিশ্চিতকরণ] আপনি কি নিশ্চিত যে ইনভেন্টরির সকল (${products.length}টি) পণ্য সম্পূর্ণ মুছে ফেলতে চান? এটি মুছে ফেললে ডাটাবেজ সম্পূর্ণ ফাঁকা (Fresh) হয়ে যাবে।`
                  : `[Admin Confirmation] Are you sure you want to clear all ${products.length} products from inventory? This will make the product list completely empty.`;
                if (window.confirm(promptMsg)) {
                  deleteAllProducts();
                }
              }}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title={language === 'bn' ? 'শুধুমাত্র অ্যাডমিন: সকল পণ্য মুছে ফাঁকা করুন' : 'Admin Only: Clear all products'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{language === 'bn' ? 'সব পণ্য মুছুন (Admin)' : 'Clear All (Admin)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'নতুন পণ্য যোগ করুন' : 'Add New Product'}</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Sub-View Switcher Tabs */}
      <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-850 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
            setDateFilterTarget('createdAt');
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{language === 'bn' ? 'সকল পণ্য ডাইরেক্টরি' : 'All Products'}</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 font-mono">
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('batch-inventory');
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'batch-inventory'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>{language === 'bn' ? '📦 ব্যাচ ইনভেন্টরি' : '📦 Batch Inventory'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('expiry');
            setDateFilterTarget('expDate');
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'expiry'
              ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>{language === 'bn' ? 'মেয়াদ ট্র্যাকিং ও প্রতিস্থাপন' : 'Expiry Tracking'}</span>
          {expiredCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-mono font-bold rounded-full animate-pulse">
              {expiredCount} Exp
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('low-stock');
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'low-stock'
              ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4 text-amber-500" />
          <span>{language === 'bn' ? 'অল্প স্টক / রি-অর্ডার' : 'Low Stock Alerts'}</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold">
            {lowStockCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('return-logs');
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'return-logs'
              ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{language === 'bn' ? 'মহাজনে ফেরত' : 'Supplier Returns'}</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 font-mono">
            {supplierReturnsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('write-off-logs');
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'write-off-logs'
              ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{language === 'bn' ? 'নষ্ট / রাইট অফ' : 'Write-offs'}</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-300 font-mono">
            {writeOffsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('replace-logs');
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'replace-logs'
              ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <RefreshCw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>{language === 'bn' ? 'পণ্য রিপ্লেসমেন্ট (Replace)' : 'Replaced Products'}</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 font-mono font-bold">
            {replacementsCount}
          </span>
        </button>
      </div>

      {/* If Batch Inventory tab is active, render BatchInventoryView */}
      {activeTab === 'batch-inventory' ? (
        <BatchInventoryView />
      ) : (
        <>
          {/* Expiry Sub-Filters Bar if Expiry Tab Active */}
      {activeTab === 'expiry' && (
        <div className="flex flex-wrap items-center gap-2 bg-purple-50/70 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200 dark:border-purple-900">
          <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1 mr-1">
            <Clock className="w-3.5 h-3.5" />
            {language === 'bn' ? 'মেয়াদ স্ট্যাটাস ফিল্টার:' : 'Expiry Status:'}
          </span>
          <button
            type="button"
            onClick={() => setExpirySubFilter('expired')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              expirySubFilter === 'expired'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
            }`}
          >
            <span>{language === 'bn' ? '🔴 মেয়াদোত্তীর্ণ' : '🔴 Expired'}</span>
            <span className="font-mono">({expiredCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setExpirySubFilter('expiring-soon')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              expirySubFilter === 'expiring-soon'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <span>{language === 'bn' ? '🟡 ৩০ দিনের মধ্যে শেষ' : '🟡 Within 30 Days'}</span>
            <span className="font-mono">({expiringSoonCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setExpirySubFilter('fresh')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              expirySubFilter === 'fresh'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <span>{language === 'bn' ? '🟢 সতেজ / বৈধ মেয়াদ' : '🟢 Fresh / Valid'}</span>
            <span className="font-mono">({freshDatedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setExpirySubFilter('all-dated')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              expirySubFilter === 'all-dated'
                ? 'bg-purple-600 text-white shadow-xs font-bold'
                : 'bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
            }`}
          >
            {language === 'bn' ? 'সকল মেয়াদযুক্ত পণ্য' : 'All Dated'} ({totalDatedCount})
          </button>
        </div>
      )}

      {/* 3. Summary Analytics KPI Cards */}
      {activeTab === 'return-logs' || activeTab === 'write-off-logs' || activeTab === 'replace-logs' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Supplier Return Card */}
          <div className={`p-3.5 rounded-xl border shadow-2xs transition-all ${
            activeTab === 'return-logs'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          }`}>
            <div className="text-xs text-blue-700 dark:text-blue-300 font-bold flex items-center justify-between">
              <span>{language === 'bn' ? 'মহাজনে ফেরত হিসাব (Supplier Returns):' : 'Supplier Returns Total:'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-mono font-bold">
                {supplierReturnsCount} {language === 'bn' ? 'টি রেকর্ড' : 'logs'}
              </span>
            </div>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono mt-1">
              {formatCurrency(totalSupplierReturnValuation)}
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-mono flex items-center justify-between">
              <span>{language === 'bn' ? 'ফেরতকৃত মোট পণ্য:' : 'Total Items:'}</span>
              <strong className="font-bold">{totalSupplierReturnQty} Units</strong>
            </div>
          </div>

          {/* Write-offs Card */}
          <div className={`p-3.5 rounded-xl border shadow-2xs transition-all ${
            activeTab === 'write-off-logs'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          }`}>
            <div className="text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center justify-between">
              <span>{language === 'bn' ? 'নষ্ট / রাইট অফ (Write-offs) হিসাব:' : 'Write-offs Total:'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-mono font-bold">
                {writeOffsCount} {language === 'bn' ? 'টি রেকর্ড' : 'logs'}
              </span>
            </div>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono mt-1">
              {formatCurrency(totalWriteOffValuation)}
            </div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-mono flex items-center justify-between">
              <span>{language === 'bn' ? 'অবলোপনকৃত মোট পণ্য:' : 'Total Written Off:'}</span>
              <strong className="font-bold">{totalWriteOffQty} Units</strong>
            </div>
          </div>

          {/* Replaced Products Card - Next to Write-offs */}
          <div className={`p-3.5 rounded-xl border shadow-2xs transition-all ${
            activeTab === 'replace-logs'
              ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 ring-2 ring-purple-500/20'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          }`}>
            <div className="text-xs text-purple-700 dark:text-purple-300 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>{language === 'bn' ? 'পণ্য রিপ্লেসমেন্ট (Replace) হিসাব:' : 'Replaced Products Total:'}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-mono font-bold">
                {replacementsCount} {language === 'bn' ? 'টি রেকর্ড' : 'logs'}
              </span>
            </div>
            <div className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono mt-1">
              {formatCurrency(totalReplacementValuation)}
            </div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-mono flex items-center justify-between">
              <span>{language === 'bn' ? 'প্রতিস্থাপিত মোট পণ্য:' : 'Total Replaced:'}</span>
              <strong className="font-bold">{totalReplacementQty} Units</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {language === 'bn' ? 'ফিল্টারকৃত পণ্য সংখ্যা:' : 'Filtered Products:'}
            </div>
            <div className="text-xl font-black text-zinc-900 dark:text-white font-mono mt-0.5">
              {filteredProducts.length} <span className="text-xs font-normal text-zinc-400">({totalStockCount} units)</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 font-mono">
              {periodLabel || (language === 'bn' ? 'সকল সময়' : 'All Time')}
            </div>
          </div>

          <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {language === 'bn' ? 'মোট ক্রয় মূল্য (ইনভেন্টরি অ্যাসেট):' : 'Total Inventory Cost Asset:'}
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {formatCurrency(totalCostValuation)}
            </div>
            <div className="text-[10px] text-emerald-500/80 mt-1">
              {language === 'bn' ? 'ক্রয় মূল্যের ভিত্তিতে মজুদ সম্পদ' : 'Asset valuation based on purchase rate'}
            </div>
          </div>

          <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-xs text-sky-600 dark:text-sky-400 font-medium">
              {language === 'bn' ? 'প্রাক্কলিত বিক্রয় মূল্য:' : 'Estimated Retail Value:'}
            </div>
            <div className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono mt-0.5">
              {formatCurrency(totalRetailValuation)}
            </div>
            <div className="text-[10px] text-sky-500/80 mt-1">
              {language === 'bn' ? 'বিক্রয় মূল্যের ভিত্তিতে সম্ভাব্য আয়' : 'Estimated revenue on sales rate'}
            </div>
          </div>

          <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              {language === 'bn' ? 'প্রাক্কলিত মোট মুনাফা (Margin):' : 'Estimated Potential Margin:'}
            </div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
              {formatCurrency(totalEstimatedMargin)}
            </div>
            <div className="text-[10px] text-indigo-500/80 mt-1 font-mono">
              {marginPercentage}% {language === 'bn' ? 'গড় মার্জিন হার' : 'avg gross margin'}
            </div>
          </div>
        </div>
      )}

      {/* 4. Date Period Filter (দৈনিক, মাসিক, ডেট টু ডেট) with Target Basis Toggle */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-850 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{language === 'bn' ? 'তারিখ ফিল্টার ভিত্তি:' : 'Date Filter Target:'}</span>
            </span>

            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
              <button
                type="button"
                onClick={() => setDateFilterTarget('createdAt')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  dateFilterTarget === 'createdAt'
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {language === 'bn' ? '📥 পণ্য যোগ করার তারিখ (Added Date)' : '📥 Date Added (Created)'}
              </button>
              <button
                type="button"
                onClick={() => setDateFilterTarget('expDate')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  dateFilterTarget === 'expDate'
                    ? 'bg-purple-600 text-white font-bold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {language === 'bn' ? '⏳ মেয়াদ উত্তীর্ণের তারিখ (Expiry Date)' : '⏳ Expiry Date'}
              </button>
            </div>
          </div>

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ফিল্টার রিসেট' : 'Reset Filters'}</span>
            </button>
          )}
        </div>

        {/* The Reusable DatePeriodFilter Component (Daily, Monthly, Custom Date Range) */}
        <DatePeriodFilter
          startDate={startDate}
          endDate={endDate}
          onChange={(s, e, label) => {
            setStartDate(s);
            setEndDate(e);
            setPeriodLabel(label || '');
          }}
          language={language}
        />
      </div>

      {/* 5. Multi-Dimension Filters Bar (Search, Category, Generic, Brand, Stock Status) */}
      <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'সার্চ' : 'Search'}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={language === 'bn' ? 'নাম, SKU, বারকোড, জেনেরিক, ব্যাচ নং...' : 'Name, SKU, Barcode, Generic, Batch No...'}
                className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-800 dark:text-zinc-200"
            >
              <option value="ALL">{language === 'bn' ? 'সকল ক্যাটাগরি (All)' : 'All Categories'}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.nameBn ? `(${c.nameBn})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Generic Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'জেনেরিক' : 'Generic'}
            </label>
            <select
              value={selectedGeneric}
              onChange={e => setSelectedGeneric(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-800 dark:text-zinc-200"
            >
              <option value="ALL">{language === 'bn' ? 'সকল জেনেরিক (All)' : 'All Generics'}</option>
              {uniqueGenerics.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Brand / Manufacturer Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'কোম্পানি / ব্র্যান্ড' : 'Brand / Company'}
            </label>
            <select
              value={selectedManufacturer}
              onChange={e => setSelectedManufacturer(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-800 dark:text-zinc-200"
            >
              <option value="ALL">{language === 'bn' ? 'সকল ব্র্যান্ড (All)' : 'All Brands'}</option>
              {uniqueManufacturers.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'স্টক স্ট্যাটাস' : 'Stock Status'}
            </label>
            <select
              value={stockStatusFilter}
              onChange={e => setStockStatusFilter(e.target.value as any)}
              className="w-full py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-800 dark:text-zinc-200"
            >
              <option value="ALL">{language === 'bn' ? 'সকল স্টক অবস্থা' : 'All Stock Status'}</option>
              <option value="IN_STOCK">{language === 'bn' ? 'মজুদ আছে (In Stock)' : 'In Stock (>0)'}</option>
              <option value="LOW_STOCK">{language === 'bn' ? 'অল্প স্টক / শেষ পর্যায়ে' : 'Low Stock (<= Reorder)'}</option>
              <option value="OUT_OF_STOCK">{language === 'bn' ? 'স্টক শেষ (Out of Stock)' : 'Out of Stock (=0)'}</option>
            </select>
          </div>
        </div>

        {/* Active Filter Badges Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-zinc-400 text-[11px]">{language === 'bn' ? 'বর্তমান ফিল্টার:' : 'Active Filter:'}</span>
            {periodLabel ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium text-[11px] border border-emerald-200 dark:border-emerald-800">
                📅 {periodLabel} ({dateFilterTarget === 'createdAt' ? (language === 'bn' ? 'যোগের তারিখ' : 'Added Date') : (language === 'bn' ? 'মেয়াদ তারিখ' : 'Expiry Date')})
              </span>
            ) : startDate && endDate ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium text-[11px] border border-emerald-200 dark:border-emerald-800">
                📅 {startDate} হতে {endDate}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px]">
                {language === 'bn' ? 'সকল সময় (All Time)' : 'All Time'}
              </span>
            )}

            {selectedCategory !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-medium text-[11px] border border-blue-200 dark:border-blue-800">
                Category: {categories.find(c => c.id === selectedCategory)?.name}
              </span>
            )}

            {selectedGeneric !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-medium text-[11px] border border-purple-200 dark:border-purple-800">
                Generic: {selectedGeneric}
              </span>
            )}

            {selectedManufacturer !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium text-[11px] border border-indigo-200 dark:border-indigo-800">
                Brand: {selectedManufacturer}
              </span>
            )}
          </div>

          <div className="font-mono text-zinc-500 font-semibold">
            {language === 'bn' ? `মোট ${filteredProducts.length}টি পণ্য প্রদর্শিত` : `Showing ${filteredProducts.length} products`}
          </div>
        </div>
      </div>

      {/* 6. Products Table or Logs Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {activeTab === 'return-logs' || activeTab === 'write-off-logs' || activeTab === 'replace-logs' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-mono">Date</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-4 font-mono">Batch / PUR / Exp</th>
                  <th className="py-3 px-4 text-center font-mono">Qty</th>
                  <th className="py-3 px-4 text-right font-mono">Unit Cost</th>
                  <th className="py-3 px-4 text-right font-mono">Total Value</th>
                  <th className="py-3 px-4">Notes / Reason</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'এন্ট্রি কারী' : 'Entry By'}</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-zinc-400">
                      {activeTab === 'replace-logs'
                        ? (language === 'bn' ? 'কোনো পণ্য প্রতিস্থাপনের (Replace) হিসাব পাওয়া যায়নি।' : 'No product replacement records found.')
                        : activeTab === 'return-logs'
                        ? (language === 'bn' ? 'কোনো মহাজনে ফেরত রেকর্ড পাওয়া যায়নি।' : 'No supplier return records found.')
                        : (language === 'bn' ? 'কোনো নষ্ট / রাইট অফ রেকর্ড পাওয়া যায়নি।' : 'No write-off records found.')}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-zinc-500">{log.date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.actionType === 'RETURN_SUPPLIER'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : log.actionType === 'REPLACEMENT'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {log.actionType === 'RETURN_SUPPLIER'
                            ? (language === 'bn' ? 'মহাজনে ফেরত' : 'Supplier Return')
                            : log.actionType === 'REPLACEMENT'
                            ? (language === 'bn' ? '🔄 পণ্য রিপ্লেসমেন্ট' : '🔄 Replaced')
                            : (language === 'bn' ? 'নষ্ট / রাইট অফ' : 'Write Off')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900 dark:text-white">{log.productName}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">SKU: {log.sku}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-300">
                        <div>Batch: {log.batchNumber || 'N/A'}</div>
                        {log.purchaseInvoiceNo && (
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            PUR: {log.purchaseInvoiceNo}
                          </div>
                        )}
                        <div className="text-[10px] text-rose-600">Exp: {log.expDate || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {log.quantity} {log.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-300">
                        {formatCurrency(log.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        {formatCurrency(log.totalValue)}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 italic max-w-xs truncate">
                        {log.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                        <MultiUserAuditTrail
                          createdBy={log.createdBy}
                          createdByName={getUserDisplayName(log.createdBy)}
                          displayMode="table-cell"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {currentUser?.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(language === 'bn' ? 'এই রেকর্ডটি মুছে ফেলতে চান?' : 'Delete this record?')) {
                                deleteExpiredReturnLog(log.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">{language === 'bn' ? 'পণ্য ও বিবরণ' : 'Item & SKU'}</th>
                  <th className="py-3 px-4 font-mono">{language === 'bn' ? 'যোগের তারিখ' : 'Added Date'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'জেনেরিক' : 'Generic'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'ব্র্যান্ড / কোম্পানি' : 'Brand / Company'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'স্ট্রেংথ (Strength)' : 'Strength'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'ডোজ ও সেবনবিধি' : 'Dosage & Rules'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                  <th className="py-3 px-4 font-mono">{language === 'bn' ? 'বারকোড' : 'Barcode'}</th>
                  <th className="py-3 px-4 font-mono">{language === 'bn' ? 'ব্যাচ নং' : 'Batch No'}</th>
                  <th className="py-3 px-4 font-mono">{language === 'bn' ? 'মেয়াদ তারিখ' : 'Exp. Date'}</th>
                  <th className="py-3 px-4 text-right font-mono">{language === 'bn' ? 'ক্রয় দর' : 'Cost Price'}</th>
                  <th className="py-3 px-4 text-right font-mono">{language === 'bn' ? 'বিক্রয় দর' : 'Sales Price'}</th>
                  <th className="py-3 px-4 text-center font-mono">{language === 'bn' ? 'মার্জিন' : 'Margin'}</th>
                  <th className="py-3 px-4 text-center font-mono">{language === 'bn' ? 'স্টক' : 'Stock'}</th>
                  <th className="py-3 px-4 text-right font-mono">{language === 'bn' ? 'মোট মজুদ মান' : 'Total Asset'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="py-12 text-center text-zinc-400">
                      {language === 'bn' ? 'নির্বাচিত ফিল্টারে কোনো পণ্য পাওয়া যায়নি।' : 'No products found for the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(p => {
                    const marginPct =
                      p.salesPrice > 0
                        ? (((p.salesPrice - p.purchasePrice) / p.salesPrice) * 100).toFixed(1)
                        : '0';
                    const isLow = p.stock <= p.reorderLevel;
                    const summary = productExpirySummaries.get(p.id) || getProductExpirySummary(p, 30);
                    const itemExpired = summary.hasExpired;
                    const itemExpiringSoon = summary.hasExpiringSoon;
                    const itemFresh = summary.hasFresh;
                    const lineValuation = Number(p.stock || 0) * Number(p.purchasePrice || 0);

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${
                          itemExpired && p.stock > 0
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : itemExpiringSoon && p.stock > 0
                            ? 'bg-amber-50/30 dark:bg-amber-950/10'
                            : ''
                        }`}
                      >
                        {/* Item and SKU */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {p.imageUrl || p.image ? (
                              <img src={p.imageUrl || p.image} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-slate-700">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span>{p.name}</span>
                                {p.nameBn && <span className="text-zinc-500 font-normal">({p.nameBn})</span>}
                                {p.strength && (
                                  <span className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded">
                                    {p.strength}
                                  </span>
                                )}
                                {p.dosageForm && (
                                  <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded">
                                    {p.dosageForm}
                                  </span>
                                )}
                                {p.batches && p.batches.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setBatchProduct(p)}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                                    title="View & Manage Batches"
                                  >
                                    <Boxes className="w-3 h-3 text-indigo-500" />
                                    <span>{p.batches.length} {language === 'bn' ? 'ব্যাচ' : 'Batches'}</span>
                                  </button>
                                )}
                                {itemExpired && p.stock > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold flex items-center gap-0.5 shadow-2xs">
                                    🔴 {language === 'bn' ? 'মেয়াদ শেষ' : 'Expired'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                                <span>SKU: {p.sku}</span>
                                {p.dosageSchedule && (
                                  <span className="text-purple-600 dark:text-purple-400 font-sans font-semibold">
                                    • {p.dosageSchedule}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Created / Added Date */}
                        <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {p.createdAt ? (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              {p.createdAt.substring(0, 10)}
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">N/A</span>
                          )}
                        </td>

                        {/* Generic */}
                        <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 font-medium">
                          {p.generic || '—'}
                        </td>

                        {/* Brand / Manufacturer */}
                        <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 font-medium">
                          {p.manufacturer || '—'}
                        </td>

                        {/* Strength */}
                        <td className="py-3 px-4 font-mono font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                          {p.strength ? (
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded">
                              {p.strength}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Dosage Form & Schedule */}
                        <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap">
                          {p.dosageForm || p.dosageSchedule ? (
                            <div className="space-y-0.5">
                              {p.dosageForm && (
                                <span className="inline-block px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded">
                                  {p.dosageForm}
                                </span>
                              )}
                              {p.dosageSchedule && (
                                <div className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold">
                                  {p.dosageSchedule}
                                </div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                          <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                            {p.categoryName || 'General'}
                          </div>
                        </td>

                        {/* Barcode */}
                        <td className="py-3 px-4 font-mono text-zinc-500">
                          {p.barcode}
                        </td>

                        {/* Batch Number */}
                        <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                          {(() => {
                            const batchList: string[] = [];
                            if (p.batchNumber && p.batchNumber.trim()) {
                              batchList.push(p.batchNumber.trim());
                            }
                            if (p.batches) {
                              p.batches.forEach(b => {
                                if (b.batchNumber && b.batchNumber.trim() && !batchList.includes(b.batchNumber.trim())) {
                                  batchList.push(b.batchNumber.trim());
                                }
                              });
                            }

                            if (batchList.length === 0) {
                              return <span className="text-zinc-400 text-[11px]">N/A</span>;
                            }

                            const query = search.trim().toLowerCase();
                            const matchedBatch = query ? batchList.find(b => b.toLowerCase().includes(query)) : null;
                            const displayBatch = matchedBatch || batchList[0];

                            return (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${
                                  matchedBatch
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 ring-1 ring-amber-400'
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                                }`}>
                                  {displayBatch}
                                </span>
                                {batchList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setBatchProduct(p)}
                                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                                    title={language === 'bn' ? `মোট ${batchList.length}টি ব্যাচ দেখুন` : `View all ${batchList.length} batches`}
                                  >
                                    +{batchList.length - 1}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Expiry Date */}
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          {summary.hasAnyExpiry ? (
                            itemExpired && p.stock > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 font-bold text-[11px] border border-rose-300 dark:border-rose-900">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                {summary.formattedDisplayDate} {p.batches && p.batches.length > 1 ? `(${summary.expiredBatchesCount}টি ব্যাচ শেষ)` : `(মেয়াদ শেষ)`}
                              </span>
                            ) : itemExpiringSoon && p.stock > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold text-[11px] border border-amber-300 dark:border-amber-900 shadow-2xs">
                                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                {summary.formattedDisplayDate} ({summary.minDaysRemaining} দিন বাকি)
                              </span>
                            ) : itemFresh ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[11px]">
                                {summary.formattedDisplayDate} (সতেজ)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-[11px]">
                                {summary.formattedDisplayDate}
                              </span>
                            )
                          ) : (
                            <span className="text-zinc-400 text-[11px]">N/A</span>
                          )}
                        </td>

                        {/* Cost Price */}
                        <td className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-300">
                          {formatCurrency(p.purchasePrice)}
                        </td>

                        {/* Sales Price */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.salesPrice)}
                        </td>

                        {/* Margin */}
                        <td className="py-3 px-4 text-center font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                          {marginPct}%
                        </td>

                        {/* Stock Quantity */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                              p.stock <= 0
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                                : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            {Number(p.stock)} {p.unit}
                          </span>
                        </td>

                        {/* Total Cost Valuation */}
                        <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-900 dark:text-white">
                          {formatCurrency(lineValuation)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setBatchProduct(p)}
                              title={language === 'bn' ? 'ব্যাচ ও মেয়াদ পরিচালনা' : 'Manage Batches & Expiry Dates'}
                              className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded transition-colors cursor-pointer"
                            >
                              <Boxes className="w-3.5 h-3.5" />
                            </button>
                            {p.expDate && (
                              <button
                                type="button"
                                onClick={() => setReplaceProduct(p)}
                                title={language === 'bn' ? 'মেয়াদোত্তীর্ণ পণ্য প্রতিস্থাপন / রিপ্লেস (Replace)' : 'Replace Exp Date Product'}
                                className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                                  itemExpired && p.stock > 0
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white font-bold px-2 py-1 shadow-xs'
                                    : 'hover:bg-purple-50 dark:hover:bg-purple-950 text-purple-600 dark:text-purple-400'
                                }`}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                {itemExpired && p.stock > 0 && (
                                  <span className="text-[10px] hidden sm:inline">
                                    {language === 'bn' ? 'রিপ্লেস' : 'Replace'}
                                  </span>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setBarcodeProduct(p)}
                              title="Generate Barcode Sticker"
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded transition-colors cursor-pointer"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                            </button>
                            {hasEditPermission && (
                              <button
                                type="button"
                                onClick={() => onOpenEditModal(p)}
                                title="Edit Product"
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasDeletePermission && (
                              <button
                                type="button"
                                onClick={() => handleDelete(p)}
                                title="Delete Product"
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </>
      )}

      {/* Barcode Sticker Generator Sub-Modal */}
      {barcodeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <Barcode className="w-4 h-4 text-emerald-600" />
              <span>{language === 'bn' ? 'বারকোড স্টিকার লেবেল প্রিন্ট' : 'Print Barcode Label Sheet'}</span>
            </h3>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg">
              <div className="font-bold text-zinc-900 dark:text-white">{barcodeProduct.name}</div>
              <div className="text-zinc-500 font-mono mt-0.5">Code: {barcodeProduct.barcode} • {formatCurrency(barcodeProduct.salesPrice)}</div>
            </div>

            <div>
              <label className="font-semibold block mb-1">{language === 'bn' ? 'স্টিকার সংখ্যা:' : 'Number of Barcode Stickers to Print:'}</label>
              <input
                type="number"
                min="1"
                max="100"
                value={barcodeCount}
                onChange={e => setBarcodeCount(parseInt(e.target.value) || 1)}
                className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setBarcodeProduct(null)}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handlePrintBarcodes}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'প্রিন্ট প্রিভিউ দেখুন' : 'Generate Print Preview'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {replaceProduct && (
        <ReplaceProductModal
          product={replaceProduct}
          onClose={() => setReplaceProduct(null)}
        />
      )}

      {batchProduct && (
        <BatchManagementModal
          product={batchProduct}
          onClose={() => setBatchProduct(null)}
        />
      )}

      {showImportModal && (
        <ProductImportModal
          onClose={() => setShowImportModal(false)}
        />
      )}

      <CameraBarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onBarcodeDetected={(code) => {
          setSearch(code);
          setIsCameraScannerOpen(false);
          showToast(language === 'bn' ? `বারকোড স্ক্যান সফল: ${code}` : `Barcode scanned: ${code}`, 'success');
        }}
        products={products}
      />
    </div>
  );
};
