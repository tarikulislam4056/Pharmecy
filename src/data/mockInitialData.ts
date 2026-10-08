import {
  Product,
  Category,
  Party,
  SaleInvoice,
  DeletedSaleInvoice,
  PurchaseInvoice,
  DeletedPurchaseInvoice,
  DeletedProduct,
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
  ActivityLog,
  PurchaseOrder,
  WarrantyPolicy,
  WarrantyRecord,
  WarrantyClaim,
} from '../types';

export const initialCompanySettings: CompanySettings = {
  name: 'Silva Electronics & IT',
  nameBn: 'সিলভা ইলেকট্রনিক্স অ্যান্ড আইটি',
  slogan: 'Quality Products at the Best Price',
  phone: '+880 1711-234567 / +880 1812-987654',
  email: 'silvait2000@gmail.com',
  website: 'www.dokanprobd.com',
  address: 'Mosjid Market, Chandana-1702, Bason. Gazipur',
  taxNumber: 'BIN-002948192-0102',
  currencySymbol: '৳',
  currencyCode: 'BDT',
  businessModule: 'dokan',
  logoUrl: 'https://i.postimg.cc/Twh0KBbL/logo-(1).jpg',
  signatureUrl: '',
  invoiceFooter: 'Thank you for shopping with us! Warranty claims require original invoice within 7 days. • আমাদের সাথে থাকার জন্য ধন্যবাদ।',
  defaultVatPercent: 0,
  invoicePrintType: 'A4',
  invoiceTemplate: 'COMPACT_BILL',
  invoiceColorTheme: 'INDIGO_VIOLET',
  invoiceCustomPrimaryColor: '#6366f1',
  invoiceCustomAccentColor: '#4f46e5',
  smsSenderId: 'SILVAIT',
  autoSyncEnabled: true,
  autoSyncIntervalSeconds: 30,
};

export const initialCategories: Category[] = [];

export const initialWallets: Wallet[] = [
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
    id: 'w-bank',
    name: 'Bank Account',
    nameBn: 'ব্যাংক হিসাব',
    type: 'BANK',
    accountNumber: '',
    bankName: 'Islami Bank / Dutch-Bangla Bank',
    branch: 'Main Branch',
    balance: 0,
    isActive: true,
    colorCode: '#0284C7',
  },
  {
    id: 'w-mfs',
    name: 'bKash / Nagad Wallet',
    nameBn: 'বিকাশ / নগদ ওয়ালেট',
    type: 'MFS',
    accountNumber: '',
    balance: 0,
    isActive: true,
    colorCode: '#E11D48',
  },
];

export const initialExpenseCategories: ExpenseCategory[] = [
  { id: 'exp-cat-1', name: 'Shop Rent & Service Charge', nameBn: 'দোকান ভাড়া ও সার্ভিস চার্জ', code: 'RENT', budgetMonthly: 0 },
  { id: 'exp-cat-2', name: 'Electricity & Utility Bills', nameBn: 'বিদ্যুৎ ও অন্যান্য বিল', code: 'UTIL', budgetMonthly: 0 },
  { id: 'exp-cat-3', name: 'Entertainment & Tea', nameBn: 'আপ্যায়ন ও চা-নাস্তা', code: 'ENTR', budgetMonthly: 0 },
  { id: 'exp-cat-4', name: 'Packaging & Bags', nameBn: 'প্যাকেজিং ও ব্যাগ খরচ', code: 'PACK', budgetMonthly: 0 },
];

export const initialUsers: UserAccount[] = [
  {
    id: 'usr-1',
    username: 'admin',
    password: '123',
    fullName: 'System Administrator (অ্যাডমিন)',
    email: 'silvait2000@gmail.com',
    role: 'ADMIN',
    phone: '01711-234567',
    permissions: ['ALL'],
    isActive: true,
    avatar: '',
  },
];

const getRelativeDateStr = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const initialProducts: Product[] = [
  {
    id: 'prod-exp-1',
    name: 'Napa Extra 500mg Tablet',
    nameBn: 'নাপা এক্সট্রা ৫০০ মি.গ্রা. ট্যাবলেট',
    barcode: '894110022301',
    sku: 'MED-NAP-EXT',
    categoryId: 'cat-1',
    categoryName: 'Tablet',
    unit: 'Pack',
    purchasePrice: 25,
    salesPrice: 30,
    discount: 0,
    discountType: 'percentage',
    expDate: getRelativeDateStr(3), // ⚠️ Expiring in 3 days (within 5-day push alert window)
    generic: 'Paracetamol + Caffeine',
    manufacturer: 'Beximco Pharmaceuticals Ltd',
    dosageForm: 'Tablet',
    strength: '500mg + 65mg',
    rackLocation: 'Rack A-12',
    reorderLevel: 10,
    stock: 85,
    batchNumber: 'B-NPE2610',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-exp-2',
    name: 'Zithrin 500mg (Azithromycin)',
    nameBn: 'জিথ্রিন ৫০০ মি.গ্রা. ক্যাপসুল',
    barcode: '894110022302',
    sku: 'MED-ZTH-500',
    categoryId: 'cat-2',
    categoryName: 'Capsule',
    unit: 'Box',
    purchasePrice: 160,
    salesPrice: 210,
    discount: 5,
    discountType: 'percentage',
    expDate: getRelativeDateStr(5), // ⚠️ Expiring in 5 days (exact 5-day boundary)
    generic: 'Azithromycin',
    manufacturer: 'Square Pharmaceuticals Ltd',
    dosageForm: 'Capsule',
    strength: '500mg',
    rackLocation: 'Rack B-04',
    reorderLevel: 5,
    stock: 24,
    batchNumber: 'B-ZTH2610',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-exp-3',
    name: 'Seclo 20mg Capsule',
    nameBn: 'সেকলো ২০ মি.গ্রা. ক্যাপসুল',
    barcode: '894110022303',
    sku: 'MED-SCL-020',
    categoryId: 'cat-2',
    categoryName: 'Capsule',
    unit: 'Pack',
    purchasePrice: 48,
    salesPrice: 60,
    discount: 0,
    discountType: 'percentage',
    expDate: getRelativeDateStr(180), // Fresh (6 months)
    generic: 'Omeprazole',
    manufacturer: 'Square Pharmaceuticals Ltd',
    dosageForm: 'Capsule',
    strength: '20mg',
    rackLocation: 'Rack A-08',
    reorderLevel: 15,
    stock: 150,
    batchNumber: 'B-SCL2704',
    createdAt: new Date().toISOString(),
  },
];
export const initialParties: Party[] = [];
export const initialSaleInvoices: SaleInvoice[] = [];
export const initialDeletedSaleInvoices: DeletedSaleInvoice[] = [];
export const initialPurchaseInvoices: PurchaseInvoice[] = [];
export const initialDeletedPurchaseInvoices: DeletedPurchaseInvoice[] = [];
export const initialDeletedProducts: DeletedProduct[] = [];
export const initialInstallmentSchemes: InstallmentScheme[] = [];
export const initialEmployees: Employee[] = [];
export const initialAdvanceSalaries: AdvanceSalary[] = [];
export const initialPayrollHistory: PayrollEntry[] = [];
export const initialExpenseVouchers: ExpenseVoucher[] = [];
export const initialDayBookEntries: DayBookEntry[] = [];
export const initialCashAdjustments: CashAdjustment[] = [];
export const initialActivityLogs: ActivityLog[] = [];
export const initialPurchaseOrders: PurchaseOrder[] = [];

export const initialWarrantyPolicies: WarrantyPolicy[] = [
  {
    id: 'war-pol-1',
    name: '1 Year Brand Replacement Warranty',
    nameBn: '১ বছর ব্র্যান্ড রিপ্লেসমেন্ট ওয়ারেন্টি',
    duration: 1,
    durationUnit: 'YEARS',
    type: 'REPLACEMENT',
    terms: 'Covers hardware failure and manufacturing defects. Physical damage, broken screen, or liquid damage is strictly void.',
    isDefault: true,
  },
  {
    id: 'war-pol-2',
    name: '6 Months Parts & Repair Warranty',
    nameBn: '৬ মাস পার্টস ও ফ্রি মেরামত ওয়ারেন্টি',
    duration: 6,
    durationUnit: 'MONTHS',
    type: 'REPAIR',
    terms: 'Includes free servicing labor and genuine spare parts replacement within 6 months of purchase.',
  },
  {
    id: 'war-pol-3',
    name: '7 Days Instant Replacement',
    nameBn: '৭ দিনের ইন্সট্যান্ট রিপ্লেসমেন্ট',
    duration: 7,
    durationUnit: 'DAYS',
    type: 'REPLACEMENT',
    terms: 'Instant replacement if product exhibits initial functional malfunction within 7 days.',
  },
  {
    id: 'war-pol-4',
    name: '2 Years Free Service Warranty',
    nameBn: '২ বছর ফ্রি সার্ভিসিং ওয়ারেন্টি',
    duration: 2,
    durationUnit: 'YEARS',
    type: 'SERVICE',
    terms: 'Free technician service labor for 24 months. Parts cost will be charged separately after warranty period.',
  },
];

export const initialWarrantyRecords: WarrantyRecord[] = [];
export const initialWarrantyClaims: WarrantyClaim[] = [];
