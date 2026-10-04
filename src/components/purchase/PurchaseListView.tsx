import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Badge } from '../common/Badge';
import { DatePeriodFilter } from '../common/DatePeriodFilter';
import { PurchaseInvoice, Product, DeletedPurchaseInvoice } from '../../types';
import { canUserDelete, canUserEdit, canUserReturn } from '../../utils/permissions';
import {
  Search,
  Printer,
  RotateCcw,
  ArrowUpRight,
  Truck,
  Building,
  Plus,
  Trash2,
  Edit,
  Tag,
  Boxes,
  FileSpreadsheet,
  Download,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
  Layers,
  FileText,
  Building2,
  Package,
  User,
  ShieldCheck,
  RefreshCw,
  FileJson,
} from 'lucide-react';

interface PurchaseListViewProps {
  initialSubTab?: 'active' | 'deleted';
  onOpenPaymentOutModal: (supplierId?: string) => void;
  onOpenReturnModal?: (purchase: PurchaseInvoice) => void;
  onEditInvoice?: (purchase: PurchaseInvoice) => void;
}

type ViewMode = 'bills' | 'category' | 'generic' | 'brand' | 'items';

export const PurchaseListView: React.FC<PurchaseListViewProps> = ({
  initialSubTab = 'active',
  onOpenPaymentOutModal,
  onOpenReturnModal,
  onEditInvoice,
}) => {
  const {
    language,
    purchaseInvoices,
    deletedPurchaseInvoices = [],
    purchaseReturns,
    products,
    categories,
    parties,
    users,
    formatCurrency,
    openPrintModal,
    setActiveTab,
    deletePurchaseInvoice,
    restoreDeletedPurchaseInvoice,
    permanentlyDeleteArchivedPurchase,
    clearAllDeletedPurchases,
    exportDeletedPurchasesToFile,
    exportSingleDeletedPurchaseToFile,
    showToast,
    currentUser,
  } = useApp();
  const { t } = useTranslation(language);

  const hasDeletePermission = canUserDelete(currentUser, 'purchase');
  const hasEditPermission = canUserEdit(currentUser, 'purchase');
  const hasReturnPermission = canUserReturn(currentUser);

  // Sub-Tab Switcher: 'active' vs 'deleted'
  const [currentSubTab, setCurrentSubTab] = useState<'active' | 'deleted'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setCurrentSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Active View Tab
  const [viewMode, setViewMode] = useState<ViewMode>('bills');

  // Search & Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [cashierFilter, setCashierFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [genericFilter, setGenericFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');

  // Deleted Purchase Search & Filter states
  const [deletedSearch, setDeletedSearch] = useState('');
  const [deletedSupplierFilter, setDeletedSupplierFilter] = useState<string>('ALL');
  const [deletedUserFilter, setDeletedUserFilter] = useState<string>('ALL');
  const [deletedStartDate, setDeletedStartDate] = useState<string>('');
  const [deletedEndDate, setDeletedEndDate] = useState<string>('');
  const [deletedPeriodLabel, setDeletedPeriodLabel] = useState<string>('');

  // Date filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [periodLabel, setPeriodLabel] = useState<string>('');

  // Modals & UI states
  const [invoiceToDelete, setInvoiceToDelete] = useState<PurchaseInvoice | null>(null);
  const [deleteReasonOption, setDeleteReasonOption] = useState<string>('MISTAKE_ENTRY');
  const [deleteCustomReason, setDeleteCustomReason] = useState<string>('');
  const [invoiceToRestore, setInvoiceToRestore] = useState<DeletedPurchaseInvoice | null>(null);
  const [invoiceToPermDelete, setInvoiceToPermDelete] = useState<DeletedPurchaseInvoice | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [selectedDeletedPurchase, setSelectedDeletedPurchase] = useState<DeletedPurchaseInvoice | null>(null);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  // Helper to resolve creator / cashier info
  const getCreatorInfo = (pur: PurchaseInvoice) => {
    const user = users.find(
      u =>
        u.id === pur.createdBy ||
        u.username.toLowerCase() === (pur.createdBy || '').toLowerCase() ||
        u.fullName.toLowerCase() === (pur.createdBy || '').toLowerCase()
    );
    const name = user?.fullName || pur.createdBy || 'Admin';
    const role = user?.role || (pur.createdBy?.toLowerCase().includes('cashier') ? 'CASHIER' : 'ADMIN');
    const initials =
      name
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'AD';
    return { name, role, initials, user };
  };

  // Distinct list of creators/cashiers for dropdown filter
  const creatorOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role?: string }>();
    users.forEach(u => {
      map.set(u.id, { id: u.id, name: u.fullName, role: u.role });
    });
    purchaseInvoices.forEach(pur => {
      const info = getCreatorInfo(pur);
      const key = pur.createdBy || info.name;
      if (!map.has(key)) {
        map.set(key, { id: key, name: info.name, role: info.role });
      }
    });
    return Array.from(map.values());
  }, [users, purchaseInvoices]);

  // Product map for quick attribute lookups (Category, Generic, Manufacturer/Brand)
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  // Suppliers list for filter dropdown
  const suppliers = useMemo(() => {
    return parties.filter(p => p.type === 'SUPPLIER');
  }, [parties]);

  // Unique Generics list
  const uniqueGenerics = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.generic && p.generic.trim()) {
        set.add(p.generic.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Unique Brands / Manufacturers list
  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.manufacturer && p.manufacturer.trim()) {
        set.add(p.manufacturer.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Active filter count
  const isAnyFilterActive =
    Boolean(search) ||
    statusFilter !== 'ALL' ||
    supplierFilter !== 'ALL' ||
    cashierFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    genericFilter !== 'ALL' ||
    brandFilter !== 'ALL' ||
    Boolean(startDate) ||
    Boolean(endDate);

  const resetAllFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setSupplierFilter('ALL');
    setCashierFilter('ALL');
    setCategoryFilter('ALL');
    setGenericFilter('ALL');
    setBrandFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPeriodLabel('');
  };

  // Base Date-filtered Purchase Invoices
  const dateFilteredPurchases = useMemo(() => {
    return purchaseInvoices.filter(pur => {
      if (startDate && pur.date < startDate) return false;
      if (endDate && pur.date > endDate) return false;
      return true;
    });
  }, [purchaseInvoices, startDate, endDate]);

  // Comprehensive Filtered Purchases (Invoice Level)
  const filteredPurchases = useMemo(() => {
    return dateFilteredPurchases.filter(pur => {
      const creator = getCreatorInfo(pur);

      // 1. Supplier filter
      if (supplierFilter !== 'ALL' && pur.supplierId !== supplierFilter) return false;

      // 2. Status filter
      if (statusFilter !== 'ALL' && pur.status !== statusFilter) return false;

      // 3. Cashier / User filter
      if (cashierFilter !== 'ALL') {
        const matchesId = pur.createdBy === cashierFilter;
        const matchesName = creator.name === cashierFilter;
        if (!matchesId && !matchesName) return false;
      }

      // 4. Category, Generic, Brand or Item Search match
      const matchingItems = pur.items.filter(item => {
        const prod = productMap.get(item.productId);
        const itemCategory = prod?.categoryId || '';
        const itemGeneric = (prod?.generic || '').toLowerCase();
        const itemBrand = (prod?.manufacturer || '').toLowerCase();
        const itemName = (item.productName || prod?.name || '').toLowerCase();

        if (categoryFilter !== 'ALL' && itemCategory !== categoryFilter) {
          return false;
        }
        if (genericFilter !== 'ALL' && itemGeneric !== genericFilter.toLowerCase()) {
          return false;
        }
        if (brandFilter !== 'ALL' && itemBrand !== brandFilter.toLowerCase()) {
          return false;
        }

        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesItem =
            itemName.includes(q) ||
            itemGeneric.includes(q) ||
            itemBrand.includes(q) ||
            (prod?.sku && prod.sku.toLowerCase().includes(q)) ||
            (prod?.barcode && prod.barcode.toLowerCase().includes(q));
          const matchesBill =
            pur.billNumber.toLowerCase().includes(q) ||
            pur.supplierName.toLowerCase().includes(q) ||
            (pur.supplierInvoiceNo && pur.supplierInvoiceNo.toLowerCase().includes(q)) ||
            (pur.createdBy && pur.createdBy.toLowerCase().includes(q)) ||
            (creator.name && creator.name.toLowerCase().includes(q)) ||
            (creator.role && creator.role.toLowerCase().includes(q));

          return matchesItem || matchesBill;
        }

        return true;
      });

      // If user is searching/filtering by item attributes, invoice must contain at least 1 matching item
      if (categoryFilter !== 'ALL' || genericFilter !== 'ALL' || brandFilter !== 'ALL') {
        return matchingItems.length > 0;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesBill =
          pur.billNumber.toLowerCase().includes(q) ||
          pur.supplierName.toLowerCase().includes(q) ||
          (pur.supplierInvoiceNo && pur.supplierInvoiceNo.toLowerCase().includes(q)) ||
          (pur.createdBy && pur.createdBy.toLowerCase().includes(q)) ||
          (creator.name && creator.name.toLowerCase().includes(q)) ||
          (creator.role && creator.role.toLowerCase().includes(q));
        if (!matchesBill && matchingItems.length === 0) {
          return false;
        }
      }

      return true;
    });
  }, [
    dateFilteredPurchases,
    supplierFilter,
    statusFilter,
    cashierFilter,
    categoryFilter,
    genericFilter,
    brandFilter,
    search,
    productMap,
    users,
  ]);

  // Aggregate Totals
  const totalPurchaseSum = filteredPurchases.reduce((sum, p) => sum + p.grandTotal, 0);
  const totalPaidSum = filteredPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalDueSum = filteredPurchases.reduce((sum, p) => sum + p.dueAmount, 0);

  // Total Quantity Purchased across filtered invoices
  const totalQuantityPurchased = useMemo(() => {
    return filteredPurchases.reduce((sum, pur) => {
      const itemSum = pur.items.reduce((s, it) => {
        const prod = productMap.get(it.productId);
        if (categoryFilter !== 'ALL' && prod?.categoryId !== categoryFilter) return s;
        if (genericFilter !== 'ALL' && (prod?.generic || '').toLowerCase() !== genericFilter.toLowerCase()) return s;
        if (brandFilter !== 'ALL' && (prod?.manufacturer || '').toLowerCase() !== brandFilter.toLowerCase()) return s;
        return s + Number(it.quantity || 0);
      }, 0);
      return sum + itemSum;
    }, 0);
  }, [filteredPurchases, categoryFilter, genericFilter, brandFilter, productMap]);

  // -------------------------------------------------------------
  // 1. CATEGORY WISE PURCHASE REPORT CALCULATION
  // -------------------------------------------------------------
  const categoryWiseReport = useMemo(() => {
    const catDataMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        categoryCode?: string;
        purchasedQty: number;
        totalAmount: number;
        productIds: Set<string>;
        billIds: Set<string>;
        itemsList: {
          productName: string;
          generic?: string;
          brand?: string;
          quantity: number;
          unit: string;
          total: number;
          billNumber: string;
          date: string;
          supplierName: string;
        }[];
      }
    >();

    // Initialise with categories
    categories.forEach(cat => {
      if (categoryFilter === 'ALL' || cat.id === categoryFilter) {
        catDataMap.set(cat.id, {
          categoryId: cat.id,
          categoryName: cat.name,
          categoryCode: cat.code,
          purchasedQty: 0,
          totalAmount: 0,
          productIds: new Set<string>(),
          billIds: new Set<string>(),
          itemsList: [],
        });
      }
    });

    // Also Uncategorized bucket
    const uncategorizedKey = 'UNCATEGORIZED';
    if (categoryFilter === 'ALL' || categoryFilter === uncategorizedKey) {
      catDataMap.set(uncategorizedKey, {
        categoryId: uncategorizedKey,
        categoryName: language === 'bn' ? 'ক্যাটাগরি বিহীন' : 'Uncategorized',
        categoryCode: 'N/A',
        purchasedQty: 0,
        totalAmount: 0,
        productIds: new Set<string>(),
        billIds: new Set<string>(),
        itemsList: [],
      });
    }

    filteredPurchases.forEach(pur => {
      pur.items.forEach(it => {
        const prod = productMap.get(it.productId);
        const catId = prod?.categoryId && catDataMap.has(prod.categoryId) ? prod.categoryId : uncategorizedKey;

        // check secondary filters
        if (genericFilter !== 'ALL' && (prod?.generic || '').toLowerCase() !== genericFilter.toLowerCase()) return;
        if (brandFilter !== 'ALL' && (prod?.manufacturer || '').toLowerCase() !== brandFilter.toLowerCase()) return;

        const entry = catDataMap.get(catId);
        if (entry) {
          entry.purchasedQty += Number(it.quantity || 0);
          entry.totalAmount += Number(it.total || 0);
          entry.productIds.add(it.productId);
          entry.billIds.add(pur.id);
          entry.itemsList.push({
            productName: it.productName,
            generic: prod?.generic,
            brand: prod?.manufacturer,
            quantity: it.quantity,
            unit: it.unit || 'pcs',
            total: it.total,
            billNumber: pur.billNumber,
            date: pur.date,
            supplierName: pur.supplierName,
          });
        }
      });
    });

    const reportArray = Array.from(catDataMap.values()).filter(c => c.purchasedQty > 0 || c.totalAmount > 0);
    const overallCatTotal = reportArray.reduce((s, c) => s + c.totalAmount, 0);

    return reportArray
      .map(c => ({
        ...c,
        productCount: c.productIds.size,
        billCount: c.billIds.size,
        avgRate: c.purchasedQty > 0 ? c.totalAmount / c.purchasedQty : 0,
        percentage: overallCatTotal > 0 ? (c.totalAmount / overallCatTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [categories, filteredPurchases, productMap, categoryFilter, genericFilter, brandFilter, language]);

  // -------------------------------------------------------------
  // 2. GENERIC WISE PURCHASE REPORT CALCULATION
  // -------------------------------------------------------------
  const genericWiseReport = useMemo(() => {
    const genericMap = new Map<
      string,
      {
        genericName: string;
        purchasedQty: number;
        totalAmount: number;
        productIds: Set<string>;
        suppliers: Set<string>;
        billIds: Set<string>;
        itemsList: {
          productName: string;
          categoryName?: string;
          brand?: string;
          quantity: number;
          unit: string;
          total: number;
          billNumber: string;
          date: string;
          supplierName: string;
        }[];
      }
    >();

    filteredPurchases.forEach(pur => {
      pur.items.forEach(it => {
        const prod = productMap.get(it.productId);
        const genericName = prod?.generic && prod.generic.trim() ? prod.generic.trim() : (language === 'bn' ? 'সাধারণ / জেনেরিক নেই' : 'General / No Generic');

        if (genericFilter !== 'ALL' && genericName.toLowerCase() !== genericFilter.toLowerCase()) return;
        if (categoryFilter !== 'ALL' && prod?.categoryId !== categoryFilter) return;
        if (brandFilter !== 'ALL' && (prod?.manufacturer || '').toLowerCase() !== brandFilter.toLowerCase()) return;

        if (!genericMap.has(genericName)) {
          genericMap.set(genericName, {
            genericName,
            purchasedQty: 0,
            totalAmount: 0,
            productIds: new Set<string>(),
            suppliers: new Set<string>(),
            billIds: new Set<string>(),
            itemsList: [],
          });
        }

        const g = genericMap.get(genericName)!;
        g.purchasedQty += Number(it.quantity || 0);
        g.totalAmount += Number(it.total || 0);
        g.productIds.add(it.productId);
        g.suppliers.add(pur.supplierName);
        g.billIds.add(pur.id);
        g.itemsList.push({
          productName: it.productName,
          categoryName: prod?.categoryName || categories.find(c => c.id === prod?.categoryId)?.name,
          brand: prod?.manufacturer,
          quantity: it.quantity,
          unit: it.unit || 'pcs',
          total: it.total,
          billNumber: pur.billNumber,
          date: pur.date,
          supplierName: pur.supplierName,
        });
      });
    });

    const reportArray = Array.from(genericMap.values());
    const overallGenericTotal = reportArray.reduce((s, g) => s + g.totalAmount, 0);

    return reportArray
      .map(g => ({
        ...g,
        productCount: g.productIds.size,
        supplierCount: g.suppliers.size,
        billCount: g.billIds.size,
        avgRate: g.purchasedQty > 0 ? g.totalAmount / g.purchasedQty : 0,
        percentage: overallGenericTotal > 0 ? (g.totalAmount / overallGenericTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredPurchases, productMap, genericFilter, categoryFilter, brandFilter, categories, language]);

  // -------------------------------------------------------------
  // 3. BRAND / MANUFACTURER WISE PURCHASE REPORT CALCULATION
  // -------------------------------------------------------------
  const brandWiseReport = useMemo(() => {
    const brandMap = new Map<
      string,
      {
        brandName: string;
        purchasedQty: number;
        totalAmount: number;
        productIds: Set<string>;
        suppliers: Set<string>;
        billIds: Set<string>;
        itemsList: {
          productName: string;
          categoryName?: string;
          generic?: string;
          quantity: number;
          unit: string;
          total: number;
          billNumber: string;
          date: string;
          supplierName: string;
        }[];
      }
    >();

    filteredPurchases.forEach(pur => {
      pur.items.forEach(it => {
        const prod = productMap.get(it.productId);
        const brandName = prod?.manufacturer && prod.manufacturer.trim() ? prod.manufacturer.trim() : (language === 'bn' ? 'ব্র্যান্ড বিহীন / নন-ব্র্যান্ডেড' : 'Unbranded / Others');

        if (brandFilter !== 'ALL' && brandName.toLowerCase() !== brandFilter.toLowerCase()) return;
        if (categoryFilter !== 'ALL' && prod?.categoryId !== categoryFilter) return;
        if (genericFilter !== 'ALL' && (prod?.generic || '').toLowerCase() !== genericFilter.toLowerCase()) return;

        if (!brandMap.has(brandName)) {
          brandMap.set(brandName, {
            brandName,
            purchasedQty: 0,
            totalAmount: 0,
            productIds: new Set<string>(),
            suppliers: new Set<string>(),
            billIds: new Set<string>(),
            itemsList: [],
          });
        }

        const b = brandMap.get(brandName)!;
        b.purchasedQty += Number(it.quantity || 0);
        b.totalAmount += Number(it.total || 0);
        b.productIds.add(it.productId);
        b.suppliers.add(pur.supplierName);
        b.billIds.add(pur.id);
        b.itemsList.push({
          productName: it.productName,
          categoryName: prod?.categoryName || categories.find(c => c.id === prod?.categoryId)?.name,
          generic: prod?.generic,
          quantity: it.quantity,
          unit: it.unit || 'pcs',
          total: it.total,
          billNumber: pur.billNumber,
          date: pur.date,
          supplierName: pur.supplierName,
        });
      });
    });

    const reportArray = Array.from(brandMap.values());
    const overallBrandTotal = reportArray.reduce((s, b) => s + b.totalAmount, 0);

    return reportArray
      .map(b => ({
        ...b,
        productCount: b.productIds.size,
        supplierCount: b.suppliers.size,
        billCount: b.billIds.size,
        avgRate: b.purchasedQty > 0 ? b.totalAmount / b.purchasedQty : 0,
        percentage: overallBrandTotal > 0 ? (b.totalAmount / overallBrandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredPurchases, productMap, brandFilter, categoryFilter, genericFilter, categories, language]);

  // -------------------------------------------------------------
  // 4. ITEM LEVEL PURCHASE BREAKDOWN REPORT
  // -------------------------------------------------------------
  const itemWiseReport = useMemo(() => {
    const itemMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        categoryName?: string;
        generic?: string;
        brand?: string;
        unit: string;
        purchasedQty: number;
        totalAmount: number;
        billIds: Set<string>;
        suppliers: Set<string>;
      }
    >();

    filteredPurchases.forEach(pur => {
      pur.items.forEach(it => {
        const prod = productMap.get(it.productId);
        if (categoryFilter !== 'ALL' && prod?.categoryId !== categoryFilter) return;
        if (genericFilter !== 'ALL' && (prod?.generic || '').toLowerCase() !== genericFilter.toLowerCase()) return;
        if (brandFilter !== 'ALL' && (prod?.manufacturer || '').toLowerCase() !== brandFilter.toLowerCase()) return;

        if (!itemMap.has(it.productId)) {
          itemMap.set(it.productId, {
            productId: it.productId,
            productName: it.productName,
            categoryName: prod?.categoryName || categories.find(c => c.id === prod?.categoryId)?.name || 'General',
            generic: prod?.generic || '-',
            brand: prod?.manufacturer || '-',
            unit: it.unit || prod?.unit || 'Pcs',
            purchasedQty: 0,
            totalAmount: 0,
            billIds: new Set<string>(),
            suppliers: new Set<string>(),
          });
        }

        const itEntry = itemMap.get(it.productId)!;
        itEntry.purchasedQty += Number(it.quantity || 0);
        itEntry.totalAmount += Number(it.total || 0);
        itEntry.billIds.add(pur.id);
        itEntry.suppliers.add(pur.supplierName);
      });
    });

    return Array.from(itemMap.values())
      .map(item => ({
        ...item,
        avgRate: item.purchasedQty > 0 ? item.totalAmount / item.purchasedQty : 0,
        billCount: item.billIds.size,
        supplierNames: Array.from(item.suppliers).join(', '),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredPurchases, productMap, categoryFilter, genericFilter, brandFilter, categories]);

  const handlePrintDeletedList = () => {
    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'ডিলিট ক্রয় চালান আর্কাইভ' : 'DELETED PURCHASE ARCHIVE',
      data: {
        reportTitle: language === 'bn' ? 'ডিলিট ক্রয় চালান আর্কাইভ' : 'DELETED PURCHASE ARCHIVE',
        period: 'All Time',
        columns: [
          { header: 'Deleted Date', key: 'deletedAt' },
          { header: 'Bill No', key: 'billNumber' },
          { header: 'Supplier', key: 'supplierName' },
          { header: 'Total', key: 'total', align: 'right', format: 'currency' },
          { header: 'Reason', key: 'reason' },
        ],
        rows: deletedPurchaseInvoices.map(inv => ({
          deletedAt: new Date(inv.deletedAt).toLocaleDateString(),
          billNumber: inv.billNumber,
          supplierName: inv.supplierName || 'Unknown Supplier',
          total: inv.grandTotal,
          reason: inv.deletionReason || '-',
        })),
        totals: {
          billNumber: `${deletedPurchaseInvoices.length} Bills`,
          total: deletedPurchaseInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
        }
      },
    });
  };

  // Single Bill Print Handler
  const handlePrint = (purchase: PurchaseInvoice) => {
    openPrintModal({
      type: 'PURCHASE_VOUCHER',
      title: `Purchase Bill #${purchase.billNumber}`,
      data: purchase,
    });
  };


  // Generic Report Print Modal Handler
  const handlePrintReport = (reportType: 'bills' | 'category' | 'generic' | 'brand' | 'items') => {
    const activePeriodText =
      periodLabel ||
      (startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `To ${endDate}` : 'All Time');

    if (reportType === 'bills') {
      openPrintModal({
        type: 'REPORT',
        title: language === 'bn' ? 'ক্রয় ইনভয়েস তালিকা' : 'Purchase Bills Report',
        data: {
          reportTitle: language === 'bn' ? 'ক্রয় ইনভয়েস তালিকা' : 'Purchase Bills Report',
          period: activePeriodText,
          generatedDate: new Date().toLocaleDateString('en-GB'),
          kpis: [
            { label: language === 'bn' ? 'মোট ইনভয়েস' : 'Total Bills', value: filteredPurchases.length },
            { label: language === 'bn' ? 'সর্বমোট ক্রয় মূল্য' : 'Total Purchase Value', value: totalPurchaseSum },
            { label: language === 'bn' ? 'মোট পেইড' : 'Total Paid', value: totalPaidSum },
          ],
          columns: [
            { header: language === 'bn' ? 'তারিখ' : 'Date', key: 'date' },
            { header: language === 'bn' ? 'ইনভয়েস নং' : 'Bill No', key: 'billNumber' },
            { header: language === 'bn' ? 'সাপ্লায়ার' : 'Supplier', key: 'supplierName' },
            { header: language === 'bn' ? 'মোট টাকা' : 'Total', key: 'totalAmount', align: 'right', format: 'currency' },
            { header: language === 'bn' ? 'পেইড' : 'Paid', key: 'paidAmount', align: 'right', format: 'currency' },
            { header: language === 'bn' ? 'বকেয়া' : 'Due', key: 'dueAmount', align: 'right', format: 'currency' },
          ],
          rows: filteredPurchases.map(p => ({
            date: p.date,
            billNumber: p.billNumber,
            supplierName: suppliers.find(s => s.id === p.supplierId)?.name || 'Unknown',
            totalAmount: p.totalAmount,
            paidAmount: p.paidAmount,
            dueAmount: p.totalAmount - p.paidAmount
          })),
          totals: {
            totalAmount: totalPurchaseSum,
            paidAmount: totalPaidSum,
            dueAmount: totalPurchaseSum - totalPaidSum
          }
        }
      });
    } else if (reportType === 'category') {
      openPrintModal({
        type: 'REPORT',
        title: language === 'bn' ? 'ক্যাটাগরি অনুযায়ী ক্রয় রিপোর্ট' : 'Category Wise Purchase Report',
        data: {
          reportTitle: language === 'bn' ? 'ক্যাটাগরি অনুযায়ী ক্রয় রিপোর্ট' : 'Category Wise Purchase Report',
          period: activePeriodText,
          generatedDate: new Date().toLocaleDateString('en-GB'),
          kpis: [
            { label: language === 'bn' ? 'মোট ক্যাটাগরি' : 'Total Categories', value: categoryWiseReport.length },
            { label: language === 'bn' ? 'মোট আইটেম কোয়ান্টিটি' : 'Total Quantity', value: totalQuantityPurchased },
            { label: language === 'bn' ? 'সর্বমোট ক্রয় মূল্য' : 'Total Purchase Value', value: totalPurchaseSum },
          ],
          columns: [
            { header: language === 'bn' ? 'ক্যাটাগরি' : 'Category', key: 'categoryName' },
            { header: language === 'bn' ? 'প্রোডাক্ট সংখ্যা' : 'Products', key: 'productCount' },
            { header: language === 'bn' ? 'চালান সংখ্যা' : 'Bills', key: 'billCount' },
            { header: language === 'bn' ? 'পরিমাণ (Qty)' : 'Quantity', key: 'purchasedQty' },
            { header: language === 'bn' ? 'গড় দর' : 'Avg Rate', key: 'avgRate' },
            { header: language === 'bn' ? 'মোট ক্রয় (৳)' : 'Total Cost', key: 'totalAmount' },
          ],
          rows: categoryWiseReport.map(r => ({
            categoryName: r.categoryName,
            productCount: r.productCount,
            billCount: r.billCount,
            purchasedQty: r.purchasedQty,
            avgRate: `৳${r.avgRate.toFixed(2)}`,
            totalAmount: r.totalAmount,
          })),
          totals: {
            totalAmount: totalPurchaseSum,
          },
        },
      });
    } else if (reportType === 'generic') {
      openPrintModal({
        type: 'REPORT',
        title: language === 'bn' ? 'জেনেরিক অনুযায়ী ক্রয় রিপোর্ট' : 'Generic Wise Purchase Report',
        data: {
          reportTitle: language === 'bn' ? 'জেনেরিক অনুযায়ী ক্রয় রিপোর্ট' : 'Generic Wise Purchase Report',
          period: activePeriodText,
          generatedDate: new Date().toLocaleDateString('en-GB'),
          kpis: [
            { label: language === 'bn' ? 'মোট জেনেরিক গ্রুপ' : 'Total Generics', value: genericWiseReport.length },
            { label: language === 'bn' ? 'মোট ক্রয়কৃত আইটেম' : 'Total Quantity', value: totalQuantityPurchased },
            { label: language === 'bn' ? 'সর্বমোট ব্যয়' : 'Total Purchase Value', value: totalPurchaseSum },
          ],
          columns: [
            { header: language === 'bn' ? 'জেনেরিক নাম' : 'Generic Group', key: 'genericName' },
            { header: language === 'bn' ? 'প্রোডাক্ট' : 'Products', key: 'productCount' },
            { header: language === 'bn' ? 'সরবরাহকারী' : 'Suppliers', key: 'supplierCount' },
            { header: language === 'bn' ? 'পরিমাণ (Qty)' : 'Quantity', key: 'purchasedQty' },
            { header: language === 'bn' ? 'শেয়ার (%)' : 'Share', key: 'percentage' },
            { header: language === 'bn' ? 'মোট ক্রয় (৳)' : 'Total Cost', key: 'totalAmount' },
          ],
          rows: genericWiseReport.map(r => ({
            genericName: r.genericName,
            productCount: r.productCount,
            supplierCount: r.supplierCount,
            purchasedQty: r.purchasedQty,
            percentage: `${r.percentage.toFixed(1)}%`,
            totalAmount: r.totalAmount,
          })),
          totals: {
            totalAmount: totalPurchaseSum,
          },
        },
      });
    } else if (reportType === 'brand') {
      openPrintModal({
        type: 'REPORT',
        title: language === 'bn' ? 'ব্র্যান্ড / কোম্পানি অনুযায়ী ক্রয় রিপোর্ট' : 'Brand / Manufacturer Wise Purchase Report',
        data: {
          reportTitle: language === 'bn' ? 'ব্র্যান্ড / কোম্পানি অনুযায়ী ক্রয় রিপোর্ট' : 'Brand / Manufacturer Wise Purchase Report',
          period: activePeriodText,
          generatedDate: new Date().toLocaleDateString('en-GB'),
          kpis: [
            { label: language === 'bn' ? 'মোট ব্র্যান্ড / কোম্পানি' : 'Total Brands', value: brandWiseReport.length },
            { label: language === 'bn' ? 'মোট ক্রয়কৃত আইটেম' : 'Total Quantity', value: totalQuantityPurchased },
            { label: language === 'bn' ? 'সর্বমোট ব্যয়' : 'Total Purchase Value', value: totalPurchaseSum },
          ],
          columns: [
            { header: language === 'bn' ? 'ব্র্যান্ড / কোম্পানি' : 'Brand / Company', key: 'brandName' },
            { header: language === 'bn' ? 'প্রোডাক্ট' : 'Products', key: 'productCount' },
            { header: language === 'bn' ? 'বিল সংখ্যা' : 'Bills', key: 'billCount' },
            { header: language === 'bn' ? 'পরিমাণ (Qty)' : 'Quantity', key: 'purchasedQty' },
            { header: language === 'bn' ? 'শেয়ার (%)' : 'Share', key: 'percentage' },
            { header: language === 'bn' ? 'মোট ক্রয় (৳)' : 'Total Cost', key: 'totalAmount' },
          ],
          rows: brandWiseReport.map(r => ({
            brandName: r.brandName,
            productCount: r.productCount,
            billCount: r.billCount,
            purchasedQty: r.purchasedQty,
            percentage: `${r.percentage.toFixed(1)}%`,
            totalAmount: r.totalAmount,
          })),
          totals: {
            totalAmount: totalPurchaseSum,
          },
        },
      });
    } else {
      openPrintModal({
        type: 'REPORT',
        title: language === 'bn' ? 'আইটেম ভিত্তিক ক্রয় বিশ্লেষণ রিপোর্ট' : 'Item Wise Purchase Analysis Report',
        data: {
          reportTitle: language === 'bn' ? 'আইটেম ভিত্তিক ক্রয় রিপোর্ট' : 'Item Wise Purchase Report',
          period: activePeriodText,
          generatedDate: new Date().toLocaleDateString('en-GB'),
          kpis: [
            { label: language === 'bn' ? 'মোট আইটেম' : 'Total Products', value: itemWiseReport.length },
            { label: language === 'bn' ? 'মোট ক্রয়কৃত পরিমাণ' : 'Total Quantity', value: totalQuantityPurchased },
            { label: language === 'bn' ? 'সর্বমোট ক্রয় মূল্য' : 'Total Value', value: totalPurchaseSum },
          ],
          columns: [
            { header: language === 'bn' ? 'প্রোডাক্ট নাম' : 'Product Name', key: 'productName' },
            { header: language === 'bn' ? 'ক্যাটাগরি' : 'Category', key: 'categoryName' },
            { header: language === 'bn' ? 'জেনেরিক' : 'Generic', key: 'generic' },
            { header: language === 'bn' ? 'ব্র্যান্ড' : 'Brand', key: 'brand' },
            { header: language === 'bn' ? 'পরিমাণ' : 'Quantity', key: 'purchasedQty' },
            { header: language === 'bn' ? 'গড় দর' : 'Avg Rate', key: 'avgRate' },
            { header: language === 'bn' ? 'মোট মূল্য (৳)' : 'Total (৳)', key: 'totalAmount' },
          ],
          rows: itemWiseReport.map(r => ({
            productName: r.productName,
            categoryName: r.categoryName,
            generic: r.generic,
            brand: r.brand,
            purchasedQty: `${r.purchasedQty} ${r.unit}`,
            avgRate: `৳${r.avgRate.toFixed(2)}`,
            totalAmount: r.totalAmount,
          })),
          totals: {
            totalAmount: totalPurchaseSum,
          },
        },
      });
    }
  };

  // CSV Export Handler
  const handleExportCsv = (reportType: ViewMode) => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let fileName = `Purchase_Report_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'category') {
      fileName = `Category_Wise_Purchase_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Category Name', 'Products Count', 'Bills Count', 'Quantity Purchased', 'Avg Rate', 'Total Amount (Tk)', 'Share (%)'];
      rows = categoryWiseReport.map(r => [
        `"${r.categoryName}"`,
        r.productCount,
        r.billCount,
        r.purchasedQty,
        r.avgRate.toFixed(2),
        r.totalAmount.toFixed(2),
        r.percentage.toFixed(1) + '%',
      ]);
    } else if (reportType === 'generic') {
      fileName = `Generic_Wise_Purchase_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Generic Group', 'Products Count', 'Suppliers Count', 'Quantity Purchased', 'Avg Rate', 'Total Amount (Tk)', 'Share (%)'];
      rows = genericWiseReport.map(r => [
        `"${r.genericName}"`,
        r.productCount,
        r.supplierCount,
        r.purchasedQty,
        r.avgRate.toFixed(2),
        r.totalAmount.toFixed(2),
        r.percentage.toFixed(1) + '%',
      ]);
    } else if (reportType === 'brand') {
      fileName = `Brand_Wise_Purchase_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Brand / Company', 'Products Count', 'Bills Count', 'Quantity Purchased', 'Avg Rate', 'Total Amount (Tk)', 'Share (%)'];
      rows = brandWiseReport.map(r => [
        `"${r.brandName}"`,
        r.productCount,
        r.billCount,
        r.purchasedQty,
        r.avgRate.toFixed(2),
        r.totalAmount.toFixed(2),
        r.percentage.toFixed(1) + '%',
      ]);
    } else if (reportType === 'items') {
      fileName = `Item_Wise_Purchase_Report_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Product Name', 'Category', 'Generic', 'Brand / Manufacturer', 'Quantity', 'Unit', 'Avg Rate', 'Total Cost (Tk)', 'Suppliers'];
      rows = itemWiseReport.map(r => [
        `"${r.productName}"`,
        `"${r.categoryName}"`,
        `"${r.generic}"`,
        `"${r.brand}"`,
        r.purchasedQty,
        `"${r.unit}"`,
        r.avgRate.toFixed(2),
        r.totalAmount.toFixed(2),
        `"${r.supplierNames}"`,
      ]);
    } else {
      fileName = `Purchase_Bills_List_${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['Bill Number', 'Challan / Ref', 'Date', 'Supplier Name', 'Phone', 'Items Count', 'Grand Total (Tk)', 'Paid (Tk)', 'Due (Tk)', 'Status'];
      rows = filteredPurchases.map(pur => [
        `"${pur.billNumber}"`,
        `"${pur.supplierInvoiceNo || ''}"`,
        pur.date,
        `"${pur.supplierName}"`,
        `"${pur.supplierPhone || ''}"`,
        pur.items.reduce((s, it) => s + Number(it.quantity || 0), 0),
        pur.grandTotal.toFixed(2),
        pur.paidAmount.toFixed(2),
        pur.dueAmount.toFixed(2),
        pur.status,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered deleted purchase invoices
  const filteredDeletedPurchases = useMemo(() => {
    return deletedPurchaseInvoices.filter(del => {
      if (deletedSearch.trim()) {
        const q = deletedSearch.toLowerCase();
        const matches =
          del.billNumber.toLowerCase().includes(q) ||
          del.supplierName.toLowerCase().includes(q) ||
          (del.supplierPhone && del.supplierPhone.toLowerCase().includes(q)) ||
          (del.deletionReason && del.deletionReason.toLowerCase().includes(q)) ||
          (del.deletedBy?.fullName && del.deletedBy.fullName.toLowerCase().includes(q)) ||
          (del.deletedBy?.username && del.deletedBy.username.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (deletedSupplierFilter !== 'ALL' && del.supplierId !== deletedSupplierFilter) {
        return false;
      }
      if (deletedUserFilter !== 'ALL') {
        const matchesId = del.deletedBy?.id === deletedUserFilter;
        const matchesUsername = del.deletedBy?.username === deletedUserFilter;
        const matchesName = del.deletedBy?.fullName === deletedUserFilter;
        if (!matchesId && !matchesUsername && !matchesName) return false;
      }
      if (deletedStartDate && del.date < deletedStartDate) return false;
      if (deletedEndDate && del.date > deletedEndDate) return false;
      return true;
    });
  }, [deletedPurchaseInvoices, deletedSearch, deletedSupplierFilter, deletedUserFilter, deletedStartDate, deletedEndDate]);

  // Deleted users filter options
  const deletedByOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role?: string }>();
    deletedPurchaseInvoices.forEach(del => {
      if (del.deletedBy) {
        const key = del.deletedBy.id || del.deletedBy.username;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            name: del.deletedBy.fullName || del.deletedBy.username || 'User',
            role: del.deletedBy.role,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [deletedPurchaseInvoices]);

  const handlePrintSingleDeleted = (del: DeletedPurchaseInvoice) => {
    openPrintModal({
      type: 'PURCHASE_VOUCHER',
      title: `Deleted Purchase Bill #${del.billNumber}`,
      data: {
        ...del,
        id: del.originalPurchaseId,
        isDeleted: true,
      } as any,
    });
  };

  const handleConfirmDelete = () => {
    if (invoiceToDelete) {
      if (!hasDeletePermission) {
        showToast(
          language === 'bn'
            ? 'আপনার এই ক্রয় চালান ডিলিট করার অনুমতি নেই (Delete Permission Required)!'
            : 'You do not have permission to delete purchase invoices!',
          'error'
        );
        setInvoiceToDelete(null);
        return;
      }

      let finalReason = deleteCustomReason.trim();
      if (!finalReason) {
        switch (deleteReasonOption) {
          case 'MISTAKE_ENTRY':
            finalReason = language === 'bn' ? 'ভুল তথ্য এন্ট্রি / কারেকশন' : 'Mistake / Wrong entry';
            break;
          case 'SUPPLIER_RETURN_ERROR':
            finalReason = language === 'bn' ? 'সাপ্লায়ার রিটার্ন বা ভুল পণ্য' : 'Supplier return / incorrect items';
            break;
          case 'PRICE_DISCREPANCY':
            finalReason = language === 'bn' ? 'ক্রয় মূল্যে গরমিল / ডিসক্রিপেন্সি' : 'Price discrepancy';
            break;
          case 'CANCELLED_ORDER':
            finalReason = language === 'bn' ? 'ক্রয় অর্ডার বাতিল করা হয়েছে' : 'Purchase order cancelled';
            break;
          default:
            finalReason = language === 'bn' ? 'ইউজার কর্তৃক ডিলিট' : 'Deleted by authorized user';
        }
      }

      const success = deletePurchaseInvoice(invoiceToDelete.id, finalReason);
      if (success) {
        showToast(
          language === 'bn'
            ? `চালান #${invoiceToDelete.billNumber} ডিলিট করে 'Delete Purchase' আর্কাইভে সংরক্ষণ করা হয়েছে।`
            : `Purchase bill #${invoiceToDelete.billNumber} deleted and archived successfully.`,
          'success'
        );
      }
      setInvoiceToDelete(null);
      setDeleteCustomReason('');
    }
  };

  const handleConfirmRestore = () => {
    if (invoiceToRestore) {
      if (!hasDeletePermission && currentUser?.role !== 'ADMIN') {
        showToast(
          language === 'bn'
            ? 'চালান পুনরুদ্ধার করার জন্য ডিলিট পারমিশন আবশ্যক।'
            : 'Permission required to restore purchase bills.',
          'error'
        );
        setInvoiceToRestore(null);
        return;
      }
      const success = restoreDeletedPurchaseInvoice(invoiceToRestore.id);
      if (success) {
        showToast(
          language === 'bn'
            ? `চালান #${invoiceToRestore.billNumber} সফলভাবে সক্রিয় ক্রয় তালিকায় পুনরুদ্ধার করা হয়েছে!`
            : `Purchase bill #${invoiceToRestore.billNumber} restored successfully!`,
          'success'
        );
      }
      setInvoiceToRestore(null);
      if (selectedDeletedPurchase?.id === invoiceToRestore.id) {
        setSelectedDeletedPurchase(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header with View Selector & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-600" />
            <span>{language === 'bn' ? 'ক্রয় বিল ও অ্যানালিটিক্স রিপোর্ট' : 'Purchase Bills & Category/Generic/Brand Reports'}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'bn'
              ? 'ক্যাটাগরি, জেনেরিক, ব্র্যান্ড ও আইটেম ভিত্তিক বিশদ ক্রয় রিপোর্ট এবং বিল হিস্ট্রি'
              : 'Category, Generic, Brand and Item-wise breakdown reports with supplier challans and bills'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
              type="button"
              onClick={() => handlePrintReport(viewMode as any)}
              className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'bn' ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}</span>
            </button>

          <button
            type="button"
            onClick={() => handleExportCsv(viewMode)}
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'bn' ? 'CSV এক্সপোর্ট' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purchase-entry')}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('purchase_entry')}</span>
          </button>
        </div>
      </div>

      {/* Primary Sub-Tab Switcher: Active Purchases vs Delete Purchase Archive */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
        <button
          type="button"
          onClick={() => setCurrentSubTab('active')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentSubTab === 'active'
              ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-xs border border-zinc-200/80 dark:border-zinc-800'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{language === 'bn' ? 'সক্রিয় ক্রয় চালান (Active Purchases)' : 'Active Purchase Bills'}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {purchaseInvoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSubTab('deleted')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentSubTab === 'deleted'
              ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs border border-rose-200 dark:border-rose-900/60 ring-2 ring-rose-400/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          <Trash2 className="w-4 h-4 text-rose-500" />
          <span>{language === 'bn' ? 'ডিলিট ক্রয় আর্কাইভ (Delete Purchase Archive)' : 'Delete Purchase Archive'}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {deletedPurchaseInvoices.length}
          </span>
        </button>
      </div>

      {currentSubTab === 'active' && (
        <div className="space-y-4">
          {/* 2. Sub-Tabs Bar: Bills vs Category vs Generic vs Brand vs Items */}
      <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-850 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setViewMode('bills')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            viewMode === 'bills'
              ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{language === 'bn' ? 'ক্রয় বিল তালিকা' : 'Bills List'}</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 font-mono">
            {filteredPurchases.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('category')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            viewMode === 'category'
              ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{language === 'bn' ? 'ক্যাটাগরি অনুযায়ী রিপোর্ট' : 'Category Report'}</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 font-mono">
            {categoryWiseReport.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('generic')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            viewMode === 'generic'
              ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{language === 'bn' ? 'জেনেরিক অনুযায়ী রিপোর্ট' : 'Generic Report'}</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 font-mono">
            {genericWiseReport.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('brand')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            viewMode === 'brand'
              ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{language === 'bn' ? 'ব্র্যান্ড / কোম্পানি রিপোর্ট' : 'Brand / Company Report'}</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 font-mono">
            {brandWiseReport.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('items')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            viewMode === 'items'
              ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>{language === 'bn' ? 'আইটেম ভিত্তিক রিপোর্ট' : 'Item Breakdown'}</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 font-mono">
            {itemWiseReport.length}
          </span>
        </button>
      </div>

      {/* 3. Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            {language === 'bn' ? 'মোট ক্রয় মূল্য:' : 'Total Purchases:'}
          </div>
          <div className="text-xl font-black text-zinc-900 dark:text-white font-mono mt-0.5">
            {formatCurrency(totalPurchaseSum)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1 font-mono">
            {filteredPurchases.length} {language === 'bn' ? 'টি চালান' : 'Invoices'}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="text-xs text-sky-600 dark:text-sky-400 font-medium">
            {language === 'bn' ? 'মোট ক্রয়কৃত পরিমাণ:' : 'Total Quantity Purchased:'}
          </div>
          <div className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono mt-0.5">
            {totalQuantityPurchased.toLocaleString()} <span className="text-xs font-normal">units</span>
          </div>
          <div className="text-[10px] text-sky-500/80 mt-1">
            {itemWiseReport.length} {language === 'bn' ? 'টি অনন্য আইটেম' : 'distinct products'}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {language === 'bn' ? 'পরিশোধ করা হয়েছে:' : 'Paid to Suppliers:'}
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            {formatCurrency(totalPaidSum)}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-1">
            {totalPurchaseSum > 0 ? `${((totalPaidSum / totalPurchaseSum) * 100).toFixed(1)}% cleared` : '0%'}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            {language === 'bn' ? 'বকেয়া পাওনা (Due):' : 'Pending Payables (Due):'}
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
            {formatCurrency(totalDueSum)}
          </div>
          <div className="text-[10px] text-rose-500/80 mt-1">
            {totalDueSum > 0 ? (language === 'bn' ? 'পরিশোধ বাকি' : 'Payable due') : (language === 'bn' ? 'কোনো বকেয়া নেই' : 'All clear')}
          </div>
        </div>
      </div>

      {/* 4. Date Period Filter Bar (দৈনিক, মাসিক, ডেট টু ডেট) */}
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
      <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
          
          {/* 1. Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
            </label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">{language === 'bn' ? 'সকল ক্যাটাগরি (All)' : 'All Categories'}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Generic Name Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'জেনেরিক গ্রুপ' : 'Generic Group'}
            </label>
            <select
              value={genericFilter}
              onChange={e => setGenericFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">{language === 'bn' ? 'সকল জেনেরিক (All)' : 'All Generics'}</option>
              {uniqueGenerics.map(gen => (
                <option key={gen} value={gen}>
                  {gen}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Brand / Manufacturer Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'ব্র্যান্ড / কোম্পানি' : 'Brand / Company'}
            </label>
            <select
              value={brandFilter}
              onChange={e => setBrandFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">{language === 'bn' ? 'সকল ব্র্যান্ড (All)' : 'All Brands/Companies'}</option>
              {uniqueBrands.map(br => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Supplier Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'সরবরাহকারী' : 'Supplier'}
            </label>
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">{language === 'bn' ? 'সকল সরবরাহকারী (All)' : 'All Suppliers'}</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Cashier / User Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'ক্যাশিয়ার / ইউজার' : 'Cashier / User'}
            </label>
            <select
              value={cashierFilter}
              onChange={e => setCashierFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">{language === 'bn' ? '👤 সকল ইউজার/ক্যাশিয়ার' : '👤 All Cashiers/Users'}</option>
              {creatorOptions.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.role ? `(${u.role})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Payment Status */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'বিল স্ট্যাটাস' : 'Status'}
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">{language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
              <option value="PAID">PAID (পরিশোধ)</option>
              <option value="PARTIAL">PARTIAL (আংশিক)</option>
              <option value="DUE">DUE (বকেয়া)</option>
            </select>
          </div>

          {/* 7. Keyword Search */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'অনুসন্ধান' : 'Search'}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={language === 'bn' ? 'বিল, সরবরাহকারী, ইউজার...' : 'Bill, supplier, user...'}
                className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Filter status row with clear button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
              >
                <X className="w-3 h-3" />
                <span>{language === 'bn' ? 'ফিল্টার মুছুন' : 'Clear Filters'}</span>
              </button>
            )}

            {cashierFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[11px] font-medium border border-blue-200 dark:border-blue-800">
                User: {creatorOptions.find(u => u.id === cashierFilter)?.name || cashierFilter}
              </span>
            )}

            {categoryFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-medium border border-indigo-200 dark:border-indigo-800">
                Cat: {categories.find(c => c.id === categoryFilter)?.name || categoryFilter}
              </span>
            )}

            {genericFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded text-[11px] font-medium border border-purple-200 dark:border-purple-800">
                Generic: {genericFilter}
              </span>
            )}

            {brandFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-[11px] font-medium border border-emerald-200 dark:border-emerald-800">
                Brand: {brandFilter}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-zinc-500 font-mono text-[11px]">
            {startDate && endDate && (
              <span className="text-sky-600 dark:text-sky-400 font-sans font-medium">
                {periodLabel || `${startDate} - ${endDate}`}
              </span>
            )}
            <span>
              {language === 'bn'
                ? `ফলাফল: ${viewMode === 'bills' ? filteredPurchases.length : viewMode === 'category' ? categoryWiseReport.length : viewMode === 'generic' ? genericWiseReport.length : viewMode === 'brand' ? brandWiseReport.length : itemWiseReport.length} টি রেকর্ড`
                : `Showing ${viewMode === 'bills' ? filteredPurchases.length : viewMode === 'category' ? categoryWiseReport.length : viewMode === 'generic' ? genericWiseReport.length : viewMode === 'brand' ? brandWiseReport.length : itemWiseReport.length} rows`}
            </span>
          </div>
        </div>
      </div>

      {/* 6. MAIN CONTENT DISPLAY (SUB-VIEWS) */}

      {/* ============================================================== */}
      {/* SUB-VIEW 1: BILLS LIST */}
      {/* ============================================================== */}
      {viewMode === 'bills' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Challan / Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'ফোন নম্বর' : 'Phone'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'তৈরি করেছেন (User)' : 'Created By'}</th>
                  <th className="py-3 px-4 text-center">Items & Breakdown</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-zinc-400">
                      {language === 'bn' ? 'কোনো ক্রয় বিল পাওয়া যায়নি।' : 'No purchase bills found matching current filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(pur => {
                    const totalQty = pur.items.reduce((s, i) => s + Number(i.quantity || 0), 0);
                    const creator = getCreatorInfo(pur);
                    return (
                      <tr key={pur.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                          {pur.billNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-500">
                          {pur.supplierInvoiceNo || '-'}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">{pur.date}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-white">{pur.supplierName}</div>
                        </td>
                        <td className="py-3 px-4 text-[10px] text-zinc-500 font-mono">
                          {pur.supplierPhone || '---'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
                              {creator.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-zinc-800 dark:text-zinc-200 text-xs truncate max-w-[120px]" title={creator.name}>
                                {creator.name}
                              </div>
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                                <ShieldCheck className="w-2.5 h-2.5 text-blue-500" />
                                <span>{creator.role}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {totalQty} <span className="text-[10px] font-normal text-zinc-500">({pur.items.length} skus)</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate max-w-[180px] mx-auto">
                            {pur.items.map(it => it.productName).join(', ')}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(pur.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                          {formatCurrency(pur.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {pur.dueAmount > 0 ? formatCurrency(pur.dueAmount) : '-'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <Badge status={pur.status} />
                            {purchaseReturns?.some(r => r.purchaseId === pur.id) && (
                              <Badge status="RETURNED" variant="rose" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handlePrint(pur)}
                              title="Print Purchase Bill"
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {pur.dueAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => onOpenPaymentOutModal(pur.supplierId)}
                                title="Pay Supplier Bill"
                                className="p-1.5 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasReturnPermission ? (
                              !purchaseReturns?.some(r => r.purchaseId === pur.id) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onOpenReturnModal) {
                                      onOpenReturnModal(pur);
                                    } else {
                                      setActiveTab('purchase-returns');
                                    }
                                  }}
                                  title="Return to Supplier"
                                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 rounded transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  title="Already Returned"
                                  className="p-1.5 text-slate-300 dark:text-slate-600 rounded cursor-not-allowed"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )
                            ) : (
                              <span
                                title={language === 'bn' ? 'রিটার্ন বাটন ব্যবহারের অনুমতি নেই' : 'Return Permission Required'}
                                className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed inline-flex"
                              >
                                <RotateCcw className="w-3.5 h-3.5 opacity-40" />
                              </span>
                            )}
                            {onEditInvoice && hasEditPermission && (
                              <button
                                type="button"
                                onClick={() => onEditInvoice(pur)}
                                title="Edit Invoice"
                                className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900 rounded transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasDeletePermission && (
                              <button
                                type="button"
                                onClick={() => setInvoiceToDelete(pur)}
                                title="Delete Invoice"
                                className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 rounded transition-colors cursor-pointer"
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
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 2: CATEGORY WISE PURCHASE REPORT */}
      {/* ============================================================== */}
      {viewMode === 'category' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>{language === 'bn' ? 'ক্যাটাগরি ভিত্তিক ক্রয় রিপোর্ট টেবিল' : 'Category-Wise Purchase Breakdown'}</span>
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              {categoryWiseReport.length} {language === 'bn' ? 'টি ক্যাটাগরি' : 'categories'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-500 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">{language === 'bn' ? 'ক্যাটাগরি নাম' : 'Category Name'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'অনন্য প্রোডাক্ট' : 'Products'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'চালান সংখ্যা' : 'Bills'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'ক্রয়কৃত পরিমাণ' : 'Quantity Purchased'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'গড় ক্রয় দর' : 'Avg Rate'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'মোট ক্রয় মূল্য' : 'Total Purchase (Tk)'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'শেয়ার (%)' : 'Share (%)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {categoryWiseReport.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      {language === 'bn' ? 'কোনো ক্যাটাগরি ভিত্তিক রেকর্ড পাওয়া যায়নি।' : 'No category purchase records found.'}
                    </td>
                  </tr>
                ) : (
                  categoryWiseReport.map(cat => {
                    const isExpanded = expandedRowKey === `cat_${cat.categoryId}`;
                    return (
                      <React.Fragment key={cat.categoryId}>
                        <tr
                          onClick={() => setExpandedRowKey(isExpanded ? null : `cat_${cat.categoryId}`)}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 text-center">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                                <Layers className="w-3.5 h-3.5" />
                              </span>
                              <span>{cat.categoryName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-medium">
                            {cat.productCount} skus
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-zinc-500">
                            {cat.billCount} bills
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-zinc-900 dark:text-white">
                            {cat.purchasedQty.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400">
                            {formatCurrency(cat.avgRate)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {formatCurrency(cat.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-16 bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full"
                                  style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                                {cat.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Drilldown of Items under this Category */}
                        {isExpanded && (
                          <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                            <td colSpan={8} className="p-4">
                              <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-indigo-100 dark:border-indigo-900 shadow-2xs space-y-2">
                                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                                  {cat.categoryName} - {language === 'bn' ? 'ক্রয়কৃত আইটেম তালিকা' : 'Items Purchased'} ({cat.itemsList.length} entries):
                                </div>
                                <div className="max-h-56 overflow-y-auto">
                                  <table className="w-full text-left text-[11px]">
                                    <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold">
                                      <tr>
                                        <th className="p-2">Date</th>
                                        <th className="p-2">Bill #</th>
                                        <th className="p-2">Product</th>
                                        <th className="p-2">Generic</th>
                                        <th className="p-2">Brand</th>
                                        <th className="p-2">Supplier</th>
                                        <th className="p-2 text-center">Qty</th>
                                        <th className="p-2 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                      {cat.itemsList.map((it, idx) => (
                                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                          <td className="p-2 font-mono text-zinc-500">{it.date}</td>
                                          <td className="p-2 font-mono font-bold text-zinc-800 dark:text-zinc-200">{it.billNumber}</td>
                                          <td className="p-2 font-semibold text-zinc-900 dark:text-white">{it.productName}</td>
                                          <td className="p-2 text-zinc-500">{it.generic || '-'}</td>
                                          <td className="p-2 text-zinc-500">{it.brand || '-'}</td>
                                          <td className="p-2 text-zinc-600 dark:text-zinc-300">{it.supplierName}</td>
                                          <td className="p-2 text-center font-mono font-bold">{it.quantity} {it.unit}</td>
                                          <td className="p-2 text-right font-mono font-bold text-indigo-600">{formatCurrency(it.total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 3: GENERIC WISE PURCHASE REPORT */}
      {/* ============================================================== */}
      {viewMode === 'generic' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-purple-600" />
              <span>{language === 'bn' ? 'জেনেরিক অনুযায়ী ক্রয় অ্যানালিটিক্স' : 'Generic-Wise Purchase Analytics'}</span>
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              {genericWiseReport.length} {language === 'bn' ? 'টি জেনেরিক গ্রুপ' : 'generic groups'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-500 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">{language === 'bn' ? 'জেনেরিক নাম' : 'Generic Group Name'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'প্রোডাক্ট' : 'Products'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'সরবরাহকারী' : 'Suppliers'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'ক্রয়কৃত পরিমাণ' : 'Quantity Purchased'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'গড় দর' : 'Avg Rate'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'মোট ক্রয় মূল্য' : 'Total Purchase (Tk)'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'শেয়ার (%)' : 'Share (%)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {genericWiseReport.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      {language === 'bn' ? 'কোনো জেনেরিক ভিত্তিক ক্রয় রেকর্ড পাওয়া যায়নি।' : 'No generic purchase records found.'}
                    </td>
                  </tr>
                ) : (
                  genericWiseReport.map(gen => {
                    const isExpanded = expandedRowKey === `gen_${gen.genericName}`;
                    return (
                      <React.Fragment key={gen.genericName}>
                        <tr
                          onClick={() => setExpandedRowKey(isExpanded ? null : `gen_${gen.genericName}`)}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 text-center">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-purple-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                                <Boxes className="w-3.5 h-3.5" />
                              </span>
                              <span>{gen.genericName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-medium">
                            {gen.productCount} skus
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-zinc-500">
                            {gen.supplierCount} parties
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-zinc-900 dark:text-white">
                            {gen.purchasedQty.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400">
                            {formatCurrency(gen.avgRate)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-purple-600 dark:text-purple-400 whitespace-nowrap">
                            {formatCurrency(gen.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-16 bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-purple-600 h-full rounded-full"
                                  style={{ width: `${Math.min(gen.percentage, 100)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                                {gen.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Drilldown items under this Generic */}
                        {isExpanded && (
                          <tr className="bg-purple-50/40 dark:bg-purple-950/20">
                            <td colSpan={8} className="p-4">
                              <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-purple-100 dark:border-purple-900 shadow-2xs space-y-2">
                                <div className="text-xs font-bold text-purple-900 dark:text-purple-200">
                                  {gen.genericName} - {language === 'bn' ? 'ক্রয়কৃত আইটেম ও চালান' : 'Purchased Products'} ({gen.itemsList.length} entries):
                                </div>
                                <div className="max-h-56 overflow-y-auto">
                                  <table className="w-full text-left text-[11px]">
                                    <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold">
                                      <tr>
                                        <th className="p-2">Date</th>
                                        <th className="p-2">Bill #</th>
                                        <th className="p-2">Product</th>
                                        <th className="p-2">Brand / Company</th>
                                        <th className="p-2">Category</th>
                                        <th className="p-2">Supplier</th>
                                        <th className="p-2 text-center">Qty</th>
                                        <th className="p-2 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                      {gen.itemsList.map((it, idx) => (
                                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                          <td className="p-2 font-mono text-zinc-500">{it.date}</td>
                                          <td className="p-2 font-mono font-bold text-zinc-800 dark:text-zinc-200">{it.billNumber}</td>
                                          <td className="p-2 font-semibold text-zinc-900 dark:text-white">{it.productName}</td>
                                          <td className="p-2 text-zinc-500">{it.brand || '-'}</td>
                                          <td className="p-2 text-zinc-500">{it.categoryName || '-'}</td>
                                          <td className="p-2 text-zinc-600 dark:text-zinc-300">{it.supplierName}</td>
                                          <td className="p-2 text-center font-mono font-bold">{it.quantity} {it.unit}</td>
                                          <td className="p-2 text-right font-mono font-bold text-purple-600">{formatCurrency(it.total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 4: BRAND / MANUFACTURER WISE PURCHASE REPORT */}
      {/* ============================================================== */}
      {viewMode === 'brand' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>{language === 'bn' ? 'ব্র্যান্ড / কোম্পানি ভিত্তিক ক্রয় অ্যানালিটিক্স' : 'Brand / Company Wise Purchase Analytics'}</span>
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              {brandWiseReport.length} {language === 'bn' ? 'টি ব্র্যান্ড' : 'brands'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-500 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">{language === 'bn' ? 'ব্র্যান্ড / কোম্পানি নাম' : 'Brand / Manufacturer'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'প্রোডাক্ট' : 'Products'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'চালান সংখ্যা' : 'Bills'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'ক্রয়কৃত পরিমাণ' : 'Quantity Purchased'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'গড় দর' : 'Avg Rate'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'মোট ক্রয় মূল্য' : 'Total Purchase (Tk)'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'শেয়ার (%)' : 'Share (%)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {brandWiseReport.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      {language === 'bn' ? 'কোনো ব্র্যান্ড ভিত্তিক রেকর্ড পাওয়া যায়নি।' : 'No brand purchase records found.'}
                    </td>
                  </tr>
                ) : (
                  brandWiseReport.map(br => {
                    const isExpanded = expandedRowKey === `br_${br.brandName}`;
                    return (
                      <React.Fragment key={br.brandName}>
                        <tr
                          onClick={() => setExpandedRowKey(isExpanded ? null : `br_${br.brandName}`)}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 text-center">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                <Building2 className="w-3.5 h-3.5" />
                              </span>
                              <span>{br.brandName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-medium">
                            {br.productCount} skus
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-zinc-500">
                            {br.billCount} bills
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-zinc-900 dark:text-white">
                            {br.purchasedQty.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400">
                            {formatCurrency(br.avgRate)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatCurrency(br.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-16 bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full"
                                  style={{ width: `${Math.min(br.percentage, 100)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                                {br.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Drilldown items under this Brand */}
                        {isExpanded && (
                          <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                            <td colSpan={8} className="p-4">
                              <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900 shadow-2xs space-y-2">
                                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                  {br.brandName} - {language === 'bn' ? 'ক্রয়কৃত আইটেমসমূহ' : 'Products Breakdown'} ({br.itemsList.length} entries):
                                </div>
                                <div className="max-h-56 overflow-y-auto">
                                  <table className="w-full text-left text-[11px]">
                                    <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold">
                                      <tr>
                                        <th className="p-2">Date</th>
                                        <th className="p-2">Bill #</th>
                                        <th className="p-2">Product</th>
                                        <th className="p-2">Category</th>
                                        <th className="p-2">Generic</th>
                                        <th className="p-2">Supplier</th>
                                        <th className="p-2 text-center">Qty</th>
                                        <th className="p-2 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                      {br.itemsList.map((it, idx) => (
                                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                          <td className="p-2 font-mono text-zinc-500">{it.date}</td>
                                          <td className="p-2 font-mono font-bold text-zinc-800 dark:text-zinc-200">{it.billNumber}</td>
                                          <td className="p-2 font-semibold text-zinc-900 dark:text-white">{it.productName}</td>
                                          <td className="p-2 text-zinc-500">{it.categoryName || '-'}</td>
                                          <td className="p-2 text-zinc-500">{it.generic || '-'}</td>
                                          <td className="p-2 text-zinc-600 dark:text-zinc-300">{it.supplierName}</td>
                                          <td className="p-2 text-center font-mono font-bold">{it.quantity} {it.unit}</td>
                                          <td className="p-2 text-right font-mono font-bold text-emerald-600">{formatCurrency(it.total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 5: ITEM WISE BREAKDOWN REPORT */}
      {/* ============================================================== */}
      {viewMode === 'items' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-600" />
              <span>{language === 'bn' ? 'আইটেম ভিত্তিক সামগ্রিক ক্রয় রিপোর্ট' : 'Item-Wise Detailed Purchase Report'}</span>
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              {itemWiseReport.length} {language === 'bn' ? 'টি আইটেম' : 'products'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-500 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'প্রোডাক্ট নাম' : 'Product Name'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'জেনেরিক' : 'Generic'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'কোম্পানি / ব্র্যান্ড' : 'Brand / Company'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'চালান সংখ্যা' : 'Bills'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'ক্রয়কৃত পরিমাণ' : 'Quantity'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'গড় ক্রয় দর' : 'Avg Rate'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'সর্বমোট ক্রয়' : 'Total Purchase (Tk)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {itemWiseReport.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-400">
                      {language === 'bn' ? 'কোনো আইটেম ক্রয় রেকর্ড পাওয়া যায়নি।' : 'No item purchase records found.'}
                    </td>
                  </tr>
                ) : (
                  itemWiseReport.map((it, idx) => (
                    <tr key={it.productId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 text-zinc-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{it.productName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium text-[11px]">
                          {it.categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                        {it.generic !== '-' ? (
                          <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium text-[11px]">
                            {it.generic}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 font-medium">
                        {it.brand !== '-' ? it.brand : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-zinc-500">
                        {it.billCount} bills
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-zinc-900 dark:text-white">
                        {it.purchasedQty} <span className="text-[10px] font-normal text-zinc-400">{it.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(it.avgRate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        {formatCurrency(it.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )}

      {currentSubTab === 'deleted' && (
        <div className="space-y-4">
          {/* Deleted Archive Header & Stats / Actions */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>{language === 'bn' ? 'ডিলিট ক্রয় চালান আর্কাইভ' : 'Delete Purchase Archive'}</span>
                <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs rounded-full font-mono">
                  {filteredDeletedPurchases.length} {language === 'bn' ? 'টি' : 'records'}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {language === 'bn'
                  ? 'ডিলিটকৃত সকল ক্রয় চালান এবং স্টক/ওয়ালেট রিভার্সাল ট্রেইল এখানে সুরক্ষিত আছে।'
                  : 'All deleted purchase bills, audit logs, and stock/wallet reversal history are archived here securely.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintDeletedList}
                disabled={deletedPurchaseInvoices.length === 0}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>{language === 'bn' ? 'পিডিএফ প্রিন্ট / এক্সপোর্ট' : 'Print / Export PDF'}</span>
              </button>

              {hasDeletePermission && deletedPurchaseInvoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllModal(true)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>{language === 'bn' ? 'সব স্থায়ীভাবে মুছুন' : 'Clear All Archive'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters & Search for Deleted Purchases */}
          <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={deletedSearch}
                onChange={(e) => setDeletedSearch(e.target.value)}
                placeholder={language === 'bn' ? 'বিল নম্বর, সাপ্লায়ার, ডিলিটকারী ইউজার বা কারণ দিয়ে খুঁজুন...' : 'Search bill #, supplier, deleted by, reason...'}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg text-xs border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="w-full sm:w-48">
              <select
                value={deletedSupplierFilter}
                onChange={(e) => setDeletedSupplierFilter(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg text-xs border border-zinc-200 dark:border-zinc-700"
              >
                <option value="ALL">{language === 'bn' ? 'সকল সাপ্লায়ার' : 'All Suppliers'}</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-48">
              <select
                value={deletedUserFilter}
                onChange={(e) => setDeletedUserFilter(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg text-xs border border-zinc-200 dark:border-zinc-700"
              >
                <option value="ALL">{language === 'bn' ? 'ডিলিটকারী সকল ইউজার' : 'All Deleted By Users'}</option>
                {deletedByOptions.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role || 'USER'})</option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto">
              <DatePeriodFilter
                startDate={deletedStartDate}
                endDate={deletedEndDate}
                periodLabel={deletedPeriodLabel}
                onDateChange={(start, end, label) => {
                  setDeletedStartDate(start);
                  setDeletedEndDate(end);
                  setDeletedPeriodLabel(label);
                }}
              />
            </div>

            {(deletedSearch || deletedSupplierFilter !== 'ALL' || deletedUserFilter !== 'ALL' || deletedStartDate) && (
              <button
                type="button"
                onClick={() => {
                  setDeletedSearch('');
                  setDeletedSupplierFilter('ALL');
                  setDeletedUserFilter('ALL');
                  setDeletedStartDate('');
                  setDeletedEndDate('');
                  setDeletedPeriodLabel('');
                }}
                className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {language === 'bn' ? 'ফিল্টার মুছুন' : 'Reset'}
              </button>
            )}
          </div>

          {/* Deleted Purchases Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-bold">
                    <th className="py-3 px-4">{language === 'bn' ? 'বিল ও তারিখ' : 'Bill & Date'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'সাপ্লায়ার তথ্য' : 'Supplier Details'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'পরিমাণ (৳)' : 'Grand Total'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'ডিলিটকারী ইউজার ও কারণ' : 'Deleted By & Reason'}</th>
                    <th className="py-3 px-4 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {filteredDeletedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Trash2 className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                          <p className="font-semibold text-sm">
                            {language === 'bn' ? 'কোনো ডিলিট হওয়া ক্রয় চালান রেকর্ড নেই' : 'No deleted purchase records found.'}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {language === 'bn'
                              ? 'ক্রয় তালিকা থেকে কোনো বিল ডিলিট করলে তা এখানে সংরক্ষিত হবে।'
                              : 'Any deleted purchase bill is automatically archived here with audit trail.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDeletedPurchases.map(del => (
                      <tr key={del.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-850/50 transition-colors">
                        <td className="py-3 px-4 align-top">
                          <div className="font-bold text-rose-600 dark:text-rose-400 font-mono">#{del.billNumber}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">{del.date}</div>
                          {del.supplierInvoiceNo && (
                            <div className="text-[10px] text-zinc-400">Ref: {del.supplierInvoiceNo}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top">
                          <div className="font-bold text-zinc-900 dark:text-white">{del.supplierName}</div>
                          <div className="text-zinc-500 font-mono">{del.supplierPhone || 'N/A'}</div>
                          <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                            {del.items.length} {language === 'bn' ? 'টি পণ্য' : 'items'}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top font-mono font-bold text-zinc-900 dark:text-white">
                          <div>{formatCurrency(del.grandTotal)}</div>
                          <div className="text-[10px] font-normal text-emerald-600">Paid: {formatCurrency(del.paidAmount)}</div>
                        </td>
                        <td className="py-3 px-4 align-top max-w-xs">
                          <div className="flex items-center gap-1.5 text-zinc-900 dark:text-white font-semibold mb-1">
                            <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-bold">
                              {(del.deletedBy?.fullName || del.deletedBy?.username || 'U').slice(0, 2).toUpperCase()}
                            </span>
                            <span>{del.deletedBy?.fullName || del.deletedBy?.username || 'Unknown User'}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
                              {del.deletedBy?.role || 'USER'}
                            </span>
                          </div>
                          <div className="text-xs text-rose-700 dark:text-rose-300 font-medium bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded border border-rose-200/60 dark:border-rose-900/40 mb-1">
                            "{del.deletionReason}"
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            Deleted at: {del.deletedAt}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedDeletedPurchase(del)}
                              title={language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg cursor-pointer transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePrintSingleDeleted(del)}
                              title={language === 'bn' ? 'পিডিএফ প্রিন্ট / এক্সপোর্ট' : 'Print / Export PDF'}
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-emerald-600 rounded-lg cursor-pointer transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {hasDeletePermission && (
                              <button
                                type="button"
                                onClick={() => setInvoiceToRestore(del)}
                                title={language === 'bn' ? 'পুনরুদ্ধার করুন (Restore)' : 'Restore Bill'}
                                className="p-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-600 dark:text-sky-400 rounded-lg cursor-pointer transition-colors border border-sky-200 dark:border-sky-800"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}

                            {hasDeletePermission && (
                              <button
                                type="button"
                                onClick={() => setInvoiceToPermDelete(del)}
                                title={language === 'bn' ? 'স্থায়ীভাবে মুছুন' : 'Permanently Delete'}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer transition-colors border border-rose-200 dark:border-rose-800"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* Delete Confirmation Modal with Reason Selection */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span>{language === 'bn' ? 'ক্রয় চালান ডিলিট ও আর্কাইভ?' : 'Delete & Archive Purchase Invoice?'}</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              {language === 'bn'
                ? `চালান #${invoiceToDelete.billNumber} (${invoiceToDelete.supplierName}) ডিলিট করলে স্টক এবং ওয়ালেট ব্যালেন্স পূর্বাবস্থায় ফিরে যাবে এবং এটি 'Delete Purchase' আর্কাইভে জমা হবে।`
                : `Deleting bill #${invoiceToDelete.billNumber} will revert stock/wallet balances and archive it with full audit trail.`}
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {language === 'bn' ? 'ডিলিট করার কারণ নির্বাচন করুন:' : 'Select Deletion Reason:'}
                </label>
                <select
                  value={deleteReasonOption}
                  onChange={(e) => setDeleteReasonOption(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg text-xs border border-zinc-200 dark:border-zinc-700"
                >
                  <option value="MISTAKE_ENTRY">{language === 'bn' ? 'ভুল তথ্য এন্ট্রি / কারেকশন' : 'Mistake / Wrong Entry'}</option>
                  <option value="SUPPLIER_RETURN_ERROR">{language === 'bn' ? 'সাপ্লায়ার রিটার্ন বা ভুল পণ্য' : 'Supplier Return / Incorrect Items'}</option>
                  <option value="PRICE_DISCREPANCY">{language === 'bn' ? 'ক্রয় মূল্যে গরমিল / ডিসক্রিপেন্সি' : 'Price Discrepancy'}</option>
                  <option value="CANCELLED_ORDER">{language === 'bn' ? 'ক্রয় অর্ডার বাতিল করা হয়েছে' : 'Purchase Order Cancelled'}</option>
                  <option value="OTHER">{language === 'bn' ? 'অন্যান্য কারণ (নিচে লিখুন)' : 'Other Reason (Specify below)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {language === 'bn' ? 'বিস্তারিত নোট বা কারণ (ঐচ্ছিক):' : 'Custom Reason / Audit Note (Optional):'}
                </label>
                <textarea
                  value={deleteCustomReason}
                  onChange={(e) => setDeleteCustomReason(e.target.value)}
                  placeholder={language === 'bn' ? 'কেন ডিলিট করা হচ্ছে তার বিবরণ...' : 'Enter specific reason for deletion...'}
                  rows={2}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg text-xs border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hasDeletePermission && currentUser?.role !== 'ADMIN') {
                    showToast(language === 'bn' ? 'আপনার এই চালান ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete purchase invoices', 'error');
                    setInvoiceToDelete(null);
                    return;
                  }
                  handleConfirmDelete();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-md"
              >
                {language === 'bn' ? 'নিশ্চিত ডিলিট করুন' : 'Confirm & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {invoiceToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-base font-bold text-sky-600 dark:text-sky-400 mb-2 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              <span>{language === 'bn' ? 'ক্রয় চালান পুনরুদ্ধার?' : 'Restore Purchase Bill?'}</span>
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6">
              {language === 'bn'
                ? `আপনি কি চালান #${invoiceToRestore.billNumber} (${invoiceToRestore.supplierName}) সক্রিয় ক্রয় তালিকায় পুনরায় ফিরিয়ে আনতে চান?`
                : `Are you sure you want to restore purchase bill #${invoiceToRestore.billNumber} back to active inventory?`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setInvoiceToRestore(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {language === 'bn' ? 'পুনরুদ্ধার করুন' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal */}
      {invoiceToPermDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span>{language === 'bn' ? 'স্থায়ীভাবে মুছে ফেলুন?' : 'Permanently Delete Archive?'}</span>
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6">
              {language === 'bn'
                ? `চালান #${invoiceToPermDelete.billNumber}-এর আর্কাইভ রেকর্ড চিরতরে মুছে ফেলা হবে। এটি আর পুনরুদ্ধার করা যাবে না।`
                : `Permanently delete archived bill #${invoiceToPermDelete.billNumber}? This action cannot be undone.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setInvoiceToPermDelete(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hasDeletePermission) {
                    showToast(language === 'bn' ? 'আর্কাইভ রেকর্ড স্থায়ীভাবে মুছে ফেলার অনুমতি নেই' : 'Permission required to permanently delete', 'error');
                    setInvoiceToPermDelete(null);
                    return;
                  }
                  permanentlyDeleteArchivedPurchase(invoiceToPermDelete.id);
                  showToast(language === 'bn' ? 'আর্কাইভ রেকর্ড স্থায়ীভাবে মুছে ফেলা হয়েছে' : 'Record permanently deleted', 'success');
                  setInvoiceToPermDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {language === 'bn' ? 'স্থায়ী ডিলিট' : 'Permanent Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Archive Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span>{language === 'bn' ? 'সমস্ত আর্কাইভ সাফ করুন?' : 'Clear All Deleted Purchases?'}</span>
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6">
              {language === 'bn'
                ? `আপনি কি নিশ্চিত যে সমস্ত ${deletedPurchaseInvoices.length}টি ডিলিট হওয়া ক্রয়ের রেকর্ড চিরতরে মুছে ফেলতে চান?`
                : `Are you sure you want to clear all ${deletedPurchaseInvoices.length} archived deleted purchases?`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hasDeletePermission) {
                    showToast(language === 'bn' ? 'আর্কাইভ সাফ করার অনুমতি নেই' : 'Permission required to clear all archive', 'error');
                    setShowClearAllModal(false);
                    return;
                  }
                  clearAllDeletedPurchases();
                  showToast(language === 'bn' ? 'সমস্ত আর্কাইভ সাফ করা হয়েছে' : 'All archived purchases cleared', 'success');
                  setShowClearAllModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {language === 'bn' ? 'সব মুছুন' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Deleted Purchase Snapshot Details Modal */}
      {selectedDeletedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>{language === 'bn' ? 'ডিলিট ক্রয় চালান বিবরণ' : 'Deleted Purchase Bill Details'}</span>
                  <span className="text-rose-600 font-mono">#{selectedDeletedPurchase.billNumber}</span>
                </h3>
                <p className="text-xs text-zinc-500">Deleted at: {selectedDeletedPurchase.deletedAt}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeletedPurchase(null)}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                <div className="font-bold text-rose-700 dark:text-rose-300 mb-1">
                  {language === 'bn' ? 'ডিলিট তথ্য ও কারণ:' : 'Deletion Audit & Reason:'}
                </div>
                <p className="text-zinc-800 dark:text-zinc-200 mb-2 font-medium">"{selectedDeletedPurchase.deletionReason}"</p>
                <div className="text-zinc-500 flex flex-wrap gap-4 font-mono text-[11px]">
                  <span>Deleted By: <strong>{selectedDeletedPurchase.deletedBy?.fullName || selectedDeletedPurchase.deletedBy?.username}</strong> ({selectedDeletedPurchase.deletedBy?.role})</span>
                  <span>Original Date: {selectedDeletedPurchase.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-zinc-50 dark:bg-zinc-850 p-3 rounded-xl">
                <div>
                  <span className="text-zinc-400 block">{language === 'bn' ? 'সাপ্লায়ার' : 'Supplier'}</span>
                  <strong className="text-zinc-900 dark:text-white">{selectedDeletedPurchase.supplierName}</strong>
                  <div className="text-zinc-500 font-mono">{selectedDeletedPurchase.supplierPhone || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-zinc-400 block">{language === 'bn' ? 'ওয়ালেট' : 'Wallet'}</span>
                  <strong className="text-zinc-900 dark:text-white">{selectedDeletedPurchase.walletName || 'Cash / Default'}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">{language === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'}</span>
                  <strong className="text-zinc-900 dark:text-white">{selectedDeletedPurchase.paymentMethod}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-zinc-900 dark:text-white mb-2">{language === 'bn' ? 'পণ্য তালিকা (Items Snapshot):' : 'Archived Items Snapshot:'}</h4>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold">
                        <th className="py-2.5 px-3">{language === 'bn' ? 'পণ্যের নাম' : 'Product Name'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                        <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'ক্রয় মূল্য' : 'Purchase Rate'}</th>
                        <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'মোট' : 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {selectedDeletedPurchase.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-zinc-900 dark:text-white">{it.productName}</td>
                          <td className="py-2 px-3 text-center font-mono">{it.quantity} {it.unit}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatCurrency(it.purchasePrice)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 font-mono pt-2 border-t border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
                <div>Subtotal: {formatCurrency(selectedDeletedPurchase.subtotal)}</div>
                {selectedDeletedPurchase.discount > 0 && <div>Discount: -{formatCurrency(selectedDeletedPurchase.discount)}</div>}
                <div className="text-sm font-black text-sky-600 dark:text-sky-400">Grand Total: {formatCurrency(selectedDeletedPurchase.grandTotal)}</div>
                <div className="text-xs text-emerald-600">Paid: {formatCurrency(selectedDeletedPurchase.paidAmount)}</div>
                {selectedDeletedPurchase.dueAmount > 0 && <div className="text-xs text-rose-600">Due: {formatCurrency(selectedDeletedPurchase.dueAmount)}</div>}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handlePrintSingleDeleted(selectedDeletedPurchase)}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>{language === 'bn' ? 'পিডিএফ প্রিন্ট / এক্সপোর্ট' : 'Print / Export PDF'}</span>
              </button>

              {(hasDeletePermission || currentUser?.role === 'ADMIN') && (
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceToRestore(selectedDeletedPurchase);
                  }}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{language === 'bn' ? 'পুনরুদ্ধার করুন' : 'Restore Bill'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
