import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Employee, AdvanceSalary, PayrollEntry } from '../../types';
import { canUserDelete, canUserEdit } from '../../utils/permissions';
import { Badge } from '../common/Badge';
import {
  Users,
  Plus,
  DollarSign,
  Calendar,
  CreditCard,
  Building,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  X,
  Save,
  Printer,
  ChevronRight,
  TrendingDown,
  UserX,
  UserCheck,
  RotateCcw,
  Trash2,
  Edit2,
  Search,
  Download,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  FileText,
  Briefcase,
  HelpCircle,
} from 'lucide-react';

// Helper to calculate service duration
function calculateDuration(startDateStr: string, endDateStr?: string, language: 'en' | 'bn' = 'bn'): string {
  if (!startDateStr) return '-';
  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : new Date();

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years <= 0 && months <= 0) {
    const diffDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return language === 'bn' ? `${diffDays} দিন` : `${diffDays} days`;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(language === 'bn' ? `${years} বছর` : `${years} yr${years > 1 ? 's' : ''}`);
  }
  if (months > 0) {
    parts.push(language === 'bn' ? `${months} মাস` : `${months} mo${months > 1 ? 's' : ''}`);
  }

  return parts.join(' ') || (language === 'bn' ? '১ মাসের কম' : '< 1 month');
}

export const HrPayrollView: React.FC = () => {
  const {
    language,
    employees,
    advanceSalaries,
    payrollHistory,
    wallets,
    companySettings,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    resignEmployee,
    rejoinEmployee,
    giveAdvanceSalary,
    payEmployeeSalary,
    processMonthlyPayroll,
    openPrintModal,
    formatCurrency,
    showToast,
    activeHrSubTab,
    setActiveHrSubTab,
    currentUser,
  } = useApp();
  const { t } = useTranslation(language);

  // Sub-tabs: 'employees' | 'resigned' | 'advance' | 'payroll'
  const subTab = activeHrSubTab;
  const setSubTab = setActiveHrSubTab;

  const hasDeletePermission = canUserDelete(currentUser, 'hr');
  const hasEditPermission = canUserEdit(currentUser, 'hr');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Employee Add / Edit Modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [nid, setNid] = useState('');
  const [address, setAddress] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [houseRentAllowance, setHouseRentAllowance] = useState('0');
  const [medicalAllowance, setMedicalAllowance] = useState('0');
  const [conveyanceAllowance, setConveyanceAllowance] = useState('0');

  // Resignation Modal
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [resigningEmp, setResigningEmp] = useState<Employee | null>(null);
  const [resignedDate, setResignedDate] = useState('');
  const [resignationReason, setResignationReason] = useState('Personal Reason');
  const [customReason, setCustomReason] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [finalSettlementPaid, setFinalSettlementPaid] = useState(false);
  const [finalSettlementAmount, setFinalSettlementAmount] = useState('0');
  const [settlementWalletId, setSettlementWalletId] = useState(wallets[0]?.id || '');

  // Advance Salary Modal
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceWalletId, setAdvanceWalletId] = useState(wallets[0]?.id || '');
  const [advanceReason, setAdvanceReason] = useState('');

  // Payroll Processing
  const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
  const [payrollMonth, setPayrollMonth] = useState(currentMonthStr);
  const [payrollWalletId, setPayrollWalletId] = useState(wallets[0]?.id || '');

  // Single Employee Salary & Due Payment Modal
  const [isPaySalaryModalOpen, setIsPaySalaryModalOpen] = useState(false);
  const [payingEmp, setPayingEmp] = useState<Employee | null>(null);
  const [payModalMonth, setPayModalMonth] = useState(currentMonthStr);
  const [payModalGross, setPayModalGross] = useState(0);
  const [payModalAdvanceDeduct, setPayModalAdvanceDeduct] = useState(0);
  const [payModalTotalPayable, setPayModalTotalPayable] = useState(0);
  const [payModalAlreadyPaid, setPayModalAlreadyPaid] = useState(0);
  const [payModalRemainingDue, setPayModalRemainingDue] = useState(0);
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payMode, setPayMode] = useState<'FULL_DUE' | 'PARTIAL'>('FULL_DUE');
  const [payWalletId, setPayWalletId] = useState(wallets[0]?.id || '');
  const [payBonus, setPayBonus] = useState('0');
  const [payFine, setPayFine] = useState('0');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Lists
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'ACTIVE' || e.status === 'ON_LEAVE');
  }, [employees]);

  const resignedEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'RESIGNED');
  }, [employees]);

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department && e.department.trim()) set.add(e.department.trim());
    });
    return Array.from(set);
  }, [employees]);

  // Filtered active employees
  const filteredActiveEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const matchSearch =
        searchTerm === '' ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.nameBn && emp.nameBn.includes(searchTerm)) ||
        emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone.includes(searchTerm) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = selectedDept === 'ALL' || emp.department === selectedDept;

      return matchSearch && matchDept;
    });
  }, [activeEmployees, searchTerm, selectedDept]);

  // Filtered resigned employees
  const filteredResignedEmployees = useMemo(() => {
    return resignedEmployees.filter(emp => {
      const matchSearch =
        searchTerm === '' ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.nameBn && emp.nameBn.includes(searchTerm)) ||
        emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone.includes(searchTerm) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.resignationReason && emp.resignationReason.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchDept = selectedDept === 'ALL' || emp.department === selectedDept;

      return matchSearch && matchDept;
    });
  }, [resignedEmployees, searchTerm, selectedDept]);

  // Totals
  const totalBaseSalaries = activeEmployees.reduce(
    (sum, e) => sum + e.baseSalary + e.houseRentAllowance + e.medicalAllowance + e.conveyanceAllowance,
    0
  );

  const totalAdvanceGiven = advanceSalaries
    .filter(a => !a.isDeducted)
    .reduce((sum, a) => sum + a.amount, 0);

  // Handlers for Add / Edit Employee
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setName('');
    setNameBn('');
    setPhone('');
    setEmail('');
    setDesignation('Sales Executive');
    setDepartment('Sales');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setNid('');
    setAddress('');
    setBankAccount('');
    setBaseSalary('');
    setHouseRentAllowance('0');
    setMedicalAllowance('0');
    setConveyanceAllowance('0');
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setNameBn(emp.nameBn || '');
    setPhone(emp.phone);
    setEmail(emp.email || '');
    setDesignation(emp.designation);
    setDepartment(emp.department);
    setJoiningDate(emp.joiningDate || new Date().toISOString().split('T')[0]);
    setNid(emp.nid || '');
    setAddress(emp.address || '');
    setBankAccount(emp.bankAccount || '');
    setBaseSalary(emp.baseSalary.toString());
    setHouseRentAllowance(emp.houseRentAllowance.toString());
    setMedicalAllowance(emp.medicalAllowance.toString());
    setConveyanceAllowance(emp.conveyanceAllowance.toString());
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseSalary) {
      showToast(language === 'bn' ? 'নাম ও মূল বেতন প্রদান করুন।' : 'Name and base salary are required.', 'warning');
      return;
    }

    const bSal = parseFloat(baseSalary) || 0;
    const hr = parseFloat(houseRentAllowance) || 0;
    const med = parseFloat(medicalAllowance) || 0;
    const conv = parseFloat(conveyanceAllowance) || 0;

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: name.trim(),
        nameBn: nameBn.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        designation: designation.trim(),
        department: department.trim(),
        joiningDate: joiningDate || editingEmployee.joiningDate,
        nid: nid.trim() || undefined,
        address: address.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        baseSalary: bSal,
        houseRentAllowance: hr,
        medicalAllowance: med,
        conveyanceAllowance: conv,
      });
    } else {
      addEmployee({
        employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name.trim(),
        nameBn: nameBn.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        designation: designation.trim(),
        department: department.trim(),
        joiningDate: joiningDate || new Date().toISOString().split('T')[0],
        nid: nid.trim() || undefined,
        address: address.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        baseSalary: bSal,
        houseRentAllowance: hr,
        medicalAllowance: med,
        conveyanceAllowance: conv,
        status: 'ACTIVE',
      });
    }

    setIsEmployeeModalOpen(false);
  };

  // Resignation Handlers
  const handleOpenResignModal = (emp: Employee) => {
    setResigningEmp(emp);
    setResignedDate(new Date().toISOString().split('T')[0]);
    setResignationReason(language === 'bn' ? 'ব্যক্তিগত কারণ (Personal Reason)' : 'Personal Reason');
    setCustomReason('');
    setSettlementNotes('');
    setFinalSettlementPaid(false);
    setFinalSettlementAmount('0');
    setSettlementWalletId(wallets[0]?.id || '');
    setIsResignModalOpen(true);
  };

  const handleConfirmResignation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resigningEmp) return;

    const finalReason =
      resignationReason === 'Other' || resignationReason === 'অন্যান্য'
        ? customReason.trim() || 'Resigned'
        : resignationReason;

    const settlementAmt = parseFloat(finalSettlementAmount) || 0;

    resignEmployee(resigningEmp.id, {
      resignedDate: resignedDate || new Date().toISOString().split('T')[0],
      resignationReason: finalReason,
      settlementNotes: settlementNotes.trim() || undefined,
      finalSettlementAmount: finalSettlementPaid ? settlementAmt : 0,
      finalSettlementPaid: finalSettlementPaid && settlementAmt > 0,
      refundWalletId: finalSettlementPaid && settlementAmt > 0 ? settlementWalletId : undefined,
    });

    setIsResignModalOpen(false);
    setResigningEmp(null);
  };

  // Re-join Employee Handler
  const handleRejoin = (emp: Employee) => {
    const confirmMsg =
      language === 'bn'
        ? `আপনি কি নিশ্চিত যে ${emp.name}-কে পুনরায় সক্রিয় কর্মচারী তালিকায় যুক্ত করতে চান?`
        : `Are you sure you want to reinstate ${emp.name} to the active staff list?`;

    if (window.confirm(confirmMsg)) {
      rejoinEmployee(emp.id);
    }
  };

  // Delete Employee Handler
  const handleDeleteEmp = (emp: Employee) => {
    if (!hasDeletePermission) {
      showToast(language === 'bn' ? 'আপনার এমপ্লয়ি ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete employees', 'error');
      return;
    }
    const confirmMsg =
      language === 'bn'
        ? `আপনি কি নিশ্চিত যে ${emp.name}-এর রেকর্ড স্থায়ীভাবে মুছে ফেলতে চান?`
        : `Are you sure you want to permanently delete ${emp.name}?`;

    if (window.confirm(confirmMsg)) {
      deleteEmployee(emp.id);
    }
  };

  // Print Resignation & Clearance Certificate
  const handlePrintClearance = (emp: Employee) => {
    const duration = calculateDuration(emp.joiningDate, emp.resignedDate, language);
    const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? `কর্মচারী ছাড়পত্র ও চূড়ান্ত নিষ্পত্তি - ${emp.name}` : `Clearance & Resignation Settlement - ${emp.name}`,
      data: {
        reportTitle: language === 'bn' ? 'কর্মচারী পদত্যাগ ও চূড়ান্ত ছাড়পত্র সনদ' : 'EMPLOYEE RESIGNATION & CLEARANCE CERTIFICATE',
        period: `${emp.joiningDate} to ${emp.resignedDate || 'N/A'} (${duration})`,
        generatedDate: todayStr,
        filters: [
          { label: language === 'bn' ? 'কর্মচারী কোড' : 'Employee ID', value: emp.employeeCode },
          { label: language === 'bn' ? 'পদবি ও বিভাগ' : 'Designation & Dept', value: `${emp.designation} (${emp.department})` },
          { label: language === 'bn' ? 'যোগদানের তারিখ' : 'Joining Date', value: emp.joiningDate },
          { label: language === 'bn' ? 'পদত্যাগের তারিখ' : 'Resigned Date', value: emp.resignedDate || 'N/A' },
          { label: language === 'bn' ? 'মোট চাকরির মেয়াদ' : 'Tenure Duration', value: duration },
        ],
        kpis: [
          { label: language === 'bn' ? 'সর্বশেষ মূল বেতন' : 'Last Basic Salary', value: emp.baseSalary },
          {
            label: language === 'bn' ? 'চূড়ান্ত নিষ্পত্তি (Settlement)' : 'Final Settlement Paid',
            value: emp.finalSettlementAmount ? emp.finalSettlementAmount : 'N/A',
          },
          {
            label: language === 'bn' ? 'নিষ্পত্তির মাধ্যম' : 'Payment Account',
            value: emp.settlementWalletName || 'Direct Cash',
          },
        ],
        columns: [
          { header: language === 'bn' ? 'বিবরণ / বিষয়' : 'Item / Description', key: 'item', align: 'left' },
          { header: language === 'bn' ? 'তথ্য ও নোট' : 'Details / Remarks', key: 'details', align: 'left' },
          { header: language === 'bn' ? 'স্থিতি' : 'Status', key: 'status', align: 'center' },
        ],
        rows: [
          {
            item: language === 'bn' ? 'পদত্যাগের কারণ' : 'Reason for Resignation',
            details: emp.resignationReason || 'Personal Reasons',
            status: 'ACCEPTED',
          },
          {
            item: language === 'bn' ? 'কোম্পানি সরঞ্জাম ও আইডি হস্তান্তর' : 'Asset & ID Handover',
            details: emp.settlementNotes || 'All office keys, equipment, and access handed over smoothly.',
            status: 'CLEARED',
          },
          {
            item: language === 'bn' ? 'বকেয়া ঋণ / অসমন্বিত অগ্রিম' : 'Pending Advance / Loans',
            details: 'Zero outstanding advance balances.',
            status: 'CLEARED',
          },
          {
            item: language === 'bn' ? 'চূড়ান্ত বেতন ও নিষ্পত্তি' : 'Final Settlement & Accounts',
            details: emp.finalSettlementAmount ? `৳${emp.finalSettlementAmount.toLocaleString()} paid successfully.` : 'All dues settled.',
            status: 'COMPLETED',
          },
        ],
        notes:
          language === 'bn'
            ? `প্রত্যয়ন করা যাচ্ছে যে, ${emp.name} (${emp.designation}) আমাদের প্রতিষ্ঠানে বিশ্বস্ততার সাথে দায়িত্ব পালন করেছেন। তাহার পদত্যাগপত্র গ্রহণ করা হয়েছে এবং যাবতীয় হিসাব ও ছাড়পত্র সম্পন্ন হয়েছে।`
            : `This certifies that ${emp.name} served as ${emp.designation} in ${companySettings.name}. All institutional dues, clearances, and handover procedures have been successfully concluded.`,
      },
    });
  };

  // Export List to CSV
  const handleExportCSV = (isResigned: boolean) => {
    const list = isResigned ? filteredResignedEmployees : filteredActiveEmployees;
    if (list.length === 0) {
      showToast(language === 'bn' ? 'রপ্তানির জন্য কোনো তথ্য নেই।' : 'No records to export.', 'warning');
      return;
    }

    const headers = isResigned
      ? ['Code', 'Name', 'Designation', 'Department', 'Phone', 'Joining Date', 'Resigned Date', 'Duration', 'Reason', 'Settlement (BDT)']
      : ['Code', 'Name', 'Designation', 'Department', 'Phone', 'Base Salary', 'Allowances', 'Gross Salary', 'Joining Date', 'Status'];

    const rows = list.map(emp => {
      const allowances = emp.houseRentAllowance + emp.medicalAllowance + emp.conveyanceAllowance;
      const totalGross = emp.baseSalary + allowances;
      const duration = calculateDuration(emp.joiningDate, emp.resignedDate, 'en');

      if (isResigned) {
        return [
          emp.employeeCode,
          `"${emp.name}"`,
          `"${emp.designation}"`,
          `"${emp.department}"`,
          `"${emp.phone}"`,
          emp.joiningDate,
          emp.resignedDate || '',
          `"${duration}"`,
          `"${emp.resignationReason || ''}"`,
          emp.finalSettlementAmount || 0,
        ].join(',');
      }

      return [
        emp.employeeCode,
        `"${emp.name}"`,
        `"${emp.designation}"`,
        `"${emp.department}"`,
        `"${emp.phone}"`,
        emp.baseSalary,
        allowances,
        totalGross,
        emp.joiningDate,
        emp.status,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${isResigned ? 'resigned_staff_list' : 'active_employees_list'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(language === 'bn' ? 'CSV ফাইল ডাউনলোড সম্পন্ন হয়েছে।' : 'CSV exported successfully.', 'success');
  };

  // Handlers for Advance Salary
  const handleSaveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(advanceAmount) || 0;
    if (!selectedEmpId || numAmount <= 0) {
      showToast(language === 'bn' ? 'কর্মচারী ও সঠিক অগ্রিম টাকার পরিমাণ দিন।' : 'Select employee and enter valid amount.', 'warning');
      return;
    }

    const targetW = wallets.find(w => w.id === advanceWalletId) || wallets[0];
    if (targetW && targetW.balance < numAmount) {
      showToast(
        language === 'bn'
          ? `"${targetW.name}" ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳${targetW.balance.toLocaleString()} | অগ্রিম: ৳${numAmount.toLocaleString()}`
          : `Insufficient balance in "${targetW.name}"! Available: ৳${targetW.balance.toLocaleString()} | Advance: ৳${numAmount.toLocaleString()}`,
        'error'
      );
      return;
    }

    giveAdvanceSalary({
      employeeId: selectedEmpId,
      amount: numAmount,
      walletId: advanceWalletId,
      reason: advanceReason.trim() || 'Salary Advance',
      date: new Date().toISOString().split('T')[0],
    });

    setIsAdvanceModalOpen(false);
    setAdvanceAmount('');
    setAdvanceReason('');
    setSelectedEmpId('');
  };

  // Staff Monthly Payroll Calculations (Rules: 1 month salary once, only remaining due allowed for 2nd time)
  const monthlyStaffPayroll = useMemo(() => {
    return activeEmployees.map(emp => {
      const allowances = emp.houseRentAllowance + emp.medicalAllowance + emp.conveyanceAllowance;
      const grossPay = emp.baseSalary + allowances;

      // All vouchers disbursed for this employee in selected month
      const empVouchersForMonth = payrollHistory.filter(
        p => p.employeeId === emp.id && p.payrollMonth === payrollMonth
      );

      const alreadyPaid = empVouchersForMonth.reduce(
        (sum, p) => sum + (p.paidAmount ?? p.netPay ?? 0),
        0
      );

      let advanceDeduct = 0;
      if (empVouchersForMonth.length > 0) {
        advanceDeduct = empVouchersForMonth[0].advanceDeduction || 0;
      } else {
        const pendingAdv = advanceSalaries
          .filter(a => a.employeeId === emp.id && !a.isDeducted)
          .reduce((sum, a) => sum + a.amount, 0);
        advanceDeduct = pendingAdv;
      }

      const totalPayable = Math.max(0, grossPay - advanceDeduct);
      const remainingDue = Math.max(0, totalPayable - alreadyPaid);
      const status: 'PAID' | 'PARTIAL' | 'UNPAID' =
        remainingDue === 0 ? 'PAID' : alreadyPaid > 0 ? 'PARTIAL' : 'UNPAID';

      return {
        emp,
        grossPay,
        allowances,
        advanceDeduct,
        totalPayable,
        alreadyPaid,
        remainingDue,
        status,
        installmentCount: empVouchersForMonth.length,
        vouchers: empVouchersForMonth,
      };
    });
  }, [activeEmployees, payrollHistory, advanceSalaries, payrollMonth]);

  // Aggregate stats for selected month
  const monthlyTotals = useMemo(() => {
    const totalPayable = monthlyStaffPayroll.reduce((s, item) => s + item.totalPayable, 0);
    const totalPaid = monthlyStaffPayroll.reduce((s, item) => s + item.alreadyPaid, 0);
    const totalRemainingDue = monthlyStaffPayroll.reduce((s, item) => s + item.remainingDue, 0);
    const fullyPaidCount = monthlyStaffPayroll.filter(item => item.status === 'PAID').length;
    const partialCount = monthlyStaffPayroll.filter(item => item.status === 'PARTIAL').length;
    const unpaidCount = monthlyStaffPayroll.filter(item => item.status === 'UNPAID').length;

    return {
      totalPayable,
      totalPaid,
      totalRemainingDue,
      fullyPaidCount,
      partialCount,
      unpaidCount,
      totalStaff: monthlyStaffPayroll.length,
    };
  }, [monthlyStaffPayroll]);

  // Open Salary Payment / Due Payment Modal for Single Employee
  const handleOpenPaySalaryModal = (item: typeof monthlyStaffPayroll[0]) => {
    // RULE 1: If salary is already paid in full, do NOT allow 2nd payment
    if (item.remainingDue <= 0) {
      showToast(
        language === 'bn'
          ? `🚫 ${item.emp.name}-এর ${payrollMonth} মাসের বেতন ইতোমধ্যে সম্পূর্ণ পরিশোধিত (৳${item.alreadyPaid.toLocaleString()})! এই মাসের বেতন আর দ্বিতীয়বার দেওয়া যাবে না।`
          : `Salary for ${payrollMonth} has already been fully paid to ${item.emp.name}. Cannot pay again.`,
        'warning'
      );
      return;
    }

    setPayingEmp(item.emp);
    setPayModalMonth(payrollMonth);
    setPayModalGross(item.grossPay);
    setPayModalAdvanceDeduct(item.advanceDeduct);
    setPayModalTotalPayable(item.totalPayable);
    setPayModalAlreadyPaid(item.alreadyPaid);
    setPayModalRemainingDue(item.remainingDue);
    setPayAmountInput(item.remainingDue.toString());
    setPayMode('FULL_DUE');
    setPayWalletId(payrollWalletId || wallets[0]?.id || '');
    setPayBonus('0');
    setPayFine('0');
    setPayNotes(
      item.alreadyPaid > 0
        ? (language === 'bn' ? `${payrollMonth} মাসের ২য় কিস্তি বকেয়া বেতন পরিশোধ` : `2nd installment due settlement for ${payrollMonth}`)
        : `${payrollMonth} মাসের বেতন`
    );
    setPayDate(new Date().toISOString().split('T')[0]);
    setIsPaySalaryModalOpen(true);
  };

  // Confirm Single Employee Salary / Due Payment
  const handleConfirmPaySalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingEmp) return;

    const numAmount = parseFloat(payAmountInput) || 0;
    const numBonus = parseFloat(payBonus) || 0;
    const numFine = parseFloat(payFine) || 0;

    if (numAmount <= 0) {
      showToast(language === 'bn' ? 'সঠিক টাকার পরিমাণ দিন!' : 'Enter valid amount!', 'warning');
      return;
    }

    // RULE 2: If there is remaining due, payment amount cannot exceed remaining due
    if (numAmount > payModalRemainingDue) {
      showToast(
        language === 'bn'
          ? `⚠️ প্রদেয় টাকা (৳${numAmount.toLocaleString()}) অবশিষ্ট বকেয়ার (৳${payModalRemainingDue.toLocaleString()}) চেয়ে বেশি হতে পারে না!`
          : `Amount exceeds remaining due of ৳${payModalRemainingDue.toLocaleString()}!`,
        'error'
      );
      return;
    }

    const success = payEmployeeSalary({
      employeeId: payingEmp.id,
      payrollMonth: payModalMonth,
      amount: numAmount,
      walletId: payWalletId,
      bonus: numBonus > 0 ? numBonus : undefined,
      fineDeduction: numFine > 0 ? numFine : undefined,
      notes: payNotes.trim() || undefined,
      paymentDate: payDate,
    });

    if (success) {
      setIsPaySalaryModalOpen(false);
      setPayingEmp(null);
    }
  };

  // Handler for Bulk Payroll Process (only disburses to employees who have due > 0)
  const handleProcessBulkPayroll = () => {
    if (activeEmployees.length === 0) {
      showToast(language === 'bn' ? 'কোনো সক্রিয় কর্মচারী পাওয়া যায়নি' : 'No active employees found', 'warning');
      return;
    }

    if (monthlyTotals.totalRemainingDue <= 0) {
      showToast(
        language === 'bn'
          ? `🔒 ${payrollMonth} মাসের সকল কর্মচারীর বেতন ইতোমধ্যে সম্পূর্ণ পরিশোধিত হয়েছে। ২য় বার কোনো অতিরিক্ত বেতন প্রয়োজন নেই।`
          : `All employees are already fully paid for ${payrollMonth}.`,
        'warning'
      );
      return;
    }

    const targetW = wallets.find(w => w.id === payrollWalletId) || wallets[0];
    if (targetW && targetW.balance < monthlyTotals.totalRemainingDue) {
      showToast(
        language === 'bn'
          ? `"${targetW.name}" ওয়ালেটে পে-রোলের পর্যাপ্ত ব্যালেন্স নেই! প্রয়োজন: ৳${monthlyTotals.totalRemainingDue.toLocaleString()} | আছে: ৳${targetW.balance.toLocaleString()}`
          : `Insufficient balance in "${targetW.name}"! Required: ৳${monthlyTotals.totalRemainingDue.toLocaleString()} | Available: ৳${targetW.balance.toLocaleString()}`,
        'error'
      );
      return;
    }

    processMonthlyPayroll(payrollMonth, payrollWalletId);
  };

  // Print Salary Payslip
  const handlePrintPayslip = (entry: PayrollEntry) => {
    openPrintModal({
      type: 'PAYSLIP',
      title: `Salary Payslip - ${entry.employeeName} (${entry.payrollMonth})`,
      data: entry,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>{language === 'bn' ? 'এইচআর ও পে-রোল ম্যানেজমেন্ট' : 'HR & Payroll Management'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'bn'
              ? 'কর্মরত কর্মচারী তালিকা, রিজাইনড স্টাফ রেজিস্টার, অগ্রিম প্রদান ও মাসিক পে-রোল স্লিপ'
              : 'Active staff directory, resigned employees archive, advance disbursements, and payroll slip billing'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedEmpId('');
              setIsAdvanceModalOpen(true);
            }}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'অগ্রিম বেতন প্রদান' : 'Disburse Advance'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddEmployee}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'নতুন কর্মচারী যুক্ত করুন' : 'Add Employee'}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              {language === 'bn' ? 'কর্মরত কর্মচারী' : 'Active Staff'}
            </span>
            <span className="p-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {activeEmployees.length} <span className="text-xs text-slate-400 font-normal font-sans">{language === 'bn' ? 'জন' : 'Persons'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {language === 'bn' ? 'মাসিক মূল বেতন:' : 'Monthly Basic:'} {formatCurrency(totalBaseSalaries)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-950/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">
              {language === 'bn' ? 'রিজাইনড / প্রাক্তন স্টাফ' : 'Resigned Staff'}
            </span>
            <span className="p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-lg">
              <UserX className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
            {resignedEmployees.length} <span className="text-xs text-slate-400 font-normal font-sans">{language === 'bn' ? 'জন' : 'Persons'}</span>
          </div>
          <div className="text-[11px] text-rose-500/80 mt-1">
            {language === 'bn' ? 'আলাদা তালিকায় সংরক্ষিত' : 'Archived in separate list'}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-950/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
              {language === 'bn' ? 'অসমন্বিত অগ্রিম' : 'Undeducted Advance'}
            </span>
            <span className="p-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">
            {formatCurrency(totalAdvanceGiven)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'bn' ? 'পে-রোলে সমন্বয়যোগ্য' : 'Deductible in payroll'}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-950/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
              {language === 'bn' ? 'পরিশোধিত পে-রোল' : 'Disbursed Payroll'}
            </span>
            <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
            {payrollHistory.length} <span className="text-xs text-slate-400 font-normal font-sans">{language === 'bn' ? 'টি ভাউচার' : 'Vouchers'}</span>
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">
            {language === 'bn' ? 'ডে-বুক স্বয়ংক্রিয় সিঙ্ক' : 'Auto Day-Book linked'}
          </div>
        </div>
      </div>

      {/* 3. Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => {
            setSubTab('employees');
            setSearchTerm('');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'employees'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{language === 'bn' ? '১. কর্মরত কর্মচারী তালিকা' : '1. Active Staff Directory'}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              subTab === 'employees' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {activeEmployees.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('resigned');
            setSearchTerm('');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'resigned'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>{language === 'bn' ? '২. রিজাইনড / প্রাক্তন কর্মচারী' : '2. Resigned & Former Staff'}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              subTab === 'resigned' ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            {resignedEmployees.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('advance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'advance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{language === 'bn' ? '৩. অগ্রিম বেতন লেজার' : '3. Advance Salary Ledger'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('payroll')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'payroll'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{language === 'bn' ? '৪. মাসিক পে-রোল প্রসেসিং' : '4. Monthly Payroll Processing'}</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUBTAB 1: ACTIVE EMPLOYEES DIRECTORY                          */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'employees' && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'নাম, কোড, মোবাইল বা পদবি দিয়ে খুঁজুন...' : 'Search by name, code, phone, role...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>

              {departments.length > 0 && (
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="ALL">{language === 'bn' ? 'সকল বিভাগ (All Dept)' : 'All Departments'}</option>
                  {departments.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => handleExportCSV(false)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Active Employees Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-4">{language === 'bn' ? 'কর্মচারী' : 'Employee'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'পদবি ও বিভাগ' : 'Role & Department'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'যোগদান ও চাকরির মেয়াদ' : 'Joining & Tenure'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'মূল বেতন' : 'Base Salary'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'ভাতা' : 'Allowances'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'মোট গ্রস বেতন' : 'Total Gross'}</th>
                    <th className="py-3.5 px-4 text-center">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'একশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredActiveEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-sm">
                          {language === 'bn' ? 'কোনো সক্রিয় কর্মচারী পাওয়া যায়নি' : 'No active employees found'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {language === 'bn' ? 'নতুন কর্মচারী যোগ করতে উপরের বাটনে ক্লিক করুন।' : 'Click Add Employee to create a new staff record.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredActiveEmployees.map(emp => {
                      const allowances = emp.houseRentAllowance + emp.medicalAllowance + emp.conveyanceAllowance;
                      const totalGross = emp.baseSalary + allowances;
                      const tenure = calculateDuration(emp.joiningDate, undefined, language);

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{emp.name}</span>
                                  {emp.nameBn && <span className="text-slate-400 font-normal text-[11px]">({emp.nameBn})</span>}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                                  <span>{emp.employeeCode}</span>
                                  <span>•</span>
                                  <span>{emp.phone}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{emp.designation}</div>
                            <div className="text-[10px] text-slate-400">{emp.department}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                              {emp.joiningDate || '-'}
                            </div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{tenure}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(emp.baseSalary)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                            {formatCurrency(allowances)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(totalGross)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge status={emp.status} />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEmpId(emp.id);
                                  setIsAdvanceModalOpen(true);
                                }}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded cursor-pointer transition-colors"
                                title={language === 'bn' ? 'অগ্রিম বেতন দিন' : 'Disburse Advance'}
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditEmployee(emp)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition-colors"
                                title={language === 'bn' ? 'তথ্য এডিট করুন' : 'Edit Employee'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenResignModal(emp)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded cursor-pointer transition-colors font-semibold"
                                title={language === 'bn' ? 'কর্মচারী রিজাইন / পদত্যাগ করান' : 'Mark as Resigned'}
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
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

      {/* ------------------------------------------------------------- */}
      {/* SUBTAB 2: RESIGNED / FORMER EMPLOYEES SEPARATE LIST            */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'resigned' && (
        <div className="space-y-4">
          {/* Header & Filter Controls for Resigned Staff */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-200 dark:border-rose-950/60">
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'রিজাইনড কর্মচারী বা কারণ দিয়ে খুঁজুন...' : 'Search resigned staff or reasons...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>

              {departments.length > 0 && (
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="ALL">{language === 'bn' ? 'সকল বিভাগ' : 'All Departments'}</option>
                  {departments.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => handleExportCSV(true)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'রিপোর্ট এক্সপোর্ট (CSV)' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          {/* Resigned Employees Dedicated Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-rose-50/50 dark:bg-rose-950/30 text-slate-600 dark:text-slate-300 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-4">{language === 'bn' ? 'প্রাক্তন কর্মচারী' : 'Former Staff'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'পদবি ও বিভাগ' : 'Role & Department'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'চাকরির সময়কাল (যোগদান ➔ পদত্যাগ)' : 'Service Period'}</th>
                    <th className="py-3.5 px-4">{language === 'bn' ? 'পদত্যাগের কারণ ও নোট' : 'Resignation Reason'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'চূড়ান্ত নিষ্পত্তি (Settlement)' : 'Final Settlement'}</th>
                    <th className="py-3.5 px-4 text-center">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'একশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredResignedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <UserX className="w-10 h-10 mx-auto mb-2 opacity-30 text-rose-500" />
                        <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                          {language === 'bn' ? 'বর্তমানে কোনো রিজাইনড বা প্রাক্তন কর্মচারী নেই' : 'No resigned employees recorded'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          {language === 'bn'
                            ? 'কর্মরত কর্মচারী তালিকা থেকে কোনো স্টাফ রিজাইন দিলে তার সমস্ত হিস্ট্রি এবং ছাড়পত্র এই আলাদা লিস্টে স্বয়ংক্রিয়ভাবে চলে আসবে।'
                            : 'When an employee resigns from the active list, their service history, clearance, and records will be neatly organized here.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredResignedEmployees.map(emp => {
                      const duration = calculateDuration(emp.joiningDate, emp.resignedDate, language);

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold flex items-center justify-center text-xs shrink-0">
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {emp.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                                  <span>{emp.employeeCode}</span>
                                  <span>•</span>
                                  <span>{emp.phone}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{emp.designation}</div>
                            <div className="text-[10px] text-slate-400">{emp.department}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                              <span>{emp.joiningDate || '-'}</span> ➔ <span className="font-bold text-rose-600 dark:text-rose-400">{emp.resignedDate || '-'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              {language === 'bn' ? 'মোট চাকরির মেয়াদ:' : 'Total Duration:'} <span className="text-blue-600 dark:text-blue-400">{duration}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {emp.resignationReason || 'Personal Reason'}
                            </div>
                            {emp.settlementNotes && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5" title={emp.settlementNotes}>
                                {emp.settlementNotes}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {emp.finalSettlementPaid && (emp.finalSettlementAmount || 0) > 0 ? (
                              <div>
                                <div className="font-mono font-bold text-emerald-600">
                                  {formatCurrency(emp.finalSettlementAmount || 0)}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {emp.settlementWalletName || 'Cash'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge status="RESIGNED" />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePrintClearance(emp)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded cursor-pointer transition-colors"
                                title={language === 'bn' ? 'ছাড়পত্র সনদ প্রিন্ট করুন' : 'Print Clearance Certificate'}
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejoin(emp)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded cursor-pointer transition-colors"
                                title={language === 'bn' ? 'পুনরায় নিয়োগ / সক্রিয় করুন' : 'Reinstate / Re-join'}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditEmployee(emp)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded cursor-pointer transition-colors"
                                title={language === 'bn' ? 'তথ্য এডিট করুন' : 'Edit Record'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {hasDeletePermission && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEmp(emp)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded cursor-pointer transition-colors"
                                  title={language === 'bn' ? 'রেকর্ড মুছে ফেলুন' : 'Delete'}
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

      {/* ------------------------------------------------------------- */}
      {/* SUBTAB 3: ADVANCE SALARY LEDGER                               */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'advance' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3.5 px-4">{language === 'bn' ? 'ভাউচার নং' : 'Voucher No'}</th>
                  <th className="py-3.5 px-4">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                  <th className="py-3.5 px-4">{language === 'bn' ? 'কর্মচারী' : 'Employee'}</th>
                  <th className="py-3.5 px-4">{language === 'bn' ? 'প্রদত্ত একাউন্ট' : 'Disbursed From'}</th>
                  <th className="py-3.5 px-4">{language === 'bn' ? 'কারণ / নোট' : 'Reason'}</th>
                  <th className="py-3.5 px-4 text-right">{language === 'bn' ? 'অগ্রিম পরিমাণ' : 'Advance Amount'}</th>
                  <th className="py-3.5 px-4 text-center">{language === 'bn' ? 'সমন্বয় স্থিতি' : 'Deduction Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {advanceSalaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-sm">
                        {language === 'bn' ? 'কোনো অগ্রিম বেতন রেকর্ড নেই' : 'No advance salary records'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  advanceSalaries.map(adv => (
                    <tr key={adv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{adv.voucherNo}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{adv.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{adv.employeeName}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{adv.walletName}</td>
                      <td className="py-3 px-4 text-slate-500">{adv.reason || '-'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                        {formatCurrency(adv.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge status={adv.isDeducted ? 'DEDUCTED' : 'PENDING'} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBTAB 4: MONTHLY PAYROLL PROCESSING & DUE SETTLEMENT         */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'payroll' && (
        <div className="space-y-6">
          {/* Top Month Selector & Bulk Action Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'পে-রোল মাস:' : 'Payroll Month:'}
                </label>
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={e => setPayrollMonth(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'পরিশোধের ওয়ালেট:' : 'Pay From Wallet:'}
                </label>
                <select
                  value={payrollWalletId}
                  onChange={e => setPayrollWalletId(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs cursor-pointer"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {monthlyTotals.totalRemainingDue > 0 ? (
                <button
                  type="button"
                  onClick={handleProcessBulkPayroll}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {language === 'bn'
                      ? `${payrollMonth} মাসের সকল বকেয়া বেতন একবারে দিন (৳${monthlyTotals.totalRemainingDue.toLocaleString()})`
                      : `Disburse All Pending Due for ${payrollMonth} (৳${monthlyTotals.totalRemainingDue.toLocaleString()})`}
                  </span>
                </button>
              ) : (
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    {language === 'bn'
                      ? `${payrollMonth} মাসের সকল কর্মরত কর্মচারীর বেতন সম্পূর্ণ পরিশোধিত ✓`
                      : `All active staff salaries for ${payrollMonth} are 100% paid ✓`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 4 Summary Stats Cards for Selected Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">
                {language === 'bn' ? 'মাসিক মোট নিট প্রদেয়' : 'Total Net Payable'}
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {formatCurrency(monthlyTotals.totalPayable)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {language === 'bn' ? `${monthlyTotals.totalStaff} জন কর্মরত স্টাফ` : `${monthlyTotals.totalStaff} active staff`}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                {language === 'bn' ? 'ইতোমধ্যে পরিশোধিত' : 'Paid So Far'}
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(monthlyTotals.totalPaid)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {language === 'bn' ? `${monthlyTotals.fullyPaidCount} জনের পূর্ণ বেতন পরিশোধিত` : `${monthlyTotals.fullyPaidCount} fully paid`}
              </div>
            </div>

            <div className={`p-4 bg-white dark:bg-slate-900 rounded-xl border ${monthlyTotals.totalRemainingDue > 0 ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20' : 'border-slate-200 dark:border-slate-800'} shadow-xs`}>
              <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase">
                {language === 'bn' ? 'অবশিষ্ট বকেয়া বেতন' : 'Remaining Due Salary'}
              </div>
              <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(monthlyTotals.totalRemainingDue)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {language === 'bn'
                  ? `${monthlyTotals.partialCount + monthlyTotals.unpaidCount} জনের বেতন বাকি আছে`
                  : `${monthlyTotals.partialCount + monthlyTotals.unpaidCount} employees with pending due`}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase">
                {language === 'bn' ? 'বেতন পরিশোধের অগ্রগতি' : 'Payment Status'}
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {monthlyTotals.fullyPaidCount}/{monthlyTotals.totalStaff}{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({monthlyTotals.totalStaff > 0 ? Math.round((monthlyTotals.fullyPaidCount / monthlyTotals.totalStaff) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${monthlyTotals.totalStaff > 0 ? (monthlyTotals.fullyPaidCount / monthlyTotals.totalStaff) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Business Rule Notice Banner */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {language === 'bn' ? 'এইচআর ও পেরোল নীতিমালা:' : 'Payroll Policy:'}
              </span>{' '}
              {language === 'bn'
                ? 'এক মাসের বেতন একবার দেওয়া যাবে, ২য় বার দেওয়া যাবে না। তবে বেতন বাকী থাকলে বাকী টাকা ২য় কিস্তিতে পরিশোধ করা যাবে।'
                : 'A month\'s salary is paid once. If any balance remains due, only the remaining amount can be paid in a second installment.'}
            </div>
          </div>

          {/* 1. Monthly Staff Payroll Breakdown & Per-Employee Action Sheet */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>{language === 'bn' ? `${payrollMonth} মাসের স্টাফ বেতন ও বকেয়া শিট` : `Staff Payroll & Due Sheet (${payrollMonth})`}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'bn'
                    ? 'প্রতিটি কর্মচারীর নির্ধারিত বেতন, অগ্রিম কর্তন, পরিশোধিত ও অবশিষ্ট বকেয়া'
                    : 'Gross earnings, advance deductions, disbursed amount, and remaining due per staff'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3.5">Employee</th>
                    <th className="py-3 px-3 text-right">Gross Pay</th>
                    <th className="py-3 px-3 text-right">Adv. Deduct</th>
                    <th className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-slate-200">Net Payable</th>
                    <th className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">Paid So Far</th>
                    <th className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">Remaining Due</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthlyStaffPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-sm">
                          {language === 'bn' ? 'কোনো সক্রিয় কর্মচারী পাওয়া যায়নি' : 'No active employees found'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    monthlyStaffPayroll.map(item => (
                      <tr key={item.emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{item.emp.name}</span>
                            {item.emp.nameBn && (
                              <span className="text-slate-400 text-[11px]">({item.emp.nameBn})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono">{item.emp.employeeCode}</span>
                            <span>•</span>
                            <span>{item.emp.designation}</span>
                            {item.emp.department && (
                              <>
                                <span>•</span>
                                <span>{item.emp.department}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatCurrency(item.grossPay)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-600">
                          {item.advanceDeduct > 0 ? `-${formatCurrency(item.advanceDeduct)}` : '৳০'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.totalPayable)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(item.alreadyPaid)}
                          {item.installmentCount > 1 && (
                            <span className="block text-[10px] font-normal text-slate-400">
                              ({item.installmentCount}টি কিস্তিতে)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {item.remainingDue > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">
                              {formatCurrency(item.remainingDue)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">৳০</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.status === 'PAID' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {language === 'bn' ? 'পরিশোধিত ✓' : 'PAID ✓'}
                            </span>
                          ) : item.status === 'PARTIAL' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {language === 'bn' ? 'আংশিক বাকি' : 'PARTIAL DUE'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              {language === 'bn' ? 'অপরিশোধিত' : 'UNPAID'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          {item.remainingDue > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPaySalaryModal(item)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>
                                {item.alreadyPaid > 0
                                  ? (language === 'bn' ? `বাকি দিন (৳${item.remainingDue.toLocaleString()})` : `Pay Due (৳${item.remainingDue.toLocaleString()})`)
                                  : (language === 'bn' ? `বেতন দিন (৳${item.remainingDue.toLocaleString()})` : `Pay Salary (৳${item.remainingDue.toLocaleString()})`)}
                              </span>
                            </button>
                          ) : (
                            <div
                              title={language === 'bn' ? 'এই মাসের বেতন একবার সম্পূর্ণ পরিশোধ করা হয়েছে। ২য় বার দেওয়া যাবে না।' : 'Full salary for this month already paid.'}
                              className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 cursor-not-allowed select-none"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{language === 'bn' ? 'সম্পূর্ণ পরিশোধিত' : 'Paid in Full'}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Disbursed Payroll History & Payslips */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {language === 'bn' ? 'বিতরণকৃত বেতন ভাউচার হিস্ট্রি ও পে-স্লিপ' : 'Disbursed Payroll Vouchers & Payslips'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'bn'
                    ? 'প্রদত্ত বেতনের ভাউচার নম্বর, কিস্তি ও মানি স্লিপ প্রিন্ট'
                    : 'Track salary voucher payments, partial installments and print salary slips'}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">Voucher</th>
                    <th className="py-2.5 px-3">Month / Date</th>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3 text-right">Net Payable</th>
                    <th className="py-2.5 px-3 text-right text-emerald-600">Disbursed (Paid)</th>
                    <th className="py-2.5 px-3 text-right text-rose-600">Remaining Due</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Paid From</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payrollHistory.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-sm">
                          {language === 'bn' ? 'কোনো পে-রোল হিস্ট্রি নেই' : 'No payroll history records'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    payrollHistory.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{entry.voucherNo}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">{entry.payrollMonth}</div>
                          <div className="text-[11px] text-slate-400">{entry.paymentDate || entry.createdAt.split(' ')[0]}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{entry.employeeName}</div>
                          <div className="text-[11px] text-slate-400">{entry.designation}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatCurrency(entry.payableAmount ?? entry.grossPay - entry.advanceDeduction)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(entry.paidAmount ?? entry.netPay)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {(entry.dueAmount ?? 0) > 0 ? (
                            <span className="text-rose-600">{formatCurrency(entry.dueAmount || 0)}</span>
                          ) : (
                            <span className="text-slate-400">৳০</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {entry.paymentType === 'DUE_PAYMENT'
                              ? (language === 'bn' ? `${entry.installmentNo || 2}য় কিস্তি (বকেয়া)` : `Installment #${entry.installmentNo || 2} (Due)`)
                              : entry.paymentType === 'PARTIAL'
                              ? (language === 'bn' ? `${entry.installmentNo || 1}ম কিস্তি (আংশিক)` : `Installment #${entry.installmentNo || 1} (Partial)`)
                              : (language === 'bn' ? 'পূর্ণ বেতন' : 'Full Salary')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{entry.walletName}</td>
                        <td className="py-2.5 px-3 text-center"><Badge status={entry.status} /></td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handlePrintPayslip(entry)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
                            title="Print Payslip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD / EDIT EMPLOYEE                                  */}
      {/* ------------------------------------------------------------- */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{editingEmployee ? (language === 'bn' ? 'কর্মচারীর তথ্য সংশোধন' : 'Edit Employee Profile') : (language === 'bn' ? 'নতুন কর্মচারী যোগ করুন' : 'Add New Employee')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'পূর্ণ নাম (English) *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Md. Hasan Ali"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'বাংলা নাম' : 'Name in Bangla'}
                  </label>
                  <input
                    type="text"
                    value={nameBn}
                    onChange={e => setNameBn(e.target.value)}
                    placeholder="যেমন: মোঃ হাসান আলী"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'মোবাইল নম্বর *' : 'Phone Number *'}
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="017XX-XXXXXX"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ইমেইল (ঐচ্ছিক)' : 'Email (Optional)'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="hasan@example.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'পদবি (Designation)' : 'Designation'}
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    placeholder="e.g. Sales Executive"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'বিভাগ (Department)' : 'Department'}
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g. Sales / Store"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'যোগদানের তারিখ' : 'Joining Date'}
                  </label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={e => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {language === 'bn' ? 'বেতন কাঠামো (Salary Structure ৳)' : 'Salary & Compensation Structure (BDT)'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      {language === 'bn' ? 'মূল বেতন *' : 'Basic Pay *'}
                    </label>
                    <input
                      type="number"
                      value={baseSalary}
                      onChange={e => setBaseSalary(e.target.value)}
                      placeholder="15000"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-mono font-bold text-slate-900 dark:text-white text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      {language === 'bn' ? 'বাড়ি ভাড়া' : 'House Rent'}
                    </label>
                    <input
                      type="number"
                      value={houseRentAllowance}
                      onChange={e => setHouseRentAllowance(e.target.value)}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      {language === 'bn' ? 'চিকিৎসা ভাতা' : 'Medical'}
                    </label>
                    <input
                      type="number"
                      value={medicalAllowance}
                      onChange={e => setMedicalAllowance(e.target.value)}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      {language === 'bn' ? 'যাতায়াত' : 'Conveyance'}
                    </label>
                    <input
                      type="number"
                      value={conveyanceAllowance}
                      onChange={e => setConveyanceAllowance(e.target.value)}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'জাতীয় পরিচয়পত্র (NID)' : 'National ID (NID)'}
                  </label>
                  <input
                    type="text"
                    value={nid}
                    onChange={e => setNid(e.target.value)}
                    placeholder="e.g. 199026925..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'ব্যাংক হিসাব / বিকাশ' : 'Bank A/C / bKash'}
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={e => setBankAccount(e.target.value)}
                    placeholder="e.g. IBBL A/C 2050..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-medium"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Staff Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: RESIGNATION & FINAL CLEARANCE MODAL                  */}
      {/* ------------------------------------------------------------- */}
      {isResignModalOpen && resigningEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-950/80 overflow-hidden my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 dark:border-rose-950/60 bg-rose-50/70 dark:bg-rose-950/30">
              <h3 className="font-bold text-rose-950 dark:text-rose-200 text-base flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-600" />
                <span>{language === 'bn' ? 'কর্মচারী পদত্যাগ / রিজাইন ফর্ম' : 'Employee Resignation & Clearance'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsResignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResignation} className="p-5 space-y-4 text-xs">
              {/* Employee Summary Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{resigningEmp.name}</div>
                  <div className="text-slate-400 text-[11px]">{resigningEmp.designation} • {resigningEmp.department}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-slate-500">{resigningEmp.employeeCode}</div>
                  <div className="text-[10px] text-blue-600">
                    {language === 'bn' ? 'যোগদান:' : 'Joined:'} {resigningEmp.joiningDate}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'পদত্যাগের তারিখ (Resignation Date) *' : 'Resignation Date *'}
                </label>
                <input
                  type="date"
                  value={resignedDate}
                  onChange={e => setResignedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'পদত্যাগের কারণ (Reason for Leaving) *' : 'Reason for Leaving *'}
                </label>
                <select
                  value={resignationReason}
                  onChange={e => setResignationReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="Personal Reason">{language === 'bn' ? 'ব্যক্তিগত কারণ (Personal Reason)' : 'Personal Reason'}</option>
                  <option value="Better Opportunity">{language === 'bn' ? 'উন্নত কর্মসংস্থান (Better Opportunity)' : 'Better Opportunity'}</option>
                  <option value="Family Matter">{language === 'bn' ? 'পারিবারিক সমস্যা (Family Matter)' : 'Family Matter'}</option>
                  <option value="Health / Medical">{language === 'bn' ? 'অসুস্থতা / স্বাস্থ্যগত কারণ (Health / Medical)' : 'Health / Medical'}</option>
                  <option value="Relocation / Abroad">{language === 'bn' ? 'স্থানান্তর / বিদেশ গমন (Relocation / Abroad)' : 'Relocation / Abroad'}</option>
                  <option value="Contract Expiry">{language === 'bn' ? 'চুক্তির মেয়াদ শেষ (Contract Expiry)' : 'Contract Expiry'}</option>
                  <option value="Other">{language === 'bn' ? 'অন্যান্য কারণ (Other Reason)' : 'Other Reason'}</option>
                </select>
              </div>

              {(resignationReason === 'Other' || resignationReason === 'অন্যান্য কারণ (Other Reason)') && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'অন্যান্য কারণের বিবরণ' : 'Specify Other Reason'}
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder={language === 'bn' ? 'কারণ লিখুন...' : 'Write reason...'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'ছাড়পত্র ও মালামাল হ্যান্ডওভার নোট' : 'Clearance & Handover Notes'}
                </label>
                <textarea
                  value={settlementNotes}
                  onChange={e => setSettlementNotes(e.target.value)}
                  rows={2}
                  placeholder={language === 'bn' ? 'যেমন: দোকানের চাবি, হিসাবের খাতা ও যাবতীয় সরঞ্জাম বুঝিয়ে নেওয়া হয়েছে।' : 'e.g. All keys, equipment and books received back.'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              {/* Final Settlement Payment Section */}
              <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200 text-xs">
                  <input
                    type="checkbox"
                    checked={finalSettlementPaid}
                    onChange={e => setFinalSettlementPaid(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>{language === 'bn' ? 'চূড়ান্ত পাওনা / নিষ্পত্তি টাকা একাউন্ট থেকে প্রদান করুন' : 'Disburse Final Settlement from Account'}</span>
                </label>

                {finalSettlementPaid && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                        {language === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Settlement Amount (BDT)'}
                      </label>
                      <input
                        type="number"
                        value={finalSettlementAmount}
                        onChange={e => setFinalSettlementAmount(e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-mono font-bold text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                        {language === 'bn' ? 'পরিশোধের ওয়ালেট' : 'Pay From Wallet'}
                      </label>
                      <select
                        value={settlementWalletId}
                        onChange={e => setSettlementWalletId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-xs cursor-pointer"
                      >
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({formatCurrency(w.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResignModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-medium"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {language === 'bn' ? 'রিজাইন নিশ্চিত করুন' : 'Confirm Resignation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: DISBURSE ADVANCE SALARY MODAL                        */}
      {/* ------------------------------------------------------------- */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-950/30">
              <h3 className="font-bold text-amber-950 dark:text-amber-200 text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span>{language === 'bn' ? 'অগ্রিম বেতন প্রদান ভাউচার' : 'Advance Salary Disbursement'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'কর্মচারী নির্বাচন করুন *' : 'Select Employee *'}
                </label>
                <select
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                  required
                >
                  <option value="">{language === 'bn' ? '-- কর্মচারী নির্বাচন করুন --' : '-- Choose staff --'}</option>
                  {activeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation}) - Code: {emp.employeeCode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'অগ্রিম টাকার পরিমাণ (৳) *' : 'Advance Amount (BDT) *'}
                </label>
                <input
                  type="number"
                  value={advanceAmount}
                  onChange={e => setAdvanceAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'পরিশোধের ওয়ালেট / একাউন্ট' : 'Disburse From Wallet'}
                </label>
                <select
                  value={advanceWalletId}
                  onChange={e => setAdvanceWalletId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'কারণ / নোট' : 'Reason / Note'}
                </label>
                <input
                  type="text"
                  value={advanceReason}
                  onChange={e => setAdvanceReason(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: জরুরি পারিবারিক প্রয়োজন' : 'e.g. Medical emergency advance'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-medium"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {language === 'bn' ? 'অগ্রিম প্রদান করুন' : 'Disburse Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: PAY SALARY / SETTLE REMAINING DUE MODAL               */}
      {/* ------------------------------------------------------------- */}
      {isPaySalaryModalOpen && payingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/60 dark:bg-blue-950/30">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>
                    {payModalAlreadyPaid > 0
                      ? (language === 'bn' ? 'বকেয়া বেতন পরিশোধ ভাউচার (২য় কিস্তি)' : 'Settle Remaining Due Salary')
                      : (language === 'bn' ? 'মাসিক বেতন প্রদান ভাউচার' : 'Monthly Salary Payment Voucher')}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{payingEmp.name}</span> ({payingEmp.designation}) • {payModalMonth}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPaySalaryModalOpen(false);
                  setPayingEmp(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPaySalary} className="p-5 space-y-4 text-xs">
              {/* Calculation Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                  <div>
                    <span>{language === 'bn' ? 'গ্রস বেতন (Gross):' : 'Gross Salary:'}</span>{' '}
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(payModalGross)}
                    </span>
                  </div>
                  {payModalAdvanceDeduct > 0 && (
                    <div className="text-amber-600">
                      <span>{language === 'bn' ? 'অগ্রিম কর্তন:' : 'Adv. Deduct:'}</span>{' '}
                      <span className="font-mono font-bold">-{formatCurrency(payModalAdvanceDeduct)}</span>
                    </div>
                  )}
                  <div>
                    <span>{language === 'bn' ? 'মোট নিট প্রদেয়:' : 'Net Payable:'}</span>{' '}
                    <span className="font-mono font-bold text-blue-600">
                      {formatCurrency(payModalTotalPayable)}
                    </span>
                  </div>
                  <div>
                    <span>{language === 'bn' ? 'ইতোমধ্যে প্রদত্ত:' : 'Paid So Far:'}</span>{' '}
                    <span className="font-mono font-bold text-emerald-600">
                      {formatCurrency(payModalAlreadyPaid)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {language === 'bn' ? 'বর্তমান অবশিষ্ট বকেয়া (Remaining Due):' : 'Current Remaining Due:'}
                  </span>
                  <span className="font-mono font-bold text-base text-rose-600 dark:text-rose-400">
                    {formatCurrency(payModalRemainingDue)}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  {language === 'bn' ? 'পরিশোধের ধরন:' : 'Payment Option:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayMode('FULL_DUE');
                      setPayAmountInput(payModalRemainingDue.toString());
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      payMode === 'FULL_DUE'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-[11px]">
                      {language === 'bn' ? 'সম্পূর্ণ বকেয়া পরিশোধ' : 'Pay Full Due'}
                    </div>
                    <div className="font-mono text-xs font-bold text-blue-600 mt-0.5">
                      {formatCurrency(payModalRemainingDue)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPayMode('PARTIAL');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      payMode === 'PARTIAL'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-[11px]">
                      {language === 'bn' ? 'আংশিক বেতন প্রদান' : 'Partial / Custom'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {language === 'bn' ? 'বাকি অংশ পরে দেওয়া যাবে' : 'Pay part now, rest later'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'bn' ? 'প্রদেয় টাকার পরিমাণ (৳) *' : 'Payment Amount (BDT) *'}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {language === 'bn' ? `সর্বোচ্চ প্রদেয়: ৳${payModalRemainingDue.toLocaleString()}` : `Max: ৳${payModalRemainingDue.toLocaleString()}`}
                  </span>
                </div>
                <input
                  type="number"
                  value={payAmountInput}
                  onChange={e => setPayAmountInput(e.target.value)}
                  max={payModalRemainingDue}
                  min={1}
                  placeholder={`e.g. ${payModalRemainingDue}`}
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono font-bold text-slate-900 dark:text-white text-sm ${
                    parseFloat(payAmountInput) > payModalRemainingDue
                      ? 'border-rose-500 ring-1 ring-rose-500 text-rose-600'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                  required
                />
                {parseFloat(payAmountInput) > payModalRemainingDue && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>
                      {language === 'bn'
                        ? `প্রদেয় টাকা অবশিষ্ট বকেয়ার (৳${payModalRemainingDue.toLocaleString()}) চেয়ে বেশি হতে পারে না!`
                        : `Amount cannot exceed remaining due of ৳${payModalRemainingDue.toLocaleString()}!`}
                    </span>
                  </p>
                )}
              </div>

              {/* Wallet & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'পরিশোধের ওয়ালেট' : 'Pay From Wallet'}
                  </label>
                  <select
                    value={payWalletId}
                    onChange={e => setPayWalletId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatCurrency(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'bn' ? 'পরিশোধের তারিখ' : 'Payment Date'}
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Remarks / Notes */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? 'মন্তব্য / বিবরণ' : 'Notes / Remarks'}
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder={
                    payModalAlreadyPaid > 0
                      ? (language === 'bn' ? 'যেমন: ২য় কিস্তি বকেয়া বেতন পরিশোধ' : 'e.g. 2nd installment due settlement')
                      : (language === 'bn' ? 'যেমন: নিয়মিত মাসিক বেতন' : 'e.g. Regular monthly salary')
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaySalaryModalOpen(false);
                    setPayingEmp(null);
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-medium"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={
                    !payAmountInput ||
                    parseFloat(payAmountInput) <= 0 ||
                    parseFloat(payAmountInput) > payModalRemainingDue
                  }
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {language === 'bn' ? 'বেতন প্রদান নিশ্চিত করুন' : 'Confirm Salary Payment'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
