export type Language = 'en' | 'bn';
export type Theme = 'light' | 'dark';

export interface EntryContributor {
  action: string; // e.g., 'Created', 'Completed', 'Converted', 'Approved', 'Payment Collected', 'Returned', 'Repaired'
  actionBn?: string;
  userId?: string;
  userName: string;
  userRole?: string;
  timestamp?: string;
  note?: string;
}

export interface ExpiredReturnLog {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  unit: UnitType;
  quantity: number;
  purchasePrice: number;
  totalValue: number;
  actionType: 'RETURN_SUPPLIER' | 'WRITE_OFF' | 'REPLACEMENT';
  notes?: string;
  batchNumber?: string;
  expDate?: string;
  createdBy?: string;
  completedBy?: string;
  contributors?: EntryContributor[];
}

export interface ProductBatch {
  id: string;
  batchNumber: string;
  expDate: string;
  mfgDate?: string;
  purchaseDate?: string;
  purchaseInvoiceNo?: string;
  purchasePrice: number;
  salesPrice?: number;
  stock: number;
  initialStock?: number;
  supplierName?: string;
  supplierId?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export type UnitType = 'Pcs' | 'Kg' | 'Ltr' | 'Box' | 'Pack' | 'Dozen' | 'Meter' | 'Bag';

export type WarrantyPeriodType = 'DAYS' | 'MONTHS' | 'YEARS' | 'LIFETIME' | 'NO_WARRANTY';
export type WarrantyType = 'REPLACEMENT' | 'REPAIR' | 'SERVICE' | 'BRAND_WARRANTY';
export type WarrantyClaimStatus = 'RECEIVED' | 'IN_REPAIR' | 'SENT_TO_SUPPLIER' | 'REPLACED' | 'REPAIRED' | 'REFUNDED' | 'REJECTED' | 'DELIVERED';

export interface WarrantyPolicy {
  id: string;
  name: string;
  nameBn: string;
  duration: number;
  durationUnit: WarrantyPeriodType;
  terms: string;
  type: WarrantyType;
  isDefault?: boolean;
}

export interface WarrantyRecord {
  id: string;
  warrantyCode: string; // e.g. WAR-2026-0001
  invoiceId: string;
  invoiceNumber: string;
  saleDate: string;
  productId: string;
  productName: string;
  sku: string;
  serialNumber: string; // Serial / IMEI Number
  customerId: string;
  customerName: string;
  customerPhone: string;
  warrantyType: WarrantyType;
  duration: number;
  durationUnit: WarrantyPeriodType;
  startDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CLAIMED' | 'VOID';
  terms?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface WarrantyClaimAction {
  id: string;
  date: string;
  status: WarrantyClaimStatus;
  note: string;
  updatedBy: string;
}

export interface WarrantyClaim {
  id: string;
  claimTicketNo: string; // e.g. RMA-2026-001
  warrantyRecordId?: string;
  invoiceNumber: string;
  productId: string;
  productName: string;
  serialNumber: string; // Serial / IMEI Number
  customerId: string;
  customerName: string;
  customerPhone: string;
  issueDescription: string;
  physicalCondition: string; // Accessories, scratches, packaging
  claimDate: string;
  expectedReturnDate?: string;
  status: WarrantyClaimStatus;
  claimType: 'REPAIR' | 'REPLACEMENT' | 'REFUND';
  repairCost: number;
  customerCharge: number;
  replacementSerialNumber?: string; // New Serial/IMEI if replaced
  supplierId?: string;
  supplierName?: string;
  technicianNotes?: string;
  actionsHistory: WarrantyClaimAction[];
  createdBy?: string;
  completedBy?: string;
  updatedBy?: string;
  contributors?: EntryContributor[];
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  nameBn: string;
  barcode: string;
  sku: string;
  categoryId: string;
  categoryName?: string;
  unit: UnitType;
  purchasePrice: number;
  salesPrice: number;
  discount: number;
  discountType: 'percentage' | 'flat';
  expDate?: string;
  generic?: string;
  manufacturer?: string;
  dosageForm?: string;
  strength?: string;
  rackLocation?: string;
  stripSize?: number;
  diseases?: string[]; // e.g. ['জ্বর', 'মাথাব্যথা', 'Fever', 'Headache']
  dosageSchedule?: string; // e.g. '১ + ০ + ১ (সকালে ও রাতে)'
  mealTiming?: string; // e.g. 'খাওয়ার পর' | 'খাওয়ার আগে (খালি পেটে)'
  duration?: string; // e.g. '৩-৫ দিন'
  instructions?: string; // e.g. 'ভরা পেটে প্রচুর পানিসহ'
  precautions?: string; // e.g. 'গর্ভকালীন চিকিৎসকের পরামর্শ নিন'
  reorderLevel: number;
  stock: number;
  batchNumber?: string;
  batches?: ProductBatch[];
  image?: string;
  imageUrl?: string;
  description?: string;
  hasWarranty?: boolean;
  warrantyDuration?: number;
  warrantyUnit?: WarrantyPeriodType;
  warrantyType?: WarrantyType;
  warrantyTerms?: string;
  requiresSerialNo?: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameBn: string;
  code: string;
  description?: string;
  icon?: string;
  createdBy?: string;
}

export type PartyType = 'CUSTOMER' | 'SUPPLIER';

export interface Party {
  id: string;
  serialNumber?: string; // Auto-generated e.g. 'CUST-0001', 'SUPP-0001'
  type: PartyType;
  name: string;
  nameBn?: string;
  phone: string;
  email?: string;
  companyName?: string;
  address: string;
  openingBalance: number; // positive = they owe us (customer due), negative = we owe them
  currentBalance: number;
  creditLimit?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy?: string;
  createdAt: string;
  taxNumber?: string;
  bankDetails?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  nameBn: string;
  barcode: string;
  unit: UnitType;
  purchasePrice: number;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: 'percentage' | 'flat';
  taxPercent: number;
  stock: number;
  total: number;
  batchId?: string;
  batchNumber?: string;
  expDate?: string;
  serialNumber?: string;
  warrantyInfo?: string;
  warrantyExpDate?: string;
}

export type PaymentMethod = 'CASH' | 'BANK' | 'MFS' | 'DUE' | 'SPLIT' | 'INSTALLMENT';
export type InvoiceStatus = 'PAID' | 'PARTIAL' | 'DUE';

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
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
  walletName?: string;
  status: InvoiceStatus;
  notes?: string;
  cashierName: string;
  createdBy?: string;
  completedBy?: string;
  updatedBy?: string;
  approvedBy?: string;
  convertedBy?: string;
  contributors?: EntryContributor[];
  isInstallmentSale?: boolean;
  installmentPlanId?: string;
  createdAt: string;
}

export interface DeletedSaleInvoice {
  id: string;
  originalInvoiceId: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  vatAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  walletId: string;
  walletName?: string;
  cashierName?: string;
  createdBy?: string;
  deletedAt: string;
  deletedBy: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
  deletionReason?: string;
  invoiceSnapshot: SaleInvoice;
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  originalInvoiceNumber: string;
  invoiceId: string;
  date: string;
  customerId: string;
  customerName: string;
  items: {
    productId: string;
    productName: string;
    unit: UnitType;
    unitPrice: number;
    returnQuantity: number;
    totalRefund: number;
    batchNumber?: string;
    expDate?: string;
  }[];
  totalRefund: number;
  refundWalletId: string;
  refundWalletName: string;
  reason: string;
  createdBy?: string;
  completedBy?: string;
  contributors?: EntryContributor[];
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  unit: UnitType;
  quantity: number;
  purchasePrice: number;
  total: number;
  batchNumber?: string;
  expDate?: string;
  mfgDate?: string;
  salesPrice?: number;
}

export type POStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT_TO_SUPPLIER'
  | 'PARTIALLY_RECEIVED'
  | 'FULLY_RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  expectedDeliveryDate: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  status: POStatus;
  notes?: string;
  createdBy?: string;
  approvedBy?: string;
  completedBy?: string;
  convertedBy?: string;
  updatedBy?: string;
  contributors?: EntryContributor[];
  createdAt: string;
}

export interface PurchaseInvoice {
  id: string;
  billNumber: string;
  supplierInvoiceNo?: string;
  date: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  walletId: string;
  walletName?: string;
  status: InvoiceStatus;
  notes?: string;
  createdBy?: string;
  completedBy?: string;
  updatedBy?: string;
  approvedBy?: string;
  convertedBy?: string;
  contributors?: EntryContributor[];
  createdAt: string;
}

export interface DeletedPurchaseInvoice {
  id: string;
  originalPurchaseId: string;
  billNumber: string;
  supplierInvoiceNo?: string;
  date: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  walletId: string;
  walletName?: string;
  createdBy?: string;
  deletedAt: string;
  deletedBy: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
  deletionReason?: string;
  invoiceSnapshot: PurchaseInvoice;
}

export interface DeletedProduct {
  id: string;
  originalProductId: string;
  name: string;
  nameBn: string;
  barcode: string;
  sku: string;
  categoryName?: string;
  stock: number;
  purchasePrice: number;
  salesPrice: number;
  deletedAt: string;
  deletedBy: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
  deletionReason?: string;
  productSnapshot: Product;
}

export interface DeletedParty {
  id: string;
  originalPartyId: string;
  name: string;
  type: PartyType;
  phone: string;
  companyName?: string;
  currentBalance: number;
  deletedAt: string;
  deletedBy: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
  deletionReason?: string;
  partySnapshot: Party;
}

export interface DeletedExpense {
  id: string;
  originalExpenseId: string;
  voucherNo: string;
  categoryName: string;
  amount: number;
  date: string;
  description: string;
  deletedAt: string;
  deletedBy: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
  deletionReason?: string;
  expenseSnapshot: any;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  originalBillNumber: string;
  purchaseId: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: {
    productId: string;
    productName: string;
    unit: UnitType;
    purchasePrice: number;
    returnQuantity: number;
    totalAmount: number;
  }[];
  totalAmount: number;
  refundWalletId: string;
  refundWalletName: string;
  reason: string;
  createdBy?: string;
  completedBy?: string;
  contributors?: EntryContributor[];
  createdAt: string;
}

export interface QuotationItem {
  productId: string;
  name: string;
  nameBn: string;
  unit: UnitType;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: 'percentage' | 'flat';
  taxPercent: number;
  total: number;
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'CANCELLED' | 'CONVERTED_TO_SALE';

export interface Quotation {
  id: string;
  quotationNumber: string;
  date: string;
  expiryDate?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  discountType: 'percentage' | 'flat';
  taxAmount: number;
  grandTotal: number;
  status: QuotationStatus;
  notes?: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  completedBy?: string;
  convertedBy?: string;
  updatedBy?: string;
  contributors?: EntryContributor[];
  convertedSaleInvoiceId?: string;
  createdAt: string;
}

export type TransactionType =
  | 'SALE'
  | 'SALE_RETURN'
  | 'PURCHASE'
  | 'PURCHASE_RETURN'
  | 'PAYMENT_IN'
  | 'PAYMENT_OUT'
  | 'CASH_ADD'
  | 'CASH_WITHDRAW'
  | 'EXPENSE'
  | 'SALARY'
  | 'ADVANCE_SALARY'
  | 'WALLET_TRANSFER'
  | 'EMI_COLLECTION';

export interface DayBookEntry {
  id: string;
  voucherNo: string;
  date: string;
  type: TransactionType;
  flow: 'IN' | 'OUT'; // Cash In vs Cash Out
  partyId?: string;
  partyName?: string;
  partyType?: 'CUSTOMER' | 'SUPPLIER' | 'STAFF' | 'INTERNAL' | 'EXPENSE';
  amount: number;
  walletId: string;
  walletName: string;
  referenceId?: string;
  referenceNo?: string;
  remarks: string;
  createdBy: string;
  completedBy?: string;
  approvedBy?: string;
  updatedBy?: string;
  contributors?: EntryContributor[];
  createdAt: string;
}

export type InstallmentFrequency = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY';

export type InstallmentSubTab = 'schemes' | 'new-scheme' | 'defaulters' | 'monthly-report' | 'all-formulas' | 'customer-ledger';

export type InstallmentFormulaMethod =
  | 'FLAT_RATE'
  | 'REDUCING_BALANCE'
  | 'HIRE_PURCHASE_MARKUP'
  | 'ZERO_PERCENT'
  | 'MICROFINANCE_WEEKLY';

export interface InstallmentSchedule {
  installmentNo: number;
  dueDate: string;
  amount: number;
  penalty: number;
  paidAmount: number;
  paidDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  paymentMethod?: string;
  walletId?: string;
  receiptVoucherNo?: string;
  collectedBy?: string;
  completedBy?: string;
  contributors?: EntryContributor[];
}

export interface InstallmentScheme {
  id: string;
  schemeNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  invoiceId?: string;
  invoiceNumber?: string;
  productName: string;
  totalPrice: number;
  downPayment: number;
  principalAmount: number; // totalPrice - downPayment
  interestRate: number; // in percent
  interestAmount: number;
  totalPayable: number;
  totalInstallments: number;
  frequency: InstallmentFrequency;
  emiAmount: number;
  startDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
  schedules: InstallmentSchedule[];
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorNid?: string;
  notes?: string;
  createdBy?: string;
  completedBy?: string;
  updatedBy?: string;
  collectedBy?: string;
  contributors?: EntryContributor[];
  createdAt: string;
}

export interface Wallet {
  id: string;
  name: string;
  nameBn: string;
  type: 'CASH' | 'BANK' | 'MFS';
  accountNumber?: string;
  bankName?: string;
  branch?: string;
  balance: number;
  isActive: boolean;
  colorCode?: string;
  createdBy?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  nameBn: string;
  code: string;
  description?: string;
  budgetMonthly?: number;
  createdBy?: string;
}

export interface ExpenseVoucher {
  id: string;
  voucherNo: string;
  date: string;
  categoryId: string;
  categoryName: string;
  category?: string;
  amount: number;
  walletId: string;
  walletName: string;
  payee: string;
  receiptNo?: string;
  note: string;
  remarks?: string;
  createdBy?: string;
  completedBy?: string;
  approvedBy?: string;
  contributors?: EntryContributor[];
  createdAt: string;
}

export type HrSubTab = 'employees' | 'resigned' | 'advance' | 'payroll';

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  nameBn?: string;
  phone: string;
  email?: string;
  designation: string;
  department: string;
  joiningDate: string;
  baseSalary: number;
  houseRentAllowance: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  status: 'ACTIVE' | 'RESIGNED' | 'ON_LEAVE';
  bankAccount?: string;
  nid?: string;
  address?: string;
  resignedDate?: string;
  resignationReason?: string;
  settlementNotes?: string;
  finalSettlementAmount?: number;
  finalSettlementPaid?: boolean;
  settlementWalletId?: string;
  settlementWalletName?: string;
  createdBy?: string;
}

export interface AdvanceSalary {
  id: string;
  voucherNo: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  walletId: string;
  walletName: string;
  reason: string;
  isDeducted: boolean;
  deductedInPayrollMonth?: string;
  createdBy?: string;
  createdAt: string;
}

export interface PayrollEntry {
  id: string;
  payrollMonth: string; // e.g. "2026-08"
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  baseSalary: number;
  allowances: number;
  bonus: number;
  advanceDeduction: number;
  fineDeduction: number;
  grossPay: number;
  payableAmount?: number; // Total net payable for this month (grossPay - advanceDeduction)
  paidAmount?: number;    // Amount disbursed in this specific voucher/transaction
  dueAmount?: number;     // Remaining due for this month after this payment
  totalPaidSoFar?: number;// Total cumulative amount paid for this month up to this voucher
  paymentType?: 'FULL' | 'PARTIAL' | 'DUE_PAYMENT';
  installmentNo?: number; // 1 (1st payment), 2 (2nd payment / due settlement), etc.
  notes?: string;
  netPay: number; // Disbursed amount in this voucher (kept for backward compatibility with existing payslips)
  paymentDate: string;
  walletId: string;
  walletName: string;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  voucherNo: string;
  createdBy?: string;
  createdAt: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT' | 'SALESMAN';

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  password?: string;
  role: UserRole;
  phone: string;
  permissions: string[];
  subPermissions?: string[];
  isActive: boolean;
  avatar?: string;
  lastLogin?: string;
  lowStockEmailAlerts?: boolean;
  lowStockSmsAlerts?: boolean;
}

export type SmsProvider =
  | 'greenweb'
  | 'bulksmsbd'
  | 'bulksms24'
  | 'alphanet'
  | 'onnorokom'
  | 'mimsms'
  | 'dianahost'
  | 'elitbuzz'
  | 'revesms'
  | 'smsq'
  | 'twilio'
  | 'custom_api';

export interface CustomSmsProviderDef {
  id: string;
  name: string;
  nameBn: string;
  defaultUrl: string;
  httpMethod: 'GET' | 'POST';
  requestFormat: 'json' | 'form' | 'query_param';
  keyParam: string;
  toParam: string;
  msgParam: string;
  senderParam?: string;
  description: string;
  guideBn: string;
}

export interface SmsConfig {
  enabled: boolean;
  provider: SmsProvider;
  apiUrl: string;
  apiKey: string;
  senderId: string;
  username?: string;
  password?: string;
  clientId?: string;
  httpMethod: 'GET' | 'POST';
  requestFormat: 'json' | 'form' | 'query_param';
  
  // Custom provider definitions created by user
  customProviders?: CustomSmsProviderDef[];

  // Custom parameter mapping
  customToParam?: string;
  customMsgParam?: string;
  customKeyParam?: string;
  customSenderParam?: string;
  customUserParam?: string;
  customPassParam?: string;
  customHeaders?: string;

  // Automation flags
  autoSendOnSale: boolean;
  autoSendOnPaymentIn: boolean;
  autoSendOnInstallmentReminder: boolean;
  autoSendOnWarrantyResolved: boolean;

  // Custom Templates
  saleTemplate: string;
  paymentInTemplate: string;
  dueReminderTemplate: string;
  warrantyResolvedTemplate: string;
}

export interface SmsLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  message: string;
  type: 'SALE' | 'PAYMENT_IN' | 'DUE_REMINDER' | 'INSTALLMENT' | 'WARRANTY' | 'TEST';
  status: 'SENT' | 'FAILED';
  responseDetails?: string;
  date: string;
  time: string;
}

export type InvoiceTemplateStyle =
  | 'MODERN_MINIMAL'
  | 'CLASSIC_CORPORATE'
  | 'ELEGANT_FRAME'
  | 'SLATE_CONTEMPORARY'
  | 'COMPACT_BILL'
  | 'CREATIVE_STUDIO';

export type InvoiceColorTheme =
  | 'INDIGO_VIOLET'
  | 'NAVY_BLUE'
  | 'CLASSIC_BLACK'
  | 'EMERALD_GREEN'
  | 'CRIMSON_RED'
  | 'ROYAL_PURPLE'
  | 'DARK_TEAL'
  | 'AMBER_WARM'
  | 'SLATE_MODERN'
  | 'CUSTOM';

export interface InvoiceColorPalette {
  id: InvoiceColorTheme;
  name: string;
  nameBn: string;
  primary: string;
  secondary: string;
  lightBg: string;
  borderColor: string;
  textColor: string;
}

export interface InvoiceTemplateDef {
  id: InvoiceTemplateStyle;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  badge: string;
}

export type DashboardColorTheme = 'INDIGO' | 'EMERALD' | 'BLUE' | 'ROSE' | 'AMBER' | 'TEAL' | 'VIOLET' | 'SLATE' | 'CUSTOM';

export type BusinessModuleType = 'pharmacy' | 'dokan';

export interface CompanySettings {
  name: string;
  nameBn: string;
  slogan: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  taxNumber: string;
  currencySymbol: string;
  currencyCode: string;
  businessModule?: BusinessModuleType;
  logoUrl?: string;
  signatureUrl?: string;
  invoiceFooter: string;
  defaultVatPercent: number;
  invoicePrintType: 'A4' | 'THERMAL_3INCH' | 'XPRINTER_80MM';
  invoiceTemplate?: InvoiceTemplateStyle;
  invoiceColorTheme?: InvoiceColorTheme;
  invoiceCustomPrimaryColor?: string;
  invoiceCustomAccentColor?: string;
  dashboardColorTheme?: DashboardColorTheme;
  sidebarColorTheme?: DashboardColorTheme;
  sidebarCustomColor?: string;
  smsSenderId?: string;
  apiEndpoint?: string;
  autoSyncEnabled?: boolean;
  autoSyncIntervalSeconds?: number;
  productGenerics?: string[];
  productManufacturers?: string[];
}

export interface CashAdjustment {
  id: string;
  voucherNo: string;
  date: string;
  type: 'CASH_ADD' | 'CASH_WITHDRAW';
  amount: number;
  walletId: string;
  walletName: string;
  reason: string;
  authorizedBy: string;
  createdBy?: string;
  createdAt: string;
}

export interface ExpiredReturnLog {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  batchNumber?: string;
  purchaseInvoiceNo?: string;
  expDate?: string;
  quantity: number;
  unit: UnitType;
  purchasePrice: number;
  totalValue: number;
  actionType: 'RETURN_SUPPLIER' | 'WRITE_OFF' | 'REPLACEMENT';
  date: string;
  notes?: string;
  createdBy?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actionType: 'DELETE' | 'STOCK_ADJUSTMENT' | 'PRICE_CHANGE' | 'SETTINGS_UPDATE' | 'USER_ACTION' | 'LOGIN' | 'LOGOUT';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
  userId?: string;
  userName?: string;
  role?: string;
  targetId?: string;
  targetName?: string;
  ip?: string;
  location?: string;
  device?: string;
  browser?: string;
  os?: string;
}

export type ViewTab =
  | 'dashboard'
  | 'daybook'
  | 'pos'
  | 'quotations'
  | 'sales-list'
  | 'sales-returns'
  | 'deleted-invoices'
  | 'purchase-entry'
  | 'purchase-list'
  | 'purchase-orders'
  | 'purchase-returns'
  | 'deleted-purchases'
  | 'installments'
  | 'products-list'
  | 'medicine'
  | 'batch-inventory'
  | 'categories'
  | 'warranties'
  | 'customers'
  | 'suppliers'
  | 'due-list'
  | 'cash-adjustment'
  | 'utilities'
  | 'hr-payroll'
  | 'expenses'
  | 'wallets'
  | 'users'
  | 'activity-logs'
  | 'settings'
  | 'reports';

export interface DiseaseMasterMedicine {
  medicineName: string;
  genericName: string;
  dosageForm?: string;
  strength?: string;
  manufacturer?: string; // Brand / Company
  batchNumber?: string; // Batch No
  categoryName?: string; // Category
  expDate?: string;
  rackLocation?: string;
  salesPrice?: number;
  stock?: number;
  dosageSchedule: string; // e.g. "১ + ০ + ১ (সকালে ও রাতে)" or "১ + ১ + ১ (৩ বার)"
  frequencyPerDay: number; // e.g. 2
  mealTiming: string; // e.g. "খাওয়ার পর" | "খাওয়ার আগে (খালি পেটে)" | "ভরা পেটে"
  duration: string; // e.g. "৩-৫ দিন"
  instructions?: string; // e.g. "জ্বর ১০১ ডিগ্রীর উপরে গেলে অথবা প্রতি ৬ ঘণ্টা পর পর"
  precautions?: string;
}

export interface DiseaseMasterEntry {
  id: string;
  diseaseName: string;
  diseaseNameBn: string;
  category: string;
  categoryBn?: string;
  symptoms?: string[];
  description?: string;
  recommendedMedicines: DiseaseMasterMedicine[];
}

export interface DiseaseCategoryItem {
  id: string;
  name: string;
  nameBn: string;
  isDefault?: boolean;
}
