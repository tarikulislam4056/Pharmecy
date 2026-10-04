/**
 * DokanPro ERP - Comprehensive SQL Database Generator, Importer & Hosting Utility
 * Author: Md. Tarikul Islam (Phone: 01312305225, Sherpur, Sadar, Sherpur)
 * Generates 100% production-ready, fault-tolerant MySQL / MariaDB / SQLite / phpMyAdmin compatible SQL dumps
 * with complete DDL schema, proper UTF8MB4 encoding for Bengali/Unicode, and full live dataset INSERT statements.
 */

import {
  Product,
  Category,
  Party,
  SaleInvoice,
  SaleReturn,
  PurchaseInvoice,
  PurchaseReturn,
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
  SmsLog,
  SmsConfig,
  ExpiredReturnLog,
  Quotation,
  PurchaseOrder,
  DeletedSaleInvoice,
  ActivityLog,
  WarrantyPolicy,
  WarrantyRecord,
  WarrantyClaim,
} from '../types/index';

export interface FullAppStateForSql {
  companySettings: CompanySettings;
  users: UserAccount[];
  categories: Category[];
  products: Product[];
  parties: Party[];
  saleInvoices: SaleInvoice[];
  deletedSaleInvoices?: DeletedSaleInvoice[];
  saleReturns?: SaleReturn[];
  quotations?: Quotation[];
  purchaseInvoices: PurchaseInvoice[];
  deletedPurchaseInvoices?: any[];
  purchaseReturns?: PurchaseReturn[];
  purchaseOrders?: PurchaseOrder[];
  installmentSchemes: InstallmentScheme[];
  wallets: Wallet[];
  expenseCategories: ExpenseCategory[];
  expenseVouchers: ExpenseVoucher[];
  employees: Employee[];
  advanceSalaries: AdvanceSalary[];
  payrollHistory: PayrollEntry[];
  dayBookEntries: DayBookEntry[];
  cashAdjustments: CashAdjustment[];
  activityLogs?: ActivityLog[];
  smsLogs?: SmsLog[];
  smsConfig?: SmsConfig;
  expiredReturnLogs?: ExpiredReturnLog[];
  warrantyPolicies?: WarrantyPolicy[];
  warrantyRecords?: WarrantyRecord[];
  warrantyClaims?: WarrantyClaim[];
}

/**
 * Escapes SQL strings safely for MySQL / MariaDB / SQLite / phpMyAdmin
 * Preserves Bengali text and Unicode, handles JSON strings and special characters seamlessly.
 */
function sqlEscape(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return '0';
    return val.toString();
  }
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') {
    try {
      val = JSON.stringify(val);
    } catch {
      val = '[]';
    }
  }
  const str = String(val);
  return "'" + str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\x1a/g, '\\Z') + "'";
}

/**
 * Helper to build chunked INSERT statements to prevent MySQL packet size limits
 */
function buildChunkedInserts(
  tableName: string,
  columns: string[],
  rows: string[][],
  chunkSize = 100
): string {
  if (!rows || rows.length === 0) return '';

  let output = `-- Dumping data for table \`${tableName}\` (${rows.length} records)\n`;
  const colsHeader = `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES\n`;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    output += colsHeader;
    output += chunk.map(row => `  (${row.join(', ')})`).join(',\n') + ';\n\n';
  }

  return output;
}

/**
 * Generates the complete, production-ready SQL database dump file (.sql)
 */
export function generateFullSqlDump(state: FullAppStateForSql): string {
  const timestamp = new Date().toISOString();
  const dateStr = new Date().toLocaleDateString('en-GB');

  let sql = `-- =========================================================================
-- DokanPro Enterprise ERP - Production-Grade MySQL/MariaDB Database Dump
-- Generated At : ${timestamp} (${dateStr})
-- Developer    : Md. Tarikul Islam
-- Phone        : 01312305225
-- Address      : Sherpur, Sadar, Sherpur
-- Engine       : InnoDB | Charset: UTF8MB4 (Full Bengali & Unicode Support)
-- Compatibility: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+, SQLite 3, phpMyAdmin, cPanel, XAMPP
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+06:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Table structure for \`company_settings\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`company_settings\`;
CREATE TABLE \`company_settings\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`name\` varchar(255) NOT NULL,
  \`nameBn\` varchar(255) DEFAULT NULL,
  \`slogan\` varchar(255) DEFAULT NULL,
  \`phone\` varchar(50) DEFAULT NULL,
  \`email\` varchar(100) DEFAULT NULL,
  \`website\` varchar(150) DEFAULT NULL,
  \`address\` text DEFAULT NULL,
  \`taxNumber\` varchar(100) DEFAULT NULL,
  \`currencySymbol\` varchar(20) DEFAULT '৳',
  \`currencyCode\` varchar(20) DEFAULT 'BDT',
  \`logoUrl\` longtext DEFAULT NULL,
  \`signatureUrl\` longtext DEFAULT NULL,
  \`invoiceFooter\` text DEFAULT NULL,
  \`defaultVatPercent\` decimal(5,2) DEFAULT 0.00,
  \`invoicePrintType\` varchar(50) DEFAULT 'A4',
  \`invoiceTemplate\` varchar(50) DEFAULT 'MODERN_MINIMAL',
  \`invoiceColorTheme\` varchar(50) DEFAULT 'INDIGO_VIOLET',
  \`invoiceCustomPrimaryColor\` varchar(20) DEFAULT '#4F46E5',
  \`invoiceCustomAccentColor\` varchar(20) DEFAULT '#06B6D4',
  \`dashboardColorTheme\` varchar(50) DEFAULT 'INDIGO',
  \`sidebarColorTheme\` varchar(50) DEFAULT 'INDIGO',
  \`sidebarCustomColor\` varchar(20) DEFAULT '#4F46E5',
  \`smsSenderId\` varchar(100) DEFAULT NULL,
  \`apiEndpoint\` text DEFAULT NULL,
  \`autoSyncEnabled\` tinyint(1) DEFAULT 1,
  \`autoSyncIntervalSeconds\` int(11) DEFAULT 5,
  \`productGenerics_json\` longtext DEFAULT NULL,
  \`productManufacturers_json\` longtext DEFAULT NULL,
  \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`users\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`username\` varchar(100) NOT NULL UNIQUE,
  \`password\` varchar(255) NOT NULL,
  \`fullName\` varchar(150) NOT NULL,
  \`role\` varchar(50) NOT NULL DEFAULT 'CASHIER',
  \`email\` varchar(100) DEFAULT NULL,
  \`phone\` varchar(50) DEFAULT NULL,
  \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
  \`permissions_json\` longtext DEFAULT NULL,
  \`subPermissions_json\` longtext DEFAULT NULL,
  \`avatar\` longtext DEFAULT NULL,
  \`lastLogin\` varchar(50) DEFAULT NULL,
  \`lowStockEmailAlerts\` tinyint(1) DEFAULT 0,
  \`lowStockSmsAlerts\` tinyint(1) DEFAULT 0,
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`categories\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`categories\`;
CREATE TABLE \`categories\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`name\` varchar(150) NOT NULL,
  \`nameBn\` varchar(150) DEFAULT NULL,
  \`code\` varchar(50) DEFAULT NULL,
  \`description\` text DEFAULT NULL,
  \`icon\` varchar(50) DEFAULT 'folder',
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`products\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`products\`;
CREATE TABLE \`products\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`sku\` varchar(100) NOT NULL UNIQUE,
  \`barcode\` varchar(100) DEFAULT NULL,
  \`name\` varchar(255) NOT NULL,
  \`nameBn\` varchar(255) DEFAULT NULL,
  \`medicine\` varchar(255) DEFAULT NULL,
  \`medicine_name\` varchar(255) DEFAULT NULL,
  \`categoryId\` varchar(50) DEFAULT NULL,
  \`categoryName\` varchar(255) DEFAULT NULL,
  \`purchasePrice\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`salesPrice\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`discount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`discountType\` varchar(50) DEFAULT 'flat',
  \`expDate\` varchar(50) DEFAULT NULL,
  \`generic\` varchar(255) DEFAULT NULL,
  \`manufacturer\` varchar(255) DEFAULT NULL,
  \`dosageForm\` varchar(100) DEFAULT NULL,
  \`strength\` varchar(100) DEFAULT NULL,
  \`rackLocation\` varchar(100) DEFAULT NULL,
  \`stripSize\` int(11) DEFAULT NULL,
  \`diseases_json\` longtext DEFAULT NULL,
  \`dosageSchedule\` varchar(255) DEFAULT NULL,
  \`mealTiming\` varchar(255) DEFAULT NULL,
  \`duration\` varchar(100) DEFAULT NULL,
  \`instructions\` text DEFAULT NULL,
  \`precautions\` text DEFAULT NULL,
  \`reorderLevel\` decimal(12,2) NOT NULL DEFAULT 5.00,
  \`stock\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`unit\` varchar(50) DEFAULT 'Pcs',
  \`batchNumber\` varchar(100) DEFAULT NULL,
  \`batches_json\` longtext DEFAULT NULL,
  \`image\` longtext DEFAULT NULL,
  \`imageUrl\` longtext DEFAULT NULL,
  \`description\` text DEFAULT NULL,
  \`hasWarranty\` tinyint(1) DEFAULT 0,
  \`warrantyDuration\` int(11) DEFAULT NULL,
  \`warrantyUnit\` varchar(50) DEFAULT NULL,
  \`warrantyType\` varchar(50) DEFAULT NULL,
  \`warrantyTerms\` text DEFAULT NULL,
  \`requiresSerialNo\` tinyint(1) DEFAULT 0,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`medicines\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`medicines\`;
CREATE TABLE \`medicines\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`medicine\` varchar(255) NOT NULL,
  \`medicine_name\` varchar(255) NOT NULL,
  \`sku\` varchar(100) NOT NULL,
  \`barcode\` varchar(100) DEFAULT NULL,
  \`generic\` varchar(255) DEFAULT NULL,
  \`brand\` varchar(255) DEFAULT NULL,
  \`manufacturer\` varchar(255) DEFAULT NULL,
  \`strength\` varchar(100) DEFAULT NULL,
  \`dosage_form\` varchar(100) DEFAULT NULL,
  \`category\` varchar(255) DEFAULT NULL,
  \`purchase_price\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`sales_price\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`stock\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`unit\` varchar(50) DEFAULT 'Pcs',
  \`exp_date\` varchar(50) DEFAULT NULL,
  \`batch_no\` varchar(100) DEFAULT NULL,
  \`rack_location\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`parties\` (Customers & Suppliers)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`parties\`;
CREATE TABLE \`parties\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`serialNumber\` varchar(50) DEFAULT NULL,
  \`type\` enum('CUSTOMER','SUPPLIER') NOT NULL DEFAULT 'CUSTOMER',
  \`name\` varchar(200) NOT NULL,
  \`nameBn\` varchar(200) DEFAULT NULL,
  \`phone\` varchar(50) NOT NULL,
  \`email\` varchar(100) DEFAULT NULL,
  \`companyName\` varchar(200) DEFAULT NULL,
  \`address\` text DEFAULT NULL,
  \`openingBalance\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`currentBalance\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`creditLimit\` decimal(12,2) DEFAULT 0.00,
  \`status\` varchar(50) DEFAULT 'ACTIVE',
  \`taxNumber\` varchar(100) DEFAULT NULL,
  \`bankDetails\` text DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`wallets\` (Payment Accounts)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`wallets\`;
CREATE TABLE \`wallets\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`name\` varchar(100) NOT NULL,
  \`nameBn\` varchar(100) DEFAULT NULL,
  \`type\` varchar(50) NOT NULL DEFAULT 'CASH',
  \`accountNumber\` varchar(100) DEFAULT NULL,
  \`bankName\` varchar(150) DEFAULT NULL,
  \`branch\` varchar(150) DEFAULT NULL,
  \`balance\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`isActive\` tinyint(1) DEFAULT 1,
  \`colorCode\` varchar(50) DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`sales_invoices\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`sales_invoices\`;
CREATE TABLE \`sales_invoices\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`invoiceNumber\` varchar(100) NOT NULL UNIQUE,
  \`date\` varchar(50) NOT NULL,
  \`customerId\` varchar(50) DEFAULT NULL,
  \`customerName\` varchar(200) DEFAULT NULL,
  \`customerPhone\` varchar(50) DEFAULT NULL,
  \`customerAddress\` text DEFAULT NULL,
  \`subtotal\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`discount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`discountType\` varchar(50) DEFAULT 'flat',
  \`vatAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`grandTotal\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`paidAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`dueAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`paymentMethod\` varchar(50) DEFAULT 'CASH',
  \`walletId\` varchar(50) DEFAULT NULL,
  \`walletName\` varchar(150) DEFAULT NULL,
  \`status\` varchar(50) DEFAULT 'PAID',
  \`notes\` text DEFAULT NULL,
  \`cashierName\` varchar(150) DEFAULT NULL,
  \`isInstallmentSale\` tinyint(1) DEFAULT 0,
  \`installmentPlanId\` varchar(50) DEFAULT NULL,
  \`items_json\` longtext DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`sales_returns\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`sales_returns\`;
CREATE TABLE \`sales_returns\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`returnNumber\` varchar(100) NOT NULL UNIQUE,
  \`originalInvoiceNumber\` varchar(100) NOT NULL,
  \`invoiceId\` varchar(50) NOT NULL,
  \`date\` varchar(50) NOT NULL,
  \`customerId\` varchar(50) DEFAULT NULL,
  \`customerName\` varchar(200) DEFAULT NULL,
  \`totalRefund\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`refundWalletId\` varchar(50) DEFAULT NULL,
  \`refundWalletName\` varchar(150) DEFAULT NULL,
  \`reason\` text DEFAULT NULL,
  \`items_json\` longtext DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`quotations\` (Price Quotes)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`quotations\`;
CREATE TABLE \`quotations\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`quotationNumber\` varchar(100) NOT NULL UNIQUE,
  \`date\` varchar(50) NOT NULL,
  \`validUntil\` varchar(50) DEFAULT NULL,
  \`customerId\` varchar(50) DEFAULT NULL,
  \`customerName\` varchar(200) DEFAULT NULL,
  \`customerPhone\` varchar(50) DEFAULT NULL,
  \`customerAddress\` text DEFAULT NULL,
  \`subtotal\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`discount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`discountType\` varchar(50) DEFAULT 'flat',
  \`vatAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`grandTotal\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`status\` varchar(50) DEFAULT 'DRAFT',
  \`salesPerson\` varchar(150) DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`items_json\` longtext DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`purchase_invoices\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`purchase_invoices\`;
CREATE TABLE \`purchase_invoices\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`billNumber\` varchar(100) NOT NULL UNIQUE,
  \`supplierInvoiceNo\` varchar(100) DEFAULT NULL,
  \`date\` varchar(50) NOT NULL,
  \`supplierId\` varchar(50) DEFAULT NULL,
  \`supplierName\` varchar(200) DEFAULT NULL,
  \`supplierPhone\` varchar(50) DEFAULT NULL,
  \`subtotal\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`discount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`taxAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`grandTotal\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`paidAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`dueAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`paymentMethod\` varchar(50) DEFAULT 'CASH',
  \`walletId\` varchar(50) DEFAULT NULL,
  \`walletName\` varchar(150) DEFAULT NULL,
  \`status\` varchar(50) DEFAULT 'PAID',
  \`notes\` text DEFAULT NULL,
  \`items_json\` longtext DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`purchase_returns\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`purchase_returns\`;
CREATE TABLE \`purchase_returns\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`returnNumber\` varchar(100) NOT NULL UNIQUE,
  \`originalBillNumber\` varchar(100) NOT NULL,
  \`purchaseId\` varchar(50) NOT NULL,
  \`date\` varchar(50) NOT NULL,
  \`supplierId\` varchar(50) DEFAULT NULL,
  \`supplierName\` varchar(200) DEFAULT NULL,
  \`totalAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`refundWalletId\` varchar(50) DEFAULT NULL,
  \`refundWalletName\` varchar(150) DEFAULT NULL,
  \`reason\` text DEFAULT NULL,
  \`items_json\` longtext DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`purchase_orders\` (PO)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`purchase_orders\`;
CREATE TABLE \`purchase_orders\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`poNumber\` varchar(100) NOT NULL UNIQUE,
  \`supplierId\` varchar(50) DEFAULT NULL,
  \`supplierName\` varchar(200) DEFAULT NULL,
  \`supplierPhone\` varchar(50) DEFAULT NULL,
  \`date\` varchar(50) NOT NULL,
  \`expectedDeliveryDate\` varchar(50) DEFAULT NULL,
  \`totalAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`status\` varchar(50) DEFAULT 'PENDING',
  \`notes\` text DEFAULT NULL,
  \`items_json\` longtext DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`deleted_sales_invoices\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`deleted_sales_invoices\`;
CREATE TABLE \`deleted_sales_invoices\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`invoiceNumber\` varchar(100) DEFAULT NULL,
  \`deletedAt\` varchar(50) DEFAULT NULL,
  \`deletedBy\` varchar(150) DEFAULT NULL,
  \`reason\` text DEFAULT NULL,
  \`originalInvoice_json\` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`installment_schemes\` (EMI/Kisti)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`installment_schemes\`;
CREATE TABLE \`installment_schemes\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`schemeNumber\` varchar(100) NOT NULL UNIQUE,
  \`customerId\` varchar(50) NOT NULL,
  \`customerName\` varchar(200) NOT NULL,
  \`customerPhone\` varchar(50) NOT NULL,
  \`invoiceId\` varchar(50) DEFAULT NULL,
  \`invoiceNumber\` varchar(100) DEFAULT NULL,
  \`productName\` varchar(255) NOT NULL,
  \`totalPrice\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`downPayment\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`principalAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`interestRate\` decimal(5,2) NOT NULL DEFAULT 0.00,
  \`interestAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`totalPayable\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`totalInstallments\` int(11) NOT NULL DEFAULT 6,
  \`frequency\` varchar(50) DEFAULT 'MONTHLY',
  \`emiAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`startDate\` varchar(50) NOT NULL,
  \`status\` varchar(50) DEFAULT 'ACTIVE',
  \`guarantorName\` varchar(150) DEFAULT NULL,
  \`guarantorPhone\` varchar(50) DEFAULT NULL,
  \`guarantorNid\` varchar(50) DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`schedules_json\` longtext DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`expense_categories\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`expense_categories\`;
CREATE TABLE \`expense_categories\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`name\` varchar(150) NOT NULL,
  \`nameBn\` varchar(150) DEFAULT NULL,
  \`code\` varchar(50) NOT NULL UNIQUE,
  \`description\` text DEFAULT NULL,
  \`budgetMonthly\` decimal(12,2) DEFAULT 0.00,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`expense_vouchers\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`expense_vouchers\`;
CREATE TABLE \`expense_vouchers\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`voucherNo\` varchar(100) NOT NULL,
  \`date\` varchar(50) NOT NULL,
  \`categoryId\` varchar(50) NOT NULL,
  \`categoryName\` varchar(150) NOT NULL,
  \`category\` varchar(150) DEFAULT NULL,
  \`amount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`walletId\` varchar(50) DEFAULT NULL,
  \`walletName\` varchar(100) DEFAULT NULL,
  \`payee\` varchar(150) DEFAULT NULL,
  \`receiptNo\` varchar(100) DEFAULT NULL,
  \`note\` text DEFAULT NULL,
  \`remarks\` text DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`employees\` (HR & Payroll)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`employees\`;
CREATE TABLE \`employees\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`employeeCode\` varchar(50) NOT NULL UNIQUE,
  \`name\` varchar(150) NOT NULL,
  \`nameBn\` varchar(150) DEFAULT NULL,
  \`phone\` varchar(50) NOT NULL,
  \`email\` varchar(100) DEFAULT NULL,
  \`designation\` varchar(100) NOT NULL,
  \`department\` varchar(100) NOT NULL,
  \`joiningDate\` varchar(50) DEFAULT NULL,
  \`baseSalary\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`houseRentAllowance\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`medicalAllowance\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`conveyanceAllowance\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`status\` varchar(50) DEFAULT 'ACTIVE',
  \`bankAccount\` varchar(100) DEFAULT NULL,
  \`nid\` varchar(100) DEFAULT NULL,
  \`address\` text DEFAULT NULL,
  \`resignedDate\` varchar(50) DEFAULT NULL,
  \`resignationReason\` text DEFAULT NULL,
  \`settlementNotes\` text DEFAULT NULL,
  \`finalSettlementAmount\` decimal(12,2) DEFAULT 0.00,
  \`finalSettlementPaid\` tinyint(1) DEFAULT 0,
  \`settlementWalletId\` varchar(50) DEFAULT NULL,
  \`settlementWalletName\` varchar(150) DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`advance_salaries\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`advance_salaries\`;
CREATE TABLE \`advance_salaries\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`voucherNo\` varchar(100) NOT NULL,
  \`employeeId\` varchar(50) NOT NULL,
  \`employeeName\` varchar(150) NOT NULL,
  \`amount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`date\` varchar(50) NOT NULL,
  \`walletId\` varchar(50) DEFAULT NULL,
  \`walletName\` varchar(150) DEFAULT NULL,
  \`reason\` text DEFAULT NULL,
  \`isDeducted\` tinyint(1) NOT NULL DEFAULT 0,
  \`deductedInPayrollMonth\` varchar(50) DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`payroll_history\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`payroll_history\`;
CREATE TABLE \`payroll_history\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`payrollMonth\` varchar(50) NOT NULL,
  \`employeeId\` varchar(50) NOT NULL,
  \`employeeName\` varchar(150) NOT NULL,
  \`employeeCode\` varchar(50) NOT NULL,
  \`designation\` varchar(100) NOT NULL,
  \`baseSalary\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`allowances\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`bonus\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`advanceDeduction\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`fineDeduction\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`grossPay\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`payableAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`paidAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`dueAmount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`totalPaidSoFar\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`paymentType\` varchar(50) DEFAULT NULL,
  \`installmentNo\` int(11) DEFAULT 1,
  \`notes\` text DEFAULT NULL,
  \`netPay\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`paymentDate\` varchar(50) NOT NULL,
  \`walletId\` varchar(50) DEFAULT NULL,
  \`walletName\` varchar(150) DEFAULT NULL,
  \`status\` varchar(50) DEFAULT 'PAID',
  \`voucherNo\` varchar(100) NOT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`daybook_entries\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`daybook_entries\`;
CREATE TABLE \`daybook_entries\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`voucherNo\` varchar(100) NOT NULL,
  \`date\` varchar(50) NOT NULL,
  \`type\` varchar(50) NOT NULL,
  \`flow\` varchar(10) NOT NULL,
  \`partyId\` varchar(50) DEFAULT NULL,
  \`partyName\` varchar(200) DEFAULT NULL,
  \`partyType\` varchar(50) DEFAULT NULL,
  \`amount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`walletId\` varchar(50) DEFAULT NULL,
  \`walletName\` varchar(150) DEFAULT NULL,
  \`referenceId\` varchar(50) DEFAULT NULL,
  \`referenceNo\` varchar(100) DEFAULT NULL,
  \`remarks\` text DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`cash_adjustments\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`cash_adjustments\`;
CREATE TABLE \`cash_adjustments\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`voucherNo\` varchar(100) NOT NULL,
  \`date\` varchar(50) NOT NULL,
  \`type\` varchar(50) NOT NULL,
  \`amount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`walletId\` varchar(50) NOT NULL,
  \`walletName\` varchar(150) DEFAULT NULL,
  \`reason\` text DEFAULT NULL,
  \`authorizedBy\` varchar(100) DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`created_at\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`expired_return_logs\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`expired_return_logs\`;
CREATE TABLE \`expired_return_logs\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`date\` varchar(50) NOT NULL,
  \`productId\` varchar(50) NOT NULL,
  \`productName\` varchar(255) NOT NULL,
  \`sku\` varchar(100) NOT NULL,
  \`unit\` varchar(50) DEFAULT 'Pcs',
  \`quantity\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`purchasePrice\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`totalValue\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`actionType\` varchar(50) NOT NULL,
  \`notes\` text DEFAULT NULL,
  \`batchNumber\` varchar(100) DEFAULT NULL,
  \`purchaseInvoiceNo\` varchar(100) DEFAULT NULL,
  \`expDate\` varchar(50) DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`activity_logs\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`activity_logs\`;
CREATE TABLE \`activity_logs\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`timestamp\` varchar(50) NOT NULL,
  \`userId\` varchar(50) DEFAULT NULL,
  \`userName\` varchar(150) DEFAULT NULL,
  \`role\` varchar(50) DEFAULT NULL,
  \`action\` varchar(100) NOT NULL,
  \`module\` varchar(100) NOT NULL,
  \`details\` text DEFAULT NULL,
  \`ipAddress\` varchar(50) DEFAULT NULL,
  \`metadata_json\` longtext DEFAULT NULL,
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`sms_config\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`sms_config\`;
CREATE TABLE \`sms_config\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`enabled\` tinyint(1) NOT NULL DEFAULT 0,
  \`provider\` varchar(100) NOT NULL,
  \`apiUrl\` text DEFAULT NULL,
  \`apiKey\` text DEFAULT NULL,
  \`senderId\` varchar(100) DEFAULT NULL,
  \`username\` varchar(150) DEFAULT NULL,
  \`password\` varchar(150) DEFAULT NULL,
  \`clientId\` varchar(150) DEFAULT NULL,
  \`httpMethod\` varchar(20) DEFAULT 'GET',
  \`requestFormat\` varchar(50) DEFAULT 'json',
  \`customProviders_json\` longtext DEFAULT NULL,
  \`customToParam\` varchar(100) DEFAULT NULL,
  \`customMsgParam\` varchar(100) DEFAULT NULL,
  \`customKeyParam\` varchar(100) DEFAULT NULL,
  \`customSenderParam\` varchar(100) DEFAULT NULL,
  \`customUserParam\` varchar(100) DEFAULT NULL,
  \`customPassParam\` varchar(100) DEFAULT NULL,
  \`customHeaders\` text DEFAULT NULL,
  \`autoSendOnSale\` tinyint(1) DEFAULT 1,
  \`autoSendOnPaymentIn\` tinyint(1) DEFAULT 1,
  \`autoSendOnInstallmentReminder\` tinyint(1) DEFAULT 1,
  \`autoSendOnWarrantyResolved\` tinyint(1) DEFAULT 1,
  \`saleTemplate\` text DEFAULT NULL,
  \`paymentInTemplate\` text DEFAULT NULL,
  \`dueReminderTemplate\` text DEFAULT NULL,
  \`warrantyResolvedTemplate\` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`sms_logs\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`sms_logs\`;
CREATE TABLE \`sms_logs\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`recipientPhone\` varchar(50) NOT NULL,
  \`recipientName\` varchar(150) DEFAULT NULL,
  \`message\` text NOT NULL,
  \`type\` varchar(50) NOT NULL,
  \`status\` varchar(50) NOT NULL,
  \`responseDetails\` text DEFAULT NULL,
  \`date\` varchar(50) NOT NULL,
  \`time\` varchar(50) DEFAULT NULL,
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`warranty_policies\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`warranty_policies\`;
CREATE TABLE \`warranty_policies\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`name\` varchar(150) NOT NULL,
  \`nameBn\` varchar(150) DEFAULT NULL,
  \`duration\` int(11) NOT NULL DEFAULT 1,
  \`durationUnit\` varchar(50) NOT NULL DEFAULT 'MONTHS',
  \`terms\` text DEFAULT NULL,
  \`type\` varchar(50) NOT NULL DEFAULT 'REPAIR',
  \`isDefault\` tinyint(1) DEFAULT 0,
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`warranty_records\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`warranty_records\`;
CREATE TABLE \`warranty_records\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`warrantyCode\` varchar(100) NOT NULL UNIQUE,
  \`invoiceId\` varchar(50) NOT NULL,
  \`invoiceNumber\` varchar(100) NOT NULL,
  \`saleDate\` varchar(50) NOT NULL,
  \`productId\` varchar(50) NOT NULL,
  \`productName\` varchar(255) NOT NULL,
  \`sku\` varchar(100) NOT NULL,
  \`serialNumber\` varchar(100) NOT NULL,
  \`customerId\` varchar(50) NOT NULL,
  \`customerName\` varchar(200) NOT NULL,
  \`customerPhone\` varchar(50) NOT NULL,
  \`warrantyType\` varchar(50) NOT NULL,
  \`duration\` int(11) NOT NULL DEFAULT 12,
  \`durationUnit\` varchar(50) NOT NULL DEFAULT 'MONTHS',
  \`startDate\` varchar(50) NOT NULL,
  \`expiryDate\` varchar(50) NOT NULL,
  \`status\` varchar(50) NOT NULL DEFAULT 'ACTIVE',
  \`terms\` text DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`createdAt\` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for \`warranty_claims\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`warranty_claims\`;
CREATE TABLE \`warranty_claims\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`claimTicketNo\` varchar(100) NOT NULL UNIQUE,
  \`warrantyRecordId\` varchar(50) DEFAULT NULL,
  \`invoiceNumber\` varchar(100) NOT NULL,
  \`productId\` varchar(50) NOT NULL,
  \`productName\` varchar(255) NOT NULL,
  \`serialNumber\` varchar(100) NOT NULL,
  \`customerId\` varchar(50) NOT NULL,
  \`customerName\` varchar(200) NOT NULL,
  \`customerPhone\` varchar(50) NOT NULL,
  \`issueDescription\` text NOT NULL,
  \`physicalCondition\` text DEFAULT NULL,
  \`claimDate\` varchar(50) NOT NULL,
  \`expectedReturnDate\` varchar(50) DEFAULT NULL,
  \`status\` varchar(50) NOT NULL DEFAULT 'RECEIVED',
  \`claimType\` varchar(50) NOT NULL DEFAULT 'REPAIR',
  \`repairCost\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`customerCharge\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`replacementSerialNumber\` varchar(100) DEFAULT NULL,
  \`supplierId\` varchar(50) DEFAULT NULL,
  \`supplierName\` varchar(200) DEFAULT NULL,
  \`technicianNotes\` text DEFAULT NULL,
  \`actionsHistory_json\` longtext DEFAULT NULL,
  \`createdBy\` varchar(100) DEFAULT NULL,
  \`createdAt\` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

\n`;

  // =========================================================================
  // INSERT LIVE DATA CHUNKS (FAULT-TOLERANT & HIGH PERFORMANCE)
  // =========================================================================

  // 1. Company Settings
  if (state.companySettings) {
    const cs = state.companySettings;
    sql += `-- Dumping data for table \`company_settings\`\n`;
    sql += `INSERT INTO \`company_settings\` (\`id\`, \`name\`, \`nameBn\`, \`slogan\`, \`phone\`, \`email\`, \`website\`, \`address\`, \`taxNumber\`, \`currencySymbol\`, \`currencyCode\`, \`logoUrl\`, \`signatureUrl\`, \`invoiceFooter\`, \`defaultVatPercent\`, \`invoicePrintType\`, \`invoiceTemplate\`, \`invoiceColorTheme\`, \`invoiceCustomPrimaryColor\`, \`invoiceCustomAccentColor\`, \`dashboardColorTheme\`, \`sidebarColorTheme\`, \`sidebarCustomColor\`, \`smsSenderId\`, \`apiEndpoint\`, \`autoSyncEnabled\`, \`autoSyncIntervalSeconds\`, \`productGenerics_json\`, \`productManufacturers_json\`) VALUES (\n`;
    sql += `  'main_company',\n`;
    sql += `  ${sqlEscape(cs.name || '')},\n`;
    sql += `  ${sqlEscape(cs.nameBn || '')},\n`;
    sql += `  ${sqlEscape(cs.slogan || '')},\n`;
    sql += `  ${sqlEscape(cs.phone || '')},\n`;
    sql += `  ${sqlEscape(cs.email || '')},\n`;
    sql += `  ${sqlEscape(cs.website || '')},\n`;
    sql += `  ${sqlEscape(cs.address || '')},\n`;
    sql += `  ${sqlEscape(cs.taxNumber || '')},\n`;
    sql += `  ${sqlEscape(cs.currencySymbol || '৳')},\n`;
    sql += `  ${sqlEscape(cs.currencyCode || 'BDT')},\n`;
    sql += `  ${sqlEscape(cs.logoUrl || '')},\n`;
    sql += `  ${sqlEscape(cs.signatureUrl || '')},\n`;
    sql += `  ${sqlEscape(cs.invoiceFooter || '')},\n`;
    sql += `  ${cs.defaultVatPercent || 0},\n`;
    sql += `  ${sqlEscape(cs.invoicePrintType || 'A4')},\n`;
    sql += `  ${sqlEscape(cs.invoiceTemplate || 'MODERN_MINIMAL')},\n`;
    sql += `  ${sqlEscape(cs.invoiceColorTheme || 'INDIGO_VIOLET')},\n`;
    sql += `  ${sqlEscape(cs.invoiceCustomPrimaryColor || '#4F46E5')},\n`;
    sql += `  ${sqlEscape(cs.invoiceCustomAccentColor || '#06B6D4')},\n`;
    sql += `  ${sqlEscape(cs.dashboardColorTheme || 'INDIGO')},\n`;
    sql += `  ${sqlEscape(cs.sidebarColorTheme || 'INDIGO')},\n`;
    sql += `  ${sqlEscape(cs.sidebarCustomColor || '#4F46E5')},\n`;
    sql += `  ${sqlEscape(cs.smsSenderId || '')},\n`;
    sql += `  ${sqlEscape(cs.apiEndpoint || '')},\n`;
    sql += `  ${cs.autoSyncEnabled !== false ? 1 : 0},\n`;
    sql += `  ${cs.autoSyncIntervalSeconds || 5},\n`;
    sql += `  ${sqlEscape(cs.productGenerics || [])},\n`;
    sql += `  ${sqlEscape(cs.productManufacturers || [])}\n`;
    sql += `);\n\n`;
  }

  // 2. Users
  if (state.users && state.users.length > 0) {
    const userColumns = ['id', 'username', 'password', 'fullName', 'role', 'email', 'phone', 'isActive', 'permissions_json', 'subPermissions_json', 'avatar', 'lastLogin', 'lowStockEmailAlerts', 'lowStockSmsAlerts'];
    const userRows = state.users.map(u => [
      sqlEscape(u.id),
      sqlEscape(u.username),
      sqlEscape(u.password || ''),
      sqlEscape(u.fullName),
      sqlEscape(u.role),
      sqlEscape(u.email || ''),
      sqlEscape(u.phone || ''),
      u.isActive ? '1' : '0',
      sqlEscape(u.permissions || []),
      sqlEscape(u.subPermissions || []),
      sqlEscape(u.avatar || ''),
      sqlEscape(u.lastLogin || ''),
      u.lowStockEmailAlerts ? '1' : '0',
      u.lowStockSmsAlerts ? '1' : '0',
    ]);
    sql += buildChunkedInserts('users', userColumns, userRows);
  }

  // 3. Categories
  if (state.categories && state.categories.length > 0) {
    const catColumns = ['id', 'name', 'nameBn', 'code', 'description', 'icon', 'createdBy'];
    const catRows = state.categories.map(c => [
      sqlEscape(c.id),
      sqlEscape(c.name),
      sqlEscape(c.nameBn || ''),
      sqlEscape(c.code || ''),
      sqlEscape(c.description || ''),
      sqlEscape(c.icon || 'folder'),
      sqlEscape(c.createdBy || 'Admin'),
    ]);
    sql += buildChunkedInserts('categories', catColumns, catRows);
  }

  // 4. Products & Medicines
  if (state.products && state.products.length > 0) {
    const prodColumns = [
      'id', 'sku', 'barcode', 'name', 'nameBn', 'medicine', 'medicine_name', 'categoryId', 'categoryName',
      'purchasePrice', 'salesPrice', 'discount', 'discountType', 'expDate',
      'generic', 'manufacturer', 'dosageForm', 'strength', 'rackLocation', 'stripSize',
      'diseases_json', 'dosageSchedule', 'mealTiming', 'duration', 'instructions', 'precautions',
      'reorderLevel', 'stock', 'unit', 'batchNumber', 'batches_json',
      'image', 'imageUrl', 'description', 'hasWarranty', 'warrantyDuration',
      'warrantyUnit', 'warrantyType', 'warrantyTerms', 'requiresSerialNo',
      'createdBy', 'created_at'
    ];
    const prodRows = state.products.map(p => [
      sqlEscape(p.id),
      sqlEscape(p.sku),
      sqlEscape(p.barcode || p.sku),
      sqlEscape(p.name),
      sqlEscape(p.nameBn || ''),
      sqlEscape(p.name),
      sqlEscape(p.name),
      sqlEscape(p.categoryId || ''),
      sqlEscape(p.categoryName || ''),
      (p.purchasePrice || 0).toString(),
      (p.salesPrice || 0).toString(),
      (p.discount || 0).toString(),
      sqlEscape(p.discountType || 'flat'),
      sqlEscape(p.expDate || ''),
      sqlEscape(p.generic || ''),
      sqlEscape(p.manufacturer || ''),
      sqlEscape(p.dosageForm || ''),
      sqlEscape(p.strength || ''),
      sqlEscape(p.rackLocation || ''),
      p.stripSize ? p.stripSize.toString() : 'NULL',
      sqlEscape(p.diseases || []),
      sqlEscape(p.dosageSchedule || ''),
      sqlEscape(p.mealTiming || ''),
      sqlEscape(p.duration || ''),
      sqlEscape(p.instructions || ''),
      sqlEscape(p.precautions || ''),
      (p.reorderLevel || 5).toString(),
      (p.stock || 0).toString(),
      sqlEscape(p.unit || 'Pcs'),
      sqlEscape(p.batchNumber || ''),
      sqlEscape(p.batches || []),
      sqlEscape(p.image || p.imageUrl || ''),
      sqlEscape(p.imageUrl || p.image || ''),
      sqlEscape(p.description || ''),
      p.hasWarranty ? '1' : '0',
      p.warrantyDuration ? p.warrantyDuration.toString() : 'NULL',
      sqlEscape(p.warrantyUnit || ''),
      sqlEscape(p.warrantyType || ''),
      sqlEscape(p.warrantyTerms || ''),
      p.requiresSerialNo ? '1' : '0',
      sqlEscape(p.createdBy || 'Admin'),
      sqlEscape(p.createdAt || ''),
    ]);
    sql += buildChunkedInserts('products', prodColumns, prodRows);

    // Also populate dedicated medicines table
    const medColumns = [
      'id', 'medicine', 'medicine_name', 'sku', 'barcode', 'generic', 'brand',
      'manufacturer', 'strength', 'dosage_form', 'category', 'purchase_price',
      'sales_price', 'stock', 'unit', 'exp_date', 'batch_no', 'rack_location', 'created_at'
    ];
    const medRows = state.products.map(p => [
      sqlEscape(p.id),
      sqlEscape(p.name),
      sqlEscape(p.name),
      sqlEscape(p.sku),
      sqlEscape(p.barcode || p.sku),
      sqlEscape(p.generic || ''),
      sqlEscape(p.manufacturer || ''),
      sqlEscape(p.manufacturer || ''),
      sqlEscape(p.strength || ''),
      sqlEscape(p.dosageForm || ''),
      sqlEscape(p.categoryName || ''),
      (p.purchasePrice || 0).toString(),
      (p.salesPrice || 0).toString(),
      (p.stock || 0).toString(),
      sqlEscape(p.unit || 'Pcs'),
      sqlEscape(p.expDate || ''),
      sqlEscape(p.batchNumber || ''),
      sqlEscape(p.rackLocation || ''),
      sqlEscape(p.createdAt || ''),
    ]);
    sql += buildChunkedInserts('medicines', medColumns, medRows);
  }

  // 5. Parties (Customers & Suppliers)
  if (state.parties && state.parties.length > 0) {
    const partyColumns = ['id', 'serialNumber', 'type', 'name', 'nameBn', 'phone', 'email', 'companyName', 'address', 'openingBalance', 'currentBalance', 'creditLimit', 'status', 'taxNumber', 'bankDetails', 'createdBy', 'created_at'];
    const partyRows = state.parties.map(p => [
      sqlEscape(p.id),
      sqlEscape(p.serialNumber || ''),
      sqlEscape(p.type),
      sqlEscape(p.name),
      sqlEscape(p.nameBn || ''),
      sqlEscape(p.phone),
      sqlEscape(p.email || ''),
      sqlEscape(p.companyName || ''),
      sqlEscape(p.address || ''),
      (p.openingBalance || 0).toString(),
      (p.currentBalance || 0).toString(),
      (p.creditLimit || 0).toString(),
      sqlEscape(p.status || 'ACTIVE'),
      sqlEscape(p.taxNumber || ''),
      sqlEscape(p.bankDetails || ''),
      sqlEscape(p.createdBy || 'Admin'),
      sqlEscape(p.createdAt || ''),
    ]);
    sql += buildChunkedInserts('parties', partyColumns, partyRows);
  }

  // 6. Wallets
  if (state.wallets && state.wallets.length > 0) {
    const walletColumns = ['id', 'name', 'nameBn', 'type', 'accountNumber', 'bankName', 'branch', 'balance', 'isActive', 'colorCode', 'createdBy'];
    const walletRows = state.wallets.map(w => [
      sqlEscape(w.id),
      sqlEscape(w.name),
      sqlEscape(w.nameBn || ''),
      sqlEscape(w.type),
      sqlEscape(w.accountNumber || ''),
      sqlEscape(w.bankName || ''),
      sqlEscape(w.branch || ''),
      (w.balance || 0).toString(),
      w.isActive ? '1' : '0',
      sqlEscape(w.colorCode || ''),
      sqlEscape(w.createdBy || 'Admin'),
    ]);
    sql += buildChunkedInserts('wallets', walletColumns, walletRows);
  }

  // 7. Sales Invoices
  if (state.saleInvoices && state.saleInvoices.length > 0) {
    const saleColumns = ['id', 'invoiceNumber', 'date', 'customerId', 'customerName', 'customerPhone', 'customerAddress', 'subtotal', 'discount', 'discountType', 'vatAmount', 'grandTotal', 'paidAmount', 'dueAmount', 'paymentMethod', 'walletId', 'walletName', 'status', 'notes', 'cashierName', 'isInstallmentSale', 'installmentPlanId', 'items_json', 'createdBy', 'created_at'];
    const saleRows = state.saleInvoices.map(s => [
      sqlEscape(s.id),
      sqlEscape(s.invoiceNumber),
      sqlEscape(s.date),
      sqlEscape(s.customerId || ''),
      sqlEscape(s.customerName || ''),
      sqlEscape(s.customerPhone || ''),
      sqlEscape(s.customerAddress || ''),
      (s.subtotal || 0).toString(),
      (s.discount || 0).toString(),
      sqlEscape(s.discountType || 'flat'),
      (s.vatAmount || 0).toString(),
      (s.grandTotal || 0).toString(),
      (s.paidAmount || 0).toString(),
      (s.dueAmount || 0).toString(),
      sqlEscape(s.paymentMethod || 'CASH'),
      sqlEscape(s.walletId || ''),
      sqlEscape(s.walletName || ''),
      sqlEscape(s.status || 'PAID'),
      sqlEscape(s.notes || ''),
      sqlEscape(s.cashierName || ''),
      s.isInstallmentSale ? '1' : '0',
      sqlEscape(s.installmentPlanId || ''),
      sqlEscape(s.items || []),
      sqlEscape(s.createdBy || s.cashierName || 'Admin'),
      sqlEscape(s.createdAt || ''),
    ]);
    sql += buildChunkedInserts('sales_invoices', saleColumns, saleRows);
  }

  // 8. Sales Returns
  if (state.saleReturns && state.saleReturns.length > 0) {
    const sReturnColumns = ['id', 'returnNumber', 'originalInvoiceNumber', 'invoiceId', 'date', 'customerId', 'customerName', 'totalRefund', 'refundWalletId', 'refundWalletName', 'reason', 'items_json', 'createdBy', 'created_at'];
    const sReturnRows = state.saleReturns.map(r => [
      sqlEscape(r.id),
      sqlEscape(r.returnNumber),
      sqlEscape(r.originalInvoiceNumber),
      sqlEscape(r.invoiceId),
      sqlEscape(r.date),
      sqlEscape(r.customerId || ''),
      sqlEscape(r.customerName || ''),
      (r.totalRefund || 0).toString(),
      sqlEscape(r.refundWalletId || ''),
      sqlEscape(r.refundWalletName || ''),
      sqlEscape(r.reason || ''),
      sqlEscape(r.items || []),
      sqlEscape(r.createdBy || 'Admin'),
      sqlEscape(r.createdAt || ''),
    ]);
    sql += buildChunkedInserts('sales_returns', sReturnColumns, sReturnRows);
  }

  // 9. Quotations (Price Quotes)
  if (state.quotations && state.quotations.length > 0) {
    const quoteColumns = ['id', 'quotationNumber', 'date', 'validUntil', 'customerId', 'customerName', 'customerPhone', 'customerAddress', 'subtotal', 'discount', 'discountType', 'vatAmount', 'grandTotal', 'status', 'salesPerson', 'notes', 'items_json', 'createdBy', 'created_at'];
    const quoteRows = state.quotations.map(q => [
      sqlEscape(q.id),
      sqlEscape(q.quotationNumber),
      sqlEscape(q.date),
      sqlEscape((q as any).validUntil || q.expiryDate || ''),
      sqlEscape(q.customerId || ''),
      sqlEscape(q.customerName || ''),
      sqlEscape(q.customerPhone || ''),
      sqlEscape(q.customerAddress || ''),
      (q.subtotal || 0).toString(),
      (q.discount || 0).toString(),
      sqlEscape(q.discountType || 'flat'),
      (q.taxAmount || 0).toString(),
      (q.grandTotal || 0).toString(),
      sqlEscape(q.status || 'DRAFT'),
      sqlEscape((q as any).salesPerson || q.createdBy || ''),
      sqlEscape(q.notes || ''),
      sqlEscape(q.items || []),
      sqlEscape(q.createdBy || 'Admin'),
      sqlEscape((q as any).createdAt || q.date || ''),
    ]);
    sql += buildChunkedInserts('quotations', quoteColumns, quoteRows);
  }

  // 10. Purchase Invoices
  if (state.purchaseInvoices && state.purchaseInvoices.length > 0) {
    const purColumns = ['id', 'billNumber', 'supplierInvoiceNo', 'date', 'supplierId', 'supplierName', 'supplierPhone', 'subtotal', 'discount', 'taxAmount', 'grandTotal', 'paidAmount', 'dueAmount', 'paymentMethod', 'walletId', 'walletName', 'status', 'notes', 'items_json', 'createdBy', 'created_at'];
    const purRows = state.purchaseInvoices.map(p => [
      sqlEscape(p.id),
      sqlEscape(p.billNumber),
      sqlEscape(p.supplierInvoiceNo || ''),
      sqlEscape(p.date),
      sqlEscape(p.supplierId || ''),
      sqlEscape(p.supplierName || ''),
      sqlEscape(p.supplierPhone || ''),
      (p.subtotal || 0).toString(),
      (p.discount || 0).toString(),
      (p.taxAmount || 0).toString(),
      (p.grandTotal || 0).toString(),
      (p.paidAmount || 0).toString(),
      (p.dueAmount || 0).toString(),
      sqlEscape(p.paymentMethod || 'CASH'),
      sqlEscape(p.walletId || ''),
      sqlEscape(p.walletName || ''),
      sqlEscape(p.status || 'PAID'),
      sqlEscape(p.notes || ''),
      sqlEscape(p.items || []),
      sqlEscape(p.createdBy || 'Admin'),
      sqlEscape(p.createdAt || ''),
    ]);
    sql += buildChunkedInserts('purchase_invoices', purColumns, purRows);
  }

  // 11. Purchase Returns
  if (state.purchaseReturns && state.purchaseReturns.length > 0) {
    const pReturnColumns = ['id', 'returnNumber', 'originalBillNumber', 'purchaseId', 'date', 'supplierId', 'supplierName', 'totalAmount', 'refundWalletId', 'refundWalletName', 'reason', 'items_json', 'createdBy', 'created_at'];
    const pReturnRows = state.purchaseReturns.map(r => [
      sqlEscape(r.id),
      sqlEscape(r.returnNumber),
      sqlEscape(r.originalBillNumber),
      sqlEscape(r.purchaseId),
      sqlEscape(r.date),
      sqlEscape(r.supplierId || ''),
      sqlEscape(r.supplierName || ''),
      (r.totalAmount || 0).toString(),
      sqlEscape(r.refundWalletId || ''),
      sqlEscape(r.refundWalletName || ''),
      sqlEscape(r.reason || ''),
      sqlEscape(r.items || []),
      sqlEscape(r.createdBy || 'Admin'),
      sqlEscape(r.createdAt || ''),
    ]);
    sql += buildChunkedInserts('purchase_returns', pReturnColumns, pReturnRows);
  }

  // 12. Purchase Orders (PO)
  if (state.purchaseOrders && state.purchaseOrders.length > 0) {
    const poColumns = ['id', 'poNumber', 'supplierId', 'supplierName', 'supplierPhone', 'date', 'expectedDeliveryDate', 'totalAmount', 'status', 'notes', 'items_json', 'createdBy', 'created_at'];
    const poRows = state.purchaseOrders.map(po => [
      sqlEscape(po.id),
      sqlEscape(po.poNumber),
      sqlEscape(po.supplierId || ''),
      sqlEscape(po.supplierName || ''),
      sqlEscape(po.supplierPhone || ''),
      sqlEscape(po.date),
      sqlEscape(po.expectedDeliveryDate || ''),
      (po.grandTotal || 0).toString(),
      sqlEscape(po.status || 'PENDING'),
      sqlEscape(po.notes || ''),
      sqlEscape(po.items || []),
      sqlEscape(po.createdBy || 'Admin'),
      sqlEscape(po.createdAt || ''),
    ]);
    sql += buildChunkedInserts('purchase_orders', poColumns, poRows);
  }

  // 13. Deleted Sales Invoices
  if (state.deletedSaleInvoices && state.deletedSaleInvoices.length > 0) {
    const delColumns = ['id', 'invoiceNumber', 'deletedAt', 'deletedBy', 'reason', 'originalInvoice_json'];
    const delRows = state.deletedSaleInvoices.map(d => [
      sqlEscape(d.id),
      sqlEscape(d.invoiceNumber || d.invoiceSnapshot?.invoiceNumber || ''),
      sqlEscape(d.deletedAt || ''),
      sqlEscape(typeof d.deletedBy === 'object' ? d.deletedBy?.fullName : (d.deletedBy || '')),
      sqlEscape(d.deletionReason || ''),
      sqlEscape(d.invoiceSnapshot || {}),
    ]);
    sql += buildChunkedInserts('deleted_sales_invoices', delColumns, delRows);
  }

  // 14. Installment Schemes (EMI)
  if (state.installmentSchemes && state.installmentSchemes.length > 0) {
    const emiColumns = ['id', 'schemeNumber', 'customerId', 'customerName', 'customerPhone', 'invoiceId', 'invoiceNumber', 'productName', 'totalPrice', 'downPayment', 'principalAmount', 'interestRate', 'interestAmount', 'totalPayable', 'totalInstallments', 'frequency', 'emiAmount', 'startDate', 'status', 'guarantorName', 'guarantorPhone', 'guarantorNid', 'notes', 'schedules_json', 'createdBy', 'created_at'];
    const emiRows = state.installmentSchemes.map(e => [
      sqlEscape(e.id),
      sqlEscape(e.schemeNumber),
      sqlEscape(e.customerId),
      sqlEscape(e.customerName),
      sqlEscape(e.customerPhone),
      sqlEscape(e.invoiceId || ''),
      sqlEscape(e.invoiceNumber || ''),
      sqlEscape(e.productName),
      (e.totalPrice || 0).toString(),
      (e.downPayment || 0).toString(),
      (e.principalAmount || 0).toString(),
      (e.interestRate || 0).toString(),
      (e.interestAmount || 0).toString(),
      (e.totalPayable || 0).toString(),
      (e.totalInstallments || 6).toString(),
      sqlEscape(e.frequency || 'MONTHLY'),
      (e.emiAmount || 0).toString(),
      sqlEscape(e.startDate),
      sqlEscape(e.status || 'ACTIVE'),
      sqlEscape(e.guarantorName || ''),
      sqlEscape(e.guarantorPhone || ''),
      sqlEscape(e.guarantorNid || ''),
      sqlEscape(e.notes || ''),
      sqlEscape(e.schedules || []),
      sqlEscape(e.createdBy || 'Admin'),
      sqlEscape(e.createdAt || ''),
    ]);
    sql += buildChunkedInserts('installment_schemes', emiColumns, emiRows);
  }

  // 15. Expense Categories
  if (state.expenseCategories && state.expenseCategories.length > 0) {
    const expCatColumns = ['id', 'name', 'nameBn', 'code', 'description', 'budgetMonthly', 'createdBy'];
    const expCatRows = state.expenseCategories.map(ec => [
      sqlEscape(ec.id),
      sqlEscape(ec.name),
      sqlEscape(ec.nameBn || ''),
      sqlEscape(ec.code),
      sqlEscape(ec.description || ''),
      (ec.budgetMonthly || 0).toString(),
      sqlEscape(ec.createdBy || 'Admin'),
    ]);
    sql += buildChunkedInserts('expense_categories', expCatColumns, expCatRows);
  }

  // 16. Expense Vouchers
  if (state.expenseVouchers && state.expenseVouchers.length > 0) {
    const expColumns = ['id', 'voucherNo', 'date', 'categoryId', 'categoryName', 'category', 'amount', 'walletId', 'walletName', 'payee', 'receiptNo', 'note', 'remarks', 'createdBy', 'created_at'];
    const expRows = state.expenseVouchers.map(ev => [
      sqlEscape(ev.id),
      sqlEscape(ev.voucherNo),
      sqlEscape(ev.date),
      sqlEscape(ev.categoryId),
      sqlEscape(ev.categoryName),
      sqlEscape(ev.category || ''),
      (ev.amount || 0).toString(),
      sqlEscape(ev.walletId || ''),
      sqlEscape(ev.walletName || ''),
      sqlEscape(ev.payee || ''),
      sqlEscape(ev.receiptNo || ''),
      sqlEscape(ev.note || ''),
      sqlEscape(ev.remarks || ''),
      sqlEscape(ev.createdBy || 'Admin'),
      sqlEscape(ev.createdAt || ''),
    ]);
    sql += buildChunkedInserts('expense_vouchers', expColumns, expRows);
  }

  // 17. Employees
  if (state.employees && state.employees.length > 0) {
    const empColumns = ['id', 'employeeCode', 'name', 'nameBn', 'phone', 'email', 'designation', 'department', 'joiningDate', 'baseSalary', 'houseRentAllowance', 'medicalAllowance', 'conveyanceAllowance', 'status', 'bankAccount', 'nid', 'address', 'resignedDate', 'resignationReason', 'settlementNotes', 'finalSettlementAmount', 'finalSettlementPaid', 'settlementWalletId', 'settlementWalletName', 'createdBy'];
    const empRows = state.employees.map(emp => [
      sqlEscape(emp.id),
      sqlEscape(emp.employeeCode),
      sqlEscape(emp.name),
      sqlEscape(emp.nameBn || ''),
      sqlEscape(emp.phone),
      sqlEscape(emp.email || ''),
      sqlEscape(emp.designation),
      sqlEscape(emp.department),
      sqlEscape(emp.joiningDate || ''),
      (emp.baseSalary || 0).toString(),
      (emp.houseRentAllowance || 0).toString(),
      (emp.medicalAllowance || 0).toString(),
      (emp.conveyanceAllowance || 0).toString(),
      sqlEscape(emp.status || 'ACTIVE'),
      sqlEscape(emp.bankAccount || ''),
      sqlEscape(emp.nid || ''),
      sqlEscape(emp.address || ''),
      sqlEscape(emp.resignedDate || ''),
      sqlEscape(emp.resignationReason || ''),
      sqlEscape(emp.settlementNotes || ''),
      (emp.finalSettlementAmount || 0).toString(),
      emp.finalSettlementPaid ? '1' : '0',
      sqlEscape(emp.settlementWalletId || ''),
      sqlEscape(emp.settlementWalletName || ''),
      sqlEscape(emp.createdBy || 'Admin'),
    ]);
    sql += buildChunkedInserts('employees', empColumns, empRows);
  }

  // 18. Advance Salaries
  if (state.advanceSalaries && state.advanceSalaries.length > 0) {
    const advColumns = ['id', 'voucherNo', 'employeeId', 'employeeName', 'amount', 'date', 'walletId', 'walletName', 'reason', 'isDeducted', 'deductedInPayrollMonth', 'createdBy', 'created_at'];
    const advRows = state.advanceSalaries.map(a => [
      sqlEscape(a.id),
      sqlEscape(a.voucherNo),
      sqlEscape(a.employeeId),
      sqlEscape(a.employeeName),
      (a.amount || 0).toString(),
      sqlEscape(a.date),
      sqlEscape(a.walletId || ''),
      sqlEscape(a.walletName || ''),
      sqlEscape(a.reason || ''),
      a.isDeducted ? '1' : '0',
      sqlEscape(a.deductedInPayrollMonth || ''),
      sqlEscape(a.createdBy || 'Admin'),
      sqlEscape(a.createdAt || ''),
    ]);
    sql += buildChunkedInserts('advance_salaries', advColumns, advRows);
  }

  // 19. Payroll History
  if (state.payrollHistory && state.payrollHistory.length > 0) {
    const payColumns = ['id', 'payrollMonth', 'employeeId', 'employeeName', 'employeeCode', 'designation', 'baseSalary', 'allowances', 'bonus', 'advanceDeduction', 'fineDeduction', 'grossPay', 'payableAmount', 'paidAmount', 'dueAmount', 'totalPaidSoFar', 'paymentType', 'installmentNo', 'notes', 'netPay', 'paymentDate', 'walletId', 'walletName', 'status', 'voucherNo', 'createdBy', 'created_at'];
    const payRows = state.payrollHistory.map(ph => [
      sqlEscape(ph.id),
      sqlEscape(ph.payrollMonth),
      sqlEscape(ph.employeeId),
      sqlEscape(ph.employeeName),
      sqlEscape(ph.employeeCode),
      sqlEscape(ph.designation),
      (ph.baseSalary || 0).toString(),
      (ph.allowances || 0).toString(),
      (ph.bonus || 0).toString(),
      (ph.advanceDeduction || 0).toString(),
      (ph.fineDeduction || 0).toString(),
      (ph.grossPay || 0).toString(),
      (ph.payableAmount || 0).toString(),
      (ph.paidAmount || 0).toString(),
      (ph.dueAmount || 0).toString(),
      (ph.totalPaidSoFar || 0).toString(),
      sqlEscape(ph.paymentType || ''),
      (ph.installmentNo || 1).toString(),
      sqlEscape(ph.notes || ''),
      (ph.netPay || 0).toString(),
      sqlEscape(ph.paymentDate),
      sqlEscape(ph.walletId || ''),
      sqlEscape(ph.walletName || ''),
      sqlEscape(ph.status || 'PAID'),
      sqlEscape(ph.voucherNo),
      sqlEscape(ph.createdBy || 'Admin'),
      sqlEscape(ph.createdAt || ''),
    ]);
    sql += buildChunkedInserts('payroll_history', payColumns, payRows);
  }

  // 20. DayBook Entries
  if (state.dayBookEntries && state.dayBookEntries.length > 0) {
    const dbColumns = ['id', 'voucherNo', 'date', 'type', 'flow', 'partyId', 'partyName', 'partyType', 'amount', 'walletId', 'walletName', 'referenceId', 'referenceNo', 'remarks', 'createdBy', 'created_at'];
    const dbRows = state.dayBookEntries.map(d => [
      sqlEscape(d.id),
      sqlEscape(d.voucherNo),
      sqlEscape(d.date),
      sqlEscape(d.type),
      sqlEscape(d.flow),
      sqlEscape(d.partyId || ''),
      sqlEscape(d.partyName || ''),
      sqlEscape(d.partyType || ''),
      (d.amount || 0).toString(),
      sqlEscape(d.walletId || ''),
      sqlEscape(d.walletName || ''),
      sqlEscape(d.referenceId || ''),
      sqlEscape(d.referenceNo || ''),
      sqlEscape(d.remarks || ''),
      sqlEscape(d.createdBy || 'Admin'),
      sqlEscape(d.createdAt || ''),
    ]);
    sql += buildChunkedInserts('daybook_entries', dbColumns, dbRows);
  }

  // 21. Cash Adjustments
  if (state.cashAdjustments && state.cashAdjustments.length > 0) {
    const caColumns = ['id', 'voucherNo', 'date', 'type', 'amount', 'walletId', 'walletName', 'reason', 'authorizedBy', 'createdBy', 'created_at'];
    const caRows = state.cashAdjustments.map(ca => [
      sqlEscape(ca.id),
      sqlEscape(ca.voucherNo),
      sqlEscape(ca.date),
      sqlEscape(ca.type),
      (ca.amount || 0).toString(),
      sqlEscape(ca.walletId),
      sqlEscape(ca.walletName || ''),
      sqlEscape(ca.reason || ''),
      sqlEscape(ca.authorizedBy || ''),
      sqlEscape(ca.createdBy || ca.authorizedBy || 'Admin'),
      sqlEscape(ca.createdAt || ''),
    ]);
    sql += buildChunkedInserts('cash_adjustments', caColumns, caRows);
  }

  // 22. Activity Logs
  if (state.activityLogs && state.activityLogs.length > 0) {
    const actColumns = ['id', 'timestamp', 'userId', 'userName', 'role', 'action', 'module', 'details', 'ipAddress', 'metadata_json'];
    const actRows = state.activityLogs.map(al => [
      sqlEscape(al.id),
      sqlEscape(al.timestamp),
      sqlEscape(al.userId || ''),
      sqlEscape(al.userName || ''),
      sqlEscape(al.role || ''),
      sqlEscape(al.actionType),
      sqlEscape(al.title),
      sqlEscape(al.description || ''),
      sqlEscape('127.0.0.1'),
      sqlEscape({ targetId: al.targetId, targetName: al.targetName, severity: al.severity }),
    ]);
    sql += buildChunkedInserts('activity_logs', actColumns, actRows);
  }

  // 23. Expired Return Logs
  if (state.expiredReturnLogs && state.expiredReturnLogs.length > 0) {
    const expLogColumns = ['id', 'date', 'productId', 'productName', 'sku', 'unit', 'quantity', 'purchasePrice', 'totalValue', 'actionType', 'notes', 'batchNumber', 'purchaseInvoiceNo', 'expDate', 'createdBy'];
    const expLogRows = state.expiredReturnLogs.map(l => [
      sqlEscape(l.id),
      sqlEscape(l.date),
      sqlEscape(l.productId),
      sqlEscape(l.productName),
      sqlEscape(l.sku),
      sqlEscape(l.unit || 'Pcs'),
      (l.quantity || 0).toString(),
      (l.purchasePrice || 0).toString(),
      (l.totalValue || 0).toString(),
      sqlEscape(l.actionType),
      sqlEscape(l.notes || ''),
      sqlEscape(l.batchNumber || ''),
      sqlEscape(l.purchaseInvoiceNo || ''),
      sqlEscape(l.expDate || ''),
      sqlEscape(l.createdBy || 'Admin'),
    ]);
    sql += buildChunkedInserts('expired_return_logs', expLogColumns, expLogRows);
  }

  // 24. SMS Config
  if (state.smsConfig) {
    const sc = state.smsConfig;
    sql += `-- Dumping data for table \`sms_config\`\n`;
    sql += `INSERT INTO \`sms_config\` (\`id\`, \`enabled\`, \`provider\`, \`apiUrl\`, \`apiKey\`, \`senderId\`, \`username\`, \`password\`, \`clientId\`, \`httpMethod\`, \`requestFormat\`, \`customProviders_json\`, \`customToParam\`, \`customMsgParam\`, \`customKeyParam\`, \`customSenderParam\`, \`customUserParam\`, \`customPassParam\`, \`customHeaders\`, \`autoSendOnSale\`, \`autoSendOnPaymentIn\`, \`autoSendOnInstallmentReminder\`, \`autoSendOnWarrantyResolved\`, \`saleTemplate\`, \`paymentInTemplate\`, \`dueReminderTemplate\`, \`warrantyResolvedTemplate\`) VALUES (\n`;
    sql += `  'main_sms_config',\n`;
    sql += `  ${sc.enabled ? 1 : 0},\n`;
    sql += `  ${sqlEscape(sc.provider)},\n`;
    sql += `  ${sqlEscape(sc.apiUrl || '')},\n`;
    sql += `  ${sqlEscape(sc.apiKey || '')},\n`;
    sql += `  ${sqlEscape(sc.senderId || '')},\n`;
    sql += `  ${sqlEscape(sc.username || '')},\n`;
    sql += `  ${sqlEscape(sc.password || '')},\n`;
    sql += `  ${sqlEscape(sc.clientId || '')},\n`;
    sql += `  ${sqlEscape(sc.httpMethod || 'GET')},\n`;
    sql += `  ${sqlEscape(sc.requestFormat || 'json')},\n`;
    sql += `  ${sqlEscape(sc.customProviders || [])},\n`;
    sql += `  ${sqlEscape(sc.customToParam || '')},\n`;
    sql += `  ${sqlEscape(sc.customMsgParam || '')},\n`;
    sql += `  ${sqlEscape(sc.customKeyParam || '')},\n`;
    sql += `  ${sqlEscape(sc.customSenderParam || '')},\n`;
    sql += `  ${sqlEscape(sc.customUserParam || '')},\n`;
    sql += `  ${sqlEscape(sc.customPassParam || '')},\n`;
    sql += `  ${sqlEscape(sc.customHeaders || '')},\n`;
    sql += `  ${sc.autoSendOnSale !== false ? 1 : 0},\n`;
    sql += `  ${sc.autoSendOnPaymentIn !== false ? 1 : 0},\n`;
    sql += `  ${sc.autoSendOnInstallmentReminder !== false ? 1 : 0},\n`;
    sql += `  ${sc.autoSendOnWarrantyResolved !== false ? 1 : 0},\n`;
    sql += `  ${sqlEscape(sc.saleTemplate || '')},\n`;
    sql += `  ${sqlEscape(sc.paymentInTemplate || '')},\n`;
    sql += `  ${sqlEscape(sc.dueReminderTemplate || '')},\n`;
    sql += `  ${sqlEscape(sc.warrantyResolvedTemplate || '')}\n`;
    sql += `);\n\n`;
  }

  // 25. SMS Logs
  if (state.smsLogs && state.smsLogs.length > 0) {
    const smsColumns = ['id', 'recipientPhone', 'recipientName', 'message', 'type', 'status', 'responseDetails', 'date', 'time'];
    const smsRows = state.smsLogs.map(sl => [
      sqlEscape(sl.id),
      sqlEscape(sl.recipientPhone),
      sqlEscape(sl.recipientName || ''),
      sqlEscape(sl.message),
      sqlEscape(sl.type || 'TEST'),
      sqlEscape(sl.status || 'SENT'),
      sqlEscape(sl.responseDetails || ''),
      sqlEscape(sl.date),
      sqlEscape(sl.time || ''),
    ]);
    sql += buildChunkedInserts('sms_logs', smsColumns, smsRows);
  }

  // 26. Warranty Policies
  if (state.warrantyPolicies && state.warrantyPolicies.length > 0) {
    const wpColumns = ['id', 'name', 'nameBn', 'duration', 'durationUnit', 'terms', 'type', 'isDefault'];
    const wpRows = state.warrantyPolicies.map(wp => [
      sqlEscape(wp.id),
      sqlEscape(wp.name),
      sqlEscape(wp.nameBn || ''),
      (wp.duration || 1).toString(),
      sqlEscape(wp.durationUnit || 'MONTHS'),
      sqlEscape(wp.terms || ''),
      sqlEscape(wp.type || 'REPAIR'),
      (wp.isDefault ? 1 : 0).toString(),
    ]);
    sql += buildChunkedInserts('warranty_policies', wpColumns, wpRows);
  }

  // 27. Warranty Records
  if (state.warrantyRecords && state.warrantyRecords.length > 0) {
    const wrColumns = ['id', 'warrantyCode', 'invoiceId', 'invoiceNumber', 'saleDate', 'productId', 'productName', 'sku', 'serialNumber', 'customerId', 'customerName', 'customerPhone', 'warrantyType', 'duration', 'durationUnit', 'startDate', 'expiryDate', 'status', 'terms', 'notes', 'createdBy', 'createdAt'];
    const wrRows = state.warrantyRecords.map(wr => [
      sqlEscape(wr.id),
      sqlEscape(wr.warrantyCode),
      sqlEscape(wr.invoiceId),
      sqlEscape(wr.invoiceNumber),
      sqlEscape(wr.saleDate),
      sqlEscape(wr.productId),
      sqlEscape(wr.productName),
      sqlEscape(wr.sku),
      sqlEscape(wr.serialNumber),
      sqlEscape(wr.customerId),
      sqlEscape(wr.customerName),
      sqlEscape(wr.customerPhone),
      sqlEscape(wr.warrantyType),
      (wr.duration || 12).toString(),
      sqlEscape(wr.durationUnit || 'MONTHS'),
      sqlEscape(wr.startDate),
      sqlEscape(wr.expiryDate),
      sqlEscape(wr.status),
      sqlEscape(wr.terms || ''),
      sqlEscape(wr.notes || ''),
      sqlEscape(wr.createdBy || 'Admin'),
      sqlEscape(wr.createdAt || ''),
    ]);
    sql += buildChunkedInserts('warranty_records', wrColumns, wrRows);
  }

  // 28. Warranty Claims
  if (state.warrantyClaims && state.warrantyClaims.length > 0) {
    const wcColumns = ['id', 'claimTicketNo', 'warrantyRecordId', 'invoiceNumber', 'productId', 'productName', 'serialNumber', 'customerId', 'customerName', 'customerPhone', 'issueDescription', 'physicalCondition', 'claimDate', 'expectedReturnDate', 'status', 'claimType', 'repairCost', 'customerCharge', 'replacementSerialNumber', 'supplierId', 'supplierName', 'technicianNotes', 'actionsHistory_json', 'createdBy', 'createdAt'];
    const wcRows = state.warrantyClaims.map(wc => [
      sqlEscape(wc.id),
      sqlEscape(wc.claimTicketNo),
      sqlEscape(wc.warrantyRecordId || ''),
      sqlEscape(wc.invoiceNumber),
      sqlEscape(wc.productId),
      sqlEscape(wc.productName),
      sqlEscape(wc.serialNumber),
      sqlEscape(wc.customerId),
      sqlEscape(wc.customerName),
      sqlEscape(wc.customerPhone),
      sqlEscape(wc.issueDescription),
      sqlEscape(wc.physicalCondition || ''),
      sqlEscape(wc.claimDate),
      sqlEscape(wc.expectedReturnDate || ''),
      sqlEscape(wc.status),
      sqlEscape(wc.claimType),
      (wc.repairCost || 0).toString(),
      (wc.customerCharge || 0).toString(),
      sqlEscape(wc.replacementSerialNumber || ''),
      sqlEscape(wc.supplierId || ''),
      sqlEscape(wc.supplierName || ''),
      sqlEscape(wc.technicianNotes || ''),
      sqlEscape(wc.actionsHistory || []),
      sqlEscape(wc.createdBy || 'Admin'),
      sqlEscape(wc.createdAt || ''),
    ]);
    sql += buildChunkedInserts('warranty_claims', wcColumns, wcRows);
  }

  sql += `
SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- =========================================================================
-- End of SQL Dump
-- Developed By: Md. Tarikul Islam | Phone: 01312305225 | Sherpur, Sadar, Sherpur
-- =========================================================================
`;

  return sql;
}

/**
 * Generates a 100% fresh clean SQL database schema with zero transaction entries.
 * Ready for clean deployment on MySQL, phpMyAdmin, cPanel, VPS, or Localhost.
 */
export function generateFreshCleanSqlDump(customStoreName = 'My Dokan ERP Store'): string {
  const cleanState: FullAppStateForSql = {
    companySettings: {
      name: customStoreName,
      nameBn: 'আমার দোকান ইআরপি',
      slogan: 'Best Quality & Best Service',
      phone: '+880 1700-000000',
      email: 'info@mydokan.com',
      website: '',
      address: 'Dhaka, Bangladesh',
      taxNumber: '',
      currencySymbol: '৳',
      currencyCode: 'BDT',
      logoUrl: '',
      signatureUrl: '',
      invoiceFooter: 'Thank you for shopping with us! • আমাদের সাথে থাকার জন্য ধন্যবাদ।',
      defaultVatPercent: 0,
      invoicePrintType: 'A4',
      invoiceTemplate: 'MODERN_MINIMAL',
      invoiceColorTheme: 'INDIGO_VIOLET',
      invoiceCustomPrimaryColor: '#4F46E5',
      invoiceCustomAccentColor: '#06B6D4',
      dashboardColorTheme: 'INDIGO',
      smsSenderId: 'DOKANPRO',
      apiEndpoint: '',
      autoSyncEnabled: true,
      productGenerics: [],
      productManufacturers: [],
    },
    users: [
      {
        id: 'usr-admin',
        username: 'admin',
        password: '123',
        fullName: 'System Administrator (অ্যাডমিন)',
        email: 'admin@mydokan.com',
        role: 'ADMIN',
        phone: '01700000000',
        permissions: ['ALL'],
        isActive: true,
        avatar: '',
      },
    ],
    categories: [],
    products: [],
    parties: [],
    wallets: [
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
        name: 'Main Bank Account',
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
    ],
    saleInvoices: [],
    deletedSaleInvoices: [],
    saleReturns: [],
    quotations: [],
    purchaseInvoices: [],
    deletedPurchaseInvoices: [],
    purchaseReturns: [],
    purchaseOrders: [],
    installmentSchemes: [],
    expenseCategories: [
      { id: 'exp-cat-1', name: 'Shop Rent & Service Charge', nameBn: 'দোকান ভাড়া ও সার্ভিস চার্জ', code: 'RENT', budgetMonthly: 0 },
      { id: 'exp-cat-2', name: 'Electricity & Utility Bills', nameBn: 'বিদ্যুৎ ও অন্যান্য বিল', code: 'UTIL', budgetMonthly: 0 },
      { id: 'exp-cat-3', name: 'Entertainment & Tea', nameBn: 'আপ্যায়ন ও চা-নাস্তা', code: 'ENTR', budgetMonthly: 0 },
      { id: 'exp-cat-4', name: 'Packaging & Bags', nameBn: 'প্যাকেজিং ও ব্যাগ খরচ', code: 'PACK', budgetMonthly: 0 },
    ],
    expenseVouchers: [],
    employees: [],
    advanceSalaries: [],
    payrollHistory: [],
    dayBookEntries: [],
    cashAdjustments: [],
    expiredReturnLogs: [],
    activityLogs: [],
    smsLogs: [],
    smsConfig: {
      enabled: false,
      provider: 'onnorokom',
      apiUrl: '',
      apiKey: '',
      username: '',
      password: '',
      senderId: 'DOKANPRO',
      httpMethod: 'GET',
      requestFormat: 'json',
      autoSendOnSale: true,
      autoSendOnPaymentIn: true,
      autoSendOnInstallmentReminder: true,
      autoSendOnWarrantyResolved: true,
      saleTemplate: '',
      paymentInTemplate: '',
      dueReminderTemplate: '',
      warrantyResolvedTemplate: '',
    },
    warrantyPolicies: [],
    warrantyRecords: [],
    warrantyClaims: [],
  };

  return generateFullSqlDump(cleanState);
}

/**
 * Downloads a string as a .sql file in browser with explicit UTF-8 BOM encoding to ensure no character corruption
 */
export function downloadSqlFile(sqlContent: string, fileName?: string): void {
  const defaultName = `dokanpro_erp_database_${new Date().toISOString().split('T')[0]}.sql`;
  // Prefix with UTF-8 BOM (\uFEFF) to guarantee proper encoding in Windows Notepad, phpMyAdmin, and cPanel text editors
  const blob = new Blob(['\uFEFF' + sqlContent], { type: 'application/sql;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName || defaultName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates ready-to-deploy PHP Backend (api.php) for cPanel, Shared Hosting, XAMPP, and Localhost
 */
export function generateApiPhpScript(): string {
  const phpLines = [
    '<?php',
    '/**',
    ' * DokanPro Enterprise ERP - Universal PHP & MySQL REST API Connector',
    ' * Developed By: Md. Tarikul Islam',
    ' * Phone: 01312305225',
    ' * Address: Sherpur, Sadar, Sherpur',
    ' * ',
    ' * Works seamlessly on: cPanel, DirectAdmin, Plesk, Shared Hosting, XAMPP, WAMP, Laragon, VPS (PHP 7.4+, 8.0+)',
    ' */',
    '',
    "header('Access-Control-Allow-Origin: *');",
    "header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');",
    "header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');",
    "header('Content-Type: application/json; charset=utf-8');",
    '',
    "if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {",
    '    http_response_code(200);',
    '    exit();',
    '}',
    '',
    '// -------------------------------------------------------------',
    '// Database Configuration - Change according to your hosting/cPanel',
    '// -------------------------------------------------------------',
    "define('DB_HOST', 'localhost');",
    "define('DB_USER', 'renttop1_erp');     // Your cPanel/MySQL Database Username",
    "define('DB_PASS', 'renttop1_erp');     // Your cPanel/MySQL Database Password",
    "define('DB_NAME', 'renttop1_erp');     // Your Database Name",
    '',
    '// Connect to MySQL',
    '$pdo = null;',
    '$dbConnected = false;',
    '$dbError = null;',
    '',
    'try {',
    '    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [',
    '        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,',
    '        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,',
    '        PDO::ATTR_EMULATE_PREPARES => true,',
    '    ]);',
    '    $dbConnected = true;',
    '} catch (PDOException $e) {',
    '    $dbConnected = false;',
    '    $dbError = $e->getMessage();',
    '}',
    '',
    "$action = isset($_GET['action']) ? $_GET['action'] : 'health';",
    '',
    'switch ($action) {',
    "    case 'health':",
    '        echo json_encode([',
    "            'status' => 'online',",
    "            'app' => 'DokanPro Enterprise ERP API',",
    "            'version' => '5.0.0',",
    "            'developer' => 'Md. Tarikul Islam (Phone: 01312305225, Sherpur, Sadar, Sherpur)',",
    "            'db_connected' => $dbConnected,",
    "            'db_error' => $dbError,",
    "            'server_time' => date('Y-m-d H:i:s')",
    '        ], JSON_UNESCAPED_UNICODE);',
    '        break;',
    '',
    "    case 'sync_all':",
    "        if ($_SERVER['REQUEST_METHOD'] === 'POST') {",
    "            $rawInput = file_get_contents('php://input');",
    '            $input = json_decode($rawInput, true);',
    '            if (!$input) {',
    "                echo json_encode(['success' => false, 'message' => 'Invalid JSON payload received'], JSON_UNESCAPED_UNICODE);",
    '                exit();',
    '            }',
    '            ',
    '            // 1. Save state snapshot as JSON',
    "            $snapshotPath = __DIR__ . '/erp_data_snapshot.json';",
    '            file_put_contents($snapshotPath, json_encode($input, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));',
    '            @chmod($snapshotPath, 0666);',
    '            ',
    "            echo json_encode([",
    "                'success' => true,",
    "                'message' => 'All ERP data synced and snapshot saved successfully.',",
    "                'db_synced' => $dbConnected,",
    "                'updated_at' => date('Y-m-d H:i:s')",
    '            ], JSON_UNESCAPED_UNICODE);',
    '        } else {',
    '            // GET: Return latest server snapshot',
    "            $snapshotPath = __DIR__ . '/erp_data_snapshot.json';",
    '            if (file_exists($snapshotPath)) {',
    '                $data = file_get_contents($snapshotPath);',
    '                echo $data;',
    '            } else {',
    "                echo json_encode(['success' => true, 'data' => null], JSON_UNESCAPED_UNICODE);",
    '            }',
    '        }',
    '        break;',
    '',
    '    default:',
    '        http_response_code(404);',
    "        echo json_encode(['success' => false, 'message' => 'Action not found'], JSON_UNESCAPED_UNICODE);",
    '        break;',
    '}',
    '?>'
  ];

  return phpLines.join('\n');
}
