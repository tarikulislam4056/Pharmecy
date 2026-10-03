import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { printElement } from '../../utils/printHelper';
import { canUserDelete } from '../../utils/permissions';
import { DatePeriodFilter } from '../common/DatePeriodFilter';
import {
  Product,
  WarrantyRecord,
  WarrantyClaim,
  WarrantyPolicy,
  WarrantyClaimStatus,
  WarrantyPeriodType,
  WarrantyType,
} from '../../types';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Wrench,
  Search,
  Plus,
  Filter,
  Calendar,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Phone,
  Tag,
  Trash2,
  Edit3,
  Eye,
  QrCode,
  PackageCheck,
  Check,
  X,
  Send,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Info,
  Building,
  AlertCircle,
} from 'lucide-react';

export const WarrantyManagementView: React.FC = () => {
  const {
    language,
    companySettings,
    products = [],
    warrantyRecords = [],
    warrantyClaims = [],
    warrantyPolicies = [],
    addWarrantyPolicy,
    updateWarrantyPolicy,
    deleteWarrantyPolicy,
    addWarrantyRecord,
    updateWarrantyRecord,
    deleteWarrantyRecord,
    addWarrantyClaim,
    updateWarrantyClaimStatus,
    deleteWarrantyClaim,
    sendWarrantyClaimSms,
    smsConfig,
    openPrintModal,
    showToast,
    currentUser,
  } = useApp();

  const isBn = language === 'bn';
  const certificateCardRef = useRef<HTMLDivElement>(null);

  // Sub Tab Navigation
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'claims' | 'checker' | 'policies'>('records');

  // Search & Filter state for Records
  const [recordSearch, setRecordSearch] = useState('');
  const [recordStatusFilter, setRecordStatusFilter] = useState<string>('ALL');
  const [recordStartDate, setRecordStartDate] = useState<string>('');
  const [recordEndDate, setRecordEndDate] = useState<string>('');
  const [recordPeriodLabel, setRecordPeriodLabel] = useState<string>('');

  // Search & Filter state for Claims
  const [claimSearch, setClaimSearch] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>('ALL');
  const [claimStartDate, setClaimStartDate] = useState<string>('');
  const [claimEndDate, setClaimEndDate] = useState<string>('');
  const [claimPeriodLabel, setClaimPeriodLabel] = useState<string>('');

  // Serial Checker State
  const [checkerInput, setCheckerInput] = useState('');
  const [checkerResult, setCheckerResult] = useState<{
    found: boolean;
    record?: WarrantyRecord;
    claims?: WarrantyClaim[];
  } | null>(null);

  // Modals state
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<WarrantyPolicy | null>(null);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WarrantyRecord | null>(null);

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [prefilledClaimRecord, setPrefilledClaimRecord] = useState<WarrantyRecord | null>(null);

  const [selectedCertificateRecord, setSelectedCertificateRecord] = useState<WarrantyRecord | null>(null);
  const [selectedClaimDetail, setSelectedClaimDetail] = useState<WarrantyClaim | null>(null);
  const [isUpdateClaimStatusModalOpen, setIsUpdateClaimStatusModalOpen] = useState(false);

  // Custom Delete Confirmation Modal State
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; type: 'record' | 'claim' | 'policy'; title: string } | null>(null);

  // Stats Calculations
  const stats = useMemo(() => {
    const totalRecords = warrantyRecords.length;
    const activeCount = warrantyRecords.filter(r => r.status === 'ACTIVE').length;
    const expiringSoonCount = warrantyRecords.filter(r => r.status === 'EXPIRING_SOON').length;
    const expiredCount = warrantyRecords.filter(r => r.status === 'EXPIRED').length;
    const claimedCount = warrantyRecords.filter(r => r.status === 'CLAIMED').length;
    const pendingClaims = warrantyClaims.filter(c => !['DELIVERED', 'REFUNDED', 'REJECTED'].includes(c.status)).length;
    return {
      totalRecords,
      activeCount,
      expiringSoonCount,
      expiredCount,
      claimedCount,
      pendingClaims,
    };
  }, [warrantyRecords, warrantyClaims]);

  // Current Month Warranty Claims Summary Stats
  const monthStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    const monthClaims = warrantyClaims.filter(c => c.claimDate && c.claimDate.startsWith(monthPrefix));
    
    const totalClaims = monthClaims.length;
    const pendingApprovals = monthClaims.filter(c => ['RECEIVED', 'IN_REPAIR', 'SENT_TO_SUPPLIER'].includes(c.status)).length;
    const resolvedClaims = monthClaims.filter(c => ['REPLACED', 'REPAIRED', 'DELIVERED', 'REFUNDED'].includes(c.status)).length;
    const rejectedClaims = monthClaims.filter(c => c.status === 'REJECTED').length;

    const resolutionRate = totalClaims > 0 ? Math.round((resolvedClaims / totalClaims) * 100) : 0;

    const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });

    return {
      monthPrefix,
      monthName,
      totalClaims,
      pendingApprovals,
      resolvedClaims,
      rejectedClaims,
      resolutionRate,
    };
  }, [warrantyClaims, isBn]);

  // Handler to quickly filter claims for the current month
  const handleFilterCurrentMonthClaims = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDayStr = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    setActiveSubTab('claims');
    setClaimStartDate(firstDayStr);
    setClaimEndDate(lastDayStr);
    setClaimPeriodLabel(isBn ? `চলতি মাস (${monthStats.monthName})` : `Current Month (${monthStats.monthName})`);
  };

  // Filtered Records List
  const filteredRecords = useMemo(() => {
    return warrantyRecords.filter(r => {
      const matchSearch =
        r.serialNumber.toLowerCase().includes(recordSearch.toLowerCase()) ||
        r.warrantyCode.toLowerCase().includes(recordSearch.toLowerCase()) ||
        r.productName.toLowerCase().includes(recordSearch.toLowerCase()) ||
        r.customerName.toLowerCase().includes(recordSearch.toLowerCase()) ||
        r.customerPhone.includes(recordSearch) ||
        r.invoiceNumber.toLowerCase().includes(recordSearch.toLowerCase());

      const matchStatus = recordStatusFilter === 'ALL' || r.status === recordStatusFilter;

      // Date Range Filter on saleDate
      const rDate = r.saleDate ? r.saleDate.split(' ')[0] : '';
      let matchDate = true;
      if (recordStartDate && rDate < recordStartDate) matchDate = false;
      if (recordEndDate && rDate > recordEndDate) matchDate = false;

      return matchSearch && matchStatus && matchDate;
    });
  }, [warrantyRecords, recordSearch, recordStatusFilter, recordStartDate, recordEndDate]);

  // Filtered Claims List
  const filteredClaims = useMemo(() => {
    return warrantyClaims.filter(c => {
      const matchSearch =
        c.claimTicketNo.toLowerCase().includes(claimSearch.toLowerCase()) ||
        c.serialNumber.toLowerCase().includes(claimSearch.toLowerCase()) ||
        c.productName.toLowerCase().includes(claimSearch.toLowerCase()) ||
        c.customerName.toLowerCase().includes(claimSearch.toLowerCase()) ||
        c.customerPhone.includes(claimSearch) ||
        c.invoiceNumber.toLowerCase().includes(claimSearch.toLowerCase());

      const matchStatus = claimStatusFilter === 'ALL' || c.status === claimStatusFilter;

      // Date Range Filter on claimDate
      const cDate = c.claimDate ? c.claimDate.split(' ')[0] : '';
      let matchDate = true;
      if (claimStartDate && cDate < claimStartDate) matchDate = false;
      if (claimEndDate && cDate > claimEndDate) matchDate = false;

      return matchSearch && matchStatus && matchDate;
    });
  }, [warrantyClaims, claimSearch, claimStatusFilter, claimStartDate, claimEndDate]);

  // Claims Print Report Handler
  const handlePrintClaimsReport = () => {
    const periodText = claimPeriodLabel || (claimStartDate && claimEndDate ? `${claimStartDate} to ${claimEndDate}` : claimStartDate ? `From ${claimStartDate}` : claimEndDate ? `Until ${claimEndDate}` : (isBn ? 'সকল সময়' : 'All Time'));
    openPrintModal({
      type: 'REPORT',
      title: isBn ? 'ওয়ারেন্টি ক্লেইমস রিপোর্ট' : 'WARRANTY CLAIMS REPORT',
      data: {
        reportTitle: isBn ? 'ওয়ারেন্টি ক্লেইম ও মেরামত ট্র্যাকিং রিপোর্ট' : 'WARRANTY CLAIMS & REPAIR TRACKING REPORT',
        period: periodText,
        generatedDate: new Date().toISOString().split('T')[0],
        columns: [
          { header: isBn ? 'টিকিট নং' : 'Ticket No', key: 'claimTicketNo' },
          { header: isBn ? 'তারিখ' : 'Claim Date', key: 'claimDate' },
          { header: isBn ? 'পণ্য' : 'Product Name', key: 'productName' },
          { header: isBn ? 'সিরিয়াল / IMEI' : 'Serial / IMEI', key: 'serialNumber' },
          { header: isBn ? 'গ্রাহকের তথ্য' : 'Customer', key: 'customerName' },
          { header: isBn ? 'সমস্যার বিবরণ' : 'Issue Description', key: 'issueDescription' },
          { header: isBn ? 'স্ট্যাটাস' : 'Status', key: 'status' },
        ],
        rows: filteredClaims.map(c => ({
          claimTicketNo: c.claimTicketNo,
          claimDate: c.claimDate,
          productName: c.productName,
          serialNumber: c.serialNumber,
          customerName: `${c.customerName} (${c.customerPhone})`,
          issueDescription: c.issueDescription,
          status: c.status,
        })),
      },
    });
  };

  // Records Print Report Handler
  const handlePrintRecordsReport = () => {
    const periodText = recordPeriodLabel || (recordStartDate && recordEndDate ? `${recordStartDate} to ${recordEndDate}` : recordStartDate ? `From ${recordStartDate}` : recordEndDate ? `Until ${recordEndDate}` : (isBn ? 'সকল সময়' : 'All Time'));
    openPrintModal({
      type: 'REPORT',
      title: isBn ? 'ওয়ারেন্টি কার্ড রেজিস্টার' : 'WARRANTY CARDS REGISTER',
      data: {
        reportTitle: isBn ? 'ওয়ারেন্টি কার্ড ও রেজিস্ট্রেশন খাতা' : 'WARRANTY CARDS REGISTER REPORT',
        period: periodText,
        generatedDate: new Date().toISOString().split('T')[0],
        columns: [
          { header: isBn ? 'কোড' : 'Code', key: 'warrantyCode' },
          { header: isBn ? 'বিক্রয় তারিখ' : 'Sale Date', key: 'saleDate' },
          { header: isBn ? 'পণ্য' : 'Product', key: 'productName' },
          { header: isBn ? 'সিরিয়াল / IMEI' : 'Serial / IMEI', key: 'serialNumber' },
          { header: isBn ? 'গ্রাহক' : 'Customer', key: 'customerName' },
          { header: isBn ? 'মেয়াদ শেষ' : 'Expiry Date', key: 'expiryDate' },
          { header: isBn ? 'স্ট্যাটাস' : 'Status', key: 'status' },
        ],
        rows: filteredRecords.map(r => ({
          warrantyCode: r.warrantyCode,
          saleDate: r.saleDate,
          productName: r.productName,
          serialNumber: r.serialNumber,
          customerName: `${r.customerName} (${r.customerPhone})`,
          expiryDate: r.expiryDate,
          status: r.status,
        })),
      },
    });
  };

  // Quick Checker Handler
  const handleVerifySerial = (serialQuery: string) => {
    const query = serialQuery.trim();
    if (!query) {
      setCheckerResult(null);
      return;
    }

    const rec = warrantyRecords.find(
      r =>
        r.serialNumber.toLowerCase() === query.toLowerCase() ||
        r.warrantyCode.toLowerCase() === query.toLowerCase() ||
        r.invoiceNumber.toLowerCase() === query.toLowerCase()
    );

    if (rec) {
      const relatedClaims = warrantyClaims.filter(
        c => c.serialNumber.toLowerCase() === rec.serialNumber.toLowerCase() || c.warrantyRecordId === rec.id
      );
      setCheckerResult({ found: true, record: rec, claims: relatedClaims });
    } else {
      setCheckerResult({ found: false });
    }
  };

  // Days remaining calculation helper
  const getDaysRemaining = (expiryDate: string) => {
    const exp = new Date(expiryDate);
    const today = new Date();
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (status: WarrantyRecord['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isBn ? 'সক্রিয় ওয়ারেন্টি' : 'Active Warranty'}
          </span>
        );
      case 'EXPIRING_SOON':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            {isBn ? 'মেয়াদ শেষের দিকে' : 'Expiring Soon'}
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <ShieldX className="w-3.5 h-3.5" />
            {isBn ? 'মেয়াদ উত্তীর্ণ' : 'Expired'}
          </span>
        );
      case 'CLAIMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            <Wrench className="w-3.5 h-3.5" />
            {isBn ? 'ক্লেইমকৃত (RMA)' : 'Claimed'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getClaimStatusBadge = (status: WarrantyClaimStatus) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">{isBn ? 'রিসিভড' : 'RECEIVED'}</span>;
      case 'IN_REPAIR':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">{isBn ? 'মেরামত চলছে' : 'IN REPAIR'}</span>;
      case 'SENT_TO_SUPPLIER':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">{isBn ? 'সাপ্লায়ারে প্রেরিত' : 'SENT TO SUPPLIER'}</span>;
      case 'REPLACED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{isBn ? 'নতুন পিস রিপ্লেসড' : 'REPLACED'}</span>;
      case 'REPAIRED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">{isBn ? 'মেরামত সম্পন্ন' : 'REPAIRED'}</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">{isBn ? 'গ্রাহককে অর্পণ' : 'DELIVERED'}</span>;
      case 'REFUNDED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">{isBn ? 'রিফান্ডড' : 'REFUNDED'}</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">{isBn ? 'বাতিলকৃত' : 'REJECTED'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold">
              {isBn ? 'পণ্য ওয়ারেন্টি ও ক্লেইম ম্যানেজমেন্ট' : 'Product Warranty Management'}
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-300">
            {isBn
              ? 'পণ্য বিক্রয়ের স্বয়ংক্রিয় ওয়ারেন্টি রেজিস্ট্রেশন, সিরিয়াল ও IMEI চেক, মেরামত টিকিট ও সার্ভিস ট্র্যাকিং'
              : 'Auto-register warranties on sales, verify serial/IMEI, manage repairs & supplier replacement claims'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setPrefilledClaimRecord(null);
              setIsClaimModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>{isBn ? '+ নতুন ক্লেইম টিকিট' : '+ New Claim Ticket'}</span>
          </button>
          <button
            onClick={() => {
              setEditingRecord(null);
              setIsRecordModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? '+ ম্যানুয়াল ওয়ারেন্টি' : '+ Manual Warranty'}</span>
          </button>
        </div>
      </div>

      {/* Current Month Warranty Claims Summary Dashboard Widget */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 dark:border-indigo-800/80 rounded-2xl p-4 sm:p-5 shadow-lg text-white relative overflow-hidden">
        {/* Decorative Background Accents */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/50">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                <Calendar className="w-5 h-5 text-indigo-400" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                    {isBn ? 'চলতি মাসের ক্লেইম সমারি ড্যাশবোর্ড' : 'Current Month Warranty Claims Summary'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {monthStats.monthName}
                  </span>
                </div>
                <p className="text-xs text-indigo-200/70 mt-0.5">
                  {isBn
                    ? 'চলতি মাসে গ্রাহক থেকে প্রাপ্ত ক্লেইম, অপেক্ষমাণ টিকিট ও নিষ্পত্তিকৃত ওয়ারেন্টির সার্বিক হিসাব'
                    : 'Overview of total claims, pending approvals, and resolved warranties logged this month'}
                </p>
              </div>
            </div>

            <button
              onClick={handleFilterCurrentMonthClaims}
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-indigo-400/30 shadow-xs cursor-pointer shrink-0"
              title={isBn ? 'চলতি মাসের ক্লেইমসমূহ ফিল্টার করে তালিকা দেখুন' : 'Filter and view current month claims'}
            >
              <Filter className="w-3.5 h-3.5 text-indigo-200" />
              <span>{isBn ? 'চলতি মাসের ক্লেইম দেখুন' : 'Filter Current Month'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Total Claims (Current Month) */}
            <div
              onClick={handleFilterCurrentMonthClaims}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-200/80 group-hover:text-white transition-colors">
                  {isBn ? 'মোট ক্লেইমস (চলতি মাস)' : 'Total Claims (Current Month)'}
                </span>
                <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <Wrench className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">{monthStats.totalClaims}</span>
                <span className="text-xs text-indigo-300/70">{isBn ? 'টি ক্লেইম টিকিট' : 'claim tickets'}</span>
              </div>
              <p className="text-[11px] text-indigo-200/60 mt-1">
                {isBn ? `${monthStats.monthName}-এ গ্রাহক থেকে প্রাপ্ত` : `Logged during ${monthStats.monthName}`}
              </p>
            </div>

            {/* 2. Pending Approvals & In-Progress */}
            <div
              onClick={handleFilterCurrentMonthClaims}
              className="p-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-200/90 group-hover:text-amber-100 transition-colors">
                  {isBn ? 'অপেক্ষমাণ ক্লেইমস (Pending)' : 'Pending Approvals'}
                </span>
                <span className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-300">{monthStats.pendingApprovals}</span>
                <span className="text-xs text-amber-200/70">{isBn ? 'টি প্রক্রিয়াধীন' : 'pending'}</span>
              </div>
              <p className="text-[11px] text-amber-200/60 mt-1">
                {isBn ? 'অনুমোদন, সাপ্লায়ার ও সার্ভিসিং প্রক্রিয়ায়' : 'Awaiting approval, supplier or repair'}
              </p>
            </div>

            {/* 3. Resolved Claims */}
            <div
              onClick={handleFilterCurrentMonthClaims}
              className="p-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-200/90 group-hover:text-emerald-100 transition-colors">
                  {isBn ? 'নিষ্পত্তিকৃত ক্লেইমস (Resolved)' : 'Resolved Claims'}
                </span>
                <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300">{monthStats.resolvedClaims}</span>
                <span className="text-xs text-emerald-200/70">{isBn ? 'টি সমাধানকৃত' : 'resolved'}</span>
              </div>
              <p className="text-[11px] text-emerald-200/60 mt-1">
                {isBn ? 'মেরামত/রিপ্লেসড/ডেলিভারি সম্পন্ন' : 'Repaired, replaced, or delivered'}
              </p>
            </div>
          </div>

          {/* Resolution Progress Bar */}
          {monthStats.totalClaims > 0 && (
            <div className="pt-2 border-t border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-indigo-200/80">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="font-semibold">{isBn ? 'মাসিক ক্লেইম সমাধান হার:' : 'Monthly Resolution Rate:'}</span>
                <span className="font-bold text-emerald-400">{monthStats.resolutionRate}%</span>
              </div>
              <div className="w-full sm:w-64 bg-slate-800/80 rounded-full h-2 overflow-hidden border border-indigo-900/50">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${monthStats.resolutionRate}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isBn ? 'মোট রেজিস্টার্ড কার্ড' : 'Total Warranty Cards'}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalRecords}</h3>
          </div>
          <span className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-5 h-5" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isBn ? 'সক্রিয় ওয়ারেন্টি (Active)' : 'Active Warranties'}
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.activeCount}</h3>
          </div>
          <span className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isBn ? 'মেয়াদ শেষের পথে (<৩০ দিন)' : 'Expiring Soon (<30 Days)'}
            </p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.expiringSoonCount}</h3>
          </div>
          <span className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isBn ? 'চলমান ক্লেইম ও সার্ভিসিং' : 'Pending RMA Repair Claims'}
            </p>
            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.pendingClaims}</h3>
          </div>
          <span className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Wrench className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveSubTab('records')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'records'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isBn ? 'ওয়ারেন্টি রেকর্ড তালিকা' : 'Warranty Cards & Register'}</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {warrantyRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('claims')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'claims'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>{isBn ? 'ক্লেইম ও সার্ভিসিং টিকিট' : 'RMA Claims & Repair Log'}</span>
          {stats.pendingClaims > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
              {stats.pendingClaims}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('checker')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'checker'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>{isBn ? 'সিরিয়াল / IMEI ভেরিফায়ার' : 'Serial / IMEI Warranty Checker'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('policies')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'policies'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isBn ? 'ওয়ারেন্টি পলিসি ও শর্তাবলী' : 'Warranty Policies & Terms'}</span>
        </button>
      </div>

      {/* SUB TAB 1: WARRANTY RECORDS */}
      {activeSubTab === 'records' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={recordSearch}
                  onChange={e => setRecordSearch(e.target.value)}
                  placeholder={isBn ? 'সিরিয়াল, IMEI, কোড, কাস্টমার বা চালান নং...' : 'Search Serial No, IMEI, Code, Invoice...'}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={recordStatusFilter}
                    onChange={e => setRecordStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">{isBn ? 'সকল স্ট্যাটাস (All)' : 'All Statuses'}</option>
                    <option value="ACTIVE">{isBn ? 'সক্রিয় ওয়ারেন্টি (Active)' : 'Active'}</option>
                    <option value="EXPIRING_SOON">{isBn ? 'মেয়াদ শেষের দিকে (Expiring Soon)' : 'Expiring Soon'}</option>
                    <option value="EXPIRED">{isBn ? 'মেয়াদ উত্তীর্ণ (Expired)' : 'Expired'}</option>
                    <option value="CLAIMED">{isBn ? 'ক্লেইমকৃত (Claimed)' : 'Claimed'}</option>
                  </select>
                </div>

                <button
                  onClick={handlePrintRecordsReport}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={isBn ? 'রেজিস্টার প্রিন্ট করুন' : 'Print Register Report'}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isBn ? 'প্রিন্ট রেজিস্টার' : 'Print Register'}</span>
                </button>
              </div>
            </div>

            {/* Date Period Filter Bar */}
            <DatePeriodFilter
              startDate={recordStartDate}
              endDate={recordEndDate}
              onChange={(s, e, label) => {
                setRecordStartDate(s);
                setRecordEndDate(e);
                setRecordPeriodLabel(label || '');
              }}
              language={language === 'bn' ? 'bn' : 'en'}
            />

            {/* Active Filters Bar */}
            {(recordSearch || recordStatusFilter !== 'ALL' || recordStartDate || recordEndDate) && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-xs text-indigo-900 dark:text-indigo-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    {isBn ? 'ফিল্টারকৃত রেকর্ড:' : 'Filtered Records:'}
                  </span>
                  <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold px-2 py-0.5 rounded-full">
                    {filteredRecords.length} {isBn ? 'টি কার্ড' : 'records'}
                  </span>
                  {(recordStartDate || recordEndDate) && (
                    <span className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md font-mono text-[11px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      {recordPeriodLabel || (recordStartDate && recordEndDate ? `${recordStartDate} - ${recordEndDate}` : recordStartDate ? `>= ${recordStartDate}` : `<= ${recordEndDate}`)}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setRecordSearch('');
                    setRecordStatusFilter('ALL');
                    setRecordStartDate('');
                    setRecordEndDate('');
                    setRecordPeriodLabel('');
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ফিল্টার রিসেট' : 'Reset Filters'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Records Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <th className="p-3">{isBn ? 'কোড ও তারিখ' : 'Code & Sale Date'}</th>
                    <th className="p-3">{isBn ? 'পণ্য ও এসকেইউ' : 'Product & SKU'}</th>
                    <th className="p-3">{isBn ? 'সিরিয়াল / IMEI নম্বর' : 'Serial / IMEI Number'}</th>
                    <th className="p-3">{isBn ? 'গ্রাহকের তথ্য' : 'Customer Info'}</th>
                    <th className="p-3">{isBn ? 'মেয়াদকাল & মেয়াদ শেষ' : 'Duration & Expiry'}</th>
                    <th className="p-3">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="p-3 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p>{isBn ? 'কোন ওয়ারেন্টি রেকর্ড পাওয়া যায়নি।' : 'No warranty records found matching filters.'}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(rec => {
                      const daysLeft = getDaysRemaining(rec.expiryDate);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block">{rec.warrantyCode}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Inv: {rec.invoiceNumber}</span>
                            <span className="text-[10px] text-slate-400">{rec.saleDate}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold block text-slate-900 dark:text-white">{rec.productName}</span>
                            <span className="text-[11px] text-slate-500 font-mono">SKU: {rec.sku}</span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700">
                              {rec.serialNumber}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-medium block">{rec.customerName}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{rec.customerPhone}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-medium block">{rec.duration} {rec.durationUnit}</span>
                            <span className="text-[11px] text-slate-500 block">Exp: {rec.expiryDate}</span>
                            {rec.status === 'ACTIVE' && (
                              <span className="text-[10px] text-emerald-600 font-medium">
                                ({daysLeft} {isBn ? 'দিন বাকি' : 'days left'})
                              </span>
                            )}
                          </td>
                          <td className="p-3">{getStatusBadge(rec.status)}</td>
                          <td className="p-3 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() =>
                                openPrintModal({
                                  type: 'WARRANTY_CARD',
                                  title: isBn ? `ওয়ারেন্টি কার্ড - ${rec.warrantyCode}` : `Warranty Certificate - ${rec.warrantyCode}`,
                                  data: rec,
                                })
                              }
                              title={isBn ? 'ওয়ারেন্টি কার্ড প্রিন্ট রিপোর্ট' : 'Print Warranty Card'}
                              className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setPrefilledClaimRecord(rec);
                                setIsClaimModalOpen(true);
                              }}
                              title={isBn ? 'ক্লেইম টিকিট তৈরি করুন' : 'File Claim'}
                              className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-colors cursor-pointer"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingRecord(rec);
                                setIsRecordModalOpen(true);
                              }}
                              title={isBn ? 'সম্পাদনা করুন' : 'Edit Record'}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (!canUserDelete(currentUser, 'product')) {
                                  showToast(isBn ? 'আপনার ওয়ারেন্টি রেকর্ড মুছে ফেলার অনুমতি নেই' : 'You do not have permission to delete warranty records', 'error');
                                  return;
                                }
                                setDeleteConfirmItem({
                                  id: rec.id,
                                  type: 'record',
                                  title: `${rec.warrantyCode} - ${rec.productName} (${rec.customerName})`,
                                });
                              }}
                              title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* SUB TAB 2: RMA CLAIMS & REPAIR TICKETS */}
      {activeSubTab === 'claims' && (
        <div className="space-y-4">
          {/* Claims Filter Bar */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={claimSearch}
                  onChange={e => setClaimSearch(e.target.value)}
                  placeholder={isBn ? 'টিকিট নং, সিরিয়াল, কাস্টমার ফোন...' : 'Search Ticket No, Serial No, Phone...'}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={claimStatusFilter}
                    onChange={e => setClaimStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">{isBn ? 'সকল ক্লেইম স্ট্যাটাস (All)' : 'All Claim Statuses'}</option>
                    <option value="RECEIVED">{isBn ? 'রিসিভড (Received)' : 'Received'}</option>
                    <option value="IN_REPAIR">{isBn ? 'মেরামত চলছে (In Repair)' : 'In Repair'}</option>
                    <option value="SENT_TO_SUPPLIER">{isBn ? 'সাপ্লায়ারে প্রেরিত (Sent to Supplier)' : 'Sent to Supplier'}</option>
                    <option value="REPLACED">{isBn ? 'নতুন পিস রিপ্লেসড (Replaced)' : 'Replaced'}</option>
                    <option value="REPAIRED">{isBn ? 'মেরামত সম্পন্ন (Repaired)' : 'Repaired'}</option>
                    <option value="DELIVERED">{isBn ? 'গ্রাহককে অর্পণ (Delivered)' : 'Delivered'}</option>
                    <option value="REFUNDED">{isBn ? 'রিফান্ডড (Refunded)' : 'Refunded'}</option>
                    <option value="REJECTED">{isBn ? 'বাতিলকৃত (Rejected)' : 'Rejected'}</option>
                  </select>
                </div>

                <button
                  onClick={handlePrintClaimsReport}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={isBn ? 'রিপোর্ট প্রিন্ট করুন' : 'Print Claims Report'}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isBn ? 'প্রিন্ট ক্লেইম রিপোর্ট' : 'Print Claims Report'}</span>
                </button>
              </div>
            </div>

            {/* Date Period Filter Bar */}
            <DatePeriodFilter
              startDate={claimStartDate}
              endDate={claimEndDate}
              onChange={(s, e, label) => {
                setClaimStartDate(s);
                setClaimEndDate(e);
                setClaimPeriodLabel(label || '');
              }}
              language={language === 'bn' ? 'bn' : 'en'}
            />

            {/* Active Filters Bar */}
            {(claimSearch || claimStatusFilter !== 'ALL' || claimStartDate || claimEndDate) && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-xs text-indigo-900 dark:text-indigo-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    {isBn ? 'ফিল্টারকৃত রেজাল্ট:' : 'Filtered Claims:'}
                  </span>
                  <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold px-2 py-0.5 rounded-full">
                    {filteredClaims.length} {isBn ? 'টি টিকেট' : 'claims'}
                  </span>
                  {(claimStartDate || claimEndDate) && (
                    <span className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md font-mono text-[11px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      {claimPeriodLabel || (claimStartDate && claimEndDate ? `${claimStartDate} - ${claimEndDate}` : claimStartDate ? `>= ${claimStartDate}` : `<= ${claimEndDate}`)}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setClaimSearch('');
                    setClaimStatusFilter('ALL');
                    setClaimStartDate('');
                    setClaimEndDate('');
                    setClaimPeriodLabel('');
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ফিল্টার রিসেট' : 'Reset Filters'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Claims List Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClaims.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
                <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p>{isBn ? 'কোন ক্লেইম টিকিট পাওয়া যায়নি।' : 'No warranty repair claims found.'}</p>
              </div>
            ) : (
              filteredClaims.map(claim => (
                <div
                  key={claim.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 relative hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {claim.claimTicketNo}
                      </span>
                      <span className="text-xs text-slate-500">Date: {claim.claimDate}</span>
                    </div>
                    <div>{getClaimStatusBadge(claim.status)}</div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{claim.productName}</span>
                    </h4>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        S/N: {claim.serialNumber}
                      </span>
                      <span>Inv: {claim.invoiceNumber}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      <span className="font-bold text-rose-600 dark:text-rose-400">Problem: </span>
                      {claim.issueDescription}
                    </p>
                    {claim.physicalCondition && (
                      <p className="text-slate-500 text-[11px]">Condition: {claim.physicalCondition}</p>
                    )}
                    {claim.replacementSerialNumber && (
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        Replaced New S/N: {claim.replacementSerialNumber}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      <span>{claim.customerName} ({claim.customerPhone})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedClaimDetail(claim)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:bg-indigo-100 cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isBn ? 'ডিটেইলস' : 'Details'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedClaimDetail(claim);
                          setIsUpdateClaimStatusModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 cursor-pointer flex items-center gap-1"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>{isBn ? 'স্ট্যাটাস আপডেট' : 'Update Status'}</span>
                      </button>

                      <button
                        onClick={() => sendWarrantyClaimSms(claim)}
                        title={isBn ? 'কাস্টমারকে অবগতির SMS পাঠান' : 'Send SMS Notification'}
                        className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-semibold text-xs hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>SMS</span>
                      </button>

                      <button
                        onClick={() => {
                          if (!canUserDelete(currentUser, 'product')) {
                            showToast(isBn ? 'আপনার ওয়ারেন্টি ক্লেইম ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete warranty claims', 'error');
                            return;
                          }
                          setDeleteConfirmItem({
                            id: claim.id,
                            type: 'claim',
                            title: `${claim.claimTicketNo} - ${claim.productName} (${claim.customerName})`,
                          });
                        }}
                        title={isBn ? 'ডিলিট ক্লেইম' : 'Delete Claim'}
                        className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB TAB 3: SERIAL / IMEI CHECKER */}
      {activeSubTab === 'checker' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isBn ? 'সিরিয়াল / IMEI নম্বর দিয়ে ওয়ারেন্টি যাচাই করুন' : 'Verify Warranty by Serial / IMEI Number'}
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {isBn
                  ? 'পণ্যের গায়ে থাকা বারকোড, সিরিয়াল নম্বর বা IMEI স্ক্যান করুন অথবা লিখুন'
                  : 'Scan barcode or enter serial number / IMEI / warranty code for instant verification'}
              </p>
            </div>

            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                value={checkerInput}
                onChange={e => {
                  setCheckerInput(e.target.value);
                  handleVerifySerial(e.target.value);
                }}
                placeholder={isBn ? 'উদাহরণ: SN-DL-99481029' : 'e.g. SN-DL-99481029 or WAR-2026-0081'}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-mono font-bold"
              />
              <button
                onClick={() => handleVerifySerial(checkerInput)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shrink-0 cursor-pointer"
              >
                {isBn ? 'যাচাই করুন' : 'Verify'}
              </button>
            </div>
          </div>

          {/* Checker Result Card */}
          {checkerResult && (
            <div className="animate-in fade-in duration-200">
              {!checkerResult.found ? (
                <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center space-y-2">
                  <ShieldX className="w-10 h-10 mx-auto text-rose-500" />
                  <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                    {isBn ? 'কোন ওয়ারেন্টি কার্ড পাওয়া যায়নি!' : 'No Warranty Record Found'}
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    {isBn
                      ? `"${checkerInput}" নম্বরটির জন্য কোন অ্যাক্টিভ ওয়ারেন্টি পাওয়া যায়নি। অনুগ্রহ করে সঠিক সিরিয়াল প্রদান করুন।`
                      : `No warranty record found matching "${checkerInput}". Please verify the serial number.`}
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-500/40 p-6 shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                        {checkerResult.record?.warrantyCode}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {checkerResult.record?.productName}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">SKU: {checkerResult.record?.sku}</p>
                    </div>
                    <div>{getStatusBadge(checkerResult.record!.status)}</div>
                  </div>

                  {/* Progress Bar / Countdown */}
                  {checkerResult.record?.expiryDate && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{isBn ? 'ওয়ারেন্টির বর্তমান অবস্থা:' : 'Warranty Coverage Remaining:'}</span>
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {getDaysRemaining(checkerResult.record.expiryDate)} {isBn ? 'দিন বাকি' : 'Days Remaining'}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-600 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, (getDaysRemaining(checkerResult.record.expiryDate) / 365) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium block">{isBn ? 'সিরিয়াল / IMEI:' : 'Serial / IMEI:'}</span>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {checkerResult.record?.serialNumber}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium block">{isBn ? 'গ্রাহক তথ্য:' : 'Customer Details:'}</span>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {checkerResult.record?.customerName} ({checkerResult.record?.customerPhone})
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium block">{isBn ? 'বিক্রয়ের তারিখ & ইনভয়েস:' : 'Sale Date & Invoice:'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {checkerResult.record?.saleDate} (Inv: {checkerResult.record?.invoiceNumber})
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium block">{isBn ? 'মেয়াদ শেষ হওয়ার তারিখ:' : 'Expiry Date:'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {checkerResult.record?.expiryDate} ({checkerResult.record?.duration} {checkerResult.record?.durationUnit})
                      </span>
                    </div>
                  </div>

                  {/* Terms */}
                  {checkerResult.record?.terms && (
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
                      <span className="font-bold block mb-0.5">{isBn ? 'ওয়ারেন্টি শর্তাবলী:' : 'Warranty Terms:'}</span>
                      <p>{checkerResult.record.terms}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() =>
                        openPrintModal({
                          type: 'WARRANTY_CARD',
                          title: isBn
                            ? `ওয়ারেন্টি কার্ড - ${checkerResult.record?.warrantyCode}`
                            : `Warranty Certificate - ${checkerResult.record?.warrantyCode}`,
                          data: checkerResult.record,
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{isBn ? 'অফিশিয়াল ওয়ারেন্টি কার্ড প্রিন্ট' : 'Print Warranty Card'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setPrefilledClaimRecord(checkerResult.record!);
                        setIsClaimModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>{isBn ? 'ক্লেইম টিকিট তৈরি করুন' : 'File Service Claim'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB TAB 4: POLICIES & TERMS */}
      {activeSubTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isBn ? 'ডিফল্ট ওয়ারেন্টি পলিসিসমূহ' : 'Default Warranty Policies'}
            </h3>
            <button
              onClick={() => {
                setEditingPolicy(null);
                setIsPolicyModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? '+ নতুন পলিসি' : '+ New Policy'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warrantyPolicies.map(pol => (
              <div
                key={pol.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{pol.nameBn || pol.name}</h4>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {pol.duration} {pol.durationUnit} ({pol.type})
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{pol.terms}</p>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setEditingPolicy(pol);
                      setIsPolicyModalOpen(true);
                    }}
                    className="p-1 text-slate-600 hover:text-indigo-600 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (!canUserDelete(currentUser, 'product')) {
                        showToast(isBn ? 'আপনার ওয়ারেন্টি পলিসি ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete warranty policies', 'error');
                        return;
                      }
                      setDeleteConfirmItem({
                        id: pol.id,
                        type: 'policy',
                        title: isBn ? pol.nameBn || pol.name : pol.name,
                      });
                    }}
                    title={isBn ? 'ডিলিট পলিসি' : 'Delete Policy'}
                    className="p-1 text-slate-600 hover:text-rose-600 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: WARRANTY CERTIFICATE PRINT CARD */}
      {selectedCertificateRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div ref={certificateCardRef} className="bg-white text-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-6">
            <button
              onClick={() => setSelectedCertificateRecord(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate Header */}
            <div className="text-center border-b-2 border-indigo-600 pb-4 space-y-1">
              <h2 className="text-2xl font-extrabold text-indigo-950 tracking-wide uppercase">
                {companySettings.name || 'DokanPro Super Store'}
              </h2>
              <p className="text-xs text-slate-500">{companySettings.address} • Tel: {companySettings.phone}</p>
              <div className="inline-block px-4 py-1 rounded-full bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest mt-2">
                Official Warranty Certificate
              </div>
            </div>

            {/* Certificate Content */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium block uppercase text-[10px]">Warranty Code:</span>
                <span className="font-mono font-bold text-sm text-indigo-700">{selectedCertificateRecord.warrantyCode}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium block uppercase text-[10px]">Invoice No & Date:</span>
                <span className="font-bold text-slate-800">{selectedCertificateRecord.invoiceNumber} ({selectedCertificateRecord.saleDate})</span>
              </div>
              <div className="col-span-2 space-y-1 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Product Name & SKU:</span>
                <span className="font-bold text-sm text-slate-900 block">{selectedCertificateRecord.productName}</span>
                <span className="font-mono text-xs text-slate-600">SKU: {selectedCertificateRecord.sku}</span>
              </div>
              <div className="col-span-2 space-y-1 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                <span className="text-indigo-600 font-bold block uppercase text-[10px]">Serial / IMEI Number:</span>
                <span className="font-mono font-extrabold text-base text-indigo-950 block">
                  {selectedCertificateRecord.serialNumber}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium block uppercase text-[10px]">Customer Name:</span>
                <span className="font-bold text-slate-800">{selectedCertificateRecord.customerName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium block uppercase text-[10px]">Customer Phone:</span>
                <span className="font-mono font-bold text-slate-800">{selectedCertificateRecord.customerPhone}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium block uppercase text-[10px]">Warranty Coverage:</span>
                <span className="font-bold text-emerald-700">{selectedCertificateRecord.duration} {selectedCertificateRecord.durationUnit} ({selectedCertificateRecord.warrantyType})</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium block uppercase text-[10px]">Expiry Date:</span>
                <span className="font-bold text-rose-700">{selectedCertificateRecord.expiryDate}</span>
              </div>
            </div>

            {/* Terms */}
            {selectedCertificateRecord.terms && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block uppercase text-[10px]">Terms & Conditions:</span>
                <p>{selectedCertificateRecord.terms}</p>
              </div>
            )}

            {/* Footer Signatures */}
            <div className="flex justify-between items-end pt-6 border-t border-slate-200 text-xs">
              <div className="text-center">
                <div className="w-28 border-b border-slate-300 mb-1" />
                <span className="text-[10px] text-slate-500 font-medium">Customer Signature</span>
              </div>
              <div className="text-center">
                <div className="w-28 border-b border-slate-300 mb-1" />
                <span className="text-[10px] text-slate-500 font-medium">Authorized Seal & Sign</span>
              </div>
            </div>

            <div className="flex gap-2 no-print">
              <button
                onClick={() => {
                  if (selectedCertificateRecord) {
                    openPrintModal({
                      type: 'WARRANTY_CARD',
                      title: isBn
                        ? `ওয়ারেন্টি কার্ড - ${selectedCertificateRecord.warrantyCode}`
                        : `Warranty Certificate - ${selectedCertificateRecord.warrantyCode}`,
                      data: selectedCertificateRecord,
                    });
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>{isBn ? 'প্রিন্ট রিপোর্ট' : 'Print Certificate Report'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT WARRANTY RECORD */}
      {isRecordModalOpen && (
        <ModalRecordForm
          record={editingRecord}
          products={products}
          warrantyRecords={warrantyRecords}
          onClose={() => setIsRecordModalOpen(false)}
          onSave={data => {
            if (editingRecord) {
              updateWarrantyRecord(editingRecord.id, data);
            } else {
              addWarrantyRecord(data as any);
            }
            setIsRecordModalOpen(false);
          }}
          isBn={isBn}
        />
      )}

      {/* MODAL 3: NEW CLAIM FORM */}
      {isClaimModalOpen && (
        <ModalClaimForm
          prefilledRecord={prefilledClaimRecord}
          products={products}
          warrantyRecords={warrantyRecords}
          onClose={() => setIsClaimModalOpen(false)}
          onSave={data => {
            addWarrantyClaim(data as any);
            setIsClaimModalOpen(false);
          }}
          isBn={isBn}
        />
      )}

      {/* MODAL 4: UPDATE CLAIM STATUS */}
      {isUpdateClaimStatusModalOpen && selectedClaimDetail && (
        <ModalUpdateClaimStatus
          claim={selectedClaimDetail}
          onClose={() => setIsUpdateClaimStatusModalOpen(false)}
          onSave={(status, note, updates) => {
            updateWarrantyClaimStatus(selectedClaimDetail.id, status, note, updates);
            setIsUpdateClaimStatusModalOpen(false);
          }}
          isBn={isBn}
        />
      )}

      {/* MODAL 5: POLICY FORM */}
      {isPolicyModalOpen && (
        <ModalPolicyForm
          policy={editingPolicy}
          onClose={() => setIsPolicyModalOpen(false)}
          onSave={data => {
            if (editingPolicy) {
              updateWarrantyPolicy(editingPolicy.id, data);
            } else {
              addWarrantyPolicy(data as any);
            }
            setIsPolicyModalOpen(false);
          }}
          isBn={isBn}
        />
      )}

      {/* MODAL 6: DELETE CONFIRMATION MODAL */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-2xl text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {isBn ? 'ডিলিট নিশ্চিতকরণ' : 'Confirm Deletion'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBn ? 'আপনি কি এটি সত্যি মুছে ফেলতে চান?' : 'Are you sure you want to delete this item?'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 break-words">
                {deleteConfirmItem.title}
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                {isBn ? '⚠️ এই তথ্যটি মুছে ফেললে পুনরায় পুনরুদ্ধার করা যাবে না।' : '⚠️ This record will be permanently deleted.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmItem.type === 'record') {
                    deleteWarrantyRecord(deleteConfirmItem.id);
                    if (selectedCertificateRecord?.id === deleteConfirmItem.id) setSelectedCertificateRecord(null);
                    if (checkerResult?.record?.id === deleteConfirmItem.id) setCheckerResult(null);
                  } else if (deleteConfirmItem.type === 'claim') {
                    deleteWarrantyClaim(deleteConfirmItem.id);
                    if (selectedClaimDetail?.id === deleteConfirmItem.id) setSelectedClaimDetail(null);
                  } else if (deleteConfirmItem.type === 'policy') {
                    deleteWarrantyPolicy(deleteConfirmItem.id);
                  }
                  setDeleteConfirmItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                {isBn ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-Component: Record Form Modal
const ModalRecordForm: React.FC<{
  record: WarrantyRecord | null;
  products: Product[];
  warrantyRecords?: WarrantyRecord[];
  onClose: () => void;
  onSave: (data: Partial<WarrantyRecord>) => void;
  isBn: boolean;
}> = ({ record, products, warrantyRecords = [], onClose, onSave, isBn }) => {
  const [formData, setFormData] = useState({
    warrantyCode: record?.warrantyCode || `WAR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceNumber: record?.invoiceNumber || '',
    saleDate: record?.saleDate || new Date().toISOString().split('T')[0],
    productId: record?.productId || '',
    productName: record?.productName || '',
    sku: record?.sku || '',
    serialNumber: record?.serialNumber || '',
    customerId: record?.customerId || '',
    customerName: record?.customerName || '',
    customerPhone: record?.customerPhone || '',
    warrantyType: record?.warrantyType || 'REPLACEMENT',
    duration: record?.duration || 1,
    durationUnit: record?.durationUnit || 'YEARS',
    startDate: record?.startDate || new Date().toISOString().split('T')[0],
    expiryDate: record?.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    status: record?.status || 'ACTIVE',
    terms: record?.terms || 'Standard Product Warranty Terms',
  });

  const trimmedSerial = formData.serialNumber.trim();
  const duplicateRecord = trimmedSerial
    ? warrantyRecords.find(
        r =>
          r.id !== record?.id &&
          r.serialNumber &&
          r.serialNumber.trim().toLowerCase() === trimmedSerial.toLowerCase()
      )
    : null;
  const isDuplicateSerial = Boolean(duplicateRecord);

  const handleSelectProduct = (prodId: string) => {
    if (!prodId) return;
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setFormData(prev => ({
        ...prev,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku || prev.sku,
        duration: prod.warrantyDuration || prev.duration,
        durationUnit: prod.warrantyUnit || (prev.durationUnit as any),
        warrantyType: prod.warrantyType || prev.warrantyType,
        terms: prod.warrantyTerms || prev.terms,
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
        <button onClick={onClose} className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {record ? (isBn ? 'ওয়ারেন্টি রেকর্ড সম্পাদনা' : 'Edit Warranty Record') : (isBn ? 'নতুন ওয়ারেন্টি কার্ড যোগ' : 'Add New Warranty Record')}
        </h3>

        <form
          onSubmit={e => {
            e.preventDefault();
            if (isDuplicateSerial) {
              alert(
                isBn
                  ? `এই সিরিয়াল / IMEI (${trimmedSerial}) ইতিমধ্যে বিদ্যমান! একই সিরিয়াল দিয়ে পুনরায় এন্ট্রি করা যাবে না।`
                  : `Serial / IMEI (${trimmedSerial}) already exists! Duplicate entry not allowed.`
              );
              return;
            }
            onSave(formData as any);
          }}
          className="space-y-3 text-xs"
        >
          {/* Product Auto-Select Header */}
          <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
            <label className="block font-bold text-indigo-900 dark:text-indigo-200 mb-1">
              {isBn ? 'ইনভেন্টরি প্রোডাক্ট নির্বাচন করুন (Auto-Fill):' : 'Select Product from Inventory:'}
            </label>
            <select
              value={formData.productId}
              onChange={e => handleSelectProduct(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="">{isBn ? '-- ইনভেন্টরির প্রোডাক্ট সিলেক্ট করুন --' : '-- Choose Product from Store Inventory --'}</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.sku ? `(SKU: ${p.sku})` : ''} {p.hasWarranty ? `[${p.warrantyDuration || 1} ${p.warrantyUnit || 'YEARS'}]` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Warranty Code:</label>
              <input
                type="text"
                value={formData.warrantyCode}
                onChange={e => setFormData({ ...formData, warrantyCode: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Invoice Number:</label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="INV-2026-0001"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Product Name:</label>
            <input
              type="text"
              value={formData.productName}
              onChange={e => setFormData({ ...formData, productName: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">SKU Code:</label>
              <input
                type="text"
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-indigo-600 dark:text-indigo-400">Serial / IMEI Number:</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="SN-12345678"
                className={`w-full px-3 py-1.5 rounded-lg border font-mono font-bold ${
                  isDuplicateSerial
                    ? 'border-red-500 text-red-600 bg-red-50/40 dark:bg-red-950/20'
                    : 'border-indigo-400 dark:border-indigo-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white'
                }`}
                required
              />
              {isDuplicateSerial && (
                <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                  <span>
                    {isBn
                      ? `⚠️ আগে থেকে এই নং এন্ট্রি আছে! (${duplicateRecord?.productName || 'পণ্য'} - চালান #${duplicateRecord?.invoiceNumber || ''})`
                      : `⚠️ This serial number is already entered previously! (Invoice #${duplicateRecord?.invoiceNumber || ''})`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Customer Name:</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Customer Phone:</label>
              <input
                type="text"
                value={formData.customerPhone}
                onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Duration:</label>
              <input
                type="number"
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Unit:</label>
              <select
                value={formData.durationUnit}
                onChange={e => setFormData({ ...formData, durationUnit: e.target.value as any })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="DAYS">Days</option>
                <option value="MONTHS">Months</option>
                <option value="YEARS">Years</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Expiry Date:</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-Component: Claim Form Modal
const ModalClaimForm: React.FC<{
  prefilledRecord: WarrantyRecord | null;
  products: Product[];
  warrantyRecords: WarrantyRecord[];
  onClose: () => void;
  onSave: (data: any) => void;
  isBn: boolean;
}> = ({ prefilledRecord, products, warrantyRecords, onClose, onSave, isBn }) => {
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string>(prefilledRecord?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<string>(prefilledRecord?.productId || '');

  const [formData, setFormData] = useState({
    claimTicketNo: `RMA-2026-${Math.floor(100 + Math.random() * 900)}`,
    warrantyRecordId: prefilledRecord?.id || '',
    invoiceNumber: prefilledRecord?.invoiceNumber || '',
    productId: prefilledRecord?.productId || '',
    productName: prefilledRecord?.productName || '',
    serialNumber: prefilledRecord?.serialNumber || '',
    customerId: prefilledRecord?.customerId || '',
    customerName: prefilledRecord?.customerName || '',
    customerPhone: prefilledRecord?.customerPhone || '',
    issueDescription: '',
    physicalCondition: 'Minor use scratches, box included',
    claimDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    status: 'RECEIVED' as WarrantyClaimStatus,
    claimType: 'REPAIR' as 'REPAIR' | 'REPLACEMENT' | 'REFUND',
    repairCost: 0,
    customerCharge: 0,
  });

  const handleSelectWarrantyRecord = (recordId: string) => {
    setSelectedWarrantyId(recordId);
    if (!recordId) return;
    const rec = warrantyRecords.find(r => r.id === recordId);
    if (rec) {
      setFormData(prev => ({
        ...prev,
        warrantyRecordId: rec.id,
        invoiceNumber: rec.invoiceNumber || prev.invoiceNumber,
        productId: rec.productId || prev.productId,
        productName: rec.productName || prev.productName,
        serialNumber: rec.serialNumber || prev.serialNumber,
        customerId: rec.customerId || prev.customerId,
        customerName: rec.customerName || prev.customerName,
        customerPhone: rec.customerPhone || prev.customerPhone,
      }));
      setSelectedProductId(rec.productId || '');
    }
  };

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) return;
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setFormData(prev => ({
        ...prev,
        productId: prod.id,
        productName: prod.name,
      }));
      // Auto-suggest matching warranty record if available
      const matchingRec = warrantyRecords.find(r => r.productId === prod.id || r.productName === prod.name);
      if (matchingRec) {
        handleSelectWarrantyRecord(matchingRec.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
        <button onClick={onClose} className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {isBn ? 'নতুন ওয়ারেন্টি ক্লেইম টিকিট তৈরি (File Claim)' : 'File New Warranty Claim Ticket'}
        </h3>

        <form
          onSubmit={e => {
            e.preventDefault();
            onSave(formData);
          }}
          className="space-y-3 text-xs"
        >
          {/* Warranty Card Selection Section */}
          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-1.5">
            <label className="block font-bold text-purple-900 dark:text-purple-200 flex items-center justify-between">
              <span>{isBn ? 'ওয়ারেন্টি কার্ড / সিরিয়াল নম্বর থেকে অটো ফিল:' : 'Select Warranty Card / Serial No (Auto-Fill):'}</span>
              <span className="text-[10px] bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 px-2 py-0.5 rounded-full font-mono font-bold">
                {warrantyRecords.length} Cards
              </span>
            </label>

            <select
              value={selectedWarrantyId}
              onChange={e => handleSelectWarrantyRecord(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="">{isBn ? '-- ওয়ারেন্টি কার্ড সিলেক্ট করুন --' : '-- Select Warranty Card --'}</option>
              {warrantyRecords.map(r => (
                <option key={r.id} value={r.id}>
                  {r.warrantyCode} | {r.productName} (S/N: {r.serialNumber || 'N/A'}) - {r.customerName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Ticket No:</label>
              <input
                type="text"
                value={formData.claimTicketNo}
                onChange={e => setFormData({ ...formData, claimTicketNo: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-indigo-600 dark:text-indigo-400">Serial / IMEI No:</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-indigo-400 dark:border-indigo-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Product Name:</label>
            <input
              type="text"
              value={formData.productName}
              onChange={e => setFormData({ ...formData, productName: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Customer Name:</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Customer Phone:</label>
              <input
                type="text"
                value={formData.customerPhone}
                onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-rose-600 dark:text-rose-400">
              {isBn ? 'সমস্যা / ত্রুটির বিবরণ (Reported Problem):' : 'Reported Issue / Problem:'}
            </label>
            <textarea
              rows={3}
              value={formData.issueDescription}
              onChange={e => setFormData({ ...formData, issueDescription: e.target.value })}
              placeholder={isBn ? 'ডিসপ্লে জিকমিক করছে, পাওয়ার আসছে না ইত্যাদি...' : 'Describe problem in detail...'}
              className="w-full px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-900 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isBn ? 'পণ্যের বাহ্যিক অবস্থা ও এক্সেসরিজ:' : 'Physical Condition & Accessories:'}
            </label>
            <input
              type="text"
              value={formData.physicalCondition}
              onChange={e => setFormData({ ...formData, physicalCondition: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
            >
              Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-Component: Update Status Modal
const ModalUpdateClaimStatus: React.FC<{
  claim: WarrantyClaim;
  onClose: () => void;
  onSave: (status: WarrantyClaimStatus, note: string, updates: Partial<WarrantyClaim>) => void;
  isBn: boolean;
}> = ({ claim, onClose, onSave, isBn }) => {
  const [status, setStatus] = useState<WarrantyClaimStatus>(claim.status);
  const [note, setNote] = useState('');
  const [replacementSerial, setReplacementSerial] = useState(claim.replacementSerialNumber || '');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4 text-xs">
        <button onClick={onClose} className="absolute right-4 top-4 p-1 text-slate-400">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {isBn ? `ক্লেইম স্ট্যাটাস আপডেট (${claim.claimTicketNo})` : `Update Claim Status (${claim.claimTicketNo})`}
        </h3>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="font-bold text-slate-900 dark:text-white">{claim.productName}</p>
          <p className="font-mono text-indigo-600 dark:text-indigo-400">S/N: {claim.serialNumber}</p>
        </div>

        <div>
          <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Status:</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as WarrantyClaimStatus)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
          >
            <option value="RECEIVED">RECEIVED (রিসিভড)</option>
            <option value="IN_REPAIR">IN_REPAIR (মেরামত চলছে)</option>
            <option value="SENT_TO_SUPPLIER">SENT_TO_SUPPLIER (সাপ্লায়ারে প্রেরিত)</option>
            <option value="REPLACED">REPLACED (নতুন পিস রিপ্লেসড)</option>
            <option value="REPAIRED">REPAIRED (মেরামত সম্পন্ন)</option>
            <option value="DELIVERED">DELIVERED (গ্রাহককে অর্পণ)</option>
            <option value="REFUNDED">REFUNDED (রিফান্ডড)</option>
            <option value="REJECTED">REJECTED (বাতিল/কভারড নয়)</option>
          </select>
        </div>

        {status === 'REPLACED' && (
          <div>
            <label className="block font-semibold mb-1 text-emerald-600 dark:text-emerald-400">
              Replacement Unit Serial Number (নতুন সিরিয়াল):
            </label>
            <input
              type="text"
              value={replacementSerial}
              onChange={e => setReplacementSerial(e.target.value)}
              placeholder="e.g. SN-NEW-998811"
              className="w-full px-3 py-2 rounded-lg border border-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
            />
          </div>
        )}

        {['REPAIRED', 'REPLACED', 'DELIVERED', 'REFUNDED'].includes(status) && (
          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
              <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{isBn ? 'স্বয়ংক্রিয় SMS নোটিফিকেশন' : 'Auto SMS Notification'}</span>
            </div>
            <p className="text-[11px] text-purple-800 dark:text-purple-300">
              {isBn
                ? `স্ট্যাটাস 'Resolved' (${status}) সংরক্ষণ করলে কাস্টমার (${claim.customerPhone || 'ফোন নম্বর নেই'})-কে অটোমেটিক SMS যাবে।`
                : `An SMS alert will automatically be dispatched to the customer (${claim.customerPhone || 'No Phone'}) upon saving.`}
            </p>
          </div>
        )}

        <div>
          <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Action Note / Log Entry:</label>
          <textarea
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Log technical update..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700">
            Cancel
          </button>
          <button
            onClick={() => onSave(status, note, { replacementSerialNumber: replacementSerial })}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-Component: Policy Form Modal
const ModalPolicyForm: React.FC<{
  policy: WarrantyPolicy | null;
  onClose: () => void;
  onSave: (data: any) => void;
  isBn: boolean;
}> = ({ policy, onClose, onSave, isBn }) => {
  const [formData, setFormData] = useState({
    name: policy?.name || '',
    nameBn: policy?.nameBn || '',
    duration: policy?.duration || 1,
    durationUnit: policy?.durationUnit || 'YEARS',
    type: policy?.type || 'REPLACEMENT',
    terms: policy?.terms || '',
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4 text-xs">
        <button onClick={onClose} className="absolute right-4 top-4 p-1 text-slate-400">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {policy ? (isBn ? 'পলিসি সম্পাদনা' : 'Edit Policy') : (isBn ? 'নতুন ওয়ারেন্টি পলিসি' : 'New Warranty Policy')}
        </h3>

        <form
          onSubmit={e => {
            e.preventDefault();
            onSave(formData);
          }}
          className="space-y-3"
        >
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Policy Name (English):</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">পলিসির নাম (বাংলা):</label>
            <input
              type="text"
              value={formData.nameBn}
              onChange={e => setFormData({ ...formData, nameBn: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Duration:</label>
              <input
                type="number"
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Unit:</label>
              <select
                value={formData.durationUnit}
                onChange={e => setFormData({ ...formData, durationUnit: e.target.value as any })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="DAYS">Days</option>
                <option value="MONTHS">Months</option>
                <option value="YEARS">Years</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Terms & Conditions:</label>
            <textarea
              rows={3}
              value={formData.terms}
              onChange={e => setFormData({ ...formData, terms: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold">
              Save Policy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
