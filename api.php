<?php
/**
 * DokanPro Enterprise ERP - Universal PHP & MySQL REST API Connector
 * Developed By: Md. Tarikul Islam
 * Phone: 01312305225
 * Address: Sherpur, Sadar, Sherpur
 * 
 * Works on: cPanel, Shared Hosting, XAMPP, WAMP, Laragon, VPS (PHP 7.4+, 8.0+)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// -------------------------------------------------------------
// Database Configuration - Change according to your hosting/cPanel
// -------------------------------------------------------------
define('DB_HOST', 'localhost');
define('DB_USER', 'root');           // Your cPanel/MySQL Database Username
define('DB_PASS', '');               // Your cPanel/MySQL Database Password
define('DB_NAME', 'dokanpro_erp_db');// Your Database Name

// Connect to MySQL
$pdo = null;
$dbConnected = false;
$dbError = null;

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => true,
    ]);
    $dbConnected = true;
} catch (PDOException $e) {
    // If DB doesn't exist yet or credentials not set, we still allow file-based backup & SQL dump
    $dbConnected = false;
    $dbError = $e->getMessage();
}

$action = isset($_GET['action']) ? $_GET['action'] : 'health';

switch ($action) {
    case 'health':
        echo json_encode([
            'status' => 'online',
            'app' => 'DokanPro Enterprise ERP API',
            'version' => '4.5.0',
            'developer' => 'Md. Tarikul Islam (Phone: 01312305225, Sherpur, Sadar, Sherpur)',
            'db_connected' => $dbConnected,
            'db_error' => $dbError,
            'server_time' => date('Y-m-d H:i:s')
        ]);
        break;

    case 'sync_all':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $rawInput = file_get_contents('php://input');
            $input = json_decode($rawInput, true);
            if (!$input) {
                echo json_encode(['success' => false, 'message' => 'Invalid JSON payload received']);
                exit();
            }
            if (isset($input['data']) && is_array($input['data']) && !isset($input['products'])) {
                $input = array_merge($input['data'], $input);
            }
            
            // Multi-device smart union merge function with deletion support
            $mergeEntities = function($existingList, $incomingList, $deletedIds = []) {
                if (!is_array($existingList) && !is_array($incomingList)) return [];
                $delSet = array_flip(array_map('strval', is_array($deletedIds) ? $deletedIds : []));
                if (!is_array($existingList)) {
                    return array_values(array_filter(is_array($incomingList) ? $incomingList : [], function($i) use ($delSet) {
                        return !isset($delSet[(string)($i['id'] ?? '')]);
                    }));
                }
                if (!is_array($incomingList)) {
                    return array_values(array_filter($existingList, function($i) use ($delSet) {
                        return !isset($delSet[(string)($i['id'] ?? '')]);
                    }));
                }
                if (empty($incomingList)) {
                    return array_values(array_filter($existingList, function($i) use ($delSet) {
                        return !isset($delSet[(string)($i['id'] ?? '')]);
                    }));
                }

                $map = [];
                foreach ($existingList as $item) {
                    if (is_array($item) && isset($item['id'])) {
                        $id = (string)$item['id'];
                        if (!isset($delSet[$id])) {
                            $map[$id] = $item;
                        }
                    }
                }
                foreach ($incomingList as $item) {
                    if (is_array($item) && isset($item['id'])) {
                        $id = (string)$item['id'];
                        if (!isset($delSet[$id])) {
                            if (isset($map[$id])) {
                                $map[$id] = array_merge($map[$id], $item);
                            } else {
                                $map[$id] = $item;
                            }
                        }
                    }
                }
                return array_values($map);
            };

            // Read existing snapshot for merging
            $snapshotPath = __DIR__ . '/erp_data_snapshot.json';
            $existing = [];
            if (file_exists($snapshotPath)) {
                $existingRaw = @file_get_contents($snapshotPath);
                $existingParsed = @json_decode($existingRaw, true);
                if (is_array($existingParsed)) {
                    $existing = isset($existingParsed['data']) ? $existingParsed['data'] : $existingParsed;
                }
            }

            // Merge company settings
            $existingSettings = isset($existing['companySettings']) && is_array($existing['companySettings']) ? $existing['companySettings'] : [];
            $incomingSettings = isset($input['companySettings']) && is_array($input['companySettings']) ? $input['companySettings'] : [];
            $mergedSettings = array_merge($existingSettings, $incomingSettings);
            if (!empty($incomingSettings['companyName']) && empty($mergedSettings['name'])) {
                $mergedSettings['name'] = $incomingSettings['companyName'];
            }

            $deletedSaleIds = array_unique(array_filter(array_merge(
                isset($existing['deletedSaleInvoices']) && is_array($existing['deletedSaleInvoices']) ? array_column($existing['deletedSaleInvoices'], 'id') : [],
                isset($input['deletedSaleInvoices']) && is_array($input['deletedSaleInvoices']) ? array_column($input['deletedSaleInvoices'], 'id') : []
            )));

            $deletedPurchaseIds = array_unique(array_filter(array_merge(
                isset($existing['deletedPurchaseInvoices']) && is_array($existing['deletedPurchaseInvoices']) ? array_column($existing['deletedPurchaseInvoices'], 'id') : [],
                isset($input['deletedPurchaseInvoices']) && is_array($input['deletedPurchaseInvoices']) ? array_column($input['deletedPurchaseInvoices'], 'id') : []
            )));

            $deletedProductIds = array_unique(array_filter(array_merge(
                isset($existing['deletedProductIds']) && is_array($existing['deletedProductIds']) ? $existing['deletedProductIds'] : [],
                isset($input['deletedProductIds']) && is_array($input['deletedProductIds']) ? $input['deletedProductIds'] : []
            )));

            $collectionsToMerge = [
                'categories', 'parties', 'wallets',
                'deletedSaleInvoices', 'saleReturns', 'deletedPurchaseInvoices',
                'purchaseReturns', 'purchaseOrders', 'quotations', 'expiredReturnLogs',
                'installmentSchemes', 'employees', 'advanceSalaries', 'payrollHistory',
                'expenseCategories', 'expenseVouchers', 'dayBookEntries', 'cashAdjustments',
                'activityLogs', 'users', 'warrantyPolicies', 'warrantyRecords',
                'warrantyClaims', 'smsLogs'
            ];

            $input['products'] = $mergeEntities(
                isset($existing['products']) ? $existing['products'] : [],
                isset($input['products']) ? $input['products'] : [],
                $deletedProductIds
            );
            $input['deletedProductIds'] = $deletedProductIds;

            $input['saleInvoices'] = $mergeEntities(
                isset($existing['saleInvoices']) ? $existing['saleInvoices'] : [],
                isset($input['saleInvoices']) ? $input['saleInvoices'] : [],
                $deletedSaleIds
            );

            $input['purchaseInvoices'] = $mergeEntities(
                isset($existing['purchaseInvoices']) ? $existing['purchaseInvoices'] : [],
                isset($input['purchaseInvoices']) ? $input['purchaseInvoices'] : [],
                $deletedPurchaseIds
            );

            foreach ($collectionsToMerge as $key) {
                $existCol = isset($existing[$key]) ? $existing[$key] : [];
                $inCol = isset($input[$key]) ? $input[$key] : [];
                $input[$key] = $mergeEntities($existCol, $inCol);
            }
            $input['companySettings'] = $mergedSettings;
            $input['lastUpdatedEpoch'] = max(time() * 1000, isset($input['lastUpdatedEpoch']) ? (int)$input['lastUpdatedEpoch'] : 0, isset($existing['lastUpdatedEpoch']) ? (int)$existing['lastUpdatedEpoch'] : 0);

            // 1. Save merged state snapshot as JSON
            @file_put_contents($snapshotPath, json_encode($input, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            @chmod($snapshotPath, 0666);
            
            // 2. Auto-generate comprehensive database.sql on server
            $sqlContent = "-- =========================================================================\n";
            $sqlContent .= "-- DokanPro Enterprise ERP - Auto-Generated MySQL Database Dump\n";
            $sqlContent .= "-- Last Updated : " . date('Y-m-d H:i:s') . "\n";
            $sqlContent .= "-- Developer    : Md. Tarikul Islam (Phone: 01312305225, Sherpur)\n";
            $sqlContent .= "-- =========================================================================\n\n";
            $sqlContent .= "SET FOREIGN_KEY_CHECKS = 0;\nSET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\nSTART TRANSACTION;\n\n";
            
            function p_esc($val) {
                if ($val === null) return 'NULL';
                if (is_bool($val)) return $val ? 1 : 0;
                if (is_numeric($val)) return $val;
                return "'" . addslashes((string)$val) . "'";
            }

            // Company Settings
            if (isset($input['companySettings'])) {
                $cs = $input['companySettings'];
                $sqlContent .= "-- --------------------------------------------------------\n-- Table: company_settings\n-- --------------------------------------------------------\n";
                $sqlContent .= "DROP TABLE IF EXISTS `company_settings`;\n";
                $sqlContent .= "CREATE TABLE `company_settings` (\n";
                $sqlContent .= "  `id` varchar(50) NOT NULL PRIMARY KEY,\n";
                $sqlContent .= "  `name` varchar(255) NOT NULL,\n";
                $sqlContent .= "  `nameBn` varchar(255) DEFAULT NULL,\n";
                $sqlContent .= "  `slogan` varchar(255) DEFAULT NULL,\n";
                $sqlContent .= "  `phone` varchar(50) DEFAULT NULL,\n";
                $sqlContent .= "  `email` varchar(100) DEFAULT NULL,\n";
                $sqlContent .= "  `website` varchar(150) DEFAULT NULL,\n";
                $sqlContent .= "  `address` text DEFAULT NULL,\n";
                $sqlContent .= "  `taxNumber` varchar(100) DEFAULT NULL,\n";
                $sqlContent .= "  `currencySymbol` varchar(20) DEFAULT '৳',\n";
                $sqlContent .= "  `currencyCode` varchar(20) DEFAULT 'BDT',\n";
                $sqlContent .= "  `logoUrl` text DEFAULT NULL,\n";
                $sqlContent .= "  `signatureUrl` text DEFAULT NULL,\n";
                $sqlContent .= "  `invoiceFooter` text DEFAULT NULL,\n";
                $sqlContent .= "  `defaultVatPercent` decimal(5,2) DEFAULT 0.00,\n";
                $sqlContent .= "  `invoicePrintType` varchar(50) DEFAULT 'A4',\n";
                $sqlContent .= "  `invoiceTemplate` varchar(50) DEFAULT 'MODERN_MINIMAL',\n";
                $sqlContent .= "  `invoiceColorTheme` varchar(50) DEFAULT 'INDIGO_VIOLET',\n";
                $sqlContent .= "  `invoiceCustomPrimaryColor` varchar(20) DEFAULT '#6366f1',\n";
                $sqlContent .= "  `invoiceCustomAccentColor` varchar(20) DEFAULT '#4f46e5',\n";
                $sqlContent .= "  `smsSenderId` varchar(100) DEFAULT NULL,\n";
                $sqlContent .= "  `apiEndpoint` text DEFAULT NULL,\n";
                $sqlContent .= "  `autoSyncEnabled` tinyint(1) DEFAULT 1,\n";
                $sqlContent .= "  `productGenerics_json` text DEFAULT NULL,\n";
                $sqlContent .= "  `productManufacturers_json` text DEFAULT NULL\n";
                $sqlContent .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

                $sqlContent .= "INSERT INTO `company_settings` (`id`, `name`, `nameBn`, `slogan`, `phone`, `email`, `website`, `address`, `taxNumber`, `currencySymbol`, `currencyCode`, `logoUrl`, `signatureUrl`, `invoiceFooter`, `defaultVatPercent`, `invoicePrintType`, `invoiceTemplate`, `invoiceColorTheme`, `invoiceCustomPrimaryColor`, `invoiceCustomAccentColor`, `smsSenderId`, `apiEndpoint`, `autoSyncEnabled`, `productGenerics_json`, `productManufacturers_json`) VALUES (\n";
                $sqlContent .= "  " . p_esc($cs['id'] ?? 'main_company') . ",\n";
                $sqlContent .= "  " . p_esc($cs['name'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['nameBn'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['slogan'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['phone'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['email'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['website'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['address'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['taxNumber'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['currencySymbol'] ?? '৳') . ",\n";
                $sqlContent .= "  " . p_esc($cs['currencyCode'] ?? 'BDT') . ",\n";
                $sqlContent .= "  " . p_esc($cs['logoUrl'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['signatureUrl'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['invoiceFooter'] ?? '') . ",\n";
                $sqlContent .= "  " . (float)($cs['defaultVatPercent'] ?? 0) . ",\n";
                $sqlContent .= "  " . p_esc($cs['invoicePrintType'] ?? 'A4') . ",\n";
                $sqlContent .= "  " . p_esc($cs['invoiceTemplate'] ?? 'MODERN_MINIMAL') . ",\n";
                $sqlContent .= "  " . p_esc($cs['invoiceColorTheme'] ?? 'INDIGO_VIOLET') . ",\n";
                $sqlContent .= "  " . p_esc($cs['invoiceCustomPrimaryColor'] ?? '#6366f1') . ",\n";
                $sqlContent .= "  " . p_esc($cs['invoiceCustomAccentColor'] ?? '#4f46e5') . ",\n";
                $sqlContent .= "  " . p_esc($cs['smsSenderId'] ?? '') . ",\n";
                $sqlContent .= "  " . p_esc($cs['apiEndpoint'] ?? '') . ",\n";
                $sqlContent .= "  " . (!empty($cs['autoSyncEnabled']) ? 1 : 0) . ",\n";
                $sqlContent .= "  " . p_esc(isset($cs['productGenerics']) ? json_encode($cs['productGenerics'], JSON_UNESCAPED_UNICODE) : '[]') . ",\n";
                $sqlContent .= "  " . p_esc(isset($cs['productManufacturers']) ? json_encode($cs['productManufacturers'], JSON_UNESCAPED_UNICODE) : '[]') . "\n);\n\n";
            }

            // Users
            if (isset($input['users']) && is_array($input['users'])) {
                $sqlContent .= "-- --------------------------------------------------------\n-- Table: users\n-- --------------------------------------------------------\n";
                $sqlContent .= "DROP TABLE IF EXISTS `users`;\n";
                $sqlContent .= "CREATE TABLE `users` (\n";
                $sqlContent .= "  `id` varchar(50) NOT NULL PRIMARY KEY,\n";
                $sqlContent .= "  `username` varchar(100) NOT NULL UNIQUE,\n";
                $sqlContent .= "  `password` varchar(255) NOT NULL,\n";
                $sqlContent .= "  `fullName` varchar(150) NOT NULL,\n";
                $sqlContent .= "  `role` varchar(50) NOT NULL DEFAULT 'CASHIER',\n";
                $sqlContent .= "  `email` varchar(100) DEFAULT NULL,\n";
                $sqlContent .= "  `phone` varchar(50) DEFAULT NULL,\n";
                $sqlContent .= "  `isActive` tinyint(1) DEFAULT 1\n";
                $sqlContent .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

                foreach ($input['users'] as $u) {
                    $sqlContent .= "INSERT INTO `users` (`id`, `username`, `password`, `fullName`, `role`, `email`, `phone`, `isActive`) VALUES (" .
                        p_esc($u['id'] ?? '') . ", " .
                        p_esc($u['username'] ?? '') . ", " .
                        p_esc($u['password'] ?? '') . ", " .
                        p_esc($u['fullName'] ?? '') . ", " .
                        p_esc($u['role'] ?? 'CASHIER') . ", " .
                        p_esc($u['email'] ?? '') . ", " .
                        p_esc($u['phone'] ?? '') . ", " .
                        (!empty($u['isActive']) ? 1 : 0) . ");\n";
                }
                $sqlContent .= "\n";
            }

            // Categories
            if (isset($input['categories']) && is_array($input['categories'])) {
                $sqlContent .= "-- --------------------------------------------------------\n-- Table: categories\n-- --------------------------------------------------------\n";
                $sqlContent .= "DROP TABLE IF EXISTS `categories`;\n";
                $sqlContent .= "CREATE TABLE `categories` (\n";
                $sqlContent .= "  `id` varchar(50) NOT NULL PRIMARY KEY,\n";
                $sqlContent .= "  `name` varchar(150) NOT NULL,\n";
                $sqlContent .= "  `nameBn` varchar(150) DEFAULT NULL,\n";
                $sqlContent .= "  `description` text DEFAULT NULL\n";
                $sqlContent .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

                foreach ($input['categories'] as $c) {
                    $sqlContent .= "INSERT INTO `categories` (`id`, `name`, `nameBn`, `description`) VALUES (" .
                        p_esc($c['id'] ?? '') . ", " .
                        p_esc($c['name'] ?? '') . ", " .
                        p_esc($c['nameBn'] ?? '') . ", " .
                        p_esc($c['description'] ?? '') . ");\n";
                }
                $sqlContent .= "\n";
            }

            // Products
            if (isset($input['products']) && is_array($input['products'])) {
                $sqlContent .= "-- --------------------------------------------------------\n-- Table: products\n-- --------------------------------------------------------\n";
                $sqlContent .= "DROP TABLE IF EXISTS `products`;\n";
                $sqlContent .= "CREATE TABLE `products` (\n";
                $sqlContent .= "  `id` varchar(50) NOT NULL PRIMARY KEY,\n";
                $sqlContent .= "  `sku` varchar(100) NOT NULL,\n";
                $sqlContent .= "  `name` varchar(255) NOT NULL,\n";
                $sqlContent .= "  `nameBn` varchar(255) DEFAULT NULL,\n";
                $sqlContent .= "  `categoryId` varchar(50) DEFAULT NULL,\n";
                $sqlContent .= "  `categoryName` varchar(150) DEFAULT NULL,\n";
                $sqlContent .= "  `purchasePrice` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `salesPrice` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `stock` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `unit` varchar(50) DEFAULT 'Pcs',\n";
                $sqlContent .= "  `minStock` decimal(12,2) DEFAULT 5.00,\n";
                $sqlContent .= "  `barcode` varchar(100) DEFAULT NULL,\n";
                $sqlContent .= "  `genericName` varchar(150) DEFAULT NULL,\n";
                $sqlContent .= "  `manufacturer` varchar(150) DEFAULT NULL,\n";
                $sqlContent .= "  `rackLocation` varchar(100) DEFAULT NULL\n";
                $sqlContent .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

                foreach ($input['products'] as $p) {
                    $sqlContent .= "INSERT INTO `products` (`id`, `sku`, `name`, `nameBn`, `categoryId`, `categoryName`, `purchasePrice`, `salesPrice`, `stock`, `unit`, `minStock`, `barcode`, `genericName`, `manufacturer`, `rackLocation`) VALUES (" .
                        p_esc($p['id'] ?? '') . ", " .
                        p_esc($p['sku'] ?? '') . ", " .
                        p_esc($p['name'] ?? '') . ", " .
                        p_esc($p['nameBn'] ?? '') . ", " .
                        p_esc($p['categoryId'] ?? '') . ", " .
                        p_esc($p['categoryName'] ?? '') . ", " .
                        (float)($p['purchasePrice'] ?? 0) . ", " .
                        (float)($p['salesPrice'] ?? 0) . ", " .
                        (float)($p['stock'] ?? 0) . ", " .
                        p_esc($p['unit'] ?? 'Pcs') . ", " .
                        (float)($p['minStock'] ?? 5) . ", " .
                        p_esc($p['barcode'] ?? '') . ", " .
                        p_esc($p['genericName'] ?? '') . ", " .
                        p_esc($p['manufacturer'] ?? '') . ", " .
                        p_esc($p['rackLocation'] ?? '') . ");\n";
                }
                $sqlContent .= "\n";
            }

            // Parties (Customers & Suppliers)
            if (isset($input['parties']) && is_array($input['parties'])) {
                $sqlContent .= "-- --------------------------------------------------------\n-- Table: parties\n-- --------------------------------------------------------\n";
                $sqlContent .= "DROP TABLE IF EXISTS `parties`;\n";
                $sqlContent .= "CREATE TABLE `parties` (\n";
                $sqlContent .= "  `id` varchar(50) NOT NULL PRIMARY KEY,\n";
                $sqlContent .= "  `serialNumber` varchar(50) DEFAULT NULL,\n";
                $sqlContent .= "  `type` varchar(50) NOT NULL DEFAULT 'CUSTOMER',\n";
                $sqlContent .= "  `name` varchar(150) NOT NULL,\n";
                $sqlContent .= "  `phone` varchar(50) NOT NULL,\n";
                $sqlContent .= "  `email` varchar(100) DEFAULT NULL,\n";
                $sqlContent .= "  `companyName` varchar(150) DEFAULT NULL,\n";
                $sqlContent .= "  `address` text DEFAULT NULL,\n";
                $sqlContent .= "  `creditLimit` decimal(12,2) DEFAULT 0.00,\n";
                $sqlContent .= "  `openingBalance` decimal(12,2) DEFAULT 0.00,\n";
                $sqlContent .= "  `currentBalance` decimal(12,2) DEFAULT 0.00\n";
                $sqlContent .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

                foreach ($input['parties'] as $pty) {
                    $sqlContent .= "INSERT INTO `parties` (`id`, `serialNumber`, `type`, `name`, `phone`, `email`, `companyName`, `address`, `creditLimit`, `openingBalance`, `currentBalance`) VALUES (" .
                        p_esc($pty['id'] ?? '') . ", " .
                        p_esc($pty['serialNumber'] ?? '') . ", " .
                        p_esc($pty['type'] ?? 'CUSTOMER') . ", " .
                        p_esc($pty['name'] ?? '') . ", " .
                        p_esc($pty['phone'] ?? '') . ", " .
                        p_esc($pty['email'] ?? '') . ", " .
                        p_esc($pty['companyName'] ?? '') . ", " .
                        p_esc($pty['address'] ?? '') . ", " .
                        (float)($pty['creditLimit'] ?? 0) . ", " .
                        (float)($pty['openingBalance'] ?? 0) . ", " .
                        (float)($pty['currentBalance'] ?? 0) . ");\n";
                }
                $sqlContent .= "\n";
            }

            // Wallets & Accounts
            if (isset($input['wallets']) && is_array($input['wallets'])) {
                $sqlContent .= "-- --------------------------------------------------------\n-- Table: wallets\n-- --------------------------------------------------------\n";
                $sqlContent .= "DROP TABLE IF EXISTS `wallets`;\n";
                $sqlContent .= "CREATE TABLE `wallets` (\n";
                $sqlContent .= "  `id` varchar(50) NOT NULL PRIMARY KEY,\n";
                $sqlContent .= "  `name` varchar(100) NOT NULL,\n";
                $sqlContent .= "  `type` varchar(50) NOT NULL DEFAULT 'CASH',\n";
                $sqlContent .= "  `accountNumber` varchar(100) DEFAULT NULL,\n";
                $sqlContent .= "  `balance` decimal(14,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `isActive` tinyint(1) DEFAULT 1\n";
                $sqlContent .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

                foreach ($input['wallets'] as $w) {
                    $sqlContent .= "INSERT INTO `wallets` (`id`, `name`, `type`, `accountNumber`, `balance`, `isActive`) VALUES (" .
                        p_esc($w['id'] ?? '') . ", " .
                        p_esc($w['name'] ?? '') . ", " .
                        p_esc($w['type'] ?? 'CASH') . ", " .
                        p_esc($w['accountNumber'] ?? '') . ", " .
                        (float)($w['balance'] ?? 0) . ", " .
                        (!empty($w['isActive']) ? 1 : 0) . ");\n";
                }
                $sqlContent .= "\n";
            }

            // Sales Invoices
            if (isset($input['saleInvoices']) && is_array($input['saleInvoices'])) {
                $sqlContent .= "-- --------------------------------------------------------\n-- Table: sales_invoices\n-- --------------------------------------------------------\n";
                $sqlContent .= "DROP TABLE IF EXISTS `sales_invoices`;\n";
                $sqlContent .= "CREATE TABLE `sales_invoices` (\n";
                $sqlContent .= "  `id` varchar(50) NOT NULL PRIMARY KEY,\n";
                $sqlContent .= "  `invoiceNumber` varchar(100) NOT NULL,\n";
                $sqlContent .= "  `date` varchar(50) NOT NULL,\n";
                $sqlContent .= "  `customerName` varchar(150) NOT NULL,\n";
                $sqlContent .= "  `customerPhone` varchar(50) DEFAULT NULL,\n";
                $sqlContent .= "  `subTotal` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `discountAmount` decimal(12,2) DEFAULT 0.00,\n";
                $sqlContent .= "  `vatAmount` decimal(12,2) DEFAULT 0.00,\n";
                $sqlContent .= "  `grandTotal` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `paidAmount` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `dueAmount` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `status` varchar(50) NOT NULL DEFAULT 'PAID',\n";
                $sqlContent .= "  `paymentMethod` varchar(50) DEFAULT 'CASH',\n";
                $sqlContent .= "  `items_json` longtext DEFAULT NULL\n";
                $sqlContent .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

                foreach ($input['saleInvoices'] as $inv) {
                    $itemsJson = isset($inv['items']) ? json_encode($inv['items'], JSON_UNESCAPED_UNICODE) : '[]';
                    $sqlContent .= "INSERT INTO `sales_invoices` (`id`, `invoiceNumber`, `date`, `customerName`, `customerPhone`, `subTotal`, `discountAmount`, `vatAmount`, `grandTotal`, `paidAmount`, `dueAmount`, `status`, `paymentMethod`, `items_json`) VALUES (" .
                        p_esc($inv['id'] ?? '') . ", " .
                        p_esc($inv['invoiceNumber'] ?? '') . ", " .
                        p_esc($inv['date'] ?? '') . ", " .
                        p_esc($inv['customerName'] ?? '') . ", " .
                        p_esc($inv['customerPhone'] ?? '') . ", " .
                        (float)($inv['subTotal'] ?? 0) . ", " .
                        (float)($inv['discountAmount'] ?? 0) . ", " .
                        (float)($inv['vatAmount'] ?? 0) . ", " .
                        (float)($inv['grandTotal'] ?? 0) . ", " .
                        (float)($inv['paidAmount'] ?? 0) . ", " .
                        (float)($inv['dueAmount'] ?? 0) . ", " .
                        p_esc($inv['status'] ?? 'PAID') . ", " .
                        p_esc($inv['paymentMethod'] ?? 'CASH') . ", " .
                        p_esc($itemsJson) . ");\n";
                }
                $sqlContent .= "\n";
            }

            // Purchase Invoices
            if (isset($input['purchaseInvoices']) && is_array($input['purchaseInvoices'])) {
                $sqlContent .= "-- --------------------------------------------------------\n-- Table: purchase_invoices\n-- --------------------------------------------------------\n";
                $sqlContent .= "DROP TABLE IF EXISTS `purchase_invoices`;\n";
                $sqlContent .= "CREATE TABLE `purchase_invoices` (\n";
                $sqlContent .= "  `id` varchar(50) NOT NULL PRIMARY KEY,\n";
                $sqlContent .= "  `billNumber` varchar(100) NOT NULL,\n";
                $sqlContent .= "  `date` varchar(50) NOT NULL,\n";
                $sqlContent .= "  `supplierName` varchar(150) NOT NULL,\n";
                $sqlContent .= "  `supplierPhone` varchar(50) DEFAULT NULL,\n";
                $sqlContent .= "  `grandTotal` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `paidAmount` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `dueAmount` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `status` varchar(50) NOT NULL DEFAULT 'PAID',\n";
                $sqlContent .= "  `items_json` longtext DEFAULT NULL\n";
                $sqlContent .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

                foreach ($input['purchaseInvoices'] as $pinv) {
                    $itemsJson = isset($pinv['items']) ? json_encode($pinv['items'], JSON_UNESCAPED_UNICODE) : '[]';
                    $sqlContent .= "INSERT INTO `purchase_invoices` (`id`, `billNumber`, `date`, `supplierName`, `supplierPhone`, `grandTotal`, `paidAmount`, `dueAmount`, `status`, `items_json`) VALUES (" .
                        p_esc($pinv['id'] ?? '') . ", " .
                        p_esc($pinv['billNumber'] ?? '') . ", " .
                        p_esc($pinv['date'] ?? '') . ", " .
                        p_esc($pinv['supplierName'] ?? '') . ", " .
                        p_esc($pinv['supplierPhone'] ?? '') . ", " .
                        (float)($pinv['grandTotal'] ?? 0) . ", " .
                        (float)($pinv['paidAmount'] ?? 0) . ", " .
                        (float)($pinv['dueAmount'] ?? 0) . ", " .
                        p_esc($pinv['status'] ?? 'PAID') . ", " .
                        p_esc($itemsJson) . ");\n";
                }
                $sqlContent .= "\n";
            }

            // Expenses & Daybook
            if (isset($input['expenseVouchers']) && is_array($input['expenseVouchers'])) {
                $sqlContent .= "-- --------------------------------------------------------\n-- Table: expense_vouchers\n-- --------------------------------------------------------\n";
                $sqlContent .= "DROP TABLE IF EXISTS `expense_vouchers`;\n";
                $sqlContent .= "CREATE TABLE `expense_vouchers` (\n";
                $sqlContent .= "  `id` varchar(50) NOT NULL PRIMARY KEY,\n";
                $sqlContent .= "  `voucherNo` varchar(100) NOT NULL,\n";
                $sqlContent .= "  `date` varchar(50) NOT NULL,\n";
                $sqlContent .= "  `categoryName` varchar(150) NOT NULL,\n";
                $sqlContent .= "  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,\n";
                $sqlContent .= "  `paymentMethod` varchar(50) DEFAULT 'CASH',\n";
                $sqlContent .= "  `description` text DEFAULT NULL\n";
                $sqlContent .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

                foreach ($input['expenseVouchers'] as $ev) {
                    $sqlContent .= "INSERT INTO `expense_vouchers` (`id`, `voucherNo`, `date`, `categoryName`, `amount`, `paymentMethod`, `description`) VALUES (" .
                        p_esc($ev['id'] ?? '') . ", " .
                        p_esc($ev['voucherNo'] ?? '') . ", " .
                        p_esc($ev['date'] ?? '') . ", " .
                        p_esc($ev['categoryName'] ?? '') . ", " .
                        (float)($ev['amount'] ?? 0) . ", " .
                        p_esc($ev['paymentMethod'] ?? 'CASH') . ", " .
                        p_esc($ev['description'] ?? '') . ");\n";
                }
                $sqlContent .= "\n";
            }

            $sqlContent .= "SET FOREIGN_KEY_CHECKS = 1;\nCOMMIT;\n";
            
            // 3. Write to database.sql
            $sqlPath = __DIR__ . '/database.sql';
            file_put_contents($sqlPath, $sqlContent);
            @chmod($sqlPath, 0666);

            // 4. If MySQL is connected, execute SQL directly into MySQL tables
            $dbSynced = false;
            if ($pdo) {
                try {
                    $pdo->exec($sqlContent);
                    $dbSynced = true;
                } catch (Exception $dbEx) {
                    $dbError = $dbEx->getMessage();
                }
            }

            echo json_encode([
                'success' => true,
                'message' => 'All ERP data synced, snapshot saved, and database.sql updated successfully.',
                'db_synced' => $dbSynced,
                'db_error' => $dbError,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        } else {
            // GET: Return latest server snapshot
            $snapshotPath = __DIR__ . '/erp_data_snapshot.json';
            if (file_exists($snapshotPath)) {
                $data = file_get_contents($snapshotPath);
                echo $data;
            } else {
                echo json_encode(['success' => true, 'data' => null]);
            }
        }
        break;

    case 'download_sql':
        // Stream the database.sql file
        $sqlPath = __DIR__ . '/database.sql';
        if (file_exists($sqlPath)) {
            header('Content-Type: application/sql');
            header('Content-Disposition: attachment; filename="dokanpro_database.sql"');
            readfile($sqlPath);
            exit();
        } else {
            echo json_encode(['success' => false, 'message' => 'database.sql not found on server']);
        }
        break;

    case 'get_ip':
        $ip = '';
        if (function_exists('curl_init')) {
            $ch = curl_init('https://api.ipify.org?format=json');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $res = curl_exec($ch);
            curl_close($ch);
            if ($res) {
                $data = json_decode($res, true);
                $ip = $data['ip'] ?? '';
            }
        }
        if (!$ip) {
            $ip = $_SERVER['SERVER_ADDR'] ?? $_SERVER['LOCAL_ADDR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        }
        echo json_encode([
            'success' => true,
            'ip' => $ip,
            'serverIp' => $ip,
            'clientIp' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);
        break;

    case 'send_sms':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $rawInput = file_get_contents('php://input');
            $input = json_decode($rawInput, true);
            $targetUrl = $input['url'] ?? '';
            $method = strtoupper($input['method'] ?? 'POST');
            $format = $input['format'] ?? 'form';
            $payload = $input['payload'] ?? [];
            $headers = $input['headers'] ?? [];

            if (!$targetUrl) {
                echo json_encode(['success' => false, 'message' => 'URL is required']);
                exit();
            }

            if ($method === 'GET') {
                $queryString = http_build_query($payload);
                if ($queryString) {
                    $targetUrl .= (strpos($targetUrl, '?') === false ? '?' : '&') . $queryString;
                }
            }

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $targetUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $reqHeaders = ['User-Agent: DokanPro ERP SMS PHP Client'];
            foreach ($headers as $k => $v) {
                $reqHeaders[] = "$k: $v";
            }

            if ($method === 'POST') {
                curl_setopt($ch, CURLOPT_POST, true);
                if ($format === 'json') {
                    $reqHeaders[] = 'Content-Type: application/json';
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
                } else {
                    $reqHeaders[] = 'Content-Type: application/x-www-form-urlencoded';
                    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
                }
            }

            curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);
            $responseText = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($responseText === false) {
                echo json_encode([
                    'success' => false,
                    'error' => $curlError,
                    'responseText' => 'PHP cURL Error: ' . $curlError
                ]);
                exit();
            }

            $lowerText = strtolower($responseText);
            $isSuccess = ($httpCode >= 200 && $httpCode < 300);

            if (
                strpos($lowerText, 'invalid') !== false ||
                strpos($lowerText, 'fail') !== false ||
                strpos($lowerText, 'error') !== false ||
                strpos($lowerText, 'missing') !== false ||
                strpos($lowerText, 'denied') !== false ||
                strpos($lowerText, 'not whitelisted') !== false
            ) {
                $isSuccess = false;
            }

            if (
                strpos($lowerText, 'status":"sent"') !== false ||
                strpos($lowerText, 'status":"success"') !== false ||
                strpos($lowerText, '1900') !== false ||
                strpos($lowerText, 'success') !== false
            ) {
                $isSuccess = true;
            }

            echo json_encode([
                'success' => $isSuccess,
                'httpStatus' => $httpCode,
                'responseText' => $responseText,
                'targetUrl' => $targetUrl
            ]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Action not found']);
        break;
}
