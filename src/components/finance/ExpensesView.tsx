import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { ExpenseVoucher, ExpenseCategory } from '../../types';
import { canUserDelete, canUserEdit } from '../../utils/permissions';
import {
  DollarSign,
  Search,
  Plus,
  Trash2,
  Printer,
  FileText,
  Edit2,
  Tags,
  Save,
  X,
  User,
  ShieldCheck
} from 'lucide-react';

interface ExpensesViewProps {
  onOpenAddModal: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenAddModal }) => {
  const {
    language,
    expenseVouchers,
    expenseCategories,
    users,
    currentUser,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    formatCurrency,
    deleteExpenseVoucher,
    openPrintModal
  } = useApp();
  const { t } = useTranslation(language);

  const [activeTab, setActiveTab] = useState<'vouchers' | 'categories'>('vouchers');

  // --- VOUCHERS STATE ---
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cashierFilter, setCashierFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Helper to resolve creator / cashier info
  const getCreatorInfo = (exp: ExpenseVoucher) => {
    const user = users.find(
      u =>
        u.id === exp.createdBy ||
        u.username.toLowerCase() === (exp.createdBy || '').toLowerCase() ||
        u.fullName.toLowerCase() === (exp.createdBy || '').toLowerCase()
    );
    const name = user?.fullName || exp.createdBy || currentUser?.fullName || 'Admin';
    const role = user?.role || (name.toLowerCase().includes('cashier') ? 'CASHIER' : 'ADMIN');
    const initials =
      name
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'AD';
    return { name, role, initials, user };
  };

  // --- CATEGORY MASTER STATE ---
  const [isEditingCategory, setIsEditingCategory] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catNameBn, setCatNameBn] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const filteredExpenses = expenseVouchers.filter(exp => {
    const noteText = exp.note || exp.remarks || '';
    const catName = exp.categoryName || exp.category || '';
    const creator = getCreatorInfo(exp);
    const matchSearch =
      exp.voucherNo.toLowerCase().includes(search.toLowerCase()) ||
      noteText.toLowerCase().includes(search.toLowerCase()) ||
      catName.toLowerCase().includes(search.toLowerCase()) ||
      creator.name.toLowerCase().includes(search.toLowerCase()) ||
      (exp.payee && exp.payee.toLowerCase().includes(search.toLowerCase()));
    const matchCat =
      selectedCategory === 'ALL' ||
      exp.categoryId === selectedCategory ||
      exp.categoryName === selectedCategory ||
      exp.category === selectedCategory;
    const matchCashier =
      cashierFilter === 'ALL' ||
      exp.createdBy === cashierFilter ||
      creator.user?.id === cashierFilter ||
      creator.name.toLowerCase() === cashierFilter.toLowerCase();
    const matchStart = startDate ? exp.date >= startDate : true;
    const matchEnd = endDate ? exp.date <= endDate : true;
    return matchSearch && matchCat && matchCashier && matchStart && matchEnd;
  });

  const totalExpenseSum = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by category for visual breakdown
  const categoryTotals: { [key: string]: number } = {};
  filteredExpenses.forEach(e => {
    const key = e.categoryName || e.category || 'General';
    categoryTotals[key] = (categoryTotals[key] || 0) + e.amount;
  });

  const hasDeletePermission = canUserDelete(currentUser, 'expense');
  const hasEditPermission = canUserEdit(currentUser, 'expense');

  const handleDelete = (exp: ExpenseVoucher) => {
    if (!hasDeletePermission) {
      alert(language === 'bn' ? 'আপনার ভাউচার ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete vouchers');
      return;
    }
    if (confirm(`Delete expense voucher #${exp.voucherNo}?`)) {
      deleteExpenseVoucher(exp.id);
    }
  };

  const handlePrintVoucher = (exp: ExpenseVoucher) => {
    const creator = getCreatorInfo(exp);
    openPrintModal({
      type: 'EXPENSE_VOUCHER',
      title: `Expense Voucher ${exp.voucherNo}`,
      data: {
        voucherNo: exp.voucherNo,
        date: exp.date,
        category: exp.categoryName || exp.category || 'General Expense',
        categoryName: exp.categoryName || exp.category || 'General Expense',
        payee: exp.payee || '-',
        walletName: exp.walletName || 'Cash',
        cashierName: creator.name,
        createdBy: exp.createdBy,
        amount: exp.amount,
        receiptNo: exp.receiptNo || '',
        note: exp.note || exp.remarks || '-',
        remarks: exp.note || exp.remarks || '-',
      },
    });
  };

  const handlePrintExpenseReport = () => {
    const reportRows = filteredExpenses.map(exp => ({
      voucherNo: exp.voucherNo,
      date: exp.date,
      category: exp.categoryName || exp.category || 'General',
      payee: exp.payee || '-',
      wallet: exp.walletName || 'Cash',
      ref: exp.receiptNo || '-',
      description: exp.note || exp.remarks || '-',
      amount: exp.amount,
    }));

    const periodText = startDate && endDate
      ? `${startDate} to ${endDate}`
      : startDate
      ? `From ${startDate}`
      : endDate
      ? `Until ${endDate}`
      : 'All Records';

    const kpiSummary = Object.entries(categoryTotals).map(([cat, amt]) => ({
      label: cat,
      value: amt,
    }));

    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'দোকান ও ব্যবসায়ের খরচ বিবরণী খতিয়ান' : 'Expense & Operating Cost Statement',
      data: {
        reportTitle: language === 'bn' ? 'দোকান খরচ ও পরিচালনা ব্যয় খতিয়ান' : 'Business Expense & Operating Cost Statement',
        period: periodText,
        generatedDate: new Date().toLocaleDateString('en-GB'),
        kpis: [
          { label: language === 'bn' ? 'মোট ভাউচার' : 'Total Vouchers', value: `${filteredExpenses.length} pcs` },
          { label: language === 'bn' ? 'মোট খরচ' : 'Total Expenses', value: totalExpenseSum },
          ...kpiSummary.slice(0, 4),
        ],
        columns: [
          { header: language === 'bn' ? 'ভাউচার নং ও বিবরণ' : 'Voucher & Details', key: 'voucherNo', align: 'left' },
          { header: language === 'bn' ? 'তারিখ' : 'Date', key: 'date', align: 'center' },
          { header: language === 'bn' ? 'খরচের খাত' : 'Category', key: 'category', align: 'left' },
          { header: language === 'bn' ? 'প্রাপক / ব্যক্তি' : 'Payee', key: 'payee', align: 'left' },
          { header: language === 'bn' ? 'পরিশোধের মাধ্যম' : 'Account', key: 'wallet', align: 'left' },
          { header: language === 'bn' ? 'টাকার পরিমাণ' : 'Amount (৳)', key: 'amount', align: 'right' },
        ],
        rows: reportRows,
        totals: {
          'Total Expense': totalExpenseSum,
        },
      },
    });
  };

  // --- CATEGORY ACTIONS ---
  const handleEditCategory = (cat: ExpenseCategory) => {
    setIsEditingCategory(cat.id);
    setCatName(cat.name);
    setCatNameBn(cat.nameBn);
    setCatDesc(cat.description || '');
  };

  const handleCancelEditCategory = () => {
    setIsEditingCategory(null);
    setCatName('');
    setCatNameBn('');
    setCatDesc('');
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catNameBn) return;

    if (isEditingCategory === 'NEW') {
      addExpenseCategory({
        name: catName,
        nameBn: catNameBn,
        description: catDesc,
        code: `C-${Date.now().toString().slice(-4)}`,
      });
    } else if (isEditingCategory) {
      updateExpenseCategory(isEditingCategory, {
        name: catName,
        nameBn: catNameBn,
        description: catDesc,
      });
    }
    handleCancelEditCategory();
  };

  const handleDeleteCategory = (cat: ExpenseCategory) => {
    if (!hasDeletePermission) {
      alert(language === 'bn' ? 'আপনার খাত ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete categories');
      return;
    }
    if (confirm(`Delete category: ${cat.name}?`)) {
      deleteExpenseCategory(cat.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <span>{language === 'bn' ? 'খরচের হিসাব ও ভাউচার' : 'Expenses & Operating Cost Tracking'}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'bn' ? 'দোকানের ভাড়া, বিদ্যুৎ বিল, আপ্যায়ন ও পরিচালনা খরচ খতিয়ান' : 'Operating overhead, shop rent, utility bills, maintenance and expense categories'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'নতুন খরচ যোগ (New)' : 'New Expense Voucher'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab('vouchers')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'vouchers'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          {language === 'bn' ? 'খরচের ভাউচার তালিকা' : 'Expense Vouchers List'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          {language === 'bn' ? 'খরচের খাত মাস্টার (Category Master)' : 'Expense Categories Master'}
        </button>
      </div>

      {activeTab === 'vouchers' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Expense Category Breakdown Ticker */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(categoryTotals).map(([cat, amt]) => (
              <div key={cat} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-[10px] text-zinc-400 font-bold uppercase truncate">{cat}</div>
                <div className="text-base font-black text-purple-700 dark:text-purple-400 font-mono mt-0.5">
                  {formatCurrency(amt)}
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search voucher, payee, note..."
                  className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="py-1.5 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:border-purple-500 min-w-[150px]"
              >
                <option value="ALL">{language === 'bn' ? 'সকল খাত (All Categories)' : 'All Categories'}</option>
                {expenseCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {language === 'bn' ? cat.nameBn : cat.name}
                  </option>
                ))}
              </select>

              <select
                value={cashierFilter}
                onChange={e => setCashierFilter(e.target.value)}
                className="py-1.5 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:border-purple-500 min-w-[140px]"
              >
                <option value="ALL">{language === 'bn' ? 'সকল ক্যাশিয়ার/ইউজার' : 'All Cashiers/Users'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="py-1.5 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-purple-500"
                />
                <span className="text-zinc-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="py-1.5 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-purple-500"
                />
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-bold font-mono text-purple-700 dark:text-purple-400 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-100 dark:border-purple-900/60">
                Total: {formatCurrency(totalExpenseSum)}
              </div>
              <button
                type="button"
                onClick={handlePrintExpenseReport}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title={language === 'bn' ? 'খরচের খতিয়ান রিপোর্ট প্রিন্ট' : 'Print Expense Statement Report'}
              >
                <Printer className="w-3.5 h-3.5 text-purple-600" />
                <span>{language === 'bn' ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Voucher #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payee / Vendor</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'ইউজার / ক্যাশিয়ার' : 'Created By'}</th>
                    <th className="py-3 px-4">Paid Account</th>
                    <th className="py-3 px-4">Particulars / Notes</th>
                    <th className="py-3 px-4 text-right">Amount (৳)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-zinc-400">
                        {language === 'bn' ? 'কোনো খরচের ভাউচার পাওয়া যায়নি।' : 'No expense vouchers found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(exp => {
                      const creator = getCreatorInfo(exp);
                      return (
                        <tr key={exp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                            {exp.voucherNo}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">{exp.date}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded font-semibold text-[10px]">
                              {exp.categoryName || exp.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">
                            {exp.payee || '-'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                                {creator.initials}
                              </div>
                              <div>
                                <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">{creator.name}</div>
                                <div className="text-[9px] text-zinc-400 font-mono">{creator.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 font-medium whitespace-nowrap">
                            {exp.walletName}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 max-w-xs truncate">
                            {exp.note || exp.remarks || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-sm text-purple-600 dark:text-purple-400 whitespace-nowrap">
                            {formatCurrency(exp.amount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handlePrintVoucher(exp)}
                                title="Print Voucher"
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {hasDeletePermission && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(exp)}
                                  title="Delete Voucher"
                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 rounded transition-colors cursor-pointer"
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
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setIsEditingCategory('NEW');
                setCatName('');
                setCatNameBn('');
                setCatDesc('');
              }}
              className="px-3.5 py-1.5 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Tags className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'নতুন খাত যোগ করুন' : 'Add New Category'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category List */}
            <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 font-bold text-sm">
                {language === 'bn' ? 'খরচের খাতের তালিকা' : 'Expense Categories List'}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Name (English)</th>
                      <th className="py-3 px-4">Name (বাংলা)</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {expenseCategories.map(cat => (
                      <tr key={cat.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">{cat.name}</td>
                        <td className="py-3 px-4 font-medium">{cat.nameBn}</td>
                        <td className="py-3 px-4 text-zinc-500 truncate max-w-[200px]">{cat.description || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {hasEditPermission && (
                              <button
                                type="button"
                                onClick={() => handleEditCategory(cat)}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasDeletePermission && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Form */}
            {isEditingCategory && (
              <div className="md:col-span-1">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-purple-200 dark:border-purple-900/60 shadow-lg sticky top-4">
                  <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 bg-purple-50/50 dark:bg-purple-950/20">
                    <h3 className="font-bold text-purple-800 dark:text-purple-300 text-sm">
                      {isEditingCategory === 'NEW' 
                        ? (language === 'bn' ? 'নতুন খাত তৈরি' : 'Create New Category') 
                        : (language === 'bn' ? 'খাত আপডেট' : 'Update Category')}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCancelEditCategory}
                      className="p-1 text-zinc-400 hover:text-zinc-600 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleSaveCategory} className="p-4 space-y-3.5 text-xs">
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Category Name (English) *
                      </label>
                      <input
                        type="text"
                        required
                        value={catName}
                        onChange={e => setCatName(e.target.value)}
                        placeholder="e.g. Shop Rent"
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Category Name (বাংলা) *
                      </label>
                      <input
                        type="text"
                        required
                        value={catNameBn}
                        onChange={e => setCatNameBn(e.target.value)}
                        placeholder="উদাঃ দোকান ভাড়া"
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        value={catDesc}
                        onChange={e => setCatDesc(e.target.value)}
                        placeholder="Write short details about this category..."
                        rows={3}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEditCategory}
                        className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isEditingCategory === 'NEW' ? 'Save' : 'Update'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

