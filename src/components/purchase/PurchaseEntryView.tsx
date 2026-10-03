import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Product, PaymentMethod, UnitType, PurchaseInvoice } from '../../types';
import { CameraBarcodeScannerModal } from '../common/CameraBarcodeScannerModal';
import confetti from 'canvas-confetti';
import {
  Search,
  Barcode,
  Camera,
  Trash2,
  Plus,
  UserPlus,
  Info,
  Calendar,
  Image as ImageIcon,
  Check,
  FileText,
  Printer,
  ChevronDown,
  X,
  Truck,
  Building,
  LayoutGrid,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface PurchaseEntryViewProps {
  onOpenNewSupplierModal: () => void;
  initialData?: PurchaseInvoice | null;
  onCancelEdit?: () => void;
}

interface PurchaseRowItem {
  id: string;
  productId: string;
  name: string;
  nameBn?: string;
  barcode: string;
  unit: UnitType;
  quantity: number;
  purchasePrice: number;
  discount: number;
  discountType: 'flat' | 'percentage';
  taxPercent: number;
  stock: number;
  total: number;
  batchNumber?: string;
  expDate?: string;
}

interface SplitPaymentRow {
  id: string;
  method: PaymentMethod;
  walletId: string;
  amount: number;
}

export const PurchaseEntryView: React.FC<PurchaseEntryViewProps> = ({
  onOpenNewSupplierModal,
  initialData,
  onCancelEdit,
}) => {
  const {
    language,
    products,
    categories,
    parties,
    wallets,
    purchaseInvoices,
    getNextPurchaseBillNumber,
    formatCurrency,
    createPurchaseInvoice,
    deletePurchaseInvoice,
    openPrintModal,
    showToast,
    setActiveTab,
  } = useApp();
  const { t } = useTranslation(language);

  // Top Controls: Cash vs Credit Toggle
  const [purchaseMode, setPurchaseMode] = useState<'CASH' | 'CREDIT'>(initialData?.dueAmount ? 'CREDIT' : 'CASH');

  // Supplier / Party Selection
  const suppliers = useMemo(() => parties.filter(p => p.type === 'SUPPLIER'), [parties]);
  const [searchSupplierQuery, setSearchSupplierQuery] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialData?.supplierId || suppliers[0]?.id || '');

  // Invoice / Challan Meta
  const [invoiceNo, setInvoiceNo] = useState<string>(() => {
    if (initialData?.supplierInvoiceNo) return initialData.supplierInvoiceNo;
    if (initialData?.billNumber) return initialData.billNumber;
    return getNextPurchaseBillNumber ? getNextPurchaseBillNumber() : 'PUR-2026-0001';
  });

  // Real-time duplicate check for purchase invoice / bill number
  const trimmedInvoiceNo = invoiceNo.trim();
  const duplicatePurchase = useMemo(() => {
    if (!trimmedInvoiceNo) return null;
    return (
      purchaseInvoices.find(
        p =>
          p.id !== initialData?.id &&
          ((p.billNumber && p.billNumber.trim().toLowerCase() === trimmedInvoiceNo.toLowerCase()) ||
            (p.supplierInvoiceNo && p.supplierInvoiceNo.trim().toLowerCase() === trimmedInvoiceNo.toLowerCase()))
      ) || null
    );
  }, [trimmedInvoiceNo, purchaseInvoices, initialData]);
  
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    if (initialData?.date) return initialData.date;
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Table Rows for items
  const [items, setItems] = useState<PurchaseRowItem[]>(
    initialData
      ? initialData.items.map((i, idx) => ({ ...i, id: `row-${idx}`, barcode: '', discount: 0, discountType: 'flat', taxPercent: 0, stock: 0, batchNumber: i.batchNumber || '', expDate: i.expDate || '' }))
      : [
          {
            id: 'row-1',
            productId: '',
            name: '',
            barcode: '',
            unit: 'Pcs',
            quantity: 1,
            purchasePrice: 0,
            discount: 0,
            discountType: 'flat',
            taxPercent: 0,
            stock: 0,
            total: 0,
            batchNumber: '',
            expDate: '',
          },
        ]
  );

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
  const [paymentSplits, setPaymentSplits] = useState<SplitPaymentRow[]>(
    initialData && initialData.paidAmount > 0
      ? [
          {
            id: 'pay-1',
            method: initialData.paymentMethod,
            walletId: initialData.walletId,
            amount: initialData.paidAmount,
          },
        ]
      : [
          {
            id: 'pay-1',
            method: 'CASH',
            walletId: wallets[0]?.id || 'w-cash',
            amount: 0,
          },
        ]
  );

  // Delivery / Net / Description / Attachment
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [sendSupplierSms, setSendSupplierSms] = useState<boolean>(false);
  const [description, setDescription] = useState<string>(initialData?.notes || '');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Selected supplier object
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
  }, [selectedSupplierId, suppliers]);

  // Filtered supplier list for autocomplete
  const filteredSuppliers = useMemo(() => {
    if (!searchSupplierQuery.trim()) return suppliers;
    const q = searchSupplierQuery.toLowerCase();
    return suppliers.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.serialNumber && s.serialNumber.toLowerCase().includes(q))
    );
  }, [suppliers, searchSupplierQuery]);

  // Filtered products for top quick selector
  const filteredTopProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedTopCategory === 'ALL' || p.categoryId === selectedTopCategory;
      if (!topProductSearchQuery.trim()) {
        return matchesCat;
      }
      const q = topProductSearchQuery.toLowerCase();
      return (
        matchesCat &&
        (p.name.toLowerCase().includes(q) ||
          (p.nameBn && p.nameBn.toLowerCase().includes(q)) ||
          p.barcode.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q))
      );
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
          p.sku.toLowerCase().includes(q))
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
        : ((item.purchasePrice * item.quantity) * (item.discount || 0)) / 100;
      return sum + lineDisc;
    }, 0);
  }, [items]);

  const netAmount = Math.max(0, itemsSubtotal);
  const totalAmount = Math.max(0, netAmount + (deliveryFee || 0));

  // Compute Total Paid from payment splits
  const totalPaidAmount = useMemo(() => {
    if (purchaseMode === 'CREDIT' && paymentSplits.length === 1 && paymentSplits[0].amount === 0) {
      return 0;
    }
    return paymentSplits.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [paymentSplits, purchaseMode]);

  // Auto-sync cash payment amount if purchaseMode is CASH and single payment row
  useEffect(() => {
    if (purchaseMode === 'CASH') {
      setPaymentSplits(prev => {
        if (prev.length === 1) {
          return [{ ...prev[0], amount: totalAmount }];
        }
        return prev;
      });
    } else {
      // In credit mode, default first row to 0 if not edited
      setPaymentSplits(prev => {
        if (prev.length === 1 && prev[0].amount === totalAmount && totalAmount > 0) {
          return [{ ...prev[0], amount: 0 }];
        }
        return prev;
      });
    }
  }, [totalAmount, purchaseMode]);

  const dueAmount = Math.max(0, totalAmount - totalPaidAmount);

  // Handle row item value changes
  const handleItemChange = (
    rowId: string,
    field: keyof PurchaseRowItem,
    value: any
  ) => {
    setItems(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row;
        
        let parsedValue = value;
        if (typeof value === 'string' && ['quantity', 'purchasePrice', 'discount'].includes(field as string)) {
          parsedValue = value.replace(/^0+(?=\d)/, '');
        }
        
        const updated = { ...row, [field]: parsedValue };

        const qty = field === 'quantity' ? Math.max(0, parseFloat(parsedValue) || 0) : row.quantity;
        const price = field === 'purchasePrice' ? Math.max(0, parseFloat(parsedValue) || 0) : row.purchasePrice;
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
    setItems(prev => {
      const updated = prev.map(row => {
        if (row.id !== rowId) return row;
        const costPrice = product.purchasePrice || 0;
        const linePrice = Math.max(0, costPrice - row.discount);

        return {
          ...row,
          productId: product.id,
          name: product.name,
          nameBn: product.nameBn,
          barcode: product.barcode,
          unit: product.unit,
          quantity: row.quantity || 1,
          purchasePrice: costPrice,
          discount: 0,
          discountType: 'flat',
          taxPercent: 0,
          stock: product.stock,
          total: (row.quantity || 1) * linePrice,
          batchNumber: row.batchNumber || product.batchNumber || '',
          expDate: row.expDate || product.expDate || '',
        };
      });

      // Automatically append a blank row for seamless typing if this was last row
      const lastRow = updated[updated.length - 1];
      if (lastRow && lastRow.id === rowId) {
        updated.push({
          id: `row-${Date.now()}`,
          productId: '',
          name: '',
          barcode: '',
          unit: 'Pcs',
          quantity: 1,
          purchasePrice: 0,
          discount: 0,
          discountType: 'flat',
          taxPercent: 0,
          stock: 0,
          total: 0,
          batchNumber: '',
          expDate: '',
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
        purchasePrice: 0,
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
      setItems([
        {
          id: `row-${Date.now()}`,
          productId: '',
          name: '',
          barcode: '',
          unit: 'Pcs',
          quantity: 1,
          purchasePrice: 0,
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
    const remainingToPay = Math.max(0, totalAmount - totalPaidAmount);
    setPaymentSplits(prev => [
      ...prev,
      {
        id: `pay-${Date.now()}`,
        method: 'BANK',
        walletId: wallets.find(w => w.type === 'BANK')?.id || wallets[0]?.id || 'w-cash',
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
    // If product already in items, increase quantity by 1
    const existingIdx = items.findIndex(i => i.productId === product.id);
    if (existingIdx >= 0) {
      const newQty = (items[existingIdx].quantity || 0) + 1;
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
          purchasePrice: product.purchasePrice,
          discount: 0,
          discountType: 'flat',
          taxPercent: 0,
          stock: product.stock,
          total: product.purchasePrice,
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
      const existingIdx = items.findIndex(i => i.productId === match.id);
      if (existingIdx >= 0) {
        handleItemChange(items[existingIdx].id, 'quantity', items[existingIdx].quantity + 1);
        showToast(`Added 1 more "${match.name}"`, 'info');
      } else {
        const emptyRow = items.find(i => !i.productId);
        if (emptyRow) {
          handleSelectProductForRow(emptyRow.id, match);
        } else {
          const newRowId = `row-${Date.now()}`;
          setItems(prev => [
            ...prev,
            {
              id: newRowId,
              productId: match.id,
              name: match.name,
              barcode: match.barcode,
              unit: match.unit,
              quantity: 1,
              purchasePrice: match.purchasePrice,
              discount: 0,
              discountType: 'flat',
              taxPercent: 0,
              stock: match.stock,
              total: match.purchasePrice,
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
        purchasePrice: 0,
        discount: 0,
        discountType: 'flat',
        taxPercent: 0,
        stock: 0,
        total: 0,
      },
    ]);
    setSearchSupplierQuery('');
    setDeliveryFee(0);
    setDescription('');
    setAttachedImage(null);
    setInvoiceNo(getNextPurchaseBillNumber ? getNextPurchaseBillNumber() : 'PUR-2026-0001');
    setPaymentSplits([
      {
        id: `pay-${Date.now()}`,
        method: 'CASH',
        walletId: wallets[0]?.id || 'w-cash',
        amount: 0,
      },
    ]);
  };

  // Submit Save Purchase
  const handleSavePurchase = (isSaveAndNew = false) => {
    if (!selectedSupplierId) {
      showToast(language === 'bn' ? 'সাপ্লায়ার / মহাজন নির্বাচন করুন!' : 'Please select a supplier!', 'warning');
      return;
    }

    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      showToast(language === 'bn' ? 'অন্তত একটি পণ্য নির্বাচন করুন!' : 'Please add at least one product!', 'warning');
      return;
    }

    // Duplicate Invoice No Check
    if (duplicatePurchase) {
      showToast(
        language === 'bn'
          ? `আগে থেকে এই Invoice No এন্ট্রি আছে! (${duplicatePurchase.supplierName} - চালান #${duplicatePurchase.billNumber})। একই ইনভয়েস নং দুইবার এন্ট্রি হবে না।`
          : `This Invoice No is already entered previously! (${duplicatePurchase.supplierName} - #${duplicatePurchase.billNumber}). Duplicate entry not allowed.`,
        'error'
      );
      return;
    }

    // Check wallet balance for any paid amount
    if (totalPaidAmount > 0) {
      for (const split of paymentSplits) {
        if (split.amount > 0 && split.method !== 'DUE') {
          const splitWallet = wallets.find(w => w.id === split.walletId) || wallets[0];
          if (!splitWallet || splitWallet.balance < split.amount) {
            showToast(
              language === 'bn'
                ? `"${splitWallet?.name || 'ওয়ালেট'}"-এ পর্যাপ্ত টাকা নেই! বর্তমান ব্যালেন্স: ৳${splitWallet?.balance.toLocaleString() || 0} | পরিশোধ: ৳${split.amount.toLocaleString()}। ক্রয়টি বাকি (Credit) হিসেবে এন্ট্রি করুন অথবা ওয়ালেট পরিবর্তন করুন।`
                : `Insufficient balance in "${splitWallet?.name || 'wallet'}"! Available: ৳${splitWallet?.balance.toLocaleString() || 0} | Trying to pay: ৳${split.amount.toLocaleString()}. Please choose another wallet or save as credit.`,
              'error'
            );
            return;
          }
        }
      }
    }

    const purchaseItems = validItems.map(vi => ({
      productId: vi.productId,
      productName: vi.name,
      unit: vi.unit,
      quantity: Number(vi.quantity),
      purchasePrice: Number(vi.purchasePrice),
      total: Number(vi.total),
      batchNumber: vi.batchNumber || '',
      expDate: vi.expDate || '',
    }));

    const primaryPayment = paymentSplits[0] || { method: 'CASH', walletId: wallets[0]?.id || 'w-cash' };

    const newPurchase = createPurchaseInvoice({
      supplierId: selectedSupplier?.id || '',
      supplierName: selectedSupplier?.name || 'Supplier',
      supplierPhone: selectedSupplier?.phone || '',
      billNumber: trimmedInvoiceNo || undefined,
      supplierInvoiceNo: trimmedInvoiceNo || undefined,
      items: purchaseItems,
      subtotal: itemsSubtotal,
      discount: totalDiscount,
      taxAmount: 0,
      grandTotal: totalAmount,
      paidAmount: totalPaidAmount,
      dueAmount: dueAmount,
      paymentMethod: primaryPayment.method,
      walletId: primaryPayment.walletId,
      notes: description + (deliveryFee > 0 ? ` (Shipping Fee: ৳${deliveryFee})` : ''),
      date: invoiceDate,
    });

    if (!newPurchase) return;

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {
      // ignore
    }

    if (!isSaveAndNew) {
      openPrintModal({
        type: 'PURCHASE_VOUCHER',
        title: `Purchase Bill #${newPurchase.billNumber}`,
        data: newPurchase,
      });
    }

    showToast(
      language === 'bn' ? 'ক্রয় চালান সফলভাবে সংরক্ষিত হয়েছে!' : 'Purchase bill created successfully!',
      'success'
    );

    handleResetForm();
  };

  return (
    <div className="w-full space-y-4 pb-12">
      
      {/* Main Container Card Matching Exact Screenshot Design */}
      <div className="bg-[#FAF9FE] dark:bg-slate-900/90 rounded-2xl border border-[#ECE8FF] dark:border-slate-800 shadow-sm overflow-hidden p-4 sm:p-6 transition-all">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER: Title & Cash/Credit Switch */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#ECE8FF] dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              {language === 'bn' ? 'নতুন ক্রয় (New Purchase)' : 'New Purchase'}
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('purchase-list')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ক্রয় তালিকা' : 'Purchase List'}</span>
            </button>
          </div>

          {/* Right: Cash vs Credit Toggle Switch */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 px-4 py-1.5 rounded-full border border-[#ECE8FF] dark:border-slate-700 shadow-2xs">
            <span
              onClick={() => setPurchaseMode('CASH')}
              className={`text-xs font-bold cursor-pointer transition-colors ${
                purchaseMode === 'CASH' ? 'text-[#8271FE] dark:text-[#A79BFE]' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              Cash
            </span>

            {/* Toggle Switch Component */}
            <button
              type="button"
              onClick={() => setPurchaseMode(purchaseMode === 'CASH' ? 'CREDIT' : 'CASH')}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                purchaseMode === 'CASH' ? 'bg-[#8A7CFA]' : 'bg-[#CBD5E1] dark:bg-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  purchaseMode === 'CASH' ? 'translate-x-0' : 'translate-x-5'
                }`}
              />
            </button>

            <span
              onClick={() => setPurchaseMode('CREDIT')}
              className={`text-xs font-bold cursor-pointer transition-colors ${
                purchaseMode === 'CREDIT' ? 'text-[#8271FE] dark:text-[#A79BFE]' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              Credit
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TOP INFORMATION ROW: Search Party (Supplier), Invoice No & Invoice Date */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-4 items-center">
          
          {/* Search Party (Left - 6 Cols) */}
          <div className="lg:col-span-6 relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={selectedSupplier ? selectedSupplier.name : searchSupplierQuery}
                  onChange={e => {
                    setSearchSupplierQuery(e.target.value);
                    setShowSupplierDropdown(true);
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  placeholder="Search Party (Supplier / মহাজন)"
                  className="w-full pl-3.5 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#8A7CFA] focus:ring-1 focus:ring-[#8A7CFA]"
                />
                
                {selectedSupplier ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSupplierId('');
                      setSearchSupplierQuery('');
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
                title="Select supplier to record purchase bill and ledger payables"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Supplier Search Autocomplete Dropdown */}
            {showSupplierDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-[#DCD6FE] dark:border-slate-700 py-1.5 z-40 max-h-60 overflow-y-auto text-xs">
                <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[11px] font-bold uppercase">
                  <span>Select Supplier</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSupplierDropdown(false);
                      onOpenNewSupplierModal();
                    }}
                    className="text-[#8A7CFA] hover:underline font-bold normal-case flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add New Supplier</span>
                  </button>
                </div>

                {filteredSuppliers.map(sup => (
                  <div
                    key={sup.id}
                    onClick={() => {
                      setSelectedSupplierId(sup.id);
                      setSearchSupplierQuery(sup.name);
                      setShowSupplierDropdown(false);
                    }}
                    className="px-3.5 py-2 hover:bg-purple-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between border-t border-slate-50 dark:border-slate-700/40"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <span>{sup.name}</span>
                        {sup.serialNumber && (
                          <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.2 rounded border border-sky-200 dark:border-sky-800">
                            #{sup.serialNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{sup.phone || 'No phone'}</div>
                    </div>
                    {sup.currentBalance > 0 && (
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                        We Owe: ৳{sup.currentBalance}
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
                    {language === 'bn' ? 'চালান / Invoice No' : 'Invoice / Bill No'}
                  </label>
                  <span className="px-1.5 py-0.2 text-[10px] font-medium rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {language === 'bn' ? 'ম্যানুয়াল এন্ট্রি' : 'Manual Entry'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInvoiceNo(getNextPurchaseBillNumber ? getNextPurchaseBillNumber() : `PUR-2026-${Date.now().toString().slice(-4)}`)}
                  title={language === 'bn' ? 'নতুন অটো ইনভয়েস নং জেনারেট করুন' : 'Generate next auto bill number'}
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
                  placeholder={language === 'bn' ? 'উদাঃ PUR-2026-0001 বা মেমো নং' : 'e.g. PUR-2026-0001 or memo no'}
                  className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none transition-all ${
                    duplicatePurchase
                      ? 'border-red-500 focus:border-red-600 bg-red-50/40 dark:bg-red-950/20 ring-2 ring-red-200 dark:ring-red-950/50'
                      : 'border-[#DCD6FE] dark:border-slate-700 focus:border-[#8A7CFA]'
                  }`}
                />
              </div>
              {duplicatePurchase && (
                <div className="flex items-start gap-1 text-[11px] text-red-600 dark:text-red-400 font-medium leading-tight">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    {language === 'bn'
                      ? `⚠️ আগে থেকে এই নং এন্ট্রি আছে! (${duplicatePurchase.supplierName} - #${duplicatePurchase.billNumber})`
                      : `⚠️ This Invoice No is already entered previously! (${duplicatePurchase.supplierName} - #${duplicatePurchase.billNumber})`}
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
                      ? '⚡ দ্রুত ক্রয় পণ্য সার্চ করুন ও যোগ করুন (নাম, বারকোড বা SKU)...'
                      : '⚡ Quick Search & Add Purchase Product (Name, Barcode, SKU)...'
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
                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleQuickAddProduct(prod)}
                          className="px-3.5 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between border-b border-slate-50 dark:border-slate-700/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                                {prod.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                                <span>{prod.name}</span>
                                {inCart && (
                                  <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold rounded">
                                    ✓ {inCart.quantity} in bill
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                Stock: <strong className={prod.stock <= prod.minStockAlert ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'}>{Number(prod.stock)} {prod.unit}</strong> | SKU: {prod.sku}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                              Cost: ৳{prod.purchasePrice.toLocaleString()}
                            </div>
                            <span className="text-[10px] text-indigo-500 font-semibold hover:underline">
                              + Add to Purchase
                            </span>
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
                className="px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title={language === 'bn' ? 'ক্যামেরা দিয়ে বারকোড স্ক্যান করুন' : 'Scan Barcodes with Device Camera'}
              >
                <Camera className="w-4 h-4" />
                <span>{language === 'bn' ? '📷 ক্যামেরা স্ক্যান' : 'Camera Scan'}</span>
              </button>

              {/* Scan Barcode button */}
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
                  <th className="py-2.5 px-3 w-8 text-center">Sl</th>
                  <th className="py-2.5 px-3 min-w-[200px]">
                    <div className="flex items-center gap-1">
                      <span>Item</span>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-2 w-24 text-center">Batch No</th>
                  <th className="py-2.5 px-2 w-28 text-center">Exp Date</th>
                  <th className="py-2.5 px-3 w-20 text-center">Quantity</th>
                  <th className="py-2.5 px-3 w-16 text-center">Unit</th>
                  <th className="py-2.5 px-3 w-24 text-right">Price</th>
                  <th className="py-2.5 px-3 w-20 text-right">Discount</th>
                  <th className="py-2.5 px-3 w-24 text-right">Net Amount</th>
                  <th className="py-2.5 px-2 w-8 text-center"></th>
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

                        {/* Product Autocomplete Dropdown */}
                        {activeItemRowSearch === row.id && (
                          <div className="absolute left-3 top-full mt-1 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-[#DCD6FE] dark:border-slate-700 py-1.5 z-50 max-h-56 overflow-y-auto">
                            <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                              <span>Select Product to Purchase</span>
                              <button
                                type="button"
                                onClick={() => setActiveItemRowSearch(null)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                ✕
                              </button>
                            </div>

                            {products
                              .filter(p =>
                                !itemSearchQuery ||
                                p.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                                p.barcode.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                                p.sku.toLowerCase().includes(itemSearchQuery.toLowerCase())
                              )
                              .map(prod => (
                                <div
                                  key={prod.id}
                                  onClick={() => handleSelectProductForRow(row.id, prod)}
                                  className="px-3 py-2 hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50"
                                >
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-white">{prod.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      Current Stock: {Number(prod.stock)} {prod.unit} | SKU: {prod.sku}
                                    </div>
                                  </div>
                                  <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                                    ৳{prod.purchasePrice}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </td>

                      {/* Batch Number */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="text"
                          value={row.batchNumber || ''}
                          onChange={e => handleItemChange(row.id, 'batchNumber', e.target.value)}
                          placeholder="e.g. B-01"
                          className="w-full px-2 py-1.5 bg-[#FAF9FE] dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-lg text-[11px] font-mono text-center focus:outline-none focus:border-[#8A7CFA]"
                          title="Batch / Lot Number"
                        />
                      </td>

                      {/* Expiry Date */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="date"
                          value={row.expDate || ''}
                          onChange={e => handleItemChange(row.id, 'expDate', e.target.value)}
                          className="w-full px-1 py-1.5 bg-[#FAF9FE] dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-lg text-[11px] font-mono text-center focus:outline-none focus:border-[#8A7CFA]"
                          title="Expiry Date"
                        />
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

                      {/* Purchase Price */}
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.purchasePrice || ''}
                          onChange={e => handleItemChange(row.id, 'purchasePrice', e.target.value)}
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
        {/* 4. MIDDLE SECTION: Payment Split (Left) & Totals Calculation (Right) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-4 items-start">
          
          {/* Left: Payment Type Split Box (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>Payment Type:</span>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Split Payment Cards List */}
            <div className="space-y-2">
              {paymentSplits.map((split, index) => {
                const isDue = split.method === 'DUE';
                const splitWallet = wallets.find(w => w.id === split.walletId) || wallets[0];
                const isInsufficient = !isDue && split.amount > 0 && split.amount > (splitWallet?.balance || 0);

                return (
                  <div
                    key={split.id}
                    className={`p-3 rounded-xl border shadow-2xs space-y-2 relative transition-all ${
                      isInsufficient
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-800'
                        : 'bg-white dark:bg-slate-800 border-[#DCD6FE] dark:border-slate-700'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Method Selector Dropdown */}
                      <div className="relative">
                        <select
                          value={split.method}
                          onChange={e => {
                            const newMethod = e.target.value as PaymentMethod;
                            let matchingWalletId = split.walletId;
                            if (newMethod === 'CASH') {
                              matchingWalletId = wallets.find(w => w.type === 'CASH')?.id || wallets[0]?.id || 'w-cash';
                            } else if (newMethod === 'BANK') {
                              matchingWalletId = wallets.find(w => w.type === 'BANK')?.id || wallets[0]?.id || 'w-cash';
                            } else if (newMethod === 'MFS') {
                              matchingWalletId = wallets.find(w => w.type === 'MFS')?.id || wallets[0]?.id || 'w-cash';
                            }
                            handleUpdatePaymentSplit(split.id, 'method', newMethod);
                            handleUpdatePaymentSplit(split.id, 'walletId', matchingWalletId);
                          }}
                          className="w-full appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-[#DCD6FE] dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-[#8A7CFA]"
                        >
                          <option value="CASH">Cash (নগদ)</option>
                          <option value="BANK">Bank Transfer / Card</option>
                          <option value="MFS">bKash / Nagad / Rocket (MFS)</option>
                          <option value="DUE">Due / বাকি (Credit)</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Wallet Selector if not DUE */}
                      {!isDue ? (
                        <div className="relative">
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
                      ) : (
                        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-center">
                          {language === 'bn' ? 'সাপ্লায়ার বাকি হিসেবে যোগ হবে' : 'Will be added as supplier due'}
                        </div>
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
                          className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-white focus:outline-none ${
                            isInsufficient
                              ? 'border-rose-500 text-rose-600 focus:border-rose-500'
                              : 'border-[#DCD6FE] dark:border-slate-700 focus:border-[#8A7CFA]'
                          }`}
                        />
                      </div>

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

                      {/* Plus Icon at bottom-right of payment card */}
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

                    {/* Insufficient Funds Warning inside split row */}
                    {isInsufficient && (
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 pt-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                        <span>
                          {language === 'bn'
                            ? `"${splitWallet?.name}"-এ অপর্যাপ্ত ব্যালেন্স! বর্তমান ব্যালেন্স: ৳${splitWallet?.balance.toLocaleString()}`
                            : `Insufficient funds in "${splitWallet?.name}"! Available: ৳${splitWallet?.balance.toLocaleString()}`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Checkbox: Send Supplier Notification */}
            <div className="pt-1 flex items-center gap-2">
              <input
                id="sendSupplierSms"
                type="checkbox"
                checked={sendSupplierSms}
                onChange={e => setSendSupplierSms(e.target.checked)}
                className="w-4 h-4 rounded text-[#8A7CFA] focus:ring-[#8A7CFA] border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <label htmlFor="sendSupplierSms" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                Send Purchase SMS to Supplier
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
                Paid: <span className="font-mono font-extrabold text-sky-600 dark:text-sky-400">৳ {totalPaidAmount.toFixed(2)}</span>
              </div>
              {dueAmount > 0 && (
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Supplier Payable Due: <span className="font-mono font-extrabold">৳ {dueAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. BOTTOM SECTION: Description (Left) & Image Upload Attachment (Right) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 border-t border-[#ECE8FF] dark:border-slate-800 items-stretch">
          
          {/* Description Textarea (10 Cols) */}
          <div className="lg:col-span-10 relative">
            <textarea
              rows={3}
              maxLength={250}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (Supplier notes, transport details, etc.)"
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
                    alt="Attached Challan"
                    className="max-h-16 rounded object-contain"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setAttachedImage(null);
                    }}
                    className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-xs"
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
                  <span className="text-[10px] text-slate-400 font-medium mt-1">Challan Slip</span>
                </div>
              )}
            </label>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 6. BOTTOM ACTION BUTTONS: Save and New & Save */}
        {/* ========================================================================= */}
        <div className="pt-6 flex flex-wrap items-center justify-end gap-3">
          
          {initialData && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer"
            >
              Cancel Edit
            </button>
          )}

          {!initialData && (
            <button
              type="button"
              onClick={() => handleSavePurchase(true)}
              className="px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#DCD6FE] dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer"
            >
              Save and New
            </button>
          )}

          {/* Save Button (Vibrant Purple Pill Button) */}
          <button
            type="button"
            onClick={() => handleSavePurchase(false)}
            className={`px-8 py-2.5 ${initialData ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800' : 'bg-[#8A7CFA] hover:bg-[#7868F7] active:bg-[#6856E8]'} text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2`}
          >
            {initialData ? <Check className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
            <span>{initialData ? 'Update Purchase' : 'Save & Print Bill'}</span>
          </button>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 7. CATALOG BROWSER MODAL (POPUP QUICK PICKER FOR PURCHASE) */}
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
                    {language === 'bn' ? 'ক্রয় পণ্য ক্যাটালগ ও দ্রুত সিলেকশন' : 'Purchase Product Catalog Quick Picker'}
                  </h3>
                  <p className="text-[11px] text-indigo-200">
                    {language === 'bn' ? 'যেকোনো পণ্যে ক্লিক করে সরাসরি ক্রয় চালানে যোগ করুন' : 'Click on any product to quickly add to purchase invoice'}
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
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleQuickAddProduct(prod)}
                        className={`p-3 bg-white dark:bg-slate-800 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                          inCart
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">{prod.sku}</span>
                            {inCart && (
                              <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-mono text-[10px] font-extrabold rounded-md shadow-2xs">
                                ✓ {inCart.quantity}
                              </span>
                            )}
                          </div>

                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-2 border border-slate-100" />
                          ) : (
                            <div className="w-full h-20 bg-indigo-50 dark:bg-slate-700/50 rounded-lg mb-2 flex items-center justify-center text-indigo-400 dark:text-indigo-300 font-bold text-lg">
                              {prod.name.charAt(0)}
                            </div>
                          )}

                          <h4 className="font-bold text-xs text-slate-800 dark:text-white line-clamp-2">
                            {prod.name}
                          </h4>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            Stock: <strong className={prod.stock <= prod.minStockAlert ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'}>{Number(prod.stock)} {prod.unit}</strong>
                          </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                          <div className="font-mono font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                            ৳{prod.purchasePrice.toLocaleString()}
                          </div>
                          <button
                            type="button"
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
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
                Current Items in Purchase: <strong className="text-indigo-600 font-bold font-mono">{items.filter(i => i.productId).length}</strong> | Total: <strong className="text-indigo-600 font-bold font-mono">৳{totalAmount.toLocaleString()}</strong>
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
