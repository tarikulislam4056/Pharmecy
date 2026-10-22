import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SalesOrder, SalesOrderStatus, SalesOrderItem, Party, Product, PaymentMethod } from '../../types';
import { canUserDelete, canUserEdit, canUserConvertSalesOrder, canUserUpdateSalesOrderStatus } from '../../utils/permissions';
import { getCustomerTotalDue } from '../../utils/dueHelpers';
import { MultiUserAuditTrail } from '../common/MultiUserAuditTrail';
import { 
  ClipboardList, Plus, Search, Filter, Printer, Download, Trash2, Edit2,
  CheckCircle2, Send, Clock, AlertTriangle, X, Phone, Calendar, 
  Receipt, ShoppingCart, User, ArrowRight, TrendingUp, Wallet, CreditCard, Coins
} from 'lucide-react';

export const SalesOrderView: React.FC = () => {
  const { 
    salesOrders, addSalesOrder, updateSalesOrder, updateSalesOrderStatus, convertSalesOrderToSale, deleteSalesOrder,
    parties, installmentSchemes, products, wallets, language, showToast, currentUser, openPrintModal,
    formatCurrency
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [onlyWithDue, setOnlyWithDue] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);

  const handleOpenEdit = (ord: SalesOrder) => {
    if (!canUserEdit(currentUser, 'sales-order')) {
      showToast(
        language === 'bn'
          ? 'আপনার সেলস অর্ডার এডিট করার পারমিশন নেই।'
          : 'You do not have permission to edit sales orders.',
        'error'
      );
      return;
    }
    setEditingOrder(ord);
    setCustomerId(ord.customerId || '');
    setDeliveryDate(ord.deliveryDate || new Date().toISOString().split('T')[0]);
    setNotes(ord.notes || '');
    setOrderItems(JSON.parse(JSON.stringify(ord.items)));
    setDiscount(ord.discount || 0);
    setDiscountType(ord.discountType || 'flat');
    setIsModalOpen(true);
  };

  // New Sales Order form state
  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<SalesOrderItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('flat');

  // Selected product input helper
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  // Convert to Sale state
  const [convertingOrder, setConvertingOrder] = useState<SalesOrder | null>(null);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [walletId, setWalletId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  React.useEffect(() => {
    if (convertingOrder) {
      setPaidAmount(convertingOrder.grandTotal);
      if (wallets.length > 0) {
        const activeWallet = wallets.find(w => w.isActive) || wallets[0];
        setWalletId(activeWallet.id);
      }
    }
  }, [convertingOrder, wallets]);

  const customers = useMemo(() => (parties || []).filter(p => p.type === 'CUSTOMER'), [parties]);

  // Combined auto-populated list of registered customers & any walk-in customer in orders with total due balance
  const customerOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone?: string; currentBalance?: number; totalDue: number; address?: string; party?: Party }>();
    customers.forEach(c => {
      const due = getCustomerTotalDue(c, installmentSchemes);
      map.set(c.id, { 
        id: c.id, 
        name: c.name, 
        phone: c.phone, 
        currentBalance: c.currentBalance, 
        totalDue: due, 
        address: c.address, 
        party: c 
      });
    });
    (salesOrders || []).forEach(o => {
      if (o.customerId && !map.has(o.customerId)) {
        map.set(o.customerId, { 
          id: o.customerId, 
          name: o.customerName, 
          phone: o.customerPhone, 
          address: o.customerAddress, 
          totalDue: 0 
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, salesOrders, installmentSchemes]);

  // Quick lookup helper for customer total due
  const getDueForCustomer = (custId?: string, custName?: string, custPhone?: string): number => {
    const opt = customerOptions.find(c => 
      (custId && c.id === custId) ||
      (custName && c.name.toLowerCase() === custName.toLowerCase()) ||
      (custPhone && c.phone && c.phone === custPhone)
    );
    return opt ? opt.totalDue : 0;
  };

  const selectedCustomerObj = useMemo(() => {
    if (selectedCustomerId === 'ALL') return null;
    return customerOptions.find(c => c.id === selectedCustomerId || c.name.toLowerCase() === selectedCustomerId.toLowerCase()) || null;
  }, [selectedCustomerId, customerOptions]);

  const filteredOrders = useMemo(() => {
    return (salesOrders || []).filter(ord => {
      const matchSearch =
        !searchQuery ||
        ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customerPhone.includes(searchQuery);

      const matchStatus = selectedStatus === 'ALL' || ord.status === selectedStatus;

      const matchCustomer =
        selectedCustomerId === 'ALL' ||
        ord.customerId === selectedCustomerId ||
        ord.customerName.toLowerCase() === selectedCustomerId.toLowerCase();

      const matchDate = (!fromDate || ord.date >= fromDate) && (!toDate || ord.date <= toDate);

      const matchDue = !onlyWithDue || getDueForCustomer(ord.customerId, ord.customerName, ord.customerPhone) > 0;

      return matchSearch && matchStatus && matchCustomer && matchDate && matchDue;
    });
  }, [salesOrders, searchQuery, selectedStatus, selectedCustomerId, fromDate, toDate, onlyWithDue, customerOptions]);

  // Summary Metrics for the currently active filter
  const summaryMetrics = useMemo(() => {
    const orders = filteredOrders;
    const totalOrderAmount = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const convertedAmount = orders.filter(o => o.status === 'CONVERTED_TO_SALE').reduce((sum, o) => sum + o.grandTotal, 0);
    const pendingAmount = orders.filter(o => o.status !== 'CONVERTED_TO_SALE').reduce((sum, o) => sum + o.grandTotal, 0);
    
    // Calculate total due balance of customers in the currently filtered orders
    const customerKeysSet = new Set(orders.map(o => o.customerId || o.customerName));
    let totalCustomerDue = 0;
    let dueCustomersCount = 0;
    customerOptions.forEach(c => {
      if (customerKeysSet.has(c.id) || customerKeysSet.has(c.name)) {
        if (c.totalDue > 0) {
          totalCustomerDue += c.totalDue;
          dueCustomersCount += 1;
        }
      }
    });

    return {
      count: orders.length,
      totalOrderAmount,
      convertedAmount,
      pendingAmount,
      totalCustomerDue,
      dueCustomersCount,
    };
  }, [filteredOrders, customerOptions]);

  const handleAddItem = () => {
    if (!selectedProductId) {
      showToast(language === 'bn' ? 'দয়া করে একটি পণ্য সিলেক্ট করুন।' : 'Please select a product.', 'error');
      return;
    }
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const qty = Number(quantity) || 1;
    const price = Number(unitPrice) || prod.salesPrice || 0;

    const existingIndex = orderItems.findIndex(i => i.productId === prod.id);
    if (existingIndex > -1) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].unitPrice = price;
      updated[existingIndex].total = updated[existingIndex].quantity * price;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: prod.id,
          name: prod.name,
          nameBn: prod.nameBn,
          unit: prod.unit || 'Pcs',
          quantity: qty,
          unitPrice: price,
          discount: 0,
          discountType: 'flat',
          taxPercent: 0,
          total: qty * price,
          dosageForm: prod.dosageForm,
          strength: prod.strength,
        }
      ]);
    }
    setSelectedProductId('');
    setQuantity(1);
    setUnitPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const subtotal = orderItems.reduce((acc, item) => acc + item.total, 0);
  const calculatedDiscount = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const grandTotal = Math.max(0, subtotal - (Number(calculatedDiscount) || 0));

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      showToast(language === 'bn' ? 'দয়া করে কাস্টমার সিলেক্ট করুন।' : 'Please select a customer.', 'error');
      return;
    }
    if (orderItems.length === 0) {
      showToast(language === 'bn' ? 'সেলস অর্ডারে অন্তত একটি পণ্য যোগ করুন।' : 'Add at least one item to sales order.', 'error');
      return;
    }

    const cust = customers.find(c => c.id === customerId);

    if (editingOrder) {
      updateSalesOrder(editingOrder.id, {
        deliveryDate,
        customerId,
        customerName: cust?.name || 'Customer',
        customerPhone: cust?.phone || '',
        customerAddress: cust?.address || '',
        items: orderItems,
        subtotal,
        discount: Number(discount) || 0,
        discountType,
        grandTotal,
        notes,
      });
    } else {
      addSalesOrder({
        date: new Date().toISOString().split('T')[0],
        deliveryDate,
        customerId,
        customerName: cust?.name || 'Customer',
        customerPhone: cust?.phone || '',
        customerAddress: cust?.address || '',
        items: orderItems,
        subtotal,
        discount: Number(discount) || 0,
        discountType,
        taxAmount: 0,
        grandTotal,
        status: 'PENDING',
        notes,
      });
    }

    setIsModalOpen(false);
    setEditingOrder(null);
    setCustomerId('');
    setOrderItems([]);
    setDiscount(0);
    setNotes('');
  };

  const handlePrintOrder = (ord: SalesOrder) => {
    openPrintModal({
      type: 'SALES_ORDER',
      title: language === 'bn' ? `সেলস অর্ডার #${ord.orderNumber}` : `Sales Order #${ord.orderNumber}`,
      data: {
        documentTitle: language === 'bn' ? 'সেলস অর্ডার (SALES ORDER)' : 'SALES ORDER',
        invoiceNumber: ord.orderNumber,
        date: ord.date,
        deliveryDate: ord.deliveryDate,
        customerName: ord.customerName,
        customerPhone: ord.customerPhone,
        customerAddress: ord.customerAddress,
        items: ord.items,
        subtotal: ord.subtotal,
        discount: ord.discount,
        discountType: ord.discountType,
        taxAmount: ord.taxAmount || 0,
        vatAmount: ord.taxAmount || 0,
        grandTotal: ord.grandTotal,
        paidAmount: ord.paidAmount || 0,
        dueAmount: ord.grandTotal - (ord.paidAmount || 0),
        status: ord.status,
        notes: ord.notes,
        isSalesOrder: true,
      }
    });
  };

  const handlePrintCustomerReport = (cust: { id: string; name: string; phone?: string; currentBalance?: number; totalDue?: number; address?: string }) => {
    const custOrders = (salesOrders || []).filter(o => o.customerId === cust.id || o.customerName === cust.name);
    const totalAmount = custOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const convertedAmount = custOrders.filter(o => o.status === 'CONVERTED_TO_SALE').reduce((sum, o) => sum + o.grandTotal, 0);
    const pendingAmount = custOrders.filter(o => o.status !== 'CONVERTED_TO_SALE').reduce((sum, o) => sum + o.grandTotal, 0);
    const custDue = cust.totalDue !== undefined ? cust.totalDue : (cust.currentBalance || 0);

    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? `কাস্টমার সেলস অর্ডার রিপোর্ট - ${cust.name}` : `Customer Sales Order Report - ${cust.name}`,
      data: {
        reportTitle: language === 'bn' ? `সেলস অর্ডার ও বকেয়া রিপোর্ট: ${cust.name}` : `SALES ORDER & DUE REPORT: ${cust.name}`,
        period: `${fromDate || 'All Time'} - ${toDate || 'Present'}`,
        generatedDate: new Date().toLocaleDateString('en-GB'),
        kpis: [
          { label: language === 'bn' ? 'মোট অর্ডার' : 'Total Orders', value: `${custOrders.length} টি` },
          { label: language === 'bn' ? 'মোট অর্ডার মূল্য' : 'Total Value', value: totalAmount },
          { label: language === 'bn' ? 'বিক্রিতে রূপান্তরিত' : 'Sold / Invoiced', value: convertedAmount },
          { label: language === 'bn' ? 'পেন্ডিং / বাকি অর্ডার' : 'Pending Orders', value: pendingAmount },
          { label: language === 'bn' ? 'কাস্টমার বর্তমান বকেয়া' : 'Customer Current Due', value: custDue },
        ],
        columns: [
          { key: 'orderNumber', header: 'Order #' },
          { key: 'date', header: 'Date' },
          { key: 'deliveryDate', header: 'Delivery' },
          { key: 'itemsCount', header: 'Items', align: 'center' },
          { key: 'status', header: 'Status', align: 'center' },
          { key: 'grandTotal', header: 'Total Amount', align: 'right', format: 'currency' },
        ],
        rows: custOrders.map(o => ({
          orderNumber: o.orderNumber,
          date: o.date,
          deliveryDate: o.deliveryDate || '-',
          itemsCount: `${o.items.length} items`,
          status: o.status,
          grandTotal: o.grandTotal,
        })),
        totals: {
          total: totalAmount
        }
      }
    });
  };

  const handlePrintFilteredReport = () => {
    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'সেলস অর্ডার রিপোর্ট' : 'Sales Orders Report',
      data: {
        reportTitle: selectedCustomerObj 
          ? (language === 'bn' ? `সেলস অর্ডার ও বকেয়া রিপোর্ট: ${selectedCustomerObj.name}` : `SALES ORDER REPORT: ${selectedCustomerObj.name}`)
          : (language === 'bn' ? 'সার্বিক সেলস অর্ডার ও কাস্টমার বকেয়া রিপোর্ট' : 'SALES ORDERS & CUSTOMER DUE REPORT'),
        period: `${fromDate || 'All Time'} - ${toDate || 'Present'}`,
        generatedDate: new Date().toLocaleDateString('en-GB'),
        kpis: [
          { label: language === 'bn' ? 'ফিল্টার্ড অর্ডার' : 'Filtered Orders', value: `${filteredOrders.length} টি` },
          { label: language === 'bn' ? 'মোট অর্ডার মূল্য' : 'Total Value', value: summaryMetrics.totalOrderAmount },
          { label: language === 'bn' ? 'বিক্রিতে রূপান্তরিত' : 'Sold / Converted', value: summaryMetrics.convertedAmount },
          { label: language === 'bn' ? 'পেন্ডিং / বাকি অর্ডার' : 'Pending Orders', value: summaryMetrics.pendingAmount },
          { label: language === 'bn' ? 'কাস্টমারদের মোট বকেয়া' : 'Total Customer Due', value: summaryMetrics.totalCustomerDue },
        ],
        columns: [
          { key: 'orderNumber', header: 'Order #' },
          { key: 'date', header: 'Date' },
          { key: 'customerName', header: 'Customer' },
          { key: 'itemsCount', header: 'Items', align: 'center' },
          { key: 'status', header: 'Status', align: 'center' },
          { key: 'grandTotal', header: 'Total Amount', align: 'right', format: 'currency' },
        ],
        rows: filteredOrders.map(o => ({
          orderNumber: o.orderNumber,
          date: o.date,
          customerName: o.customerName,
          itemsCount: `${o.items.length} items`,
          status: o.status,
          grandTotal: o.grandTotal,
        })),
        totals: {
          total: summaryMetrics.totalOrderAmount
        }
      }
    });
  };

  const getStatusBadge = (status: SalesOrderStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Pending</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Processing</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">Approved</span>;
      case 'DISPATCHED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">Dispatched</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Delivered</span>;
      case 'CONVERTED_TO_SALE':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white">Converted to Sale</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{language === 'bn' ? 'সেলস অর্ডার ম্যানেজমেন্ট' : 'Sales Orders'}</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'bn' ? 'গ্রাহকদের সেলস অর্ডার তৈরি, ট্র্যাকিং এবং সরাসরি POS ইনভয়েসে রূপান্তর করুন।' : 'Create, track, and convert customer sales orders into POS invoices seamlessly.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintFilteredReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer"
            title={language === 'bn' ? 'ফিল্টার অনুযায়ী রিপোর্ট প্রিন্ট' : 'Print filtered report'}
          >
            <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{language === 'bn' ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingOrder(null);
              setCustomerId('');
              setOrderItems([]);
              setDiscount(0);
              setNotes('');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? '+ নতুন সেলস অর্ডার' : '+ New Sales Order'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar with Auto-populated Customer Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'অর্ডার নম্বর বা কাস্টমার খুঁজুন...' : 'Search order # or customer...'}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Customer Select Dropdown (Auto shows all customer names & due balance) */}
        <div className="flex items-center gap-1.5 min-w-[240px] flex-1 sm:flex-initial">
          <User className="w-4 h-4 text-indigo-500 shrink-0" />
          <select
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            title={language === 'bn' ? 'কাস্টমার ফিল্টার করুন' : 'Filter by customer'}
          >
            <option value="ALL">
              {language === 'bn' ? '-- সকল কাস্টমার (All Customers) --' : '-- All Customers --'}
            </option>
            {customerOptions.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.totalDue > 0 ? `[বকেয়া: ৳${c.totalDue.toLocaleString()}]` : '[বকেয়া নেই]'} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
          {selectedCustomerId !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedCustomerId('ALL')}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={language === 'bn' ? 'কাস্টমার ফিল্টার মুছুন' : 'Clear customer filter'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Toggle to filter only customers who have outstanding due */}
        <button
          type="button"
          onClick={() => setOnlyWithDue(prev => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            onlyWithDue
              ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 shadow-xs ring-1 ring-rose-500'
              : 'bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-750'
          }`}
          title={language === 'bn' ? 'শুধু বকেয়া থাকা কাস্টমারদের অর্ডার ফিল্টার করুন' : 'Filter orders by customers with outstanding due'}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${onlyWithDue ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'}`} />
          <span>{language === 'bn' ? 'শুধু বকেয়া কাস্টমার' : 'Only Due Customers'}</span>
          {onlyWithDue && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
              {summaryMetrics.dueCustomersCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="APPROVED">Approved</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CONVERTED_TO_SALE">Converted to Sale</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
            title={language === 'bn' ? 'শুরুর তারিখ' : 'From Date'}
          />
          <span className="text-zinc-400">-</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
            title={language === 'bn' ? 'শেষ তারিখ' : 'To Date'}
          />
        </div>
      </div>

      {/* Customer Sales Orders Master Report & Summary */}
      {selectedCustomerObj ? (
        /* Selected Customer Detailed Master Report Card */
        <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {selectedCustomerObj.name}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold">
                    {language === 'bn' ? 'নির্বাচিত কাস্টমার' : 'Selected Customer'}
                  </span>
                  {selectedCustomerObj.totalDue > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {language === 'bn' ? 'বকেয়া রয়েছে' : 'Has Due'}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {language === 'bn' ? 'বকেয়া নেই' : 'No Due'}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {selectedCustomerObj.phone && <span>ফোন: {selectedCustomerObj.phone}</span>}
                  {selectedCustomerObj.address && <span>ঠিকানা: {selectedCustomerObj.address}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePrintCustomerReport(selectedCustomerObj)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'কাস্টমার রিপোর্ট প্রিন্ট' : 'Print Customer Report'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCustomerId('ALL')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'সকল কাস্টমার' : 'All Customers'}</span>
              </button>
            </div>
          </div>

          {/* 5 Financial KPI boxes for this Customer including Due */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
            {/* Customer Total Due Card */}
            <div className={`p-3 rounded-lg border shadow-2xs ${
              selectedCustomerObj.totalDue > 0
                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
            }`}>
              <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                <span>{language === 'bn' ? 'কাস্টমারের মোট বকেয়া' : 'Customer Total Due'}</span>
                {selectedCustomerObj.totalDue > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div className={`text-base font-black mt-0.5 ${
                selectedCustomerObj.totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                ৳ {selectedCustomerObj.totalDue.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <div className="text-[11px] text-zinc-500 font-medium">{language === 'bn' ? 'মোট অর্ডার' : 'Total Orders'}</div>
              <div className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">{summaryMetrics.count} টি</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <div className="text-[11px] text-zinc-500 font-medium">{language === 'bn' ? 'মোট অর্ডার মূল্য' : 'Total Ordered'}</div>
              <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">৳ {summaryMetrics.totalOrderAmount.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <div className="text-[11px] text-zinc-500 font-medium">{language === 'bn' ? 'বিক্রি হয়েছে' : 'Sold / Invoiced'}</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">৳ {summaryMetrics.convertedAmount.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <div className="text-[11px] text-zinc-500 font-medium">{language === 'bn' ? 'বাকি / পেন্ডিং অর্ডার' : 'Pending Orders'}</div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">৳ {summaryMetrics.pendingAmount.toLocaleString()}</div>
            </div>
          </div>
        </div>
      ) : (
        /* Overall KPI Stats */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-[11px] text-zinc-500 font-medium">{language === 'bn' ? 'মোট অর্ডার সংখ্যা' : 'Total Orders'}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white mt-0.5">{summaryMetrics.count} টি</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-[11px] text-zinc-500 font-medium">{language === 'bn' ? 'মোট অর্ডার মূল্য' : 'Total Orders Value'}</div>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">৳ {summaryMetrics.totalOrderAmount.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-[11px] text-zinc-500 font-medium">{language === 'bn' ? 'বিক্রিতে রূপান্তরিত' : 'Sold / Converted'}</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">৳ {summaryMetrics.convertedAmount.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-[11px] text-zinc-500 font-medium">{language === 'bn' ? 'পেন্ডিং / বাকি অর্ডার' : 'Pending Orders'}</div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">৳ {summaryMetrics.pendingAmount.toLocaleString()}</div>
            </div>
            <div 
              onClick={() => setOnlyWithDue(prev => !prev)}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition-all ${
                onlyWithDue 
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 ring-2 ring-rose-500' 
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-rose-300'
              }`}
              title={language === 'bn' ? 'ক্লিক করে শুধু বকেয়া থাকা কাস্টমার ফিল্টার করুন' : 'Click to filter only customers with due'}
            >
              <div className="text-[11px] text-zinc-500 font-medium flex items-center justify-between">
                <span>{language === 'bn' ? 'কাস্টমারদের মোট বকেয়া' : 'Total Customers Due'}</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                ৳ {summaryMetrics.totalCustomerDue.toLocaleString()}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                {summaryMetrics.dueCustomersCount} {language === 'bn' ? 'জন কাস্টমারের বকেয়া' : 'customers with due'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Date / Delivery</th>
                <th className="py-3 px-4">{language === 'bn' ? 'কাস্টমার ও বর্তমান বকেয়া' : 'Customer & Due'}</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-900 dark:text-zinc-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(ord => {
                  const custDue = getDueForCustomer(ord.customerId, ord.customerName, ord.customerPhone);
                  return (
                    <tr key={ord.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                        <div>{ord.date}</div>
                        {ord.deliveryDate && <div className="text-[10px] text-zinc-500">Delivery: {ord.deliveryDate}</div>}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        <div className="font-semibold text-zinc-900 dark:text-white">{ord.customerName}</div>
                        {ord.customerPhone && <div className="text-[10px] text-zinc-500">{ord.customerPhone}</div>}
                        <div className="mt-1">
                          {custDue > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-rose-600" />
                              <span>{language === 'bn' ? 'বকেয়া:' : 'Due:'} ৳ {custDue.toLocaleString()}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                              <span>{language === 'bn' ? 'বকেয়া নেই' : 'No Due'}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-700 dark:text-zinc-300">
                          {ord.items.length} items
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-white">
                        ৳ {ord.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(ord.status)}
                      </td>
                    <td className="py-3 px-4 text-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingOrder(ord)}
                        className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium rounded text-xs cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintOrder(ord)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded font-semibold text-xs cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        title={language === 'bn' ? 'সেলস অর্ডার প্রিন্ট করুন' : 'Print Sales Order'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
                      </button>
                      {canUserEdit(currentUser, 'sales-order') && ord.status !== 'CONVERTED_TO_SALE' && ord.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(ord)}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded font-semibold text-xs cursor-pointer inline-flex items-center gap-1"
                          title={language === 'bn' ? 'এডিট করুন' : 'Edit Order'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'ইডিট' : 'Edit'}</span>
                        </button>
                      )}
                      {ord.status !== 'CONVERTED_TO_SALE' && ord.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!canUserConvertSalesOrder(currentUser)) {
                              showToast(
                                language === 'bn'
                                  ? 'আপনার সেলস অর্ডার কনভার্ট বা ডেলিভারি করার পারমিশন নেই।'
                                  : 'You do not have permission to convert or deliver sales orders.',
                                'error'
                              );
                              return;
                            }
                            setConvertingOrder(ord);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Convert</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {canUserDelete(currentUser) && (
                        <button
                          type="button"
                          onClick={() => deleteSalesOrder(ord.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded cursor-pointer"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    {language === 'bn' ? 'কোনো সেলস অর্ডার পাওয়া যায়নি।' : 'No sales orders found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sales Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                <span>
                  {editingOrder
                    ? (language === 'bn' ? `সেলস অর্ডার #${editingOrder.orderNumber} এডিট করুন` : `Edit Sales Order #${editingOrder.orderNumber}`)
                    : (language === 'bn' ? 'নতুন সেলস অর্ডার তৈরি' : 'Create New Sales Order')}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    {language === 'bn' ? 'কাস্টমার / পার্টি *' : 'Customer / Party *'}
                  </label>
                  <select
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                  >
                    <option value="">-- {language === 'bn' ? 'কাস্টমার নির্বাচন করুন' : 'Select Customer'} --</option>
                    {customers.map(c => {
                      const due = getCustomerTotalDue(c, installmentSchemes);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} {due > 0 ? `[বকেয়া: ৳ ${due.toLocaleString()}]` : '[বকেয়া নেই]'} ({c.phone})
                        </option>
                      );
                    })}
                  </select>
                  {customerId && (() => {
                    const party = customers.find(c => c.id === customerId);
                    if (!party) return null;
                    const due = getCustomerTotalDue(party, installmentSchemes);
                    return (
                      <div className={`mt-2 p-2 rounded-lg border text-xs flex items-center justify-between ${
                        due > 0
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                      }`}>
                        <span className="font-medium flex items-center gap-1.5">
                          {due > 0 ? <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{language === 'bn' ? 'কাস্টমারের বর্তমান মোট বকেয়া:' : 'Customer Current Due:'}</span>
                        </span>
                        <span className="font-bold text-xs sm:text-sm">৳ {due.toLocaleString()}</span>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Add Items Box */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 space-y-3">
                <h3 className="text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">Add Order Items</h3>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] text-zinc-500 mb-1">Product</label>
                    <select
                      value={selectedProductId}
                      onChange={e => {
                        setSelectedProductId(e.target.value);
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod) setUnitPrice(prod.salesPrice || 0);
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-zinc-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-zinc-500 mb-1">Price</label>
                    <input
                      type="number"
                      value={unitPrice}
                      onChange={e => setUnitPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                {orderItems.length > 0 && (
                  <div className="overflow-x-auto mt-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-800 font-bold border-b border-zinc-200 dark:border-zinc-700">
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Price</th>
                          <th className="py-2 px-3 text-right">Total</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {orderItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium">{item.name}</td>
                            <td className="py-2 px-3 text-center">{item.quantity} {item.unit}</td>
                            <td className="py-2 px-3 text-right">৳ {item.unitPrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold">৳ {item.total.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-rose-600 hover:text-rose-800 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium">
                    <span>Subtotal:</span>
                    <span>৳ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Discount:</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={e => setDiscount(Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-right text-xs"
                    />
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-zinc-200 dark:border-zinc-700 text-indigo-600">
                    <span>Grand Total:</span>
                    <span>৳ {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional order notes..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow cursor-pointer"
                >
                  Save Sales Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Sale Modal */}
      {convertingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-linear-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/40 dark:via-zinc-900 dark:to-indigo-950/40">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {language === 'bn' ? `সেলস অর্ডার #${convertingOrder.orderNumber} বিক্রয়ে রূপান্তর` : `Convert Sales Order #${convertingOrder.orderNumber} to Sale`}
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    {language === 'bn' ? 'নগদ, ব্যাংক অথবা বাকীতে চালান তৈরি করুন' : 'Generate invoice as cash, bank, or on credit/due'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConvertingOrder(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Customer & Due Info */}
              {(() => {
                const prevDue = getDueForCustomer(convertingOrder.customerId, convertingOrder.customerName, convertingOrder.customerPhone);
                const currentDue = Math.max(0, convertingOrder.grandTotal - paidAmount);
                const projectedDue = prevDue + currentDue;
                const defaultActiveWallet = wallets.find(w => w.isActive) || wallets[0];

                return (
                  <>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                            {language === 'bn' ? 'গ্রাহক' : 'Customer'}
                          </div>
                          <div className="font-bold text-zinc-900 dark:text-white text-sm">
                            {convertingOrder.customerName}
                          </div>
                          <div className="text-zinc-500 text-[11px] flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {convertingOrder.customerPhone || 'N/A'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                            {language === 'bn' ? 'মোট বিল' : 'Grand Total'}
                          </div>
                          <div className="font-black text-indigo-600 dark:text-indigo-400 text-base">
                            ৳ {convertingOrder.grandTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500 font-medium">
                          {language === 'bn' ? 'গ্রাহকের পূর্বের বকেয়া:' : 'Customer Previous Due:'}
                        </span>
                        <span className={`font-bold ${prevDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          ৳ {prevDue.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Quick Payment Mode Presets */}
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 text-xs">
                        {language === 'bn' ? 'বিক্রয়ের ধরণ নির্ধারণ করুন:' : 'Select Sale Payment Mode:'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPaidAmount(convertingOrder.grandTotal);
                            setPaymentMethod('CASH');
                            if (!walletId || walletId === 'due') {
                              setWalletId(defaultActiveWallet?.id || '');
                            }
                          }}
                          className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            paidAmount === convertingOrder.grandTotal && walletId !== 'due'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                          }`}
                        >
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            🟢 {language === 'bn' ? 'সম্পূর্ণ নগদ' : 'Full Paid'}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            ৳ {convertingOrder.grandTotal.toLocaleString()}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const half = Math.round(convertingOrder.grandTotal / 2);
                            setPaidAmount(half);
                            setPaymentMethod('CASH');
                            if (!walletId || walletId === 'due') {
                              setWalletId(defaultActiveWallet?.id || '');
                            }
                          }}
                          className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            paidAmount > 0 && paidAmount < convertingOrder.grandTotal
                              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-200 font-bold shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                          }`}
                        >
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            🟡 {language === 'bn' ? 'আংশিক বাকি' : 'Partial Due'}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {language === 'bn' ? 'কিছু নগদ + বাকি' : 'Cash + Due'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPaidAmount(0);
                            setWalletId('due');
                            setPaymentMethod('DUE');
                          }}
                          className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            paidAmount === 0 || walletId === 'due' || paymentMethod === 'DUE'
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200 font-bold shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                          }`}
                        >
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                            🛑 {language === 'bn' ? 'সম্পূর্ণ বাকী' : 'Full Due'}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {language === 'bn' ? '১০০% বকেয়া' : '100% Credit'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Select Payment Wallet */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          {language === 'bn' ? 'পেমেন্ট ওয়ালেট / বাকী নির্বাচন *' : 'Select Payment Wallet *'}
                        </label>
                        {walletId === 'due' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                            {language === 'bn' ? 'বাকীতে বিক্রয় হচ্ছে' : 'Credit Sale Selected'}
                          </span>
                        )}
                      </div>

                      <select
                        value={walletId}
                        onChange={e => {
                          const val = e.target.value;
                          setWalletId(val);
                          if (val === 'due') {
                            setPaidAmount(0);
                            setPaymentMethod('DUE');
                          } else if (walletId === 'due' && paidAmount === 0) {
                            setPaidAmount(convertingOrder.grandTotal);
                            setPaymentMethod('CASH');
                          }
                        }}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg font-medium text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">-- {language === 'bn' ? 'ওয়ালেট সিলেক্ট করুন' : 'Select Wallet'} --</option>
                        <option value="due" className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950">
                          🛑 {language === 'bn' ? 'সম্পূর্ণ বাকী বিক্রয় (Credit / Due Sale - কোনো ওয়ালেট লাগবে না)' : '🛑 Full Due / Credit Sale (No Wallet Required)'}
                        </option>
                        <optgroup label={language === 'bn' ? 'সচল ওয়ালেটসমূহ (নগদ ও ব্যাংক)' : 'Active Wallets (Cash & Bank)'}>
                          {wallets.map(w => (
                            <option key={w.id} value={w.id}>
                              💼 {w.name} ({w.type}) - {language === 'bn' ? 'ব্যালেন্স:' : 'Balance:'} ৳ {w.balance.toLocaleString()}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Conditional Banner for Full Due Sale */}
                    {walletId === 'due' || paidAmount === 0 ? (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-800 dark:text-rose-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>{language === 'bn' ? 'বাকীতে বিক্রয় নীতি (Credit Sale Policy):' : 'Credit Sale Policy:'}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300 pl-5">
                          {language === 'bn'
                            ? `কোনো ওয়ালেটে নগদ টাকা জমা হবে না। সম্পূর্ণ ৳ ${convertingOrder.grandTotal.toLocaleString()} গ্রাহক "${convertingOrder.customerName}"-এর বকেয়া খাতায় (Ledger) যোগ হবে।`
                            : `No funds will be deposited to wallets. Full amount ৳ ${convertingOrder.grandTotal.toLocaleString()} will be added to customer "${convertingOrder.customerName}"'s due ledger.`}
                        </p>
                      </div>
                    ) : (
                      /* Payment Method Selection for Paid Amount */
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          {language === 'bn' ? 'পরিশোধের মাধ্যম (Payment Method)' : 'Payment Method'}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['CASH', 'BANK', 'MFS'] as PaymentMethod[]).map(method => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPaymentMethod(method)}
                              className={`py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                                paymentMethod === method
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                              }`}
                            >
                              {method === 'CASH' ? '💵 Cash' : method === 'BANK' ? '🏦 Bank' : '📱 MFS'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Paid Amount Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-zinc-700 dark:text-zinc-300">
                          {language === 'bn' ? 'জমা / পরিশোধিত টাকা (৳)' : 'Paid Amount (৳)'}
                        </label>
                        {paidAmount === 0 && (
                          <span className="text-[11px] text-rose-600 font-bold">
                            {language === 'bn' ? '৳ ০ (সম্পূর্ণ বাকী)' : '৳ 0 (Full Due)'}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={convertingOrder.grandTotal}
                        value={paidAmount}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setPaidAmount(val);
                          if (val === 0) {
                            setWalletId('due');
                            setPaymentMethod('DUE');
                          } else if (walletId === 'due') {
                            setWalletId(defaultActiveWallet?.id || '');
                            setPaymentMethod('CASH');
                          }
                        }}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold text-sm text-zinc-900 dark:text-white"
                      />

                      {/* Quick Fill Shortcuts */}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {language === 'bn' ? 'কুইক বাটন:' : 'Quick set:'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPaidAmount(0);
                            setWalletId('due');
                            setPaymentMethod('DUE');
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                            paidAmount === 0
                              ? 'bg-rose-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                          }`}
                        >
                          {language === 'bn' ? '৳ ০ (সম্পূর্ণ বাকী)' : '৳ 0 (Full Due)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const half = Math.round(convertingOrder.grandTotal * 0.5);
                            setPaidAmount(half);
                            if (walletId === 'due') setWalletId(defaultActiveWallet?.id || '');
                            setPaymentMethod('CASH');
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                        >
                          {language === 'bn' ? '৫০% পরিশোধ' : '50% Paid'} (৳ {Math.round(convertingOrder.grandTotal * 0.5).toLocaleString()})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaidAmount(convertingOrder.grandTotal);
                            if (walletId === 'due') setWalletId(defaultActiveWallet?.id || '');
                            setPaymentMethod('CASH');
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                        >
                          {language === 'bn' ? '১০০% পরিশোধ' : '100% Paid'} (৳ {convertingOrder.grandTotal.toLocaleString()})
                        </button>
                      </div>
                    </div>

                    {/* Real-time Calculation Breakdown Card */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-1.5 text-xs">
                      <div className="font-bold text-zinc-700 dark:text-zinc-300 pb-1 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                        <span>{language === 'bn' ? 'চালানের সারসংক্ষেপ ও বকেয়া হিসাব' : 'Invoice & Due Breakdown'}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          currentDue === 0
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : currentDue === convertingOrder.grandTotal
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}>
                          {currentDue === 0
                            ? (language === 'bn' ? 'পরিশোধিত (Paid)' : 'Paid')
                            : currentDue === convertingOrder.grandTotal
                            ? (language === 'bn' ? 'সম্পূর্ণ বাকী (Full Due)' : 'Full Due')
                            : (language === 'bn' ? 'আংশিক বাকী (Partial Due)' : 'Partial Due')}
                        </span>
                      </div>

                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                        <span>{language === 'bn' ? 'অর্ডারের মোট মূল্য:' : 'Order Total:'}</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">৳ {convertingOrder.grandTotal.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                        <span>{language === 'bn' ? 'নগদ জমা নেওয়া হবে:' : 'Cash/Payment Received:'}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">৳ {paidAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                        <span>{language === 'bn' ? 'এই বিক্রয়ে নতুন বকেয়া:' : 'New Due Added:'}</span>
                        <span className={`font-bold ${currentDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          ৳ {currentDue.toLocaleString()}
                        </span>
                      </div>

                      <div className="pt-1.5 border-t border-dashed border-zinc-300 dark:border-zinc-700 flex justify-between items-center text-xs">
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {language === 'bn' ? 'গ্রাহকের চূড়ান্ত মোট বকেয়া হবে:' : 'Projected Customer Total Due:'}
                        </span>
                        <span className={`font-black text-sm ${projectedDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          ৳ {projectedDue.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setConvertingOrder(null)}
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg cursor-pointer transition text-xs"
                      >
                        {language === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const isDueSale = paidAmount === 0 || walletId === 'due' || paymentMethod === 'DUE';

                          if (!isDueSale && (!walletId || walletId === 'due')) {
                            showToast(
                              language === 'bn'
                                ? 'পরিশোধিত টাকার জন্য দয়া করে একটি সঠিক ওয়ালেট সিলেক্ট করুন অথবা সম্পূর্ণ বাকী নির্বাচন করুন।'
                                : 'Please select a valid wallet for the paid amount or choose Full Due.',
                              'error'
                            );
                            return;
                          }

                          if (paidAmount < 0) {
                            showToast(
                              language === 'bn' ? 'জমা টাকা ঋণাত্মক হতে পারে না।' : 'Paid amount cannot be negative.',
                              'error'
                            );
                            return;
                          }

                          if (paidAmount > convertingOrder.grandTotal) {
                            showToast(
                              language === 'bn' ? 'জমা টাকা মোট বিলের চেয়ে বেশি হতে পারে না।' : 'Paid amount cannot exceed grand total.',
                              'error'
                            );
                            return;
                          }

                          const finalWalletId = (isDueSale && paidAmount === 0) ? 'due' : walletId;
                          const finalMethod: PaymentMethod = paidAmount === 0 ? 'DUE' : (paymentMethod === 'DUE' ? 'CASH' : paymentMethod);

                          const inv = convertSalesOrderToSale(convertingOrder.id, paidAmount, finalWalletId, finalMethod);
                          if (inv) {
                            setConvertingOrder(null);
                            openPrintModal({
                              type: 'INVOICE_A4',
                              title: language === 'bn' ? `বিক্রয় চালান #${inv.invoiceNumber}` : `Sale Invoice #${inv.invoiceNumber}`,
                              data: inv,
                            });
                          }
                        }}
                        className={`px-5 py-2 text-white font-bold rounded-lg shadow-md cursor-pointer transition text-xs flex items-center gap-1.5 ${
                          currentDue === convertingOrder.grandTotal
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : currentDue > 0
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {currentDue === convertingOrder.grandTotal
                            ? (language === 'bn' ? 'সম্পূর্ণ বাকীতে ইনভয়েস তৈরি করুন' : 'Confirm Sale (Full Due)')
                            : currentDue > 0
                            ? (language === 'bn' ? 'আংশিক বাকীতে ইনভয়েস তৈরি করুন' : 'Confirm Sale (Partial Due)')
                            : (language === 'bn' ? 'সম্পূর্ণ পরিশোধে ইনভয়েস তৈরি করুন' : 'Confirm & Generate Invoice')}
                        </span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                <span>Sales Order Details #{viewingOrder.orderNumber}</span>
              </h2>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <div>
                  <div className="text-zinc-500">{language === 'bn' ? 'কাস্টমার' : 'Customer'}</div>
                  <div className="font-bold text-zinc-900 dark:text-white text-sm">{viewingOrder.customerName}</div>
                  <div className="text-zinc-600">{viewingOrder.customerPhone}</div>
                  {(() => {
                    const due = getDueForCustomer(viewingOrder.customerId, viewingOrder.customerName, viewingOrder.customerPhone);
                    return (
                      <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-medium">{language === 'bn' ? 'বর্তমান মোট বকেয়া:' : 'Current Due:'}</span>
                        <span className={`font-bold ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          ৳ {due.toLocaleString()}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <div className="text-zinc-500">Status & Date</div>
                  <div className="mt-1">{getStatusBadge(viewingOrder.status)}</div>
                  <div className="text-zinc-600 mt-1">Date: {viewingOrder.date}</div>
                  {viewingOrder.deliveryDate && <div className="text-zinc-600">Expected Delivery: {viewingOrder.deliveryDate}</div>}
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <span className="font-bold text-indigo-900 dark:text-indigo-200">Update Status:</span>
                {(['PENDING', 'PROCESSING', 'APPROVED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as SalesOrderStatus[]).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      if (!canUserUpdateSalesOrderStatus(currentUser)) {
                        showToast(
                          language === 'bn'
                            ? 'আপনার সেলস অর্ডার স্ট্যাটাস পরিবর্তনের পারমিশন নেই।'
                            : 'You do not have permission to update sales order status.',
                          'error'
                        );
                        return;
                      }
                      updateSalesOrderStatus(viewingOrder.id, st);
                      setViewingOrder({ ...viewingOrder, status: st });
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      viewingOrder.status === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div>
                <h4 className="font-bold text-zinc-700 dark:text-zinc-300 mb-2">Order Items</h4>
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800 font-bold border-b border-zinc-200 dark:border-zinc-700">
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Price</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {viewingOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium">{item.name}</td>
                          <td className="py-2 px-3 text-center">{item.quantity} {item.unit}</td>
                          <td className="py-2 px-3 text-right">৳ {item.unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold">৳ {item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>৳ {viewingOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {viewingOrder.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>- ৳ {viewingOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <span>Grand Total:</span>
                    <span>৳ {viewingOrder.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {viewingOrder.notes && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-zinc-600 dark:text-zinc-400 text-xs">
                  <strong>Notes:</strong> {viewingOrder.notes}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850">
              <button
                type="button"
                onClick={() => handlePrintOrder(viewingOrder)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'bn' ? 'অর্ডার প্রিন্ট করুন' : 'Print Order'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
