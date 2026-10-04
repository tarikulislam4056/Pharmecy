import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getCustomerTotalDue, checkCustomerCreditLimit } from '../utils/dueHelpers';
import {
  Language,
  Theme,
  Product,
  ProductBatch,
  Category,
  Party,
  SaleInvoice,
  DeletedSaleInvoice,
  SaleReturn,
  PurchaseInvoice,
  DeletedPurchaseInvoice,
  PurchaseReturn,
  PurchaseOrder,
  PurchaseItem,
  POStatus,
  Quotation,
  QuotationStatus,
  QuotationItem,
  InstallmentScheme,
  Wallet,
  ExpenseCategory,
  ExpenseVoucher,
  Employee,
  AdvanceSalary,
  PayrollEntry,
  UserAccount,
  CompanySettings,
  DayBookEntry,
  CashAdjustment,
  ViewTab,
  HrSubTab,
  InstallmentSubTab,
  CartItem,
  PaymentMethod,
  ExpiredReturnLog,
  ActivityLog,
  SmsConfig,
  SmsLog,
  WarrantyPolicy,
  WarrantyRecord,
  WarrantyClaim,
  WarrantyClaimStatus,
  WarrantyPeriodType,
  WarrantyType,
  PartyType,
  DiseaseMasterEntry,
  DiseaseCategoryItem,
} from '../types';
import { INITIAL_DISEASE_MASTER } from '../data/diseaseMasterData';
import { generatePartySerialNumber, findDuplicatePartySerial } from '../utils/partyHelpers';
import {
  generateSaleInvoiceNumber,
  generatePurchaseBillNumber,
  checkDuplicateSaleInvoice,
  checkDuplicatePurchaseInvoice,
} from '../utils/invoiceHelpers';
import {
  DEFAULT_SMS_CONFIG,
  sendSmsViaGateway,
  formatSmsTemplate,
} from '../utils/smsService';
import {
  initialCompanySettings,
  initialCategories,
  initialWallets,
  initialProducts,
  initialParties,
  initialSaleInvoices,
  initialDeletedSaleInvoices,
  initialPurchaseInvoices,
  initialDeletedPurchaseInvoices,
  initialPurchaseOrders,
  initialInstallmentSchemes,
  initialEmployees,
  initialAdvanceSalaries,
  initialPayrollHistory,
  initialExpenseCategories,
  initialExpenseVouchers,
  initialDayBookEntries,
  initialCashAdjustments,
  initialUsers,
  initialActivityLogs,
  initialWarrantyPolicies,
  initialWarrantyRecords,
  initialWarrantyClaims,
} from '../data/mockInitialData';
import { getFirstAllowedTab, isTabAllowed } from '../utils/permissions';
import { isExpiredDate } from '../utils/dateUtils';

export type PrintableDocumentType =
  | 'INVOICE_A4'
  | 'POS_80MM'
  | 'MONEY_RECEIPT'
  | 'PAYMENT_OUT_VOUCHER'
  | 'PURCHASE_VOUCHER'
  | 'PAYSLIP'
  | 'EMI_RECEIPT'
  | 'EXPENSE_VOUCHER'
  | 'CASH_ADJUSTMENT_VOUCHER'
  | 'WALLET_TRANSFER_VOUCHER'
  | 'REPORT'
  | 'LEDGER_STATEMENT'
  | 'CUSTOMER_STATEMENT'
  | 'SUPPLIER_STATEMENT'
  | 'BATCH_STATEMENT'
  | 'BATCH_EXPIRY_REPORT'
  | 'BATCH_DETAILED_LEDGER'
  | 'EMI_AMORTIZATION_SCHEDULE'
  | 'DAY_BOOK'
  | 'STATEMENT'
  | 'BARCODE_SHEET'
  | 'PRODUCT_LIST'
  | 'BATCH_TRACEABILITY_SLIP'
  | 'WARRANTY_CARD';

export interface PrintableDocumentData {
  type: PrintableDocumentType;
  title: string;
  data: any;
  autoDownloadPdf?: boolean;
}

// Multi-device smart union merge by item ID: guarantees zero data loss across devices
export const mergeEntitiesById = <T extends { id?: string | number }>(localArr: T[], serverArr?: T[]): T[] => {
  if (!Array.isArray(serverArr) || serverArr.length === 0) return Array.isArray(localArr) ? localArr : [];
  if (!Array.isArray(localArr) || localArr.length === 0) return serverArr;

  const map = new Map<string, T>();
  // 1. Insert server records
  for (const item of serverArr) {
    if (item && item.id !== undefined && item.id !== null) {
      map.set(String(item.id), item);
    }
  }
  // 2. Keep local records that are not yet on server, or merge newer fields
  for (const item of localArr) {
    if (item && item.id !== undefined && item.id !== null) {
      const existing = map.get(String(item.id));
      if (existing) {
        map.set(String(item.id), { ...existing, ...item });
      } else {
        map.set(String(item.id), item);
      }
    }
  }
  return Array.from(map.values());
};

interface AppContextType {
  // Localization & Theme
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  activeHrSubTab: HrSubTab;
  setActiveHrSubTab: (subTab: HrSubTab) => void;
  activeInstallmentSubTab: InstallmentSubTab;
  setActiveInstallmentSubTab: (subTab: InstallmentSubTab) => void;
  
  // Master Entities
  companySettings: CompanySettings;
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;
  
  products: Product[];
  categories: Category[];
  parties: Party[];
  wallets: Wallet[];
  saleInvoices: SaleInvoice[];
  deletedSaleInvoices: DeletedSaleInvoice[];
  saleReturns: SaleReturn[];
  purchaseInvoices: PurchaseInvoice[];
  purchaseReturns: PurchaseReturn[];
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => PurchaseOrder;
  updatePurchaseOrderStatus: (id: string, status: POStatus) => void;
  convertPOToPurchaseBill: (poId: string, finalItems: PurchaseItem[], finalDiscount?: number, paidAmount?: number, walletId?: string, customBillNumber?: string) => PurchaseInvoice | null;
  deletePurchaseOrder: (id: string) => void;
  
  quotations: Quotation[];
  addQuotation: (qData: Omit<Quotation, 'id' | 'quotationNumber' | 'createdAt'>) => Quotation;
  updateQuotationStatus: (id: string, status: QuotationStatus) => void;
  convertQuotationToSale: (qId: string, paidAmount: number, walletId: string, paymentMethod: PaymentMethod, customInvoiceNumber?: string) => SaleInvoice | null;
  deleteQuotation: (id: string) => void;
  
  expiredReturnLogs: ExpiredReturnLog[];
  installmentSchemes: InstallmentScheme[];
  employees: Employee[];
  advanceSalaries: AdvanceSalary[];
  payrollHistory: PayrollEntry[];
  expenseCategories: ExpenseCategory[];
  expenseVouchers: ExpenseVoucher[];
  dayBookEntries: DayBookEntry[];
  cashAdjustments: CashAdjustment[];
  activityLogs: ActivityLog[];
  logActivity: (log: Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'role'>) => void;
  users: UserAccount[];
  currentUser: UserAccount;
  setCurrentUser: (user: UserAccount) => void;

  // Print Modal State
  printableDoc: PrintableDocumentData | null;
  openPrintModal: (doc: PrintableDocumentData) => void;
  closePrintModal: () => void;

  // Toast / Notification
  toastMessage: { text: string; type: 'success' | 'info' | 'warning' | 'error' } | null;
  showToast: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;

  // Actions - Products & Categories
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string, force?: boolean) => void;
  deleteAllProducts: () => void;
  deletedProductIds: string[];
  updateProductBatches: (productId: string, batches: ProductBatch[]) => void;
  addProductBatch: (productId: string, batch: Omit<ProductBatch, 'id'>) => void;
  deleteProductBatch: (productId: string, batchId: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  bulkImportProducts: (newProducts: Omit<Product, 'id' | 'createdAt'>[]) => number;

  // Actions - Parties (Customers & Suppliers)
  getNextPartySerialNumber: (type: PartyType) => string;
  addParty: (party: Omit<Party, 'id' | 'currentBalance' | 'createdAt'>) => Party;
  updateParty: (id: string, updates: Partial<Party>) => void;
  deleteParty: (id: string) => void;

  // Actions - Sales & POS
  getNextSaleInvoiceNumber: () => string;
  createSaleInvoice: (invoiceData: {
    invoiceNumber?: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    discountType: 'percentage' | 'flat';
    vatAmount: number;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
    paymentMethod: PaymentMethod;
    walletId: string;
    notes?: string;
    isInstallmentSale?: boolean;
    installmentPlanId?: string;
    date?: string;
  }) => SaleInvoice | null;
  deleteSaleInvoice: (invoiceId: string, reason?: string) => boolean;
  restoreDeletedSaleInvoice: (deletedInvoiceId: string) => boolean;
  permanentlyDeleteArchivedInvoice: (deletedInvoiceId: string) => boolean;
  clearAllDeletedInvoices: () => void;
  exportDeletedInvoicesToFile: () => void;
  exportSingleDeletedInvoiceToFile: (invoice: DeletedSaleInvoice) => void;
  createSaleReturn: (returnData: {
    invoiceId: string;
    originalInvoiceNumber: string;
    customerId: string;
    customerName: string;
    items: {
      productId: string;
      productName: string;
      unit: any;
      unitPrice: number;
      returnQuantity: number;
      totalRefund: number;
    }[];
    totalRefund: number;
    refundWalletId: string;
    reason: string;
  }) => void;
  deleteSaleReturn: (returnId: string) => void;
  recordPaymentIn: (data: {
    partyId: string;
    amount: number;
    walletId: string;
    date: string;
    remarks: string;
  }) => void;

  // Actions - Purchases
  deletedPurchaseInvoices: DeletedPurchaseInvoice[];
  getNextPurchaseBillNumber: () => string;
  createPurchaseInvoice: (purchaseData: {
    billNumber?: string;
    supplierId: string;
    supplierName: string;
    supplierPhone: string;
    supplierInvoiceNo?: string;
    items: {
      productId: string;
      productName: string;
      unit: any;
      quantity: number;
      purchasePrice: number;
      total: number;
      batchNumber?: string;
      expDate?: string;
      mfgDate?: string;
      salesPrice?: number;
    }[];
    subtotal: number;
    discount: number;
    taxAmount: number;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
    paymentMethod: PaymentMethod;
    walletId: string;
    notes?: string;
    date?: string;
  }) => PurchaseInvoice | null;
  deletePurchaseInvoice: (invoiceId: string, reason?: string) => boolean;
  restoreDeletedPurchaseInvoice: (deletedPurchaseId: string) => boolean;
  permanentlyDeleteArchivedPurchase: (deletedPurchaseId: string) => boolean;
  clearAllDeletedPurchases: () => void;
  exportDeletedPurchasesToFile: () => void;
  exportSingleDeletedPurchaseToFile: (purchase: DeletedPurchaseInvoice) => void;
  createPurchaseReturn: (returnData: {
    purchaseId: string;
    originalBillNumber: string;
    supplierId: string;
    supplierName: string;
    items: {
      productId: string;
      productName: string;
      unit: any;
      purchasePrice: number;
      returnQuantity: number;
      totalAmount: number;
    }[];
    totalAmount: number;
    refundWalletId: string;
    reason: string;
  }) => void;
  deletePurchaseReturn: (returnId: string) => void;
  addExpiredReturnLog: (logData: Omit<ExpiredReturnLog, 'id' | 'date'> & { date?: string }) => void;
  deleteExpiredReturnLog: (id: string) => void;
  recordPaymentOut: (data: {
    partyId: string;
    amount: number;
    walletId: string;
    date: string;
    remarks: string;
  }) => boolean;

  // Actions - Installment & EMI
  createInstallmentScheme: (
    scheme: Omit<InstallmentScheme, 'id' | 'schemeNumber' | 'createdAt'>,
    options?: { skipDayBookAndWallet?: boolean }
  ) => InstallmentScheme;
  collectInstallment: (schemeId: string, installmentNo: number, amount: number, penalty: number, walletId: string, paymentMethod: string) => void;
  deleteInstallmentScheme: (id: string) => void;

  // Actions - Cash & Wallets
  addCashAdjustment: (adj: Omit<CashAdjustment, 'id' | 'voucherNo' | 'createdAt'>) => void;
  adjustCash: (data: { walletId: string; type: 'ADD' | 'WITHDRAW'; amount: number; reason: string }) => void;
  deleteCashAdjustment: (id: string) => void;
  addWallet: (wallet: Omit<Wallet, 'id'>) => void;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;
  transferWalletFunds: (fromWalletId: string, toWalletId: string, amount: number, notes?: string) => void;
  transferBetweenWallets: (fromWalletId: string, toWalletId: string, amount: number, notes?: string) => void;

  // Actions - Expenses
  addExpenseCategory: (cat: Omit<ExpenseCategory, 'id'>) => void;
  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => void;
  deleteExpenseCategory: (id: string) => void;
  addExpenseVoucher: (voucher: Omit<ExpenseVoucher, 'id' | 'voucherNo' | 'createdAt'>) => ExpenseVoucher;
  deleteExpenseVoucher: (id: string) => void;

  // Actions - HR & Payroll
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  resignEmployee: (
    id: string,
    data: {
      resignedDate: string;
      resignationReason: string;
      settlementNotes?: string;
      finalSettlementAmount?: number;
      finalSettlementPaid?: boolean;
      refundWalletId?: string;
    }
  ) => void;
  rejoinEmployee: (id: string) => void;
  addAdvanceSalary: (adv: Omit<AdvanceSalary, 'id' | 'voucherNo' | 'createdAt' | 'isDeducted'>) => void;
  giveAdvanceSalary: (adv: { employeeId: string; amount: number; walletId: string; reason: string; date: string }) => void;
  payEmployeeSalary: (payment: {
    employeeId: string;
    payrollMonth: string;
    amount: number;
    walletId: string;
    bonus?: number;
    fineDeduction?: number;
    notes?: string;
    paymentDate?: string;
  }) => boolean;
  processMonthlyPayroll: (monthStr: string, walletId: string) => void;

  // Actions - Users & Roles
  addUser: (user: Omit<UserAccount, 'id'>) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => void;
  deleteUser: (id: string) => void;
  isLoggedIn: boolean;
  logout: () => void;
  login: (username: string, password?: string) => boolean;
  switchUser: (targetUserId: string, password?: string) => boolean;

  // SMS Gateway & Notifications
  smsConfig: SmsConfig;
  setSmsConfig: React.Dispatch<React.SetStateAction<SmsConfig>>;
  updateSmsConfig: (updates: Partial<SmsConfig>) => void;
  smsLogs: SmsLog[];
  sendManualSms: (recipientPhone: string, recipientName: string, message: string, type?: SmsLog['type']) => Promise<boolean>;
  sendSaleSms: (invoice: SaleInvoice) => Promise<boolean>;
  sendPaymentInSms: (party: Party, amount: number, remainingDue: number, voucherNo: string) => Promise<boolean>;

  // Warranty Management
  warrantyPolicies: WarrantyPolicy[];
  warrantyRecords: WarrantyRecord[];
  warrantyClaims: WarrantyClaim[];
  addWarrantyPolicy: (policy: Omit<WarrantyPolicy, 'id'>) => WarrantyPolicy;
  updateWarrantyPolicy: (id: string, updates: Partial<WarrantyPolicy>) => void;
  deleteWarrantyPolicy: (id: string) => void;
  addWarrantyRecord: (record: Omit<WarrantyRecord, 'id' | 'createdAt'>) => WarrantyRecord;
  updateWarrantyRecord: (id: string, updates: Partial<WarrantyRecord>) => void;
  deleteWarrantyRecord: (id: string) => void;
  addWarrantyClaim: (claim: Omit<WarrantyClaim, 'id' | 'createdAt' | 'actionsHistory'>) => WarrantyClaim;
  updateWarrantyClaimStatus: (id: string, status: WarrantyClaimStatus, note?: string, updates?: Partial<WarrantyClaim>) => void;
  deleteWarrantyClaim: (id: string) => void;
  sendDueReminderSms: (party: Party, customDueAmount?: number) => Promise<boolean>;
  sendWarrantyClaimSms: (claim: WarrantyClaim, customNote?: string) => Promise<boolean>;
  deleteSmsLog: (id: string) => void;
  clearSmsLogs: () => void;

  // Medicine Diseases Template
  diseaseMaster: DiseaseMasterEntry[];
  setDiseaseMaster: React.Dispatch<React.SetStateAction<DiseaseMasterEntry[]>>;
  diseaseCategories: DiseaseCategoryItem[];
  setDiseaseCategories: React.Dispatch<React.SetStateAction<DiseaseCategoryItem[]>>;

  // Global Helpers
  resetToDemoData: () => void;
  formatCurrency: (amount: number) => string;

  // Cloud & Multi-Device Auto-Sync
  isSyncingWithServer: boolean;
  lastServerSyncTime: string | null;
  serverSyncStatus: { success: boolean; message: string; timestamp?: string } | null;
  syncCountdown: number;
  autoSyncIntervalSeconds: number;
  setAutoSyncIntervalSeconds: (seconds: number) => void;
  isAutoSyncEnabled: boolean;
  setIsAutoSyncEnabled: (enabled: boolean) => void;
  triggerServerPush: (customUrl?: string, silent?: boolean) => Promise<boolean>;
  triggerServerPull: (customUrl?: string, quiet?: boolean) => Promise<boolean>;
  triggerSyncNow: () => Promise<boolean>;
  saveApiEndpoint: (url: string, autoSync?: boolean, intervalSeconds?: number) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'DOKANPRO_ERP_DATA_V1';

// Helper to safely load persisted data from localStorage synchronously on initial state evaluation
function getPersistedData<T>(fieldKey: string, fallback: T): T {
  try {
    // 1. Check dedicated standalone key first (e.g. 'companySettings')
    const standalone = localStorage.getItem(fieldKey);
    if (standalone) {
      try {
        const parsedStandalone = JSON.parse(standalone);
        if (parsedStandalone !== undefined && parsedStandalone !== null) {
          if (fieldKey === 'companySettings' && typeof parsedStandalone === 'object') {
            const resolvedName = parsedStandalone.name || parsedStandalone.companyName || (fallback as any).name;
            return {
              ...fallback,
              ...parsedStandalone,
              name: resolvedName,
            } as T;
          }
          return parsedStandalone;
        }
      } catch {}
    }

    // 2. Check master monolithic ERP storage object
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed[fieldKey] !== undefined && parsed[fieldKey] !== null) {
        if (fieldKey === 'companySettings' && typeof parsed[fieldKey] === 'object') {
          const resolvedName = parsed[fieldKey].name || parsed[fieldKey].companyName || (fallback as any).name;
          return {
            ...fallback,
            ...parsed[fieldKey],
            name: resolvedName,
          } as T;
        }
        return parsed[fieldKey];
      }
    }
  } catch (e) {
    console.warn(`Failed to read ${fieldKey} from localStorage:`, e);
  }
  return fallback;
}

export const COMMON_DISEASE_CATEGORIES: DiseaseCategoryItem[] = [
  { id: 'ALL', name: 'সকল রোগ (All Diseases)', nameBn: 'সকল রোগ', isDefault: true },
  { id: 'General & Pain', name: 'জ্বর ও ব্যথা (Fever & Pain)', nameBn: 'জ্বর ও সাধারণ ব্যথা', isDefault: true },
  { id: 'Gastrointestinal', name: 'গ্যাস্ট্রিক ও পেট (Gastric & Stomach)', nameBn: 'গ্যাস্ট্রিক ও পরিপakতন্ত্র', isDefault: true },
  { id: 'Respiratory', name: 'সর্দি ও কাশি (Cold & Cough)', nameBn: 'শ্বাসতন্ত্র ও কাশি', isDefault: true },
  { id: 'Dermatology & Allergy', name: 'অ্যালার্জি ও চর্ম (Allergy & Skin)', nameBn: 'অ্যালার্জি ও চুলকানি', isDefault: true },
  { id: 'ENT (Ear, Nose, Throat)', name: 'নাক, কান ও গলা (ENT)', nameBn: 'নাক, কান ও গলা', isDefault: true },
  { id: 'Dental Care', name: 'দাঁত ও মাড়ি (Dental)', nameBn: 'দাঁত ও মাড়ির যত্ন', isDefault: true },
  { id: 'Cardiovascular', name: 'উচ্চ রক্তচাপ (Blood Pressure)', nameBn: 'হৃদরোগ ও রক্তচাপ', isDefault: true },
  { id: 'Endocrinology', name: 'ডায়াবেটিস (Diabetes)', nameBn: 'ডায়াবেটিস', isDefault: true },
  { id: 'Urology', name: 'প্রস্রাব ও কিডনি (UTI)', nameBn: 'মূত্রনালী ও কিডনি', isDefault: true },
  { id: 'Supplements & Nutrition', name: 'ভিটামিন ও পুষ্টি (Supplements)', nameBn: 'পুষ্টি ও দুর্বলতা', isDefault: true },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Settings & Theme
  const [language, setLanguage] = useState<Language>(() => getPersistedData('language', 'en'));
  const [theme, setTheme] = useState<Theme>(() => getPersistedData('theme', 'light'));
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [activeHrSubTab, setActiveHrSubTab] = useState<HrSubTab>('employees');
  const [activeInstallmentSubTab, setActiveInstallmentSubTab] = useState<InstallmentSubTab>('schemes');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);
  const [printableDoc, setPrintableDoc] = useState<PrintableDocumentData | null>(null);

  // Core Data States with Lazy Initialization from Local Storage
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const persisted = getPersistedData('companySettings', initialCompanySettings);
    if (!persisted || !persisted.name || persisted.name.includes('Super Store') || persisted.name.includes('fghgh')) {
      return {
        ...initialCompanySettings,
        ...(persisted || {}),
        name: 'Silva Electronics & IT',
        nameBn: persisted?.nameBn || initialCompanySettings.nameBn,
        address: persisted?.address && !persisted.address.includes('Motijheel') ? persisted.address : initialCompanySettings.address,
        email: persisted?.email && !persisted.email.includes('info@dokanprobd.com') ? persisted.email : initialCompanySettings.email,
        logoUrl: persisted?.logoUrl || initialCompanySettings.logoUrl,
        invoiceTemplate: (persisted?.invoiceTemplate as any) || initialCompanySettings.invoiceTemplate || 'COMPACT_BILL',
      };
    }
    return { ...initialCompanySettings, ...persisted };
  });
  const [products, setProducts] = useState<Product[]>(() => getPersistedData('products', initialProducts));
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('DOKANPRO_DELETED_PRODUCT_IDS');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [categories, setCategories] = useState<Category[]>(() => getPersistedData('categories', initialCategories));
  const [parties, setParties] = useState<Party[]>(() => {
    const raw: Party[] = getPersistedData('parties', initialParties);
    return raw.map((p, idx) => ({
      ...p,
      serialNumber: p.serialNumber || `${p.type === 'SUPPLIER' ? 'SUPP' : 'CUST'}-${String(idx + 1).padStart(4, '0')}`,
    }));
  });
  const [wallets, setWallets] = useState<Wallet[]>(() => getPersistedData('wallets', initialWallets));
  const [saleInvoices, setSaleInvoices] = useState<SaleInvoice[]>(() => getPersistedData('saleInvoices', initialSaleInvoices));
  const [deletedSaleInvoices, setDeletedSaleInvoices] = useState<DeletedSaleInvoice[]>(() => getPersistedData('deletedSaleInvoices', initialDeletedSaleInvoices));
  const [saleReturns, setSaleReturns] = useState<SaleReturn[]>(() => getPersistedData('saleReturns', []));
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(() => getPersistedData('purchaseInvoices', initialPurchaseInvoices));
  const [deletedPurchaseInvoices, setDeletedPurchaseInvoices] = useState<DeletedPurchaseInvoice[]>(() => {
    // Try dedicated archive first, fallback to main persisted
    try {
      const standalone = localStorage.getItem('DOKANPRO_DELETED_PURCHASES_ARCHIVE');
      if (standalone) {
        const parsed = JSON.parse(standalone);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return getPersistedData('deletedPurchaseInvoices', initialDeletedPurchaseInvoices);
  });
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(() => getPersistedData('purchaseReturns', []));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => getPersistedData('purchaseOrders', initialPurchaseOrders));
  const [quotations, setQuotations] = useState<Quotation[]>(() => getPersistedData('quotations', []));

  // Warranty States
  const [warrantyPolicies, setWarrantyPolicies] = useState<WarrantyPolicy[]>(() =>
    getPersistedData('warrantyPolicies', initialWarrantyPolicies)
  );
  const [warrantyRecords, setWarrantyRecords] = useState<WarrantyRecord[]>(() =>
    getPersistedData('warrantyRecords', initialWarrantyRecords)
  );
  const [warrantyClaims, setWarrantyClaims] = useState<WarrantyClaim[]>(() =>
    getPersistedData('warrantyClaims', initialWarrantyClaims)
  );

  // Warranty Handlers
  const addWarrantyPolicy = (policy: Omit<WarrantyPolicy, 'id'>): WarrantyPolicy => {
    const newPol: WarrantyPolicy = {
      ...policy,
      id: `war-pol-${Date.now()}`,
    };
    setWarrantyPolicies(prev => [newPol, ...prev]);
    showToast(language === 'bn' ? 'ওয়ারেন্টি পলিসি সফলভাবে তৈরি করা হয়েছে' : 'Warranty policy created successfully', 'success');
    return newPol;
  };

  const updateWarrantyPolicy = (id: string, updates: Partial<WarrantyPolicy>) => {
    setWarrantyPolicies(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
    showToast(language === 'bn' ? 'ওয়ারেন্টি পলিসি আপডেট করা হয়েছে' : 'Warranty policy updated', 'success');
  };

  const deleteWarrantyPolicy = (id: string) => {
    const pol = warrantyPolicies.find(p => p.id === id);
    setWarrantyPolicies(prev => prev.filter(p => p.id !== id));
    
    const nowStr = formatDeletionTimestamp();
    logActivity({
      actionType: 'DELETE',
      title: `Deleted Warranty Policy '${pol?.name || id}'`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted warranty policy '${pol?.name || id}' on ${nowStr}.`,
      severity: 'danger',
      targetId: id,
      targetName: `Warranty Policy '${pol?.name || id}'`,
    });
    showToast(language === 'bn' ? `ওয়ারেন্টি পলিসি (${nowStr}) মুছে ফেলা হয়েছে` : `Warranty policy deleted on ${nowStr}`, 'info');
  };

  const addWarrantyRecord = (record: Omit<WarrantyRecord, 'id' | 'createdAt'>): WarrantyRecord => {
    if (record.serialNumber && record.serialNumber.trim()) {
      const serial = record.serialNumber.trim();
      const duplicateRecord = warrantyRecords.find(
        r => r.serialNumber && r.serialNumber.trim().toLowerCase() === serial.toLowerCase()
      );
      if (duplicateRecord) {
        showToast(
          language === 'bn'
            ? `এই সিরিয়াল / IMEI (${serial}) আগে থেকেই চালান #${duplicateRecord.invoiceNumber} (${duplicateRecord.productName})-এ বিদ্যমান! একই সিরিয়াল দিয়ে পুনরায় এন্ট্রি হবে না।`
            : `Serial / IMEI (${serial}) already exists for invoice #${duplicateRecord.invoiceNumber} (${duplicateRecord.productName})! Duplicate entry is not allowed.`,
          'error'
        );
        return duplicateRecord;
      }
    }

    const newRec: WarrantyRecord = {
      ...record,
      id: `war-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toLocaleString(),
    };
    setWarrantyRecords(prev => [newRec, ...prev]);
    showToast(language === 'bn' ? 'ওয়ারেন্টি কার্ড রেজিস্টার করা হয়েছে' : 'Warranty card registered successfully', 'success');
    return newRec;
  };

  const updateWarrantyRecord = (id: string, updates: Partial<WarrantyRecord>) => {
    if (updates.serialNumber && updates.serialNumber.trim()) {
      const serial = updates.serialNumber.trim();
      const duplicateRecord = warrantyRecords.find(
        r => r.id !== id && r.serialNumber && r.serialNumber.trim().toLowerCase() === serial.toLowerCase()
      );
      if (duplicateRecord) {
        showToast(
          language === 'bn'
            ? `এই সিরিয়াল / IMEI (${serial}) অন্য ওয়ারেন্টি রেকর্ডে ব্যবহৃত! পরিবর্তন করা যাবে না।`
            : `Serial / IMEI (${serial}) is already used in another record! Duplicate not allowed.`,
          'error'
        );
        return;
      }
    }
    setWarrantyRecords(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));
    showToast(language === 'bn' ? 'ওয়ারেন্টি রেকর্ড আপডেট করা হয়েছে' : 'Warranty record updated', 'success');
  };

  const deleteWarrantyRecord = (id: string) => {
    const rec = warrantyRecords.find(r => r.id === id);
    setWarrantyRecords(prev => prev.filter(r => r.id !== id));
    setWarrantyClaims(prev => prev.filter(c => c.warrantyRecordId !== id));

    const nowStr = formatDeletionTimestamp();
    logActivity({
      actionType: 'DELETE',
      title: `Deleted Warranty Record #${rec?.warrantyCode || id}`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted warranty record #${rec?.warrantyCode || id} (${rec?.productName || ''}) on ${nowStr}.`,
      severity: 'danger',
      targetId: id,
      targetName: `Warranty Record #${rec?.warrantyCode || id}`,
    });

    showToast(language === 'bn' ? `ওয়ারেন্টি রেকর্ড (${nowStr}) মুছে ফেলা হয়েছে` : `Warranty record deleted on ${nowStr}`, 'info');
  };

  const addWarrantyClaim = (claim: Omit<WarrantyClaim, 'id' | 'createdAt' | 'actionsHistory'>): WarrantyClaim => {
    const newClaim: WarrantyClaim = {
      ...claim,
      id: `war-clm-${Date.now()}`,
      actionsHistory: [
        {
          id: `act-${Date.now()}`,
          date: new Date().toLocaleString(),
          status: claim.status || 'RECEIVED',
          note: 'Claim initiated & product received for service.',
          updatedBy: currentUser?.fullName || 'Staff',
        },
      ],
      createdAt: new Date().toLocaleString(),
    };
    setWarrantyClaims(prev => [newClaim, ...prev]);
    if (claim.warrantyRecordId) {
      setWarrantyRecords(prev => prev.map(r => r.id === claim.warrantyRecordId ? { ...r, status: 'CLAIMED' } : r));
    }
    showToast(language === 'bn' ? `ওয়ারেন্টি ক্লেইম টিকিট ${newClaim.claimTicketNo} সাকসেসফুল!` : `Warranty claim ticket ${newClaim.claimTicketNo} registered`, 'success');
    return newClaim;
  };

  const updateWarrantyClaimStatus = (id: string, status: WarrantyClaimStatus, note?: string, updates?: Partial<WarrantyClaim>) => {
    let updatedClaimObj: WarrantyClaim | undefined;
    setWarrantyClaims(prev => prev.map(c => {
      if (c.id === id) {
        const newAction = {
          id: `act-${Date.now()}`,
          date: new Date().toLocaleString(),
          status,
          note: note || `Status updated to ${status}`,
          updatedBy: currentUser?.fullName || 'Staff',
        };
        const updated = {
          ...c,
          ...updates,
          status,
          actionsHistory: [newAction, ...(c.actionsHistory || [])],
        };
        updatedClaimObj = updated;
        return updated;
      }
      return c;
    }));
    showToast(language === 'bn' ? `ক্লেইম স্ট্যাটাস পরিবর্তিত হয়ে "${status}" হয়েছে` : `Claim status updated to "${status}"`, 'success');

    // Auto SMS on Warranty Resolved
    const resolvedStatuses: WarrantyClaimStatus[] = ['REPAIRED', 'REPLACED', 'DELIVERED', 'REFUNDED'];
    if (
      updatedClaimObj &&
      resolvedStatuses.includes(status) &&
      smsConfig.enabled &&
      smsConfig.autoSendOnWarrantyResolved !== false &&
      updatedClaimObj.customerPhone
    ) {
      sendWarrantyClaimSms(updatedClaimObj, note).catch(err => console.warn('Warranty Resolved SMS trigger error:', err));
    }
  };

  const deleteWarrantyClaim = (id: string) => {
    const claim = warrantyClaims.find(c => c.id === id);
    setWarrantyClaims(prev => prev.filter(c => c.id !== id));
    
    const nowStr = formatDeletionTimestamp();
    logActivity({
      actionType: 'DELETE',
      title: `Deleted Warranty Claim Ticket #${claim?.claimTicketNo || id}`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted warranty claim ticket #${claim?.claimTicketNo || id} (${claim?.productName || ''}) on ${nowStr}.`,
      severity: 'danger',
      targetId: id,
      targetName: `Warranty Claim Ticket #${claim?.claimTicketNo || id}`,
    });

    showToast(language === 'bn' ? `ওয়ারেন্টি ক্লেইম টিকেট (${nowStr}) মুছে ফেলা হয়েছে` : `Warranty claim ticket deleted on ${nowStr}`, 'info');
  };

  const addPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => {
    const poNumber = `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const creatorName = currentUser?.fullName || currentUser?.username || 'Admin';
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      poNumber,
      createdAt: `${poData.date} ${nowTime}`,
      createdBy: creatorName,
      contributors: [
        {
          action: 'Created PO',
          actionBn: 'ক্রয় আদেশ তৈরি',
          userName: creatorName,
          userId: currentUser?.id,
          userRole: currentUser?.role,
          timestamp: `${poData.date} ${nowTime}`,
        },
      ],
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
    showToast(language === 'bn' ? `ক্রয় আদেশ ${poNumber} তৈরি করা হয়েছে।` : `Purchase Order ${poNumber} created successfully.`, 'success');
    return newPO;
  };

  const updatePurchaseOrderStatus = (id: string, status: POStatus) => {
    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().split('T')[0];

    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === id) {
        const update: Partial<PurchaseOrder> = { status };
        const existingContributors = po.contributors || [
          {
            action: 'Created PO',
            actionBn: 'ক্রয় আদেশ তৈরি',
            userName: po.createdBy || 'Admin',
            timestamp: po.createdAt,
          },
        ];

        if (status === 'APPROVED') {
          update.approvedBy = approverName;
          update.contributors = [
            ...existingContributors,
            {
              action: 'Approved PO',
              actionBn: 'অনুমোদন কারী',
              userName: approverName,
              userId: currentUser?.id,
              userRole: currentUser?.role,
              timestamp: `${today} ${nowTime}`,
            },
          ];
        } else if (status === 'CANCELLED') {
          update.contributors = [
            ...existingContributors,
            {
              action: 'Cancelled PO',
              actionBn: 'বাতিল কারী',
              userName: approverName,
              userId: currentUser?.id,
              userRole: currentUser?.role,
              timestamp: `${today} ${nowTime}`,
            },
          ];
        }
        return { ...po, ...update };
      }
      return po;
    }));
    showToast(language === 'bn' ? 'ক্রয় আদেশের স্ট্যাটাস আপডেট করা হয়েছে।' : 'Purchase Order status updated.', 'success');
  };

  const deletePurchaseOrder = (id: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    setPurchaseOrders(prev => prev.filter(p => p.id !== id));
    if (po) {
      logActivity({
        actionType: 'DELETE',
        title: `Deleted Purchase Order #${po.poNumber}`,
        description: `Removed purchase order for ${po.supplierName} amounting to ৳${po.grandTotal.toLocaleString()}.`,
        severity: 'warning',
        targetId: po.id,
        targetName: `PO #${po.poNumber}`,
      });
    }
    showToast(language === 'bn' ? 'ক্রয় আদেশ মুছে ফেলা হয়েছে।' : 'Purchase order deleted.', 'info');
  };

  const addQuotation = (qData: Omit<Quotation, 'id' | 'quotationNumber' | 'createdAt'>) => {
    const quotationNumber = `QT-${new Date().getFullYear()}-${String(quotations.length + 1).padStart(3, '0')}`;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const creatorName = currentUser?.fullName || currentUser?.username || 'Admin';
    const newQuotation: Quotation = {
      ...qData,
      id: `qt-${Date.now()}`,
      quotationNumber,
      createdAt: `${qData.date} ${nowTime}`,
      createdBy: creatorName,
      contributors: [
        {
          action: 'Created Quotation',
          actionBn: 'কোটেশন প্রস্তুত',
          userName: creatorName,
          userId: currentUser?.id,
          userRole: currentUser?.role,
          timestamp: `${qData.date} ${nowTime}`,
        },
      ],
    };
    setQuotations(prev => [newQuotation, ...prev]);
    showToast(language === 'bn' ? `কোটেশন ${quotationNumber} তৈরি করা হয়েছে।` : `Quotation ${quotationNumber} created successfully.`, 'success');
    return newQuotation;
  };

  const updateQuotationStatus = (id: string, status: QuotationStatus) => {
    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().split('T')[0];

    setQuotations(prev => prev.map(q => {
      if (q.id === id) {
        const update: Partial<Quotation> = { status };
        const existingContributors = q.contributors || [
          {
            action: 'Created Quotation',
            actionBn: 'কোটেশন প্রস্তুত',
            userName: q.createdBy || 'Admin',
            timestamp: q.createdAt,
          },
        ];

        if (status === 'APPROVED') {
          update.approvedBy = approverName;
          update.approvedAt = new Date().toISOString();
          update.contributors = [
            ...existingContributors,
            {
              action: 'Approved Quotation',
              actionBn: 'অনুমোদন কারী',
              userName: approverName,
              userId: currentUser?.id,
              userRole: currentUser?.role,
              timestamp: `${today} ${nowTime}`,
            },
          ];
        } else if (status === 'CANCELLED') {
          update.contributors = [
            ...existingContributors,
            {
              action: 'Cancelled Quotation',
              actionBn: 'বাতিল কারী',
              userName: approverName,
              userId: currentUser?.id,
              userRole: currentUser?.role,
              timestamp: `${today} ${nowTime}`,
            },
          ];
        }
        return { ...q, ...update };
      }
      return q;
    }));
    showToast(language === 'bn' ? 'কোটেশন স্ট্যাটাস আপডেট করা হয়েছে।' : 'Quotation status updated.', 'success');
  };

  const deleteQuotation = (id: string) => {
    const q = quotations.find(item => item.id === id);
    setQuotations(prev => prev.filter(item => item.id !== id));
    if (q) {
      logActivity({
        actionType: 'DELETE',
        title: `Deleted Quotation #${q.quotationNumber}`,
        description: `Removed quotation for ${q.customerName} amounting to ৳${q.grandTotal.toLocaleString()}.`,
        severity: 'warning',
        targetId: q.id,
        targetName: `QT #${q.quotationNumber}`,
      });
    }
    showToast(language === 'bn' ? 'কোটেশন মুছে ফেলা হয়েছে।' : 'Quotation deleted.', 'info');
  };

  const convertQuotationToSale = (qId: string, paidAmount: number, walletId: string, paymentMethod: PaymentMethod, customInvoiceNumber?: string): SaleInvoice | null => {
    const quotation = quotations.find(q => q.id === qId);
    if (!quotation) {
      showToast(language === 'bn' ? 'কোটেশন পাওয়া যায়নি!' : 'Quotation not found!', 'error');
      return null;
    }

    if (quotation.status === 'CONVERTED_TO_SALE') {
      showToast(language === 'bn' ? 'এই কোটেশনটি আগেই বিক্রয়ে রূপান্তরিত হয়েছে।' : 'This quotation has already been converted to a sale.', 'warning');
      return null;
    }

    const converterName = currentUser?.fullName || currentUser?.username || 'Admin';
    const quoteCreatorName = quotation.createdBy || 'Admin';
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().split('T')[0];

    const dueAmount = Math.max(0, quotation.grandTotal - paidAmount);

    const saleInvoice = createSaleInvoice({
      invoiceNumber: customInvoiceNumber?.trim() || undefined,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      items: quotation.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        return {
          ...item,
          barcode: prod?.barcode || '',
          unit: item.unit,
          purchasePrice: prod?.purchasePrice || 0,
          stock: prod?.stock || 0,
          total: item.total,
        };
      }),
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      discountType: quotation.discountType,
      vatAmount: quotation.taxAmount,
      grandTotal: quotation.grandTotal,
      paidAmount,
      dueAmount,
      paymentMethod,
      walletId,
      notes: `Converted from Quotation #${quotation.quotationNumber}. ${quotation.notes || ''}`,
    });

    if (saleInvoice) {
      // Update the Sale Invoice with Quotation Creator + Converter audit trail
      setSaleInvoices(prev =>
        prev.map(inv => {
          if (inv.id === saleInvoice.id) {
            return {
              ...inv,
              createdBy: quoteCreatorName,
              completedBy: converterName,
              convertedBy: converterName,
              approvedBy: quotation.approvedBy,
              contributors: [
                {
                  action: 'Quotation Created',
                  actionBn: 'কোটেশন তৈরি',
                  userName: quoteCreatorName,
                  timestamp: quotation.createdAt,
                },
                ...(quotation.approvedBy
                  ? [
                      {
                        action: 'Quotation Approved',
                        actionBn: 'কোটেশন অনুমোদন',
                        userName: quotation.approvedBy,
                        timestamp: quotation.approvedAt,
                      },
                    ]
                  : []),
                {
                  action: 'Converted & Finalized Sale',
                  actionBn: 'বিক্রয়ে রূপান্তর ও চালান চূড়ান্ত',
                  userName: converterName,
                  userId: currentUser?.id,
                  userRole: currentUser?.role,
                  timestamp: `${today} ${nowTime}`,
                },
              ],
            };
          }
          return inv;
        })
      );

      // Update Quotation with conversion details
      const existingQuoteContributors = quotation.contributors || [
        {
          action: 'Created Quotation',
          actionBn: 'কোটেশন প্রস্তুত',
          userName: quoteCreatorName,
          timestamp: quotation.createdAt,
        },
      ];

      setQuotations(prev =>
        prev.map(q =>
          q.id === qId
            ? {
                ...q,
                status: 'CONVERTED_TO_SALE',
                convertedSaleInvoiceId: saleInvoice.id,
                convertedBy: converterName,
                completedBy: converterName,
                contributors: [
                  ...existingQuoteContributors,
                  {
                    action: 'Converted to Sale Invoice',
                    actionBn: 'বিক্রয় চালানে রূপান্তর',
                    userName: converterName,
                    userId: currentUser?.id,
                    userRole: currentUser?.role,
                    timestamp: `${today} ${nowTime}`,
                  },
                ],
              }
            : q
        )
      );
      showToast(language === 'bn' ? 'কোটেশনটি সফলভাবে বিক্রয়ে রূপান্তরিত হয়েছে।' : 'Quotation successfully converted to sale.', 'success');
    }

    return saleInvoice;
  };

  const convertPOToPurchaseBill = (poId: string, finalItems: PurchaseItem[], finalDiscount: number = 0, paidAmount: number = 0, walletId?: string, customBillNumber?: string): PurchaseInvoice | null => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) {
      showToast(language === 'bn' ? 'ক্রয় আদেশ পাওয়া যায়নি!' : 'Purchase Order not found!', 'error');
      return null;
    }

    const converterName = currentUser?.fullName || currentUser?.username || 'Admin';
    const poCreatorName = po.createdBy || 'Admin';

    const finalSubtotal = finalItems.reduce((acc, item) => acc + item.total, 0);
    const finalGrandTotal = Math.max(0, finalSubtotal - finalDiscount);
    const dueAmount = Math.max(0, finalGrandTotal - paidAmount);

    let finalWalletId = walletId || wallets[0]?.id || 'w-cash';
    let walletName = 'Cash';

    if (paidAmount > 0) {
      const selectedWallet = wallets.find(w => w.id === finalWalletId);
      if (!selectedWallet) {
        showToast(language === 'bn' ? 'পেমেন্ট ওয়ালেট খুঁজে পাওয়া যায়নি!' : 'Payment wallet not found!', 'error');
        return null;
      }
      if (selectedWallet.balance < paidAmount) {
        showToast(
          language === 'bn'
            ? `নির্বাচিত ওয়ালেটে (${selectedWallet.name}) পর্যাপ্ত ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳${selectedWallet.balance.toLocaleString()} | পরিশোধ: ৳${paidAmount.toLocaleString()}।`
            : `Insufficient balance in ${selectedWallet.name}! Available: ৳${selectedWallet.balance.toLocaleString()} | Trying to pay: ৳${paidAmount.toLocaleString()}.`,
          'error'
        );
        return null;
      }
      walletName = selectedWallet.name;
    }

    const billNum = customBillNumber?.trim() || generatePurchaseBillNumber(purchaseInvoices);
    const duplicateBill = checkDuplicatePurchaseInvoice(billNum, purchaseInvoices);
    if (duplicateBill) {
      showToast(
        language === 'bn'
          ? `আগে থেকে এই Invoice No এন্ট্রি আছে! (${billNum}) ইতিমধ্যে "${duplicateBill.supplierName}"-এর ক্রয়ে ব্যবহৃত। একই ইনভয়েস নং দুইবার এন্ট্রি হবে না।`
          : `This Invoice No is already entered previously! (${billNum}) Duplicate Invoice No not allowed.`,
        'error'
      );
      return null;
    }

    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const purDate = new Date().toISOString().split('T')[0];

    const newPurchase: PurchaseInvoice = {
      id: `pur-${Date.now()}`,
      billNumber: billNum,
      supplierInvoiceNo: customBillNumber?.trim() || po.poNumber,
      date: purDate,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      supplierPhone: po.supplierPhone,
      items: finalItems.map(i => ({ ...i })),
      subtotal: finalSubtotal,
      discount: finalDiscount,
      taxAmount: po.taxAmount,
      grandTotal: finalGrandTotal,
      paidAmount: paidAmount,
      dueAmount: dueAmount,
      paymentMethod: paidAmount === 0 ? 'DUE' : 'CASH',
      walletId: paidAmount === 0 ? undefined : finalWalletId,
      walletName: paidAmount === 0 ? 'Credit / বাকি' : walletName,
      status: dueAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'DUE'),
      notes: `Converted from PO #${po.poNumber}. ${po.notes || ''}`,
      createdBy: poCreatorName,
      completedBy: converterName,
      convertedBy: converterName,
      approvedBy: po.approvedBy,
      contributors: [
        {
          action: 'Purchase Order Issued',
          actionBn: 'ক্রয় আদেশ প্রদান',
          userName: poCreatorName,
          timestamp: po.createdAt,
        },
        ...(po.approvedBy
          ? [
              {
                action: 'Purchase Order Approved',
                actionBn: 'ক্রয় আদেশ অনুমোদন',
                userName: po.approvedBy,
              },
            ]
          : []),
        {
          action: 'Received & Billed',
          actionBn: 'পণ্য রিসিভ ও বিল এন্ট্রি',
          userName: converterName,
          userId: currentUser?.id,
          userRole: currentUser?.role,
          timestamp: `${purDate} ${nowTime}`,
        },
      ],
      createdAt: `${purDate} ${nowTime}`,
    };

    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemPurchased = finalItems.find(i => i.productId === prod.id);
        if (itemPurchased) {
          const addedQty = Number(itemPurchased.quantity || 0);
          const newStock = Number(prod.stock || 0) + addedQty;
          const purchasePrice = Number(itemPurchased.purchasePrice || prod.purchasePrice);
          const salesPrice = Number(itemPurchased.salesPrice || prod.salesPrice);
          
          let updatedBatches = prod.batches ? [...prod.batches.map(b => ({ ...b }))] : [];
          updatedBatches.push({
            id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            batchNumber: itemPurchased.batchNumber || `BN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            purchaseInvoiceNo: billNum,
            mfgDate: itemPurchased.mfgDate || purDate,
            expDate: itemPurchased.expDate || '',
            stock: addedQty,
            purchasePrice,
            salesPrice,
            supplierName: po.supplierName,
            supplierId: po.supplierId,
          });

          return {
            ...prod,
            stock: newStock,
            purchasePrice,
            batchNumber: itemPurchased.batchNumber || prod.batchNumber,
            expDate: itemPurchased.expDate || prod.expDate,
            batches: updatedBatches,
          };
        }
        return prod;
      })
    );

    if (po.supplierId && dueAmount > 0) {
      setParties(prevParties =>
        prevParties.map(p => {
          if (p.id === po.supplierId) {
            return {
              ...p,
              currentBalance: Number(p.currentBalance || 0) + dueAmount,
            };
          }
          return p;
        })
      );
    }

    if (paidAmount > 0) {
      setWallets(prevWallets =>
        prevWallets.map(w => {
          if (w.id === finalWalletId) {
            return {
              ...w,
              balance: w.balance - paidAmount,
            };
          }
          return w;
        })
      );
    }

    const dayBookEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      voucherNo: billNum,
      date: purDate,
      type: 'PURCHASE',
      flow: 'OUT',
      partyId: po.supplierId,
      partyName: po.supplierName,
      partyType: 'SUPPLIER',
      amount: Number(paidAmount || 0),
      walletId: paidAmount > 0 ? finalWalletId : 'credit',
      walletName: paidAmount > 0 ? walletName : 'Credit / বাকি',
      referenceNo: billNum,
      remarks: po.notes 
        ? `Converted from PO #${po.poNumber}. ${po.notes}`
        : paidAmount > 0
          ? `Purchase payment to ${po.supplierName} via PO #${po.poNumber} (Total: ৳${finalGrandTotal.toLocaleString()}, Paid: ৳${paidAmount.toLocaleString()}${dueAmount > 0 ? `, Remaining Due: ৳${dueAmount.toLocaleString()}` : ''})`
          : `Credit Purchase via PO #${po.poNumber} from ${po.supplierName} (Total: ৳${finalGrandTotal.toLocaleString()}, Due: ৳${dueAmount.toLocaleString()})`,
      createdBy: currentUser?.id || 'usr-1',
      approvedBy: po.approvedBy,
      createdAt: `${purDate} ${nowTime}`,
    };
    setDayBookEntries(prev => [dayBookEntry, ...prev]);

    setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: 'FULLY_RECEIVED' } : p));
    setPurchaseInvoices(prev => [newPurchase, ...prev]);

    logActivity({
      actionType: 'STOCK_ADJUSTMENT',
      title: `Converted PO #${po.poNumber} to Bill #${billNum}`,
      description: `Converted Purchase Order #${po.poNumber} for ${po.supplierName} (৳${finalGrandTotal.toLocaleString()}). Paid: ৳${paidAmount.toLocaleString()}, Due: ৳${dueAmount.toLocaleString()}.`,
      severity: 'info',
      targetId: newPurchase.id,
      targetName: `Bill #${billNum}`,
    });

    showToast(language === 'bn' ? `ক্রয় আদেশ সফলভাবে ক্রয় বিলে রূপান্তর করা হয়েছে (${billNum})!` : `PO converted to Purchase Bill ${billNum} successfully!`, 'success');
    return newPurchase;
  };
  const [expiredReturnLogs, setExpiredReturnLogs] = useState<ExpiredReturnLog[]>(() => getPersistedData('expiredReturnLogs', []));
  const [diseaseMaster, setDiseaseMaster] = useState<DiseaseMasterEntry[]>(() =>
    getPersistedData('diseaseMaster', INITIAL_DISEASE_MASTER)
  );
  const [diseaseCategories, setDiseaseCategories] = useState<DiseaseCategoryItem[]>(() =>
    getPersistedData('diseaseCategories', COMMON_DISEASE_CATEGORIES)
  );

  const addExpiredReturnLog = (logData: Omit<ExpiredReturnLog, 'id' | 'date'> & { date?: string }) => {
    const creator = currentUser?.fullName || currentUser?.username || currentUser?.id || 'Admin';
    const newLog: ExpiredReturnLog = {
      ...logData,
      id: `expret-${Date.now()}`,
      date: logData.date || new Date().toISOString().split('T')[0],
      createdBy: logData.createdBy || creator,
    };
    setExpiredReturnLogs(prev => [newLog, ...prev]);
    showToast(
      logData.actionType === 'RETURN_SUPPLIER'
        ? (language === 'bn' ? 'মহাজনে ফেরত হিসাব রেকর্ড করা হয়েছে।' : 'Supplier return recorded.')
        : logData.actionType === 'REPLACEMENT'
        ? (language === 'bn' ? 'পণ্য রিপ্লেসমেন্ট (Replace) হিসাব সফলভাবে রেকর্ড করা হয়েছে।' : 'Product replacement recorded.')
        : (language === 'bn' ? 'নষ্ট/অবলোপন (Write-off) হিসাব রেকর্ড করা হয়েছে।' : 'Write-off record saved.'),
      'success'
    );
  };

  const deleteExpiredReturnLog = (id: string) => {
    setExpiredReturnLogs(prev => prev.filter(l => l.id !== id));
    showToast(language === 'bn' ? 'রেকর্ড মুছে ফেলা হয়েছে।' : 'Record deleted.', 'info');
  };
  const [smsConfig, setSmsConfig] = useState<SmsConfig>(() => getPersistedData('smsConfig', DEFAULT_SMS_CONFIG));
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>(() => getPersistedData('smsLogs', []));

  const [installmentSchemes, setInstallmentSchemes] = useState<InstallmentScheme[]>(() => getPersistedData('installmentSchemes', initialInstallmentSchemes));
  const [employees, setEmployees] = useState<Employee[]>(() => getPersistedData('employees', initialEmployees));
  const [advanceSalaries, setAdvanceSalaries] = useState<AdvanceSalary[]>(() => getPersistedData('advanceSalaries', initialAdvanceSalaries));
  const [payrollHistory, setPayrollHistory] = useState<PayrollEntry[]>(() => getPersistedData('payrollHistory', initialPayrollHistory));
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() => getPersistedData('expenseCategories', initialExpenseCategories));
  const [expenseVouchers, setExpenseVouchers] = useState<ExpenseVoucher[]>(() => getPersistedData('expenseVouchers', initialExpenseVouchers));
  const [dayBookEntries, setDayBookEntries] = useState<DayBookEntry[]>(() => {
    const raw: DayBookEntry[] = getPersistedData('dayBookEntries', initialDayBookEntries);
    const purchases: PurchaseInvoice[] = getPersistedData('purchaseInvoices', initialPurchaseInvoices);
    const sales: SaleInvoice[] = getPersistedData('saleInvoices', initialSaleInvoices);
    
    let entries = Array.isArray(raw) ? [...raw] : [];

    // Ensure all purchases are represented in DayBook
    purchases.forEach(pur => {
      const exists = entries.some(e => e.voucherNo === pur.billNumber || e.referenceNo === pur.billNumber);
      if (!exists) {
        entries.push({
          id: `db-pur-${pur.id}`,
          voucherNo: pur.billNumber,
          date: pur.date,
          type: 'PURCHASE',
          flow: 'OUT',
          partyId: pur.supplierId,
          partyName: pur.supplierName,
          partyType: 'SUPPLIER',
          amount: Number(pur.paidAmount || 0), // ONLY the paid amount! (0 if credit)
          walletId: pur.paidAmount > 0 ? (pur.walletId || 'w-cash') : 'credit',
          walletName: pur.paidAmount > 0 ? (pur.walletName || 'Cash') : 'Credit / বাকি',
          referenceNo: pur.billNumber,
          remarks: pur.notes
            ? `Purchase from ${pur.supplierName} (${pur.notes})`
            : pur.paidAmount > 0
              ? `Purchase from ${pur.supplierName} (Total: ৳${pur.grandTotal.toLocaleString()}, Paid: ৳${pur.paidAmount.toLocaleString()}${pur.dueAmount > 0 ? `, Due: ৳${pur.dueAmount.toLocaleString()}` : ''})`
              : `Credit Purchase / বাকি ক্রয় from ${pur.supplierName} (Total: ৳${pur.grandTotal.toLocaleString()}, Due: ৳${pur.dueAmount.toLocaleString()})`,
          createdBy: 'Admin',
          createdAt: pur.createdAt || `${pur.date} 00:00:00`,
        });
      }
    });

    // Ensure all sales are represented in DayBook
    sales.forEach(sale => {
      const exists = entries.some(e => e.voucherNo === sale.invoiceNumber || e.referenceNo === sale.invoiceNumber);
      if (!exists) {
        entries.push({
          id: `db-sale-${sale.id}`,
          voucherNo: sale.invoiceNumber,
          date: sale.date,
          type: 'SALE',
          flow: 'IN',
          partyId: sale.customerId,
          partyName: sale.customerName,
          partyType: 'CUSTOMER',
          amount: Number(sale.paidAmount || 0), // ONLY the received amount! (0 if credit)
          walletId: sale.paidAmount > 0 ? (sale.walletId || 'w-cash') : 'due',
          walletName: sale.paidAmount > 0 ? (sale.walletName || 'Cash') : 'Credit / বাকি',
          referenceNo: sale.invoiceNumber,
          remarks: sale.notes
            ? `Sale to ${sale.customerName} (${sale.notes})`
            : sale.paidAmount > 0
              ? `POS Sale to ${sale.customerName} (Total: ৳${sale.grandTotal.toLocaleString()}, Received: ৳${sale.paidAmount.toLocaleString()}${sale.dueAmount > 0 ? `, Due: ৳${sale.dueAmount.toLocaleString()}` : ''})`
              : `Credit Sale / বাকি বিক্রয় to ${sale.customerName} (Total: ৳${sale.grandTotal.toLocaleString()}, Due: ৳${sale.dueAmount.toLocaleString()})`,
          createdBy: sale.cashierName || 'Admin',
          createdAt: sale.createdAt || `${sale.date} 00:00:00`,
        });
      }
    });

    // Normalize any past entries where credit purchase/sale had grandTotal stored instead of paidAmount
    return entries.map(entry => {
      if (entry.type === 'PURCHASE') {
        const matchingPur = purchases.find(p => p.billNumber === entry.voucherNo || p.billNumber === entry.referenceNo);
        if (matchingPur) {
          return {
            ...entry,
            amount: Number(matchingPur.paidAmount || 0),
            walletName: matchingPur.paidAmount > 0 ? (entry.walletName || matchingPur.walletName || 'Cash') : 'Credit / বাকি',
          };
        }
      }
      if (entry.type === 'SALE') {
        const matchingSale = sales.find(s => s.invoiceNumber === entry.voucherNo || s.invoiceNumber === entry.referenceNo);
        if (matchingSale) {
          return {
            ...entry,
            amount: Number(matchingSale.paidAmount || 0),
            walletName: matchingSale.paidAmount > 0 ? (entry.walletName || matchingSale.walletName || 'Cash') : 'Credit / বাকি',
          };
        }
      }
      return entry;
    });
  });
  const [cashAdjustments, setCashAdjustments] = useState<CashAdjustment[]>(() => getPersistedData('cashAdjustments', initialCashAdjustments));
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => getPersistedData('activityLogs', initialActivityLogs));

  const formatDeletionTimestamp = (dateInput?: Date | string | number): string => {
    const date = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(date.getTime())) {
      return String(dateInput || '');
    }
    
    const year = date.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    
    return `${day} ${month} ${year}, ${strHours}:${minutes}:${seconds} ${ampm}`;
  };

  const logActivity = (logData: Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'role'>) => {
    const now = new Date();
    const formattedTime = formatDeletionTimestamp(now);
    const newLog: ActivityLog = {
      ...logData,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: formattedTime,
      userId: currentUser?.id || 'usr-1',
      userName: currentUser?.fullName || 'Mohammad Shafiul Islam',
      role: currentUser?.role || 'ADMIN',
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };
  const [users, setUsers] = useState<UserAccount[]>(() => getPersistedData('users', initialUsers));
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const savedUserStr = sessionStorage.getItem('DOKANPRO_CURRENT_USER');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed && parsed.username) return parsed;
      }
    } catch {}
    const loadedUsers = getPersistedData('users', initialUsers);
    return loadedUsers[0] || initialUsers[0];
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const sessionAuth = sessionStorage.getItem('DOKANPRO_IS_LOGGED_IN');
      return sessionAuth === 'true';
    } catch {
      return false;
    }
  });

  const logout = () => {
    try {
      sessionStorage.removeItem('DOKANPRO_IS_LOGGED_IN');
      sessionStorage.removeItem('DOKANPRO_CURRENT_USER');
    } catch {}
    setIsLoggedIn(false);
    showToast(language === 'bn' ? 'সফলভাবে লগআউট করা হয়েছে।' : 'Logged out successfully.', 'success');
  };

  const login = (username: string, password?: string): boolean => {
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (found) {
      if (!found.isActive) {
        showToast(language === 'bn' ? 'এই ইউজার অ্যাকাউন্ট নিষ্ক্রিয় রয়েছে।' : 'This user account is inactive.', 'error');
        return false;
      }
      // Strict password verification on login
      if (found.password) {
        if (!password || found.password.trim() !== password.trim()) {
          showToast(language === 'bn' ? 'ভুল পাসওয়ার্ড!' : 'Incorrect password!', 'error');
          return false;
        }
      }
      setCurrentUser(found);
      setIsLoggedIn(true);
      try {
        sessionStorage.setItem('DOKANPRO_IS_LOGGED_IN', 'true');
        sessionStorage.setItem('DOKANPRO_CURRENT_USER', JSON.stringify(found));
      } catch {}
      if (!isTabAllowed(found, activeTab)) {
        setActiveTab(getFirstAllowedTab(found));
      }
      showToast(language === 'bn' ? `স্বাগতম, ${found.fullName}!` : `Welcome back, ${found.fullName}!`, 'success');
      return true;
    }
    showToast(language === 'bn' ? 'ইউজার পাওয়া যায়নি।' : 'User not found.', 'error');
    return false;
  };

  const switchUser = (targetUserId: string, password?: string): boolean => {
    const targetUser = users.find(
      u => u.id === targetUserId || u.username.toLowerCase() === targetUserId.toLowerCase()
    );
    if (!targetUser) {
      showToast(language === 'bn' ? 'ইউজার পাওয়া যায়নি।' : 'User not found.', 'error');
      return false;
    }
    if (!targetUser.isActive) {
      showToast(language === 'bn' ? 'এই ইউজার অ্যাকাউন্ট নিষ্ক্রিয় রয়েছে।' : 'This user account is inactive.', 'error');
      return false;
    }

    // 1. If currently logged in user is ADMIN:
    // Admin can freely switch to ANY user without password or ID prompt
    if (currentUser.role === 'ADMIN') {
      setCurrentUser(targetUser);
      setIsLoggedIn(true);
      try {
        sessionStorage.setItem('DOKANPRO_IS_LOGGED_IN', 'true');
        sessionStorage.setItem('DOKANPRO_CURRENT_USER', JSON.stringify(targetUser));
      } catch {}
      if (!isTabAllowed(targetUser, activeTab)) {
        setActiveTab(getFirstAllowedTab(targetUser));
      }
      showToast(
        language === 'bn'
          ? `এডমিন হিসেবে '${targetUser.fullName}' আইডিতে সরাসরি লগইন করা হয়েছে।`
          : `Switched to '${targetUser.fullName}' (Admin Privilege - No password needed).`,
        'success'
      );
      return true;
    }

    // 2. If currently logged in user is NOT ADMIN:
    // User CANNOT switch to any other user without valid credentials!
    if (targetUser.password) {
      if (!password || password.trim() !== targetUser.password.trim()) {
        showToast(
          language === 'bn'
            ? 'ভুল পাসওয়ার্ড! এডমিন ব্যতীত অন্য ইউজারে পরিবর্তন করতে সঠিক পাসওয়ার্ড আবশ্যক।'
            : 'Incorrect password! Password required to switch user.',
          'error'
        );
        return false;
      }
    }

    setCurrentUser(targetUser);
    setIsLoggedIn(true);
    try {
      sessionStorage.setItem('DOKANPRO_IS_LOGGED_IN', 'true');
      sessionStorage.setItem('DOKANPRO_CURRENT_USER', JSON.stringify(targetUser));
    } catch {}
    if (!isTabAllowed(targetUser, activeTab)) {
      setActiveTab(getFirstAllowedTab(targetUser));
    }
    showToast(
      language === 'bn'
        ? `সফলভাবে '${targetUser.fullName}' হিসেবে লগইন করা হয়েছে।`
        : `Switched to '${targetUser.fullName}'.`,
      'success'
    );
    return true;
  };

  // Save changes to local storage
  useEffect(() => {
    try {
      const payload = {
        companySettings,
        products,
        deletedProductIds,
        categories,
        parties,
        wallets,
        saleInvoices,
        deletedSaleInvoices,
        saleReturns,
        purchaseInvoices,
        deletedPurchaseInvoices,
        purchaseReturns,
        purchaseOrders,
        quotations,
        expiredReturnLogs,
        installmentSchemes,
        employees,
        advanceSalaries,
        payrollHistory,
        expenseCategories,
        expenseVouchers,
        dayBookEntries,
        cashAdjustments,
        activityLogs,
        users,
        smsConfig,
        smsLogs,
        warrantyPolicies,
        warrantyRecords,
        warrantyClaims,
        diseaseMaster,
        diseaseCategories,
        language,
        theme,
        lastUpdatedEpoch: Date.now(),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem('companySettings', JSON.stringify(companySettings));
      localStorage.setItem('dokanpro_disease_master', JSON.stringify(diseaseMaster));
      localStorage.setItem('dokanpro_disease_categories', JSON.stringify(diseaseCategories));
      localStorage.setItem('DOKANPRO_LAST_LOCAL_UPDATE_EPOCH', String(Date.now()));
    } catch (e) {
      console.warn('Failed to save to local storage', e);
      try {
        localStorage.setItem('companySettings', JSON.stringify(companySettings));
      } catch {}
    }
  }, [
    companySettings,
    products,
    categories,
    parties,
    wallets,
    saleInvoices,
    deletedSaleInvoices,
    saleReturns,
    purchaseInvoices,
    deletedPurchaseInvoices,
    purchaseReturns,
    purchaseOrders,
    quotations,
    expiredReturnLogs,
    installmentSchemes,
    employees,
    advanceSalaries,
    payrollHistory,
    expenseCategories,
    expenseVouchers,
    dayBookEntries,
    cashAdjustments,
    activityLogs,
    users,
    smsConfig,
    smsLogs,
    warrantyPolicies,
    warrantyRecords,
    warrantyClaims,
    diseaseMaster,
    diseaseCategories,
    language,
    theme,
  ]);

  // Apply dark mode class to HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // -------------------------------------------------------------
  // Cloud & Multi-Device Auto-Sync Implementation
  // -------------------------------------------------------------
  const [isSyncingWithServer, setIsSyncingWithServer] = useState(false);
  const lastPushTimeRef = useRef<number>(0);
  const lastServerUpdatedEpochRef = useRef<number>(
    (() => {
      try {
        const savedEpoch = localStorage.getItem('DOKANPRO_LAST_LOCAL_UPDATE_EPOCH');
        if (savedEpoch) return Number(savedEpoch) || 0;
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.lastUpdatedEpoch) return Number(parsed.lastUpdatedEpoch) || 0;
        }
      } catch {}
      return 0;
    })()
  );
  const isPullingRef = useRef<boolean>(false);
  const hasCompletedInitialServerSyncRef = useRef<boolean>(true);
  const [lastServerSyncTime, setLastServerSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem('DOKANPRO_LAST_SYNC_TIME');
    } catch {
      return null;
    }
  });
  const [serverSyncStatus, setServerSyncStatus] = useState<{ success: boolean; message: string; timestamp?: string } | null>(null);

  const autoSyncIntervalSeconds = companySettings.autoSyncIntervalSeconds || 30;
  const isAutoSyncEnabled = companySettings.autoSyncEnabled !== false;
  const [syncCountdown, setSyncCountdown] = useState<number>(autoSyncIntervalSeconds);

  const setAutoSyncIntervalSeconds = (seconds: number) => {
    setCompanySettings(prev => ({
      ...prev,
      autoSyncIntervalSeconds: seconds,
    }));
    setSyncCountdown(seconds);
  };

  const setIsAutoSyncEnabled = (enabled: boolean) => {
    setCompanySettings(prev => ({
      ...prev,
      autoSyncEnabled: enabled,
    }));
  };

  // Helper to determine active endpoint
  const getActiveApiEndpoint = (overrideUrl?: string): string => {
    if (overrideUrl && overrideUrl.trim()) return overrideUrl.trim();
    if (companySettings.apiEndpoint && companySettings.apiEndpoint.trim()) {
      return companySettings.apiEndpoint.trim();
    }
    try {
      const saved = localStorage.getItem('DOKANPRO_ERP_API_ENDPOINT');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      const pathname = window.location.pathname;
      const dir = pathname.substring(0, pathname.lastIndexOf('/') + 1) || '/';
      const cleanDir = dir.endsWith('/') ? dir : `${dir}/`;
      return `${window.location.origin}${cleanDir}api.php`;
    }
    return 'api.php';
  };

  // Reload local state from localStorage for multi-tab sync
  const reloadFromLocalStorage = () => {
    try {
      // Check dedicated companySettings first
      try {
        const standaloneSettings = localStorage.getItem('companySettings');
        if (standaloneSettings) {
          const parsedSettings = JSON.parse(standaloneSettings);
          if (parsedSettings) setCompanySettings(parsedSettings);
        }
      } catch {}

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data) {
        if (data.companySettings && !localStorage.getItem('companySettings')) setCompanySettings(data.companySettings);
        if (Array.isArray(data.products)) setProducts(data.products);
        if (Array.isArray(data.categories)) setCategories(data.categories);
        if (Array.isArray(data.parties)) setParties(data.parties);
        if (Array.isArray(data.wallets)) setWallets(data.wallets);
        if (Array.isArray(data.saleInvoices)) setSaleInvoices(data.saleInvoices);
        if (Array.isArray(data.deletedSaleInvoices)) setDeletedSaleInvoices(data.deletedSaleInvoices);
        if (Array.isArray(data.saleReturns)) setSaleReturns(data.saleReturns);
        if (Array.isArray(data.purchaseInvoices)) setPurchaseInvoices(data.purchaseInvoices);
        if (Array.isArray(data.deletedPurchaseInvoices)) setDeletedPurchaseInvoices(data.deletedPurchaseInvoices);
        if (Array.isArray(data.purchaseReturns)) setPurchaseReturns(data.purchaseReturns);
        if (Array.isArray(data.purchaseOrders)) setPurchaseOrders(data.purchaseOrders);
        if (Array.isArray(data.quotations)) setQuotations(data.quotations);
        if (Array.isArray(data.expiredReturnLogs)) setExpiredReturnLogs(data.expiredReturnLogs);
        if (Array.isArray(data.installmentSchemes)) setInstallmentSchemes(data.installmentSchemes);
        if (Array.isArray(data.employees)) setEmployees(data.employees);
        if (Array.isArray(data.advanceSalaries)) setAdvanceSalaries(data.advanceSalaries);
        if (Array.isArray(data.payrollHistory)) setPayrollHistory(data.payrollHistory);
        if (Array.isArray(data.expenseCategories)) setExpenseCategories(data.expenseCategories);
        if (Array.isArray(data.expenseVouchers)) setExpenseVouchers(data.expenseVouchers);
        if (Array.isArray(data.dayBookEntries)) setDayBookEntries(data.dayBookEntries);
        if (Array.isArray(data.cashAdjustments)) setCashAdjustments(data.cashAdjustments);
        if (Array.isArray(data.activityLogs)) setActivityLogs(data.activityLogs);
        if (Array.isArray(data.users)) setUsers(data.users);
        if (Array.isArray(data.warrantyPolicies)) setWarrantyPolicies(data.warrantyPolicies);
        if (Array.isArray(data.warrantyRecords)) setWarrantyRecords(data.warrantyRecords);
        if (Array.isArray(data.warrantyClaims)) setWarrantyClaims(data.warrantyClaims);
      }
    } catch {}
  };

  // Push full ERP state to API endpoint
  const triggerServerPush = async (customUrl?: string, silent = false): Promise<boolean> => {
    const targetUrl = getActiveApiEndpoint(customUrl);
    if (!targetUrl) return false;

    if (!silent) {
      setIsSyncingWithServer(true);
    }
    const pushTimestamp = Date.now();
    lastPushTimeRef.current = pushTimestamp;

    try {
      const fullState = {
        companySettings,
        products,
        deletedProductIds,
        categories,
        parties,
        wallets,
        saleInvoices,
        deletedSaleInvoices,
        saleReturns,
        purchaseInvoices,
        deletedPurchaseInvoices,
        purchaseReturns,
        purchaseOrders,
        quotations,
        expiredReturnLogs,
        installmentSchemes,
        employees,
        advanceSalaries,
        payrollHistory,
        expenseCategories,
        expenseVouchers,
        dayBookEntries,
        cashAdjustments,
        activityLogs,
        users,
        smsConfig,
        smsLogs,
        warrantyPolicies,
        warrantyRecords,
        warrantyClaims,
        lastUpdatedEpoch: pushTimestamp,
      };

      const endpoint = targetUrl.includes('?') ? `${targetUrl}&action=sync_all` : `${targetUrl}?action=sync_all`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullState),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const json = await res.json();
      if (json && json.success) {
        lastServerUpdatedEpochRef.current = pushTimestamp;
        const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastServerSyncTime(now);
        try {
          localStorage.setItem('DOKANPRO_LAST_SYNC_TIME', now);
        } catch {}
        if (!silent) {
          setServerSyncStatus({
            success: true,
            message: language === 'bn' ? 'হোস্ティング সার্ভারে সমস্ত ডাটা সফলভাবে সিঙ্ক ও সেভ হয়েছে।' : 'All ERP data synced to cloud successfully.',
            timestamp: now,
          });
        }

        // Broadcast to other open tabs on same device
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const bc = new BroadcastChannel('DOKANPRO_CROSS_TAB_CHANNEL');
            bc.postMessage({ type: 'STATE_UPDATED', timestamp: Date.now() });
            bc.close();
          }
        } catch {}

        return true;
      } else {
        if (!silent) {
          setServerSyncStatus({
            success: false,
            message: json?.message || 'Push sync failed',
          });
        }
        return false;
      }
    } catch (err: any) {
      if (!silent) {
        setServerSyncStatus({
          success: false,
          message: err?.message || 'Server connection error during sync',
        });
      }
      return false;
    } finally {
      if (!silent) {
        setIsSyncingWithServer(false);
      }
    }
  };

  // Pull latest snapshot from server to sync all devices in real-time
  const triggerServerPull = async (customUrl?: string, quiet = false): Promise<boolean> => {
    const targetUrl = getActiveApiEndpoint(customUrl);
    if (!targetUrl) return false;

    // Prevent overlapping pull calls
    if (isPullingRef.current) return false;

    // Safety guard: if local device made an entry or pushed within the last 4.5s, don't overwrite with older server data
    if (Date.now() - lastPushTimeRef.current < 4500) {
      return false;
    }

    isPullingRef.current = true;
    if (!quiet) {
      setIsSyncingWithServer(true);
    }

    try {
      const endpoint = targetUrl.includes('?') ? `${targetUrl}&action=sync_all` : `${targetUrl}?action=sync_all`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const json = await res.json();

      if (json && (json.products || json.saleInvoices || json.companySettings || json.data)) {
        const data = json.data ? json.data : json;
        const serverEpoch = Number(data.lastUpdatedEpoch) || 0;

        // Compare if incoming data has meaningful changes / new entries
        let hasNewIncomingEntries = false;
        if (
          (Array.isArray(data.saleInvoices) && data.saleInvoices.length !== saleInvoices.length) ||
          (Array.isArray(data.products) && data.products.length !== products.length) ||
          (Array.isArray(data.parties) && data.parties.length !== parties.length) ||
          (Array.isArray(data.purchaseInvoices) && data.purchaseInvoices.length !== purchaseInvoices.length) ||
          (Array.isArray(data.expenseVouchers) && data.expenseVouchers.length !== expenseVouchers.length) ||
          (Array.isArray(data.dayBookEntries) && data.dayBookEntries.length !== dayBookEntries.length)
        ) {
          hasNewIncomingEntries = true;
        }

        if (serverEpoch > 0 && serverEpoch <= lastServerUpdatedEpochRef.current && !hasNewIncomingEntries && quiet) {
          // Already have the latest or newer version
          hasCompletedInitialServerSyncRef.current = true;
          return true;
        }

        // Safe merge for companySettings: never allow name, phone, address to be wiped
        if (data.companySettings) {
          setCompanySettings(prev => {
            const raw = data.companySettings;
            const resolvedName = raw.name || raw.companyName || prev.name || initialCompanySettings.name;
            const merged: CompanySettings = {
              ...initialCompanySettings,
              ...prev,
              ...raw,
              name: resolvedName,
              phone: raw.phone || prev.phone || initialCompanySettings.phone || '',
              address: raw.address || prev.address || initialCompanySettings.address || '',
              email: raw.email || prev.email || initialCompanySettings.email || '',
            };
            try {
              localStorage.setItem('companySettings', JSON.stringify(merged));
              if (merged.apiEndpoint) {
                localStorage.setItem('DOKANPRO_ERP_API_ENDPOINT', merged.apiEndpoint);
              }
            } catch {}
            return merged;
          });
        }

        const allDeletedSaleIds = new Set<string>([
          ...deletedSaleInvoices.map(d => String(d.id || d.invoiceId || '')),
          ...((data.deletedSaleInvoices || []).map((d: any) => String(d.id || d.invoiceId || ''))),
        ].filter(Boolean));

        const allDeletedPurchaseIds = new Set<string>([
          ...deletedPurchaseInvoices.map(d => String(d.id || d.billNumber || '')),
          ...((data.deletedPurchaseInvoices || []).map((d: any) => String(d.id || d.billNumber || ''))),
        ].filter(Boolean));

        const allDeletedProductIds = new Set<string>([
          ...deletedProductIds.map(String),
          ...((data.deletedProductIds || []).map((d: any) => String(d))),
        ].filter(Boolean));
        
        // If server sent a reset / wipe snapshot, directly set clean empty states
        if (data.is_reset_wipe) {
          setProducts(Array.isArray(data.products) ? data.products : []);
          setDeletedProductIds([]);
          setCategories(Array.isArray(data.categories) ? data.categories : []);
          setParties(Array.isArray(data.parties) ? data.parties : []);
          setWallets(Array.isArray(data.wallets) ? data.wallets : initialWallets);
          setSaleInvoices(Array.isArray(data.saleInvoices) ? data.saleInvoices : []);
          setDeletedSaleInvoices([]);
          setSaleReturns(Array.isArray(data.saleReturns) ? data.saleReturns : []);
          setPurchaseInvoices(Array.isArray(data.purchaseInvoices) ? data.purchaseInvoices : []);
          setDeletedPurchaseInvoices([]);
          setPurchaseReturns(Array.isArray(data.purchaseReturns) ? data.purchaseReturns : []);
          setPurchaseOrders(Array.isArray(data.purchaseOrders) ? data.purchaseOrders : []);
          setQuotations(Array.isArray(data.quotations) ? data.quotations : []);
          setExpiredReturnLogs(Array.isArray(data.expiredReturnLogs) ? data.expiredReturnLogs : []);
          setInstallmentSchemes(Array.isArray(data.installmentSchemes) ? data.installmentSchemes : []);
          setEmployees(Array.isArray(data.employees) ? data.employees : []);
          setAdvanceSalaries(Array.isArray(data.advanceSalaries) ? data.advanceSalaries : []);
          setPayrollHistory(Array.isArray(data.payrollHistory) ? data.payrollHistory : []);
          setExpenseCategories(Array.isArray(data.expenseCategories) ? data.expenseCategories : initialExpenseCategories);
          setExpenseVouchers(Array.isArray(data.expenseVouchers) ? data.expenseVouchers : []);
          setDayBookEntries(Array.isArray(data.dayBookEntries) ? data.dayBookEntries : []);
          setCashAdjustments(Array.isArray(data.cashAdjustments) ? data.cashAdjustments : []);
          setActivityLogs(Array.isArray(data.activityLogs) ? data.activityLogs : []);
          setUsers(Array.isArray(data.users) && data.users.length > 0 ? data.users : initialUsers);
          setSmsLogs(Array.isArray(data.smsLogs) ? data.smsLogs : []);
          setWarrantyPolicies(Array.isArray(data.warrantyPolicies) ? data.warrantyPolicies : initialWarrantyPolicies);
          setWarrantyRecords(Array.isArray(data.warrantyRecords) ? data.warrantyRecords : []);
          setWarrantyClaims(Array.isArray(data.warrantyClaims) ? data.warrantyClaims : []);
        } else {
          // Smart multi-device union merge: never overwrite or wipe local unsynced entries, and honor deleted products
          if (Array.isArray(data.products)) {
            setProducts(prev => {
              const merged = mergeEntitiesById(prev, data.products) as Product[];
              return merged.filter(p => !allDeletedProductIds.has(String(p.id)) && (!p.sku || !allDeletedProductIds.has(String(p.sku))));
            });
          }
          if (Array.isArray(data.categories)) {
            setCategories(prev => mergeEntitiesById(prev, data.categories));
          }
          if (Array.isArray(data.parties)) {
            setParties(prev => mergeEntitiesById(prev, data.parties));
          }
          if (Array.isArray(data.wallets) && data.wallets.length > 0) {
            setWallets(prev => mergeEntitiesById(prev, data.wallets));
          }
          if (Array.isArray(data.saleInvoices)) {
            setSaleInvoices(prev => {
              const merged = mergeEntitiesById(prev, data.saleInvoices);
              return merged.filter(inv => !allDeletedSaleIds.has(String(inv.id)));
            });
          }
          if (Array.isArray(data.deletedSaleInvoices)) {
            setDeletedSaleInvoices(prev => mergeEntitiesById(prev, data.deletedSaleInvoices));
          }
          if (Array.isArray(data.saleReturns)) {
            setSaleReturns(prev => mergeEntitiesById(prev, data.saleReturns));
          }
          if (Array.isArray(data.purchaseInvoices)) {
            setPurchaseInvoices(prev => {
              const merged = mergeEntitiesById(prev, data.purchaseInvoices);
              return merged.filter(inv => !allDeletedPurchaseIds.has(String(inv.id)));
            });
          }
          if (Array.isArray(data.deletedPurchaseInvoices)) {
            setDeletedPurchaseInvoices(prev => mergeEntitiesById(prev, data.deletedPurchaseInvoices));
          }
          if (Array.isArray(data.purchaseReturns)) {
            setPurchaseReturns(prev => mergeEntitiesById(prev, data.purchaseReturns));
          }
          if (Array.isArray(data.purchaseOrders)) {
            setPurchaseOrders(prev => mergeEntitiesById(prev, data.purchaseOrders));
          }
          if (Array.isArray(data.quotations)) {
            setQuotations(prev => mergeEntitiesById(prev, data.quotations));
          }
          if (Array.isArray(data.expiredReturnLogs)) {
            setExpiredReturnLogs(prev => mergeEntitiesById(prev, data.expiredReturnLogs));
          }
          if (Array.isArray(data.installmentSchemes)) {
            setInstallmentSchemes(prev => mergeEntitiesById(prev, data.installmentSchemes));
          }
          if (Array.isArray(data.employees)) {
            setEmployees(prev => mergeEntitiesById(prev, data.employees));
          }
          if (Array.isArray(data.advanceSalaries)) {
            setAdvanceSalaries(prev => mergeEntitiesById(prev, data.advanceSalaries));
          }
          if (Array.isArray(data.payrollHistory)) {
            setPayrollHistory(prev => mergeEntitiesById(prev, data.payrollHistory));
          }
          if (Array.isArray(data.expenseCategories) && data.expenseCategories.length > 0) {
            setExpenseCategories(prev => mergeEntitiesById(prev, data.expenseCategories));
          }
          if (Array.isArray(data.expenseVouchers)) {
            setExpenseVouchers(prev => mergeEntitiesById(prev, data.expenseVouchers));
          }
          if (Array.isArray(data.dayBookEntries)) {
            setDayBookEntries(prev => mergeEntitiesById(prev, data.dayBookEntries));
          }
          if (Array.isArray(data.cashAdjustments)) {
            setCashAdjustments(prev => mergeEntitiesById(prev, data.cashAdjustments));
          }
          if (Array.isArray(data.activityLogs)) {
            setActivityLogs(prev => mergeEntitiesById(prev, data.activityLogs));
          }
          if (Array.isArray(data.users) && data.users.length > 0) {
            setUsers(prev => mergeEntitiesById(prev, data.users));
          }
          if (data.smsConfig) {
            setSmsConfig(prev => ({ ...prev, ...data.smsConfig }));
          }
          if (Array.isArray(data.smsLogs)) {
            setSmsLogs(prev => mergeEntitiesById(prev, data.smsLogs));
          }
          if (Array.isArray(data.warrantyPolicies) && data.warrantyPolicies.length > 0) {
            setWarrantyPolicies(prev => mergeEntitiesById(prev, data.warrantyPolicies));
          }
          if (Array.isArray(data.warrantyRecords)) {
            setWarrantyRecords(prev => mergeEntitiesById(prev, data.warrantyRecords));
          }
          if (Array.isArray(data.warrantyClaims)) {
            setWarrantyClaims(prev => mergeEntitiesById(prev, data.warrantyClaims));
          }
        }

        const appliedEpoch = serverEpoch || Date.now();
        lastServerUpdatedEpochRef.current = appliedEpoch;
        hasCompletedInitialServerSyncRef.current = true;

        const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastServerSyncTime(now);
        try {
          localStorage.setItem('DOKANPRO_LAST_SYNC_TIME', now);
          localStorage.setItem('DOKANPRO_LAST_LOCAL_UPDATE_EPOCH', String(appliedEpoch));
        } catch {}

        setServerSyncStatus({
          success: true,
          message: language === 'bn' ? 'সার্ভার থেকে সমস্ত লাইভ ডাটা সফলভাবে ডাউনলোড ও সিঙ্ক হয়েছে।' : 'Synced successfully from server.',
          timestamp: now,
        });

        if (!quiet) {
          showToast(language === 'bn' ? 'সার্ভার থেকে সমস্ত ডাটা সফলভাবে সিঙ্ক ও আপডেট হয়েছে!' : 'All ERP records synced and loaded from server!', 'success');
        } else if (hasNewIncomingEntries) {
          showToast(
            language === 'bn'
              ? '🔄 অন্য ডিভাইস থেকে নতুন এন্ট্রি/ডাটা সফলভাবে লাইভ সিঙ্ক হয়েছে!'
              : '🔄 Live entries synced from other device!',
            'info'
          );
        }
        return true;
      } else {
        // Server responded with empty/no-data snapshot (fresh setup)
        if (!hasCompletedInitialServerSyncRef.current) {
          hasCompletedInitialServerSyncRef.current = true;
          // Seed the server with our current state so other devices can pull it
          setTimeout(() => {
            triggerServerPush(targetUrl, true);
          }, 300);
        }
        return true;
      }
    } catch (err: any) {
      if (!quiet) {
        showToast(language === 'bn' ? `ডাটা পুল ব্যর্থ: ${err.message}` : `Data pull failed: ${err.message}`, 'warning');
      }
      return false;
    } finally {
      isPullingRef.current = false;
      if (!quiet) {
        setIsSyncingWithServer(false);
      }
    }
  };

  // Manual Trigger Sync Now
  const triggerSyncNow = async (): Promise<boolean> => {
    setSyncCountdown(autoSyncIntervalSeconds);
    return await triggerServerPull(undefined, false);
  };

  // Permanently save and remember API endpoint for all devices
  const saveApiEndpoint = async (url: string, autoSync = true, intervalSeconds = 30): Promise<boolean> => {
    const trimmed = url.trim();
    try {
      localStorage.setItem('DOKANPRO_ERP_API_ENDPOINT', trimmed);
    } catch {}

    setCompanySettings(prev => ({
      ...prev,
      apiEndpoint: trimmed,
      autoSyncEnabled: autoSync,
      autoSyncIntervalSeconds: intervalSeconds,
    }));
    setSyncCountdown(intervalSeconds);

    showToast(
      language === 'bn'
        ? `API Endpoint সফলভাবে সংরক্ষিত হয়েছে! প্রতি ${intervalSeconds} সেকেন্ড পর পর অটো রিলোড ও সিঙ্ক সক্রিয়।`
        : `API Endpoint saved! Auto sync active every ${intervalSeconds}s.`,
      'success'
    );

    // Initial push test
    return await triggerServerPush(trimmed);
  };

  // Setup Multi-Device Real-time Listeners & Auto-Sync Engine
  useEffect(() => {
    // 1. Initial boot pull immediately to load all data on any device
    const initTimer = setTimeout(() => {
      triggerServerPull(undefined, true);
    }, 50);

    // 2. Multi-Device Real-Time Poller (every 3.5 seconds)
    const liveSyncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerServerPull(undefined, true);
      }
    }, 3500);

    // 3. Immediate pull when user focuses tab or switches to device
    const handleFocus = () => {
      triggerServerPull(undefined, true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerServerPull(undefined, true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Same-device cross-tab BroadcastChannel & storage sync
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('DOKANPRO_CROSS_TAB_CHANNEL');
        bc.onmessage = (event) => {
          if (event.data?.type === 'STATE_UPDATED') {
            reloadFromLocalStorage();
            triggerServerPull(undefined, true);
          }
        };
      }
    } catch {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        reloadFromLocalStorage();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(initTimer);
      clearInterval(liveSyncInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      if (bc) bc.close();
    };
  }, []);

  // Instant background Auto-Push to Server & SQL file on entries/changes
  useEffect(() => {
    if (companySettings.autoSyncEnabled === false) return;
    const activeUrl = companySettings.apiEndpoint || localStorage.getItem('DOKANPRO_ERP_API_ENDPOINT') || getActiveApiEndpoint();
    if (!activeUrl) return;

    // 400ms debounce ensures smooth typing experience while reliably auto-syncing to server
    const pushTimer = setTimeout(() => {
      triggerServerPush(activeUrl, true);
    }, 400);

    return () => clearTimeout(pushTimer);
  }, [
    products,
    categories,
    parties,
    wallets,
    saleInvoices,
    deletedSaleInvoices,
    saleReturns,
    purchaseInvoices,
    deletedPurchaseInvoices,
    purchaseReturns,
    purchaseOrders,
    quotations,
    expiredReturnLogs,
    installmentSchemes,
    employees,
    advanceSalaries,
    payrollHistory,
    expenseCategories,
    expenseVouchers,
    dayBookEntries,
    cashAdjustments,
    activityLogs,
    companySettings,
    users,
    smsConfig,
  ]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const showToast = (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const openPrintModal = (doc: PrintableDocumentData) => {
    setPrintableDoc(doc);
  };

  const closePrintModal = () => {
    setPrintableDoc(null);
  };

  const formatCurrency = (amount: number) => {
    const symbol = companySettings.currencySymbol || '৳';
    return `${symbol} ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // -------------------------------------------------------------
  // Product & Category Handlers
  // -------------------------------------------------------------
  const addProduct = (prodData: Omit<Product, 'id' | 'createdAt'>): Product => {
    // Check duplicate barcode / serial
    if (prodData.barcode && prodData.barcode.trim()) {
      const dupBarcode = products.find(
        p => p.barcode && p.barcode.trim().toLowerCase() === prodData.barcode.trim().toLowerCase()
      );
      if (dupBarcode) {
        showToast(
          language === 'bn'
            ? `এই বারকোড / সিরিয়াল (${prodData.barcode}) ইতিমধ্যে "${dupBarcode.name}" পণ্যে ব্যবহৃত! একই কোড দিয়ে এন্ট্রি হবে না।`
            : `Barcode / Serial (${prodData.barcode}) already exists on "${dupBarcode.name}"! Duplicate entry not allowed.`,
          'error'
        );
        return dupBarcode;
      }
    }

    // Check duplicate SKU
    if (prodData.sku && prodData.sku.trim()) {
      const dupSku = products.find(
        p => p.sku && p.sku.trim().toLowerCase() === prodData.sku.trim().toLowerCase()
      );
      if (dupSku) {
        showToast(
          language === 'bn'
            ? `এই SKU কোড (${prodData.sku}) ইতিমধ্যে "${dupSku.name}" পণ্যে ব্যবহৃত! একই কোড দিয়ে এন্ট্রি হবে না।`
            : `SKU code (${prodData.sku}) already exists on "${dupSku.name}"! Duplicate entry not allowed.`,
          'error'
        );
        return dupSku;
      }
    }

    const category = categories.find(c => c.id === prodData.categoryId);
    const newProduct: Product = {
      ...prodData,
      id: `prod-${Date.now()}`,
      categoryName: category?.name || 'General',
      createdBy: currentUser?.id || 'usr-1',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProducts(prev => [newProduct, ...prev]);
    setTimeout(() => {
      triggerServerPush(undefined, true);
    }, 100);
    showToast(language === 'bn' ? 'নতুন পণ্য সফলভাবে যুক্ত করা হয়েছে।' : 'Product added successfully.');
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    if (updates.barcode && updates.barcode.trim()) {
      const dupBarcode = products.find(
        p => p.id !== id && p.barcode && p.barcode.trim().toLowerCase() === updates.barcode.trim().toLowerCase()
      );
      if (dupBarcode) {
        showToast(
          language === 'bn'
            ? `এই বারকোড / সিরিয়াল (${updates.barcode}) ইতিমধ্যে "${dupBarcode.name}" পণ্যে ব্যবহৃত! পরিবর্তন করা যাবে না।`
            : `Barcode (${updates.barcode}) is already used by "${dupBarcode.name}"! Duplicate not allowed.`,
          'error'
        );
        return;
      }
    }

    if (updates.sku && updates.sku.trim()) {
      const dupSku = products.find(
        p => p.id !== id && p.sku && p.sku.trim().toLowerCase() === updates.sku.trim().toLowerCase()
      );
      if (dupSku) {
        showToast(
          language === 'bn'
            ? `এই SKU কোড (${updates.sku}) ইতিমধ্যে "${dupSku.name}" পণ্যে ব্যবহৃত! পরিবর্তন করা যাবে না।`
            : `SKU (${updates.sku}) is already used by "${dupSku.name}"! Duplicate not allowed.`,
          'error'
        );
        return;
      }
    }

    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const catId = updates.categoryId || p.categoryId;
          const cat = categories.find(c => c.id === catId);
          return {
            ...p,
            ...updates,
            categoryName: cat?.name || p.categoryName,
          };
        }
        return p;
      })
    );
    setTimeout(() => {
      triggerServerPush(undefined, true);
    }, 100);
    showToast(language === 'bn' ? 'পণ্যের তথ্য আপডেট করা হয়েছে।' : 'Product updated successfully.');
  };

  const deleteProduct = (id: string, _force = true) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    // Track in deletedProductIds so it is never re-synced or resurrected
    setDeletedProductIds(prev => {
      const updated = Array.from(new Set([...prev, id, prod.sku, prod.name].filter(Boolean) as string[]));
      try {
        localStorage.setItem('DOKANPRO_DELETED_PRODUCT_IDS', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setProducts(prev => prev.filter(p => p.id !== id));
    
    const nowStr = formatDeletionTimestamp();
    logActivity({
      actionType: 'DELETE',
      title: `Deleted Product '${prod.name}'`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted product '${prod.name}' (SKU: ${prod.sku || 'N/A'}) on ${nowStr}.`,
      severity: 'danger',
      targetId: prod.id,
      targetName: `Product '${prod.name}'`,
    });

    showToast(
      language === 'bn' 
        ? `পণ্য (${prod.name}) সফলভাবে ডিলিট করা হয়েছে।` 
        : `Product '${prod.name}' deleted successfully.`, 
      'info'
    );
  };

  const deleteAllProducts = () => {
    if (currentUser?.role !== 'ADMIN') {
      showToast(
        language === 'bn'
          ? 'শুধুমাত্র অ্যাডমিন (ADMIN) সমস্ত পণ্য মুছে ফেলার অনুমতি রাখেন!'
          : 'Access Denied: Only ADMIN users are authorized to clear all products!',
        'error'
      );
      return;
    }
    if (products.length === 0) {
      showToast(language === 'bn' ? 'কোনো পণ্য নেই।' : 'No products found.', 'info');
      return;
    }
    const count = products.length;
    const allIds = products.map(p => p.id);
    const allSkus = products.map(p => p.sku).filter(Boolean) as string[];
    const allNames = products.map(p => p.name).filter(Boolean) as string[];

    setDeletedProductIds(prev => {
      const updated = Array.from(new Set([...prev, ...allIds, ...allSkus, ...allNames]));
      try {
        localStorage.setItem('DOKANPRO_DELETED_PRODUCT_IDS', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setProducts([]);
    
    logActivity({
      actionType: 'DELETE',
      title: 'Cleared All Products',
      description: `User '${currentUser?.fullName || 'User'}' cleared all ${count} products from inventory.`,
      severity: 'danger',
    });

    showToast(
      language === 'bn'
        ? `ইনভেন্টরির সমস্ত (${count}টি) পণ্য সফলভাবে মুছে ফেলা হয়েছে।`
        : `All ${count} inventory products cleared successfully.`,
      'success'
    );
  };

  const updateProductBatches = (productId: string, batches: ProductBatch[]) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === productId) {
          const totalStock = batches.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
          const activeBatches = batches.filter(b => Number(b.stock) > 0 && b.expDate);
          activeBatches.sort((a, b) => a.expDate.localeCompare(b.expDate));
          const earliestExp = activeBatches[0]?.expDate || p.expDate || '';
          const latestBatchNum = batches[batches.length - 1]?.batchNumber || p.batchNumber || '';
          return {
            ...p,
            batches,
            stock: totalStock,
            expDate: earliestExp,
            batchNumber: latestBatchNum,
          };
        }
        return p;
      })
    );
    showToast(language === 'bn' ? 'ব্যাচ তথ্য সফলভাবে আপডেট করা হয়েছে।' : 'Product batches updated successfully.');
  };

  const addProductBatch = (productId: string, batchData: Omit<ProductBatch, 'id'>) => {
    const newBatch: ProductBatch = {
      ...batchData,
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdBy: currentUser?.id || 'usr-1',
    };
    setProducts(prev =>
      prev.map(p => {
        if (p.id === productId) {
          const existing = p.batches ? [...p.batches] : [];
          existing.push(newBatch);
          const totalStock = existing.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
          const activeBatches = existing.filter(b => Number(b.stock) > 0 && b.expDate);
          activeBatches.sort((a, b) => a.expDate.localeCompare(b.expDate));
          const earliestExp = activeBatches[0]?.expDate || p.expDate || '';
          return {
            ...p,
            batches: existing,
            stock: totalStock,
            expDate: earliestExp,
            batchNumber: newBatch.batchNumber || p.batchNumber,
          };
        }
        return p;
      })
    );
    showToast(language === 'bn' ? 'নতুন ব্যাচ সফলভাবে যুক্ত করা হয়েছে।' : 'Batch added successfully.');
  };

  const deleteProductBatch = (productId: string, batchId: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === productId && p.batches) {
          const remaining = p.batches.filter(b => b.id !== batchId);
          const totalStock = remaining.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
          const activeBatches = remaining.filter(b => Number(b.stock) > 0 && b.expDate);
          activeBatches.sort((a, b) => a.expDate.localeCompare(b.expDate));
          const earliestExp = activeBatches[0]?.expDate || '';
          return {
            ...p,
            batches: remaining,
            stock: totalStock,
            expDate: earliestExp,
          };
        }
        return p;
      })
    );
    showToast(language === 'bn' ? 'ব্যাচ মুছে ফেলা হয়েছে।' : 'Batch removed successfully.', 'info');
  };

  const addCategory = (categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: `cat-${Date.now()}`,
      createdBy: currentUser?.id || 'usr-1',
    };
    setCategories(prev => [...prev, newCategory]);
    showToast(language === 'bn' ? 'ক্যাটাগরি তৈরি করা হয়েছে।' : 'Category created.');
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
    showToast(language === 'bn' ? 'ক্যাটাগরি আপডেট হয়েছে।' : 'Category updated.');
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    showToast(language === 'bn' ? 'ক্যাটাগরি মুছে ফেলা হয়েছে।' : 'Category deleted.', 'info');
  };

  const bulkImportProducts = (newProducts: Omit<Product, 'id' | 'createdAt'>[]) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const existingBarcodes = new Set(products.map(p => p.barcode?.trim().toLowerCase()).filter(Boolean));
    const existingSkus = new Set(products.map(p => p.sku?.trim().toLowerCase()).filter(Boolean));

    const created: Product[] = [];
    let skipped = 0;

    newProducts.forEach((p, idx) => {
      const barcodeKey = p.barcode?.trim().toLowerCase();
      const skuKey = p.sku?.trim().toLowerCase();

      if ((barcodeKey && existingBarcodes.has(barcodeKey)) || (skuKey && existingSkus.has(skuKey))) {
        skipped++;
        return;
      }
      if (barcodeKey) existingBarcodes.add(barcodeKey);
      if (skuKey) existingSkus.add(skuKey);

      created.push({
        ...p,
        id: `prod-${Date.now()}-${idx}`,
        createdBy: currentUser?.id || 'usr-1',
        createdAt: timestamp,
      });
    });

    setProducts(prev => [...created, ...prev]);
    showToast(
      language === 'bn'
        ? `${created.length} টি পণ্য সফলভাবে ইমপোর্ট হয়েছে${skipped > 0 ? ` (${skipped} টি ডুপ্লিকেট বারকোড বাদ দেওয়া হয়েছে)` : ''}।`
        : `Successfully imported ${created.length} products${skipped > 0 ? ` (${skipped} duplicate codes skipped)` : ''}.`
    );
    return created.length;
  };

  // -------------------------------------------------------------
  // Party Handlers (Customer & Supplier)
  // -------------------------------------------------------------
  const getNextPartySerialNumber = (type: PartyType): string => {
    return generatePartySerialNumber(type, parties);
  };

  const addParty = (partyData: Omit<Party, 'id' | 'currentBalance' | 'createdAt'>): Party => {
    const serial = (partyData.serialNumber && partyData.serialNumber.trim())
      ? partyData.serialNumber.trim()
      : generatePartySerialNumber(partyData.type, parties);

    // Duplicate Serial Check: Ensure the serial number does not already exist
    const duplicateParty = findDuplicatePartySerial(serial, parties);

    if (duplicateParty) {
      showToast(
        language === 'bn'
          ? `আগে থেকে এই নং এন্ট্রি আছে! (${serial}) ইতিমধ্যে "${duplicateParty.name}"-এর জন্য ব্যবহৃত। একই নং দুইবার এন্ট্রি হবে না।`
          : `This number is already entered previously! Serial (${serial}) is already used by "${duplicateParty.name}". Duplicate entry not allowed.`,
        'error'
      );
      return duplicateParty;
    }

    const newParty: Party = {
      ...partyData,
      id: `${partyData.type.toLowerCase()}-${Date.now()}`,
      serialNumber: serial,
      currentBalance: partyData.openingBalance || 0,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setParties(prev => [newParty, ...prev]);
    showToast(
      partyData.type === 'CUSTOMER'
        ? language === 'bn' ? `নতুন কাস্টমার (#${serial}) সফলভাবে যোগ করা হয়েছে!` : `Customer (#${serial}) added successfully!`
        : language === 'bn' ? `নতুন সাপ্লায়ার (#${serial}) সফলভাবে যোগ করা হয়েছে!` : `Supplier (#${serial}) added successfully!`,
      'success'
    );
    return newParty;
  };

  const updateParty = (id: string, updates: Partial<Party>) => {
    if (updates.serialNumber && updates.serialNumber.trim()) {
      const serial = updates.serialNumber.trim();
      const duplicateParty = findDuplicatePartySerial(serial, parties, id);
      if (duplicateParty) {
        showToast(
          language === 'bn'
            ? `আগে থেকে এই নং এন্ট্রি আছে! (${serial}) ইতিমধ্যে "${duplicateParty.name}"-এর জন্য ব্যবহৃত।`
            : `This number is already entered previously! Serial (${serial}) is already used by "${duplicateParty.name}".`,
          'error'
        );
        return;
      }
    }
    setParties(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
    showToast(language === 'bn' ? 'তথ্য আপডেট হয়েছে।' : 'Party details updated.', 'success');
  };

  const deleteParty = (id: string) => {
    const party = parties.find(p => p.id === id);
    if (!party) return;

    if (party.type === 'CUSTOMER') {
      const hasSales = saleInvoices?.some(inv => inv.customerId === id || inv.customerPhone === party.phone || inv.customerName === party.name);
      if (hasSales || party.currentBalance !== 0) {
        showToast(
          language === 'bn'
            ? `এই কাস্টমার (${party.name})-এর বিক্রয় ইনভয়েস বা বকেয়া ব্যালেন্স (৳${party.currentBalance}) রয়েছে। ডিলিট করা সম্ভব নয়!`
            : `Customer (${party.name}) has sale invoices or outstanding balance. Cannot delete!`,
          'error'
        );
        return;
      }
    } else if (party.type === 'SUPPLIER') {
      const hasPurchases = purchaseInvoices?.some(inv => inv.supplierId === id || inv.supplierName === party.name);
      const hasOrders = purchaseOrders?.some(po => po.supplierId === id || po.supplierName === party.name);
      if (hasPurchases || hasOrders || party.currentBalance !== 0) {
        showToast(
          language === 'bn'
            ? `এই সাপ্লায়ার (${party.name})-এর ক্রয় ইনভয়েস, অর্ডার বা ব্যালেন্স (৳${party.currentBalance}) রয়েছে। ডিলিট করা যাবে না!`
            : `Supplier (${party.name}) has purchase/order history or balance. Cannot delete!`,
          'error'
        );
        return;
      }
    }

    setParties(prev => prev.filter(p => p.id !== id));
    
    const nowStr = formatDeletionTimestamp();
    logActivity({
      actionType: 'DELETE',
      title: `Deleted ${party.type === 'CUSTOMER' ? 'Customer' : 'Supplier'} '${party.name}'`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted ${party.type.toLowerCase()} '${party.name}' (Phone: ${party.phone || 'N/A'}) on ${nowStr}.`,
      severity: 'danger',
      targetId: party.id,
      targetName: `${party.type} '${party.name}'`,
    });

    showToast(
      language === 'bn' 
        ? `${party.type === 'CUSTOMER' ? 'কাস্টমার' : 'সাপ্লায়ার'} (${party.name}) ${nowStr} তারিখে ডিলিট করা হয়েছে এবং অ্যাক্টিভিটি লগে রেকর্ড করা হয়েছে।` 
        : `${party.type} '${party.name}' deleted on ${nowStr} and logged to audit.`, 
      'info'
    );
  };

  // -------------------------------------------------------------
  // SMS Service & Notifications
  // -------------------------------------------------------------
  const updateSmsConfig = (updates: Partial<SmsConfig>) => {
    setSmsConfig(prev => ({ ...prev, ...updates }));
    showToast(language === 'bn' ? 'SMS গেটওয়ে সেটিংস সংরক্ষিত হয়েছে।' : 'SMS Gateway settings updated.');
  };

  const sendManualSms = async (
    recipientPhone: string,
    recipientName: string,
    message: string,
    type: SmsLog['type'] = 'TEST'
  ): Promise<boolean> => {
    const res = await sendSmsViaGateway(smsConfig, {
      recipientPhone,
      recipientName,
      message,
      type,
    });
    setSmsLogs(prev => [res.log, ...prev]);
    if (res.success) {
      showToast(
        language === 'bn' ? `SMS সফলভাবে পাঠানো হয়েছে (${recipientPhone})!` : `SMS sent successfully to ${recipientPhone}!`,
        'success'
      );
    } else {
      showToast(
        language === 'bn' ? `SMS পাঠানো ব্যর্থ হয়েছে: ${res.message}` : `SMS failed: ${res.message}`,
        'error'
      );
    }
    return res.success;
  };

  const sendSaleSms = async (invoice: SaleInvoice): Promise<boolean> => {
    if (!invoice.customerPhone || invoice.customerId === 'walk-in') {
      return false;
    }
    const variables = {
      customer_name: invoice.customerName || 'Customer',
      invoice_no: invoice.invoiceNumber,
      total_amount: invoice.grandTotal.toLocaleString(),
      paid_amount: invoice.paidAmount.toLocaleString(),
      due_amount: invoice.dueAmount.toLocaleString(),
      store_name: companySettings.name || 'DokanPro Store',
      store_phone: companySettings.phone || '',
      date: invoice.date,
    };
    const message = formatSmsTemplate(smsConfig.saleTemplate || DEFAULT_SMS_CONFIG.saleTemplate, variables);
    const res = await sendSmsViaGateway(smsConfig, {
      recipientPhone: invoice.customerPhone,
      recipientName: invoice.customerName || 'Customer',
      message,
      type: 'SALE',
    });
    setSmsLogs(prev => [res.log, ...prev]);
    return res.success;
  };

  const sendPaymentInSms = async (
    party: Party,
    amount: number,
    remainingDue: number,
    voucherNo: string
  ): Promise<boolean> => {
    if (!party.phone) {
      return false;
    }
    const variables = {
      customer_name: party.name || 'Customer',
      paid_amount: amount.toLocaleString(),
      remaining_due: remainingDue.toLocaleString(),
      receipt_no: voucherNo,
      store_name: companySettings.name || 'DokanPro Store',
      store_phone: companySettings.phone || '',
      date: new Date().toISOString().split('T')[0],
    };
    const message = formatSmsTemplate(smsConfig.paymentInTemplate || DEFAULT_SMS_CONFIG.paymentInTemplate, variables);
    const res = await sendSmsViaGateway(smsConfig, {
      recipientPhone: party.phone,
      recipientName: party.name || 'Customer',
      message,
      type: 'PAYMENT_IN',
    });
    setSmsLogs(prev => [res.log, ...prev]);
    return res.success;
  };

  const sendDueReminderSms = async (party: Party, customDueAmount?: number): Promise<boolean> => {
    if (!party.phone) {
      showToast(
        language === 'bn' ? `কাস্টমার "${party.name}"-এর কোন ফোন নম্বর নেই!` : `No phone number for "${party.name}"!`,
        'error'
      );
      return false;
    }
    const dueVal = customDueAmount !== undefined 
      ? customDueAmount 
      : getCustomerTotalDue(party, installmentSchemes);

    const variables = {
      customer_name: party.name || 'Customer',
      current_due: dueVal.toLocaleString(),
      store_name: companySettings.name || 'DokanPro Store',
      store_phone: companySettings.phone || '',
      date: new Date().toISOString().split('T')[0],
    };
    const message = formatSmsTemplate(smsConfig.dueReminderTemplate || DEFAULT_SMS_CONFIG.dueReminderTemplate, variables);
    const res = await sendSmsViaGateway(smsConfig, {
      recipientPhone: party.phone,
      recipientName: party.name || 'Customer',
      message,
      type: 'DUE_REMINDER',
    });
    setSmsLogs(prev => [res.log, ...prev]);
    if (res.success) {
      showToast(
        language === 'bn' ? `✅ ${party.name} (${party.phone})-এ ৳${dueVal.toLocaleString()} টাকার বকেয়া তাগাদা SMS পাঠানো হয়েছে!` : `Due reminder SMS sent to ${party.name}!`,
        'success'
      );
    }
    return res.success;
  };

  const sendWarrantyClaimSms = async (claim: WarrantyClaim, customNote?: string): Promise<boolean> => {
    if (!claim.customerPhone) {
      showToast(
        language === 'bn' ? `কাস্টমার "${claim.customerName}"-এর কোনো ফোন নম্বর পাওয়া যায়নি!` : `No phone number for customer "${claim.customerName}"!`,
        'error'
      );
      return false;
    }

    const variables = {
      customer_name: claim.customerName || 'Customer',
      ticket_no: claim.claimTicketNo,
      product_name: claim.productName || 'Product',
      serial_no: claim.serialNumber || 'N/A',
      status: claim.status,
      note: customNote || claim.technicianNotes || '',
      store_name: companySettings.name || 'DokanPro Store',
      store_phone: companySettings.phone || '',
      date: new Date().toISOString().split('T')[0],
    };

    const template = smsConfig.warrantyResolvedTemplate || DEFAULT_SMS_CONFIG.warrantyResolvedTemplate;
    const message = formatSmsTemplate(template, variables);

    const res = await sendSmsViaGateway(smsConfig, {
      recipientPhone: claim.customerPhone,
      recipientName: claim.customerName || 'Customer',
      message,
      type: 'WARRANTY',
    });

    setSmsLogs(prev => [res.log, ...prev]);

    if (res.success) {
      showToast(
        language === 'bn'
          ? `✅ কাস্টমার ${claim.customerName} (${claim.customerPhone})-কে ওয়ারেন্টি SMS পাঠানো হয়েছে!`
          : `Warranty SMS sent to ${claim.customerName}!`,
        'success'
      );
    } else {
      showToast(
        language === 'bn' ? `SMS পাঠানো ব্যর্থ হয়েছে: ${res.message}` : `SMS failed: ${res.message}`,
        'error'
      );
    }

    return res.success;
  };

  const deleteSmsLog = (id: string) => {
    setSmsLogs(prev => prev.filter(l => l.id !== id));
    showToast(language === 'bn' ? 'SMS হিস্ট্রি মুছে ফেলা হয়েছে।' : 'SMS log deleted.');
  };

  const clearSmsLogs = () => {
    setSmsLogs([]);
    showToast(language === 'bn' ? 'সকল SMS হিস্ট্রি মুছে ফেলা হয়েছে।' : 'All SMS history cleared.');
  };

  // -------------------------------------------------------------
  // POS & Sales Logic
  // -------------------------------------------------------------
  const createSaleInvoice = (data: {
    invoiceNumber?: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    discountType: 'percentage' | 'flat';
    vatAmount: number;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
    paymentMethod: PaymentMethod;
    walletId: string;
    notes?: string;
    isInstallmentSale?: boolean;
    installmentPlanId?: string;
    date?: string;
  }): SaleInvoice => {
    const today = new Date().toISOString().split('T')[0];

    // Validate batch-level expiry and stock availability for each item
    for (const item of data.items) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) {
        showToast(
          language === 'bn' ? `পণ্য পাওয়া যায়নি!` : `Product not found!`,
          'error'
        );
        return null as any;
      }

      // 1. If a specific batch is chosen for this item:
      if (item.batchId && prod.batches && prod.batches.length > 0) {
        const batch = prod.batches.find(b => b.id === item.batchId);
        if (!batch) {
          showToast(
            language === 'bn'
              ? `"${item.name}" পণ্যের নির্ধারিত ব্যাচ পাওয়া যায়নি!`
              : `Batch not found for "${item.name}"!`,
            'error'
          );
          return null as any;
        }

        // Check if selected batch is expired
        if (isExpiredDate(batch.expDate)) {
          showToast(
            language === 'bn'
              ? `⚠️ "${item.name}"-এর নির্বাচিত ব্যাচ "${batch.batchNumber}"-এর মেয়াদ শেষ (${batch.expDate})! মেয়াদোত্তীর্ণ ব্যাচ বিক্রি করা যাবে না।`
              : `⚠️ Selected batch "${batch.batchNumber}" of "${item.name}" is expired (${batch.expDate})! Expired batches cannot be sold.`,
            'error'
          );
          return null as any;
        }

        // Check selected batch stock
        if (batch.stock < item.quantity) {
          showToast(
            language === 'bn'
              ? `"${item.name}" পণ্যের ব্যাচ "${batch.batchNumber}"-এ পর্যাপ্ত মজুদ নেই (মজুদ: ${batch.stock}, বিক্রয় চাওয়া হয়েছে: ${item.quantity})!`
              : `Insufficient stock in batch "${batch.batchNumber}" for "${item.name}" (Stock: ${batch.stock}, requested: ${item.quantity})!`,
            'error'
          );
          return null as any;
        }
      } else if (prod.batches && prod.batches.length > 0) {
        // 2. Product has batches but no specific batch chosen (Auto FEFO):
        // Only consider valid (non-expired) batches with stock > 0
        const validBatches = prod.batches.filter(b => (b.stock || 0) > 0 && !isExpiredDate(b.expDate));
        const totalValidStock = validBatches.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);

        if (totalValidStock <= 0) {
          showToast(
            language === 'bn'
              ? `⚠️ "${item.name}" পণ্যের কোনো সচল (মেয়াদ ওকে) ব্যাচ অবশিষ্ট নেই! সমস্ত ব্যাচ মেয়াদোত্তীর্ণ হওয়ায় বিক্রয় সম্ভব নয়।`
              : `⚠️ No valid non-expired batches available for "${item.name}"! Expired batches cannot be sold.`,
            'error'
          );
          return null as any;
        }

        if (item.quantity > totalValidStock) {
          const expiredBatches = prod.batches.filter(b => (b.stock || 0) > 0 && isExpiredDate(b.expDate));
          const expiredStock = expiredBatches.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
          showToast(
            language === 'bn'
              ? `⚠️ "${item.name}"-এর বিক্রয়যোগ্য (মেয়াদ ওকে) স্টক আছে মাত্র ${totalValidStock} টি${expiredStock > 0 ? ` (${expiredStock} টি মেয়াদোত্তীর্ণ ব্যাচে আটকে আছে)` : ''}। মোট বিক্রয় চাওয়া হয়েছে: ${item.quantity} টি!`
              : `⚠️ Insufficient valid stock for "${item.name}". Only ${totalValidStock} units available in valid batches${expiredStock > 0 ? ` (${expiredStock} units are expired)` : ''}. Requested: ${item.quantity}`,
            'error'
          );
          return null as any;
        }
      } else {
        // 3. Simple product without multiple batches
        if (isExpiredDate(prod.expDate)) {
          showToast(
            language === 'bn'
              ? `⚠️ "${item.name}" পণ্যটির মেয়াদ উত্তীর্ণ হয়ে গেছে (Exp Date: ${prod.expDate})! মেয়াদোত্তীর্ণ পণ্য বিক্রয় করা যাবে না।`
              : `⚠️ "${item.name}" is expired (Exp Date: ${prod.expDate})! Expired products cannot be sold.`,
            'error'
          );
          return null as any;
        }

        if (prod.stock < item.quantity) {
          showToast(
            language === 'bn'
              ? `অপর্যাপ্ত স্টক! "${item.name}" পণ্যের পর্যাপ্ত মজুদ নেই (মজুদ: ${Number(prod.stock)}, বিক্রয়যোগ্য: ${item.quantity})`
              : `Insufficient stock for "${item.name}". Current stock: ${Number(prod.stock)}`,
            'error'
          );
          return null as any;
        }
      }
    }

    // Customer Credit Limit Validation
    if (data.dueAmount > 0 && data.customerId && data.customerId !== 'walk-in') {
      const customer = parties.find(p => p.id === data.customerId);
      if (customer) {
        const creditCheck = checkCustomerCreditLimit(customer, data.dueAmount, installmentSchemes);
        if (!creditCheck.isAllowed) {
          showToast(
            language === 'bn'
              ? `⚠️ ক্রেডিট লিমিট অতিক্রম করেছে! গ্রাহক "${customer.name}"-এর অনুমোদিত লিমিট ৳${creditCheck.creditLimit.toLocaleString()}। বর্তমান বকেয়া ৳${creditCheck.currentDue.toLocaleString()} এবং নতুন চালান সহ মোট বকেয়া হবে ৳${creditCheck.projectedDue.toLocaleString()} (লিমিট থেকে ৳${creditCheck.exceededBy.toLocaleString()} বেশি)!`
              : `⚠️ Credit Limit Exceeded! Customer "${customer.name}" has limit of ৳${creditCheck.creditLimit.toLocaleString()}. Current due is ৳${creditCheck.currentDue.toLocaleString()} and projected total due will be ৳${creditCheck.projectedDue.toLocaleString()} (exceeds by ৳${creditCheck.exceededBy.toLocaleString()})!`,
            'error'
          );
          return null as any;
        }
      }
    }

    const rawInvNum = data.invoiceNumber?.trim();
    const invNum = rawInvNum || generateSaleInvoiceNumber(saleInvoices);

    // Duplicate Invoice No Validation
    const duplicateInv = checkDuplicateSaleInvoice(invNum, saleInvoices);

    if (duplicateInv) {
      showToast(
        language === 'bn'
          ? `আগে থেকে এই Invoice No এন্ট্রি আছে! (${invNum}) ইতিমধ্যে "${duplicateInv.customerName}"-এর চালানে ব্যবহৃত। একই ইনভয়েস নং দুইবার এন্ট্রি হবে না।`
          : `This Invoice No is already entered previously! (${invNum}) Duplicate Invoice No not allowed.`,
        'error'
      );
      return null as any;
    }

    const invDate = data.date || new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const selectedWallet = wallets.find(w => w.id === data.walletId);

    let status: 'PAID' | 'PARTIAL' | 'DUE' = 'PAID';
    if (data.dueAmount > 0 && data.paidAmount > 0) {
      status = 'PARTIAL';
    } else if (data.paidAmount === 0 && data.dueAmount > 0) {
      status = 'DUE';
    }

    const creatorName = currentUser?.fullName || currentUser?.username || 'Cashier';

    const newInvoice: SaleInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNum,
      date: invDate,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount,
      discountType: data.discountType,
      vatAmount: data.vatAmount,
      grandTotal: data.grandTotal,
      paidAmount: data.paidAmount,
      dueAmount: data.dueAmount,
      paymentMethod: data.paymentMethod,
      walletId: data.walletId,
      walletName: selectedWallet?.name || 'Cash',
      status,
      notes: data.notes,
      cashierName: creatorName,
      createdBy: creatorName,
      completedBy: status === 'PAID' ? creatorName : undefined,
      contributors: [
        {
          action: 'Created Invoice',
          actionBn: 'চালান তৈরি',
          userName: creatorName,
          userId: currentUser?.id,
          userRole: currentUser?.role,
          timestamp: `${invDate} ${nowTime}`,
        },
        ...(status === 'PAID'
          ? [
              {
                action: 'Payment Received in Full',
                actionBn: 'সম্পূর্ণ পরিশোধিত',
                userName: creatorName,
                userId: currentUser?.id,
                userRole: currentUser?.role,
                timestamp: `${invDate} ${nowTime}`,
              },
            ]
          : []),
      ],
      isInstallmentSale: data.isInstallmentSale,
      installmentPlanId: data.installmentPlanId,
      createdAt: `${invDate} ${nowTime}`,
    };

    // 1. Decrease product stocks & deduct from specific/FEFO batches (ONLY VALID NON-EXPIRED BATCHES!)
    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemSold = data.items.find(i => i.productId === prod.id);
        if (itemSold) {
          let updatedBatches = prod.batches ? [...prod.batches.map(b => ({ ...b }))] : [];
          
          if (updatedBatches.length > 0) {
            let remQtyToDeduct = Number(itemSold.quantity);

            // If cashier explicitly selected a batch in the cart item
            if (itemSold.batchId) {
              const bIdx = updatedBatches.findIndex(b => b.id === itemSold.batchId);
              if (bIdx >= 0) {
                const deduct = Math.min(updatedBatches[bIdx].stock, remQtyToDeduct);
                updatedBatches[bIdx].stock = Math.max(0, updatedBatches[bIdx].stock - deduct);
                remQtyToDeduct -= deduct;
              }
            }

            // Deduct remaining qty using FEFO ONLY among VALID (NON-EXPIRED) batches!
            if (remQtyToDeduct > 0) {
              const validBatchIndices = updatedBatches
                .map((b, idx) => ({ b, idx }))
                .filter(x => x.b.stock > 0 && !isExpiredDate(x.b.expDate))
                .sort((a, b) => {
                  if (a.b.expDate && b.b.expDate) return a.b.expDate.localeCompare(b.b.expDate);
                  if (a.b.expDate) return -1;
                  if (b.b.expDate) return 1;
                  return (a.b.purchaseDate || '').localeCompare(b.b.purchaseDate || '');
                });

              for (const item of validBatchIndices) {
                if (remQtyToDeduct <= 0) break;
                const available = updatedBatches[item.idx].stock;
                const take = Math.min(available, remQtyToDeduct);
                updatedBatches[item.idx].stock = Math.max(0, available - take);
                remQtyToDeduct -= take;
              }
            }
          }

          const newStock = Math.max(0, prod.stock - itemSold.quantity);
          const activeValidBatches = updatedBatches.filter(b => Number(b.stock) > 0 && !isExpiredDate(b.expDate));
          activeValidBatches.sort((a, b) => (a.expDate || '').localeCompare(b.expDate || ''));
          const earliestActiveExp = activeValidBatches[0]?.expDate || (prod.batches && prod.batches.length > 0 ? '' : prod.expDate) || '';

          return {
            ...prod,
            stock: newStock,
            batches: updatedBatches.length > 0 ? updatedBatches : undefined,
            expDate: earliestActiveExp,
          };
        }
        return prod;
      })
    );

    // 2. Update Customer Due balance if there is due
    if (data.customerId && data.customerId !== 'walk-in' && data.dueAmount > 0 && data.paymentMethod !== 'INSTALLMENT' && !data.isInstallmentSale) {
      setParties(prevParties =>
        prevParties.map(p => {
          if (p.id === data.customerId) {
            return {
              ...p,
              currentBalance: p.currentBalance + data.dueAmount,
            };
          }
          return p;
        })
      );
    }

    // 3. Increase wallet balance if paid amount > 0
    if (data.paidAmount > 0 && selectedWallet) {
      setWallets(prevWallets =>
        prevWallets.map(w => {
          if (w.id === (data.walletId || selectedWallet.id)) {
            return {
              ...w,
              balance: w.balance + data.paidAmount,
            };
          }
          return w;
        })
      );
    }

    // 4. Always log every sale in Day Book (Transaction Ledger)
    // - If paidAmount > 0, amount is data.paidAmount (wallet received funds)
    // - If credit sale (paidAmount = 0), amount is 0 so Money In does NOT increase!
    const dayBookEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      voucherNo: invNum,
      date: invDate,
      type: 'SALE',
      flow: 'IN',
      partyId: data.customerId,
      partyName: data.customerName,
      partyType: 'CUSTOMER',
      amount: Number(data.paidAmount || 0), // ONLY the actual received amount! (0 if credit)
      walletId: data.paidAmount > 0 ? (data.walletId || selectedWallet?.id || 'w-cash') : 'due',
      walletName: data.paidAmount > 0 ? (selectedWallet?.name || 'Cash') : 'Credit / বাকি',
      referenceNo: invNum,
      remarks: data.notes 
        ? `Sale to ${data.customerName} (${data.notes})` 
        : data.paidAmount > 0
          ? `POS Sale receipt from ${data.customerName} (Total: ৳${data.grandTotal.toLocaleString()}, Received: ৳${data.paidAmount.toLocaleString()}${data.dueAmount > 0 ? `, Due: ৳${data.dueAmount.toLocaleString()}` : ''})`
          : `Credit Sale / বাকি বিক্রয় to ${data.customerName} (Total: ৳${data.grandTotal.toLocaleString()}, Due: ৳${data.dueAmount.toLocaleString()})`,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${invDate} ${nowTime}`,
    };
    setDayBookEntries(prev => [dayBookEntry, ...prev]);

    setSaleInvoices(prev => [newInvoice, ...prev]);

    // 5. Auto Register Warranty Records for items with warranty configuration
    const newWarrantyRecords: WarrantyRecord[] = [];
    data.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod && (prod.hasWarranty || item.warrantyInfo)) {
        const dur = prod.warrantyDuration || 1;
        const unit = prod.warrantyUnit || 'YEARS';
        const type = prod.warrantyType || 'REPLACEMENT';
        const serialNo = item.serialNumber || (prod.requiresSerialNo ? `SN-${Date.now().toString().slice(-6)}` : `SN-${Math.floor(100000 + Math.random() * 900000)}`);

        // Calculate Expiry Date
        const startDate = new Date(invDate);
        const expDateObj = new Date(startDate);
        if (unit === 'DAYS') expDateObj.setDate(expDateObj.getDate() + dur);
        else if (unit === 'MONTHS') expDateObj.setMonth(expDateObj.getMonth() + dur);
        else if (unit === 'YEARS') expDateObj.setFullYear(expDateObj.getFullYear() + dur);
        else if (unit === 'LIFETIME') expDateObj.setFullYear(expDateObj.getFullYear() + 100);

        const expDateStr = expDateObj.toISOString().split('T')[0];

        const rec: WarrantyRecord = {
          id: `war-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          warrantyCode: `WAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          invoiceId: newInvoice.id,
          invoiceNumber: newInvoice.invoiceNumber,
          saleDate: invDate,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku || 'SKU-GEN',
          serialNumber: serialNo,
          customerId: data.customerId || 'walk-in',
          customerName: data.customerName,
          customerPhone: data.customerPhone || '',
          warrantyType: type,
          duration: dur,
          durationUnit: unit,
          startDate: invDate,
          expiryDate: expDateStr,
          status: 'ACTIVE',
          terms: prod.warrantyTerms || 'Standard Product Warranty',
          createdAt: `${invDate} ${nowTime}`,
        };
        newWarrantyRecords.push(rec);
      }
    });

    if (newWarrantyRecords.length > 0) {
      setWarrantyRecords(prev => [...newWarrantyRecords, ...prev]);
    }

    // Auto SMS on Sale
    if (smsConfig.enabled && smsConfig.autoSendOnSale && data.customerPhone && data.customerId !== 'walk-in') {
      sendSaleSms(newInvoice).catch(err => console.warn('Sale SMS trigger error:', err));
    }

    showToast(
      language === 'bn'
        ? `বিক্রয় ইনভয়েস ${invNum} সম্পন্ন হয়েছে!`
        : `Sale invoice ${invNum} created successfully!`
    );

    return newInvoice;
  };

  const deleteSaleInvoice = (invoiceId: string, reason?: string): boolean => {
    const inv = saleInvoices.find(i => i.id === invoiceId);
    if (!inv) {
      showToast(language === 'bn' ? 'চালানটি খুঁজে পাওয়া যায়নি!' : 'Invoice not found!', 'error');
      return false;
    }

    const nowStr = formatDeletionTimestamp();
    const deletedRecord: DeletedSaleInvoice = {
      id: `del-inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      originalInvoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      customerId: inv.customerId,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone,
      customerAddress: inv.customerAddress,
      items: inv.items || [],
      subtotal: inv.subtotal,
      discount: inv.discount,
      vatAmount: inv.vatAmount,
      grandTotal: inv.grandTotal,
      paidAmount: inv.paidAmount,
      dueAmount: inv.dueAmount,
      paymentMethod: inv.paymentMethod,
      walletId: inv.walletId,
      walletName: inv.walletName,
      cashierName: inv.cashierName,
      createdBy: inv.createdBy,
      deletedAt: nowStr,
      deletedBy: {
        id: currentUser?.id || 'usr-1',
        username: currentUser?.username || 'admin',
        fullName: currentUser?.fullName || 'Super Admin',
        role: currentUser?.role || 'ADMIN',
      },
      deletionReason: reason?.trim() || (language === 'bn' ? 'ইউজার কর্তৃক চালান মুছে ফেলা হয়েছে' : 'Invoice deleted by user'),
      invoiceSnapshot: JSON.parse(JSON.stringify(inv)),
    };

    // 1. Save to deleted invoices state and standalone archive
    setDeletedSaleInvoices(prev => {
      const updated = [deletedRecord, ...prev];
      try {
        localStorage.setItem('DOKANPRO_DELETED_INVOICES_ARCHIVE', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save to standalone deleted invoice archive', e);
      }
      return updated;
    });

    // 2. Revert product stocks (add sold quantities back into stock)
    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemSold = inv.items.find(i => i.productId === prod.id);
        if (itemSold) {
          return {
            ...prod,
            stock: prod.stock + (itemSold.quantity || 0),
          };
        }
        return prod;
      })
    );

    // 3. Adjust Customer Due balance if this invoice increased customer's due
    if (inv.customerId && inv.customerId !== 'walk-in' && inv.dueAmount > 0 && inv.paymentMethod !== 'INSTALLMENT' && !inv.isInstallmentSale) {
      setParties(prevParties =>
        prevParties.map(p => {
          if (p.id === inv.customerId) {
            return {
              ...p,
              currentBalance: Math.max(0, p.currentBalance - inv.dueAmount),
            };
          }
          return p;
        })
      );
    }

    // 4. Revert wallet balance if paid amount was received
    if (inv.paidAmount > 0 && inv.walletId) {
      setWallets(prevWallets =>
        prevWallets.map(w => {
          if (w.id === inv.walletId) {
            return {
              ...w,
              balance: Math.max(0, w.balance - inv.paidAmount),
            };
          }
          return w;
        })
      );
    }

    // 5. Remove linked DayBook entry if created for this invoice
    setDayBookEntries(prev =>
      prev.filter(
        d => d.voucherNo !== inv.invoiceNumber && d.referenceNo !== inv.invoiceNumber
      )
    );

    // 6. If it was an Installment / EMI sale, cancel/remove linked scheme if any
    if (inv.installmentPlanId || inv.isInstallmentSale) {
      setInstallmentSchemes(prev =>
        prev.filter(
          s =>
            s.invoiceId !== inv.id &&
            s.invoiceNumber !== inv.invoiceNumber &&
            s.id !== inv.installmentPlanId
        )
      );
    }

    // 7. Remove invoice from active sales state
    setSaleInvoices(prev => prev.filter(i => i.id !== invoiceId));

    // 8. Log Activity with user details
    logActivity({
      actionType: 'DELETE',
      title: `Deleted Sale Invoice #${inv.invoiceNumber}`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted invoice #${inv.invoiceNumber} for ${inv.customerName} (৳${inv.grandTotal.toLocaleString()}). Reason: ${deletedRecord.deletionReason}`,
      severity: 'danger',
      targetId: inv.id,
      targetName: `Sale Invoice #${inv.invoiceNumber}`,
    });

    showToast(
      language === 'bn'
        ? `চালান #${inv.invoiceNumber} সফলভাবে ডিলিট হয়েছে এবং 'ডিলিট ইনভয়েস' ফাইলে সংরক্ষিত হয়েছে!`
        : `Invoice #${inv.invoiceNumber} deleted and saved to Deleted Invoices file!`,
      'success'
    );

    return true;
  };

  const restoreDeletedSaleInvoice = (deletedInvoiceId: string): boolean => {
    const record = deletedSaleInvoices.find(d => d.id === deletedInvoiceId || d.originalInvoiceId === deletedInvoiceId);
    if (!record || !record.invoiceSnapshot) {
      showToast(language === 'bn' ? 'ডিলিট করা চালানটি পাওয়া যায়নি!' : 'Deleted invoice record not found!', 'error');
      return false;
    }

    const restoredInv: SaleInvoice = record.invoiceSnapshot;

    // 1. Deduct stock for restored items
    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemSold = restoredInv.items.find(i => i.productId === prod.id);
        if (itemSold) {
          return {
            ...prod,
            stock: Math.max(0, prod.stock - (itemSold.quantity || 0)),
          };
        }
        return prod;
      })
    );

    // 2. Re-apply customer due if any
    if (restoredInv.customerId && restoredInv.customerId !== 'walk-in' && restoredInv.dueAmount > 0) {
      setParties(prevParties =>
        prevParties.map(p => {
          if (p.id === restoredInv.customerId) {
            return {
              ...p,
              currentBalance: p.currentBalance + restoredInv.dueAmount,
            };
          }
          return p;
        })
      );
    }

    // 3. Re-apply wallet balance
    if (restoredInv.paidAmount > 0 && restoredInv.walletId) {
      setWallets(prevWallets =>
        prevWallets.map(w => {
          if (w.id === restoredInv.walletId) {
            return {
              ...w,
              balance: w.balance + restoredInv.paidAmount,
            };
          }
          return w;
        })
      );
    }

    // 4. Put back into active saleInvoices
    setSaleInvoices(prev => [restoredInv, ...prev.filter(i => i.id !== restoredInv.id)]);

    // 5. Remove from deletedSaleInvoices
    setDeletedSaleInvoices(prev => {
      const updated = prev.filter(d => d.id !== record.id);
      try {
        localStorage.setItem('DOKANPRO_DELETED_INVOICES_ARCHIVE', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 6. Log Activity
    logActivity({
      actionType: 'USER_ACTION',
      title: `Restored Sale Invoice #${restoredInv.invoiceNumber}`,
      description: `User '${currentUser?.fullName || 'Admin'}' restored deleted invoice #${restoredInv.invoiceNumber} for ${restoredInv.customerName} (৳${restoredInv.grandTotal.toLocaleString()}).`,
      severity: 'info',
      targetId: restoredInv.id,
      targetName: `Sale Invoice #${restoredInv.invoiceNumber}`,
    });

    showToast(
      language === 'bn'
        ? `চালান #${restoredInv.invoiceNumber} সফলভাবে পুনরুদ্ধার (Restore) করা হয়েছে!`
        : `Invoice #${restoredInv.invoiceNumber} restored successfully!`,
      'success'
    );

    return true;
  };

  const permanentlyDeleteArchivedInvoice = (deletedInvoiceId: string): boolean => {
    if (currentUser?.role !== 'ADMIN') {
      showToast(
        language === 'bn'
          ? 'অনুমতি নেই! ডিলিটকৃত চালান শুধুমাত্র অ্যাডমিন স্থায়ীভাবে মুছে ফেলতে পারবেন।'
          : 'Permission denied! Only Admin can permanently delete archived invoices.',
        'error'
      );
      return false;
    }

    const record = deletedSaleInvoices.find(d => d.id === deletedInvoiceId);
    if (!record) {
      showToast(language === 'bn' ? 'চালানটি পাওয়া যায়নি!' : 'Record not found!', 'error');
      return false;
    }

    setDeletedSaleInvoices(prev => {
      const updated = prev.filter(d => d.id !== deletedInvoiceId);
      try {
        localStorage.setItem('DOKANPRO_DELETED_INVOICES_ARCHIVE', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    logActivity({
      actionType: 'DELETE',
      title: `Permanently Removed Deleted Invoice Archive #${record.invoiceNumber}`,
      description: `User '${currentUser?.fullName || 'Admin'}' permanently purged deleted invoice record #${record.invoiceNumber} from audit archive.`,
      severity: 'warning',
      targetId: record.id,
    });

    showToast(
      language === 'bn'
        ? `আর্কাইভ থেকে #${record.invoiceNumber} স্থায়ীভাবে মুছে ফেলা হয়েছে।`
        : `Permanently removed #${record.invoiceNumber} from archive.`,
      'info'
    );

    return true;
  };

  const clearAllDeletedInvoices = () => {
    if (currentUser?.role !== 'ADMIN') {
      showToast(
        language === 'bn'
          ? 'অনুমতি নেই! শুধুমাত্র অ্যাডমিন সকল ডিলিট হিস্ট্রি সাফ করতে পারবেন।'
          : 'Permission denied! Only Admin can clear all deleted records history.',
        'error'
      );
      return;
    }

    setDeletedSaleInvoices([]);
    try {
      localStorage.removeItem('DOKANPRO_DELETED_INVOICES_ARCHIVE');
    } catch {}
    showToast(
      language === 'bn' ? 'সকল ডিলিট হওয়া চালানের হিস্ট্রি মুছে ফেলা হয়েছে।' : 'All deleted invoices history cleared.',
      'info'
    );
  };

  const exportSingleDeletedInvoiceToFile = (invoice: DeletedSaleInvoice) => {
    const exportData = {
      title: `DokanPro ERP - Deleted Invoice Snapshot (${invoice.invoiceNumber})`,
      shopName: companySettings.shopName,
      shopPhone: companySettings.phone,
      exportedAt: new Date().toISOString(),
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      grandTotal: invoice.grandTotal,
      paidAmount: invoice.paidAmount,
      dueAmount: invoice.dueAmount,
      deletedAt: invoice.deletedAt,
      deletedBy: invoice.deletedBy,
      deletionReason: invoice.deletionReason,
      items: invoice.items,
      fullSnapshot: invoice.invoiceSnapshot,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deleted-invoice-${invoice.invoiceNumber}-${Date.now().toString().slice(-4)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(
      language === 'bn'
        ? `চালান #${invoice.invoiceNumber} এর JSON ফাইল সফলভাবে ডাউনলোড হয়েছে।`
        : `Deleted invoice #${invoice.invoiceNumber} JSON file exported.`,
      'success'
    );
  };

  const exportDeletedInvoicesToFile = () => {
    if (deletedSaleInvoices.length === 0) {
      showToast(language === 'bn' ? 'কোন ডিলিট করা চালান পাওয়া যায়নি!' : 'No deleted invoices to export!', 'warning');
      return;
    }

    const exportData = {
      title: 'DokanPro ERP - Deleted Invoices Audit File',
      shopName: companySettings.shopName,
      shopPhone: companySettings.phone,
      exportedAt: new Date().toISOString(),
      exportedBy: {
        name: currentUser?.fullName || 'Super Admin',
        username: currentUser?.username || 'admin',
        role: currentUser?.role || 'ADMIN',
      },
      totalDeletedInvoices: deletedSaleInvoices.length,
      totalDeletedAmount: deletedSaleInvoices.reduce((sum, d) => sum + (d.grandTotal || 0), 0),
      records: deletedSaleInvoices,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deleted-invoices-audit-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(
      language === 'bn'
        ? 'ডিলিট হওয়া চালানের অডিট ফাইল (.json) সফলভাবে ডাউনলোড হয়েছে।'
        : 'Deleted invoices audit file downloaded successfully.',
      'success'
    );
  };

  const createSaleReturn = (returnData: {
    invoiceId: string;
    originalInvoiceNumber: string;
    customerId: string;
    customerName: string;
    items: {
      productId: string;
      productName: string;
      unit: any;
      unitPrice: number;
      returnQuantity: number;
      totalRefund: number;
    }[];
    totalRefund: number;
    refundWalletId: string;
    reason: string;
  }) => {
    // Check if a return already exists for this invoice
    const alreadyReturned = saleReturns.some(r => r.invoiceId === returnData.invoiceId);
    if (alreadyReturned) {
      showToast(
        language === 'bn' ? 'এই চালানটি ইতিমধ্যে ফেরত দেওয়া হয়েছে!' : 'This invoice has already been returned!',
        'error'
      );
      return;
    }

    const returnNum = `RET-2026-${100 + saleReturns.length + 1}`;
    const today = new Date().toISOString().split('T')[0];
    const fullTimeStamp = formatDeletionTimestamp();
    const refundWallet = wallets.find(w => w.id === returnData.refundWalletId);

    // Validate wallet balance if cash/bank refund is being paid
    if (returnData.totalRefund > 0 && returnData.refundWalletId) {
      if (!refundWallet) {
        showToast(
          language === 'bn' ? 'রিফান্ড ওয়ালেট খুঁজে পাওয়া যায়নি!' : 'Refund wallet not found!',
          'error'
        );
        return;
      }
      if (refundWallet.balance < returnData.totalRefund) {
        showToast(
          language === 'bn'
            ? `নির্বাচিত রিফান্ড ওয়ালেটে (${refundWallet.name}) পর্যাপ্ত ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳${refundWallet.balance.toLocaleString()} | প্রয়োজন: ৳${returnData.totalRefund.toLocaleString()}`
            : `Insufficient balance in refund wallet (${refundWallet.name})! Available: ৳${refundWallet.balance.toLocaleString()} | Required: ৳${returnData.totalRefund.toLocaleString()}`,
          'error'
        );
        return;
      }
    }

    const newReturn: SaleReturn = {
      id: `sret-${Date.now()}`,
      returnNumber: returnNum,
      originalInvoiceNumber: returnData.originalInvoiceNumber,
      invoiceId: returnData.invoiceId,
      date: today,
      customerId: returnData.customerId,
      customerName: returnData.customerName,
      items: returnData.items,
      totalRefund: returnData.totalRefund,
      refundWalletId: returnData.refundWalletId,
      refundWalletName: refundWallet?.name || 'Cash',
      reason: returnData.reason,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: fullTimeStamp,
    };

    // 1. Revert product stocks back
    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemRet = returnData.items.find(i => i.productId === prod.id);
        if (itemRet) {
          return {
            ...prod,
            stock: prod.stock + itemRet.returnQuantity,
          };
        }
        return prod;
      })
    );

    // 2. Deduct from wallet if refund paid
    if (returnData.totalRefund > 0 && returnData.refundWalletId) {
      setWallets(prevWallets =>
        prevWallets.map(w => {
          if (w.id === returnData.refundWalletId) {
            return {
              ...w,
              balance: w.balance - returnData.totalRefund,
            };
          }
          return w;
        })
      );

      // Log in Day Book
      const dbEntry: DayBookEntry = {
        id: `db-${Date.now()}`,
        voucherNo: returnNum,
        date: today,
        type: 'SALE_RETURN',
        flow: 'OUT',
        partyId: returnData.customerId,
        partyName: returnData.customerName,
        partyType: 'CUSTOMER',
        amount: returnData.totalRefund,
        walletId: returnData.refundWalletId,
        walletName: refundWallet?.name || 'Cash',
        referenceNo: returnData.originalInvoiceNumber,
        remarks: `Sale return for ${returnData.originalInvoiceNumber}: ${returnData.reason}`,
        createdBy: currentUser?.id || 'usr-1',
        createdAt: fullTimeStamp,
      };
      setDayBookEntries(prev => [dbEntry, ...prev]);
    }

    logActivity({
      actionType: 'USER_ACTION',
      title: `Created Sale Return #${returnNum}`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) created sale return #${returnNum} for Invoice #${returnData.originalInvoiceNumber} (Customer: ${returnData.customerName}, Refund: ৳${returnData.totalRefund.toLocaleString()}) on ${fullTimeStamp}.`,
      severity: 'info',
      targetId: newReturn.id,
      targetName: `Sale Return #${returnNum}`,
    });

    setSaleReturns(prev => [newReturn, ...prev]);
    showToast(
      language === 'bn'
        ? `পণ্য ফেরত ও রিফান্ড ${returnNum} (${fullTimeStamp}) সময় সহ সংরক্ষণ হয়েছে।`
        : `Sale return ${returnNum} recorded with timestamp (${fullTimeStamp}).`
    );
  };

  const deleteSaleReturn = (returnIdOrNum: string) => {
    const targetReturn = saleReturns.find(r => r.id === returnIdOrNum || r.returnNumber === returnIdOrNum);
    if (!targetReturn) return;

    // 1. Revert product stocks (subtract what was returned)
    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemRet = targetReturn.items.find(i => i.productId === prod.id);
        if (itemRet) {
          return {
            ...prod,
            stock: prod.stock - itemRet.returnQuantity,
          };
        }
        return prod;
      })
    );

    // 2. Revert wallet balance if refund was paid
    if (targetReturn.totalRefund > 0 && targetReturn.refundWalletId) {
      setWallets(prevWallets =>
        prevWallets.map(w => {
          if (w.id === targetReturn.refundWalletId) {
            return {
              ...w,
              balance: w.balance + targetReturn.totalRefund,
            };
          }
          return w;
        })
      );
      
      setDayBookEntries(prev => prev.filter(db => db.voucherNo !== targetReturn.returnNumber));
    }

    setSaleReturns(prev => prev.filter(r => r.id !== targetReturn.id && r.returnNumber !== targetReturn.returnNumber));
    
    const nowStr = formatDeletionTimestamp();
    logActivity({
      actionType: 'DELETE',
      title: `Deleted Sale Return #${targetReturn.returnNumber}`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted sale return #${targetReturn.returnNumber} (Refund: ৳${targetReturn.totalRefund.toLocaleString()}) on ${nowStr}.`,
      severity: 'danger',
      targetId: targetReturn.id,
      targetName: `Sale Return #${targetReturn.returnNumber}`,
    });

    showToast(
      language === 'bn'
        ? `ফেরত চালান ${targetReturn.returnNumber} (${nowStr}) ডিলিট করা হয়েছে।`
        : `Sale return ${targetReturn.returnNumber} deleted on ${nowStr}.`,
      'success'
    );
  };

  const recordPaymentIn = (data: {
    partyId: string;
    amount: number;
    walletId: string;
    date: string;
    remarks: string;
  }) => {
    const party = parties.find(p => p.id === data.partyId);
    const wallet = wallets.find(w => w.id === data.walletId);
    const voucherNo = `REC-2026-${500 + dayBookEntries.length + 1}`;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

    // 1. Decrease customer balance
    setParties(prev =>
      prev.map(p => {
        if (p.id === data.partyId) {
          return {
            ...p,
            currentBalance: Math.max(0, p.currentBalance - data.amount),
          };
        }
        return p;
      })
    );

    // 2. Increase wallet
    setWallets(prev =>
      prev.map(w => {
        if (w.id === data.walletId) {
          return {
            ...w,
            balance: w.balance + data.amount,
          };
        }
        return w;
      })
    );

    // 3. Day book log
    const entry: DayBookEntry = {
      id: `db-${Date.now()}`,
      voucherNo,
      date: data.date,
      type: 'PAYMENT_IN',
      flow: 'IN',
      partyId: data.partyId,
      partyName: party?.name || 'Customer',
      partyType: 'CUSTOMER',
      amount: data.amount,
      walletId: data.walletId,
      walletName: wallet?.name || 'Cash',
      referenceNo: voucherNo,
      remarks: data.remarks || `Customer due collection from ${party?.name}`,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${data.date} ${nowTime}`,
    };
    setDayBookEntries(prev => [entry, ...prev]);

    const remainingDue = Math.max(0, (party?.currentBalance || 0) - data.amount);

    // Open Money Receipt Voucher
    openPrintModal({
      type: 'MONEY_RECEIPT',
      title: 'Payment In Money Receipt (টাকা জমার রসিদ)',
      data: {
        voucherNo,
        date: data.date,
        partyName: party?.name,
        partyPhone: party?.phone,
        companyName: party?.companyName,
        amount: data.amount,
        walletName: wallet?.name,
        remarks: data.remarks,
        previousDue: party?.currentBalance,
        remainingDue,
      },
    });

    // Auto SMS on Payment In
    if (smsConfig.enabled && smsConfig.autoSendOnPaymentIn && party && party.phone) {
      sendPaymentInSms(party, data.amount, remainingDue, voucherNo).catch(err => console.warn('Payment In SMS trigger error:', err));
    }

    showToast(
      language === 'bn'
        ? `${party?.name} এর কাছ থেকে ৳${data.amount} জমা নেওয়া হয়েছে।`
        : `Collected ${formatCurrency(data.amount)} from ${party?.name}`
    );
  };

  // -------------------------------------------------------------
  // Purchase Logic
  // -------------------------------------------------------------
  const createPurchaseInvoice = (data: {
    billNumber?: string;
    supplierId: string;
    supplierName: string;
    supplierPhone: string;
    supplierInvoiceNo?: string;
    items: {
      productId: string;
      productName: string;
      unit: any;
      quantity: number;
      purchasePrice: number;
      total: number;
      batchNumber?: string;
      expDate?: string;
      mfgDate?: string;
      salesPrice?: number;
    }[];
    subtotal: number;
    discount: number;
    taxAmount: number;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
    paymentMethod: PaymentMethod;
    walletId: string;
    notes?: string;
    date?: string;
  }): PurchaseInvoice => {
    const rawBillNum = data.billNumber?.trim() || data.supplierInvoiceNo?.trim();
    const billNum = rawBillNum || generatePurchaseBillNumber(purchaseInvoices);

    // Duplicate Purchase Bill / Invoice No Validation
    const duplicateBill = checkDuplicatePurchaseInvoice(billNum, purchaseInvoices);

    if (duplicateBill) {
      showToast(
        language === 'bn'
          ? `আগে থেকে এই Invoice No এন্ট্রি আছে! (${billNum}) ইতিমধ্যে "${duplicateBill.supplierName}"-এর ক্রয়ে ব্যবহৃত। একই ইনভয়েস নং দুইবার এন্ট্রি হবে না।`
          : `This Invoice No is already entered previously! (${billNum}) Duplicate Invoice No not allowed.`,
        'error'
      );
      return null as any;
    }

    const purDate = data.date || new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const selectedWallet = wallets.find(w => w.id === data.walletId) || wallets[0];

    // Validate wallet balance if paying cash/bank upfront
    if (data.paidAmount > 0) {
      if (!selectedWallet) {
        showToast(
          language === 'bn' ? 'পেমেন্ট ওয়ালেট খুঁজে পাওয়া যায়নি!' : 'Payment wallet not found!',
          'error'
        );
        return null;
      }
      if (selectedWallet.balance < data.paidAmount) {
        showToast(
          language === 'bn'
            ? `নির্বাচিত ওয়ালেটে (${selectedWallet.name}) পর্যাপ্ত ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳${selectedWallet.balance.toLocaleString()} | পরিশোধ: ৳${data.paidAmount.toLocaleString()}। অনুগ্রহ করে ওয়ালেটে টাকা জমা দিন অথবা বাকি (Credit) হিসেবে এন্ট্রি করুন।`
            : `Insufficient balance in ${selectedWallet.name}! Available: ৳${selectedWallet.balance.toLocaleString()} | Trying to pay: ৳${data.paidAmount.toLocaleString()}. Please deposit funds or save as credit purchase.`,
          'error'
        );
        return null;
      }
    }

    let status: 'PAID' | 'PARTIAL' | 'DUE' = 'PAID';
    if (data.dueAmount > 0 && data.paidAmount > 0) {
      status = 'PARTIAL';
    } else if (data.paidAmount === 0 && data.dueAmount > 0) {
      status = 'DUE';
    }

    const creatorName = currentUser?.fullName || currentUser?.username || 'Admin';

    const newPurchase: PurchaseInvoice = {
      id: `pur-${Date.now()}`,
      billNumber: billNum,
      supplierInvoiceNo: rawBillNum || data.supplierInvoiceNo || billNum,
      date: purDate,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      supplierPhone: data.supplierPhone,
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount,
      taxAmount: data.taxAmount,
      grandTotal: data.grandTotal,
      paidAmount: data.paidAmount,
      dueAmount: data.dueAmount,
      paymentMethod: data.paymentMethod,
      walletId: data.walletId || selectedWallet?.id || 'w-cash',
      walletName: data.paidAmount > 0 ? (selectedWallet?.name || 'Cash') : 'Credit / বাকি',
      status,
      notes: data.notes,
      createdBy: creatorName,
      completedBy: status === 'PAID' ? creatorName : undefined,
      contributors: [
        {
          action: 'Created Purchase Bill',
          actionBn: 'ক্রয় চালান তৈরি',
          userName: creatorName,
          userId: currentUser?.id,
          userRole: currentUser?.role,
          timestamp: `${purDate} ${nowTime}`,
        },
        ...(status === 'PAID'
          ? [
              {
                action: 'Payment Cleared in Full',
                actionBn: 'সম্পূর্ণ পরিশোধিত',
                userName: creatorName,
                userId: currentUser?.id,
                userRole: currentUser?.role,
                timestamp: `${purDate} ${nowTime}`,
              },
            ]
          : []),
      ],
      createdAt: `${purDate} ${nowTime}`,
    };

    // 1. Increase product stock, register batch with purchase date & expiry date, and update purchase price
    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemBought = data.items.find(i => i.productId === prod.id);
        if (itemBought) {
          const bNum = itemBought.batchNumber || (itemBought.expDate ? `B-${itemBought.expDate.replace(/-/g, '')}` : (prod.batchNumber || `B-${purDate.replace(/-/g, '')}`));
          const bExp = itemBought.expDate || prod.expDate || '';

          let existingBatches = prod.batches ? [...prod.batches.map(b => ({ ...b }))] : [];

          // If product had initial stock without explicit batches, seed a base batch
          if (existingBatches.length === 0 && prod.stock > 0) {
            existingBatches.push({
              id: `batch-init-${prod.id}`,
              batchNumber: prod.batchNumber || 'INIT-BATCH',
              expDate: prod.expDate || '',
              purchaseDate: prod.createdAt || purDate,
              purchaseInvoiceNo: 'INIT-STOCK',
              purchasePrice: prod.purchasePrice || 0,
              salesPrice: prod.salesPrice || 0,
              stock: prod.stock,
              initialStock: prod.stock,
              createdAt: prod.createdAt || `${purDate} ${nowTime}`,
            });
          }

          // Check if batch with identical batchNumber and expDate already exists
          const existingBatchIdx = existingBatches.findIndex(
            b => b.batchNumber.trim().toLowerCase() === bNum.trim().toLowerCase() && (b.expDate || '') === bExp
          );

          if (existingBatchIdx >= 0) {
            existingBatches[existingBatchIdx] = {
              ...existingBatches[existingBatchIdx],
              stock: existingBatches[existingBatchIdx].stock + Number(itemBought.quantity),
              purchasePrice: itemBought.purchasePrice || existingBatches[existingBatchIdx].purchasePrice,
              purchaseDate: purDate,
              purchaseInvoiceNo: billNum,
              supplierName: data.supplierName,
              supplierId: data.supplierId,
            };
          } else {
            const newBatch: ProductBatch = {
              id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              batchNumber: bNum,
              expDate: bExp,
              mfgDate: itemBought.mfgDate || '',
              purchaseDate: purDate,
              purchaseInvoiceNo: billNum,
              purchasePrice: itemBought.purchasePrice || prod.purchasePrice,
              salesPrice: itemBought.salesPrice || prod.salesPrice,
              stock: Number(itemBought.quantity),
              initialStock: Number(itemBought.quantity),
              supplierId: data.supplierId,
              supplierName: data.supplierName,
              createdAt: `${purDate} ${nowTime}`,
            };
            existingBatches.push(newBatch);
          }

          const newTotalStock = prod.stock + Number(itemBought.quantity);

          // Find earliest active expiry date for the product (FEFO)
          const activeBatchesWithExp = existingBatches.filter(b => Number(b.stock) > 0 && b.expDate);
          activeBatchesWithExp.sort((a, b) => a.expDate.localeCompare(b.expDate));
          const earliestActiveExp = activeBatchesWithExp[0]?.expDate || bExp || prod.expDate || '';

          return {
            ...prod,
            stock: newTotalStock,
            purchasePrice: itemBought.purchasePrice || prod.purchasePrice,
            expDate: earliestActiveExp,
            batchNumber: bNum,
            batches: existingBatches,
          };
        }
        return prod;
      })
    );

    // 2. Increase supplier due if there is unpaid amount
    if (data.dueAmount > 0 && data.supplierId) {
      setParties(prevParties =>
        prevParties.map(p => {
          if (p.id === data.supplierId) {
            return {
              ...p,
              currentBalance: p.currentBalance + data.dueAmount,
            };
          }
          return p;
        })
      );
    }

    // 3. Deduct paid amount from wallet if paid > 0
    if (data.paidAmount > 0 && selectedWallet) {
      setWallets(prevWallets =>
        prevWallets.map(w => {
          if (w.id === (data.walletId || selectedWallet.id)) {
            return {
              ...w,
              balance: w.balance - data.paidAmount,
            };
          }
          return w;
        })
      );
    }

    // 4. Always log every purchase in Day Book (Transaction Ledger)
    // - If paidAmount > 0, amount is data.paidAmount (wallet deducted funds)
    // - If credit purchase (paidAmount = 0), amount is 0 so Money Out does NOT increase!
    const dayBookEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      voucherNo: billNum,
      date: purDate,
      type: 'PURCHASE',
      flow: 'OUT',
      partyId: data.supplierId,
      partyName: data.supplierName,
      partyType: 'SUPPLIER',
      amount: Number(data.paidAmount || 0), // ONLY the actual amount paid/deducted from wallet! (0 if credit)
      walletId: data.paidAmount > 0 ? (data.walletId || selectedWallet?.id || 'w-cash') : 'credit',
      walletName: data.paidAmount > 0 ? (selectedWallet?.name || 'Cash') : 'Credit / বাকি',
      referenceNo: billNum,
      remarks: data.notes 
        ? `Purchase from ${data.supplierName} (${data.notes})` 
        : data.paidAmount > 0
          ? `Purchase payment to ${data.supplierName} (Total: ৳${data.grandTotal.toLocaleString()}, Paid: ৳${data.paidAmount.toLocaleString()}${data.dueAmount > 0 ? `, Remaining Due: ৳${data.dueAmount.toLocaleString()}` : ''})`
          : `Credit Purchase / বাকি ক্রয় from ${data.supplierName} (Total: ৳${data.grandTotal.toLocaleString()}, Due: ৳${data.dueAmount.toLocaleString()})`,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${purDate} ${nowTime}`,
    };
    setDayBookEntries(prev => [dayBookEntry, ...prev]);

    setPurchaseInvoices(prev => [newPurchase, ...prev]);
    showToast(
      language === 'bn'
        ? `ক্রয় ভাউচার ${billNum} সফলভাবে সংরক্ষিত হয়েছে।`
        : `Purchase bill ${billNum} created successfully.`
    );
    return newPurchase;
  };

  const deletePurchaseInvoice = (invoiceId: string, reason?: string): boolean => {
    const inv = purchaseInvoices.find(i => i.id === invoiceId);
    if (!inv) {
      showToast(language === 'bn' ? 'চালানটি খুঁজে পাওয়া যায়নি!' : 'Purchase Bill not found!', 'error');
      return false;
    }

    const nowStr = formatDeletionTimestamp();

    const deletedRecord: DeletedPurchaseInvoice = {
      id: `del-pur-${Date.now()}`,
      originalPurchaseId: inv.id,
      billNumber: inv.billNumber,
      supplierInvoiceNo: inv.supplierInvoiceNo,
      date: inv.date,
      supplierId: inv.supplierId,
      supplierName: inv.supplierName,
      supplierPhone: inv.supplierPhone,
      items: inv.items || [],
      subtotal: inv.subtotal,
      discount: inv.discount,
      taxAmount: inv.taxAmount,
      grandTotal: inv.grandTotal,
      paidAmount: inv.paidAmount,
      dueAmount: inv.dueAmount,
      paymentMethod: inv.paymentMethod,
      walletId: inv.walletId,
      walletName: inv.walletName,
      createdBy: inv.createdBy,
      deletedAt: nowStr,
      deletedBy: {
        id: currentUser?.id || 'usr-1',
        username: currentUser?.username || 'admin',
        fullName: currentUser?.fullName || 'Super Admin',
        role: currentUser?.role || 'ADMIN',
      },
      deletionReason: reason?.trim() || (language === 'bn' ? 'ইউজার কর্তৃক ক্রয় চালান মুছে ফেলা হয়েছে' : 'Purchase bill deleted by user'),
      invoiceSnapshot: JSON.parse(JSON.stringify(inv)),
    };

    // 1. Save to deletedPurchaseInvoices state and standalone archive
    setDeletedPurchaseInvoices(prev => {
      const updated = [deletedRecord, ...prev];
      try {
        localStorage.setItem('DOKANPRO_DELETED_PURCHASES_ARCHIVE', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save to standalone deleted purchase archive', e);
      }
      return updated;
    });

    // 2. Revert product stocks and batch entries
    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemPurchased = inv.items.find(i => i.productId === prod.id);
        if (itemPurchased) {
          let updatedBatches = prod.batches ? [...prod.batches.map(b => ({ ...b }))] : [];
          if (updatedBatches.length > 0) {
            // Revert batch created by this invoice billNumber or deduct qty
            updatedBatches = updatedBatches.map(b => {
              if (b.purchaseInvoiceNo === inv.billNumber) {
                return {
                  ...b,
                  stock: Math.max(0, b.stock - (itemPurchased.quantity || 0)),
                };
              }
              return b;
            }).filter(b => b.stock > 0 || b.purchaseInvoiceNo !== inv.billNumber);
          }

          const newStock = Math.max(0, prod.stock - (itemPurchased.quantity || 0));
          const activeBatchesWithExp = updatedBatches.filter(b => Number(b.stock) > 0 && b.expDate);
          activeBatchesWithExp.sort((a, b) => a.expDate.localeCompare(b.expDate));
          const earliestActiveExp = activeBatchesWithExp[0]?.expDate || prod.expDate || '';

          return {
            ...prod,
            stock: newStock,
            batches: updatedBatches.length > 0 ? updatedBatches : undefined,
            expDate: earliestActiveExp,
          };
        }
        return prod;
      })
    );

    // 3. Adjust Supplier Due balance if this invoice increased supplier's due
    if (inv.supplierId && inv.dueAmount > 0) {
      setParties(prevParties =>
        prevParties.map(p => {
          if (p.id === inv.supplierId) {
            return {
              ...p,
              currentBalance: Math.max(0, p.currentBalance - inv.dueAmount),
            };
          }
          return p;
        })
      );
    }

    // 4. Revert wallet balance if paid amount was deducted
    if (inv.paidAmount > 0 && inv.walletId) {
      setWallets(prevWallets =>
        prevWallets.map(w => {
          if (w.id === inv.walletId) {
            return {
              ...w,
              balance: w.balance + inv.paidAmount,
            };
          }
          return w;
        })
      );
    }

    // 5. Remove linked DayBook entry if created for this invoice
    setDayBookEntries(prev =>
      prev.filter(
        d => d.voucherNo !== inv.billNumber && d.referenceNo !== inv.billNumber
      )
    );

    // 6. Remove invoice from active purchaseInvoices state
    setPurchaseInvoices(prev => prev.filter(i => i.id !== invoiceId));

    // 7. Log Activity
    logActivity({
      actionType: 'DELETE',
      title: `Deleted Purchase Bill #${inv.billNumber}`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted purchase bill #${inv.billNumber} from ${inv.supplierName} (৳${inv.grandTotal.toLocaleString()}). Reason: ${deletedRecord.deletionReason}`,
      severity: 'danger',
      targetId: inv.id,
      targetName: `Purchase Bill #${inv.billNumber}`,
    });

    showToast(
      language === 'bn'
        ? `ক্রয় চালান #${inv.billNumber} সফলভাবে ডিলিট হয়েছে এবং 'Delete Purchase' ফাইলে জমা রাখা হয়েছে!`
        : `Purchase bill #${inv.billNumber} deleted and saved to Delete Purchase archive!`,
      'success'
    );

    return true;
  };

  const restoreDeletedPurchaseInvoice = (deletedPurchaseId: string): boolean => {
    const record = deletedPurchaseInvoices.find(d => d.id === deletedPurchaseId || d.originalPurchaseId === deletedPurchaseId);
    if (!record || !record.invoiceSnapshot) {
      showToast(language === 'bn' ? 'ডিলিট করা ক্রয় চালানটি পাওয়া যায়নি!' : 'Deleted purchase record not found!', 'error');
      return false;
    }

    const restoredInv: PurchaseInvoice = record.invoiceSnapshot;

    // 1. Add back product stocks and batches
    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemPurchased = restoredInv.items.find(i => i.productId === prod.id);
        if (itemPurchased) {
          const existingBatches = prod.batches ? [...prod.batches.map(b => ({ ...b }))] : [];
          const bNum = itemPurchased.batchNumber || `BATCH-${restoredInv.billNumber}`;
          const bExp = itemPurchased.expDate || '';

          const batchIdx = existingBatches.findIndex(
            b => b.batchNumber.trim().toLowerCase() === bNum.trim().toLowerCase() && (b.expDate || '') === bExp
          );

          if (batchIdx >= 0) {
            existingBatches[batchIdx] = {
              ...existingBatches[batchIdx],
              stock: existingBatches[batchIdx].stock + Number(itemPurchased.quantity),
            };
          } else {
            existingBatches.push({
              id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              batchNumber: bNum,
              expDate: bExp,
              mfgDate: itemPurchased.mfgDate || '',
              purchaseDate: restoredInv.date,
              purchaseInvoiceNo: restoredInv.billNumber,
              purchasePrice: itemPurchased.purchasePrice || prod.purchasePrice,
              salesPrice: itemPurchased.salesPrice || prod.salesPrice,
              stock: Number(itemPurchased.quantity),
              initialStock: Number(itemPurchased.quantity),
              supplierId: restoredInv.supplierId,
              supplierName: restoredInv.supplierName,
              createdAt: `${restoredInv.date} 12:00:00`,
            });
          }

          const newStock = prod.stock + Number(itemPurchased.quantity);
          const activeBatchesWithExp = existingBatches.filter(b => Number(b.stock) > 0 && b.expDate);
          activeBatchesWithExp.sort((a, b) => a.expDate.localeCompare(b.expDate));
          const earliestExp = activeBatchesWithExp[0]?.expDate || prod.expDate || '';

          return {
            ...prod,
            stock: newStock,
            batches: existingBatches,
            expDate: earliestExp,
          };
        }
        return prod;
      })
    );

    // 2. Re-apply supplier due
    if (restoredInv.supplierId && restoredInv.dueAmount > 0) {
      setParties(prevParties =>
        prevParties.map(p => {
          if (p.id === restoredInv.supplierId) {
            return {
              ...p,
              currentBalance: p.currentBalance + restoredInv.dueAmount,
            };
          }
          return p;
        })
      );
    }

    // 3. Deduct wallet balance for paid amount if paid
    if (restoredInv.paidAmount > 0 && restoredInv.walletId) {
      setWallets(prevWallets =>
        prevWallets.map(w => {
          if (w.id === restoredInv.walletId) {
            return {
              ...w,
              balance: Math.max(0, w.balance - restoredInv.paidAmount),
            };
          }
          return w;
        })
      );
    }

    // 4. Put back into active purchaseInvoices
    setPurchaseInvoices(prev => [restoredInv, ...prev.filter(i => i.id !== restoredInv.id)]);

    // 5. Remove from deletedPurchaseInvoices
    setDeletedPurchaseInvoices(prev => {
      const updated = prev.filter(d => d.id !== record.id);
      try {
        localStorage.setItem('DOKANPRO_DELETED_PURCHASES_ARCHIVE', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 6. Log Activity
    logActivity({
      actionType: 'USER_ACTION',
      title: `Restored Purchase Bill #${restoredInv.billNumber}`,
      description: `User '${currentUser?.fullName || 'Admin'}' restored deleted purchase bill #${restoredInv.billNumber} from ${restoredInv.supplierName} (৳${restoredInv.grandTotal.toLocaleString()}).`,
      severity: 'info',
      targetId: restoredInv.id,
      targetName: `Purchase Bill #${restoredInv.billNumber}`,
    });

    showToast(
      language === 'bn'
        ? `ক্রয় চালান #${restoredInv.billNumber} সফলভাবে পুনরুদ্ধার (Restore) করা হয়েছে!`
        : `Purchase bill #${restoredInv.billNumber} restored successfully!`,
      'success'
    );

    return true;
  };

  const permanentlyDeleteArchivedPurchase = (deletedPurchaseId: string): boolean => {
    if (currentUser?.role !== 'ADMIN') {
      showToast(
        language === 'bn'
          ? 'অনুমতি নেই! ডিলিটকৃত ক্রয় চালান শুধুমাত্র অ্যাডমিন স্থায়ীভাবে মুছে ফেলতে পারবেন।'
          : 'Permission denied! Only Admin can permanently delete archived purchases.',
        'error'
      );
      return false;
    }

    const record = deletedPurchaseInvoices.find(d => d.id === deletedPurchaseId);
    if (!record) {
      showToast(language === 'bn' ? 'ক্রয় চালানটি পাওয়া যায়নি!' : 'Purchase record not found!', 'error');
      return false;
    }

    setDeletedPurchaseInvoices(prev => {
      const updated = prev.filter(d => d.id !== deletedPurchaseId);
      try {
        localStorage.setItem('DOKANPRO_DELETED_PURCHASES_ARCHIVE', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    logActivity({
      actionType: 'DELETE',
      title: `Permanently Removed Deleted Purchase Bill Archive #${record.billNumber}`,
      description: `User '${currentUser?.fullName || 'Admin'}' permanently purged deleted purchase bill #${record.billNumber} from audit archive.`,
      severity: 'warning',
      targetId: record.id,
    });

    showToast(
      language === 'bn'
        ? `আর্কাইভ থেকে ক্রয় চালান #${record.billNumber} স্থায়ীভাবে মুছে ফেলা হয়েছে।`
        : `Permanently removed purchase #${record.billNumber} from archive.`,
      'info'
    );

    return true;
  };

  const clearAllDeletedPurchases = () => {
    if (currentUser?.role !== 'ADMIN') {
      showToast(
        language === 'bn'
          ? 'অনুমতি নেই! শুধুমাত্র অ্যাডমিন সকল ডিলিট ক্রয় হিস্ট্রি সাফ করতে পারবেন।'
          : 'Permission denied! Only Admin can clear all deleted purchases history.',
        'error'
      );
      return;
    }

    setDeletedPurchaseInvoices([]);
    try {
      localStorage.removeItem('DOKANPRO_DELETED_PURCHASES_ARCHIVE');
    } catch {}
    showToast(
      language === 'bn' ? 'সকল ডিলিট হওয়া ক্রয় চালানের হিস্ট্রি মুছে ফেলা হয়েছে।' : 'All deleted purchases history cleared.',
      'info'
    );
  };

  const exportSingleDeletedPurchaseToFile = (purchase: DeletedPurchaseInvoice) => {
    const exportData = {
      title: `DokanPro ERP - Deleted Purchase Snapshot (${purchase.billNumber})`,
      shopName: companySettings.shopName,
      shopPhone: companySettings.phone,
      exportedAt: new Date().toISOString(),
      billNumber: purchase.billNumber,
      supplierName: purchase.supplierName,
      supplierPhone: purchase.supplierPhone,
      grandTotal: purchase.grandTotal,
      paidAmount: purchase.paidAmount,
      dueAmount: purchase.dueAmount,
      deletedAt: purchase.deletedAt,
      deletedBy: purchase.deletedBy,
      deletionReason: purchase.deletionReason,
      items: purchase.items,
      fullSnapshot: purchase.invoiceSnapshot,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deleted-purchase-${purchase.billNumber}-${Date.now().toString().slice(-4)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(
      language === 'bn'
        ? `ক্রয় চালান #${purchase.billNumber} এর JSON ফাইল সফলভাবে ডাউনলোড হয়েছে।`
        : `Deleted purchase #${purchase.billNumber} JSON file exported.`,
      'success'
    );
  };

  const exportDeletedPurchasesToFile = () => {
    if (deletedPurchaseInvoices.length === 0) {
      showToast(language === 'bn' ? 'কোন ডিলিট করা ক্রয় চালান পাওয়া যায়নি!' : 'No deleted purchases to export!', 'warning');
      return;
    }

    const exportData = {
      title: 'DokanPro ERP - Delete Purchase Audit File',
      shopName: companySettings.shopName,
      shopPhone: companySettings.phone,
      exportedAt: new Date().toISOString(),
      exportedBy: {
        name: currentUser?.fullName || 'Super Admin',
        username: currentUser?.username || 'admin',
        role: currentUser?.role || 'ADMIN',
      },
      totalDeletedPurchases: deletedPurchaseInvoices.length,
      totalDeletedAmount: deletedPurchaseInvoices.reduce((sum, d) => sum + (d.grandTotal || 0), 0),
      records: deletedPurchaseInvoices,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deleted-purchases-audit-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(
      language === 'bn'
        ? 'ডিলিট হওয়া ক্রয় চালানের অডিট ফাইল (.json) সফলভাবে ডাউনলোড হয়েছে।'
        : 'Delete Purchase audit file downloaded successfully.',
      'success'
    );
  };

  const createPurchaseReturn = (returnData: {
    purchaseId: string;
    originalBillNumber: string;
    supplierId: string;
    supplierName: string;
    items: {
      productId: string;
      productName: string;
      unit: any;
      purchasePrice: number;
      returnQuantity: number;
      totalAmount: number;
    }[];
    totalAmount: number;
    refundWalletId: string;
    reason: string;
  }) => {
    // Check if a return already exists for this purchase
    const alreadyReturned = purchaseReturns.some(r => r.purchaseId === returnData.purchaseId);
    if (alreadyReturned) {
      showToast(
        language === 'bn' ? 'এই বিলটি ইতিমধ্যে ফেরত দেওয়া হয়েছে!' : 'This bill has already been returned!',
        'error'
      );
      return;
    }

    const returnNum = `PRET-2026-${50 + purchaseReturns.length + 1}`;
    const today = new Date().toISOString().split('T')[0];
    const fullTimeStamp = formatDeletionTimestamp();
    const refundWallet = wallets.find(w => w.id === returnData.refundWalletId);

    const newReturn: PurchaseReturn = {
      id: `pret-${Date.now()}`,
      returnNumber: returnNum,
      originalBillNumber: returnData.originalBillNumber,
      purchaseId: returnData.purchaseId,
      date: today,
      supplierId: returnData.supplierId,
      supplierName: returnData.supplierName,
      items: returnData.items,
      totalAmount: returnData.totalAmount,
      refundWalletId: returnData.refundWalletId,
      refundWalletName: refundWallet?.name || 'Cash',
      reason: returnData.reason,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: fullTimeStamp,
    };

    // 1. Decrease product stocks
    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemRet = returnData.items.find(i => i.productId === prod.id);
        if (itemRet) {
          return {
            ...prod,
            stock: Math.max(0, prod.stock - itemRet.returnQuantity),
          };
        }
        return prod;
      })
    );

    // 2. Increase refund wallet balance if cash/bank received back
    if (returnData.totalAmount > 0 && returnData.refundWalletId) {
      setWallets(prev =>
        prev.map(w => {
          if (w.id === returnData.refundWalletId) {
            return {
              ...w,
              balance: w.balance + returnData.totalAmount,
            };
          }
          return w;
        })
      );

      const dbEntry: DayBookEntry = {
        id: `db-${Date.now()}`,
        voucherNo: returnNum,
        date: today,
        type: 'PURCHASE_RETURN',
        flow: 'IN',
        partyId: returnData.supplierId,
        partyName: returnData.supplierName,
        partyType: 'SUPPLIER',
        amount: returnData.totalAmount,
        walletId: returnData.refundWalletId,
        walletName: refundWallet?.name || 'Cash',
        referenceNo: returnData.originalBillNumber,
        remarks: `Purchase return to ${returnData.supplierName}: ${returnData.reason}`,
        createdBy: currentUser?.id || 'usr-1',
        createdAt: fullTimeStamp,
      };
      setDayBookEntries(prev => [dbEntry, ...prev]);
    }

    logActivity({
      actionType: 'USER_ACTION',
      title: `Created Purchase Return #${returnNum}`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) created purchase return #${returnNum} for Bill #${returnData.originalBillNumber} (Supplier: ${returnData.supplierName}, Amount: ৳${returnData.totalAmount.toLocaleString()}) on ${fullTimeStamp}.`,
      severity: 'info',
      targetId: newReturn.id,
      targetName: `Purchase Return #${returnNum}`,
    });

    setPurchaseReturns(prev => [newReturn, ...prev]);
    showToast(
      language === 'bn'
        ? `সাপ্লায়ার ফেরত ভাউচার ${returnNum} (${fullTimeStamp}) সময় সহ তৈরি করা হয়েছে।`
        : `Purchase return ${returnNum} created with timestamp (${fullTimeStamp}).`
    );
  };

  const deletePurchaseReturn = (returnIdOrNum: string) => {
    const targetReturn = purchaseReturns.find(r => r.id === returnIdOrNum || r.returnNumber === returnIdOrNum);
    if (!targetReturn) return;

    // 1. Revert product stocks (subtract what was returned to supplier, meaning add back to our stock)
    setProducts(prevProds =>
      prevProds.map(prod => {
        const itemRet = targetReturn.items.find(i => i.productId === prod.id);
        if (itemRet) {
          return {
            ...prod,
            stock: prod.stock + itemRet.returnQuantity,
          };
        }
        return prod;
      })
    );

    // 2. Revert wallet balance if refund was received
    if (targetReturn.totalAmount > 0 && targetReturn.refundWalletId) {
      setWallets(prevWallets =>
        prevWallets.map(w => {
          if (w.id === targetReturn.refundWalletId) {
            return {
              ...w,
              balance: w.balance - targetReturn.totalAmount,
            };
          }
          return w;
        })
      );
      
      setDayBookEntries(prev => prev.filter(db => db.voucherNo !== targetReturn.returnNumber));
    }

    setPurchaseReturns(prev => prev.filter(r => r.id !== targetReturn.id && r.returnNumber !== targetReturn.returnNumber));
    
    const nowStr = formatDeletionTimestamp();
    logActivity({
      actionType: 'DELETE',
      title: `Deleted Purchase Return #${targetReturn.returnNumber}`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted purchase return #${targetReturn.returnNumber} (Amount: ৳${targetReturn.totalAmount.toLocaleString()}) on ${nowStr}.`,
      severity: 'danger',
      targetId: targetReturn.id,
      targetName: `Purchase Return #${targetReturn.returnNumber}`,
    });

    showToast(
      language === 'bn'
        ? `ফেরত বিল ${targetReturn.returnNumber} (${nowStr}) ডিলিট করা হয়েছে।`
        : `Purchase return ${targetReturn.returnNumber} deleted on ${nowStr}.`,
      'success'
    );
  };

  const recordPaymentOut = (data: {
    partyId: string;
    amount: number;
    walletId: string;
    date: string;
    remarks: string;
  }): boolean => {
    const supplier = parties.find(p => p.id === data.partyId);
    const wallet = wallets.find(w => w.id === data.walletId);
    const voucherNo = `PAY-2026-${700 + dayBookEntries.length + 1}`;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

    // Validate supplier and wallet
    if (!wallet) {
      showToast(
        language === 'bn' ? 'পেমেন্ট ওয়ালেট নির্বাচন করুন!' : 'Please select a payment wallet!',
        'error'
      );
      return false;
    }

    if (wallet.balance < data.amount) {
      showToast(
        language === 'bn'
          ? `নির্বাচিত ওয়ালেটে (${wallet.name}) পর্যাপ্ত টাকা নেই! বর্তমান ব্যালেন্স: ৳${wallet.balance.toLocaleString()} | পরিশোধ করতে চেয়েছেন: ৳${data.amount.toLocaleString()}। অনুগ্রহ করে ওয়ালেট পরিবর্তন করুন বা তহবিল জমা দিন।`
          : `Insufficient balance in ${wallet.name}! Current balance: ৳${wallet.balance.toLocaleString()} | Requested: ৳${data.amount.toLocaleString()}. Please choose another wallet or deposit funds.`,
        'error'
      );
      return false;
    }

    // 1. Decrease supplier payable
    setParties(prev =>
      prev.map(p => {
        if (p.id === data.partyId) {
          return {
            ...p,
            currentBalance: Math.max(0, p.currentBalance - data.amount),
          };
        }
        return p;
      })
    );

    // 2. Deduct from wallet
    setWallets(prev =>
      prev.map(w => {
        if (w.id === data.walletId) {
          return {
            ...w,
            balance: w.balance - data.amount,
          };
        }
        return w;
      })
    );

    // 3. Day book log
    const entry: DayBookEntry = {
      id: `db-${Date.now()}`,
      voucherNo,
      date: data.date,
      type: 'PAYMENT_OUT',
      flow: 'OUT',
      partyId: data.partyId,
      partyName: supplier?.name || 'Supplier',
      partyType: 'SUPPLIER',
      amount: data.amount,
      walletId: data.walletId,
      walletName: wallet?.name || 'Cash',
      referenceNo: voucherNo,
      remarks: data.remarks || `Payment to supplier ${supplier?.name}`,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${data.date} ${nowTime}`,
    };
    setDayBookEntries(prev => [entry, ...prev]);

    const remainingDue = Math.max(0, (supplier?.currentBalance || 0) - data.amount);

    // Open Payment Out Debit Voucher
    openPrintModal({
      type: 'PAYMENT_OUT_VOUCHER',
      title: language === 'bn' ? 'টাকা পরিশোধ ডেবিট ভাউচার' : 'Payment Out Debit Voucher',
      data: {
        voucherNo,
        date: data.date,
        partyName: supplier?.name,
        partyPhone: supplier?.phone,
        companyName: supplier?.companyName,
        amount: data.amount,
        walletName: wallet?.name,
        remarks: data.remarks || 'Supplier Bill Due Settlement',
        remainingDue,
      },
    });

    showToast(
      language === 'bn'
        ? `সাপ্লায়ার ${supplier?.name} কে ৳${data.amount.toLocaleString()} পরিশোধ করা হয়েছে (${wallet.name})।`
        : `Paid ${formatCurrency(data.amount)} to supplier ${supplier?.name} (${wallet.name})`
    );
    return true;
  };

  // -------------------------------------------------------------
  // Installment / EMI Logic
  // -------------------------------------------------------------
  const createInstallmentScheme = (
    schemeData: Omit<InstallmentScheme, 'id' | 'schemeNumber' | 'createdAt'>,
    options?: { skipDayBookAndWallet?: boolean }
  ): InstallmentScheme => {
    const schemeNum = `EMI-2026-${300 + installmentSchemes.length + 1}`;
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

    const creatorName = currentUser?.fullName || currentUser?.username || 'Admin';

    const newScheme: InstallmentScheme = {
      ...schemeData,
      id: `emi-${Date.now()}`,
      schemeNumber: schemeNum,
      createdBy: creatorName,
      contributors: [
        {
          action: 'Created EMI Scheme',
          actionBn: 'কিস্তি স্কিম চালু',
          userName: creatorName,
          userId: currentUser?.id,
          userRole: currentUser?.role,
          timestamp: `${today} ${nowTime}`,
        },
      ],
      createdAt: `${today} ${nowTime}`,
    };

    // If downpayment is received, log in daybook and update wallet (if not skipped because invoice already processed it)
    if (schemeData.downPayment > 0 && !options?.skipDayBookAndWallet) {
      const defaultWallet = wallets[0]; // Cash drawer
      setWallets(prev =>
        prev.map(w => (w.id === defaultWallet.id ? { ...w, balance: w.balance + schemeData.downPayment } : w))
      );

      const dbEntry: DayBookEntry = {
        id: `db-${Date.now()}`,
        voucherNo: schemeNum,
        date: today,
        type: 'EMI_COLLECTION',
        flow: 'IN',
        partyId: schemeData.customerId,
        partyName: schemeData.customerName,
        partyType: 'CUSTOMER',
        amount: schemeData.downPayment,
        walletId: defaultWallet.id,
        walletName: defaultWallet.name,
        referenceNo: schemeNum,
        remarks: `Down Payment for Installment Scheme: ${schemeData.productName}`,
        createdBy: currentUser?.id || 'usr-1',
        createdAt: `${today} ${nowTime}`,
      };
      setDayBookEntries(prev => [dbEntry, ...prev]);
    }

    setInstallmentSchemes(prev => [newScheme, ...prev]);
    showToast(
      language === 'bn'
        ? `কিস্তি স্কিম ${schemeNum} সফলভাবে তৈরি হয়েছে!`
        : `Installment scheme ${schemeNum} created successfully!`
    );
    return newScheme;
  };

  const collectInstallment = (
    schemeId: string,
    installmentNo: number,
    amount: number,
    penalty: number,
    walletId: string,
    paymentMethod: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const targetWallet = wallets.find(w => w.id === walletId) || wallets[0];
    const receiptNo = `EMI-REC-${Date.now().toString().slice(-4)}`;
    const totalCollected = amount + penalty;

    let schemeObj: InstallmentScheme | undefined;

    const collectorName = currentUser?.fullName || currentUser?.username || 'Admin';

    setInstallmentSchemes(prev =>
      prev.map(sc => {
        if (sc.id === schemeId) {
          schemeObj = sc;
          const updatedSchedules = sc.schedules.map(sched => {
            if (sched.installmentNo === installmentNo) {
              return {
                ...sched,
                paidAmount: amount,
                penalty: penalty,
                paidDate: today,
                status: 'PAID' as const,
                paymentMethod,
                walletId,
                receiptVoucherNo: receiptNo,
                collectedBy: collectorName,
              };
            }
            return sched;
          });

          // Check if all are paid
          const allPaid = updatedSchedules.every(s => s.status === 'PAID');
          const existingContributors = sc.contributors || [
            {
              action: 'Created EMI Scheme',
              actionBn: 'কিস্তি স্কিম চালু',
              userName: sc.createdBy || 'Admin',
              timestamp: sc.createdAt,
            },
          ];

          const newContributors = [
            ...existingContributors,
            {
              action: `Collected Installment #${installmentNo}`,
              actionBn: `কিস্তি #${installmentNo} আদায়`,
              userName: collectorName,
              userId: currentUser?.id,
              userRole: currentUser?.role,
              timestamp: `${today} ${nowTime}`,
            },
            ...(allPaid
              ? [
                  {
                    action: 'All Installments Completed',
                    actionBn: 'সকল কিস্তি পরিশোধ সম্পন্ন',
                    userName: collectorName,
                    userId: currentUser?.id,
                    userRole: currentUser?.role,
                    timestamp: `${today} ${nowTime}`,
                  },
                ]
              : []),
          ];

          return {
            ...sc,
            status: allPaid ? ('COMPLETED' as const) : sc.status,
            completedBy: allPaid ? collectorName : sc.completedBy,
            updatedBy: collectorName,
            contributors: newContributors,
            schedules: updatedSchedules,
          };
        }
        return sc;
      })
    );

    // 1. Update wallet balance
    setWallets(prev =>
      prev.map(w => {
        if (w.id === walletId) {
          return {
            ...w,
            balance: w.balance + totalCollected,
          };
        }
        return w;
      })
    );

    // 2. Day book log
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      voucherNo: receiptNo,
      date: today,
      type: 'EMI_COLLECTION',
      flow: 'IN',
      partyId: schemeObj?.customerId,
      partyName: schemeObj?.customerName,
      partyType: 'CUSTOMER',
      amount: totalCollected,
      walletId: walletId,
      walletName: targetWallet.name,
      referenceNo: schemeObj?.schemeNumber,
      remarks: `Installment #${installmentNo} collection for ${schemeObj?.productName} (EMI: ৳${amount}, Penalty: ৳${penalty})`,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${today} ${nowTime}`,
    };
    setDayBookEntries(prev => [dbEntry, ...prev]);

    // Open EMI Receipt
    const totalPaidSoFar = schemeObj ? schemeObj.schedules.filter(s => s.status === 'PAID' || s.installmentNo === installmentNo).reduce((sum, s) => sum + (s.paidAmount || s.amount), 0) : 0;
    const remainingDue = schemeObj ? schemeObj.schedules.filter(s => s.status !== 'PAID' && s.installmentNo !== installmentNo).reduce((sum, s) => sum + s.amount, 0) : 0;
    const nextPending = schemeObj ? schemeObj.schedules.find(s => s.status === 'PENDING' && s.installmentNo !== installmentNo) : null;

    openPrintModal({
      type: 'EMI_RECEIPT',
      title: 'Installment Collection Receipt (কিস্তির টাকা প্রাপ্তি রসিদ)',
      data: {
        receiptNo,
        date: today,
        schemeNumber: schemeObj?.schemeNumber,
        customerName: schemeObj?.customerName,
        customerPhone: schemeObj?.customerPhone,
        customerAddress: (schemeObj as any)?.customerAddress || (schemeObj as any)?.address || '',
        productName: schemeObj?.productName,
        installmentNo,
        totalInstallments: schemeObj?.totalInstallments,
        amount,
        penalty,
        totalCollected,
        totalSchemeAmount: schemeObj?.totalPayable,
        totalPrice: schemeObj?.totalPrice,
        downPayment: schemeObj?.downPayment,
        totalPaidSoFar,
        remainingDue,
        nextDueDate: nextPending?.dueDate || null,
        walletName: targetWallet.name,
        paymentMethod,
      },
    });

    showToast(
      language === 'bn'
        ? `কিস্তি #${installmentNo} এর ৳${totalCollected} সফলভাবে জমা হয়েছে।`
        : `Installment #${installmentNo} (${formatCurrency(totalCollected)}) recorded.`
    );
  };

  const deleteInstallmentScheme = (id: string) => {
    setInstallmentSchemes(prev => prev.filter(s => s.id !== id));
    showToast(
      language === 'bn' ? 'কিস্তি স্কিমটি মুছে ফেলা হয়েছে' : 'Installment scheme deleted',
      'info'
    );
  };

  // -------------------------------------------------------------
  // Cash Adjustments & Wallets
  // -------------------------------------------------------------
  const addCashAdjustment = (adjData: Omit<CashAdjustment, 'id' | 'voucherNo' | 'createdAt'>) => {
    const voucherNo = `CADJ-2026-${100 + cashAdjustments.length + 1}`;
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const targetWallet = wallets.find(w => w.id === adjData.walletId);

    if (adjData.type === 'CASH_WITHDRAW') {
      if (!targetWallet) {
        showToast(
          language === 'bn' ? 'সঠিক ওয়ালেট পাওয়া যায়নি!' : 'Wallet not found!',
          'error'
        );
        return;
      }
      if (targetWallet.balance < adjData.amount) {
        showToast(
          language === 'bn'
            ? `ওয়ালেটে পর্যাপ্ত টাকা নেই! (${targetWallet.name} ব্যালেন্স: ৳${targetWallet.balance}, উত্তোলন প্রয়োজন: ৳${adjData.amount})`
            : `Insufficient wallet balance in ${targetWallet.name}! Balance: ৳${targetWallet.balance}, Withdrawal required: ৳${adjData.amount}`,
          'error'
        );
        return;
      }
    }

    const newAdj: CashAdjustment = {
      ...adjData,
      id: `cadj-${Date.now()}`,
      voucherNo,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${today} ${nowTime}`,
    };

    // Update wallet balance
    setWallets(prev =>
      prev.map(w => {
        if (w.id === adjData.walletId) {
          return {
            ...w,
            balance: adjData.type === 'CASH_ADD' ? w.balance + adjData.amount : w.balance - adjData.amount,
          };
        }
        return w;
      })
    );

    // Day Book entry
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      voucherNo,
      date: adjData.date,
      type: adjData.type === 'CASH_ADD' ? 'CASH_ADD' : 'CASH_WITHDRAW',
      flow: adjData.type === 'CASH_ADD' ? 'IN' : 'OUT',
      partyName: adjData.authorizedBy || 'Internal Owner',
      partyType: 'INTERNAL',
      amount: adjData.amount,
      walletId: adjData.walletId,
      walletName: targetWallet?.name || 'Cash',
      referenceNo: voucherNo,
      remarks: `Cash Adjustment [${adjData.type === 'CASH_ADD' ? 'Add' : 'Withdraw'}]: ${adjData.reason}`,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${today} ${nowTime}`,
    };
    setDayBookEntries(prev => [dbEntry, ...prev]);

    setCashAdjustments(prev => [newAdj, ...prev]);
    showToast(
      language === 'bn'
        ? `ক্যাশ সমন্বয় ${voucherNo} সম্পন্ন হয়েছে।`
        : `Cash adjustment ${voucherNo} recorded.`
    );
  };

  const adjustCash = (data: { walletId: string; type: 'ADD' | 'WITHDRAW'; amount: number; reason: string }) => {
    addCashAdjustment({
      walletId: data.walletId,
      walletName: wallets.find(w => w.id === data.walletId)?.name || 'Cash',
      type: data.type === 'ADD' ? 'CASH_ADD' : 'CASH_WITHDRAW',
      amount: data.amount,
      reason: data.reason,
      date: new Date().toISOString().split('T')[0],
      authorizedBy: currentUser.fullName,
    });
  };

  const deleteCashAdjustment = (id: string) => {
    const adj = cashAdjustments.find(a => a.id === id);
    if (!adj) return;

    const targetWallet = wallets.find(w => w.id === adj.walletId);
    if (adj.type === 'CASH_ADD' && targetWallet && targetWallet.balance < adj.amount) {
      showToast(
        language === 'bn'
          ? `এই এন্ট্রি মুছে ফেলা যাবে না কারণ ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই! (ব্যালেন্স: ৳${targetWallet.balance}, বাদ দিতে হবে: ৳${adj.amount})`
          : `Cannot delete entry as wallet balance is insufficient! (Balance: ৳${targetWallet.balance}, Needed: ৳${adj.amount})`,
        'error'
      );
      return;
    }

    // Revert wallet balance
    setWallets(prev =>
      prev.map(w => {
        if (w.id === adj.walletId) {
          return {
            ...w,
            balance: adj.type === 'CASH_ADD' ? w.balance - adj.amount : w.balance + adj.amount,
          };
        }
        return w;
      })
    );

    // Remove from cashAdjustments
    setCashAdjustments(prev => prev.filter(a => a.id !== id));

    // Remove from DayBook
    setDayBookEntries(prev => prev.filter(e => e.voucherNo !== adj.voucherNo));

    const nowStr = formatDeletionTimestamp();
    logActivity({
      actionType: 'DELETE',
      title: `Deleted Cash Adjustment #${adj.voucherNo}`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted cash adjustment #${adj.voucherNo} (${adj.type}, ৳${adj.amount.toLocaleString()}) on ${nowStr}.`,
      severity: 'danger',
      targetId: adj.id,
      targetName: `Cash Adjustment #${adj.voucherNo}`,
    });

    showToast(
      language === 'bn'
        ? `ক্যাশ অ্যাডজাস্টমেন্ট (${adj.voucherNo}) ${nowStr} তারিখে মুছে ফেলা হয়েছে এবং অ্যাক্টিভিটি লগে রেকর্ড করা হয়েছে।`
        : `Cash adjustment (${adj.voucherNo}) deleted on ${nowStr} and logged to audit.`,
      'info'
    );
  };

  const addWallet = (wData: Omit<Wallet, 'id'>) => {
    const newWallet: Wallet = {
      ...wData,
      id: `w-${Date.now()}`,
      createdBy: currentUser?.id || 'usr-1',
    };
    setWallets(prev => [...prev, newWallet]);

    if (wData.balance > 0) {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
      const voucherNo = `OPB-${Date.now().toString().slice(-6)}`;
      const dbEntry: DayBookEntry = {
        id: `db-${Date.now()}`,
        voucherNo,
        date: today,
        type: 'CASH_ADD',
        flow: 'IN',
        partyName: 'প্রারম্ভিক তহবিল (Opening Balance)',
        partyType: 'INTERNAL',
        amount: wData.balance,
        walletId: newWallet.id,
        walletName: newWallet.name,
        referenceNo: voucherNo,
        remarks: `নতুন অ্যাকাউন্ট প্রারম্ভিক জমা: ${newWallet.name}`,
        createdBy: currentUser?.id || 'usr-1',
        createdAt: `${today} ${nowTime}`,
      };
      setDayBookEntries(prev => [dbEntry, ...prev]);
    }

    showToast(
      language === 'bn'
        ? `নতুন অ্যাকাউন্ট "${newWallet.name}" সফলভাবে যুক্ত হয়েছে!`
        : `Account "${newWallet.name}" added successfully!`
    );
  };

  const updateWallet = (id: string, updates: Partial<Wallet>) => {
    setWallets(prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)));
    showToast(language === 'bn' ? 'ওয়ালেট তথ্য আপডেট হয়েছে।' : 'Wallet updated.');
  };

  const deleteWallet = (id: string) => {
    if (wallets.length <= 1) {
      showToast(
        language === 'bn' ? 'কমপক্ষে একটি ওয়ালেট থাকা বাধ্যতামূলক।' : 'At least one wallet/account must remain.',
        'error'
      );
      return;
    }

    const wallet = wallets.find(w => w.id === id);
    if (!wallet) return;

    const hasTransactions = dayBookEntries?.some(t => t.walletId === id);
    const hasSales = saleInvoices?.some(inv => inv.walletId === id);
    const hasPurchases = purchaseInvoices?.some(inv => inv.walletId === id);
    const hasExpenses = expenseVouchers?.some(v => v.walletId === id);

    if (wallet.balance !== 0 || hasTransactions || hasSales || hasPurchases || hasExpenses) {
      showToast(
        language === 'bn'
          ? `এই একাউন্ট/ওয়ালেটের (${wallet.name}) ব্যালেন্স (৳${wallet.balance}) রয়েছে অথবা লেনদেনের রেকর্ড রয়েছে। ডিলিট করা যাবে না!`
          : `Account/Wallet (${wallet.name}) has active balance or transaction history and cannot be deleted!`,
        'error'
      );
      return;
    }

    setWallets(prev => prev.filter(w => w.id !== id));
    showToast(
      language === 'bn' ? 'ওয়ালেট সফলভাবে মুছে ফেলা হয়েছে।' : 'Wallet deleted successfully.',
      'info'
    );
  };

  const transferWalletFunds = (fromWalletId: string, toWalletId: string, amount: number, notes?: string) => {
    const fromW = wallets.find(w => w.id === fromWalletId);
    const toW = wallets.find(w => w.id === toWalletId);

    if (!fromW || !toW || amount <= 0) return;
    if (fromW.balance < amount) {
      showToast(language === 'bn' ? 'পর্যাপ্ত ব্যালেন্স নেই!' : 'Insufficient wallet balance!', 'error');
      return;
    }

    setWallets(prev =>
      prev.map(w => {
        if (w.id === fromWalletId) return { ...w, balance: w.balance - amount };
        if (w.id === toWalletId) return { ...w, balance: w.balance + amount };
        return w;
      })
    );

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const voucherNo = `TRF-2026-${Date.now().toString().slice(-4)}`;

    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      voucherNo,
      date: today,
      type: 'WALLET_TRANSFER',
      flow: 'IN',
      partyName: `${fromW.name} ➔ ${toW.name}`,
      partyType: 'INTERNAL',
      amount,
      walletId: toWalletId,
      walletName: toW.name,
      referenceNo: voucherNo,
      remarks: `Funds transfer from ${fromW.name} to ${toW.name}. ${notes || ''}`,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${today} ${nowTime}`,
    };
    setDayBookEntries(prev => [dbEntry, ...prev]);

    showToast(
      language === 'bn'
        ? `${formatCurrency(amount)} ফান্ড ট্রান্সফার সফল হয়েছে।`
        : `Transferred ${formatCurrency(amount)} from ${fromW.name} to ${toW.name}`
    );
  };

  // -------------------------------------------------------------
  // Expenses Logic
  // -------------------------------------------------------------
  const addExpenseCategory = (catData: Omit<ExpenseCategory, 'id'>) => {
    const newCat: ExpenseCategory = {
      ...catData,
      id: `exp-cat-${Date.now()}`,
      createdBy: currentUser?.id || 'usr-1',
    };
    setExpenseCategories(prev => [...prev, newCat]);
    showToast(language === 'bn' ? 'খরচের খাত যুক্ত হয়েছে।' : 'Expense category added.');
  };

  const updateExpenseCategory = (id: string, updates: Partial<ExpenseCategory>) => {
    setExpenseCategories(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
    showToast(language === 'bn' ? 'খাত আপডেট হয়েছে।' : 'Category updated.');
  };

  const deleteExpenseCategory = (id: string) => {
    // Optional: Check if category is used in vouchers before deleting
    const isUsed = expenseVouchers.some(v => v.categoryId === id);
    if (isUsed) {
      showToast(language === 'bn' ? 'এই খাতটি ভাউচারে ব্যবহৃত হয়েছে, মুছা যাবে না।' : 'Category is in use, cannot delete.', 'error');
      return;
    }
    setExpenseCategories(prev => prev.filter(c => c.id !== id));
    showToast(language === 'bn' ? 'খাত মুছে ফেলা হয়েছে।' : 'Category deleted.', 'success');
  };

  const addExpenseVoucher = (vData: Omit<ExpenseVoucher, 'id' | 'voucherNo' | 'createdAt'>): ExpenseVoucher | null => {
    const voucherNo = `EXP-2026-${100 + expenseVouchers.length + 1}`;
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const targetWallet = wallets.find(w => w.id === vData.walletId);

    if (!targetWallet) {
      showToast(
        language === 'bn' ? 'খরচের জন্য ওয়ালেট পাওয়া যায়নি!' : 'Wallet not found for expense!',
        'error'
      );
      return null;
    }

    if (targetWallet.balance < vData.amount) {
      showToast(
        language === 'bn'
          ? `নির্বাচিত ওয়ালেটে (${targetWallet.name}) পর্যাপ্ত টাকা নেই! বর্তমান ব্যালেন্স: ৳${targetWallet.balance.toLocaleString()} | খরচের পরিমাণ: ৳${vData.amount.toLocaleString()}।`
          : `Insufficient balance in ${targetWallet.name}! Available: ৳${targetWallet.balance.toLocaleString()} | Expense amount: ৳${vData.amount.toLocaleString()}`,
        'error'
      );
      return null;
    }

    const newVoucher: ExpenseVoucher = {
      ...vData,
      id: `exp-${Date.now()}`,
      voucherNo,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${today} ${nowTime}`,
    };

    // Deduct from wallet
    setWallets(prev =>
      prev.map(w => {
        if (w.id === vData.walletId) {
          return {
            ...w,
            balance: w.balance - vData.amount,
          };
        }
        return w;
      })
    );

    // Day Book
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      voucherNo,
      date: vData.date,
      type: 'EXPENSE',
      flow: 'OUT',
      partyName: vData.payee || vData.categoryName,
      partyType: 'EXPENSE',
      amount: vData.amount,
      walletId: vData.walletId,
      walletName: targetWallet?.name || 'Cash',
      referenceNo: voucherNo,
      remarks: `[${vData.categoryName}] ${vData.note} (Payee: ${vData.payee})`,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${today} ${nowTime}`,
    };
    setDayBookEntries(prev => [dbEntry, ...prev]);

    setExpenseVouchers(prev => [newVoucher, ...prev]);
    showToast(
      language === 'bn'
        ? `খরচের ভাউচার ${voucherNo} সংরক্ষিত হয়েছে।`
        : `Expense voucher ${voucherNo} recorded.`
    );
    return newVoucher;
  };

  const deleteExpenseVoucher = (id: string, reason?: string) => {
    const target = expenseVouchers.find(e => e.id === id);
    if (!target) return;
    setWallets(prev =>
      prev.map(w => (w.id === target.walletId ? { ...w, balance: w.balance + target.amount } : w))
    );
    setExpenseVouchers(prev => prev.filter(e => e.id !== id));
    
    const nowStr = formatDeletionTimestamp();
    logActivity({
      actionType: 'DELETE',
      title: `Deleted Expense Voucher #${target.voucherNo}`,
      description: `User '${currentUser?.fullName || 'User'}' (${currentUser?.role || 'ADMIN'}) deleted expense voucher #${target.voucherNo} (${target.categoryName || target.category || 'Expense'}, ৳${target.amount.toLocaleString()}) on ${nowStr}.${reason ? ` Reason: ${reason}` : ''}`,
      severity: 'danger',
      targetId: target.id,
      targetName: `Expense Voucher #${target.voucherNo}`,
    });

    showToast(
      language === 'bn'
        ? `খরচের ভাউচার #${target.voucherNo} (${nowStr}) মুছে ফেলা হয়েছে।`
        : `Expense voucher #${target.voucherNo} deleted on ${nowStr}.`,
      'info'
    );
  };

  // -------------------------------------------------------------
  // HR & Payroll
  // -------------------------------------------------------------
  const addEmployee = (empData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`,
      createdBy: currentUser?.id || 'usr-1',
    };
    setEmployees(prev => [...prev, newEmp]);
    showToast(language === 'bn' ? 'নতুন কর্মচারী যুক্ত হয়েছে।' : 'Employee added successfully.');
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)));
    showToast(language === 'bn' ? 'কর্মচারীর তথ্য আপডেট হয়েছে।' : 'Employee updated.');
  };

  const deleteEmployee = (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    const hasAdvances = advanceSalaries?.some(a => a.employeeId === id);
    const hasExpenses = expenseVouchers?.some(v => v.employeeId === id || v.payee === emp.name);

    if (hasAdvances || hasExpenses) {
      showToast(
        language === 'bn'
          ? `এই কর্মচারীর (${emp.name}) অগ্রিম বেতন বা খরচ ভাউচার এন্ট্রি রয়েছে! ডিলিট করা যাবে না।`
          : `Employee (${emp.name}) has advance salary or voucher records. Cannot delete!`,
        'error'
      );
      return;
    }

    setEmployees(prev => prev.filter(e => e.id !== id));
    showToast(
      language === 'bn'
        ? `কর্মচারী ${emp.name} তালিকা থেকে মুছে ফেলা হয়েছে।`
        : `Employee ${emp.name} deleted successfully.`,
      'info'
    );
  };

  const resignEmployee = (
    id: string,
    data: {
      resignedDate: string;
      resignationReason: string;
      settlementNotes?: string;
      finalSettlementAmount?: number;
      finalSettlementPaid?: boolean;
      refundWalletId?: string;
    }
  ) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    const settlementAmt = data.finalSettlementAmount || 0;
    const targetWallet = data.refundWalletId ? wallets.find(w => w.id === data.refundWalletId) : undefined;

    // If final settlement is to be paid from wallet
    if (data.finalSettlementPaid && settlementAmt > 0 && targetWallet) {
      if (targetWallet.balance < settlementAmt) {
        showToast(
          language === 'bn'
            ? `নির্বাচিত ওয়ালেটে (${targetWallet.name}) ফাইনাল সেটেলমেন্টের পর্যাপ্ত ব্যালেন্স নেই! প্রয়োজন: ৳${settlementAmt.toLocaleString()} | আছে: ৳${targetWallet.balance.toLocaleString()}`
            : `Insufficient balance in ${targetWallet.name} for settlement! Required: ৳${settlementAmt.toLocaleString()} | Available: ৳${targetWallet.balance.toLocaleString()}`,
          'error'
        );
        return;
      }

      // Deduct from wallet
      setWallets(prev =>
        prev.map(w => (w.id === targetWallet.id ? { ...w, balance: w.balance - settlementAmt } : w))
      );

      const today = data.resignedDate || new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
      const voucherNo = `SETTLE-2026-${Math.floor(100 + Math.random() * 900)}`;

      // Record in DayBook
      const dbEntry: DayBookEntry = {
        id: `db-${Date.now()}`,
        voucherNo,
        date: today,
        type: 'SALARY',
        flow: 'OUT',
        partyId: emp.id,
        partyName: emp.name,
        partyType: 'STAFF',
        amount: settlementAmt,
        walletId: targetWallet.id,
        walletName: targetWallet.name,
        referenceNo: emp.employeeCode,
        remarks: `Final clearance & resignation settlement for ${emp.name} (${emp.designation}). Reason: ${data.resignationReason}`,
        createdBy: currentUser?.id || 'usr-1',
        createdAt: `${today} ${nowTime}`,
      };
      setDayBookEntries(prev => [dbEntry, ...prev]);
    }

    setEmployees(prev =>
      prev.map(e =>
        e.id === id
          ? {
              ...e,
              status: 'RESIGNED' as const,
              resignedDate: data.resignedDate || new Date().toISOString().split('T')[0],
              resignationReason: data.resignationReason,
              settlementNotes: data.settlementNotes || '',
              finalSettlementAmount: settlementAmt,
              finalSettlementPaid: !!data.finalSettlementPaid,
              settlementWalletId: targetWallet?.id,
              settlementWalletName: targetWallet?.name,
            }
          : e
      )
    );

    showToast(
      language === 'bn'
        ? `${emp.name}-কে রিজাইনড কর্মচারী তালিকায় স্থানান্তর করা হয়েছে।`
        : `${emp.name} marked as Resigned and moved to resigned staff list.`,
      'success'
    );
  };

  const rejoinEmployee = (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    setEmployees(prev =>
      prev.map(e =>
        e.id === id
          ? {
              ...e,
              status: 'ACTIVE' as const,
              resignedDate: undefined,
              resignationReason: undefined,
            }
          : e
      )
    );

    showToast(
      language === 'bn'
        ? `${emp.name}-কে পুনরায় সক্রিয় কর্মচারী তালিকায় যুক্ত করা হয়েছে।`
        : `${emp.name} has been reactivated into active staff list.`,
      'success'
    );
  };

  const addAdvanceSalary = (advData: Omit<AdvanceSalary, 'id' | 'voucherNo' | 'createdAt' | 'isDeducted'>) => {
    const voucherNo = `ADV-2026-${500 + advanceSalaries.length + 1}`;
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const targetWallet = wallets.find(w => w.id === advData.walletId);

    if (!targetWallet) {
      showToast(
        language === 'bn' ? 'অগ্রিম বেতনের জন্য ওয়ালেট পাওয়া যায়নি!' : 'Wallet not found for advance salary!',
        'error'
      );
      return;
    }

    if (targetWallet.balance < advData.amount) {
      showToast(
        language === 'bn'
          ? `নির্বাচিত ওয়ালেটে (${targetWallet.name}) পর্যাপ্ত টাকা নেই! বর্তমান ব্যালেন্স: ৳${targetWallet.balance.toLocaleString()} | অগ্রিম: ৳${advData.amount.toLocaleString()}।`
          : `Insufficient balance in ${targetWallet.name}! Available: ৳${targetWallet.balance.toLocaleString()} | Advance: ৳${advData.amount.toLocaleString()}`,
        'error'
      );
      return;
    }

    const newAdv: AdvanceSalary = {
      ...advData,
      id: `adv-${Date.now()}`,
      voucherNo,
      isDeducted: false,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${today} ${nowTime}`,
    };

    // Deduct from wallet
    setWallets(prev =>
      prev.map(w => {
        if (w.id === advData.walletId) {
          return {
            ...w,
            balance: w.balance - advData.amount,
          };
        }
        return w;
      })
    );

    // Day Book
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}`,
      voucherNo,
      date: advData.date,
      type: 'ADVANCE_SALARY',
      flow: 'OUT',
      partyId: advData.employeeId,
      partyName: advData.employeeName,
      partyType: 'STAFF',
      amount: advData.amount,
      walletId: advData.walletId,
      walletName: targetWallet?.name || 'Cash',
      referenceNo: voucherNo,
      remarks: `Advance salary to ${advData.employeeName}: ${advData.reason}`,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${today} ${nowTime}`,
    };
    setDayBookEntries(prev => [dbEntry, ...prev]);

    setAdvanceSalaries(prev => [newAdv, ...prev]);
    showToast(
      language === 'bn'
        ? `অগ্রিম বেতন ভাউচার ${voucherNo} সম্পন্ন হয়েছে।`
        : `Advance salary voucher ${voucherNo} recorded.`
    );
  };

  const giveAdvanceSalary = (adv: { employeeId: string; amount: number; walletId: string; reason: string; date: string }) => {
    const emp = employees.find(e => e.id === adv.employeeId);
    const targetWallet = wallets.find(w => w.id === adv.walletId);
    addAdvanceSalary({
      employeeId: adv.employeeId,
      employeeName: emp?.name || 'Employee',
      amount: adv.amount,
      walletId: adv.walletId,
      walletName: targetWallet?.name || 'Cash',
      reason: adv.reason,
      date: adv.date,
    });
  };

  const payEmployeeSalary = (payment: {
    employeeId: string;
    payrollMonth: string;
    amount: number;
    walletId: string;
    bonus?: number;
    fineDeduction?: number;
    notes?: string;
    paymentDate?: string;
  }): boolean => {
    const emp = employees.find(e => e.id === payment.employeeId);
    if (!emp) {
      showToast(language === 'bn' ? 'কর্মচারী খুঁজে পাওয়া যায়নি!' : 'Employee not found!', 'error');
      return false;
    }

    const today = payment.paymentDate || new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const targetWallet = wallets.find(w => w.id === payment.walletId);

    if (!targetWallet) {
      showToast(language === 'bn' ? 'পরিশোধের জন্য ওয়ালেট নির্বাচন করুন!' : 'Select payment wallet!', 'error');
      return false;
    }

    const allowances = emp.houseRentAllowance + emp.medicalAllowance + emp.conveyanceAllowance;
    const bonus = payment.bonus || 0;
    const fineDeduction = payment.fineDeduction || 0;
    const grossPay = emp.baseSalary + allowances + bonus - fineDeduction;

    // Previous payment vouchers for this month
    const prevVouchers = payrollHistory.filter(
      p => p.employeeId === emp.id && p.payrollMonth === payment.payrollMonth
    );
    const totalPaidSoFar = prevVouchers.reduce((s, p) => s + (p.paidAmount ?? p.netPay ?? 0), 0);

    // Pending advance deduction if first payment, or check if already deducted
    let advanceDeductForCalc = 0;
    if (prevVouchers.length > 0) {
      advanceDeductForCalc = prevVouchers[0].advanceDeduction || 0;
    } else {
      const pendingAdvance = advanceSalaries
        .filter(a => a.employeeId === emp.id && !a.isDeducted)
        .reduce((s, a) => s + a.amount, 0);
      advanceDeductForCalc = pendingAdvance;
    }

    const totalPayableForMonth = Math.max(0, grossPay - advanceDeductForCalc);
    const currentRemainingDue = Math.max(0, totalPayableForMonth - totalPaidSoFar);

    // RULE 1: If salary for this month is already paid in full, do NOT allow 2nd payment
    if (currentRemainingDue <= 0 || totalPaidSoFar >= totalPayableForMonth) {
      showToast(
        language === 'bn'
          ? `🚫 ${emp.name}-এর ${payment.payrollMonth} মাসের বেতন ইতোমধ্যে সম্পূর্ণ পরিশোধিত (৳${totalPaidSoFar.toLocaleString()})! এই মাসের বেতন আর দ্বিতীয়বার দেওয়া যাবে না।`
          : `Salary for ${payment.payrollMonth} has already been paid in full to ${emp.name}. Cannot pay again.`,
        'warning'
      );
      return false;
    }

    // Amount validation
    if (payment.amount <= 0) {
      showToast(language === 'bn' ? 'সঠিক টাকার পরিমাণ দিন!' : 'Enter valid amount!', 'warning');
      return false;
    }

    // RULE 2: If there is remaining due, only the due amount (or less for partial) can be paid, not exceeding due
    if (payment.amount > currentRemainingDue) {
      showToast(
        language === 'bn'
          ? `⚠️ প্রদেয় টাকা (৳${payment.amount.toLocaleString()}) অবশিষ্ট বকেয়ার (৳${currentRemainingDue.toLocaleString()}) চেয়ে বেশি হতে পারে না!`
          : `Amount (৳${payment.amount.toLocaleString()}) cannot exceed remaining due (৳${currentRemainingDue.toLocaleString()})!`,
        'error'
      );
      return false;
    }

    // Wallet balance validation
    if (targetWallet.balance < payment.amount) {
      showToast(
        language === 'bn'
          ? `নির্বাচিত ওয়ালেটে (${targetWallet.name}) পর্যাপ্ত টাকা নেই! বর্তমান ব্যালেন্স: ৳${targetWallet.balance.toLocaleString()} | প্রয়োজন: ৳${payment.amount.toLocaleString()}`
          : `Insufficient balance in ${targetWallet.name}! Available: ৳${targetWallet.balance.toLocaleString()} | Required: ৳${payment.amount.toLocaleString()}`,
        'error'
      );
      return false;
    }

    // Deduct from wallet
    setWallets(prev =>
      prev.map(w => (w.id === payment.walletId ? { ...w, balance: w.balance - payment.amount } : w))
    );

    // If first voucher and has advance deduction, mark advance as deducted
    if (prevVouchers.length === 0 && advanceDeductForCalc > 0) {
      setAdvanceSalaries(prev =>
        prev.map(adv =>
          adv.employeeId === emp.id && !adv.isDeducted
            ? { ...adv, isDeducted: true, deductedInPayrollMonth: payment.payrollMonth }
            : adv
        )
      );
    }

    const newTotalPaidSoFar = totalPaidSoFar + payment.amount;
    const newDueAmount = Math.max(0, totalPayableForMonth - newTotalPaidSoFar);
    const installmentNo = prevVouchers.length + 1;
    const paymentType: 'FULL' | 'PARTIAL' | 'DUE_PAYMENT' =
      newDueAmount === 0 ? (installmentNo > 1 ? 'DUE_PAYMENT' : 'FULL') : 'PARTIAL';
    const status: 'PAID' | 'PARTIAL' = newDueAmount === 0 ? 'PAID' : 'PARTIAL';

    const voucherNo = `PAY-${payment.payrollMonth.replace('-', '')}-${(emp.employeeCode || emp.id.slice(-4)).replace(/[^a-zA-Z0-9]/g, '')}-${installmentNo.toString().padStart(2, '0')}`;

    const newEntry: PayrollEntry = {
      id: `pay-${payment.payrollMonth}-${Date.now()}`,
      voucherNo,
      payrollMonth: payment.payrollMonth,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeCode: emp.employeeCode,
      designation: emp.designation,
      baseSalary: emp.baseSalary,
      allowances,
      bonus,
      advanceDeduction: prevVouchers.length === 0 ? advanceDeductForCalc : 0,
      fineDeduction,
      grossPay,
      payableAmount: totalPayableForMonth,
      paidAmount: payment.amount,
      dueAmount: newDueAmount,
      totalPaidSoFar: newTotalPaidSoFar,
      paymentType,
      installmentNo,
      notes:
        payment.notes ||
        (installmentNo > 1
          ? `${payment.payrollMonth} মাসের ২য় কিস্তি বকেয়া বেতন পরিশোধ`
          : `${payment.payrollMonth} মাসের বেতন`),
      netPay: payment.amount,
      paymentDate: today,
      walletId: payment.walletId,
      walletName: targetWallet.name,
      status,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${today} ${nowTime}`,
    };

    // Record in DayBook
    const dbEntry: DayBookEntry = {
      id: `db-${Date.now()}-${emp.id}`,
      voucherNo,
      date: today,
      type: 'SALARY',
      flow: 'OUT',
      partyId: emp.id,
      partyName: emp.name,
      partyType: 'STAFF',
      amount: payment.amount,
      walletId: payment.walletId,
      walletName: targetWallet.name,
      referenceNo: voucherNo,
      remarks: `Salary payment (#${installmentNo}) for ${payment.payrollMonth} to ${emp.name} (${emp.designation}). Paid: ৳${payment.amount.toLocaleString()}${newDueAmount > 0 ? `, Remaining Due: ৳${newDueAmount.toLocaleString()}` : ' (Paid in Full)'}`,
      createdBy: currentUser?.id || 'usr-1',
      createdAt: `${today} ${nowTime}`,
    };

    setPayrollHistory(prev => [newEntry, ...prev]);
    setDayBookEntries(prev => [dbEntry, ...prev]);

    showToast(
      language === 'bn'
        ? `✅ ${emp.name}-এর ${payment.payrollMonth} মাসের বেতন ভাউচার (${voucherNo}) সম্পন্ন! পরিশোধিত: ৳${payment.amount.toLocaleString()}${newDueAmount > 0 ? ` | অবশিষ্ট বকেয়া: ৳${newDueAmount.toLocaleString()}` : ' (সম্পূর্ণ পরিশোধিত)'}`
        : `Payroll voucher ${voucherNo} processed for ${emp.name}. Paid: ৳${payment.amount.toLocaleString()}${newDueAmount > 0 ? ` | Due: ৳${newDueAmount.toLocaleString()}` : ' (Fully Paid)'}`,
      'success'
    );

    return true;
  };

  const processMonthlyPayroll = (monthStr: string, walletId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const targetWallet = wallets.find(w => w.id === walletId) || wallets[0];

    if (!targetWallet) {
      showToast(language === 'bn' ? 'ওয়ালেট পাওয়া যায়নি!' : 'Wallet not found!', 'error');
      return;
    }

    const activeEmps = employees.filter(e => e.status === 'ACTIVE');
    if (activeEmps.length === 0) {
      showToast(language === 'bn' ? 'কোনো সক্রিয় কর্মচারী নেই!' : 'No active employees!', 'warning');
      return;
    }

    // Calculate due amount for each employee for this month
    const pendingToPay: {
      emp: Employee;
      grossPay: number;
      allowances: number;
      advanceDeduct: number;
      totalPayable: number;
      alreadyPaid: number;
      dueAmountToDisburse: number;
      installmentNo: number;
    }[] = [];

    activeEmps.forEach(emp => {
      const allowances = emp.houseRentAllowance + emp.medicalAllowance + emp.conveyanceAllowance;
      const grossPay = emp.baseSalary + allowances;

      const prevVouchers = payrollHistory.filter(
        p => p.employeeId === emp.id && p.payrollMonth === monthStr
      );
      const alreadyPaid = prevVouchers.reduce((s, p) => s + (p.paidAmount ?? p.netPay ?? 0), 0);

      let advanceDeduct = 0;
      if (prevVouchers.length > 0) {
        advanceDeduct = prevVouchers[0].advanceDeduction || 0;
      } else {
        const pendingAdvance = advanceSalaries
          .filter(a => a.employeeId === emp.id && !a.isDeducted)
          .reduce((s, a) => s + a.amount, 0);
        advanceDeduct = pendingAdvance;
      }

      const totalPayable = Math.max(0, grossPay - advanceDeduct);
      const remainingDue = Math.max(0, totalPayable - alreadyPaid);

      // Only include employees who still have remaining due for this month
      if (remainingDue > 0) {
        pendingToPay.push({
          emp,
          grossPay,
          allowances,
          advanceDeduct: prevVouchers.length === 0 ? advanceDeduct : 0,
          totalPayable,
          alreadyPaid,
          dueAmountToDisburse: remainingDue,
          installmentNo: prevVouchers.length + 1,
        });
      }
    });

    // RULE 1: If all employees for this month are already paid, refuse second bulk payment!
    if (pendingToPay.length === 0) {
      showToast(
        language === 'bn'
          ? `🔒 ${monthStr} মাসের সকল সক্রিয় কর্মচারীর বেতন ইতোমধ্যে সম্পূর্ণ পরিশোধ করা হয়েছে। দ্বিতীয়বার আর বেতন দেওয়ার প্রয়োজন নেই।`
          : `All active employees have already been fully paid for ${monthStr}. No pending salaries.`,
        'warning'
      );
      return;
    }

    const totalDisbursement = pendingToPay.reduce((s, p) => s + p.dueAmountToDisburse, 0);

    if (targetWallet.balance < totalDisbursement) {
      showToast(
        language === 'bn'
          ? `নির্বাচিত ওয়ালেটে (${targetWallet.name}) বকেয়া বেতন পরিশোধের পর্যাপ্ত ব্যালেন্স নেই! প্রয়োজন: ৳${totalDisbursement.toLocaleString()} | আছে: ৳${targetWallet.balance.toLocaleString()}`
          : `Insufficient balance in ${targetWallet.name}! Required: ৳${totalDisbursement.toLocaleString()} | Available: ৳${targetWallet.balance.toLocaleString()}`,
        'error'
      );
      return;
    }

    // 1. Deduct from wallet
    setWallets(prev =>
      prev.map(w => (w.id === walletId ? { ...w, balance: w.balance - totalDisbursement } : w))
    );

    // 2. Mark pending advance salaries as deducted
    setAdvanceSalaries(prev =>
      prev.map(adv => {
        const found = pendingToPay.find(p => p.emp.id === adv.employeeId && p.advanceDeduct > 0);
        if (found && !adv.isDeducted) {
          return {
            ...adv,
            isDeducted: true,
            deductedInPayrollMonth: monthStr,
          };
        }
        return adv;
      })
    );

    // 3. Create Payroll & DayBook entries
    const createdPayroll: PayrollEntry[] = [];
    const createdDayBook: DayBookEntry[] = [];

    pendingToPay.forEach((item, idx) => {
      const voucherNo = `PAY-${monthStr.replace('-', '')}-${(item.emp.employeeCode || item.emp.id.slice(-4)).replace(/[^a-zA-Z0-9]/g, '')}-${item.installmentNo.toString().padStart(2, '0')}`;
      const newTotalPaid = item.alreadyPaid + item.dueAmountToDisburse;

      const pEntry: PayrollEntry = {
        id: `pay-${monthStr}-${Date.now()}-${idx}`,
        voucherNo,
        payrollMonth: monthStr,
        employeeId: item.emp.id,
        employeeName: item.emp.name,
        employeeCode: item.emp.employeeCode,
        designation: item.emp.designation,
        baseSalary: item.emp.baseSalary,
        allowances: item.allowances,
        bonus: 0,
        advanceDeduction: item.advanceDeduct,
        fineDeduction: 0,
        grossPay: item.grossPay,
        payableAmount: item.totalPayable,
        paidAmount: item.dueAmountToDisburse,
        dueAmount: 0,
        totalPaidSoFar: newTotalPaid,
        paymentType: item.installmentNo > 1 ? 'DUE_PAYMENT' : 'FULL',
        installmentNo: item.installmentNo,
        notes: item.installmentNo > 1 ? `${monthStr} মাসের বকেয়া বেতন পরিশোধ` : `${monthStr} মাসের বেতন`,
        netPay: item.dueAmountToDisburse,
        paymentDate: today,
        walletId,
        walletName: targetWallet.name,
        status: 'PAID',
        createdBy: currentUser?.id || 'usr-1',
        createdAt: `${today} ${nowTime}`,
      };
      createdPayroll.push(pEntry);

      const dbEntry: DayBookEntry = {
        id: `db-${Date.now()}-${item.emp.id}-${idx}`,
        voucherNo,
        date: today,
        type: 'SALARY',
        flow: 'OUT',
        partyId: item.emp.id,
        partyName: item.emp.name,
        partyType: 'STAFF',
        amount: item.dueAmountToDisburse,
        walletId,
        walletName: targetWallet.name,
        referenceNo: voucherNo,
        remarks: `Salary payment (#${item.installmentNo}) for ${monthStr} to ${item.emp.name} (${item.emp.designation}). Paid: ৳${item.dueAmountToDisburse.toLocaleString()} (Paid in Full)`,
        createdBy: currentUser?.id || 'usr-1',
        createdAt: `${today} ${nowTime}`,
      };
      createdDayBook.push(dbEntry);
    });

    setPayrollHistory(prev => [...createdPayroll, ...prev]);
    setDayBookEntries(prev => [...createdDayBook, ...prev]);

    showToast(
      language === 'bn'
        ? `✅ ${monthStr} মাসের ${pendingToPay.length} জন কর্মচারীর মোট ${formatCurrency(totalDisbursement)} বেতন সফলভাবে পরিশোধ করা হয়েছে!`
        : `Disbursed ${formatCurrency(totalDisbursement)} in payroll to ${pendingToPay.length} employees for ${monthStr}.`,
      'success'
    );
  };

  // -------------------------------------------------------------
  // Users & Settings
  // -------------------------------------------------------------
  const addUser = (userData: Omit<UserAccount, 'id'>) => {
    const newUser: UserAccount = {
      ...userData,
      id: `usr-${Date.now()}`,
    };
    setUsers(prev => [...prev, newUser]);
    showToast(language === 'bn' ? 'ব্যবহারকারী তৈরি করা হয়েছে।' : 'User created.');
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updates }));
    }
    showToast(language === 'bn' ? 'ব্যবহারকারীর তথ্য আপডেট হয়েছে।' : 'User updated.');
  };

  const deleteUser = (id: string) => {
    if (users.length <= 1) {
      showToast(language === 'bn' ? 'কমপক্ষে একটি ইউজার থাকা আবশ্যক।' : 'At least one user is required.', 'error');
      return;
    }

    const userToDelete = users.find(u => u.id === id);
    if (!userToDelete) return;

    const hasSales = saleInvoices?.some(inv => inv.cashierId === id || inv.createdBy === id);
    const hasPurchases = purchaseInvoices?.some(inv => inv.createdBy === id);
    const hasQuotations = quotations?.some(q => q.createdBy === id);
    const hasExpenses = expenseVouchers?.some(v => v.createdBy === id);

    if (hasSales || hasPurchases || hasQuotations || hasExpenses) {
      showToast(
        language === 'bn'
          ? `এই ইউজারের (${userToDelete.fullName} / @${userToDelete.username}) নামে ইনভয়েস, ক্রয় বা ভাউচার এন্ট্রি রয়েছে। তাই এই ইউজার আইডি ডিলিট করা যাবে না!`
          : `User (${userToDelete.username}) has generated invoices, purchases or vouchers. Cannot be deleted!`,
        'error'
      );
      return;
    }

    setUsers(prev => prev.filter(u => u.id !== id));
    showToast(language === 'bn' ? 'ব্যবহারকারী মুছে ফেলা হয়েছে।' : 'User deleted.', 'success');
  };

  const updateCompanySettings = (updates: Partial<CompanySettings>) => {
    const updatedEpoch = Date.now();
    lastPushTimeRef.current = updatedEpoch;
    lastServerUpdatedEpochRef.current = updatedEpoch;

    setCompanySettings(prev => {
      const updated = { ...prev, ...updates };

      // 1. Immediately persist to dedicated standalone 'companySettings' key
      try {
        localStorage.setItem('companySettings', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save to companySettings in localStorage', e);
      }

      // 2. Immediately persist to monolithic master storage object
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : {};
        parsed.companySettings = updated;
        parsed.lastUpdatedEpoch = updatedEpoch;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
        localStorage.setItem('DOKANPRO_LAST_LOCAL_UPDATE_EPOCH', String(updatedEpoch));
      } catch (e) {
        console.warn('Failed to update LOCAL_STORAGE_KEY with companySettings', e);
      }

      return updated;
    });

    showToast(language === 'bn' ? 'কোম্পানি সেটিংস সফলভাবে সংরক্ষিত হয়েছে।' : 'Company settings saved successfully.', 'success');

    // 3. Immediately trigger background server push so server snapshot also receives updated companySettings
    setTimeout(() => {
      const activeUrl = getActiveApiEndpoint();
      if (activeUrl) {
        triggerServerPush(activeUrl, true);
      }
    }, 100);
  };

  const cleanZeroWallets: Wallet[] = [
    {
      id: 'w-cash',
      name: 'Main Cash Drawer',
      nameBn: 'মূল ক্যাশ ড্রয়ার (নগদ)',
      type: 'CASH',
      balance: 0,
      isActive: true,
      colorCode: '#10B981',
    },
    {
      id: 'w-ibbl',
      name: 'Bank Account',
      nameBn: 'ব্যাংক হিসাব',
      type: 'BANK',
      accountNumber: '',
      balance: 0,
      isActive: true,
      colorCode: '#3B82F6',
    },
    {
      id: 'w-bkash',
      name: 'bKash Merchant',
      nameBn: 'বিকাশ মার্চেন্ট',
      type: 'MFS',
      accountNumber: '',
      balance: 0,
      isActive: true,
      colorCode: '#EC4899',
    },
    {
      id: 'w-nagad',
      name: 'Nagad Account',
      nameBn: 'নগদ একাউন্ট',
      type: 'MFS',
      accountNumber: '',
      balance: 0,
      isActive: true,
      colorCode: '#F97316',
    },
  ];

  const resetToDemoData = () => {
    // Completely wipe all transactional, log, and inventory data to zero / clean state
    setProducts([]);
    setDeletedProductIds([]);
    setCategories(initialCategories);
    setParties([]);
    setWallets(cleanZeroWallets);
    setSaleInvoices([]);
    setDeletedSaleInvoices([]);
    setSaleReturns([]);
    setPurchaseInvoices([]);
    setDeletedPurchaseInvoices([]);
    setPurchaseReturns([]);
    setPurchaseOrders([]);
    setQuotations([]);
    setExpiredReturnLogs([]);
    setInstallmentSchemes([]);
    setEmployees([]);
    setAdvanceSalaries([]);
    setPayrollHistory([]);
    setExpenseCategories(initialExpenseCategories);
    setExpenseVouchers([]);
    setDayBookEntries([]);
    setCashAdjustments([]);
    setActivityLogs([]);
    setSmsLogs([]);
    setWarrantyPolicies(initialWarrantyPolicies);
    setWarrantyRecords([]);
    setWarrantyClaims([]);
    setDiseaseMaster(INITIAL_DISEASE_MASTER);
    setDiseaseCategories(COMMON_DISEASE_CATEGORIES);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);

    const resetEpoch = Date.now();
    lastServerUpdatedEpochRef.current = resetEpoch;
    lastPushTimeRef.current = resetEpoch;

    const cleanData = {
      companySettings,
      products: [],
      deletedProductIds: [],
      categories: initialCategories,
      parties: [],
      wallets: cleanZeroWallets,
      saleInvoices: [],
      deletedSaleInvoices: [],
      saleReturns: [],
      purchaseInvoices: [],
      deletedPurchaseInvoices: [],
      purchaseReturns: [],
      purchaseOrders: [],
      quotations: [],
      expiredReturnLogs: [],
      installmentSchemes: [],
      employees: [],
      advanceSalaries: [],
      payrollHistory: [],
      expenseCategories: initialExpenseCategories,
      expenseVouchers: [],
      dayBookEntries: [],
      cashAdjustments: [],
      activityLogs: [],
      warrantyPolicies: initialWarrantyPolicies,
      warrantyRecords: [],
      warrantyClaims: [],
      diseaseMaster: INITIAL_DISEASE_MASTER,
      diseaseCategories: COMMON_DISEASE_CATEGORIES,
      users: initialUsers,
      smsConfig,
      smsLogs: [],
      language,
      theme,
      lastUpdatedEpoch: resetEpoch,
      is_reset_wipe: true,
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanData));
      localStorage.setItem('DOKANPRO_LAST_LOCAL_UPDATE_EPOCH', String(resetEpoch));
      localStorage.removeItem('DOKANPRO_DELETED_INVOICES_ARCHIVE');
      localStorage.removeItem('DOKANPRO_DELETED_PURCHASES_ARCHIVE');
      localStorage.removeItem('DOKANPRO_DELETED_PRODUCT_IDS');
      localStorage.removeItem('dokanpro_disease_master');
      localStorage.removeItem('dokanpro_disease_categories');
    } catch (e) {
      console.warn('Failed to save clean state', e);
    }

    // Immediately push wipe state to server to clear server snapshot & database.sql
    const targetsToNotify = new Set<string>();
    targetsToNotify.add('/api/sync');
    const customEndpoint = companySettings.apiEndpoint || localStorage.getItem('DOKANPRO_ERP_API_ENDPOINT');
    if (customEndpoint) targetsToNotify.add(customEndpoint);
    const activeUrl = getActiveApiEndpoint();
    if (activeUrl) targetsToNotify.add(activeUrl);

    targetsToNotify.forEach(url => {
      const endpoint = url.includes('?') ? `${url}&action=sync_all` : `${url}?action=sync_all`;
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      })
        .then(res => res.json())
        .then(json => {
          if (json && json.success) {
            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastServerSyncTime(now);
            try {
              localStorage.setItem('DOKANPRO_LAST_SYNC_TIME', now);
            } catch {}
          }
        })
        .catch(err => {
          console.warn('Reset sync push notice for endpoint:', url, err);
        });
    });

    // Broadcast reset to all other open browser tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('DOKANPRO_CROSS_TAB_CHANNEL');
        bc.postMessage({ type: 'STATE_UPDATED', timestamp: resetEpoch });
        bc.close();
      }
    } catch {}

    showToast(
      language === 'bn'
        ? 'সকল ডাটা সফলভাবে মুছে ফেলা হয়েছে (সিস্টেম এখন সম্পূর্ণ ফাঁকা ও ফ্রেশ)।'
        : 'All data has been wiped and reset successfully. Ready for fresh entries.',
      'info'
    );
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        setTheme,
        toggleTheme,
        activeTab,
        setActiveTab,
        activeHrSubTab,
        setActiveHrSubTab,
        activeInstallmentSubTab,
        setActiveInstallmentSubTab,
        companySettings,
        updateCompanySettings,
        products,
        categories,
        parties,
        wallets,
        saleInvoices,
        deletedSaleInvoices,
        saleReturns,
        purchaseInvoices,
        deletedPurchaseInvoices,
        purchaseReturns,
        purchaseOrders,
        quotations,
        expiredReturnLogs,
        installmentSchemes,
        employees,
        advanceSalaries,
        payrollHistory,
        expenseCategories,
        expenseVouchers,
        dayBookEntries,
        cashAdjustments,
        activityLogs,
        logActivity,
        users,
        currentUser,
        setCurrentUser,
        smsConfig,
        setSmsConfig,
        updateSmsConfig,
        smsLogs,
        sendManualSms,
        sendSaleSms,
        sendPaymentInSms,
        sendDueReminderSms,
        sendWarrantyClaimSms,
        warrantyPolicies,
        warrantyRecords,
        warrantyClaims,
        addWarrantyPolicy,
        updateWarrantyPolicy,
        deleteWarrantyPolicy,
        addWarrantyRecord,
        updateWarrantyRecord,
        deleteWarrantyRecord,
        addWarrantyClaim,
        updateWarrantyClaimStatus,
        deleteWarrantyClaim,
        deleteSmsLog,
        clearSmsLogs,
        diseaseMaster,
        setDiseaseMaster,
        diseaseCategories,
        setDiseaseCategories,
        printableDoc,
        openPrintModal,
        closePrintModal,
        toastMessage,
        showToast,
        addProduct,
        updateProduct,
        deleteProduct,
        deleteAllProducts,
        deletedProductIds,
        updateProductBatches,
        addProductBatch,
        deleteProductBatch,
        addCategory,
        updateCategory,
        deleteCategory,
        bulkImportProducts,
        getNextPartySerialNumber,
        addParty,
        updateParty,
        deleteParty,
        getNextSaleInvoiceNumber: () => generateSaleInvoiceNumber(saleInvoices),
        createSaleInvoice,
        deleteSaleInvoice,
        restoreDeletedSaleInvoice,
        permanentlyDeleteArchivedInvoice,
        clearAllDeletedInvoices,
        exportDeletedInvoicesToFile,
        exportSingleDeletedInvoiceToFile,
        createSaleReturn,
        deleteSaleReturn,
        recordPaymentIn,
        getNextPurchaseBillNumber: () => generatePurchaseBillNumber(purchaseInvoices),
        createPurchaseInvoice,
        deletePurchaseInvoice,
        restoreDeletedPurchaseInvoice,
        permanentlyDeleteArchivedPurchase,
        clearAllDeletedPurchases,
        exportDeletedPurchasesToFile,
        exportSingleDeletedPurchaseToFile,
        addPurchaseOrder,
        updatePurchaseOrderStatus,
        convertPOToPurchaseBill,
        deletePurchaseOrder,
        addQuotation,
        updateQuotationStatus,
        convertQuotationToSale,
        deleteQuotation,
        createPurchaseReturn,
        deletePurchaseReturn,
        addExpiredReturnLog,
        deleteExpiredReturnLog,
        recordPaymentOut,
        createInstallmentScheme,
        collectInstallment,
        deleteInstallmentScheme,
        addCashAdjustment,
        adjustCash,
        deleteCashAdjustment,
        addWallet,
        updateWallet,
        deleteWallet,
        transferWalletFunds,
        transferBetweenWallets: transferWalletFunds,
        addExpenseCategory,
        updateExpenseCategory,
        deleteExpenseCategory,
        addExpenseVoucher,
        deleteExpenseVoucher,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        resignEmployee,
        rejoinEmployee,
        addAdvanceSalary,
        giveAdvanceSalary,
        payEmployeeSalary,
        processMonthlyPayroll,
        addUser,
        updateUser,
        deleteUser,
        isLoggedIn,
        logout,
        login,
        switchUser,
        resetToDemoData,
        formatCurrency,
        isSyncingWithServer,
        lastServerSyncTime,
        serverSyncStatus,
        syncCountdown,
        autoSyncIntervalSeconds,
        setAutoSyncIntervalSeconds,
        isAutoSyncEnabled,
        setIsAutoSyncEnabled,
        triggerServerPush,
        triggerServerPull,
        triggerSyncNow,
        saveApiEndpoint,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
