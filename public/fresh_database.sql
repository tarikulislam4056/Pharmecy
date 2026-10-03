-- =========================================================================
-- DokanPro Enterprise ERP - Production-Grade MySQL/MariaDB Database Dump
-- Generated At : 2026-09-10T07:36:49.011Z (10/09/2026)
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
-- Table structure for `company_settings`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `company_settings`;
CREATE TABLE `company_settings` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `nameBn` varchar(255) DEFAULT NULL,
  `slogan` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `taxNumber` varchar(100) DEFAULT NULL,
  `currencySymbol` varchar(20) DEFAULT '৳',
  `currencyCode` varchar(20) DEFAULT 'BDT',
  `logoUrl` longtext DEFAULT NULL,
  `signatureUrl` longtext DEFAULT NULL,
  `invoiceFooter` text DEFAULT NULL,
  `defaultVatPercent` decimal(5,2) DEFAULT 0.00,
  `invoicePrintType` varchar(50) DEFAULT 'A4',
  `invoiceTemplate` varchar(50) DEFAULT 'MODERN_MINIMAL',
  `invoiceColorTheme` varchar(50) DEFAULT 'INDIGO_VIOLET',
  `invoiceCustomPrimaryColor` varchar(20) DEFAULT '#4F46E5',
  `invoiceCustomAccentColor` varchar(20) DEFAULT '#06B6D4',
  `dashboardColorTheme` varchar(50) DEFAULT 'INDIGO',
  `sidebarColorTheme` varchar(50) DEFAULT 'INDIGO',
  `sidebarCustomColor` varchar(20) DEFAULT '#4F46E5',
  `smsSenderId` varchar(100) DEFAULT NULL,
  `apiEndpoint` text DEFAULT NULL,
  `autoSyncEnabled` tinyint(1) DEFAULT 1,
  `autoSyncIntervalSeconds` int(11) DEFAULT 5,
  `productGenerics_json` longtext DEFAULT NULL,
  `productManufacturers_json` longtext DEFAULT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `users`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `username` varchar(100) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `fullName` varchar(150) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'CASHIER',
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `permissions_json` longtext DEFAULT NULL,
  `subPermissions_json` longtext DEFAULT NULL,
  `avatar` longtext DEFAULT NULL,
  `lastLogin` varchar(50) DEFAULT NULL,
  `lowStockEmailAlerts` tinyint(1) DEFAULT 0,
  `lowStockSmsAlerts` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `categories`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `name` varchar(150) NOT NULL,
  `nameBn` varchar(150) DEFAULT NULL,
  `code` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(50) DEFAULT 'folder',
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `products`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `sku` varchar(100) NOT NULL UNIQUE,
  `barcode` varchar(100) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `nameBn` varchar(255) DEFAULT NULL,
  `categoryId` varchar(50) DEFAULT NULL,
  `categoryName` varchar(255) DEFAULT NULL,
  `purchasePrice` decimal(12,2) NOT NULL DEFAULT 0.00,
  `salesPrice` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discountType` varchar(50) DEFAULT 'flat',
  `expDate` varchar(50) DEFAULT NULL,
  `generic` varchar(255) DEFAULT NULL,
  `manufacturer` varchar(255) DEFAULT NULL,
  `dosageForm` varchar(100) DEFAULT NULL,
  `strength` varchar(100) DEFAULT NULL,
  `rackLocation` varchar(100) DEFAULT NULL,
  `stripSize` int(11) DEFAULT NULL,
  `diseases_json` longtext DEFAULT NULL,
  `dosageSchedule` varchar(255) DEFAULT NULL,
  `mealTiming` varchar(255) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `precautions` text DEFAULT NULL,
  `reorderLevel` decimal(12,2) NOT NULL DEFAULT 5.00,
  `stock` decimal(12,2) NOT NULL DEFAULT 0.00,
  `unit` varchar(50) DEFAULT 'Pcs',
  `batchNumber` varchar(100) DEFAULT NULL,
  `batches_json` longtext DEFAULT NULL,
  `image` longtext DEFAULT NULL,
  `imageUrl` longtext DEFAULT NULL,
  `description` text DEFAULT NULL,
  `hasWarranty` tinyint(1) DEFAULT 0,
  `warrantyDuration` int(11) DEFAULT NULL,
  `warrantyUnit` varchar(50) DEFAULT NULL,
  `warrantyType` varchar(50) DEFAULT NULL,
  `warrantyTerms` text DEFAULT NULL,
  `requiresSerialNo` tinyint(1) DEFAULT 0,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `parties` (Customers & Suppliers)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `parties`;
CREATE TABLE `parties` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `serialNumber` varchar(50) DEFAULT NULL,
  `type` enum('CUSTOMER','SUPPLIER') NOT NULL DEFAULT 'CUSTOMER',
  `name` varchar(200) NOT NULL,
  `nameBn` varchar(200) DEFAULT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `companyName` varchar(200) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `openingBalance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currentBalance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `creditLimit` decimal(12,2) DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'ACTIVE',
  `taxNumber` varchar(100) DEFAULT NULL,
  `bankDetails` text DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `wallets` (Payment Accounts)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `wallets`;
CREATE TABLE `wallets` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `name` varchar(100) NOT NULL,
  `nameBn` varchar(100) DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'CASH',
  `accountNumber` varchar(100) DEFAULT NULL,
  `bankName` varchar(150) DEFAULT NULL,
  `branch` varchar(150) DEFAULT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `isActive` tinyint(1) DEFAULT 1,
  `colorCode` varchar(50) DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `sales_invoices`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sales_invoices`;
CREATE TABLE `sales_invoices` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `invoiceNumber` varchar(100) NOT NULL UNIQUE,
  `date` varchar(50) NOT NULL,
  `customerId` varchar(50) DEFAULT NULL,
  `customerName` varchar(200) DEFAULT NULL,
  `customerPhone` varchar(50) DEFAULT NULL,
  `customerAddress` text DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discountType` varchar(50) DEFAULT 'flat',
  `vatAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `grandTotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paidAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `dueAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paymentMethod` varchar(50) DEFAULT 'CASH',
  `walletId` varchar(50) DEFAULT NULL,
  `walletName` varchar(150) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'PAID',
  `notes` text DEFAULT NULL,
  `cashierName` varchar(150) DEFAULT NULL,
  `isInstallmentSale` tinyint(1) DEFAULT 0,
  `installmentPlanId` varchar(50) DEFAULT NULL,
  `items_json` longtext DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `sales_returns`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sales_returns`;
CREATE TABLE `sales_returns` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `returnNumber` varchar(100) NOT NULL UNIQUE,
  `originalInvoiceNumber` varchar(100) NOT NULL,
  `invoiceId` varchar(50) NOT NULL,
  `date` varchar(50) NOT NULL,
  `customerId` varchar(50) DEFAULT NULL,
  `customerName` varchar(200) DEFAULT NULL,
  `totalRefund` decimal(12,2) NOT NULL DEFAULT 0.00,
  `refundWalletId` varchar(50) DEFAULT NULL,
  `refundWalletName` varchar(150) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `items_json` longtext DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `quotations` (Price Quotes)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `quotations`;
CREATE TABLE `quotations` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `quotationNumber` varchar(100) NOT NULL UNIQUE,
  `date` varchar(50) NOT NULL,
  `validUntil` varchar(50) DEFAULT NULL,
  `customerId` varchar(50) DEFAULT NULL,
  `customerName` varchar(200) DEFAULT NULL,
  `customerPhone` varchar(50) DEFAULT NULL,
  `customerAddress` text DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discountType` varchar(50) DEFAULT 'flat',
  `vatAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `grandTotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'DRAFT',
  `salesPerson` varchar(150) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `items_json` longtext DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `purchase_invoices`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `purchase_invoices`;
CREATE TABLE `purchase_invoices` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `billNumber` varchar(100) NOT NULL UNIQUE,
  `supplierInvoiceNo` varchar(100) DEFAULT NULL,
  `date` varchar(50) NOT NULL,
  `supplierId` varchar(50) DEFAULT NULL,
  `supplierName` varchar(200) DEFAULT NULL,
  `supplierPhone` varchar(50) DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `taxAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `grandTotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paidAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `dueAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paymentMethod` varchar(50) DEFAULT 'CASH',
  `walletId` varchar(50) DEFAULT NULL,
  `walletName` varchar(150) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'PAID',
  `notes` text DEFAULT NULL,
  `items_json` longtext DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `purchase_returns`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `purchase_returns`;
CREATE TABLE `purchase_returns` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `returnNumber` varchar(100) NOT NULL UNIQUE,
  `originalBillNumber` varchar(100) NOT NULL,
  `purchaseId` varchar(50) NOT NULL,
  `date` varchar(50) NOT NULL,
  `supplierId` varchar(50) DEFAULT NULL,
  `supplierName` varchar(200) DEFAULT NULL,
  `totalAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `refundWalletId` varchar(50) DEFAULT NULL,
  `refundWalletName` varchar(150) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `items_json` longtext DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `purchase_orders` (PO)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `purchase_orders`;
CREATE TABLE `purchase_orders` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `poNumber` varchar(100) NOT NULL UNIQUE,
  `supplierId` varchar(50) DEFAULT NULL,
  `supplierName` varchar(200) DEFAULT NULL,
  `supplierPhone` varchar(50) DEFAULT NULL,
  `date` varchar(50) NOT NULL,
  `expectedDeliveryDate` varchar(50) DEFAULT NULL,
  `totalAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'PENDING',
  `notes` text DEFAULT NULL,
  `items_json` longtext DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `deleted_sales_invoices`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `deleted_sales_invoices`;
CREATE TABLE `deleted_sales_invoices` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `invoiceNumber` varchar(100) DEFAULT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  `deletedBy` varchar(150) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `originalInvoice_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `installment_schemes` (EMI/Kisti)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `installment_schemes`;
CREATE TABLE `installment_schemes` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `schemeNumber` varchar(100) NOT NULL UNIQUE,
  `customerId` varchar(50) NOT NULL,
  `customerName` varchar(200) NOT NULL,
  `customerPhone` varchar(50) NOT NULL,
  `invoiceId` varchar(50) DEFAULT NULL,
  `invoiceNumber` varchar(100) DEFAULT NULL,
  `productName` varchar(255) NOT NULL,
  `totalPrice` decimal(12,2) NOT NULL DEFAULT 0.00,
  `downPayment` decimal(12,2) NOT NULL DEFAULT 0.00,
  `principalAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `interestRate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `interestAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `totalPayable` decimal(12,2) NOT NULL DEFAULT 0.00,
  `totalInstallments` int(11) NOT NULL DEFAULT 6,
  `frequency` varchar(50) DEFAULT 'MONTHLY',
  `emiAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `startDate` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT 'ACTIVE',
  `guarantorName` varchar(150) DEFAULT NULL,
  `guarantorPhone` varchar(50) DEFAULT NULL,
  `guarantorNid` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `schedules_json` longtext DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `expense_categories`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `expense_categories`;
CREATE TABLE `expense_categories` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `name` varchar(150) NOT NULL,
  `nameBn` varchar(150) DEFAULT NULL,
  `code` varchar(50) NOT NULL UNIQUE,
  `description` text DEFAULT NULL,
  `budgetMonthly` decimal(12,2) DEFAULT 0.00,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `expense_vouchers`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `expense_vouchers`;
CREATE TABLE `expense_vouchers` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `voucherNo` varchar(100) NOT NULL,
  `date` varchar(50) NOT NULL,
  `categoryId` varchar(50) NOT NULL,
  `categoryName` varchar(150) NOT NULL,
  `category` varchar(150) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `walletId` varchar(50) DEFAULT NULL,
  `walletName` varchar(100) DEFAULT NULL,
  `payee` varchar(150) DEFAULT NULL,
  `receiptNo` varchar(100) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `employees` (HR & Payroll)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `employeeCode` varchar(50) NOT NULL UNIQUE,
  `name` varchar(150) NOT NULL,
  `nameBn` varchar(150) DEFAULT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `designation` varchar(100) NOT NULL,
  `department` varchar(100) NOT NULL,
  `joiningDate` varchar(50) DEFAULT NULL,
  `baseSalary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `houseRentAllowance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `medicalAllowance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `conveyanceAllowance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'ACTIVE',
  `bankAccount` varchar(100) DEFAULT NULL,
  `nid` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `resignedDate` varchar(50) DEFAULT NULL,
  `resignationReason` text DEFAULT NULL,
  `settlementNotes` text DEFAULT NULL,
  `finalSettlementAmount` decimal(12,2) DEFAULT 0.00,
  `finalSettlementPaid` tinyint(1) DEFAULT 0,
  `settlementWalletId` varchar(50) DEFAULT NULL,
  `settlementWalletName` varchar(150) DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `advance_salaries`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `advance_salaries`;
CREATE TABLE `advance_salaries` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `voucherNo` varchar(100) NOT NULL,
  `employeeId` varchar(50) NOT NULL,
  `employeeName` varchar(150) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `date` varchar(50) NOT NULL,
  `walletId` varchar(50) DEFAULT NULL,
  `walletName` varchar(150) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `isDeducted` tinyint(1) NOT NULL DEFAULT 0,
  `deductedInPayrollMonth` varchar(50) DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `payroll_history`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `payroll_history`;
CREATE TABLE `payroll_history` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `payrollMonth` varchar(50) NOT NULL,
  `employeeId` varchar(50) NOT NULL,
  `employeeName` varchar(150) NOT NULL,
  `employeeCode` varchar(50) NOT NULL,
  `designation` varchar(100) NOT NULL,
  `baseSalary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `allowances` decimal(12,2) NOT NULL DEFAULT 0.00,
  `bonus` decimal(12,2) NOT NULL DEFAULT 0.00,
  `advanceDeduction` decimal(12,2) NOT NULL DEFAULT 0.00,
  `fineDeduction` decimal(12,2) NOT NULL DEFAULT 0.00,
  `grossPay` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payableAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paidAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `dueAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `totalPaidSoFar` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paymentType` varchar(50) DEFAULT NULL,
  `installmentNo` int(11) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `netPay` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paymentDate` varchar(50) NOT NULL,
  `walletId` varchar(50) DEFAULT NULL,
  `walletName` varchar(150) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'PAID',
  `voucherNo` varchar(100) NOT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `daybook_entries`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `daybook_entries`;
CREATE TABLE `daybook_entries` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `voucherNo` varchar(100) NOT NULL,
  `date` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `flow` varchar(10) NOT NULL,
  `partyId` varchar(50) DEFAULT NULL,
  `partyName` varchar(200) DEFAULT NULL,
  `partyType` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `walletId` varchar(50) DEFAULT NULL,
  `walletName` varchar(150) DEFAULT NULL,
  `referenceId` varchar(50) DEFAULT NULL,
  `referenceNo` varchar(100) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `cash_adjustments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `cash_adjustments`;
CREATE TABLE `cash_adjustments` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `voucherNo` varchar(100) NOT NULL,
  `date` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `walletId` varchar(50) NOT NULL,
  `walletName` varchar(150) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `authorizedBy` varchar(100) DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `created_at` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `expired_return_logs`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `expired_return_logs`;
CREATE TABLE `expired_return_logs` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `date` varchar(50) NOT NULL,
  `productId` varchar(50) NOT NULL,
  `productName` varchar(255) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `unit` varchar(50) DEFAULT 'Pcs',
  `quantity` decimal(12,2) NOT NULL DEFAULT 0.00,
  `purchasePrice` decimal(12,2) NOT NULL DEFAULT 0.00,
  `totalValue` decimal(12,2) NOT NULL DEFAULT 0.00,
  `actionType` varchar(50) NOT NULL,
  `notes` text DEFAULT NULL,
  `batchNumber` varchar(100) DEFAULT NULL,
  `purchaseInvoiceNo` varchar(100) DEFAULT NULL,
  `expDate` varchar(50) DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `activity_logs`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `timestamp` varchar(50) NOT NULL,
  `userId` varchar(50) DEFAULT NULL,
  `userName` varchar(150) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `ipAddress` varchar(50) DEFAULT NULL,
  `metadata_json` longtext DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `sms_config`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sms_config`;
CREATE TABLE `sms_config` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `provider` varchar(100) NOT NULL,
  `apiUrl` text DEFAULT NULL,
  `apiKey` text DEFAULT NULL,
  `senderId` varchar(100) DEFAULT NULL,
  `username` varchar(150) DEFAULT NULL,
  `password` varchar(150) DEFAULT NULL,
  `clientId` varchar(150) DEFAULT NULL,
  `httpMethod` varchar(20) DEFAULT 'GET',
  `requestFormat` varchar(50) DEFAULT 'json',
  `customProviders_json` longtext DEFAULT NULL,
  `customToParam` varchar(100) DEFAULT NULL,
  `customMsgParam` varchar(100) DEFAULT NULL,
  `customKeyParam` varchar(100) DEFAULT NULL,
  `customSenderParam` varchar(100) DEFAULT NULL,
  `customUserParam` varchar(100) DEFAULT NULL,
  `customPassParam` varchar(100) DEFAULT NULL,
  `customHeaders` text DEFAULT NULL,
  `autoSendOnSale` tinyint(1) DEFAULT 1,
  `autoSendOnPaymentIn` tinyint(1) DEFAULT 1,
  `autoSendOnInstallmentReminder` tinyint(1) DEFAULT 1,
  `autoSendOnWarrantyResolved` tinyint(1) DEFAULT 1,
  `saleTemplate` text DEFAULT NULL,
  `paymentInTemplate` text DEFAULT NULL,
  `dueReminderTemplate` text DEFAULT NULL,
  `warrantyResolvedTemplate` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `sms_logs`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sms_logs`;
CREATE TABLE `sms_logs` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `recipientPhone` varchar(50) NOT NULL,
  `recipientName` varchar(150) DEFAULT NULL,
  `message` text NOT NULL,
  `type` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL,
  `responseDetails` text DEFAULT NULL,
  `date` varchar(50) NOT NULL,
  `time` varchar(50) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `warranty_policies`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `warranty_policies`;
CREATE TABLE `warranty_policies` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `name` varchar(150) NOT NULL,
  `nameBn` varchar(150) DEFAULT NULL,
  `duration` int(11) NOT NULL DEFAULT 1,
  `durationUnit` varchar(50) NOT NULL DEFAULT 'MONTHS',
  `terms` text DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'REPAIR',
  `isDefault` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `warranty_records`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `warranty_records`;
CREATE TABLE `warranty_records` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `warrantyCode` varchar(100) NOT NULL UNIQUE,
  `invoiceId` varchar(50) NOT NULL,
  `invoiceNumber` varchar(100) NOT NULL,
  `saleDate` varchar(50) NOT NULL,
  `productId` varchar(50) NOT NULL,
  `productName` varchar(255) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `serialNumber` varchar(100) NOT NULL,
  `customerId` varchar(50) NOT NULL,
  `customerName` varchar(200) NOT NULL,
  `customerPhone` varchar(50) NOT NULL,
  `warrantyType` varchar(50) NOT NULL,
  `duration` int(11) NOT NULL DEFAULT 12,
  `durationUnit` varchar(50) NOT NULL DEFAULT 'MONTHS',
  `startDate` varchar(50) NOT NULL,
  `expiryDate` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'ACTIVE',
  `terms` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `createdAt` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `warranty_claims`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `warranty_claims`;
CREATE TABLE `warranty_claims` (
  `id` varchar(50) NOT NULL PRIMARY KEY,
  `claimTicketNo` varchar(100) NOT NULL UNIQUE,
  `warrantyRecordId` varchar(50) DEFAULT NULL,
  `invoiceNumber` varchar(100) NOT NULL,
  `productId` varchar(50) NOT NULL,
  `productName` varchar(255) NOT NULL,
  `serialNumber` varchar(100) NOT NULL,
  `customerId` varchar(50) NOT NULL,
  `customerName` varchar(200) NOT NULL,
  `customerPhone` varchar(50) NOT NULL,
  `issueDescription` text NOT NULL,
  `physicalCondition` text DEFAULT NULL,
  `claimDate` varchar(50) NOT NULL,
  `expectedReturnDate` varchar(50) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'RECEIVED',
  `claimType` varchar(50) NOT NULL DEFAULT 'REPAIR',
  `repairCost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `customerCharge` decimal(12,2) NOT NULL DEFAULT 0.00,
  `replacementSerialNumber` varchar(100) DEFAULT NULL,
  `supplierId` varchar(50) DEFAULT NULL,
  `supplierName` varchar(200) DEFAULT NULL,
  `technicianNotes` text DEFAULT NULL,
  `actionsHistory_json` longtext DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `createdAt` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Dumping data for table `company_settings`
INSERT INTO `company_settings` (`id`, `name`, `nameBn`, `slogan`, `phone`, `email`, `website`, `address`, `taxNumber`, `currencySymbol`, `currencyCode`, `logoUrl`, `signatureUrl`, `invoiceFooter`, `defaultVatPercent`, `invoicePrintType`, `invoiceTemplate`, `invoiceColorTheme`, `invoiceCustomPrimaryColor`, `invoiceCustomAccentColor`, `dashboardColorTheme`, `smsSenderId`, `apiEndpoint`, `autoSyncEnabled`, `productGenerics_json`, `productManufacturers_json`) VALUES (
  'main_company',
  'Silva Electronics & IT',
  'সিলভা ইলেকট্রনিক্স অ্যান্ড আইটি',
  'Quality Products at the Best Price',
  '+880 1711-234567 / +880 1812-987654',
  'silvait2000@gmail.com',
  'www.dokanprobd.com',
  'Mosjid Market, Chandana-1702, Bason. Gazipur',
  'BIN-002948192-0102',
  '৳',
  'BDT',
  'https://i.postimg.cc/Twh0KBbL/logo-(1).jpg',
  '',
  'Thank you for shopping with us! Warranty claims require original invoice within 7 days. • আমাদের সাথে থাকার জন্য ধন্যবাদ।',
  0,
  'A4',
  'COMPACT_BILL',
  'INDIGO_VIOLET',
  '#6366f1',
  '#4f46e5',
  'INDIGO',
  'SILVAIT',
  '',
  1,
  '[]',
  '[]'
);

-- Dumping data for table `users` (1 records)
INSERT INTO `users` (`id`, `username`, `password`, `fullName`, `role`, `email`, `phone`, `isActive`, `permissions_json`, `subPermissions_json`, `avatar`) VALUES
  ('usr-1', 'admin', '123', 'System Administrator (অ্যাডমিন)', 'ADMIN', 'silvait2000@gmail.com', '01711-234567', 1, '["ALL"]', '[]', '');

-- Dumping data for table `wallets` (3 records)
INSERT INTO `wallets` (`id`, `name`, `nameBn`, `type`, `accountNumber`, `bankName`, `branch`, `balance`, `isActive`, `colorCode`, `createdBy`) VALUES
  ('w-cash', 'Main Cash Drawer', 'মূল ক্যাশ ড্রয়ার (নগদ)', 'CASH', '', '', '', 0, 1, '#10B981', 'Admin'),
  ('w-bank', 'Bank Account', 'ব্যাংক হিসাব', 'BANK', '', 'Islami Bank / Dutch-Bangla Bank', 'Main Branch', 0, 1, '#0284C7', 'Admin'),
  ('w-mfs', 'bKash / Nagad Wallet', 'বিকাশ / নগদ ওয়ালেট', 'MFS', '', '', '', 0, 1, '#E11D48', 'Admin');

-- Dumping data for table `expense_categories` (4 records)
INSERT INTO `expense_categories` (`id`, `name`, `nameBn`, `code`, `description`, `budgetMonthly`, `createdBy`) VALUES
  ('exp-cat-1', 'Shop Rent & Service Charge', 'দোকান ভাড়া ও সার্ভিস চার্জ', 'RENT', '', 0, 'Admin'),
  ('exp-cat-2', 'Electricity & Utility Bills', 'বিদ্যুৎ ও অন্যান্য বিল', 'UTIL', '', 0, 'Admin'),
  ('exp-cat-3', 'Entertainment & Tea', 'আপ্যায়ন ও চা-নাস্তা', 'ENTR', '', 0, 'Admin'),
  ('exp-cat-4', 'Packaging & Bags', 'প্যাকেজিং ও ব্যাগ খরচ', 'PACK', '', 0, 'Admin');

-- Dumping data for table `sms_config`
INSERT INTO `sms_config` (`id`, `enabled`, `provider`, `apiUrl`, `apiKey`, `senderId`, `username`, `password`, `clientId`, `httpMethod`, `requestFormat`, `customProviders_json`, `customToParam`, `customMsgParam`, `customKeyParam`, `customSenderParam`, `customUserParam`, `customPassParam`, `customHeaders`, `autoSendOnSale`, `autoSendOnPaymentIn`, `autoSendOnInstallmentReminder`, `autoSendOnWarrantyResolved`, `saleTemplate`, `paymentInTemplate`, `dueReminderTemplate`, `warrantyResolvedTemplate`) VALUES (
  'main_sms_config',
  0,
  'onnorokom',
  '',
  '',
  'SILVAIT',
  '',
  '',
  '',
  'GET',
  'json',
  '[]',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  1,
  1,
  1,
  1,
  '',
  '',
  '',
  ''
);

-- Dumping data for table `warranty_policies` (4 records)
INSERT INTO `warranty_policies` (`id`, `name`, `nameBn`, `duration`, `durationUnit`, `terms`, `type`, `isDefault`) VALUES
  ('war-pol-1', '1 Year Brand Replacement Warranty', '১ বছর ব্র্যান্ড রিপ্লেসমেন্ট ওয়ারেন্টি', 1, 'YEARS', 'Covers hardware failure and manufacturing defects. Physical damage, broken screen, or liquid damage is strictly void.', 'REPLACEMENT', 1),
  ('war-pol-2', '6 Months Parts & Repair Warranty', '৬ মাস পার্টস ও ফ্রি মেরামত ওয়ারেন্টি', 6, 'MONTHS', 'Includes free servicing labor and genuine spare parts replacement within 6 months of purchase.', 'REPAIR', 0),
  ('war-pol-3', '7 Days Instant Replacement', '৭ দিনের ইন্সট্যান্ট রিপ্লেসমেন্ট', 7, 'DAYS', 'Instant replacement if product exhibits initial functional malfunction within 7 days.', 'REPLACEMENT', 0),
  ('war-pol-4', '2 Years Free Service Warranty', '২ বছর ফ্রি সার্ভিসিং ওয়ারেন্টি', 2, 'YEARS', 'Free technician service labor for 24 months. Parts cost will be charged separately after warranty period.', 'SERVICE', 0);


SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- =========================================================================
-- End of SQL Dump
-- Developed By: Md. Tarikul Islam | Phone: 01312305225 | Sherpur, Sadar, Sherpur
-- =========================================================================
