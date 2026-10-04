import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Product, CartItem, PaymentMethod, UnitType, InstallmentFrequency, InstallmentSchedule, Quotation } from '../../types';
import { CameraBarcodeScannerModal } from '../common/CameraBarcodeScannerModal';
import confetti from 'canvas-confetti';
import { isExpiredDate } from '../../utils/dateUtils';
import {
  Search,
  Barcode,
  Camera,
  Trash2,
  Plus,
  UserPlus,
  Info,
  Calendar,
  CalendarCheck,
  Percent,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Calculator,
  Image as ImageIcon,
  Check,
  LayoutGrid,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  Sparkles,
  Pause,
  ClipboardList,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

interface PosSaleViewProps {
  onOpenNewCustomerModal: () => void;
}

interface SaleRowItem {
  id: string;
  productId: string;
  name: string;
  nameBn?: string;
  barcode: string;
  unit: UnitType;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'flat' | 'percentage';
  taxPercent: number;
  stock: number;
  total: number;
  batchId?: string;
  batchNumber?: string;
  expDate?: string;
}

interface SplitPaymentRow {
  id: string;
  method: PaymentMethod;
  walletId: string;
  amount: number;
}

export const PosSaleView: React.FC<PosSaleViewProps> = ({ onOpenNewCustomerModal }) => {
  const {
    language,
    products,
    categories,
    parties,
    wallets,
    companySettings,
    formatCurrency,
    getNextSaleInvoiceNumber,
    createSaleInvoice,
    createInstallmentScheme,
    openPrintModal,
    showToast,
    smsConfig,
    quotations,
    saleInvoices,
  } = useApp();
  const { t } = useTranslation(language);

  // View Mode: 'invoice' (Screenshot Design) or 'touch-pos' (Grid mode)
  const [viewMode, setViewMode] = useState<'invoice' | 'touch-pos'>('invoice');

  // Top Controls: Cash vs Credit vs Installment Toggle
  const [saleMode, setSaleMode] = useState<'CASH' | 'CREDIT' | 'INSTALLMENT'>('CASH');

  // Master Hold Bills state
  const [heldBills, setHeldBills] = useState<{
    id: string;
    timestamp: number;
    customerName: string;
    customerId: string;
    saleMode: 'CASH' | 'CREDIT' | 'INSTALLMENT';
    items: SaleRowItem[];
    itemCount: number;
    subtotal: number;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('dokanpro_pos_held_bills');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isHeldBillsModalOpen, setIsHeldBillsModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('dokanpro_pos_held_bills', JSON.stringify(heldBills));
    } catch (e) {
      console.error(e);
    }
  }, [heldBills]);

  // Party Selection
  const [searchPartyQuery, setSearchPartyQuery] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');

  // Invoice Meta
  const [invoiceNo, setInvoiceNo] = useState<string>(() => {
    return getNextSaleInvoiceNumber ? getNextSaleInvoiceNumber() : 'INV-2026-0001';
  });

  // Real-time duplicate check for manual invoice number entry
  const trimmedInvoiceNo = invoiceNo.trim();
  const duplicateInvoice = useMemo(() => {
    if (!trimmedInvoiceNo) return null;
    return (
      saleInvoices.find(
        s => s.invoiceNumber && s.invoiceNumber.trim().toLowerCase() === trimmedInvoiceNo.toLowerCase()
      ) || null
    );
  }, [trimmedInvoiceNo, saleInvoices]);
  
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Table Rows for items
  const [items, setItems] = useState<SaleRowItem[]>([
    {
      id: 'row-1',
      productId: '',
      name: '',
      barcode: '',
      unit: 'Pcs',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 'flat',
      taxPercent: 0,
      stock: 0,
      total: 0,
    },
  ]);

  // Autocomplete state for item row
  const [activeItemRowSearch, setActiveItemRowSearch] = useState<string | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Top Quick Item Search Bar State
  const [topProductSearchQuery, setTopProductSearchQuery] = useState('');
  const [showTopProductDropdown, setShowTopProductDropdown] = useState(false);
  const [selectedTopCategory, setSelectedTopCategory] = useState<string>('ALL');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('ALL');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Payment splits
  const [paymentSplits, setPaymentSplits] = useState<SplitPaymentRow[]>([
    {
      id: 'pay-1',
      method: 'CASH',
      walletId: wallets[0]?.id || 'w-cash',
      amount: 0,
    },
  ]);

  // Delivery / Net / Description / Attachment / SMS
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [sendDueSms, setSendDueSms] = useState<boolean>(smsConfig.enabled && smsConfig.autoSendOnSale);
  const [description, setDescription] = useState<string>('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Installment & EMI State
  const [emiDownPayment, setEmiDownPayment] = useState<number>(0);
  const [emiTotalInstallments, setEmiTotalInstallments] = useState<number>(6);
  const [emiFrequency, setEmiFrequency] = useState<InstallmentFrequency>('MONTHLY');
  const [emiInterestRate, setEmiInterestRate] = useState<number>(0);
  const [emiStartDate, setEmiStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [emiDownPaymentWalletId, setEmiDownPaymentWalletId] = useState<string>(wallets[0]?.id || 'w-cash');
  const [emiGuarantorName, setEmiGuarantorName] = useState<string>('');
  const [emiGuarantorPhone, setEmiGuarantorPhone] = useState<string>('');
  const [emiGuarantorNid, setEmiGuarantorNid] = useState<string>('');
  const [showEmiSchedulePreview, setShowEmiSchedulePreview] = useState<boolean>(false);
  const [showGuarantorFields, setShowGuarantorFields] = useState<boolean>(false);

  // Barcode search modal / trigger
  const barcodeScanRef = useRef<HTMLInputElement>(null);

  // Helper for Expired Product Validation & Batch Stock Analysis
  const todayStr = new Date().toISOString().split('T')[0];

  const getProductBatchStockSummary = (prod?: Product | null) => {
    if (!prod) return { validStock: 0, expiredStock: 0, hasBatches: false };
    if (!prod.batches || prod.batches.length === 0) {
      const isExp = isExpiredDate(prod.expDate);
      return {
        validStock: isExp ? 0 : Number(prod.stock || 0),
        expiredStock: isExp ? Number(prod.stock || 0) : 0,
        hasBatches: false,
      };
    }
    const active = prod.batches.filter(b => (b.stock || 0) > 0);
    const validStock = active.filter(b => !isExpiredDate(b.expDate)).reduce((s, b) => s + Number(b.stock || 0), 0);
    const expiredStock = active.filter(b => isExpiredDate(b.expDate)).reduce((s, b) => s + Number(b.stock || 0), 0);
    return { validStock, expiredStock, hasBatches: true };
  };

  const isProductExpired = (prod?: Product | null) => {
    if (!prod) return false;
    if (prod.batches && prod.batches.length > 0) {
      const activeBatches = prod.batches.filter(b => (b.stock || 0) > 0);
      if (activeBatches.length > 0) {
        // Product can be sold if there is at least one active batch not expired
        const hasValidBatch = activeBatches.some(b => !isExpiredDate(b.expDate));
        return !hasValidBatch;
      }
    }
    return isExpiredDate(prod.expDate);
  };

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'walk-in') {
      return {
        id: 'walk-in',
        name: language === 'bn' ? 'নগদ / সাধারণ কাস্টমার' : 'Walk-in / Cash Customer',
        phone: '',
        currentBalance: 0,
        address: '',
      };
    }
    return parties.find(p => p.id === selectedCustomerId);
  }, [selectedCustomerId, parties, language]);

  // Master Hold Bills Handlers
  const handleHoldCurrentBill = () => {
    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      showToast(language === 'bn' ? 'স্থগিত করার জন্য কার্টে কোনো পণ্য নেই।' : 'No items in cart to hold.', 'warning');
      return;
    }
    const newHeld = {
      id: `held-${Date.now()}`,
      timestamp: Date.now(),
      customerName: selectedCustomer?.name || (language === 'bn' ? 'নগদ কাস্টমার' : 'Walk-in Customer'),
      customerId: selectedCustomerId,
      saleMode,
      items: JSON.parse(JSON.stringify(items)),
      itemCount: validItems.length,
      subtotal: validItems.reduce((s, i) => s + i.total, 0),
    };
    setHeldBills(prev => [newHeld, ...prev]);
    // Reset cart
    setItems([{
      id: `row-${Date.now()}`,
      productId: '',
      name: '',
      barcode: '',
      unit: 'Pcs',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 'flat',
      taxPercent: 0,
      stock: 0,
      total: 0,
    }]);
    setSelectedCustomerId('walk-in');
    showToast(language === 'bn' ? 'বিল সফলভাবে সাময়িক স্থগিত (হোল্ড) করা হয়েছে!' : 'Bill held successfully!', 'success');
  };

  const handleRecallHeldBill = (held: typeof heldBills[0]) => {
    setItems(held.items);
    setSelectedCustomerId(held.customerId);
    setSaleMode(held.saleMode);
    setHeldBills(prev => prev.filter(h => h.id !== held.id));
    setIsHeldBillsModalOpen(false);
    showToast(language === 'bn' ? 'স্থগিত বিল কার্টে লোড করা হয়েছে!' : 'Held bill recalled to cart!', 'success');
  };

  const handleDeleteHeldBill = (id: string) => {
    setHeldBills(prev => prev.filter(h => h.id !== id));
    showToast(language === 'bn' ? 'স্থগিত বিল মুছে ফেলা হয়েছে।' : 'Held bill removed.', 'info');
  };

  // Master Import from Quotation Handler
  const handleImportQuotation = (q: Quotation) => {
    if (!q.items || q.items.length === 0) {
      showToast(language === 'bn' ? 'কোটেশনে কোনো পণ্য পাওয়া যায়নি।' : 'No items in quotation.', 'warning');
      return;
    }
    const convertedRows: SaleRowItem[] = q.items.map((it, idx) => {
      const prod = products.find(p => p.id === it.productId);
      return {
        id: `row-q-${Date.now()}-${idx}`,
        productId: it.productId,
        name: it.name,
        barcode: prod?.barcode || '',
        unit: (prod?.unit || 'Pcs') as any,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: 0,
        discountType: 'flat',
        taxPercent: 0,
        stock: prod?.stock || 0,
        total: it.total,
      };
    });
    setItems(convertedRows);
    if (q.customerId) {
      setSelectedCustomerId(q.customerId);
    }
    setIsQuotationModalOpen(false);
    showToast(
      language === 'bn'
        ? `কোটেশন #${q.quotationNumber} সফলভাবে কার্টে লোড করা হয়েছে!`
        : `Quotation #${q.quotationNumber} loaded into cart!`,
      'success'
    );
  };

  // Filtered customer list for autocomplete
  const filteredCustomers = useMemo(() => {
    const custs = parties.filter(p => p.type === 'CUSTOMER');
    if (!searchPartyQuery.trim()) return custs;
    const q = searchPartyQuery.toLowerCase();
    return custs.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.serialNumber && c.serialNumber.toLowerCase().includes(q))
    );
  }, [parties, searchPartyQuery]);

  // Filtered products for top quick selector
  const filteredTopProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedTopCategory === 'ALL' || p.categoryId === selectedTopCategory;
      if (!topProductSearchQuery.trim()) {
        return matchesCat;
      }
      const q = topProductSearchQuery.toLowerCase();
      const matchesQuery =
        p.name.toLowerCase().includes(q) ||
        (p.nameBn && p.nameBn.toLowerCase().includes(q)) ||
        p.barcode.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.generic && p.generic.toLowerCase().includes(q)) ||
        (p.manufacturer && p.manufacturer.toLowerCase().includes(q)) ||
        (p.rackLocation && p.rackLocation.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [products, topProductSearchQuery, selectedTopCategory]);

  const filteredCatalogProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = catalogCategory === 'ALL' || p.categoryId === catalogCategory;
      if (!catalogSearch.trim()) return matchesCat;
      const q = catalogSearch.toLowerCase();
      return (
        matchesCat &&
        (p.name.toLowerCase().includes(q) ||
          (p.nameBn && p.nameBn.toLowerCase().includes(q)) ||
          p.barcode.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.generic && p.generic.toLowerCase().includes(q)) ||
          (p.manufacturer && p.manufacturer.toLowerCase().includes(q)) ||
          (p.rackLocation && p.rackLocation.toLowerCase().includes(q)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q)))
      );
    });
  }, [products, catalogSearch, catalogCategory]);

  // Calculation of Table Items Total
  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [items]);

  const totalDiscount = useMemo(() => {
    return items.reduce((sum, item) => {
      const lineDisc = item.discountType === 'flat' 
        ? (item.discount || 0) * item.quantity 
        : ((item.unitPrice * item.quantity) * (item.discount || 0)) / 100;
      return sum + lineDisc;
    }, 0);
  }, [items]);

  const netAmount = Math.max(0, itemsSubtotal);
  const totalAmount = Math.max(0, netAmount + (deliveryFee || 0));

  // EMI Calculations
  const emiPrincipalAmount = Math.max(0, totalAmount - (emiDownPayment || 0));
  const emiInterestAmount = (emiPrincipalAmount * (emiInterestRate || 0)) / 100;
  const emiTotalPayable = emiPrincipalAmount + emiInterestAmount;
  const emiPerPeriodAmount = emiTotalInstallments > 0 ? Math.round(emiTotalPayable / emiTotalInstallments) : 0;

  // Generated Installment Schedules
  const generatedSchedules = useMemo<InstallmentSchedule[]>(() => {
    if (saleMode !== 'INSTALLMENT' || emiTotalInstallments <= 0) return [];
    const schedules: InstallmentSchedule[] = [];
    const baseDate = new Date(emiStartDate || new Date().toISOString().split('T')[0]);

    for (let i = 1; i <= emiTotalInstallments; i++) {
      const dueDate = new Date(baseDate);
      if (emiFrequency === 'WEEKLY') {
        dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
      } else if (emiFrequency === 'FORTNIGHTLY') {
        dueDate.setDate(dueDate.getDate() + (i - 1) * 14);
      } else {
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
      }
      schedules.push({
        installmentNo: i,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: emiPerPeriodAmount,
        penalty: 0,
        paidAmount: 0,
        status: 'PENDING',
      });
    }
    return schedules;
  }, [saleMode, emiStartDate, emiTotalInstallments, emiFrequency, emiPerPeriodAmount]);

  // Compute Total Received from payment splits or EMI downpayment
  const totalReceivedAmount = useMemo(() => {
    if (saleMode === 'INSTALLMENT') {
      return emiDownPayment || 0;
    }
    if (saleMode === 'CREDIT' && paymentSplits.length === 1 && paymentSplits[0].amount === 0) {
      return 0;
    }
    return paymentSplits.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [paymentSplits, saleMode, emiDownPayment]);

  // Auto-sync cash payment amount if saleMode is CASH and single payment row
  useEffect(() => {
    if (saleMode === 'CASH') {
      setPaymentSplits(prev => {
        if (prev.length === 1) {
          return [{ ...prev[0], amount: totalAmount, method: 'CASH' }];
        }
        return prev;
      });
    } else if (saleMode === 'CREDIT') {
      // In credit mode, default first row to 0 if not edited
      setPaymentSplits(prev => {
        if (prev.length === 1 && prev[0].amount === totalAmount && totalAmount > 0) {
          return [{ ...prev[0], amount: 0, method: 'DUE' }];
        }
        return prev;
      });
    } else if (saleMode === 'INSTALLMENT') {
      // Auto suggest 20% down payment if 0
      if (emiDownPayment === 0 && totalAmount > 0) {
        setEmiDownPayment(Math.round(totalAmount * 0.2));
      }
    }
  }, [totalAmount, saleMode]);

  const dueAmount = saleMode === 'INSTALLMENT' ? emiTotalPayable : Math.max(0, totalAmount - totalReceivedAmount);

  // Handle row item value changes
  const handleItemChange = (
    rowId: string,
    field: keyof SaleRowItem,
    value: any
  ) => {
    setItems(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row;
        
        let parsedValue = value;
        if (typeof value === 'string' && ['quantity', 'unitPrice', 'discount'].includes(field as string)) {
          parsedValue = value.replace(/^0+(?=\d)/, '');
        }
        
        const updated = { ...row, [field]: parsedValue };

        const qty = field === 'quantity' ? Math.max(0, parseFloat(parsedValue) || 0) : row.quantity;
        const price = field === 'unitPrice' ? Math.max(0, parseFloat(parsedValue) || 0) : row.unitPrice;
        const disc = field === 'discount' ? Math.max(0, parseFloat(parsedValue) || 0) : row.discount;

        const discAmt = updated.discountType === 'flat' ? disc : (price * disc) / 100;
        const effectivePrice = Math.max(0, price - discAmt);
        updated.total = qty * effectivePrice;

        return updated;
      })
    );
  };

  // Select product for a row
  const handleSelectProductForRow = (rowId: string, product: Product) => {
    // Check Expiration
    if (isProductExpired(product)) {
      showToast(
        language === 'bn'
          ? `⚠️ "${product.name}" পণ্যটির সব ব্যাচ মেয়াদোত্তীর্ণ! মেয়াদ শেষ হওয়া পণ্য বিক্রি করা যাবে না।`
          : `⚠️ All batches of "${product.name}" are expired! Expired products cannot be sold.`,
        'error'
      );
      setActiveItemRowSearch(null);
      setItemSearchQuery('');
      return;
    }

    setItems(prev => {
      const updated = prev.map(row => {
        if (row.id !== rowId) return row;
        const itemDisc = product.discount || 0;
        const discAmt = product.discountType === 'flat' ? itemDisc : (product.salesPrice * itemDisc) / 100;
        const linePrice = Math.max(0, product.salesPrice - discAmt);

        const activeBatches = (product.batches || []).filter(b => (b.stock || 0) > 0);
        const validBatches = activeBatches.filter(b => !isExpiredDate(b.expDate));
        validBatches.sort((a, b) => (a.expDate || '').localeCompare(b.expDate || ''));
        const firstValidBatch = validBatches[0];

        return {
          ...row,
          productId: product.id,
          name: product.name,
          nameBn: product.nameBn,
          barcode: product.barcode,
          unit: product.unit,
          quantity: row.quantity || 1,
          unitPrice: product.salesPrice,
          discount: itemDisc,
          discountType: product.discountType || 'flat',
          taxPercent: companySettings.defaultVatPercent || 0,
          stock: product.stock,
          total: (row.quantity || 1) * linePrice,
          batchId: firstValidBatch?.id,
          batchNumber: firstValidBatch?.batchNumber || product.batchNumber,
          expDate: firstValidBatch?.expDate || product.expDate,
        };
      });

      // If this was the last row, automatically append a blank row for seamless typing
      const lastRow = updated[updated.length - 1];
      if (lastRow && lastRow.id === rowId) {
        updated.push({
          id: `row-${Date.now()}`,
          productId: '',
          name: '',
          barcode: '',
          unit: 'Pcs',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          discountType: 'flat',
          taxPercent: 0,
          stock: 0,
          total: 0,
        });
      }

      return updated;
    });

    setActiveItemRowSearch(null);
    setItemSearchQuery('');
  };

  // Add new empty row
  const handleAddRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        productId: '',
        name: '',
        barcode: '',
        unit: 'Pcs',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        discountType: 'flat',
        taxPercent: 0,
        stock: 0,
        total: 0,
      },
    ]);
  };

  // Remove row
  const handleRemoveRow = (rowId: string) => {
    if (items.length <= 1) {
      // Just clear it
      setItems([
        {
          id: `row-${Date.now()}`,
          productId: '',
          name: '',
          barcode: '',
          unit: 'Pcs',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          discountType: 'flat',
          taxPercent: 0,
          stock: 0,
          total: 0,
        },
      ]);
      return;
    }
    setItems(prev => prev.filter(r => r.id !== rowId));
  };

  // Add Payment Split Row
  const handleAddPaymentSplit = () => {
    const remainingToPay = Math.max(0, totalAmount - totalReceivedAmount);
    setPaymentSplits(prev => [
      ...prev,
      {
        id: `pay-${Date.now()}`,
        method: 'MFS',
        walletId: wallets.find(w => w.type === 'MFS')?.id || wallets[0]?.id || 'w-bkash',
        amount: remainingToPay,
      },
    ]);
  };

  // Remove Payment Split Row
  const handleRemovePaymentSplit = (splitId: string) => {
    if (paymentSplits.length <= 1) return;
    setPaymentSplits(prev => prev.filter(p => p.id !== splitId));
  };

  // Update Payment Split
  const handleUpdatePaymentSplit = (
    splitId: string,
    field: keyof SplitPaymentRow,
    value: any
  ) => {
    setPaymentSplits(prev =>
      prev.map(p => {
        if (p.id !== splitId) return p;
        return { ...p, [field]: value };
      })
    );
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Add Product (Top Bar / Catalog / Scan)
  const handleQuickAddProduct = (product: Product) => {
    // Check Expiration
    if (isProductExpired(product)) {
      showToast(
        language === 'bn'
          ? `⚠️ "${product.name}" পণ্যটির সব ব্যাচ মেয়াদোত্তীর্ণ! মেয়াদ শেষ হওয়া পণ্য বিক্রি করা যাবে না।`
          : `⚠️ All batches of "${product.name}" are expired! Expired products cannot be sold.`,
        'error'
      );
      return;
    }

    const { validStock } = getProductBatchStockSummary(product);

    // If product already in items, increase quantity by 1
    const existingIdx = items.findIndex(i => i.productId === product.id);
    if (existingIdx >= 0) {
      const currentQty = items[existingIdx].quantity || 0;
      const targetBatchId = items[existingIdx].batchId;
      const targetBatch = product.batches?.find(b => b.id === targetBatchId);

      const maxLimit = targetBatch ? targetBatch.stock : (product.batches && product.batches.length > 0 ? validStock : product.stock);

      if (currentQty + 1 > maxLimit) {
        showToast(
          language === 'bn'
            ? `⚠️ "${product.name}"-এর বিক্রয়যোগ্য মজুদ সীমা (${maxLimit} ${product.unit}) পূর্ণ হয়েছে! মেয়াদোত্তীর্ণ পণ্য বিক্রি করা যাবে না।`
            : `⚠️ Valid stock limit (${maxLimit} ${product.unit}) reached for "${product.name}"! Expired stock cannot be sold.`,
          'warning'
        );
        return;
      }

      const newQty = currentQty + 1;
      handleItemChange(items[existingIdx].id, 'quantity', newQty);
      showToast(
        language === 'bn'
          ? `"${product.name}" (+1) যোগ করা হয়েছে। মোট: ${newQty} ${product.unit}`
          : `Added +1 for "${product.name}". Total: ${newQty} ${product.unit}`,
        'info'
      );
      setTopProductSearchQuery('');
      setShowTopProductDropdown(false);
      return;
    }

    // Find first empty row or append
    const emptyRow = items.find(i => !i.productId);
    if (emptyRow) {
      handleSelectProductForRow(emptyRow.id, product);
    } else {
      const newRowId = `row-${Date.now()}`;
      const itemDisc = product.discount || 0;
      const discAmt = product.discountType === 'flat' ? itemDisc : (product.salesPrice * itemDisc) / 100;
      const linePrice = Math.max(0, product.salesPrice - discAmt);

      const activeBatches = (product.batches || []).filter(b => (b.stock || 0) > 0);
      const validBatches = activeBatches.filter(b => !isExpiredDate(b.expDate));
      validBatches.sort((a, b) => (a.expDate || '').localeCompare(b.expDate || ''));
      const firstValidBatch = validBatches[0];

      setItems(prev => [
        ...prev,
        {
          id: newRowId,
          productId: product.id,
          name: product.name,
          nameBn: product.nameBn,
          barcode: product.barcode,
          unit: product.unit,
          quantity: 1,
          unitPrice: product.salesPrice,
          discount: itemDisc,
          discountType: product.discountType || 'flat',
          taxPercent: 0,
          stock: product.stock,
          total: linePrice,
          batchId: firstValidBatch?.id,
          batchNumber: firstValidBatch?.batchNumber || product.batchNumber,
          expDate: firstValidBatch?.expDate || product.expDate,
        },
      ]);
    }
    showToast(
      language === 'bn' ? `"${product.name}" যোগ করা হয়েছে।` : `Added "${product.name}"`,
      'success'
    );
    setTopProductSearchQuery('');
    setShowTopProductDropdown(false);
  };

  // Barcode scanner auto add
  const handleBarcodeScanned = (barcodeVal: string) => {
    if (!barcodeVal.trim()) return;
    const match = products.find(
      p => p.barcode === barcodeVal.trim() || p.sku.toLowerCase() === barcodeVal.trim().toLowerCase()
    );
    if (match) {
      // Check Expiration
      if (isProductExpired(match)) {
        showToast(
          language === 'bn'
            ? `⚠️ বারকোড স্ক্যানকৃত পণ্য "${match.name}"-এর সব ব্যাচ মেয়াদোত্তীর্ণ! মেয়াদ শেষ হওয়া পণ্য বিক্রি করা যাবে না।`
            : `⚠️ Scanned product "${match.name}" is expired! Expired products cannot be sold.`,
          'error'
        );
        return;
      }

      const { validStock } = getProductBatchStockSummary(match);

      // Check if item already exists in items
      const existingIdx = items.findIndex(i => i.productId === match.id);
      if (existingIdx >= 0) {
        const currentQty = items[existingIdx].quantity || 0;
        const targetBatchId = items[existingIdx].batchId;
        const targetBatch = match.batches?.find(b => b.id === targetBatchId);
        const maxLimit = targetBatch ? targetBatch.stock : (match.batches && match.batches.length > 0 ? validStock : match.stock);

        if (currentQty + 1 > maxLimit) {
          showToast(
            language === 'bn'
              ? `⚠️ "${match.name}"-এর বিক্রয়যোগ্য মজুদ সীমা (${maxLimit} ${match.unit}) পূর্ণ হয়েছে!`
              : `⚠️ Valid stock limit reached for "${match.name}"!`,
            'warning'
          );
          return;
        }

        handleItemChange(items[existingIdx].id, 'quantity', currentQty + 1);
        showToast(`Added 1 more "${match.name}"`, 'info');
      } else {
        // Find first empty row or append
        const emptyRow = items.find(i => !i.productId);
        if (emptyRow) {
          handleSelectProductForRow(emptyRow.id, match);
        } else {
          const newRowId = `row-${Date.now()}`;
          const itemDisc = match.discount || 0;
          const discAmt = match.discountType === 'flat' ? itemDisc : (match.salesPrice * itemDisc) / 100;
          const linePrice = Math.max(0, match.salesPrice - discAmt);

          const activeBatches = (match.batches || []).filter(b => (b.stock || 0) > 0);
          const validBatches = activeBatches.filter(b => !isExpiredDate(b.expDate));
          validBatches.sort((a, b) => (a.expDate || '').localeCompare(b.expDate || ''));
          const firstValidBatch = validBatches[0];

          setItems(prev => [
            ...prev,
            {
              id: newRowId,
              productId: match.id,
              name: match.name,
              barcode: match.barcode,
              unit: match.unit,
              quantity: 1,
              unitPrice: match.salesPrice,
              discount: itemDisc,
              discountType: match.discountType || 'flat',
              taxPercent: 0,
              stock: match.stock,
              total: linePrice,
              batchId: firstValidBatch?.id,
              batchNumber: firstValidBatch?.batchNumber || match.batchNumber,
              expDate: firstValidBatch?.expDate || match.expDate,
            },
          ]);
        }
        showToast(`Scanned "${match.name}"`, 'success');
      }
    } else {
      showToast(language === 'bn' ? 'বারকোড মিল পাওয়া যায়নি!' : 'No product found for barcode!', 'error');
    }
  };

  // Reset form
  const handleResetForm = () => {
    setItems([
      {
        id: `row-${Date.now()}`,
        productId: '',
        name: '',
        barcode: '',
        unit: 'Pcs',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        discountType: 'flat',
        taxPercent: 0,
        stock: 0,
        total: 0,
      },
    ]);
    setSelectedCustomerId('walk-in');
    setSearchPartyQuery('');
    setDeliveryFee(0);
    setDescription('');
    setAttachedImage(null);
    setInvoiceNo(getNextSaleInvoiceNumber ? getNextSaleInvoiceNumber() : 'INV-2026-0001');
    setPaymentSplits([
      {
        id: `pay-${Date.now()}`,
        method: 'CASH',
        walletId: wallets[0]?.id || 'w-cash',
        amount: 0,
      },
    ]);
    setEmiDownPayment(0);
    setEmiTotalInstallments(6);
    setEmiInterestRate(0);
    setEmiGuarantorName('');
    setEmiGuarantorPhone('');
    setEmiGuarantorNid('');
    setShowEmiSchedulePreview(false);
  };

  // Submit Save
  const handleSaveInvoice = (isSaveAndNew = false) => {
    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      showToast(language === 'bn' ? 'অন্তত একটি পণ্য নির্বাচন করুন!' : 'Please add at least one product!', 'warning');
      return;
    }

    // Check duplicate invoice number
    if (duplicateInvoice) {
      showToast(
        language === 'bn'
          ? `আগে থেকে এই Invoice No এন্ট্রি আছে! (${duplicateInvoice.customerName} - চালান #${duplicateInvoice.invoiceNumber})। একই ইনভয়েস নং দুইবার এন্ট্রি হবে না।`
          : `This Invoice No is already entered previously! (${duplicateInvoice.customerName} - #${duplicateInvoice.invoiceNumber}). Duplicate entry not allowed.`,
        'error'
      );
      return;
    }

    // Validate Stock & Batch-Level Expiry for every item
    for (const item of validItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      // 1. If cashier selected a specific batch
      if (item.batchId && product.batches && product.batches.length > 0) {
        const batch = product.batches.find(b => b.id === item.batchId);
        if (!batch) {
          showToast(
            language === 'bn'
              ? `"${item.name}" পণ্যের নির্ধারিত ব্যাচ পাওয়া যায়নি!`
              : `Batch not found for "${item.name}"!`,
            'error'
          );
          return;
        }

        // Check if selected batch is expired
        if (isExpiredDate(batch.expDate)) {
          showToast(
            language === 'bn'
              ? `⚠️ "${item.name}"-এর নির্বাচিত ব্যাচ "${batch.batchNumber}"-এর মেয়াদ শেষ (${batch.expDate})! মেয়াদোত্তীর্ণ ব্যাচ বিক্রি করা যাবে না। অনুগ্রহ করে মেয়াদ ওকে এমন ব্যাচ নির্বাচন করুন।`
              : `⚠️ Selected batch "${batch.batchNumber}" of "${item.name}" is expired (${batch.expDate})! Expired batches cannot be sold.`,
            'error'
          );
          return;
        }

        // Check if item quantity exceeds this batch stock
        if (item.quantity > batch.stock) {
          showToast(
            language === 'bn'
              ? `"${item.name}" পণ্যের ব্যাচ "${batch.batchNumber}"-এ পর্যাপ্ত মজুদ নেই (মজুদ: ${batch.stock}, বিক্রয়: ${item.quantity})!`
              : `Insufficient stock in batch "${batch.batchNumber}" for "${item.name}" (Stock: ${batch.stock})!`,
            'error'
          );
          return;
        }
      } else if (product.batches && product.batches.length > 0) {
        // 2. Auto FEFO - must have valid non-expired batches
        const validBatches = product.batches.filter(b => (b.stock || 0) > 0 && !isExpiredDate(b.expDate));
        const totalValidStock = validBatches.reduce((s, b) => s + Number(b.stock || 0), 0);

        if (totalValidStock <= 0) {
          showToast(
            language === 'bn'
              ? `⚠️ "${item.name}" পণ্যের সব ব্যাচ মেয়াদোত্তীর্ণ! মেয়াদ শেষ হওয়া পণ্য বিক্রি করা যাবে না।`
              : `⚠️ All batches of "${item.name}" are expired! Expired batches cannot be sold.`,
            'error'
          );
          return;
        }

        if (item.quantity > totalValidStock) {
          const expiredBatches = product.batches.filter(b => (b.stock || 0) > 0 && isExpiredDate(b.expDate));
          const expiredStock = expiredBatches.reduce((s, b) => s + Number(b.stock || 0), 0);
          showToast(
            language === 'bn'
              ? `⚠️ "${item.name}"-এর বিক্রয়যোগ্য (মেয়াদ ওকে) স্টক আছে মাত্র ${totalValidStock} টি${expiredStock > 0 ? ` (${expiredStock} টি মেয়াদোত্তীর্ণ ব্যাচে আটকে আছে)` : ''}!`
              : `⚠️ Insufficient valid stock for "${item.name}". Only ${totalValidStock} units available in valid batches!`,
            'error'
          );
          return;
        }
      } else {
        // 3. Simple product without batches
        if (isExpiredDate(product.expDate)) {
          showToast(
            language === 'bn'
              ? `⚠️ "${item.name}" পণ্যটির মেয়াদ উত্তীর্ণ হয়ে গেছে (Exp Date: ${product.expDate})! মেয়াদোত্তীর্ণ পণ্য বিক্রয় করা যাবে না।`
              : `⚠️ "${item.name}" is expired (Exp Date: ${product.expDate})! Expired products cannot be sold.`,
            'error'
          );
          return;
        }

        if (item.quantity > product.stock) {
          showToast(
            language === 'bn' ? `"${product.name}" পণ্যের পর্যাপ্ত স্টক নেই!` : `Insufficient stock for "${product.name}"!`,
            'error'
          );
          return;
        }
      }
    }

    if (saleMode === 'INSTALLMENT') {
      if (selectedCustomerId === 'walk-in' || !selectedCustomer?.id) {
        showToast(
          language === 'bn'
            ? 'কিস্তি / ইএমআই বিক্রয়ের জন্য কাস্টমার নির্বাচন আবশ্যক!'
            : 'Please select or register a customer for installment / EMI sales!',
          'error'
        );
        return;
      }

      if (emiTotalInstallments <= 0) {
        showToast(language === 'bn' ? 'সঠিক কিস্তির সংখ্যা দিন!' : 'Please enter valid installment count!', 'error');
        return;
      }

      const cartItems: CartItem[] = validItems.map(vi => ({
        productId: vi.productId,
        name: vi.name,
        nameBn: vi.nameBn,
        barcode: vi.barcode,
        unit: vi.unit,
        purchasePrice: 0,
        unitPrice: Number(vi.unitPrice),
        quantity: Number(vi.quantity),
        discount: Number(vi.discount),
        discountType: vi.discountType,
        taxPercent: Number(vi.taxPercent),
        stock: Number(vi.stock),
        total: Number(vi.total),
        batchId: vi.batchId,
        batchNumber: vi.batchNumber,
        expDate: vi.expDate,
      }));

      const emiProductNames = validItems.map(vi => `${vi.name}${vi.quantity > 1 ? ` (x${vi.quantity})` : ''}`).join(', ');

      // 1. Create Sale Invoice
      const newInvoice = createSaleInvoice({
        invoiceNumber: trimmedInvoiceNo || undefined,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone || '',
        customerAddress: (selectedCustomer as any)?.address || '',
        items: cartItems,
        subtotal: itemsSubtotal,
        discount: totalDiscount,
        discountType: 'flat',
        vatAmount: 0,
        grandTotal: totalAmount,
        paidAmount: emiDownPayment,
        dueAmount: emiTotalPayable,
        paymentMethod: 'INSTALLMENT',
        walletId: emiDownPaymentWalletId,
        notes: (description ? `${description} | ` : '') + `[EMI/কিস্তি]: ${emiTotalInstallments}টি ${emiFrequency === 'MONTHLY' ? 'মাসিক' : emiFrequency === 'WEEKLY' ? 'সাপ্তাহিক' : 'পক্ষিক'} কিস্তি @ ৳${emiPerPeriodAmount}/কিস্তি`,
        isInstallmentSale: true,
        date: invoiceDate,
      });

      if (!newInvoice) return;

      // 2. Create Installment Scheme
      const newScheme = createInstallmentScheme(
        {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          customerPhone: selectedCustomer.phone || '',
          invoiceId: newInvoice.id,
          invoiceNumber: newInvoice.invoiceNumber,
          productName: emiProductNames,
          totalPrice: totalAmount,
          downPayment: emiDownPayment,
          principalAmount: emiPrincipalAmount,
          interestRate: emiInterestRate || 0,
          interestAmount: emiInterestAmount,
          totalPayable: emiTotalPayable,
          totalInstallments: emiTotalInstallments,
          frequency: emiFrequency,
          emiAmount: emiPerPeriodAmount,
          startDate: emiStartDate,
          status: 'ACTIVE',
          schedules: generatedSchedules,
          guarantorName: emiGuarantorName || undefined,
          guarantorPhone: emiGuarantorPhone || undefined,
          guarantorNid: emiGuarantorNid || undefined,
          notes: (description || '') + (deliveryFee > 0 ? ` (Delivery Fee: ৳${deliveryFee})` : ''),
        },
        { skipDayBookAndWallet: true }
      );

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {
        // ignore
      }

      if (sendDueSms && selectedCustomer?.phone) {
        showToast(
          language === 'bn'
            ? `কিস্তি নিশ্চিতকরণ এসএমএস পাঠানো হয়েছে: ${selectedCustomer.phone}`
            : `Installment confirmation SMS sent to ${selectedCustomer.phone}`,
          'info'
        );
      }

      if (!isSaveAndNew) {
        openPrintModal({
          type: companySettings.invoicePrintType === 'A4' ? 'INVOICE_A4' : 'POS_80MM',
          title: `EMI Sale Invoice #${newInvoice.invoiceNumber}`,
          data: {
            ...newInvoice,
            installmentPlanId: newScheme.id,
            schemeNumber: newScheme.schemeNumber,
            totalInstallments: emiTotalInstallments,
            emiAmount: emiPerPeriodAmount,
          },
        });
      }

      showToast(
        language === 'bn'
          ? `কিস্তি বিক্রয় চালান #${newInvoice.invoiceNumber} ও স্কিম #${newScheme.schemeNumber} তৈরি হয়েছে!`
          : `Installment sale #${newInvoice.invoiceNumber} & scheme #${newScheme.schemeNumber} created successfully!`,
        'success'
      );

      handleResetForm();
      return;
    }

    if (dueAmount > 0 && selectedCustomerId === 'walk-in') {
      showToast(
        language === 'bn'
          ? 'বকেয়া বিক্রয়ের জন্য কাস্টমার নির্বাচন আবশ্যক!'
          : 'Please select a registered customer to record due balance!',
        'error'
      );
      return;
    }

    const cartItems: CartItem[] = validItems.map(vi => ({
      productId: vi.productId,
      name: vi.name,
      nameBn: vi.nameBn,
      barcode: vi.barcode,
      unit: vi.unit,
      purchasePrice: 0,
      unitPrice: Number(vi.unitPrice),
      quantity: Number(vi.quantity),
      discount: Number(vi.discount),
      discountType: vi.discountType,
      taxPercent: Number(vi.taxPercent),
      stock: Number(vi.stock),
      total: Number(vi.total),
      batchId: vi.batchId,
      batchNumber: vi.batchNumber,
      expDate: vi.expDate,
    }));

    const primaryPayment = paymentSplits[0] || { method: 'CASH', walletId: wallets[0]?.id || 'w-cash' };

    const newInvoice = createSaleInvoice({
      invoiceNumber: trimmedInvoiceNo || undefined,
      customerId: selectedCustomer?.id || 'walk-in',
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      customerPhone: selectedCustomer?.phone || '',
      customerAddress: (selectedCustomer as any)?.address || '',
      items: cartItems,
      subtotal: itemsSubtotal,
      discount: totalDiscount,
      discountType: 'flat',
      vatAmount: 0,
      grandTotal: totalAmount,
      paidAmount: totalReceivedAmount,
      dueAmount: dueAmount,
      paymentMethod: primaryPayment.method,
      walletId: primaryPayment.walletId,
      notes: description + (deliveryFee > 0 ? ` (Delivery Fee: ৳${deliveryFee})` : ''),
      date: invoiceDate,
    });

    if (!newInvoice) return;

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {
      // ignore
    }

    if (sendDueSms && selectedCustomer?.phone && dueAmount > 0) {
      showToast(
        language === 'bn'
          ? `বকেয়া এসএমএস পাঠানো হয়েছে: ${selectedCustomer.phone}`
          : `Due reminder SMS queued to ${selectedCustomer.phone}`,
        'info'
      );
    }

    if (!isSaveAndNew) {
      openPrintModal({
        type: companySettings.invoicePrintType === 'A4' ? 'INVOICE_A4' : 'POS_80MM',
        title: `Sale Invoice #${newInvoice.invoiceNumber}`,
        data: newInvoice,
      });
    }

    showToast(
      language === 'bn' ? 'বিক্রয় চালান সফলভাবে সংরক্ষিত হয়েছে!' : 'Sale invoice created successfully!',
      'success'
    );

    handleResetForm();
  };

  return (
    <div className="w-full space-y-4 pb-12">
      
      {/* Main Container Card Matching Exact Screenshot Design */}
      <div className="bg-[#FAF9FE] dark:bg-slate-900/90 rounded-2xl border border-[#ECE8FF] dark:border-slate-800 shadow-sm overflow-hidden p-4 sm:p-6 transition-all">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER: Title & Cash / Credit / Installments Switch */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#ECE8FF] dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <span>{language === 'bn' ? 'নতুন বিক্রয় (New Sales)' : 'New Sales'}</span>
              {saleMode === 'INSTALLMENT' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 flex items-center gap-1">
                  <CalendarCheck className="w-3 h-3" />
                  <span>EMI Active</span>
                </span>
              )}
            </h2>
            
            {/* Quick Catalog Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'invoice' ? 'touch-pos' : 'invoice')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Toggle fast invoice entry vs visual touch POS catalog"
            >
              {viewMode === 'invoice' ? <LayoutGrid className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{viewMode === 'invoice' ? 'POS Grid View' : 'Invoice Form View'}</span>
            </button>

            {/* Hold Current Bill Button */}
            <button
              type="button"
              onClick={handleHoldCurrentBill}
              className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title={language === 'bn' ? 'চলমান বিলটি সাময়িক স্থগিত করুন' : 'Hold current bill'}
            >
              <Pause className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'হোল্ড বিল' : 'Hold Bill'}</span>
            </button>

            {/* View Held Bills Button */}
            {heldBills.length > 0 && (
              <button
                type="button"
                onClick={() => setIsHeldBillsModalOpen(true)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs animate-pulse"
                title={language === 'bn' ? 'স্থগিত বিল পুনরুদ্ধার করুন' : 'View held bills'}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? `স্থগিত (${heldBills.length})` : `Held (${heldBills.length})`}</span>
              </button>
            )}

            {/* Import from Quotation Button */}
            {quotations.length > 0 && (
              <button
                type="button"
                onClick={() => setIsQuotationModalOpen(true)}
                className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title={language === 'bn' ? 'কোটেশন থেকে সেল চালানে লোড করুন' : 'Import quotation into sale invoice'}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'কোটেশন লোড' : 'Quote Import'}</span>
              </button>
            )}
          </div>

          {/* Right: Cash / Credit / Installments Segmented Switch */}
          <div className="flex items-center bg-white dark:bg-slate-800/80 p-1 rounded-full border border-[#ECE8FF] dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setSaleMode('CASH')}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                saleMode === 'CASH'
                  ? 'bg-[#8A7CFA] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {language === 'bn' ? 'নগদ (Cash)' : 'Cash'}
            </button>

            <button
              type="button"
              onClick={() => setSaleMode('CREDIT')}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                saleMode === 'CREDIT'
                  ? 'bg-[#8A7CFA] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {language === 'bn' ? 'বাকি (Credit)' : 'Credit'}
            </button>

            <button
              type="button"
              onClick={() => setSaleMode('INSTALLMENT')}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                saleMode === 'INSTALLMENT'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                  : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700'
              }`}
            >
              <CalendarCheck className="w-3 h-3" />
              <span>{language === 'bn' ? 'কিস্তি / EMI' : 'Installments / EMI'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TOP INFORMATION ROW: Search Party, Invoice No & Invoice Date */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-4 items-center">
          
          {/* Search Party (Left - 6 Cols) */}
          <div className="lg:col-span-6 relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={selectedCustomerId === 'walk-in' ? searchPartyQuery : selectedCustomer?.name || ''}
                  onChange={e => {
                    setSelectedCustomerId('walk-in');
                    setSearchPartyQuery(e.target.value);
                    setShowPartyDropdown(true);
                  }}
                  onFocus={() => setShowPartyDropdown(true)}
                  placeholder="Search Party"
                  className="w-full pl-3.5 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#8A7CFA] focus:ring-1 focus:ring-[#8A7CFA]"
                />
                
                {selectedCustomerId !== 'walk-in' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId('walk-in');
                      setSearchPartyQuery('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Info Icon with popover/tooltip */}
              <button
                type="button"
                className="text-slate-400 hover:text-[#8A7CFA] transition-colors p-1"
                title="Select customer or party to record invoice and ledger transactions"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Search Autocomplete Dropdown */}
            {showPartyDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-[#DCD6FE] dark:border-slate-700 py-1.5 z-40 max-h-60 overflow-y-auto text-xs">
                <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[11px] font-bold uppercase">
                  <span>Select Customer</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPartyDropdown(false);
                      onOpenNewCustomerModal();
                    }}
                    className="text-[#8A7CFA] hover:underline font-bold normal-case flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add New Customer</span>
                  </button>
                </div>

                {/* Walk-in Customer Option */}
                <div
                  onClick={() => {
                    setSelectedCustomerId('walk-in');
                    setSearchPartyQuery('');
                    setShowPartyDropdown(false);
                  }}
                  className="px-3.5 py-2 hover:bg-purple-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">🛒 Walk-in / Cash Customer</span>
                  <span className="text-[10px] text-slate-400">Regular</span>
                </div>

                {/* Filtered customers */}
                {filteredCustomers.map(cust => (
                  <div
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomerId(cust.id);
                      setSearchPartyQuery(cust.name);
                      setShowPartyDropdown(false);
                    }}
                    className="px-3.5 py-2 hover:bg-purple-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between border-t border-slate-50 dark:border-slate-700/40"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <span>{cust.name}</span>
                        {cust.serialNumber && (
                          <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                            #{cust.serialNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{cust.phone || 'No phone'}</div>
                    </div>
                    {cust.currentBalance > 0 && (
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono">
                        Due: ৳{cust.currentBalance}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoice No & Invoice Date (Right - 6 Cols) */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Invoice No (Manual / Auto Entry) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {language === 'bn' ? 'চালান / Invoice No' : 'Invoice No'}
                  </label>
                  <span className="px-1.5 py-0.2 text-[10px] font-medium rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {language === 'bn' ? 'ম্যানুয়াল এন্ট্রি' : 'Manual Entry'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInvoiceNo(getNextSaleInvoiceNumber ? getNextSaleInvoiceNumber() : `INV-2026-${Date.now().toString().slice(-4)}`)}
                  title={language === 'bn' ? 'নতুন অটো ইনভয়েস নং জেনারেট করুন' : 'Generate next auto invoice number'}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-md border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>{language === 'bn' ? 'অটো নং' : 'Auto'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  placeholder={language === 'bn' ? 'উদাঃ INV-2026-0001 বা মেনুয়াল নং' : 'e.g. INV-2026-0001 or manual no'}
                  className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none transition-all ${
                    duplicateInvoice
                      ? 'border-red-500 focus:border-red-600 bg-red-50/40 dark:bg-red-950/20 ring-2 ring-red-200 dark:ring-red-950/50'
                      : 'border-[#DCD6FE] dark:border-slate-700 focus:border-[#8A7CFA]'
                  }`}
                />
              </div>
              {duplicateInvoice && (
                <div className="flex items-start gap-1 text-[11px] text-red-600 dark:text-red-400 font-medium leading-tight">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    {language === 'bn'
                      ? `⚠️ আগে থেকে এই নং এন্ট্রি আছে! (${duplicateInvoice.customerName} - #${duplicateInvoice.invoiceNumber})`
                      : `⚠️ This Invoice No is already entered previously! (${duplicateInvoice.customerName} - #${duplicateInvoice.invoiceNumber})`}
                  </span>
                </div>
              )}
            </div>

            {/* Invoice Date */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                Invoice Date
              </label>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#8A7CFA]"
                />
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* TOP QUICK PRODUCT SELECTOR & SCANNER BAR (NO SCROLLING NEEDED) */}
        {/* ========================================================================= */}
        <div className="my-3 p-3 bg-white dark:bg-slate-850 rounded-2xl border-2 border-indigo-200/80 dark:border-indigo-900/60 shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            
            {/* Instant Product Search Bar */}
            <div className="relative flex-1">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={topProductSearchQuery}
                  onChange={e => {
                    setTopProductSearchQuery(e.target.value);
                    setShowTopProductDropdown(true);
                  }}
                  onFocus={() => setShowTopProductDropdown(true)}
                  placeholder={
                    language === 'bn'
                      ? '⚡ দ্রুত পণ্য সার্চ করুন ও চালানে যোগ করুন (নাম, বারকোড বা SKU)...'
                      : '⚡ Quick Search & Add Product to Bill (Name, Barcode, SKU)...'
                  }
                  className="w-full pl-9 pr-10 py-2.5 bg-indigo-50/40 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                {topProductSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setTopProductSearchQuery('');
                      setShowTopProductDropdown(false);
                    }}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Instant Dropdown Suggestions */}
              {showTopProductDropdown && (
                <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-indigo-200 dark:border-slate-700 py-1.5 z-50 max-h-72 overflow-y-auto">
                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[10px] font-bold uppercase">
                    <span>
                      {language === 'bn' ? 'পণ্য নির্বাচন করুন (ক্লিক করলেই যুক্ত হবে)' : 'Select Product (Click to Add)'} ({filteredTopProducts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTopProductDropdown(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {filteredTopProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No products found'}
                    </div>
                  ) : (
                    filteredTopProducts.map(prod => {
                      const inCart = items.find(i => i.productId === prod.id);
                      const expired = isProductExpired(prod);
                      const batchSummary = getProductBatchStockSummary(prod);

                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleQuickAddProduct(prod)}
                          className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between border-b border-slate-50 dark:border-slate-700/40 transition-colors ${
                            expired
                              ? 'bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/80 dark:hover:bg-rose-900/40'
                              : 'hover:bg-indigo-50 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                            ) : (
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                expired ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300'
                              }`}>
                                {prod.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span>{prod.name}</span>
                                {expired && (
                                  <span className="px-1.5 py-0.2 bg-rose-600 text-white font-mono text-[10px] font-bold rounded-md flex items-center gap-0.5">
                                    🔴 {language === 'bn' ? 'মেয়াদ শেষ (বিক্রয় নিষিদ্ধ)' : 'Expired (Sale Blocked)'}
                                  </span>
                                )}
                                {inCart && (
                                  <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold rounded">
                                    ✓ {inCart.quantity} in bill
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                                <span>
                                  Stock: <strong className={prod.stock <= prod.minStockAlert ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'}>{Number(prod.stock)} {prod.unit}</strong>
                                  {batchSummary.hasBatches && (
                                    <span className="ml-1 text-[10px]">
                                      (সচল: <strong className="text-emerald-600 dark:text-emerald-400">{batchSummary.validStock}</strong>
                                      {batchSummary.expiredStock > 0 && (
                                        <>, মেয়াদ শেষ: <strong className="text-rose-600 dark:text-rose-400">{batchSummary.expiredStock}</strong></>
                                      )})
                                    </span>
                                  )}
                                </span>
                                <span>| SKU: {prod.sku}</span>
                                {prod.categoryName && <span>| Category: <span className="text-indigo-500 font-bold">{prod.categoryName}</span></span>}
                                {prod.manufacturer && <span>| Brand: <span className="text-slate-600 dark:text-slate-300">{prod.manufacturer}</span></span>}
                                {prod.generic && <span>| Generic: <span className="text-slate-500 italic">{prod.generic}</span></span>}
                                {prod.expDate && (
                                  <span className={expired ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                    | Exp: {prod.expDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                              ৳{prod.salesPrice.toLocaleString()}
                            </div>
                            {expired ? (
                              <span className="text-[10px] text-rose-600 font-bold">
                                {language === 'bn' ? 'বিক্রয় নিষিদ্ধ' : 'Blocked'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-indigo-500 font-semibold hover:underline">
                                + Add to Bill
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Camera Scanner button */}
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all animate-pulse hover:animate-none"
                title={language === 'bn' ? 'ক্যামেরা দিয়ে বারকোড স্ক্যান করুন' : 'Scan Barcodes with Device Camera'}
              >
                <Camera className="w-4 h-4" />
                <span>{language === 'bn' ? '📷 ক্যামেরা স্ক্যান' : 'Camera Scan'}</span>
              </button>

              {/* Scan Barcode button (opens camera scanner or manual) */}
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Scan Barcode"
              >
                <Barcode className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">{language === 'bn' ? 'বারকোড' : 'Barcode'}</span>
              </button>

              {/* Browse Catalog Modal button */}
              <button
                type="button"
                onClick={() => {
                  setCatalogSearch('');
                  setCatalogCategory('ALL');
                  setIsCatalogModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>{language === 'bn' ? 'পণ্য ক্যাটালগ ব্রাউজ' : 'Browse Catalog'}</span>
              </button>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider mr-1">
              Category:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTopCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-colors cursor-pointer ${
                selectedTopCategory === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All ({products.length})
            </button>
            {categories.map(cat => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedTopCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-colors cursor-pointer ${
                  selectedTopCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat.name} ({products.filter(p => p.categoryId === cat.id).length})
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. LINE ITEMS GRID / TABLE (Screenshot Layout) */}
        {/* ========================================================================= */}
        <div className="my-2 bg-white dark:bg-slate-900 rounded-xl border border-[#ECE8FF] dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Header Row */}
              <thead>
                <tr className="bg-[#FAF9FE] dark:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold border-b border-[#ECE8FF] dark:border-slate-800">
                  <th className="py-2.5 px-3 w-10 text-center">Sl</th>
                  <th className="py-2.5 px-3 min-w-[240px]">
                    <div className="flex items-center gap-1">
                      <span>Item</span>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 w-24 text-center">Quantity</th>
                  <th className="py-2.5 px-3 w-20 text-center">Unit</th>
                  <th className="py-2.5 px-3 w-28 text-right">Price</th>
                  <th className="py-2.5 px-3 w-24 text-right">Discount</th>
                  <th className="py-2.5 px-3 w-28 text-right">Net Amount</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>

              {/* Body Rows */}
              <tbody className="divide-y divide-[#F1EFFF] dark:divide-slate-800">
                {items.map((row, idx) => {
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      
                      {/* Sl */}
                      <td className="py-2 px-3 text-center font-mono text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* Item: Search product / Scan code with Barcode icon */}
                      <td className="py-2 px-3 relative">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={row.name || (activeItemRowSearch === row.id ? itemSearchQuery : '')}
                            onChange={e => {
                              setActiveItemRowSearch(row.id);
                              setItemSearchQuery(e.target.value);
                              handleItemChange(row.id, 'name', e.target.value);
                            }}
                            onFocus={() => {
                              setActiveItemRowSearch(row.id);
                              setItemSearchQuery(row.name);
                            }}
                            placeholder="Search product / Scan Product Code"
                            className="w-full pl-3 pr-10 py-1.5 bg-[#FAF9FE] dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#8A7CFA] focus:bg-white"
                          />
                          
                          {/* Barcode icon / scan button inside input */}
                          <button
                            type="button"
                            onClick={() => setIsCameraScannerOpen(true)}
                            className="absolute right-2 text-slate-400 hover:text-indigo-600 p-1 cursor-pointer"
                            title={language === 'bn' ? 'ক্যামেরা বা বারকোড স্ক্যান' : 'Scan with Camera / Barcode'}
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                        </div>

                        {/* If product has batches, show batch selector badge with clear expiry validation */}
                        {(() => {
                          const prod = products.find(p => p.id === row.productId);
                          if (prod && prod.batches && prod.batches.length > 0) {
                            const activeBatches = prod.batches.filter(b => (b.stock || 0) > 0);
                            const selectedBatch = prod.batches.find(b => b.id === row.batchId);
                            const isSelectedExpired = Boolean(selectedBatch && isExpiredDate(selectedBatch.expDate));
                            const validActiveBatches = activeBatches.filter(b => !isExpiredDate(b.expDate));

                            return (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Batch:</span>
                                <select
                                  value={row.batchId || ''}
                                  onChange={e => {
                                    const bId = e.target.value;
                                    const chosenBatch = prod.batches?.find(b => b.id === bId);

                                    // Block selection if expired
                                    if (chosenBatch && isExpiredDate(chosenBatch.expDate)) {
                                      showToast(
                                        language === 'bn'
                                          ? `⚠️ ব্যাচ "${chosenBatch.batchNumber}"-এর মেয়াদ উত্তীর্ণ হয়ে গেছে (${chosenBatch.expDate})! মেয়াদোত্তীর্ণ ব্যাচ বিক্রি করা যাবে না।`
                                          : `⚠️ Batch "${chosenBatch.batchNumber}" is expired (${chosenBatch.expDate})! Expired batches cannot be sold.`,
                                        'error'
                                      );
                                      return;
                                    }

                                    setItems(prev =>
                                      prev.map(item =>
                                        item.id === row.id
                                          ? {
                                              ...item,
                                              batchId: bId || undefined,
                                              batchNumber: chosenBatch?.batchNumber,
                                              expDate: chosenBatch?.expDate,
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                    isSelectedExpired
                                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  <option value="">
                                    ⚡ Auto FEFO ({validActiveBatches.length > 0 ? `সচল ${validActiveBatches.length}টি ব্যাচ` : 'কোনো সচল ব্যাচ নেই'})
                                  </option>
                                  {activeBatches.map(b => {
                                    const isBatchExp = isExpiredDate(b.expDate);
                                    return (
                                      <option
                                        key={b.id}
                                        value={b.id}
                                        disabled={isBatchExp}
                                        className={isBatchExp ? 'text-rose-600 bg-rose-50 font-bold' : 'text-emerald-700 font-medium'}
                                      >
                                        {isBatchExp ? '❌ [মেয়াদ শেষ - বিক্রয় নিষিদ্ধ] ' : '✅ [মেয়াদ ওকে] '}
                                        {b.batchNumber} (মেয়াদ: {b.expDate || 'N/A'}, স্টক: {b.stock})
                                      </option>
                                    );
                                  })}
                                </select>

                                {isSelectedExpired ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                                    🔴 মেয়াদ শেষ (বিক্রয় নিষিদ্ধ)
                                  </span>
                                ) : selectedBatch ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                                    ✓ মেয়াদ ওকে ({selectedBatch.stock} টি স্টক)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    FEFO অটো
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Product Autocomplete Dropdown */}
                        {activeItemRowSearch === row.id && (
                          <div className="absolute left-3 top-full mt-1 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-[#DCD6FE] dark:border-slate-700 py-1.5 z-50 max-h-56 overflow-y-auto">
                            <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                              <span>Select Product</span>
                              <button
                                type="button"
                                onClick={() => setActiveItemRowSearch(null)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                ✕
                              </button>
                            </div>

                            {products
                              .filter(p => {
                                if (!itemSearchQuery) return true;
                                const q = itemSearchQuery.toLowerCase();
                                return (
                                  p.name.toLowerCase().includes(q) ||
                                  (p.nameBn && p.nameBn.toLowerCase().includes(q)) ||
                                  p.barcode.toLowerCase().includes(q) ||
                                  p.sku.toLowerCase().includes(q) ||
                                  (p.generic && p.generic.toLowerCase().includes(q)) ||
                                  (p.manufacturer && p.manufacturer.toLowerCase().includes(q)) ||
                                  (p.categoryName && p.categoryName.toLowerCase().includes(q))
                                );
                              })
                              .map(prod => {
                                const expired = isProductExpired(prod);
                                const batchSummary = getProductBatchStockSummary(prod);
                                return (
                                  <div
                                    key={prod.id}
                                    onClick={() => handleSelectProductForRow(row.id, prod)}
                                    className={`px-3 py-2 cursor-pointer flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50 transition-colors ${
                                      expired
                                        ? 'bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100'
                                        : 'hover:bg-purple-50 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    <div>
                                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 flex-wrap">
                                        <span>{prod.name}</span>
                                        {expired && (
                                          <span className="px-1.5 py-0.2 bg-rose-600 text-white font-mono text-[9px] font-bold rounded">
                                            🔴 {language === 'bn' ? 'মেয়াদ শেষ (বিক্রয় নিষিদ্ধ)' : 'Expired'}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                                        <span>
                                          Stock: {Number(prod.stock)} {prod.unit}
                                          {batchSummary.hasBatches && (
                                            <span className="ml-1 text-[9px]">
                                              (সচল: <strong className="text-emerald-600 dark:text-emerald-400">{batchSummary.validStock}</strong>
                                              {batchSummary.expiredStock > 0 && (
                                                <>, মেয়াদ শেষ: <strong className="text-rose-600 dark:text-rose-400">{batchSummary.expiredStock}</strong></>
                                              )})
                                            </span>
                                          )}
                                        </span>
                                        <span>| SKU: {prod.sku}</span>
                                        {prod.categoryName && <span>| Cat: <span className="text-purple-500 font-bold">{prod.categoryName}</span></span>}
                                        {prod.manufacturer && <span>| Brand: <span className="text-slate-600 dark:text-slate-300">{prod.manufacturer}</span></span>}
                                        {prod.generic && <span>| Generic: <span className="text-slate-500 italic">{prod.generic}</span></span>}
                                        {prod.expDate && (
                                          <span className={expired ? 'text-rose-600 font-bold' : ''}>
                                            | Exp: {prod.expDate}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                        ৳{prod.salesPrice}
                                      </div>
                                      {expired && (
                                        <div className="text-[9px] text-rose-600 font-bold">
                                          {language === 'bn' ? 'নিষিদ্ধ' : 'Blocked'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={row.quantity || ''}
                          onChange={e => handleItemChange(row.id, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#FAF9FE] dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-center focus:outline-none focus:border-[#8A7CFA]"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-3 text-center">
                        <select
                          value={row.unit}
                          onChange={e => handleItemChange(row.id, 'unit', e.target.value as UnitType)}
                          className="w-full px-1.5 py-1.5 bg-[#FAF9FE] dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-lg text-xs font-medium text-center focus:outline-none focus:border-[#8A7CFA]"
                        >
                          <option value="Pcs">Pcs</option>
                          <option value="Kg">Kg</option>
                          <option value="Ltr">Ltr</option>
                          <option value="Box">Box</option>
                          <option value="Dzn">Dzn</option>
                          <option value="Pack">Pack</option>
                          <option value="Gm">Gm</option>
                        </select>
                      </td>

                      {/* Price */}
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.unitPrice || ''}
                          onChange={e => handleItemChange(row.id, 'unitPrice', e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 bg-[#FAF9FE] dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-right focus:outline-none focus:border-[#8A7CFA]"
                        />
                      </td>

                      {/* Discount */}
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.discount || ''}
                          onChange={e => handleItemChange(row.id, 'discount', e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 bg-[#FAF9FE] dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-lg text-xs font-mono text-right focus:outline-none focus:border-[#8A7CFA]"
                        />
                      </td>

                      {/* Net Amount */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                        <div className="px-2 py-1.5 bg-[#FAF9FE] dark:bg-slate-800/80 border border-[#DCD6FE] dark:border-slate-700 rounded-lg text-xs text-right">
                          {row.total.toFixed(2)}
                        </div>
                      </td>

                      {/* Delete Action */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Add Row link button */}
          <div className="p-2 bg-[#FAF9FE] dark:bg-slate-850/60 border-t border-[#ECE8FF] dark:border-slate-800 flex justify-between items-center px-4">
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs font-bold text-[#8A7CFA] hover:text-[#7462F9] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Row</span>
            </button>

            <span className="text-[11px] text-slate-400">
              Total Lines: <strong className="text-slate-600 dark:text-slate-300">{items.filter(i => i.productId).length}</strong>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. INSTALLMENT & EMI SETUP CARD (Prominently displayed if EMI is active) */}
        {/* ========================================================================= */}
        {saleMode === 'INSTALLMENT' && (
          <div className="my-4 p-4 sm:p-5 bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-white dark:from-purple-950/30 dark:via-slate-900/40 dark:to-slate-900 rounded-2xl border-2 border-purple-200 dark:border-purple-800/80 shadow-xs space-y-4">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-900/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#8A7CFA] text-white rounded-xl shadow-xs">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{language === 'bn' ? 'কিস্তি ও ইএমআই পরিকল্পনা (Installments & EMI Plan)' : 'Installments & EMI Plan'}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-purple-200/80 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 font-extrabold rounded-full">
                      Customizable
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'bn'
                      ? 'ডাউন পেমেন্ট, কিস্তির সংখ্যা এবং সময়কাল নির্ধারণ করুন'
                      : 'Set down payment, number of installments, and payment frequency'}
                  </p>
                </div>
              </div>

              {/* Quick Summary Pill */}
              <div className="flex items-center gap-2 text-xs font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-slate-700">
                <span className="text-slate-500">EMI:</span>
                <span className="font-mono text-purple-700 dark:text-purple-300 font-extrabold text-sm">
                  ৳ {emiPerPeriodAmount.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">/ {emiFrequency.toLowerCase()}</span>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Down Payment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>{language === 'bn' ? 'ডাউন পেমেন্ট (জমা)' : 'Down Payment'}</span>
                  <span className="text-[10px] text-purple-600 font-normal">
                    {totalAmount > 0 ? `${Math.round(((emiDownPayment || 0) / totalAmount) * 100)}%` : ''}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">৳</span>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    step="any"
                    value={emiDownPayment || ''}
                    onChange={e => setEmiDownPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#8A7CFA]"
                  />
                </div>

                {/* Down Payment Account / Wallet */}
                <div className="pt-1">
                  <select
                    value={emiDownPaymentWalletId}
                    onChange={e => setEmiDownPaymentWalletId(e.target.value)}
                    className="w-full appearance-none px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} (৳{w.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Total Installments Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {language === 'bn' ? 'মোট কিস্তির সংখ্যা' : 'Total Installments'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={emiTotalInstallments || ''}
                  onChange={e => setEmiTotalInstallments(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#8A7CFA]"
                />
                {/* Quick preset buttons */}
                <div className="flex items-center gap-1 pt-1 flex-wrap">
                  {[3, 6, 10, 12, 18, 24].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEmiTotalInstallments(preset)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        emiTotalInstallments === preset
                          ? 'bg-[#8A7CFA] text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-purple-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Installment Frequency */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {language === 'bn' ? 'কিস্তির সময়কাল' : 'Installment Frequency'}
                </label>
                <select
                  value={emiFrequency}
                  onChange={e => setEmiFrequency(e.target.value as InstallmentFrequency)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-[#8A7CFA]"
                >
                  <option value="MONTHLY">{language === 'bn' ? 'মাসিক (Monthly)' : 'Monthly'}</option>
                  <option value="WEEKLY">{language === 'bn' ? 'সাপ্তাহিক (Weekly)' : 'Weekly'}</option>
                  <option value="FORTNIGHTLY">{language === 'bn' ? '১৫ দিন পর পর (Fortnightly)' : 'Fortnightly'}</option>
                </select>

                {/* First Installment Date */}
                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 mb-0.5">
                    {language === 'bn' ? '১ম কিস্তির তারিখ:' : '1st Installment Date:'}
                  </div>
                  <input
                    type="date"
                    value={emiStartDate}
                    onChange={e => setEmiStartDate(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Interest Rate / Charge % */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>{language === 'bn' ? 'সুদ / মুনাফা / চার্জ (%)' : 'Interest / Profit (%)'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">%</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={emiInterestRate || ''}
                    onChange={e => setEmiInterestRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                    className="w-full pl-3 pr-7 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#8A7CFA]"
                  />
                </div>

                {/* Calculation Info */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 space-y-0.5">
                  <div>Principal: <strong className="font-mono text-slate-700 dark:text-slate-200">৳{emiPrincipalAmount.toLocaleString()}</strong></div>
                  {emiInterestRate > 0 && (
                    <div>Profit (+{emiInterestRate}%): <strong className="font-mono text-purple-600">৳{emiInterestAmount.toLocaleString()}</strong></div>
                  )}
                </div>
              </div>

            </div>

            {/* Financial Summary Highlight Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div className="text-[11px] text-slate-400">{language === 'bn' ? 'মোট বিক্রয় মূল্য' : 'Total Price'}</div>
                <div className="text-sm sm:text-base font-extrabold font-mono text-slate-800 dark:text-white mt-0.5">
                  ৳ {totalAmount.toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60">
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{language === 'bn' ? 'নগদ জমা (Down Payment)' : 'Down Payment'}</div>
                <div className="text-sm sm:text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                  ৳ {emiDownPayment.toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-purple-200/80 dark:border-purple-900/60">
                <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">{language === 'bn' ? 'প্রতি কিস্তি (EMI Amount)' : 'Per Installment'}</div>
                <div className="text-sm sm:text-base font-extrabold font-mono text-[#8A7CFA] dark:text-[#A79BFE] mt-0.5">
                  ৳ {emiPerPeriodAmount.toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-amber-200/80 dark:border-amber-900/60">
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{language === 'bn' ? 'মোট কিস্তির বকেয়া' : 'Total EMI Payable'}</div>
                <div className="text-sm sm:text-base font-extrabold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                  ৳ {emiTotalPayable.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Toggle Accordions: Guarantor Info & Schedule Preview */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-purple-100 dark:border-purple-900/40">
              <button
                type="button"
                onClick={() => setShowGuarantorFields(!showGuarantorFields)}
                className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-purple-100/60 dark:bg-purple-950/60 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'জামিনদার তথ্য (ঐচ্ছিক)' : 'Guarantor Info (Optional)'}</span>
                {showGuarantorFields ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={() => setShowEmiSchedulePreview(!showEmiSchedulePreview)}
                className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-indigo-100/60 dark:bg-indigo-950/60 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? `কিস্তির সময়সূচি প্রিভিউ (${emiTotalInstallments}টি)` : `Schedule Preview (${emiTotalInstallments})`}</span>
                {showEmiSchedulePreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Collapsible Guarantor Information */}
            {showGuarantorFields && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {language === 'bn' ? 'জামিনদারের নাম' : 'Guarantor Name'}
                  </label>
                  <input
                    type="text"
                    value={emiGuarantorName}
                    onChange={e => setEmiGuarantorName(e.target.value)}
                    placeholder="e.g. Md. Karim"
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#8A7CFA]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {language === 'bn' ? 'জামিনদারের মোবাইল' : 'Guarantor Phone'}
                  </label>
                  <input
                    type="text"
                    value={emiGuarantorPhone}
                    onChange={e => setEmiGuarantorPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#8A7CFA]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {language === 'bn' ? 'জাতীয় পরিচয়পত্র / NID' : 'Guarantor NID'}
                  </label>
                  <input
                    type="text"
                    value={emiGuarantorNid}
                    onChange={e => setEmiGuarantorNid(e.target.value)}
                    placeholder="NID Number"
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#8A7CFA]"
                  />
                </div>
              </div>
            )}

            {/* Collapsible Installment Schedule Table Preview */}
            {showEmiSchedulePreview && (
              <div className="max-h-60 overflow-y-auto rounded-xl border border-indigo-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-indigo-50/70 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-[11px] font-bold border-b border-indigo-100 dark:border-slate-700 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">{language === 'bn' ? 'পরিশোধের শেষ তারিখ' : 'Due Date'}</th>
                      <th className="py-2 px-3 text-right">{language === 'bn' ? 'কিস্তির পরিমাণ' : 'Installment Amount'}</th>
                      <th className="py-2 px-3 text-center">{language === 'bn' ? 'অবস্থা' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-mono text-[11px]">
                    {generatedSchedules.map((sch) => (
                      <tr key={sch.installmentNo} className="hover:bg-indigo-50/30 dark:hover:bg-slate-700/30">
                        <td className="py-1.5 px-3 font-bold text-slate-400">#{sch.installmentNo}</td>
                        <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300">{sch.dueDate}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-purple-700 dark:text-purple-300">
                          ৳ {sch.amount.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                            PENDING
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. MIDDLE SECTION: Payment Split (Left) & Totals Calculation (Right) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-4 items-start">
          
          {/* Left: Payment Type Split Box (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>{language === 'bn' ? 'পেমেন্ট মাধ্যম (Payment Method):' : 'Payment Type:'}</span>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {saleMode === 'INSTALLMENT' ? (
              <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-slate-700 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4" />
                    <span>{language === 'bn' ? 'কিস্তি ও ইএমআই মোড সক্রিয়' : 'Installment & EMI Plan Active'}</span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Down Payment: ৳{emiDownPayment.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'bn'
                    ? 'উপরের কিস্তি প্যানেলে ডাউন পেমেন্ট এবং কিস্তির বিবরণ সাজানো রয়েছে।'
                    : 'Down payment and installment schedule are configured in the EMI panel above.'}
                </p>
              </div>
            ) : (
              /* Split Payment Cards List */
              <div className="space-y-2">
                {paymentSplits.map((split, index) => (
                  <div
                    key={split.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-[#DCD6FE] dark:border-slate-700 shadow-2xs space-y-2 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Method Selector Dropdown */}
                      <div className="relative flex-1">
                        <select
                          value={split.method}
                          onChange={e => {
                            const val = e.target.value as PaymentMethod;
                            if (val === 'INSTALLMENT') {
                              setSaleMode('INSTALLMENT');
                            } else {
                              handleUpdatePaymentSplit(split.id, 'method', val);
                              // Auto-select a suitable wallet if method changes
                              if (val === 'CASH') {
                                const cashWallet = wallets.find(w => w.type === 'CASH')?.id;
                                if (cashWallet) handleUpdatePaymentSplit(split.id, 'walletId', cashWallet);
                              } else if (val === 'BANK') {
                                const bankWallet = wallets.find(w => w.type === 'BANK')?.id;
                                if (bankWallet) handleUpdatePaymentSplit(split.id, 'walletId', bankWallet);
                              }
                            }
                          }}
                          className="w-full appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-[#8A7CFA]"
                        >
                          <option value="CASH">Cash (নগদ)</option>
                          <option value="MFS">bKash / Nagad / Rocket (MFS)</option>
                          <option value="BANK">Bank Transfer / Card</option>
                          <option value="DUE">Due / Credit (বাকি)</option>
                          <option value="INSTALLMENT">📅 Installments & EMI Plan (কিস্তি)</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Wallet Selector Dropdown */}
                      {split.method !== 'DUE' && split.method !== 'INSTALLMENT' && (
                        <div className="relative flex-1">
                          <select
                            value={split.walletId}
                            onChange={e => handleUpdatePaymentSplit(split.id, 'walletId', e.target.value)}
                            className="w-full appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-[#8A7CFA]"
                          >
                            {wallets.filter(w => w.type === split.method).map(w => (
                              <option key={w.id} value={w.id}>
                                {w.name} {w.accountNumber ? `(${w.accountNumber})` : ''} (৳{w.balance.toLocaleString()})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      )}

                      {/* Trash icon for removing split if more than 1 */}
                      {paymentSplits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentSplit(split.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Remove payment split"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Split Amount input & Plus (+) button to add row */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={split.amount || ''}
                          onChange={e => handleUpdatePaymentSplit(split.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#8A7CFA]"
                        />
                      </div>

                      {/* Plus Icon at bottom-right of payment card as in screenshot */}
                      {index === paymentSplits.length - 1 && (
                        <button
                          type="button"
                          onClick={handleAddPaymentSplit}
                          className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-slate-700 hover:bg-purple-100 text-[#8A7CFA] flex items-center justify-center font-extrabold text-sm border border-purple-200 dark:border-slate-600 transition-colors cursor-pointer shrink-0"
                          title="Add Another Payment Split"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Checkbox: Send Due / EMI SMS */}
            <div className="pt-1 flex items-center gap-2">
              <input
                id="sendDueSms"
                type="checkbox"
                checked={sendDueSms}
                onChange={e => setSendDueSms(e.target.checked)}
                className="w-4 h-4 rounded text-[#8A7CFA] focus:ring-[#8A7CFA] border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <label htmlFor="sendDueSms" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                {saleMode === 'INSTALLMENT' ? (language === 'bn' ? 'গ্রাহককে কিস্তি নিশ্চিতকরণ SMS পাঠান' : 'Send Installment Confirmation SMS') : 'Send Due SMS'}
              </label>
            </div>
          </div>

          {/* Right: Calculations Box (5 Cols) */}
          <div className="lg:col-span-5 space-y-2.5">
            
            {/* Delivery Fee */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-28">
                Delivery Fee:
              </label>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                  ৳
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={deliveryFee || ''}
                  onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#8A7CFA]"
                />
              </div>
            </div>

            {/* Net Amount */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-28">
                Net Amount:
              </label>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                  ৳
                </span>
                <input
                  type="text"
                  readOnly
                  value={netAmount.toFixed(2)}
                  className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800/80 border border-[#DCD6FE] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Total Amount (Purple Tint Container as in Screenshot) */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 w-28">
                Total Amount:
              </label>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7CFA] font-mono text-xs font-bold">
                  ৳
                </span>
                <input
                  type="text"
                  readOnly
                  value={totalAmount.toFixed(2)}
                  className="w-full pl-7 pr-3 py-2.5 bg-[#EFEAFF] dark:bg-purple-950/40 border border-[#DCD6FE] dark:border-purple-800/60 rounded-xl text-sm sm:text-base font-mono font-extrabold text-[#7462F9] dark:text-[#A79BFE] focus:outline-none"
                />
              </div>
            </div>

            {/* Received and Due Summary Text */}
            <div className="pt-2 text-right space-y-1">
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {saleMode === 'INSTALLMENT' ? (language === 'bn' ? 'ডাউন পেমেন্ট জমা:' : 'Down Payment:') : 'Received:'}{' '}
                <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                  ৳ {totalReceivedAmount.toFixed(2)}
                </span>
              </div>
              
              {saleMode === 'INSTALLMENT' ? (
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  {language === 'bn' ? `কিস্তিতে প্রদেয় (${emiTotalInstallments}টি):` : `Payable via EMI (${emiTotalInstallments}x):`}{' '}
                  <span className="font-mono font-extrabold">৳ {emiTotalPayable.toFixed(2)}</span>
                </div>
              ) : dueAmount > 0 ? (
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Due Balance: <span className="font-mono font-extrabold">৳ {dueAmount.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. BOTTOM SECTION: Description (Left) & Image Upload Attachment (Right) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 border-t border-[#ECE8FF] dark:border-slate-800 items-stretch">
          
          {/* Description Textarea (10 Cols) */}
          <div className="lg:col-span-10 relative">
            <textarea
              rows={3}
              maxLength={250}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={saleMode === 'INSTALLMENT' ? 'Installment / Sale notes (e.g. Warranty details, terms)' : 'Description'}
              className="w-full p-3.5 bg-white dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#8A7CFA] resize-none"
            />
            {/* Character Counter */}
            <div className="absolute right-3.5 bottom-3 text-[11px] font-mono text-slate-400 select-none">
              {description.length}/250
            </div>
          </div>

          {/* Image Attachment Box (2 Cols) */}
          <div className="lg:col-span-2 relative">
            <label className="h-full min-h-[90px] flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border-2 border-dashed border-[#DCD6FE] dark:border-slate-700 hover:border-[#8A7CFA] rounded-2xl cursor-pointer transition-colors group">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {attachedImage ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={attachedImage}
                    alt="Attached Slip"
                    className="max-h-16 rounded object-contain"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setAttachedImage(null);
                    }}
                    className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-xs cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center text-center">
                  <div className="relative">
                    <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 group-hover:text-[#8A7CFA] transition-colors" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8A7CFA] text-white rounded-full flex items-center justify-center text-[10px] font-extrabold">
                      +
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium mt-1">Attachment</span>
                </div>
              )}
            </label>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 7. BOTTOM ACTION BUTTONS: Save and New & Save */}
        {/* ========================================================================= */}
        <div className="pt-6 flex items-center justify-end gap-3">
          
          {/* Save and New Button */}
          <button
            type="button"
            onClick={() => handleSaveInvoice(true)}
            className="px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#DCD6FE] dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer"
          >
            Save and New
          </button>

          {/* Save Button (Vibrant Purple Pill Button) */}
          <button
            type="button"
            onClick={() => handleSaveInvoice(false)}
            className="px-8 py-2.5 bg-[#8A7CFA] hover:bg-[#7868F7] active:bg-[#6856E8] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>
              {saleMode === 'INSTALLMENT' ? (language === 'bn' ? 'কিস্তি বিক্রয় সংরক্ষণ ও প্রিন্ট' : 'Save EMI & Print') : 'Save & Print'}
            </span>
          </button>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 8. CATALOG BROWSER MODAL (POPUP QUICK PICKER) */}
      {/* ========================================================================= */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-indigo-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden text-xs">
            
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="w-5 h-5 text-indigo-300" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {language === 'bn' ? 'পণ্য ক্যাটালগ ও দ্রুত সিলেকশন' : 'Product Catalog Quick Picker'}
                  </h3>
                  <p className="text-[11px] text-indigo-200">
                    {language === 'bn' ? 'যেকোনো পণ্যে ক্লিক করে সরাসরি চালানে যোগ করুন' : 'Click on any product to quickly add to current sale'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Controls */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder={language === 'bn' ? 'পণ্য বা বারকোড খুঁজুন...' : 'Search products or barcode...'}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setCatalogCategory('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 transition-colors cursor-pointer ${
                    catalogCategory === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  All ({products.length})
                </button>
                {categories.map(c => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCatalogCategory(c.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 transition-colors cursor-pointer ${
                      catalogCategory === c.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="p-4 flex-1 overflow-y-auto">
              {filteredCatalogProducts.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No products found'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredCatalogProducts.map(prod => {
                    const inCart = items.find(i => i.productId === prod.id);
                    const expired = isProductExpired(prod);
                    const batchSummary = getProductBatchStockSummary(prod);

                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleQuickAddProduct(prod)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                          expired
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 opacity-80'
                            : inCart
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">{prod.sku}</span>
                            {expired ? (
                              <span className="px-1.5 py-0.5 bg-rose-600 text-white font-mono text-[9px] font-extrabold rounded-md shadow-2xs">
                                Expired
                              </span>
                            ) : inCart ? (
                              <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-mono text-[10px] font-extrabold rounded-md shadow-2xs">
                                ✓ {inCart.quantity}
                              </span>
                            ) : null}
                          </div>

                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-2 border border-slate-100" />
                          ) : (
                            <div className={`w-full h-20 rounded-lg mb-2 flex items-center justify-center font-bold text-lg ${
                              expired ? 'bg-rose-100 text-rose-500 dark:bg-rose-950/50' : 'bg-indigo-50 dark:bg-slate-700/50 text-indigo-400 dark:text-indigo-300'
                            }`}>
                              {prod.name.charAt(0)}
                            </div>
                          )}

                          <h4 className="font-bold text-xs text-slate-800 dark:text-white line-clamp-2">
                            {prod.name}
                          </h4>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            Stock: <strong className={prod.stock <= prod.minStockAlert ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'}>{Number(prod.stock)} {prod.unit}</strong>
                            {batchSummary.hasBatches && (
                              <div className="text-[9px]">
                                সচল: <strong className="text-emerald-600 dark:text-emerald-400">{batchSummary.validStock}</strong>
                                {batchSummary.expiredStock > 0 && (
                                  <>, মেয়াদ শেষ: <strong className="text-rose-600 dark:text-rose-400">{batchSummary.expiredStock}</strong></>
                                )}
                              </div>
                            )}
                            {prod.expDate && (
                              <div className={expired ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                Exp: {prod.expDate} {expired && `(${language === 'bn' ? 'মেয়াদ শেষ' : 'Expired'})`}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                          <div className="font-mono font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                            ৳{prod.salesPrice.toLocaleString()}
                          </div>
                          {expired ? (
                            <button
                              type="button"
                              className="px-2 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold text-[10px] rounded-lg shadow-2xs cursor-not-allowed flex items-center gap-1"
                            >
                              <span>{language === 'bn' ? 'বিক্রয় নিষিদ্ধ' : 'Blocked'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Current Items in Bill: <strong className="text-indigo-600 font-bold font-mono">{items.filter(i => i.productId).length}</strong> | Total: <strong className="text-indigo-600 font-bold font-mono">৳{totalAmount.toLocaleString()}</strong>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Done (চালানে ফিরে যান)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Held Bills Modal */}
      {isHeldBillsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-slate-800 dark:text-white">
                  {language === 'bn' ? 'স্থগিত বিলসমূহ (Held Bills)' : 'Held Bills'} ({heldBills.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHeldBillsModalOpen(false)}
                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {heldBills.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  {language === 'bn' ? 'কোনো স্থগিত বিল নেই' : 'No held bills'}
                </div>
              ) : (
                heldBills.map((h, idx) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-white">
                        {h.customerName}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{h.itemCount} {language === 'bn' ? 'আইটেম' : 'items'}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">৳{h.subtotal.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRecallHeldBill(h)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Recall to cart"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'রিকল' : 'Recall'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHeldBill(h.id)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded-lg cursor-pointer transition-colors"
                        title="Delete held bill"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHeldBillsModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs cursor-pointer"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Quotation Modal */}
      {isQuotationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border-b border-sky-200 dark:border-sky-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="font-bold text-slate-800 dark:text-white">
                  {language === 'bn' ? 'কোটেশন থেকে সেল চালানে লোড করুন' : 'Import from Price Quotation'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuotationModalOpen(false)}
                className="p-1 hover:bg-sky-100 dark:hover:bg-sky-900 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {quotations.filter(q => q.status !== 'CANCELLED').length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  {language === 'bn' ? 'কোনো সক্রিয় কোটেশন পাওয়া যায়নি' : 'No active quotations available'}
                </div>
              ) : (
                quotations
                  .filter(q => q.status !== 'CANCELLED')
                  .map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                            #{q.quotationNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            q.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            q.status === 'SENT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {q.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <strong>{q.customerName}</strong> {q.customerPhone ? `(${q.customerPhone})` : ''} • {q.items?.length || 0} items
                        </div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                          {formatCurrency(q.grandTotal)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImportQuotation(q)}
                        className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                      >
                        {language === 'bn' ? 'লোডিং করুন' : 'Load to Cart'}
                      </button>
                    </div>
                  ))
              )}
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsQuotationModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs cursor-pointer"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode & QR Code Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onBarcodeDetected={handleBarcodeScanned}
        products={products}
      />

    </div>
  );
};
