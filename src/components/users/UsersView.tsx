import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { UserAccount, UserRole, SaleInvoice } from '../../types';
import { Badge } from '../common/Badge';
import {
  UserCheck,
  Plus,
  Shield,
  Key,
  Mail,
  Phone,
  CheckCircle,
  X,
  Save,
  User,
  Lock,
  Trash2,
  Edit2,
  Check,
  Search,
  LogIn,
  ShieldCheck,
  RotateCcw,
  Sliders,
  DollarSign,
  TrendingUp,
  FileText,
  Calendar,
  Printer,
  Download,
  FileSpreadsheet,
  Pill,
} from 'lucide-react';

import {
  AVAILABLE_PERMISSIONS,
  ACTION_PERMISSIONS,
  ROLE_PRESET_PERMISSIONS,
  ROLE_PRESET_SUB_PERMISSIONS,
  canUserDelete,
  canUserEdit,
  canUserReturn,
  canUserExportProductCsv,
  canUserExportReportCsv,
  canUserDownloadReportPdf,
  canUserPrintReportStatement,
  canUserAccessMedicine,
  hasPermission,
} from '../../utils/permissions';

export const UsersView: React.FC = () => {
  const { language, users, currentUser, setCurrentUser, addUser, updateUser, deleteUser, showToast, switchUser, saleInvoices, formatCurrency, openPrintModal } = useApp();
  const { t } = useTranslation(language);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [selectedUserForSales, setSelectedUserForSales] = useState<UserAccount | null>(null);

  // User Sales Filter State
  const [userSalesFilterType, setUserSalesFilterType] = useState<'all' | 'daily' | 'monthly' | 'custom'>('all');
  const [userSalesDate, setUserSalesDate] = useState(new Date().toISOString().split('T')[0]);
  const [userSalesMonth, setUserSalesMonth] = useState(new Date().toISOString().slice(0, 7));
  const [userSalesStartDate, setUserSalesStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [userSalesEndDate, setUserSalesEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Global Users Sales Filter State (for main table)
  const [globalFilterType, setGlobalFilterType] = useState<'all' | 'daily' | 'monthly' | 'custom'>('all');
  const [globalDate, setGlobalDate] = useState(new Date().toISOString().split('T')[0]);
  const [globalMonth, setGlobalMonth] = useState(new Date().toISOString().slice(0, 7));
  const [globalStartDate, setGlobalStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [globalEndDate, setGlobalEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('SALESMAN');
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<string[]>(['POS_ACCESS', 'SALES_MANAGEMENT']);
  const [subPermissions, setSubPermissions] = useState<string[]>(['SALES_ADD']);

  const getUserSalesSummary = (u: UserAccount) => {
    const userInvoices = saleInvoices.filter(inv =>
      inv.createdBy === u.id ||
      inv.createdBy === u.username ||
      inv.cashierName?.toLowerCase() === u.fullName.toLowerCase() ||
      inv.cashierName?.toLowerCase() === u.username.toLowerCase()
    );

    const filteredInvoices = userInvoices.filter(inv => {
      if (globalFilterType === 'daily') {
        return inv.date === globalDate;
      }
      if (globalFilterType === 'monthly') {
        return inv.date && inv.date.startsWith(globalMonth);
      }
      if (globalFilterType === 'custom') {
        return inv.date >= globalStartDate && inv.date <= globalEndDate;
      }
      return true;
    });

    const totalSales = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalDue = filteredInvoices.reduce((sum, inv) => sum + (inv.dueAmount || 0), 0);
    return { userInvoices: filteredInvoices, totalSales, totalPaid, totalDue };
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('SALESMAN');
    setIsActive(true);
    setPermissions(ROLE_PRESET_PERMISSIONS['SALESMAN'] || ['POS_ACCESS', 'SALES_MANAGEMENT']);
    setSubPermissions(ROLE_PRESET_SUB_PERMISSIONS['SALESMAN'] || ['SALES_ADD']);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setUsername(user.username);
    setEmail(user.email);
    setPassword(user.password || '');
    setPhone(user.phone || '');
    setRole(user.role);
    setIsActive(user.isActive);
    setPermissions(user.permissions || ['POS_ACCESS', 'SALES_MANAGEMENT']);
    setSubPermissions(user.subPermissions || []);
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    const presets = ROLE_PRESET_PERMISSIONS[newRole] || [];
    const subPresets = ROLE_PRESET_SUB_PERMISSIONS[newRole] || [];
    setPermissions(presets);
    setSubPermissions(subPresets);
  };

  const handleTogglePermission = (permId: string) => {
    setPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleToggleSubPermission = (subPermId: string) => {
    setSubPermissions(prev =>
      prev.includes(subPermId) ? prev.filter(p => p !== subPermId) : [...prev, subPermId]
    );
  };

  const handleToggleActionPermissionInModal = (actionId: 'CAN_DELETE' | 'CAN_EDIT' | 'CAN_RETURN') => {
    if (role === 'ADMIN') return;
    const isCurrentlyChecked = permissions.includes(actionId) || subPermissions.includes(actionId);

    if (isCurrentlyChecked) {
      setPermissions(prev => prev.filter(p => p !== actionId));
      setSubPermissions(prev => {
        let filtered = prev.filter(p => p !== actionId);
        if (actionId === 'CAN_DELETE') {
          filtered = filtered.filter(p => !['SALES_DELETE', 'PURCHASE_DELETE', 'PRODUCT_DELETE', 'USER_DELETE'].includes(p));
        } else if (actionId === 'CAN_EDIT') {
          filtered = filtered.filter(p => !['SALES_EDIT', 'PURCHASE_EDIT', 'PRODUCT_EDIT', 'USER_EDIT'].includes(p));
        } else if (actionId === 'CAN_RETURN') {
          filtered = filtered.filter(p => !['SALES_RETURN', 'PURCHASE_RETURN'].includes(p));
        }
        return filtered;
      });
    } else {
      setPermissions(prev => prev.includes(actionId) ? prev : [...prev, actionId]);
      setSubPermissions(prev => {
        const next = [...prev];
        if (!next.includes(actionId)) next.push(actionId);
        if (actionId === 'CAN_DELETE') {
          ['SALES_DELETE', 'PURCHASE_DELETE', 'PRODUCT_DELETE'].forEach(p => {
            if (!next.includes(p)) next.push(p);
          });
        } else if (actionId === 'CAN_EDIT') {
          ['SALES_EDIT', 'PURCHASE_EDIT', 'PRODUCT_EDIT'].forEach(p => {
            if (!next.includes(p)) next.push(p);
          });
        } else if (actionId === 'CAN_RETURN') {
          ['SALES_RETURN', 'PURCHASE_RETURN'].forEach(p => {
            if (!next.includes(p)) next.push(p);
          });
        }
        return next;
      });
    }
  };

  const handleToggleUserActionPermission = (targetUser: UserAccount, actionType: 'CAN_DELETE' | 'CAN_EDIT' | 'CAN_RETURN') => {
    if (currentUser.role !== 'ADMIN') {
      showToast(language === 'bn' ? 'শুধুমাত্র এডমিন পারমিশন পরিবর্তন করতে পারবেন।' : 'Only Admins can change user permissions.', 'error');
      return;
    }

    if (targetUser.role === 'ADMIN') {
      showToast(language === 'bn' ? 'এডমিন ইউজারের সকল পারমিশন স্বয়ংক্রিয়ভাবে সক্রিয় থাকে।' : 'Admin user has full access by default.', 'info');
      return;
    }

    const currentPerms = targetUser.permissions || [];
    const currentSubPerms = targetUser.subPermissions || [];

    let hasIt = false;
    if (actionType === 'CAN_DELETE') {
      hasIt = canUserDelete(targetUser);
    } else if (actionType === 'CAN_EDIT') {
      hasIt = canUserEdit(targetUser);
    } else if (actionType === 'CAN_RETURN') {
      hasIt = canUserReturn(targetUser);
    }

    let newPerms = [...currentPerms];
    let newSubPerms = [...currentSubPerms];

    if (hasIt) {
      // Revoke permission
      newPerms = newPerms.filter(p => p !== actionType);
      newSubPerms = newSubPerms.filter(p => p !== actionType);
      if (actionType === 'CAN_DELETE') {
        newSubPerms = newSubPerms.filter(p => !['SALES_DELETE', 'PURCHASE_DELETE', 'PRODUCT_DELETE', 'USER_DELETE'].includes(p));
      } else if (actionType === 'CAN_EDIT') {
        newSubPerms = newSubPerms.filter(p => !['SALES_EDIT', 'PURCHASE_EDIT', 'PRODUCT_EDIT', 'USER_EDIT'].includes(p));
      } else if (actionType === 'CAN_RETURN') {
        newSubPerms = newSubPerms.filter(p => !['SALES_RETURN', 'PURCHASE_RETURN'].includes(p));
      }
    } else {
      // Grant permission
      if (!newPerms.includes(actionType)) newPerms.push(actionType);
      if (!newSubPerms.includes(actionType)) newSubPerms.push(actionType);
      if (actionType === 'CAN_DELETE') {
        ['SALES_DELETE', 'PURCHASE_DELETE', 'PRODUCT_DELETE'].forEach(p => {
          if (!newSubPerms.includes(p)) newSubPerms.push(p);
        });
      } else if (actionType === 'CAN_EDIT') {
        ['SALES_EDIT', 'PURCHASE_EDIT', 'PRODUCT_EDIT'].forEach(p => {
          if (!newSubPerms.includes(p)) newSubPerms.push(p);
        });
      } else if (actionType === 'CAN_RETURN') {
        ['SALES_RETURN', 'PURCHASE_RETURN'].forEach(p => {
          if (!newSubPerms.includes(p)) newSubPerms.push(p);
        });
      }
    }

    updateUser(targetUser.id, {
      permissions: newPerms,
      subPermissions: newSubPerms,
    });

    const actionLabel = actionType === 'CAN_DELETE' ? 'Del (ডিলিট)' : actionType === 'CAN_EDIT' ? 'Edit (এডিট)' : 'Ret (রিটার্ন)';
    const statusLabel = !hasIt ? (language === 'bn' ? 'যুক্ত/সক্রিয় করা হয়েছে ✅' : 'Granted ✅') : (language === 'bn' ? 'বন্ধ করা হয়েছে ❌' : 'Revoked ❌');
    showToast(
      language === 'bn'
        ? `"${targetUser.fullName}"-এর জন্য ${actionLabel} পারমিশন ${statusLabel}`
        : `${actionLabel} permission ${statusLabel} for ${targetUser.fullName}`,
      !hasIt ? 'success' : 'info'
    );
  };

  const handleToggleUserSpecialPermission = (
    targetUser: UserAccount,
    permType: 'PRODUCT_EXPORT_CSV' | 'REPORT_EXPORT_CSV' | 'REPORT_DOWNLOAD_PDF' | 'REPORT_PRINT_STATEMENT'
  ) => {
    if (currentUser.role !== 'ADMIN') {
      showToast(language === 'bn' ? 'শুধুমাত্র এডমিন পারমিশন পরিবর্তন করতে পারবেন।' : 'Only Admins can change user permissions.', 'error');
      return;
    }

    if (targetUser.role === 'ADMIN') {
      showToast(language === 'bn' ? 'এডমিন ইউজারের সকল পারমিশন স্বয়ংক্রিয়ভাবে সক্রিয় থাকে।' : 'Admin user has full access by default.', 'info');
      return;
    }

    const currentSubPerms = targetUser.subPermissions || [];
    const currentPerms = targetUser.permissions || [];

    let hasIt = false;
    if (permType === 'PRODUCT_EXPORT_CSV') {
      hasIt = canUserExportProductCsv(targetUser);
    } else if (permType === 'REPORT_EXPORT_CSV') {
      hasIt = canUserExportReportCsv(targetUser);
    } else if (permType === 'REPORT_DOWNLOAD_PDF') {
      hasIt = canUserDownloadReportPdf(targetUser);
    } else if (permType === 'REPORT_PRINT_STATEMENT') {
      hasIt = canUserPrintReportStatement(targetUser);
    }

    let newSubPerms = [...currentSubPerms];
    let newPerms = [...currentPerms];

    if (hasIt) {
      newSubPerms = newSubPerms.filter(p => p !== permType);
      newPerms = newPerms.filter(p => p !== permType);
    } else {
      if (!newSubPerms.includes(permType)) newSubPerms.push(permType);
      // Ensure the parent module is also active so user can access the tab
      if (permType === 'PRODUCT_EXPORT_CSV') {
        if (!newPerms.includes('PRODUCTS_INVENTORY') && !newPerms.includes('ALL')) {
          newPerms.push('PRODUCTS_INVENTORY');
        }
      } else {
        if (!newPerms.includes('REPORTS') && !newPerms.includes('ALL')) {
          newPerms.push('REPORTS');
        }
      }
    }

    updateUser(targetUser.id, {
      permissions: newPerms,
      subPermissions: newSubPerms,
    });

    const labelMap: Record<string, { bn: string; en: string }> = {
      PRODUCT_EXPORT_CSV: { bn: 'Product Export CSV', en: 'Product Export CSV' },
      REPORT_EXPORT_CSV: { bn: 'Report Export CSV', en: 'Report Export CSV' },
      REPORT_DOWNLOAD_PDF: { bn: 'Report Download PDF', en: 'Report Download PDF' },
      REPORT_PRINT_STATEMENT: { bn: 'Report Print Statement', en: 'Report Print Statement' },
    };

    const actionLabel = labelMap[permType]?.[language === 'bn' ? 'bn' : 'en'] || permType;
    const statusLabel = !hasIt ? (language === 'bn' ? 'অনুমতি প্রদান করা হয়েছে ✅' : 'Granted ✅') : (language === 'bn' ? 'অনুমতি প্রত্যাহার করা হয়েছে ❌' : 'Revoked ❌');
    showToast(
      language === 'bn'
        ? `"${targetUser.fullName}"-এর জন্য ${actionLabel} ${statusLabel}`
        : `${actionLabel} ${statusLabel} for ${targetUser.fullName}`,
      !hasIt ? 'success' : 'info'
    );
  };

  const handleToggleUserMedicinePermission = (targetUser: UserAccount) => {
    if (currentUser.role !== 'ADMIN') {
      showToast(language === 'bn' ? 'শুধুমাত্র এডমিন পারমিশন পরিবর্তন করতে পারবেন।' : 'Only Admins can change user permissions.', 'error');
      return;
    }
    const currentPerms = targetUser.permissions || [];
    const hasMed = hasPermission(targetUser, 'MEDICINE_ACCESS');
    let newPerms = [...currentPerms];
    if (hasMed) {
      newPerms = newPerms.filter(p => p !== 'MEDICINE_ACCESS');
    } else {
      if (!newPerms.includes('MEDICINE_ACCESS')) {
        newPerms.push('MEDICINE_ACCESS');
      }
    }
    updateUser(targetUser.id, { permissions: newPerms });
    showToast(
      language === 'bn'
        ? `"${targetUser.fullName}"-এর জন্য মেডিসিন বাটন ${!hasMed ? 'অনুমতি প্রদান করা হয়েছে ✅' : 'বন্ধ করা হয়েছে ❌'}`
        : `Medicine access ${!hasMed ? 'granted ✅' : 'revoked ❌'} for ${targetUser.fullName}`,
      !hasMed ? 'success' : 'info'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      showToast(language === 'bn' ? 'পূর্ণ নাম ও ইউজার আইডি আবশ্যক।' : 'Name and User ID (Username) are required.', 'warning');
      return;
    }

    const userData = {
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
      password: password ? password.trim() : undefined,
      phone: phone.trim(),
      role,
      isActive,
      permissions,
      subPermissions,
    };

    if (editingUser) {
      updateUser(editingUser.id, userData);
      showToast(language === 'bn' ? 'ইউজার সফলভাবে আপডেট হয়েছে।' : 'User updated successfully.', 'success');
    } else {
      if (!password.trim()) {
        showToast(language === 'bn' ? 'নতুন ইউজারের জন্য পাসওয়ার্ড আবশ্যক।' : 'Password is required for new user.', 'warning');
        return;
      }
      addUser({ ...userData, password: password.trim() } as any);
      showToast(language === 'bn' ? 'নতুন ইউজার সফলভাবে তৈরি হয়েছে।' : 'New user created successfully.', 'success');
    }

    setIsModalOpen(false);
  };

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span>{language === 'bn' ? 'ইউজার ম্যানেজমেন্ট ও পারমিশন কন্ট্রোল' : 'User Management & Permissions'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'bn' 
              ? 'সেলসম্যান ও অন্যান্য ইউজার যোগ করুন, পাসওয়ার্ড ও ডিলিট/এডিট/রিটার্ন বাটন পারমিশন নিয়ন্ত্রণ করুন।' 
              : 'Add Sales Man and other user roles, manage passwords, and configure Delete, Edit & Return button permissions.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'bn' ? 'নতুন ইউজার / সেলসম্যান যোগ করুন' : 'Add User / Sales Man'}</span>
        </button>
      </div>

      {/* Security Policy Information Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'bn' ? 'সিস্টেম রোল ও লগইন নিরাপত্তা নীতি' : 'System Role & Login Security Policy'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">
                RBAC Security Active
              </span>
            </h4>
            <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              {language === 'bn'
                ? 'এডমিন (ADMIN) লগইন করার পর যেকোনো ইউজারের প্রোফাইলে আইডি ও পাসওয়ার্ড ছাড়া সরাসরি সুইচ করতে পারবে। কিন্তু এডমিন ব্যতীত অন্য যেকোনো ইউজার (Sales Man, Cashier, Manager ইত্যাদি) লগইন থাকলে, সে সঠিক আইডি ও পাসওয়ার্ড প্রদান ছাড়া অন্য কোনো ইউজারে পরিবর্তন হতে পারবে না।'
                : 'After Admin login, any user profile can be switched to without ID & password. However, when non-admin users are logged in, switching to any other user account strictly requires entering the correct account password.'}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'ইউজার আইডি, নাম বা রোল দিয়ে খুঁজুন...' : 'Search by username, name or role...'}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Global Time Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setGlobalFilterType('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                globalFilterType === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {language === 'bn' ? 'সব সময় (All)' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setGlobalFilterType('daily')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                globalFilterType === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {language === 'bn' ? 'দৈনিক (Daily)' : 'Daily'}
            </button>
            <button
              type="button"
              onClick={() => setGlobalFilterType('monthly')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                globalFilterType === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {language === 'bn' ? 'মাসিক (Monthly)' : 'Monthly'}
            </button>
            <button
              type="button"
              onClick={() => setGlobalFilterType('custom')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                globalFilterType === 'custom'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {language === 'bn' ? 'ডেট-টু-ডেট (Date-to-Date)' : 'Date to Date'}
            </button>
          </div>

          {/* Conditional Date Pickers */}
          {globalFilterType === 'daily' && (
            <input
              type="date"
              value={globalDate}
              onChange={e => setGlobalDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
            />
          )}
          {globalFilterType === 'monthly' && (
            <input
              type="month"
              value={globalMonth}
              onChange={e => setGlobalMonth(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
            />
          )}
          {globalFilterType === 'custom' && (
            <div className="flex items-center gap-1 text-xs">
              <input
                type="date"
                value={globalStartDate}
                onChange={e => setGlobalStartDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={globalEndDate}
                onChange={e => setGlobalEndDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              openPrintModal({
                type: 'REPORT',
                title: language === 'bn' ? 'সকল ব্যবহারকারীর বিক্রয় পারফরম্যান্স রিপোর্ট' : 'All Users Sales Performance Report',
                data: {
                  reportTitle: language === 'bn' ? 'সকল ব্যবহারকারীর বিক্রয় এবং পারফরম্যান্স রিপোর্ট' : 'ALL USERS SALES PERFORMANCE REPORT',
                  period: `Filter: ${globalFilterType.toUpperCase()} (${globalStartDate || 'Start'} - ${globalEndDate || 'Today'})`,
                  columns: [
                    { header: language === 'bn' ? 'ব্যবহারকারী' : 'User Name', key: 'name' },
                    { header: language === 'bn' ? 'ইউজারনেম' : 'Username', key: 'username' },
                    { header: language === 'bn' ? 'রোল' : 'Role', key: 'role' },
                    { header: language === 'bn' ? 'মোট বিক্রয় (টাকা)' : 'Total Sales', key: 'totalSales', align: 'right', format: 'currency' },
                    { header: language === 'bn' ? 'ইনভয়েস সংখ্যা' : 'Invoices', key: 'invoiceCount', align: 'center' },
                  ],
                  rows: users.map(u => {
                    const summary = getUserSalesSummary(u);
                    return {
                      name: u.fullName || u.username,
                      username: `@${u.username}`,
                      role: u.role,
                      totalSales: summary.totalSales,
                      invoiceCount: summary.userInvoices.length,
                    };
                  }),
                },
              });
            }}
            title="Print All Users Sales Report"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 text-center border-b border-slate-300 pb-4">
        <h2 className="text-xl font-bold text-slate-900">DokanPro ERP - User Sales & Performance Report</h2>
        <p className="text-xs text-slate-600 mt-1">
          Filter Type: <span className="font-bold uppercase">{globalFilterType}</span>
          {globalFilterType === 'daily' && ` (${globalDate})`}
          {globalFilterType === 'monthly' && ` (${globalMonth})`}
          {globalFilterType === 'custom' && ` (${globalStartDate} to ${globalEndDate})`}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">Printed on: {new Date().toLocaleString()}</p>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Full Name & ID</th>
                <th className="py-3 px-4 font-mono">User ID / Username</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span>{language === 'bn' ? 'মোট বিক্রি (Total Sales)' : 'Total Sales'}</span>
                    <span className="text-[10px] font-normal text-slate-400 font-mono">Invoices count</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span>{language === 'bn' ? 'পরিশোধিত (Total Paid)' : 'Total Paid'}</span>
                    <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 font-mono">Collected</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span>{language === 'bn' ? 'বকেয়া (Total Due)' : 'Total Due'}</span>
                    <span className="text-[10px] font-normal text-rose-600 dark:text-rose-400 font-mono">Pending</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center">
                  <div className="flex flex-col items-center">
                    <span>{language === 'bn' ? 'অ্যাকশন পারমিশন' : 'Action Permissions'}</span>
                    <span className="text-[10px] font-normal text-slate-400 font-mono">Del · Edit · Ret (Click to Toggle)</span>
                  </div>
                </th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4 text-center">
                  <div className="flex flex-col items-center">
                    <span>{language === 'bn' ? 'মডিউল ও অ্যাকশন পারমিশন' : 'Modules & Permissions'}</span>
                    <span className="text-[10px] font-normal text-slate-400 font-mono">
                      {language === 'bn' ? 'CSV · PDF · Print পারমিশন' : 'CSV · PDF · Print access'}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const hasDel = canUserDelete(u);
                  const hasEd = canUserEdit(u);
                  const hasRet = canUserReturn(u);
                  const { userInvoices, totalSales, totalPaid, totalDue } = getUserSalesSummary(u);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs ${
                            u.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400' :
                            u.role === 'SALESMAN' ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400' :
                            u.role === 'MANAGER' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {u.fullName.charAt(0)}
                          </div>
                          <span>{u.fullName}</span>
                          {u.id === currentUser.id && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                              (You)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        @{u.username}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                          u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                          u.role === 'SALESMAN' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          u.role === 'MANAGER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                          u.role === 'ACCOUNTANT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          {u.role === 'SALESMAN' ? (language === 'bn' ? 'SALES MAN (সেলসম্যান)' : 'SALES MAN') : u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForSales(u)}
                          title="Click to view invoices"
                          className="font-mono font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <span>{formatCurrency(totalSales)}</span>
                          <span className="text-[10px] bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0.2 rounded font-bold">
                            {userInvoices.length}x
                          </span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(totalDue)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Delete (Del) Toggle Button */}
                          <button
                            type="button"
                            disabled={u.role === 'ADMIN'}
                            onClick={() => handleToggleUserActionPermission(u, 'CAN_DELETE')}
                            title={
                              u.role === 'ADMIN'
                                ? 'Admin has all permissions by default'
                                : (hasDel 
                                    ? (language === 'bn' ? 'ডিলিট পারমিশন সক্রিয় (ক্লিক করে বন্ধ করুন)' : 'Delete Allowed (Click to Revoke)') 
                                    : (language === 'bn' ? 'ডিলিট পারমিশন বন্ধ (ক্লিক করে চালু করুন)' : 'Delete Blocked (Click to Grant)'))
                            }
                            className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                              hasDel
                                ? 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60'
                            } ${u.role === 'ADMIN' ? 'cursor-default opacity-100' : ''}`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Del</span>
                            {hasDel ? (
                              <Check className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                            ) : (
                              <X className="w-2.5 h-2.5 text-slate-400" />
                            )}
                          </button>

                          {/* Edit Toggle Button */}
                          <button
                            type="button"
                            disabled={u.role === 'ADMIN'}
                            onClick={() => handleToggleUserActionPermission(u, 'CAN_EDIT')}
                            title={
                              u.role === 'ADMIN'
                                ? 'Admin has all permissions by default'
                                : (hasEd 
                                    ? (language === 'bn' ? 'এডিট পারমিশন সক্রিয় (ক্লিক করে বন্ধ করুন)' : 'Edit Allowed (Click to Revoke)') 
                                    : (language === 'bn' ? 'এডিট পারমিশন বন্ধ (ক্লিক করে চালু করুন)' : 'Edit Blocked (Click to Grant)'))
                            }
                            className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                              hasEd
                                ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/80 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60'
                            } ${u.role === 'ADMIN' ? 'cursor-default opacity-100' : ''}`}
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                            {hasEd ? (
                              <Check className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <X className="w-2.5 h-2.5 text-slate-400" />
                            )}
                          </button>

                          {/* Return (Ret) Toggle Button */}
                          <button
                            type="button"
                            disabled={u.role === 'ADMIN'}
                            onClick={() => handleToggleUserActionPermission(u, 'CAN_RETURN')}
                            title={
                              u.role === 'ADMIN'
                                ? 'Admin has all permissions by default'
                                : (hasRet 
                                    ? (language === 'bn' ? 'রিটার্ন পারমিশন সক্রিয় (ক্লিক করে বন্ধ করুন)' : 'Return Allowed (Click to Revoke)') 
                                    : (language === 'bn' ? 'রিটার্ন পারমিশন বন্ধ (ক্লিক করে চালু করুন)' : 'Return Blocked (Click to Grant)'))
                            }
                            className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                              hasRet
                                ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60'
                            } ${u.role === 'ADMIN' ? 'cursor-default opacity-100' : ''}`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Ret</span>
                            {hasRet ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <X className="w-2.5 h-2.5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700 dark:text-slate-300">{u.email || '-'}</div>
                        {u.phone && <div className="text-[10px] text-slate-400 font-mono">{u.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const canProdCsv = canUserExportProductCsv(u);
                          const canRepCsv = canUserExportReportCsv(u);
                          const canRepPdf = canUserDownloadReportPdf(u);
                          const canRepPrint = canUserPrintReportStatement(u);
                          const hasMedAccess = canUserAccessMedicine(u);

                          return (
                            <div className="flex flex-col items-center gap-1.5 min-w-[210px]">
                              {/* Overall module count or ALL badge */}
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs">
                                  {u.permissions?.includes('ALL') || u.role === 'ADMIN' ? 'ALL (Full Access)' : `${u.permissions?.length || 0} Modules`}
                                </span>
                              </div>

                              {/* Granular Export / PDF / Print / Medicine Quick-Toggles */}
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {/* Medicine Access Toggle */}
                                <button
                                  type="button"
                                  disabled={u.role === 'ADMIN'}
                                  onClick={() => handleToggleUserMedicinePermission(u)}
                                  title={
                                    u.role === 'ADMIN'
                                      ? 'Admin has full access'
                                      : (hasMedAccess
                                          ? (language === 'bn' ? 'মেডিসিন / ঔষধ বাটন পারমিশন সক্রিয় (ক্লিক করে বন্ধ করুন)' : 'Medicine Button: Allowed (Click to toggle off)')
                                          : (language === 'bn' ? 'মেডিসিন / ঔষধ বাটন পারমিশন বন্ধ (ক্লিক করে অনুমতি দিন)' : 'Medicine Button: Disabled (Click to grant)'))
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all shadow-2xs ${
                                    hasMedAccess
                                      ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60'
                                  } ${u.role === 'ADMIN' ? 'cursor-default opacity-100' : 'cursor-pointer'}`}
                                >
                                  <Pill className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Medicine</span>
                                  {hasMedAccess ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <X className="w-2.5 h-2.5 text-slate-400" />}
                                </button>

                                {/* 1. Product Export CSV */}
                                <button
                                  type="button"
                                  disabled={u.role === 'ADMIN'}
                                  onClick={() => handleToggleUserSpecialPermission(u, 'PRODUCT_EXPORT_CSV')}
                                  title={
                                    u.role === 'ADMIN'
                                      ? 'Admin has full access'
                                      : (canProdCsv
                                          ? (language === 'bn' ? 'Product Directory: CSV এক্সপোর্ট সক্রিয় (ক্লিক করে বন্ধ করুন)' : 'Product Directory: Export CSV Allowed (Click to toggle off)')
                                          : (language === 'bn' ? 'Product Directory: CSV এক্সপোর্ট বন্ধ (ক্লিক করে অনুমতি দিন)' : 'Product Directory: Export CSV Disabled (Click to grant)'))
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all shadow-2xs ${
                                    canProdCsv
                                      ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60'
                                  } ${u.role === 'ADMIN' ? 'cursor-default opacity-100' : 'cursor-pointer'}`}
                                >
                                  <FileSpreadsheet className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Prod CSV</span>
                                  {canProdCsv ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <X className="w-2.5 h-2.5 text-slate-400" />}
                                </button>

                                {/* 2. Report Export CSV */}
                                <button
                                  type="button"
                                  disabled={u.role === 'ADMIN'}
                                  onClick={() => handleToggleUserSpecialPermission(u, 'REPORT_EXPORT_CSV')}
                                  title={
                                    u.role === 'ADMIN'
                                      ? 'Admin has full access'
                                      : (canRepCsv
                                          ? (language === 'bn' ? 'Reports: CSV এক্সপোর্ট সক্রিয় (ক্লিক করে বন্ধ করুন)' : 'Reports: Export CSV Allowed (Click to toggle off)')
                                          : (language === 'bn' ? 'Reports: CSV এক্সপোর্ট বন্ধ (ক্লিক করে অনুমতি দিন)' : 'Reports: Export CSV Disabled (Click to grant)'))
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all shadow-2xs ${
                                    canRepCsv
                                      ? 'bg-teal-100 hover:bg-teal-200 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60'
                                  } ${u.role === 'ADMIN' ? 'cursor-default opacity-100' : 'cursor-pointer'}`}
                                >
                                  <FileSpreadsheet className="w-2.5 h-2.5 text-teal-600" />
                                  <span>Rep CSV</span>
                                  {canRepCsv ? <Check className="w-2.5 h-2.5 text-teal-600" /> : <X className="w-2.5 h-2.5 text-slate-400" />}
                                </button>

                                {/* 3. Report Download PDF */}
                                <button
                                  type="button"
                                  disabled={u.role === 'ADMIN'}
                                  onClick={() => handleToggleUserSpecialPermission(u, 'REPORT_DOWNLOAD_PDF')}
                                  title={
                                    u.role === 'ADMIN'
                                      ? 'Admin has full access'
                                      : (canRepPdf
                                          ? (language === 'bn' ? 'Reports: PDF ডাউনলোড সক্রিয় (ক্লিক করে বন্ধ করুন)' : 'Reports: Download PDF Allowed (Click to toggle off)')
                                          : (language === 'bn' ? 'Reports: PDF ডাউনলোড বন্ধ (ক্লিক করে অনুমতি দিন)' : 'Reports: Download PDF Disabled (Click to grant)'))
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all shadow-2xs ${
                                    canRepPdf
                                      ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60'
                                  } ${u.role === 'ADMIN' ? 'cursor-default opacity-100' : 'cursor-pointer'}`}
                                >
                                  <Download className="w-2.5 h-2.5 text-blue-600" />
                                  <span>Rep PDF</span>
                                  {canRepPdf ? <Check className="w-2.5 h-2.5 text-blue-600" /> : <X className="w-2.5 h-2.5 text-slate-400" />}
                                </button>

                                {/* 4. Report Print Statement */}
                                <button
                                  type="button"
                                  disabled={u.role === 'ADMIN'}
                                  onClick={() => handleToggleUserSpecialPermission(u, 'REPORT_PRINT_STATEMENT')}
                                  title={
                                    u.role === 'ADMIN'
                                      ? 'Admin has full access'
                                      : (canRepPrint
                                          ? (language === 'bn' ? 'Reports: প্রিন্ট স্টেটমেন্ট সক্রিয় (ক্লিক করে বন্ধ করুন)' : 'Reports: Print Statement Allowed (Click to toggle off)')
                                          : (language === 'bn' ? 'Reports: প্রিন্ট স্টেটমেন্ট বন্ধ (ক্লিক করে অনুমতি দিন)' : 'Reports: Print Statement Disabled (Click to grant)'))
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all shadow-2xs ${
                                    canRepPrint
                                      ? 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60'
                                  } ${u.role === 'ADMIN' ? 'cursor-default opacity-100' : 'cursor-pointer'}`}
                                >
                                  <Printer className="w-2.5 h-2.5 text-purple-600" />
                                  <span>Rep Print</span>
                                  {canRepPrint ? <Check className="w-2.5 h-2.5 text-purple-600" /> : <X className="w-2.5 h-2.5 text-slate-400" />}
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          u.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {u.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => {
                                if (currentUser.role === 'ADMIN') {
                                  switchUser(u.id);
                                } else {
                                  const pass = prompt(
                                    language === 'bn'
                                      ? `"${u.fullName}" অ্যাকাউন্টে সুইচ করতে পাসওয়ার্ড দিন:`
                                      : `Enter password to switch to "${u.fullName}":`
                                  );
                                  if (pass !== null) {
                                    switchUser(u.id, pass);
                                  }
                                }
                              }}
                              title={
                                currentUser.role === 'ADMIN'
                                  ? (language === 'bn' ? `এডমিন সরাসরি সুইচ: "${u.fullName}" হিসেবে লগইন করুন (পাসওয়ার্ড ছাড়া)` : `Admin Direct Switch: Log in as ${u.fullName} (No password needed)`)
                                  : (language === 'bn' ? `"${u.fullName}" হিসেবে সুইচ করতে পাসওয়ার্ড প্রয়োজন` : `Password required to switch to ${u.fullName}`)
                              }
                              className={`p-1.5 rounded transition-colors cursor-pointer ${
                                currentUser.role === 'ADMIN'
                                  ? 'hover:bg-purple-50 dark:hover:bg-purple-950 text-purple-600 dark:text-purple-400'
                                  : 'hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {currentUser.role === 'ADMIN' ? (
                                <LogIn className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            title={language === 'bn' ? 'ইউজার, পাসওয়ার্ড ও পারমিশন এডিট করুন' : 'Edit User, ID, Password & Permissions'}
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 rounded transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {users.length > 1 && u.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(language === 'bn' ? `"${u.fullName}" ইউজারটি মুছে ফেলতে চান?` : `Delete user "${u.fullName}"?`)) {
                                  deleteUser(u.id);
                                }
                              }}
                              title="Delete User"
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create/Edit Modal with Permissions */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingUser 
                      ? (language === 'bn' ? 'ইউজার আইডি, পাসওয়ার্ড ও বাটন পারমিশন আপডেট' : 'Edit User, ID, Password & Permissions') 
                      : (language === 'bn' ? 'নতুন ইউজার / সেলসম্যান তৈরি করুন' : 'Create User Account / Sales Man')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'bn' ? 'ইউজারের লগইন তথ্য এবং ডিলিট, এডিট, রিটার্ন বাটন ও মডিউল পারমিশন সেট করুন' : 'Configure login credentials and Delete, Edit, Return button permissions'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'পূর্ণ নাম (Full Name)' : 'Full Name'} *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder={language === 'bn' ? 'যেমন: মোহাম্মদ রফিকুল ইসলাম' : 'e.g. Md. Rafiqul Islam'}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ইউজার আইডি / ইউজারনেম (User ID / Username)' : 'User ID / Username'} *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. salesman1"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ইমেইল (Email)' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. salesman@dokanpro.com"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'পাসওয়ার্ড (Password)' : 'Password'} {editingUser ? '(Leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="e.g. secret1234"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                    required={!editingUser}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ফোন নম্বর (Phone)' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ইউজার রোল (User Role)' : 'User Role'}
                  </label>
                  <select
                    value={role}
                    onChange={e => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-bold cursor-pointer text-blue-600 dark:text-blue-400"
                  >
                    <option value="SALESMAN">Sales Man (সেলসম্যান / মাঠকর্মী)</option>
                    <option value="CASHIER">Cashier (ক্যাশিয়ার / বিক্রয় কাউন্টার)</option>
                    <option value="MANAGER">Manager (ম্যানেজার / স্টক ও অপারেশন)</option>
                    <option value="ACCOUNTANT">Accountant (হিসাবরক্ষক / ফাইন্যান্স)</option>
                    <option value="ADMIN">Admin (এডমিন / ফুল এন্টারপ্রাইজ অ্যাক্সেস)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  {language === 'bn' ? 'অ্যাকাউন্ট সচল আছে (Active Account - Allowed to login)' : 'Account is Active & Allowed to Login'}
                </label>
              </div>

              {/* Action Button Permissions (Delete, Edit, Return) */}
              <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                      {language === 'bn' ? 'গুরুত্বপূর্ণ বাটন পারমিশন (Delete / Edit / Return Permissions)' : 'Critical Action Permissions'}
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
                    Action Control
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {language === 'bn'
                    ? 'কোন ইউজারকে ডিলিট বাটন, এডিট বাটন বা রিটার্ন বাটনের পারমিশন দেওয়া বা বন্ধ করার জন্য নিচের অপশনগুলো নির্বাচন করুন:'
                    : 'Configure whether this user is allowed to use Delete, Edit, or Return buttons across the system:'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {ACTION_PERMISSIONS.map(act => {
                    const isChecked = permissions.includes(act.id) || subPermissions.includes(act.id) || role === 'ADMIN';
                    return (
                      <div
                        key={act.id}
                        onClick={() => handleToggleActionPermissionInModal(act.id as any)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-white dark:bg-slate-900 border-amber-400 dark:border-amber-600 shadow-xs ring-2 ring-amber-400/20'
                            : 'bg-slate-100/80 dark:bg-slate-850/80 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                            {act.id === 'CAN_DELETE' && <Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                            {act.id === 'CAN_EDIT' && <Edit2 className="w-3.5 h-3.5 text-blue-600" />}
                            {act.id === 'CAN_RETURN' && <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{language === 'bn' ? act.nameBn : act.name}</span>
                          </div>
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center text-white ${
                            isChecked ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700 text-transparent'
                          }`}>
                            <Check className="w-3 h-3" />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {language === 'bn' ? act.descriptionBn : act.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Module Permissions Checkbox Grid */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="font-extrabold text-slate-900 dark:text-white text-sm block">
                      {language === 'bn' ? 'মডিউল ও মেনু পারমিশন (Module Access Permissions)' : 'Module Access Permissions'}
                    </label>
                    <span className="text-[11px] text-blue-600 font-bold">
                      {permissions.filter(p => !p.startsWith('CAN_')).length} of {AVAILABLE_PERMISSIONS.length} {language === 'bn' ? 'অনুমোদিত' : 'Granted'}
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPermissions(AVAILABLE_PERMISSIONS.map(p => p.id).concat(['CAN_DELETE', 'CAN_EDIT', 'CAN_RETURN']))}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold transition-colors cursor-pointer"
                    >
                      {language === 'bn' ? 'সব নির্বাচন' : 'Select All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPermissions([]);
                        setSubPermissions([]);
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold transition-colors cursor-pointer"
                    >
                      {language === 'bn' ? 'মুছে দিন' : 'Clear All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPermissions(ROLE_PRESET_PERMISSIONS[role] || []);
                        setSubPermissions(ROLE_PRESET_SUB_PERMISSIONS[role] || []);
                      }}
                      className="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded font-semibold transition-colors cursor-pointer"
                    >
                      {language === 'bn' ? `${role} প্রিসেট` : `${role} Preset`}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 max-h-60 overflow-y-auto p-1">
                  {AVAILABLE_PERMISSIONS.map(perm => {
                    const isChecked = permissions.includes(perm.id) || role === 'ADMIN';
                    return (
                      <div key={perm.id} className="space-y-1">
                        <div
                          onClick={() => {
                            if (role === 'ADMIN') return;
                            handleTogglePermission(perm.id);
                          }}
                          className={`flex items-start justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked 
                              ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 shadow-xs' 
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-xs block truncate">
                              {language === 'bn' ? perm.nameBn : perm.name}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {perm.description}
                            </span>
                          </div>
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-transparent'
                          }`}>
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        {isChecked && perm.subPermissions && (
                          <div className="pl-4 pr-1 grid grid-cols-1 gap-1">
                            {perm.subPermissions.map(sub => {
                              const isSubChecked = subPermissions.includes(sub.id) || role === 'ADMIN';
                              return (
                                <div
                                  key={sub.id}
                                  onClick={() => {
                                    if (role === 'ADMIN') return;
                                    handleToggleSubPermission(sub.id);
                                  }}
                                  className={`flex items-center justify-between p-1.5 rounded-lg border text-[10px] cursor-pointer transition-all ${
                                    isSubChecked
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                  }`}
                                >
                                  <span>{language === 'bn' ? sub.nameBn : sub.name}</span>
                                  {isSubChecked && <Check className="w-3 h-3 text-emerald-600" />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingUser ? (language === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes') : (language === 'bn' ? 'ইউজার তৈরি করুন' : 'Create User')}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* User Sales Breakdown Modal */}
      {selectedUserForSales && (() => {
        const { userInvoices: allUserInvoices } = getUserSalesSummary(selectedUserForSales);
        
        // Filter invoices based on selected filter type
        const filteredInvoices = allUserInvoices.filter(inv => {
          if (userSalesFilterType === 'daily') {
            return inv.date === userSalesDate;
          }
          if (userSalesFilterType === 'monthly') {
            return inv.date && inv.date.startsWith(userSalesMonth);
          }
          if (userSalesFilterType === 'custom') {
            return inv.date >= userSalesStartDate && inv.date <= userSalesEndDate;
          }
          return true;
        });

        const totalSales = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        const totalDue = filteredInvoices.reduce((sum, inv) => sum + (inv.dueAmount || 0), 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-base">
                    {selectedUserForSales.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{selectedUserForSales.fullName}</span>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded font-mono font-bold">
                        @{selectedUserForSales.username}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {language === 'bn' ? 'ইউজারের দৈনিক, মাসিক ও ডেট-টু-ডেট সেলস রিপোর্ট' : 'User Daily, Monthly & Date-to-Date Sales Report'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserForSales(null)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Controls Bar */}
              <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setUserSalesFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userSalesFilterType === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {language === 'bn' ? 'সব সময় (All)' : 'All Time'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserSalesFilterType('daily')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userSalesFilterType === 'daily'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {language === 'bn' ? 'দৈনিক (Daily)' : 'Daily'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserSalesFilterType('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userSalesFilterType === 'monthly'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {language === 'bn' ? 'মাসিক (Monthly)' : 'Monthly'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserSalesFilterType('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userSalesFilterType === 'custom'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {language === 'bn' ? 'ডেট টু ডেট (Date-to-Date)' : 'Date to Date'}
                  </button>
                </div>

                {/* Conditional Inputs */}
                <div className="flex items-center gap-2">
                  {userSalesFilterType === 'daily' && (
                    <input
                      type="date"
                      value={userSalesDate}
                      onChange={e => setUserSalesDate(e.target.value)}
                      className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                    />
                  )}
                  {userSalesFilterType === 'monthly' && (
                    <input
                      type="month"
                      value={userSalesMonth}
                      onChange={e => setUserSalesMonth(e.target.value)}
                      className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                    />
                  )}
                  {userSalesFilterType === 'custom' && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <input
                        type="date"
                        value={userSalesStartDate}
                        onChange={e => setUserSalesStartDate(e.target.value)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="date"
                        value={userSalesEndDate}
                        onChange={e => setUserSalesEndDate(e.target.value)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedUserForSales) return;
                      openPrintModal({
                        type: 'REPORT',
                        title: `${selectedUserForSales.fullName || selectedUserForSales.username} - ${language === 'bn' ? 'পারফরম্যান্স রিপোর্ট' : 'Performance Report'}`,
                        data: {
                          reportTitle: `USER PERFORMANCE REPORT: ${selectedUserForSales.fullName || selectedUserForSales.username} (@${selectedUserForSales.username})`,
                          period: `Filter: ${userSalesFilterType.toUpperCase()} (${userSalesStartDate || 'Start'} - ${userSalesEndDate || 'Today'})`,
                          columns: [
                            { header: language === 'bn' ? 'তারিখ' : 'Date', key: 'date' },
                            { header: language === 'bn' ? 'ইনভয়েস নং' : 'Invoice No', key: 'invoiceNumber' },
                            { header: language === 'bn' ? 'গ্রাহকের নাম' : 'Customer', key: 'customerName' },
                            { header: language === 'bn' ? 'পেমেন্ট পদ্ধতি' : 'Payment Method', key: 'paymentMethod' },
                            { header: language === 'bn' ? 'মোট পরিমাণ' : 'Grand Total', key: 'grandTotal', align: 'right', format: 'currency' },
                          ],
                          rows: filteredInvoices.map(inv => ({
                            date: inv.date,
                            invoiceNumber: inv.invoiceNumber,
                            customerName: inv.customerName || 'Cash Customer',
                            paymentMethod: inv.paymentMethod || 'CASH',
                            grandTotal: inv.grandTotal || 0,
                          })),
                        },
                      });
                    }}
                    title="Print Report"
                    className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    <span>{language === 'bn' ? 'মোট বিক্রয় (Total Sales)' : 'Total Sales'}</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {formatCurrency(totalSales)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {filteredInvoices.length} {language === 'bn' ? 'টি ইনভয়েস' : 'Invoices Found'}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'পরিশোধিত (Total Paid)' : 'Total Paid'}</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    {formatCurrency(totalPaid)}
                  </div>
                  <div className="text-[10px] text-emerald-600/80 mt-1 font-mono">
                    {totalSales > 0 ? ((totalPaid / totalSales) * 100).toFixed(1) : '0'}% Collected
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 shadow-2xs">
                  <div className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'বকেয়া (Total Due)' : 'Total Due'}</span>
                  </div>
                  <div className="text-lg font-bold text-rose-700 dark:text-rose-300 font-mono">
                    {formatCurrency(totalDue)}
                  </div>
                  <div className="text-[10px] text-rose-600/80 mt-1 font-mono">
                    {totalSales > 0 ? ((totalDue / totalSales) * 100).toFixed(1) : '0%'} Pending Due
                  </div>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="p-6 overflow-y-auto flex-1">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                  {language === 'bn' ? 'সম্পর্কিত ইনভয়েস তালিকা (Invoice List)' : 'Associated Invoices List'}
                </h4>
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    {language === 'bn' ? 'নির্বাচিত সমসাময়িক সময়ে কোনো ইনভয়েস পাওয়া যায়নি।' : 'No invoices found for the selected time period.'}
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Invoice #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3 text-right">Grand Total</th>
                          <th className="py-2.5 px-3 text-right">Paid</th>
                          <th className="py-2.5 px-3 text-right">Due</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                              {inv.date}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                              {inv.customerName}
                              <div className="text-[10px] text-slate-400 font-mono">{inv.customerPhone}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatCurrency(inv.grandTotal)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(inv.paidAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                              {formatCurrency(inv.dueAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                                inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                inv.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <button
                  type="button"
                  onClick={() => setSelectedUserForSales(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer text-xs"
                >
                  {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
