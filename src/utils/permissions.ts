import { UserAccount, ViewTab } from '../types';

export interface PermissionDefinition {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  tabs: ViewTab[];
  category?: 'module' | 'action';
  subPermissions?: { id: string; name: string; nameBn: string }[];
}

export const ACTION_PERMISSIONS: { id: string; name: string; nameBn: string; description: string; descriptionBn: string; icon: string }[] = [
  {
    id: 'CAN_DELETE',
    name: 'Delete Records Permission',
    nameBn: 'ডিলিট (Delete) বাটন পারমিশন',
    description: 'Permission to delete sales invoices, products, purchase bills and transactions',
    descriptionBn: 'বিক্রয় চালান, পণ্য, ক্রয় চালান ও লেনদেন মুছে ফেলার বাটন ব্যবহারের অনুমতি',
    icon: 'Trash2',
  },
  {
    id: 'CAN_EDIT',
    name: 'Edit Records Permission',
    nameBn: 'এডিট (Edit) বাটন পারমিশন',
    description: 'Permission to edit sales, purchase bills, products and pricing',
    descriptionBn: 'চালান, মূল্য, স্টক বা কাস্টমার তথ্য সংশোধন/সম্পাদনা করার অনুমতি',
    icon: 'Edit2',
  },
  {
    id: 'CAN_RETURN',
    name: 'Process Returns Permission',
    nameBn: 'রিটার্ন (Return) বাটন পারমিশন',
    description: 'Permission to process customer sales returns and supplier returns',
    descriptionBn: 'কাস্টমার থেকে বিক্রিত পণ্য ফেরত গ্রহণ ও ক্রয় ফেরত দেওয়ার অনুমতি',
    icon: 'RotateCcw',
  },
];

export const AVAILABLE_PERMISSIONS: PermissionDefinition[] = [
  {
    id: 'DASHBOARD',
    name: 'Dashboard & Overview',
    nameBn: 'ড্যাশবোর্ড ও সংক্ষিপ্ত চিত্র',
    description: 'Access main dashboard metrics and quick actions',
    tabs: ['dashboard'],
    category: 'module',
  },
  {
    id: 'POS_ACCESS',
    name: 'POS Sales Terminal',
    nameBn: 'বিক্রয় টার্মিনাল (POS)',
    description: 'Create new sales, generate instant customer invoices and barcodes',
    tabs: ['pos'],
    category: 'module',
  },
  {
    id: 'SALES_MANAGEMENT',
    name: 'Sales Invoices & Returns',
    nameBn: 'বিক্রি তালিকা ও ফেরত (Returns)',
    description: 'View sales invoices history, print invoices, and process customer returns',
    tabs: ['sales-list', 'sales-returns', 'quotations', 'deleted-invoices'],
    category: 'module',
    subPermissions: [
      { id: 'SALES_ADD', name: 'Add Sale', nameBn: 'বিক্রয় যোগ' },
      { id: 'SALES_EDIT', name: 'Edit Sale', nameBn: 'বিক্রয় সম্পাদনা' },
      { id: 'SALES_DELETE', name: 'Delete Sale', nameBn: 'বিক্রয় মুছে ফেলা' },
      { id: 'SALES_RETURN', name: 'Return Sale', nameBn: 'বিক্রয় ফেরত' },
    ],
  },
  {
    id: 'PURCHASE_MANAGEMENT',
    name: 'Purchase Entry & Supplier Bills',
    nameBn: 'ক্রয় চালান ও মহাজন হিসাব',
    description: 'Enter purchase bills, view purchase register, and process supplier returns',
    tabs: ['purchase-entry', 'purchase-list', 'purchase-returns', 'purchase-orders', 'deleted-purchases'],
    category: 'module',
    subPermissions: [
      { id: 'PURCHASE_ADD', name: 'Add Purchase', nameBn: 'ক্রয় যোগ' },
      { id: 'PURCHASE_EDIT', name: 'Edit Purchase', nameBn: 'ক্রয় সম্পাদনা' },
      { id: 'PURCHASE_DELETE', name: 'Delete Purchase', nameBn: 'ক্রয় মুছে ফেলা' },
      { id: 'PURCHASE_APPROVE', name: 'Approve Purchase', nameBn: 'ক্রয় অনুমোদন' },
      { id: 'PURCHASE_RECEIVE', name: 'Receive Items', nameBn: 'পণ্য গ্রহণ' },
    ],
  },
  {
    id: 'PRODUCTS_INVENTORY',
    name: 'Product Inventory & Catalog',
    nameBn: 'পণ্য স্টক ও ক্যাটালগ',
    description: 'Add and edit products, manage categories, warranty claims, pricing, barcodes & utilities',
    tabs: ['products-list', 'medicine', 'batch-inventory', 'categories', 'warranties', 'utilities'],
    category: 'module',
    subPermissions: [
      { id: 'PRODUCT_ADD', name: 'Add Product', nameBn: 'পণ্য যোগ' },
      { id: 'PRODUCT_EDIT', name: 'Edit Product', nameBn: 'পণ্য সম্পাদনা' },
      { id: 'PRODUCT_DELETE', name: 'Delete Product', nameBn: 'পণ্য মুছে ফেলা' },
      { id: 'PRODUCT_EXPORT_CSV', name: 'Export CSV (Product Directory)', nameBn: 'এক্সপোর্ট CSV (প্রোডাক্ট ডিরেক্টরি)' },
    ],
  },
  {
    id: 'PARTIES_LEDGER',
    name: 'Customers & Suppliers Ledger',
    nameBn: 'গ্রাহক ও মহাজন খতিয়ান ও দেনা-পাওনা',
    description: 'Customer & supplier accounts, statements, contact details and due lists',
    tabs: ['customers', 'suppliers', 'due-list'],
    category: 'module',
  },
  {
    id: 'FINANCE_CASH',
    name: 'Daybook & Cash / Bank Accounts',
    nameBn: 'ডে বুক, ক্যাশ অ্যাডজাস্ট ও ব্যাংক/ওয়ালেট',
    description: 'Daily cash transaction book, money transfers, cash add/withdraw adjustments',
    tabs: ['daybook', 'cash-adjustment', 'wallets'],
    category: 'module',
  },
  {
    id: 'EXPENSES',
    name: 'Expense Vouchers',
    nameBn: 'খরচের ভাউচার ও ক্যাটেগরি',
    description: 'Record daily shop expenditures and manage expense heads',
    tabs: ['expenses'],
    category: 'module',
  },
  {
    id: 'INSTALLMENTS',
    name: 'Installments & EMI Management',
    nameBn: 'কিস্তি ও ইএমআই (EMI) হিসাব',
    description: 'Installment sales schemes, schedule collection, overdue tracking and formulas',
    tabs: ['installments'],
    category: 'module',
  },
  {
    id: 'HR_PAYROLL',
    name: 'HR & Employee Payroll',
    nameBn: 'কর্মী ব্যবস্থাপনা ও মাসিক বেতন/হাজিরা',
    description: 'Employee directory, salary disbursements, payslips and advance vouchers',
    tabs: ['hr-payroll'],
    category: 'module',
  },
  {
    id: 'REPORTS',
    name: 'Reports & Analytics',
    nameBn: 'রিপোর্ট ও লাভ-ক্ষতি বিবরণী',
    description: 'Item-wise sales/purchase, profit-loss, stock summary and party statements',
    tabs: ['reports'],
    category: 'module',
    subPermissions: [
      { id: 'REPORT_EXPORT_CSV', name: 'Export CSV', nameBn: 'এক্সপোর্ট CSV' },
      { id: 'REPORT_DOWNLOAD_PDF', name: 'Download PDF', nameBn: 'ডাউনলোড PDF' },
      { id: 'REPORT_PRINT_STATEMENT', name: 'Print Statement', nameBn: 'প্রিন্ট স্টেটমেন্ট' },
    ],
  },
  {
    id: 'SETTINGS',
    name: 'Company Profile & Settings',
    nameBn: 'কোম্পানি প্রোফাইল ও সেটিংস',
    description: 'Shop logo, name, invoice format, print footer, tax and general settings',
    tabs: ['settings'],
    category: 'module',
  },
  {
    id: 'USER_MANAGEMENT',
    name: 'User Management & Permissions',
    nameBn: 'ইউজার ও পারমিশন কন্ট্রোল',
    description: 'Create user IDs, change passwords, and configure access permissions',
    tabs: ['users'],
    category: 'module',
    subPermissions: [
      { id: 'USER_ADD', name: 'Add User', nameBn: 'ব্যবহারকারী যোগ' },
      { id: 'USER_EDIT', name: 'Edit User', nameBn: 'ব্যবহারকারী সম্পাদনা' },
      { id: 'USER_DELETE', name: 'Delete User', nameBn: 'ব্যবহারকারী মুছে ফেলা' },
    ],
  },
];

export const ROLE_PRESET_PERMISSIONS: Record<string, string[]> = {
  ADMIN: AVAILABLE_PERMISSIONS.map(p => p.id).concat(['CAN_DELETE', 'CAN_EDIT', 'CAN_RETURN']),
  MANAGER: [
    'DASHBOARD',
    'POS_ACCESS',
    'SALES_MANAGEMENT',
    'PURCHASE_MANAGEMENT',
    'PRODUCTS_INVENTORY',
    'PARTIES_LEDGER',
    'FINANCE_CASH',
    'EXPENSES',
    'INSTALLMENTS',
    'HR_PAYROLL',
    'REPORTS',
    'CAN_EDIT',
    'CAN_RETURN',
  ],
  CASHIER: [
    'DASHBOARD',
    'POS_ACCESS',
    'SALES_MANAGEMENT',
    'PARTIES_LEDGER',
    'FINANCE_CASH',
  ],
  SALESMAN: [
    'POS_ACCESS',
    'SALES_MANAGEMENT',
    'PARTIES_LEDGER',
  ],
  ACCOUNTANT: [
    'DASHBOARD',
    'SALES_MANAGEMENT',
    'PURCHASE_MANAGEMENT',
    'PARTIES_LEDGER',
    'FINANCE_CASH',
    'EXPENSES',
    'HR_PAYROLL',
    'REPORTS',
    'INSTALLMENTS',
  ],
};

export const ROLE_PRESET_SUB_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'SALES_ADD',
    'SALES_EDIT',
    'SALES_DELETE',
    'SALES_RETURN',
    'PURCHASE_ADD',
    'PURCHASE_EDIT',
    'PURCHASE_DELETE',
    'PRODUCT_ADD',
    'PRODUCT_EDIT',
    'PRODUCT_DELETE',
    'PRODUCT_EXPORT_CSV',
    'REPORT_EXPORT_CSV',
    'REPORT_DOWNLOAD_PDF',
    'REPORT_PRINT_STATEMENT',
    'USER_ADD',
    'USER_EDIT',
    'USER_DELETE',
    'CAN_DELETE',
    'CAN_EDIT',
    'CAN_RETURN',
  ],
  MANAGER: [
    'SALES_ADD',
    'SALES_EDIT',
    'SALES_RETURN',
    'PURCHASE_ADD',
    'PURCHASE_EDIT',
    'PRODUCT_ADD',
    'PRODUCT_EDIT',
    'PRODUCT_EXPORT_CSV',
    'REPORT_EXPORT_CSV',
    'REPORT_DOWNLOAD_PDF',
    'REPORT_PRINT_STATEMENT',
    'CAN_EDIT',
    'CAN_RETURN',
  ],
  CASHIER: [
    'SALES_ADD',
  ],
  SALESMAN: [
    'SALES_ADD',
  ],
  ACCOUNTANT: [
    'SALES_ADD',
    'PURCHASE_ADD',
  ],
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (user: UserAccount | null | undefined, permissionId: string): boolean => {
  if (!user) return false;
  // Admin role or 'ALL' wildcard gets all permissions
  if (user.role === 'ADMIN' || user.permissions?.includes('ALL')) {
    return true;
  }
  return (
    (Array.isArray(user.permissions) && user.permissions.includes(permissionId)) ||
    (Array.isArray(user.subPermissions) && user.subPermissions.includes(permissionId))
  );
};

/**
 * Check if a user has permission to DELETE records (e.g. sales invoices, products, purchases)
 */
export const canUserDelete = (user: UserAccount | null | undefined, module?: 'sales' | 'purchase' | 'product' | 'user' | string): boolean => {
  if (!user) return true;
  if (user.role === 'ADMIN' || user.role === 'MANAGER' || user.permissions?.includes('ALL')) {
    return true;
  }
  if (user.permissions?.includes('CAN_DELETE') || user.subPermissions?.includes('CAN_DELETE')) {
    return true;
  }
  if (module === 'sales' && (user.subPermissions?.includes('SALES_DELETE') || user.permissions?.includes('SALES_DELETE'))) {
    return true;
  }
  if (module === 'purchase' && (user.subPermissions?.includes('PURCHASE_DELETE') || user.permissions?.includes('PURCHASE_DELETE'))) {
    return true;
  }
  if (module === 'product' && (user.subPermissions?.includes('PRODUCT_DELETE') || user.permissions?.includes('PRODUCT_DELETE'))) {
    return true;
  }
  if (module === 'user' && (user.subPermissions?.includes('USER_DELETE') || user.permissions?.includes('USER_DELETE'))) {
    return true;
  }
  return false;
};

/**
 * Check if a user has permission to EDIT records (e.g. sales invoices, products, purchases)
 */
export const canUserEdit = (user: UserAccount | null | undefined, module?: 'sales' | 'purchase' | 'product' | 'user' | string): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.permissions?.includes('ALL')) {
    return true;
  }
  if (user.permissions?.includes('CAN_EDIT') || user.subPermissions?.includes('CAN_EDIT')) {
    return true;
  }
  if (module === 'sales' && (user.subPermissions?.includes('SALES_EDIT') || user.permissions?.includes('SALES_EDIT'))) {
    return true;
  }
  if (module === 'purchase' && (user.subPermissions?.includes('PURCHASE_EDIT') || user.permissions?.includes('PURCHASE_EDIT'))) {
    return true;
  }
  if (module === 'product' && (user.subPermissions?.includes('PRODUCT_EDIT') || user.permissions?.includes('PRODUCT_EDIT'))) {
    return true;
  }
  if (module === 'user' && (user.subPermissions?.includes('USER_EDIT') || user.permissions?.includes('USER_EDIT'))) {
    return true;
  }
  return false;
};

/**
 * Check if a user has permission to process RETURNS (sales return or purchase return)
 */
export const canUserReturn = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.permissions?.includes('ALL')) {
    return true;
  }
  if (user.permissions?.includes('CAN_RETURN') || user.subPermissions?.includes('CAN_RETURN')) {
    return true;
  }
  if (
    user.subPermissions?.includes('SALES_RETURN') ||
    user.permissions?.includes('SALES_RETURN') ||
    user.subPermissions?.includes('PURCHASE_RETURN') ||
    user.permissions?.includes('PURCHASE_RETURN')
  ) {
    return true;
  }
  return false;
};

/**
 * Check if a user has permission to Export CSV from Product Directory
 */
export const canUserExportProductCsv = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.permissions?.includes('ALL')) {
    return true;
  }
  return !!(
    user.subPermissions?.includes('PRODUCT_EXPORT_CSV') ||
    user.permissions?.includes('PRODUCT_EXPORT_CSV')
  );
};

/**
 * Check if a user has permission to Export CSV from Enterprise Reports & Analytics
 */
export const canUserExportReportCsv = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.permissions?.includes('ALL')) {
    return true;
  }
  return !!(
    user.subPermissions?.includes('REPORT_EXPORT_CSV') ||
    user.permissions?.includes('REPORT_EXPORT_CSV')
  );
};

/**
 * Check if a user has permission to Download PDF from Enterprise Reports & Analytics
 */
export const canUserDownloadReportPdf = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.permissions?.includes('ALL')) {
    return true;
  }
  return !!(
    user.subPermissions?.includes('REPORT_DOWNLOAD_PDF') ||
    user.permissions?.includes('REPORT_DOWNLOAD_PDF')
  );
};

/**
 * Check if a user has permission to Print Statement from Enterprise Reports & Analytics
 */
export const canUserPrintReportStatement = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.permissions?.includes('ALL')) {
    return true;
  }
  return !!(
    user.subPermissions?.includes('REPORT_PRINT_STATEMENT') ||
    user.permissions?.includes('REPORT_PRINT_STATEMENT')
  );
};

/**
 * Check if a user has ANY of the specified permissions
 */
export const hasAnyPermission = (user: UserAccount | null | undefined, permissionIds: string[]): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.permissions?.includes('ALL')) {
    return true;
  }
  return permissionIds.some(id => hasPermission(user, id));
};

/**
 * Map a tab to the required permission(s)
 */
export const TAB_PERMISSION_MAP: Record<ViewTab, string[]> = {
  'dashboard': ['DASHBOARD'],
  'pos': ['POS_ACCESS'],
  'sales-list': ['SALES_MANAGEMENT'],
  'sales-returns': ['SALES_MANAGEMENT'],
  'quotations': ['SALES_MANAGEMENT'],
  'deleted-invoices': ['SALES_MANAGEMENT'],
  'purchase-entry': ['PURCHASE_MANAGEMENT'],
  'purchase-list': ['PURCHASE_MANAGEMENT'],
  'purchase-orders': ['PURCHASE_MANAGEMENT'],
  'purchase-returns': ['PURCHASE_MANAGEMENT'],
  'deleted-purchases': ['PURCHASE_MANAGEMENT'],
  'products-list': ['PRODUCTS_INVENTORY'],
  'medicine': ['PRODUCTS_INVENTORY', 'POS_ACCESS'],
  'batch-inventory': ['PRODUCTS_INVENTORY'],
  'categories': ['PRODUCTS_INVENTORY'],
  'warranties': ['PRODUCTS_INVENTORY'],
  'utilities': ['PRODUCTS_INVENTORY'],
  'customers': ['PARTIES_LEDGER'],
  'suppliers': ['PARTIES_LEDGER'],
  'due-list': ['PARTIES_LEDGER', 'SALES_MANAGEMENT'],
  'daybook': ['FINANCE_CASH'],
  'cash-adjustment': ['FINANCE_CASH'],
  'wallets': ['FINANCE_CASH'],
  'expenses': ['EXPENSES'],
  'installments': ['INSTALLMENTS'],
  'hr-payroll': ['HR_PAYROLL'],
  'reports': ['REPORTS'],
  'settings': ['SETTINGS'],
  'users': ['USER_MANAGEMENT'],
  'activity-logs': ['SETTINGS'],
};

/**
 * Check if a view tab is allowed for a user
 */
export const isTabAllowed = (user: UserAccount | null | undefined, tab: ViewTab): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.permissions?.includes('ALL')) {
    return true;
  }
  const requiredPermissions = TAB_PERMISSION_MAP[tab];
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }
  return requiredPermissions.some(perm => hasPermission(user, perm));
};

/**
 * Get first allowed tab for a user fallback
 */
export const getFirstAllowedTab = (user: UserAccount | null | undefined): ViewTab => {
  const tabsInPriority: ViewTab[] = [
    'dashboard',
    'pos',
    'sales-list',
    'purchase-list',
    'products-list',
    'customers',
    'daybook',
    'expenses',
    'installments',
    'hr-payroll',
    'reports',
    'settings',
    'users',
  ];

  for (const tab of tabsInPriority) {
    if (isTabAllowed(user, tab)) {
      return tab;
    }
  }
  return 'dashboard';
};

