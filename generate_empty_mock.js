const fs = require('fs');

const fileContent = `import {
  Product,
  Category,
  Party,
  SaleInvoice,
  PurchaseInvoice,
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
} from '../types';

export const initialCompanySettings: CompanySettings = {
  name: 'DokanPro Super Store & Electronics',
  nameBn: 'দোকানপ্রো সুপার স্টোর ও ইলেকট্রনিক্স',
  slogan: 'Quality Products at the Best Price • পাইকারি ও খুচরা বিক্রেতা',
  phone: '+880 1711-234567 / +880 1812-987654',
  email: 'info@dokanprobd.com',
  website: 'www.dokanprobd.com',
  address: 'Shop #104-106, Level 2, Stadium Market, Motijheel, Dhaka-1000',
  taxNumber: 'BIN-002948192-0102',
  currencySymbol: '৳',
  currencyCode: 'BDT',
  logoUrl: '',
  signatureUrl: '',
  invoiceFooter: 'Thank you for shopping with us! Warranty claims require original invoice within 7 days. • আমাদের সাথে থাকার জন্য ধন্যবাদ।',
  defaultVatPercent: 5,
  printFormat: 'A4',
  smsSenderId: 'DOKANPRO',
};

export const initialCategories: Category[] = [
  { id: 'cat-1', name: 'Electronics & Appliances', nameBn: 'ইলেকট্রনিক্স ও হোম অ্যাপ্লায়েন্স', code: 'ELEC', icon: 'Tv' },
  { id: 'cat-2', name: 'Smartphones & Gadgets', nameBn: 'স্মার্টফোন ও গ্যাজেটস', code: 'SMART', icon: 'Smartphone' },
  { id: 'cat-3', name: 'Grocery & Commodities', nameBn: 'মুদি ও ভোগ্যপণ্য', code: 'GROC', icon: 'ShoppingBag' },
  { id: 'cat-4', name: 'Home Kitchen & Crockery', nameBn: 'কিচেন ও গৃহস্থালি পণ্য', code: 'KITCH', icon: 'Utensils' },
  { id: 'cat-5', name: 'Clothing & Lifestyle', nameBn: 'গার্মেন্টস ও পোশাক', code: 'CLOTH', icon: 'Shirt' },
];

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
    id: 'w-ibbl',
    name: 'Islami Bank (A/C: 205014)',
    nameBn: 'ইসলামী ব্যাংক হিসাব (০১৪)',
    type: 'BANK',
    accountNumber: '20501489201948',
    bankName: 'Islami Bank Bangladesh PLC',
    branch: 'Motijheel Corporate Branch',
    balance: 0,
    isActive: true,
    colorCode: '#0284C7',
  },
  {
    id: 'w-bkash',
    name: 'bKash Merchant (01777-123456)',
    nameBn: 'বিকাশ মার্চেন্ট ওয়ালেট',
    type: 'MFS',
    accountNumber: '01777123456',
    balance: 0,
    isActive: true,
    colorCode: '#E11D48',
  },
];

export const initialExpenseCategories: ExpenseCategory[] = [
  { id: 'exp-cat-1', name: 'Shop Rent & Service Charge', nameBn: 'দোকান ভাড়া ও সার্ভিস চার্জ', code: 'RENT', budgetMonthly: 35000 },
  { id: 'exp-cat-2', name: 'Electricity & Utility Bills', nameBn: 'বিদ্যুৎ ও অন্যান্য বিল', code: 'UTIL', budgetMonthly: 12000 },
  { id: 'exp-cat-3', name: 'Entertainment, Tea & Snacks', nameBn: 'আপ্যায়ন, চা-নাস্তা ও মেহমানদারি', code: 'ENTR', budgetMonthly: 6000 },
  { id: 'exp-cat-4', name: 'Packaging, Polythene & Boxes', nameBn: 'প্যাকেজিং ও ব্যাগ খরচ', code: 'PACK', budgetMonthly: 5000 },
];

export const initialUsers: UserAccount[] = [
  {
    id: 'usr-1',
    username: 'admin',
    fullName: 'Mohammad Shafiul Islam',
    email: 'admin@dokanprobd.com',
    role: 'ADMIN',
    phone: '01711-234567',
    permissions: ['ALL'],
    isActive: true,
    avatar: '',
    lastLogin: '2026-08-15 08:30',
  }
];

export const initialProducts: Product[] = [];
export const initialParties: Party[] = [];
export const initialSaleInvoices: SaleInvoice[] = [];
export const initialPurchaseInvoices: PurchaseInvoice[] = [];
export const initialInstallmentSchemes: InstallmentScheme[] = [];
export const initialEmployees: Employee[] = [];
export const initialAdvanceSalaries: AdvanceSalary[] = [];
export const initialPayrollHistory: PayrollEntry[] = [];
export const initialExpenseVouchers: ExpenseVoucher[] = [];
export const initialDayBookEntries: DayBookEntry[] = [];
export const initialCashAdjustments: CashAdjustment[] = [];
`;

fs.writeFileSync('src/data/mockInitialData.ts', fileContent);
