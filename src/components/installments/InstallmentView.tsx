import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Badge } from '../common/Badge';
import { MultiUserAuditTrail } from '../common/MultiUserAuditTrail';
import {
  InstallmentScheme,
  InstallmentFrequency,
  InstallmentSchedule,
  InstallmentSubTab,
  InstallmentFormulaMethod,
} from '../../types';
import { canUserDelete } from '../../utils/permissions';
import {
  CalendarCheck,
  Plus,
  Calculator,
  AlertCircle,
  Search,
  Printer,
  DollarSign,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  X,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  FileText,
  HelpCircle,
  Sliders,
  Check,
  RefreshCw,
  Phone,
  Calendar,
  Building,
  ChevronRight,
  Send,
  MessageSquare,
  Eye,
  Trash2,
} from 'lucide-react';

export const InstallmentView: React.FC = () => {
  const {
    language,
    installmentSchemes,
    parties,
    wallets,
    products,
    companySettings,
    formatCurrency,
    createInstallmentScheme,
    collectInstallment,
    deleteInstallmentScheme,
    openPrintModal,
    showToast,
    currentUser,
    activeInstallmentSubTab,
    setActiveInstallmentSubTab,
    sendManualSms,
    sendDueReminderSms,
    smsConfig,
  } = useApp();
  const { t } = useTranslation(language);

  const customers = parties.filter(p => p.type === 'CUSTOMER');

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [reportMonth, setReportMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [reportStatusFilter, setReportStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');

  // SMS System States
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsRecipientPhone, setSmsRecipientPhone] = useState('');
  const [smsRecipientName, setSmsRecipientName] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsPresetType, setSmsPresetType] = useState<'OVERDUE' | 'UPCOMING' | 'RECEIPT' | 'AGREEMENT' | 'CUSTOM'>('OVERDUE');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isSendingBulkDefaulterSms, setIsSendingBulkDefaulterSms] = useState(false);
  const [sendCollectionSms, setSendCollectionSms] = useState(true);

  // Selected Scheme for detailed modal / collection
  const [selectedScheme, setSelectedScheme] = useState<InstallmentScheme | null>(null);
  const [collectingScheduleNo, setCollectingScheduleNo] = useState<number | null>(null);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [collectionWalletId, setCollectionWalletId] = useState<string>(wallets[0]?.id || 'w-cash');
  const [collectionPaymentMethod, setCollectionPaymentMethod] = useState<string>('Cash');

  // =========================================================================
  // FORM STATE FOR NEW INSTALLMENT SCHEME
  // =========================================================================
  const [formCustomerId, setFormCustomerId] = useState<string>(customers[0]?.id || '');
  const [formProductId, setFormProductId] = useState<string>(products[0]?.id || '');
  const [formProductName, setFormProductName] = useState<string>('');
  const [formTotalPrice, setFormTotalPrice] = useState<number>(0);
  const [formDownPayment, setFormDownPayment] = useState<number>(0);
  const [formInterestRate, setFormInterestRate] = useState<number>(0);
  const [formTotalInstallments, setFormTotalInstallments] = useState<number>(6);
  const [formFrequency, setFormFrequency] = useState<InstallmentFrequency>('MONTHLY');
  const [formStartDate, setFormStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formGuarantorName, setFormGuarantorName] = useState<string>('');
  const [formGuarantorPhone, setFormGuarantorPhone] = useState<string>('');
  const [formGuarantorNid, setFormGuarantorNid] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Live Calculator for Form
  const principalAmount = Math.max(0, formTotalPrice - formDownPayment);
  const interestAmount = (principalAmount * (formInterestRate || 0)) / 100;
  const totalPayable = principalAmount + interestAmount;
  const emiAmount = formTotalInstallments > 0 ? Math.round(totalPayable / formTotalInstallments) : 0;

  // Handle Product select in New Scheme
  const handleProductSelect = (pId: string) => {
    setFormProductId(pId);
    const prod = products.find(p => p.id === pId);
    if (prod) {
      setFormProductName(prod.name);
      setFormTotalPrice(prod.salesPrice);
      setFormDownPayment(Math.round(prod.salesPrice * 0.3)); // default 30% down payment suggestion
    }
  };

  // Generate Schedules preview
  const generateSchedules = (startDateStr: string, count: number, emi: number): InstallmentSchedule[] => {
    const schedules: InstallmentSchedule[] = [];
    const dateObj = new Date(startDateStr);

    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(dateObj);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      schedules.push({
        installmentNo: i,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: emi,
        penalty: 0,
        paidAmount: 0,
        status: 'PENDING',
      });
    }
    return schedules;
  };

  // =========================================================================
  // SMS HELPERS & DISPATCHERS
  // =========================================================================
  const buildEmiSmsMessage = (
    type: 'OVERDUE' | 'UPCOMING' | 'RECEIPT' | 'AGREEMENT' | 'CUSTOM',
    data: {
      customerName: string;
      productName: string;
      schemeNumber?: string;
      installmentNo?: number;
      amount?: number;
      dueDate?: string;
      storeName?: string;
      storePhone?: string;
    }
  ) => {
    const store = data.storeName || companySettings.name || 'দোকানপ্রো';
    const phone = data.storePhone || companySettings.phone || '';

    if (type === 'OVERDUE') {
      return `সম্মানিত ${data.customerName}, ${store}-এ আপনার ${data.productName} পণ্যের কিস্তি নং ${data.installmentNo || 1} (৳${(data.amount || 0).toLocaleString()}) পরিশোধের শেষ তারিখ ${data.dueDate || ''} পার হয়ে গেছে। বকেয়া টাকা দ্রুত পরিশোধের অনুরোধ করা হচ্ছে। হেল্পলাইন: ${phone}`;
    }
    if (type === 'UPCOMING') {
      return `সম্মানিত ${data.customerName}, ${store}-এ আপনার ${data.productName}-এর পরবর্তী কিস্তি নং ${data.installmentNo || 1} (৳${(data.amount || 0).toLocaleString()}) পরিশোধের তারিখ ${data.dueDate || ''}। নির্ধারিত সময়ে কিস্তি জমা দেওয়ার অনুরোধ করা হলো। হেল্পলাইন: ${phone}`;
    }
    if (type === 'RECEIPT') {
      return `সম্মানিত ${data.customerName}, ${store}-এ ${data.productName}-এর কিস্তি নং ${data.installmentNo || 1} বাবদ ৳${(data.amount || 0).toLocaleString()} সফলভাবে জমা হয়েছে। ধন্যবাদ!`;
    }
    if (type === 'AGREEMENT') {
      return `সম্মানিত ${data.customerName}, ${store}-এ ${data.productName}-এর কিস্তি চুক্তি (${data.schemeNumber || ''}) সম্পন্ন হয়েছে। প্রতি কিস্তি: ৳${(data.amount || 0).toLocaleString()}। হেল্পলাইন: ${phone}`;
    }
    return `সম্মানিত ${data.customerName}, ${store}-এর কিস্তি বিষয়ক বিশেষ দ্রষ্টব্য: `;
  };

  const handleOpenSmsModal = (
    phone: string,
    name: string,
    preset: 'OVERDUE' | 'UPCOMING' | 'RECEIPT' | 'AGREEMENT' | 'CUSTOM' = 'OVERDUE',
    details?: {
      productName?: string;
      schemeNumber?: string;
      installmentNo?: number;
      amount?: number;
      dueDate?: string;
    }
  ) => {
    setSmsRecipientPhone(phone);
    setSmsRecipientName(name);
    setSmsPresetType(preset);

    if (details) {
      const msg = buildEmiSmsMessage(preset, {
        customerName: name,
        productName: details.productName || 'পণ্য',
        schemeNumber: details.schemeNumber,
        installmentNo: details.installmentNo,
        amount: details.amount,
        dueDate: details.dueDate,
        storeName: companySettings.name,
        storePhone: companySettings.phone,
      });
      setSmsMessage(msg);
    } else {
      setSmsMessage(
        buildEmiSmsMessage(preset, {
          customerName: name,
          productName: 'পণ্য',
          storeName: companySettings.name,
          storePhone: companySettings.phone,
        })
      );
    }

    setSmsModalOpen(true);
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsRecipientPhone || !smsMessage.trim()) {
      showToast(language === 'bn' ? 'ফোন নম্বর ও মেসেজ প্রদান করুন!' : 'Provide phone number and message!', 'warning');
      return;
    }
    setIsSendingSms(true);
    const success = await sendManualSms(smsRecipientPhone, smsRecipientName || 'Customer', smsMessage, 'DUE_REMINDER');
    setIsSendingSms(false);
    if (success) {
      setSmsModalOpen(false);
    }
  };

  const handleSendBulkDefaulterSms = async () => {
    if (defaulterSchemes.length === 0) {
      showToast(language === 'bn' ? 'কোন খেলাপী কিস্তি গ্রাহক নেই!' : 'No overdue defaulters found!', 'info');
      return;
    }
    if (
      !window.confirm(
        language === 'bn'
          ? `আপনি কি ${defaulterSchemes.length} জন খেলাপী গ্রাহককে বকেয়া তাগাদা SMS পাঠাতে চান?`
          : `Send overdue SMS to all ${defaulterSchemes.length} defaulters?`
      )
    ) {
      return;
    }

    setIsSendingBulkDefaulterSms(true);
    let sent = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const scheme of defaulterSchemes) {
      if (scheme.customerPhone) {
        const overdueList = scheme.schedules.filter(s => s.status === 'PENDING' && s.dueDate < today);
        const overdueTotal = overdueList.reduce((sum, s) => sum + s.amount, 0);
        const firstOverdue = overdueList[0];

        const msg = buildEmiSmsMessage('OVERDUE', {
          customerName: scheme.customerName,
          productName: scheme.productName,
          schemeNumber: scheme.schemeNumber,
          installmentNo: firstOverdue?.installmentNo || 1,
          amount: overdueTotal,
          dueDate: firstOverdue?.dueDate || today,
          storeName: companySettings.name,
          storePhone: companySettings.phone,
        });

        await sendManualSms(scheme.customerPhone, scheme.customerName, msg, 'DUE_REMINDER');
        sent++;
      }
    }

    setIsSendingBulkDefaulterSms(false);
    showToast(
      language === 'bn'
        ? `✅ মোট ${sent} জন খেলাপী কিস্তি গ্রাহককে তাগাদা SMS পাঠানো হয়েছে!`
        : `Sent SMS to ${sent} defaulter customers!`,
      'success'
    );
  };

  // Submit New Scheme
  const handleCreateScheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId || formTotalPrice <= 0 || formTotalInstallments <= 0) {
      showToast(language === 'bn' ? 'অনুগ্রহ করে গ্রাহক, মোট মূল্য ও কিস্তির সংখ্যা পূরণ করুন!' : 'Please complete customer, total price and installments!', 'warning');
      return;
    }

    const customer = parties.find(p => p.id === formCustomerId);
    const schedules = generateSchedules(formStartDate, formTotalInstallments, emiAmount);

    const created = createInstallmentScheme({
      customerId: formCustomerId,
      customerName: customer?.name || 'Customer',
      customerPhone: customer?.phone || '',
      productName: formProductName || 'Product Item',
      totalPrice: formTotalPrice,
      downPayment: formDownPayment,
      principalAmount,
      interestRate: formInterestRate,
      interestAmount,
      totalPayable,
      totalInstallments: formTotalInstallments,
      frequency: formFrequency,
      emiAmount,
      startDate: formStartDate,
      status: 'ACTIVE',
      schedules,
      guarantorName: formGuarantorName,
      guarantorPhone: formGuarantorPhone,
      guarantorNid: formGuarantorNid,
      notes: formNotes,
    });

    if (customer?.phone) {
      const agreementMsg = buildEmiSmsMessage('AGREEMENT', {
        customerName: customer.name,
        productName: formProductName || 'Product Item',
        schemeNumber: created.schemeNumber,
        amount: emiAmount,
        storeName: companySettings.name,
        storePhone: companySettings.phone,
      });
      sendManualSms(customer.phone, customer.name, agreementMsg, 'SALE');
    }

    setActiveInstallmentSubTab('schemes');
    setSelectedScheme(created);
  };

  // Collect specific installment
  const handleConfirmCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheme || collectingScheduleNo === null) return;

    const schedule = selectedScheme.schedules.find(s => s.installmentNo === collectingScheduleNo);
    if (!schedule) return;

    collectInstallment(
      selectedScheme.id,
      collectingScheduleNo,
      schedule.amount,
      penaltyAmount || 0,
      collectionWalletId,
      collectionPaymentMethod
    );

    if (sendCollectionSms && selectedScheme.customerPhone) {
      const receiptMsg = buildEmiSmsMessage('RECEIPT', {
        customerName: selectedScheme.customerName,
        productName: selectedScheme.productName,
        schemeNumber: selectedScheme.schemeNumber,
        installmentNo: collectingScheduleNo,
        amount: schedule.amount + (penaltyAmount || 0),
        storeName: companySettings.name,
        storePhone: companySettings.phone,
      });
      sendManualSms(selectedScheme.customerPhone, selectedScheme.customerName, receiptMsg, 'PAYMENT_IN');
    }

    // Refresh selected scheme view
    const updated = installmentSchemes.find(s => s.id === selectedScheme.id);
    if (updated) {
      setSelectedScheme(updated);
    }
    setCollectingScheduleNo(null);
    setPenaltyAmount(0);
  };

  // =========================================================================
  // FORMULA ENGINE & SIMULATOR STATES
  // =========================================================================
  const [selectedFormulaMethod, setSelectedFormulaMethod] = useState<InstallmentFormulaMethod>('FLAT_RATE');
  const [simPrincipal, setSimPrincipal] = useState<number>(50000);
  const [simAnnualRate, setSimAnnualRate] = useState<number>(12);
  const [simTenureMonths, setSimTenureMonths] = useState<number>(12);
  const [simDownPayment, setSimDownPayment] = useState<number>(10000);
  const [simProcessingFee, setSimProcessingFee] = useState<number>(500);
  const [simGracePeriodDays, setSimGracePeriodDays] = useState<number>(5);
  const [simLateFeePerDay, setSimLateFeePerDay] = useState<number>(20);
  const [simEarlySettlementMonth, setSimEarlySettlementMonth] = useState<number>(6);

  // Amortization & Formula Computations
  const formulaCalculation = useMemo(() => {
    const P = Math.max(0, simPrincipal - simDownPayment);
    const n = Math.max(1, simTenureMonths);
    const annualRate = simAnnualRate || 0;
    const r = annualRate / 12 / 100; // monthly rate

    // 1. Flat Rate Calculation
    const flatTotalInterest = P * (annualRate / 100) * (n / 12);
    const flatTotalPayable = P + flatTotalInterest;
    const flatEmi = Math.round(flatTotalPayable / n);

    // 2. Reducing Balance (Standard Banking EMI Formula)
    // EMI = [P * r * (1+r)^n] / [(1+r)^n - 1]
    let reducingEmi = 0;
    let reducingTotalPayable = 0;
    let reducingTotalInterest = 0;
    const reducingSchedule: Array<{
      month: number;
      openingBalance: number;
      emi: number;
      principalPortion: number;
      interestPortion: number;
      closingBalance: number;
    }> = [];

    if (r === 0) {
      reducingEmi = Math.round(P / n);
      reducingTotalPayable = P;
      reducingTotalInterest = 0;
      let bal = P;
      for (let m = 1; m <= n; m++) {
        const prin = Math.min(bal, reducingEmi);
        bal = Math.max(0, bal - prin);
        reducingSchedule.push({
          month: m,
          openingBalance: bal + prin,
          emi: reducingEmi,
          principalPortion: prin,
          interestPortion: 0,
          closingBalance: bal,
        });
      }
    } else {
      const pow = Math.pow(1 + r, n);
      reducingEmi = Math.round((P * r * pow) / (pow - 1));
      let currentBal = P;
      for (let m = 1; m <= n; m++) {
        const interestM = Math.round(currentBal * r);
        let prinM = reducingEmi - interestM;
        if (m === n || prinM > currentBal) {
          prinM = currentBal;
        }
        const closeBal = Math.max(0, currentBal - prinM);
        reducingSchedule.push({
          month: m,
          openingBalance: currentBal,
          emi: prinM + interestM,
          principalPortion: prinM,
          interestPortion: interestM,
          closingBalance: closeBal,
        });
        currentBal = closeBal;
        reducingTotalInterest += interestM;
      }
      reducingTotalPayable = P + reducingTotalInterest;
    }

    // 3. Hire Purchase Fixed Profit Markup
    const hirePurchaseMarkupAmt = Math.round(P * (annualRate / 100));
    const hirePurchaseTotal = P + hirePurchaseMarkupAmt;
    const hirePurchaseEmi = Math.round(hirePurchaseTotal / n);

    // 4. Zero Percent Interest Promo
    const zeroPercentTotal = P + (simProcessingFee || 0);
    const zeroPercentEmi = Math.round(P / n);

    // 5. Microfinance Weekly (Assuming 44 or 52 weeks)
    const microWeeks = Math.round(n * 4.33);
    const microWeeklyEmi = microWeeks > 0 ? Math.round(flatTotalPayable / microWeeks) : 0;
    const microDailyEmi = Math.round(flatTotalPayable / (n * 30));

    // 6. Early Settlement Rebate (Rule of 78s)
    const k = Math.min(n, Math.max(1, simEarlySettlementMonth));
    const sumOfDigits = (n * (n + 1)) / 2;
    const remainingDigits = ((n - k) * (n - k + 1)) / 2;
    const interestRebate = Math.round(flatTotalInterest * (remainingDigits / sumOfDigits));
    const remainingPrincipalPortion = Math.round(P * ((n - k) / n));
    const earlyPayoffAmount = Math.max(0, remainingPrincipalPortion + (flatTotalInterest - interestRebate));

    return {
      P,
      n,
      annualRate,
      flat: {
        totalInterest: flatTotalInterest,
        totalPayable: flatTotalPayable,
        emi: flatEmi,
        effectiveApr: Number((((flatTotalInterest / P) * (12 / n)) * 100).toFixed(2)),
      },
      reducing: {
        emi: reducingEmi,
        totalInterest: reducingTotalInterest,
        totalPayable: reducingTotalPayable,
        schedule: reducingSchedule,
        effectiveApr: Number((annualRate).toFixed(2)),
      },
      hirePurchase: {
        markup: hirePurchaseMarkupAmt,
        totalPayable: hirePurchaseTotal,
        emi: hirePurchaseEmi,
      },
      zeroPercent: {
        totalPayable: zeroPercentTotal,
        emi: zeroPercentEmi,
        processingFee: simProcessingFee,
      },
      microfinance: {
        weeks: microWeeks,
        weeklyEmi: microWeeklyEmi,
        dailyEmi: microDailyEmi,
      },
      earlySettlement: {
        settleMonth: k,
        interestRebate,
        earlyPayoffAmount,
        savingsPercent: flatTotalInterest > 0 ? Math.round((interestRebate / flatTotalInterest) * 100) : 0,
      },
    };
  }, [simPrincipal, simDownPayment, simAnnualRate, simTenureMonths, simProcessingFee, simEarlySettlementMonth]);

  // Apply simulated values to New Scheme form
  const handleApplySimulatorToScheme = () => {
    setFormTotalPrice(simPrincipal);
    setFormDownPayment(simDownPayment);
    setFormInterestRate(simAnnualRate);
    setFormTotalInstallments(simTenureMonths);
    setFormProductName(`Custom EMI Loan / ${simPrincipal.toLocaleString()} BDT`);
    setActiveInstallmentSubTab('new-scheme');
    showToast(
      language === 'bn'
        ? 'ফর্মুলা হিসাব সফলভাবে নতুন কিস্তি চুক্তিতে প্রয়োগ করা হয়েছে!'
        : 'Formula calculations applied to New Agreement form!'
    );
  };

  // Print Amortization Schedule & Formula Sheet
  const handlePrintFormulaAmortization = () => {
    const cols = [
      { key: 'month', header: language === 'bn' ? 'মাস #' : 'Month #', align: 'center' },
      { key: 'opening', header: language === 'bn' ? 'শুরুর জের (Opening)' : 'Opening Balance', align: 'right', format: 'currency' },
      { key: 'emi', header: language === 'bn' ? 'কিস্তি (EMI)' : 'Monthly EMI', align: 'right', format: 'currency' },
      { key: 'principal', header: language === 'bn' ? 'মূল আসল (Principal)' : 'Principal Paid', align: 'right', format: 'currency' },
      { key: 'interest', header: language === 'bn' ? 'সুদ অংশ (Interest)' : 'Interest Paid', align: 'right', format: 'currency' },
      { key: 'closing', header: language === 'bn' ? 'অবশিষ্ট জের (Closing)' : 'Closing Balance', align: 'right', format: 'currency' },
    ];

    const rows = formulaCalculation.reducing.schedule.map(s => ({
      month: `${s.month}`,
      opening: s.openingBalance,
      emi: s.emi,
      principal: s.principalPortion,
      interest: s.interestPortion,
      closing: s.closingBalance,
    }));

    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? 'কিস্তির সম্পূর্ণ ফর্মুলা ও অ্যামোর্টাইজেশন শিডিউল' : 'Installment Amortization & Formula Schedule',
      data: {
        reportTitle: language === 'bn' ? 'কিস্তির সম্পূর্ণ ফর্মুলা ও শিডিউল বিবরণী' : 'INSTALLMENT AMORTIZATION & FORMULA SCHEDULE',
        period: `${simTenureMonths} Months (${simAnnualRate}% Annual Rate)`,
        generatedDate: new Date().toISOString().split('T')[0],
        filters: [
          { label: 'Calculation Method', value: selectedFormulaMethod },
          { label: 'Total Loan/Price', value: `৳ ${simPrincipal.toLocaleString()}` },
          { label: 'Down Payment', value: `৳ ${simDownPayment.toLocaleString()}` },
          { label: 'Financed Principal (P)', value: `৳ ${formulaCalculation.P.toLocaleString()}` },
          { label: 'Tenure (n)', value: `${simTenureMonths} Months` },
          { label: 'Annual Rate (r)', value: `${simAnnualRate}%` },
        ],
        kpis: [
          { label: 'Net Principal (P)', value: formulaCalculation.P },
          { label: 'Monthly EMI', value: selectedFormulaMethod === 'REDUCING_BALANCE' ? formulaCalculation.reducing.emi : formulaCalculation.flat.emi },
          { label: 'Total Interest', value: selectedFormulaMethod === 'REDUCING_BALANCE' ? formulaCalculation.reducing.totalInterest : formulaCalculation.flat.totalInterest },
          { label: 'Total Payable', value: selectedFormulaMethod === 'REDUCING_BALANCE' ? formulaCalculation.reducing.totalPayable : formulaCalculation.flat.totalPayable },
        ],
        columns: cols,
        rows: rows,
        totals: {
          opening: '',
          emi: selectedFormulaMethod === 'REDUCING_BALANCE' ? formulaCalculation.reducing.totalPayable : formulaCalculation.flat.totalPayable,
          principal: formulaCalculation.P,
          interest: selectedFormulaMethod === 'REDUCING_BALANCE' ? formulaCalculation.reducing.totalInterest : formulaCalculation.flat.totalInterest,
          closing: 0,
        },
      },
    });
  };

  // =========================================================================
  // MONTHLY INSTALLMENT REPORT DATA & PRINT
  // =========================================================================
  const monthlySchedulesList = useMemo(() => {
    const list: Array<{
      scheme: InstallmentScheme;
      schedule: InstallmentSchedule;
    }> = [];

    installmentSchemes.forEach(scheme => {
      scheme.schedules.forEach(sched => {
        if (sched.dueDate.startsWith(reportMonth)) {
          if (reportStatusFilter === 'ALL') {
            list.push({ scheme, schedule: sched });
          } else if (reportStatusFilter === 'PAID' && sched.status === 'PAID') {
            list.push({ scheme, schedule: sched });
          } else if (reportStatusFilter === 'PENDING' && sched.status === 'PENDING') {
            list.push({ scheme, schedule: sched });
          } else if (reportStatusFilter === 'OVERDUE') {
            const today = new Date().toISOString().split('T')[0];
            if (sched.status === 'PENDING' && sched.dueDate < today) {
              list.push({ scheme, schedule: sched });
            }
          }
        }
      });
    });

    return list;
  }, [installmentSchemes, reportMonth, reportStatusFilter]);

  const monthlyTotals = useMemo(() => {
    let totalDueAmt = 0;
    let paidAmt = 0;
    let pendingAmt = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    const today = new Date().toISOString().split('T')[0];

    monthlySchedulesList.forEach(({ schedule }) => {
      totalDueAmt += schedule.amount;
      if (schedule.status === 'PAID') {
        paidAmt += (schedule.paidAmount || schedule.amount);
        paidCount++;
      } else {
        pendingAmt += schedule.amount;
        pendingCount++;
        if (schedule.dueDate < today) {
          overdueCount++;
        }
      }
    });

    return {
      totalCount: monthlySchedulesList.length,
      totalDueAmt,
      paidAmt,
      pendingAmt,
      paidCount,
      pendingCount,
      overdueCount,
      collectionRate: totalDueAmt > 0 ? Math.round((paidAmt / totalDueAmt) * 100) : 0,
    };
  }, [monthlySchedulesList]);

  // Print Monthly Report using system Print Modal
  const handlePrintMonthlyReport = () => {
    const cols = [
      { key: 'schemeNo', header: language === 'bn' ? 'চুক্তি নং' : 'Scheme #', align: 'left' },
      { key: 'customer', header: language === 'bn' ? 'গ্রাহকের নাম ও মোবাইল' : 'Customer Name & Phone', align: 'left' },
      { key: 'product', header: language === 'bn' ? 'পণ্য' : 'Product', align: 'left' },
      { key: 'installmentNo', header: language === 'bn' ? 'কিস্তি #' : 'Inst #', align: 'center' },
      { key: 'dueDate', header: language === 'bn' ? 'পরিশোধের তারিখ' : 'Due Date', align: 'center' },
      { key: 'amount', header: language === 'bn' ? 'কিস্তির টাকা' : 'EMI Amount', align: 'right', format: 'currency' },
      { key: 'paidDate', header: language === 'bn' ? 'জমার তারিখ' : 'Paid Date', align: 'center' },
      { key: 'status', header: language === 'bn' ? 'অবস্থা' : 'Status', align: 'center' },
    ];

    const today = new Date().toISOString().split('T')[0];
    const rows = monthlySchedulesList.map(({ scheme, schedule }) => {
      const isOverdue = schedule.status === 'PENDING' && schedule.dueDate < today;
      return {
        schemeNo: scheme.schemeNumber,
        customer: `${scheme.customerName} (${scheme.customerPhone})`,
        product: scheme.productName,
        installmentNo: `#${schedule.installmentNo}`,
        dueDate: schedule.dueDate,
        amount: schedule.amount,
        paidDate: schedule.paidDate || '-',
        status: schedule.status === 'PAID' ? 'PAID ✓' : isOverdue ? 'OVERDUE !' : 'PENDING',
      };
    });

    openPrintModal({
      type: 'REPORT',
      title: language === 'bn' ? `মাসিক কিস্তি কালেকশন রিপোর্ট - ${reportMonth}` : `Monthly Installment Collection Report - ${reportMonth}`,
      data: {
        reportTitle: language === 'bn' ? `মাসিক কিস্তি ও কালেকশন রিপোর্ট` : `MONTHLY INSTALLMENT & COLLECTION REPORT`,
        period: `Month: ${reportMonth}`,
        generatedDate: today,
        filters: [
          { label: 'Target Month', value: reportMonth },
          { label: 'Filter Status', value: reportStatusFilter },
          { label: 'Total Scheduled', value: `${monthlyTotals.totalCount} installments` },
        ],
        kpis: [
          { label: 'Total Scheduled Amount', value: monthlyTotals.totalDueAmt },
          { label: 'Total Collected (Paid)', value: monthlyTotals.paidAmt },
          { label: 'Pending Collection', value: monthlyTotals.pendingAmt },
          { label: 'Collection Efficiency', value: `${monthlyTotals.collectionRate}%` },
        ],
        columns: cols,
        rows: rows,
        totals: {
          product: '',
          dueDate: '',
          amount: monthlyTotals.totalDueAmt,
          status: `Paid: ৳${monthlyTotals.paidAmt.toLocaleString()} | Due: ৳${monthlyTotals.pendingAmt.toLocaleString()}`,
        },
      },
    });
  };

  // Print Customer Ledger Statement
  const handlePrintCustomerLedger = () => {
    const customer = parties.find(p => p.id === selectedCustomerId);
    if (!customer) return;

    const customerSchemes = installmentSchemes.filter(s => s.customerId === customer.id);
    let totalBorrow = 0;
    let totalPaid = 0;
    let totalPending = 0;

    customerSchemes.forEach(s => {
      totalBorrow += s.totalPayable;
      s.schedules.forEach(sc => {
        if (sc.status === 'PAID') {
          totalPaid += (sc.paidAmount || sc.amount);
        } else {
          totalPending += sc.amount;
        }
      });
    });

    const cols = [
      { key: 'schemeNo', header: 'Scheme / Agreement', align: 'left' },
      { key: 'product', header: 'Product Item', align: 'left' },
      { key: 'instNo', header: 'Installment #', align: 'center' },
      { key: 'dueDate', header: 'Due Date', align: 'center' },
      { key: 'amount', header: 'EMI Amount', align: 'right', format: 'currency' },
      { key: 'paidDate', header: 'Payment Date', align: 'center' },
      { key: 'status', header: 'Status', align: 'center' },
    ];

    const rows: any[] = [];
    customerSchemes.forEach(sc => {
      sc.schedules.forEach(sched => {
        rows.push({
          schemeNo: sc.schemeNumber,
          product: sc.productName,
          instNo: `#${sched.installmentNo}`,
          dueDate: sched.dueDate,
          amount: sched.amount,
          paidDate: sched.paidDate || '-',
          status: sched.status === 'PAID' ? 'PAID ✓' : 'PENDING',
        });
      });
    });

    openPrintModal({
      type: 'STATEMENT',
      title: `${customer.name} - Installment Ledger Statement`,
      data: {
        reportTitle: 'CUSTOMER INSTALLMENT LEDGER STATEMENT',
        partyName: customer.name,
        partyPhone: customer.phone,
        partyAddress: customer.address || 'Dhaka, Bangladesh',
        generatedDate: new Date().toISOString().split('T')[0],
        filters: [
          { label: 'Customer Name', value: customer.name },
          { label: 'Phone', value: customer.phone },
          { label: 'Total Schemes', value: `${customerSchemes.length}` },
        ],
        kpis: [
          { label: 'Total Loan / Price', value: totalBorrow },
          { label: 'Total Paid So Far', value: totalPaid },
          { label: 'Outstanding Balance', value: totalPending },
          { label: 'Schemes Count', value: customerSchemes.length },
        ],
        columns: cols,
        rows: rows,
        totals: {
          dueDate: '',
          amount: totalBorrow,
          status: `Paid: ৳${totalPaid.toLocaleString()} | Due: ৳${totalPending.toLocaleString()}`,
        },
      },
    });
  };

  // Print Scheme Agreement Voucher
  const handlePrintSchemeAgreement = (scheme: InstallmentScheme) => {
    openPrintModal({
      type: 'STATEMENT',
      title: `EMI Agreement - ${scheme.schemeNumber}`,
      data: {
        reportTitle: 'INSTALLMENT SALES AGREEMENT & REPAYMENT SCHEDULE',
        partyName: scheme.customerName,
        partyPhone: scheme.customerPhone,
        period: `Agreement Date: ${scheme.startDate} | Scheme: ${scheme.schemeNumber}`,
        generatedDate: new Date().toISOString().split('T')[0],
        filters: [
          { label: 'Agreement No', value: scheme.schemeNumber },
          { label: 'Customer', value: `${scheme.customerName} (${scheme.customerPhone})` },
          { label: 'Product Item', value: scheme.productName },
          { label: 'Guarantor', value: scheme.guarantorName ? `${scheme.guarantorName} (${scheme.guarantorPhone})` : 'N/A' },
        ],
        kpis: [
          { label: 'Total Price', value: scheme.totalPrice },
          { label: 'Down Payment', value: scheme.downPayment },
          { label: 'Financed Principal', value: scheme.principalAmount },
          { label: 'Total Payable', value: scheme.totalPayable },
        ],
        columns: [
          { key: 'no', header: 'Installment #', align: 'center' },
          { key: 'date', header: 'Due Date', align: 'center' },
          { key: 'amount', header: 'EMI Amount', align: 'right', format: 'currency' },
          { key: 'status', header: 'Status', align: 'center' },
          { key: 'sign', header: 'Customer Sign / Ack', align: 'center' },
        ],
        rows: scheme.schedules.map(s => ({
          no: `#${s.installmentNo}`,
          date: s.dueDate,
          amount: s.amount,
          status: s.status,
          sign: s.status === 'PAID' ? 'PAID ✓' : '________________',
        })),
        totals: {
          date: 'TOTAL PAYABLE:',
          amount: scheme.totalPayable,
          sign: '',
        },
      },
    });
  };

  // Filter schemes for list
  const filteredSchemes = installmentSchemes.filter(s => {
    const matchSearch =
      s.schemeNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.productName.toLowerCase().includes(search.toLowerCase()) ||
      s.customerPhone.includes(search);
    return matchSearch;
  });

  // Defaulters (Overdue installments)
  const defaulterSchemes = installmentSchemes.filter(s => {
    const today = new Date().toISOString().split('T')[0];
    return s.status === 'ACTIVE' && s.schedules.some(sched => sched.status === 'PENDING' && sched.dueDate < today);
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-blue-600" />
            <span>{language === 'bn' ? 'কিস্তি ও ইএমআই ব্যবস্থাপনা (Installment & EMI)' : 'Installment & EMI Hub'}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'bn'
              ? 'কিস্তির সম্পূর্ণ ফর্মুলা সিমুলেটর, নতুন চুক্তি তৈরি, মাসিক কালেকশন রিপোর্ট এবং খেলাপী ট্র্যাকিং'
              : 'Multi-formula EMI engine, agreement creation, monthly collection report and default tracker'}
          </p>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveInstallmentSubTab('schemes')}
            className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeInstallmentSubTab === 'schemes'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'সব কিস্তি' : 'All Schemes'} ({installmentSchemes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveInstallmentSubTab('all-formulas')}
            className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeInstallmentSubTab === 'all-formulas'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'কিস্তির হিসাব ফর্মুলা (All Formula)' : 'Installment All Formula'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveInstallmentSubTab('monthly-report')}
            className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeInstallmentSubTab === 'monthly-report'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'কিস্তি রিপোর্ট (Report)' : 'Installment Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveInstallmentSubTab('defaulters')}
            className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeInstallmentSubTab === 'defaulters'
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'খেলাপী কিস্তি' : 'Defaulters'} ({defaulterSchemes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveInstallmentSubTab('customer-ledger')}
            className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeInstallmentSubTab === 'customer-ledger'
                ? 'bg-teal-600 text-white shadow-xs font-bold'
                : 'text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'গ্রাহক লেজার' : 'Customer Ledger'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveInstallmentSubTab('new-scheme')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeInstallmentSubTab === 'new-scheme'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? '+ নতুন চুক্তি' : '+ New Scheme'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenSmsModal(customers[0]?.phone || '', customers[0]?.name || 'Customer', 'OVERDUE')}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'এসএমএস পাঠান' : 'Send SMS'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB: INSTALLMENT ALL FORMULA (কিস্তির হিসাব ফর্মুলা ও ইএমআই সিমুলেটর)   */}
      {/* ========================================================================= */}
      {activeInstallmentSubTab === 'all-formulas' && (
        <div className="space-y-6">
          {/* Formula Header & Selector */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <span>{language === 'bn' ? 'কিস্তির সর্বপ্রকার ফর্মুলা ও গণকযন্ত্র (Installment All Formula Engine)' : 'Installment Multi-Formula Calculation Engine'}</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {language === 'bn'
                    ? 'ব্যাংকিং সমকিস্তি (Reducing Balance), ফ্ল্যাট রেট, হায়ার পারচেজ মুনাফা এবং ০% প্রমো কিস্তির সঠিক গাণিতিক বিশ্লেষণ'
                    : 'Mathematical formulas for Flat Rate, Reducing Balance EMI, Hire Purchase Margin, and 0% Promo'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintFormulaAmortization}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'ফর্মুলা শিট ও শিডিউল প্রিন্ট' : 'Print Amortization Sheet'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplySimulatorToScheme}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'নতুন চুক্তিতে প্রয়োগ করুন' : 'Apply to New Agreement'}</span>
                </button>
              </div>
            </div>

            {/* Formula Method Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {[
                { id: 'FLAT_RATE', labelBn: '১. ফ্ল্যাট রেট পদ্ধতি', labelEn: '1. Flat Rate Interest', descBn: 'সুদ = আসল × হার × সময়' },
                { id: 'REDUCING_BALANCE', labelBn: '২. হ্রাসমান জের (Banking EMI)', labelEn: '2. Reducing Balance EMI', descBn: 'EMI = P×r×(1+r)ⁿ / ((1+r)ⁿ-1)' },
                { id: 'HIRE_PURCHASE_MARKUP', labelBn: '৩. হায়ার পারচেজ লাভ', labelEn: '3. Hire Purchase Markup', descBn: 'স্থির লাভ মার্জিন যোগ' },
                { id: 'ZERO_PERCENT', labelBn: '৪. ০% সুদবিহীন অফার', labelEn: '4. 0% Interest Promo', descBn: 'ডাউনপেমেন্ট + ফি + মূলভাগ' },
                { id: 'MICROFINANCE_WEEKLY', labelBn: '৫. এনজিও ও সাপ্তাহিক', labelEn: '5. Microfinance Weekly', descBn: '৪৪/৫২ সপ্তাহের কিস্তি' },
              ].map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedFormulaMethod(method.id as InstallmentFormulaMethod)}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedFormulaMethod === method.id
                      ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs'
                      : 'bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                  }`}
                >
                  <div className="font-bold text-xs">{language === 'bn' ? method.labelBn : method.labelEn}</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{method.descBn}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Calculator Inputs & Live Formula Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Controls */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-2 flex items-center justify-between">
                <span>{language === 'bn' ? 'সিমুলেটর প্যারামিটার ইনপুট' : 'Simulator Parameters'}</span>
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              </h4>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    {language === 'bn' ? 'পণ্যের মোট মূল্য / ঋণ (Total Price / Loan):' : 'Total Price / Loan Amount (৳):'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-400 font-bold">৳</span>
                    <input
                      type="number"
                      min="1000"
                      step="500"
                      value={simPrincipal || ''}
                      onChange={e => setSimPrincipal(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    {language === 'bn' ? 'ডাউন পেমেন্ট (Down Payment):' : 'Down Payment (৳):'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-400 font-bold">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={simDownPayment || ''}
                      onChange={e => setSimDownPayment(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">
                    {language === 'bn'
                      ? `বাকি আসল (Financed Principal): ৳${formulaCalculation.P.toLocaleString()}`
                      : `Financed Principal: ৳${formulaCalculation.P.toLocaleString()}`}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                      {language === 'bn' ? 'বার্ষিক সুদের হার (%) :' : 'Annual Rate (%):'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={simAnnualRate}
                      onChange={e => setSimAnnualRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                      {language === 'bn' ? 'কিস্তির মেয়াদ (মাস) :' : 'Tenure (Months):'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={simTenureMonths}
                      onChange={e => setSimTenureMonths(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                {selectedFormulaMethod === 'ZERO_PERCENT' && (
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                      {language === 'bn' ? 'প্রসেসিং / ডকুমেন্টেশন ফি (Processing Fee):' : 'Documentation / Processing Fee (৳):'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={simProcessingFee}
                      onChange={e => setSimProcessingFee(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold text-zinc-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                    {language === 'bn' ? 'আগাম পরিশোধ মাস (Early Settlement Month):' : 'Early Settlement At Month:'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max={simTenureMonths}
                      value={simEarlySettlementMonth}
                      onChange={e => setSimEarlySettlementMonth(parseInt(e.target.value) || 1)}
                      className="flex-1"
                    />
                    <span className="font-mono font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
                      Month {simEarlySettlementMonth}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Formula Explanation & KPI Result Display */}
            <div className="lg:col-span-2 space-y-4">
              {/* Formula Details Box */}
              <div className="bg-zinc-900 text-white p-5 rounded-xl border border-zinc-800 shadow-md">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>
                      {selectedFormulaMethod === 'FLAT_RATE' && (language === 'bn' ? 'ফ্ল্যাট রেট সুদ সূত্র (Flat Rate Calculation)' : 'Flat Rate Interest Formula')}
                      {selectedFormulaMethod === 'REDUCING_BALANCE' && (language === 'bn' ? 'হ্রাসমান জের ব্যাংকিং সমকিস্তি সূত্র (Amortization EMI)' : 'Reducing Balance Banking EMI Formula')}
                      {selectedFormulaMethod === 'HIRE_PURCHASE_MARKUP' && (language === 'bn' ? 'হায়ার পারচেজ লাভ মার্জিন সূত্র (Hire Purchase Markup)' : 'Hire Purchase Markup Formula')}
                      {selectedFormulaMethod === 'ZERO_PERCENT' && (language === 'bn' ? '০% অফার কিস্তি সূত্র (0% Interest Promo)' : '0% Interest Promo Formula')}
                      {selectedFormulaMethod === 'MICROFINANCE_WEEKLY' && (language === 'bn' ? 'ক্ষুদ্রঋণ ও সাপ্তাহিক কিস্তি সূত্র (Microfinance Engine)' : 'Microfinance Weekly Engine')}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-zinc-300 font-mono">
                    Formula Active
                  </Badge>
                </div>

                {/* Mathematical Equation Presentation */}
                <div className="bg-black/40 p-3 rounded-lg border border-zinc-800 font-mono text-xs text-emerald-300 space-y-1 mb-4">
                  {selectedFormulaMethod === 'FLAT_RATE' && (
                    <>
                      <div>• Total Interest (I) = P × (r / 100) × (n / 12) = ৳{formulaCalculation.flat.totalInterest.toLocaleString()}</div>
                      <div>• Total Payable (A) = Principal (P) + Interest (I) = ৳{formulaCalculation.flat.totalPayable.toLocaleString()}</div>
                      <div>• Monthly EMI = Total Payable / Tenure (n) = ৳{formulaCalculation.flat.emi.toLocaleString()}</div>
                    </>
                  )}
                  {selectedFormulaMethod === 'REDUCING_BALANCE' && (
                    <>
                      <div>• Monthly Rate (r) = Annual Rate / 12 / 100 = {(simAnnualRate / 1200).toFixed(6)}</div>
                      <div>• Standard EMI = [P × r × (1 + r)ⁿ] / [(1 + r)ⁿ - 1] = ৳{formulaCalculation.reducing.emi.toLocaleString()}</div>
                      <div>• Total Interest Paid over {simTenureMonths} months = ৳{formulaCalculation.reducing.totalInterest.toLocaleString()}</div>
                    </>
                  )}
                  {selectedFormulaMethod === 'HIRE_PURCHASE_MARKUP' && (
                    <>
                      <div>• Fixed Profit Markup = P × (Markup% / 100) = ৳{formulaCalculation.hirePurchase.markup.toLocaleString()}</div>
                      <div>• Total Hire Purchase Price = P + Markup = ৳{formulaCalculation.hirePurchase.totalPayable.toLocaleString()}</div>
                      <div>• Monthly Installment = Total / n = ৳{formulaCalculation.hirePurchase.emi.toLocaleString()}</div>
                    </>
                  )}
                  {selectedFormulaMethod === 'ZERO_PERCENT' && (
                    <>
                      <div>• Monthly EMI = Principal (P) / Months (n) = ৳{formulaCalculation.zeroPercent.emi.toLocaleString()}</div>
                      <div>• Customer Pays: Down Payment (৳{simDownPayment.toLocaleString()}) + Fee (৳{simProcessingFee.toLocaleString()}) + {simTenureMonths} × ৳{formulaCalculation.zeroPercent.emi.toLocaleString()}</div>
                    </>
                  )}
                  {selectedFormulaMethod === 'MICROFINANCE_WEEKLY' && (
                    <>
                      <div>• Total Weeks = Tenure Months × 4.33 = {formulaCalculation.microfinance.weeks} Weeks</div>
                      <div>• Weekly Installment (সাপ্তাহিক কিস্তি) = ৳{formulaCalculation.microfinance.weeklyEmi.toLocaleString()} / week</div>
                      <div>• Daily Installment (দৈনিক কিস্তি) = ৳{formulaCalculation.microfinance.dailyEmi.toLocaleString()} / day</div>
                    </>
                  )}
                </div>

                {/* Primary Output Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-zinc-800/80 rounded-lg border border-zinc-700">
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                      {language === 'bn' ? 'মাসিক কিস্তি (EMI)' : 'Monthly EMI'}
                    </div>
                    <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                      ৳ {(selectedFormulaMethod === 'REDUCING_BALANCE'
                        ? formulaCalculation.reducing.emi
                        : selectedFormulaMethod === 'ZERO_PERCENT'
                        ? formulaCalculation.zeroPercent.emi
                        : formulaCalculation.flat.emi).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-800/80 rounded-lg border border-zinc-700">
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                      {language === 'bn' ? 'মোট সুদ / লাভ' : 'Total Interest'}
                    </div>
                    <div className="text-lg font-black text-rose-400 font-mono mt-0.5">
                      ৳ {(selectedFormulaMethod === 'REDUCING_BALANCE'
                        ? formulaCalculation.reducing.totalInterest
                        : selectedFormulaMethod === 'ZERO_PERCENT'
                        ? 0
                        : formulaCalculation.flat.totalInterest).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-800/80 rounded-lg border border-zinc-700">
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                      {language === 'bn' ? 'মোট পরিশোধযোগ্য' : 'Total Payable'}
                    </div>
                    <div className="text-lg font-black text-blue-400 font-mono mt-0.5">
                      ৳ {(selectedFormulaMethod === 'REDUCING_BALANCE'
                        ? formulaCalculation.reducing.totalPayable
                        : selectedFormulaMethod === 'ZERO_PERCENT'
                        ? formulaCalculation.zeroPercent.totalPayable
                        : formulaCalculation.flat.totalPayable).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-800/80 rounded-lg border border-zinc-700">
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                      {language === 'bn' ? 'কার্যকর এপিআর' : 'Effective APR'}
                    </div>
                    <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                      {selectedFormulaMethod === 'REDUCING_BALANCE'
                        ? `${formulaCalculation.reducing.effectiveApr}%`
                        : `${formulaCalculation.flat.effectiveApr}%`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Early Settlement & Rebate Insight Box */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>
                      {language === 'bn'
                        ? `আগাম পরিশোধ ও রিবেট হিসাব (Month #${simEarlySettlementMonth} Settlement):`
                        : `Early Payoff & Interest Rebate at Month #${simEarlySettlementMonth}:`}
                    </span>
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400 mt-1">
                    {language === 'bn'
                      ? `গ্রাহক ${simEarlySettlementMonth}-তম মাসে সম্পূর্ণ ঋণ পরিশোধ করলে মোট সুদ ছাড় (Rebate): ৳${formulaCalculation.earlySettlement.interestRebate.toLocaleString()} (সুদের ${formulaCalculation.earlySettlement.savingsPercent}%)`
                      : `Settling in month ${simEarlySettlementMonth} saves ৳${formulaCalculation.earlySettlement.interestRebate.toLocaleString()} interest rebate (${formulaCalculation.earlySettlement.savingsPercent}% savings)`}
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  <div className="text-[10px] uppercase text-zinc-500">Payoff Amount:</div>
                  <div className="text-base">৳ {formulaCalculation.earlySettlement.earlyPayoffAmount.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Amortization Schedule Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-white text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{language === 'bn' ? 'মাসওয়ারি অ্যামোর্টাইজেশন শিডিউল (Month-by-Month Amortization Schedule)' : 'Month-by-Month Loan Amortization Schedule'}</span>
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {language === 'bn'
                    ? 'প্রতি মাসের শুরুর ব্যালেন্স, আসল পরিশোধ অংশ, সুদ অংশ এবং অবশিষ্ট জের'
                    : 'Opening principal balance, EMI breakdown into principal vs interest, and closing balance'}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePrintFormulaAmortization}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'শিডিউল প্রিন্ট' : 'Print Table'}</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-zinc-700 z-10">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'শুরুর জের (Opening)' : 'Opening Balance'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'কিস্তির টাকা (EMI)' : 'Monthly EMI'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'মূল আসল অংশ (Principal)' : 'Principal Paid'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'সুদ অংশ (Interest)' : 'Interest Paid'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'অবশিষ্ট জের (Closing)' : 'Closing Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
                  {formulaCalculation.reducing.schedule.map(row => (
                    <tr key={row.month} className="hover:bg-zinc-50 dark:hover:bg-zinc-850">
                      <td className="py-2 px-3 text-center text-zinc-500 font-bold">M-{row.month}</td>
                      <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300">৳{row.openingBalance.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-bold text-blue-600 dark:text-blue-400">৳{row.emi.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">৳{row.principalPortion.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400">৳{row.interestPortion.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-semibold text-zinc-900 dark:text-white">৳{row.closingBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-bold border-t-2 border-zinc-300 dark:border-zinc-700">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-right">{language === 'bn' ? 'সর্বমোট (TOTALS):' : 'TOTALS:'}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-700 dark:text-blue-300">৳{formulaCalculation.reducing.totalPayable.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-300">৳{formulaCalculation.P.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700 dark:text-rose-300">৳{formulaCalculation.reducing.totalInterest.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono">৳0</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: MONTHLY INSTALLMENT REPORT (কিস্তি কালেকশন রিপোর্ট)               */}
      {/* ========================================================================= */}
      {activeInstallmentSubTab === 'monthly-report' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {language === 'bn' ? 'রিপোর্টের মাস সিলেক্ট করুন:' : 'Select Month:'}
                </label>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={e => setReportMonth(e.target.value)}
                  className="py-1.5 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs">
                {(['ALL', 'PAID', 'PENDING', 'OVERDUE'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setReportStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-semibold ${
                      reportStatusFilter === st
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrintMonthlyReport}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'bn' ? 'মাসিক রিপোর্ট প্রিন্ট করুন' : 'Print Monthly Report'}</span>
            </button>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60">
              <div className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                {language === 'bn' ? 'মোট কিস্তি শিডিউল' : 'Total Scheduled'}
              </div>
              <div className="text-xl font-black text-indigo-900 dark:text-indigo-200 font-mono mt-1">
                {monthlyTotals.totalCount} ({formatCurrency(monthlyTotals.totalDueAmt)})
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {language === 'bn' ? 'আদায়কৃত কিস্তি' : 'Total Collected'}
              </div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1">
                {monthlyTotals.paidCount} ({formatCurrency(monthlyTotals.paidAmt)})
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {language === 'bn' ? 'বকেয়া / অপেক্ষমাণ' : 'Pending Amount'}
              </div>
              <div className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono mt-1">
                {monthlyTotals.pendingCount} ({formatCurrency(monthlyTotals.pendingAmt)})
              </div>
            </div>

            <div className="p-4 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/60">
              <div className="text-xs font-bold text-rose-800 dark:text-rose-300">
                {language === 'bn' ? 'কালেকশন রেট' : 'Collection Rate'}
              </div>
              <div className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono mt-1">
                {monthlyTotals.collectionRate}% ({monthlyTotals.overdueCount} Overdue)
              </div>
            </div>
          </div>

          {/* Tabular Listing */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-zinc-700">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3">{language === 'bn' ? 'চুক্তি নং' : 'Scheme #'}</th>
                    <th className="py-2.5 px-3">{language === 'bn' ? 'গ্রাহকের নাম ও ফোন' : 'Customer & Phone'}</th>
                    <th className="py-2.5 px-3">{language === 'bn' ? 'পণ্য' : 'Product'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'কিস্তি নং' : 'Inst #'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'পরিশোধের তারিখ' : 'Due Date'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'কিস্তির টাকা' : 'EMI Amount'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'অবস্থা' : 'Status'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {monthlySchedulesList.length > 0 ? (
                    monthlySchedulesList.map(({ scheme, schedule }, idx) => {
                      const today = new Date().toISOString().split('T')[0];
                      const isOverdue = schedule.status === 'PENDING' && schedule.dueDate < today;

                      return (
                        <tr key={`${scheme.id}-${schedule.installmentNo}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-850">
                          <td className="py-2.5 px-3 text-center text-zinc-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {scheme.schemeNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-zinc-900 dark:text-white">{scheme.customerName}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{scheme.customerPhone}</div>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-800 dark:text-zinc-200">{scheme.productName}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono font-bold">
                              #{schedule.installmentNo}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-zinc-600 dark:text-zinc-400">
                            {schedule.dueDate}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900 dark:text-white">
                            {formatCurrency(schedule.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {schedule.status === 'PAID' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold rounded text-[10px]">
                                PAID ✓
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold rounded text-[10px]">
                                OVERDUE !
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold rounded text-[10px]">
                                PENDING
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const preset = schedule.status === 'PAID' ? 'RECEIPT' : isOverdue ? 'OVERDUE' : 'UPCOMING';
                                  handleOpenSmsModal(scheme.customerPhone, scheme.customerName, preset, {
                                    productName: scheme.productName,
                                    schemeNumber: scheme.schemeNumber,
                                    installmentNo: schedule.installmentNo,
                                    amount: schedule.amount,
                                    dueDate: schedule.dueDate,
                                  });
                                }}
                                title={language === 'bn' ? 'এসএমএস পাঠান' : 'Send SMS'}
                                className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:hover:bg-amber-900 dark:text-amber-300 rounded cursor-pointer transition-colors"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedScheme(scheme);
                                  if (schedule.status !== 'PAID') {
                                    setCollectingScheduleNo(schedule.installmentNo);
                                  }
                                }}
                                className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded font-semibold text-[11px] cursor-pointer"
                              >
                                {schedule.status === 'PAID' ? 'View' : 'Collect'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-400 text-xs">
                        {language === 'bn' ? 'নির্বাচিত মাসের জন্য কোনো কিস্তি রেকর্ড পাওয়া যায়নি।' : 'No installment schedules found for the selected month.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: ALL SCHEMES LIST (সকল কিস্তি চুক্তি তালিকা)                       */}
      {/* ========================================================================= */}
      {activeInstallmentSubTab === 'schemes' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={language === 'bn' ? 'গ্রাহক, মোবাইল বা চুক্তি নং দিয়ে খুঁজুন...' : 'Search by customer, phone or scheme #...'}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
              />
            </div>

            <div className="text-xs text-zinc-500 font-medium">
              {filteredSchemes.length} {language === 'bn' ? 'টি কিস্তি চুক্তি' : 'Agreements'}
            </div>
          </div>

          {/* Scheme Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchemes.map(scheme => {
              const paidCount = scheme.schedules.filter(s => s.status === 'PAID').length;
              const progressPct = Math.round((paidCount / scheme.totalInstallments) * 100);
              const totalPaidAmt = scheme.schedules.reduce((acc, s) => acc + (s.status === 'PAID' ? s.paidAmount || s.amount : 0), 0);
              const remainingAmt = Math.max(0, scheme.totalPayable - totalPaidAmt);

              return (
                <div
                  key={scheme.id}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5 mb-3">
                      <div>
                        <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {scheme.schemeNumber}
                        </div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm mt-0.5">
                          {scheme.customerName}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">{scheme.customerPhone}</div>
                      </div>
                      <Badge variant={scheme.status === 'COMPLETED' ? 'success' : scheme.status === 'DEFAULTED' ? 'danger' : 'primary'}>
                        {scheme.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 mb-4">
                      <div className="flex justify-between">
                        <span>Product / Item:</span>
                        <strong className="text-zinc-800 dark:text-zinc-200">{scheme.productName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Price:</span>
                        <span className="font-mono">{formatCurrency(scheme.totalPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Down Payment:</span>
                        <span className="font-mono text-emerald-600 font-semibold">{formatCurrency(scheme.downPayment)}</span>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-1">
                        <span>Monthly EMI:</span>
                        <strong className="font-mono text-blue-600 dark:text-blue-400 text-sm">{formatCurrency(scheme.emiAmount)} / mo</strong>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                        <span>Progress: {paidCount}/{scheme.totalInstallments} paid</span>
                        <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">Remaining: {formatCurrency(remainingAmt)}</span>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handlePrintSchemeAgreement(scheme)}
                      className="flex-1 py-1.5 px-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Agreement</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        const pending = scheme.schedules.filter(s => s.status === 'PENDING');
                        const overdue = pending.filter(s => s.dueDate < today);
                        const targetSched = overdue[0] || pending[0];
                        const preset = overdue.length > 0 ? 'OVERDUE' : 'UPCOMING';

                        handleOpenSmsModal(scheme.customerPhone, scheme.customerName, preset, {
                          productName: scheme.productName,
                          schemeNumber: scheme.schemeNumber,
                          installmentNo: targetSched?.installmentNo || 1,
                          amount: targetSched?.amount || scheme.emiAmount,
                          dueDate: targetSched?.dueDate || scheme.startDate,
                        });
                      }}
                      title={language === 'bn' ? 'এসএমএস পাঠান' : 'Send SMS'}
                      className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedScheme(scheme)}
                      className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>View &amp; Collect</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: OVERDUE / DEFAULTERS (খেলাপী কিস্তি তালিকা)                        */}
      {/* ========================================================================= */}
      {activeInstallmentSubTab === 'defaulters' && (
        <div className="space-y-4">
          <div className="bg-rose-50/70 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h3 className="font-bold text-rose-950 dark:text-rose-200 text-xs">
                  {language === 'bn' ? 'খেলাপী কিস্তি ও জরিমানা ট্র্যাকার (Overdue Defaulters)' : 'Overdue Installments & Penalty Management'}
                </h3>
                <p className="text-[11px] text-rose-800 dark:text-rose-300">
                  {language === 'bn'
                    ? `বর্তমানে মোট ${defaulterSchemes.length} টি স্কিমে মেয়াদোত্তীর্ণ কিস্তি রয়েছে`
                    : `Currently ${defaulterSchemes.length} agreements have overdue installments`}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isSendingBulkDefaulterSms || defaulterSchemes.length === 0}
              onClick={handleSendBulkDefaulterSms}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSendingBulkDefaulterSms
                  ? (language === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending Bulk SMS...')
                  : (language === 'bn' ? 'সকল খেলাপীকে বকেয়া SMS পাঠান' : 'Send Bulk SMS to Defaulters')}
              </span>
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="py-2.5 px-3">Scheme #</th>
                  <th className="py-2.5 px-3">Customer &amp; Phone</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Guarantor</th>
                  <th className="py-2.5 px-3 text-center">Overdue Due Dates</th>
                  <th className="py-2.5 px-3 text-right">Pending Amount</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {defaulterSchemes.map(scheme => {
                  const today = new Date().toISOString().split('T')[0];
                  const overdueList = scheme.schedules.filter(s => s.status === 'PENDING' && s.dueDate < today);
                  const overdueTotal = overdueList.reduce((sum, s) => sum + s.amount, 0);

                  return (
                    <tr key={scheme.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850">
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-600">{scheme.schemeNumber}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-zinc-900 dark:text-white">{scheme.customerName}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{scheme.customerPhone}</div>
                      </td>
                      <td className="py-2.5 px-3">{scheme.productName}</td>
                      <td className="py-2.5 px-3 text-[11px] text-zinc-600 dark:text-zinc-400">
                        {scheme.guarantorName ? `${scheme.guarantorName} (${scheme.guarantorPhone})` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-600 font-bold">
                        {overdueList.map(o => o.dueDate).join(', ')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {formatCurrency(overdueTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const todayStr = new Date().toISOString().split('T')[0];
                              const firstOverdue = scheme.schedules.find(s => s.status === 'PENDING' && s.dueDate < todayStr);
                              handleOpenSmsModal(scheme.customerPhone, scheme.customerName, 'OVERDUE', {
                                productName: scheme.productName,
                                schemeNumber: scheme.schemeNumber,
                                installmentNo: firstOverdue?.installmentNo || 1,
                                amount: overdueTotal,
                                dueDate: firstOverdue?.dueDate || todayStr,
                              });
                            }}
                            title={language === 'bn' ? 'বকেয়া তাগাদা SMS পাঠান' : 'Send Overdue Notice SMS'}
                            className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 rounded font-semibold text-xs cursor-pointer transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedScheme(scheme)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs cursor-pointer"
                          >
                            Collect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB: CUSTOMER EMI LEDGER (গ্রাহক কিস্তি লেজার)                          */}
      {/* ========================================================================= */}
      {activeInstallmentSubTab === 'customer-ledger' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {language === 'bn' ? 'গ্রাহক নির্বাচন করুন:' : 'Select Customer:'}
              </label>
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="py-1.5 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrintCustomerLedger}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'bn' ? 'গ্রাহক লেজার প্রিন্ট' : 'Print Customer EMI Statement'}</span>
            </button>
          </div>

          {/* Selected Customer Schemes */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
            {installmentSchemes.filter(s => s.customerId === selectedCustomerId).length > 0 ? (
              <div className="space-y-4">
                {installmentSchemes
                  .filter(s => s.customerId === selectedCustomerId)
                  .map(scheme => (
                    <div key={scheme.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-bold text-zinc-900 dark:text-white text-xs">
                          {scheme.schemeNumber} — {scheme.productName}
                        </div>
                        <Badge variant={scheme.status === 'COMPLETED' ? 'success' : 'primary'}>{scheme.status}</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs font-mono mb-2">
                        <div>Price: {formatCurrency(scheme.totalPrice)}</div>
                        <div>Down: {formatCurrency(scheme.downPayment)}</div>
                        <div>Payable: {formatCurrency(scheme.totalPayable)}</div>
                        <div>EMI: {formatCurrency(scheme.emiAmount)}/mo</div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-400 text-xs">
                {language === 'bn' ? 'এই গ্রাহকের কোনো কিস্তি চুক্তি নেই।' : 'No installment agreements found for this customer.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: NEW SCHEME AGREEMENT CREATOR (নতুন কিস্তি চুক্তি তৈরি)            */}
      {/* ========================================================================= */}
      {activeInstallmentSubTab === 'new-scheme' && (
        <form onSubmit={handleCreateScheme} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>{language === 'bn' ? 'নতুন কিস্তি বিক্রয় চুক্তি তৈরি' : 'Create New Installment Agreement'}</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {language === 'bn'
                  ? 'গ্রাহকের তথ্য, পণ্যের বিবরণ, ডাউন পেমেন্ট এবং শিডিউল জেনারেট করুন'
                  : 'Specify customer, product value, down payment and generate EMI schedule'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveInstallmentSubTab('all-formulas')}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ফর্মুলা সিমুলেটর দেখুন' : 'Open Formula Simulator'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Customer *</label>
              <select
                value={formCustomerId}
                onChange={e => setFormCustomerId(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
                required
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Select Product from Stock</label>
              <select
                value={formProductId}
                onChange={e => handleProductSelect(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
              >
                <option value="">-- Choose Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stock} | ৳{p.salesPrice.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Product Description / Name *</label>
              <input
                type="text"
                value={formProductName}
                onChange={e => setFormProductName(e.target.value)}
                placeholder="e.g. Walton Refrigerator 350L"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Total Product Price (৳) *</label>
              <input
                type="number"
                min="1"
                value={formTotalPrice || ''}
                onChange={e => setFormTotalPrice(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Down Payment (৳)</label>
              <input
                type="number"
                min="0"
                value={formDownPayment || ''}
                onChange={e => setFormDownPayment(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Interest / Markup Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  value={formInterestRate}
                  onChange={e => setFormInterestRate(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Installment Count (Months) *</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formTotalInstallments}
                  onChange={e => setFormTotalInstallments(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Agreement Start Date</label>
              <input
                type="date"
                value={formStartDate}
                onChange={e => setFormStartDate(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Guarantor Name</label>
              <input
                type="text"
                value={formGuarantorName}
                onChange={e => setFormGuarantorName(e.target.value)}
                placeholder="Guarantor full name"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Guarantor Phone</label>
              <input
                type="text"
                value={formGuarantorPhone}
                onChange={e => setFormGuarantorPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Agreement Notes / Terms</label>
              <input
                type="text"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Optional notes or security check details"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
              />
            </div>
          </div>

          {/* Live Summary Calculation Box */}
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Financed Principal</div>
              <div className="text-base font-bold font-mono text-zinc-900 dark:text-white mt-0.5">
                {formatCurrency(principalAmount)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Interest Amount</div>
              <div className="text-base font-bold font-mono text-rose-600 mt-0.5">
                {formatCurrency(interestAmount)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Total Payable</div>
              <div className="text-base font-bold font-mono text-blue-700 dark:text-blue-300 mt-0.5">
                {formatCurrency(totalPayable)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Monthly EMI</div>
              <div className="text-lg font-black font-mono text-emerald-600 mt-0.5">
                {formatCurrency(emiAmount)} / mo
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveInstallmentSubTab('schemes')}
              className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              Confirm &amp; Create Agreement
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* DETAILED SCHEME VIEW & COLLECTION MODAL                                   */}
      {/* ========================================================================= */}
      {selectedScheme && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-850">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
                  <span>{selectedScheme.schemeNumber}</span>
                  <Badge variant={selectedScheme.status === 'COMPLETED' ? 'success' : 'primary'}>{selectedScheme.status}</Badge>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedScheme.customerName} ({selectedScheme.customerPhone}) • {selectedScheme.productName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleOpenSmsModal(selectedScheme.customerPhone, selectedScheme.customerName, 'UPCOMING', {
                      productName: selectedScheme.productName,
                      schemeNumber: selectedScheme.schemeNumber,
                      amount: selectedScheme.emiAmount,
                    })
                  }
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>{language === 'bn' ? 'গ্রাহককে SMS' : 'SMS Customer'}</span>
                </button>

                {selectedScheme.guarantorPhone && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenSmsModal(selectedScheme.guarantorPhone, selectedScheme.guarantorName || 'Guarantor', 'OVERDUE', {
                        productName: selectedScheme.productName,
                        schemeNumber: selectedScheme.schemeNumber,
                        amount: selectedScheme.emiAmount,
                      })
                    }
                    className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>{language === 'bn' ? 'জামিনদারকে SMS' : 'SMS Guarantor'}</span>
                  </button>
                )}

                {canUserDelete(currentUser, 'sales') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          language === 'bn'
                            ? `আপনি কি নিশ্চিত যে কিস্তি স্কিম "${selectedScheme.schemeNumber}" মুছে ফেলতে চান?`
                            : `Are you sure you want to delete installment scheme "${selectedScheme.schemeNumber}"?`
                        )
                      ) {
                        deleteInstallmentScheme(selectedScheme.id);
                        setSelectedScheme(null);
                        setCollectingScheduleNo(null);
                      }
                    }}
                    title={language === 'bn' ? 'স্কিম মুছুন (Delete Scheme)' : 'Delete Scheme'}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedScheme(null);
                    setCollectingScheduleNo(null);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Summary box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg text-xs font-mono">
                <div>Price: <strong>{formatCurrency(selectedScheme.totalPrice)}</strong></div>
                <div>Down: <strong>{formatCurrency(selectedScheme.downPayment)}</strong></div>
                <div>Payable: <strong>{formatCurrency(selectedScheme.totalPayable)}</strong></div>
                <div>EMI: <strong className="text-blue-600">{formatCurrency(selectedScheme.emiAmount)}/mo</strong></div>
              </div>

              {/* Multi-User Audit Trail */}
              <MultiUserAuditTrail
                createdBy={selectedScheme.createdBy}
                completedBy={selectedScheme.completedBy}
                updatedBy={selectedScheme.updatedBy}
                contributors={selectedScheme.contributors}
                createdAt={selectedScheme.createdAt}
                displayMode="detailed"
              />

              {/* Schedules Table */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300">
                    <tr>
                      <th className="py-2 px-3 text-center">#</th>
                      <th className="py-2 px-3">Due Date</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Payment Info</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
                    {selectedScheme.schedules.map(sched => {
                      const today = new Date().toISOString().split('T')[0];
                      const isOverdue = sched.status === 'PENDING' && sched.dueDate < today;

                      return (
                        <tr key={sched.installmentNo} className="hover:bg-zinc-50 dark:hover:bg-zinc-850">
                          <td className="py-2 px-3 text-center font-bold">#{sched.installmentNo}</td>
                          <td className="py-2 px-3">{sched.dueDate}</td>
                          <td className="py-2 px-3 text-right font-bold">{formatCurrency(sched.amount)}</td>
                          <td className="py-2 px-3 text-center">
                            {sched.status === 'PAID' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                PAID ✓
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                                OVERDUE !
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded font-bold text-[10px]">
                                PENDING
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center text-[10px] text-zinc-500 font-sans">
                            {sched.status === 'PAID' ? `${sched.paidDate} (${sched.paymentMethod || 'Cash'})` : '-'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {sched.status === 'PAID' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const totalPaidSoFar = selectedScheme.schedules.filter(s => s.status === 'PAID').reduce((sum, s) => sum + (s.paidAmount || s.amount), 0);
                                  const remainingDue = selectedScheme.schedules.filter(s => s.status !== 'PAID').reduce((sum, s) => sum + s.amount, 0);
                                  const nextPending = selectedScheme.schedules.find(s => s.status === 'PENDING');

                                  openPrintModal({
                                    type: 'EMI_RECEIPT',
                                    title: `EMI Receipt #${sched.installmentNo}`,
                                    data: {
                                      receiptNo: sched.receiptVoucherNo || `REC-${Date.now().toString().slice(-4)}`,
                                      schemeNumber: selectedScheme.schemeNumber,
                                      customerName: selectedScheme.customerName,
                                      customerPhone: selectedScheme.customerPhone,
                                      customerAddress: (selectedScheme as any).customerAddress || (selectedScheme as any).address || '',
                                      productName: selectedScheme.productName,
                                      installmentNo: sched.installmentNo,
                                      totalInstallments: selectedScheme.totalInstallments,
                                      amount: sched.amount,
                                      penalty: sched.penalty || 0,
                                      totalCollected: (sched.paidAmount || sched.amount) + (sched.penalty || 0),
                                      totalSchemeAmount: selectedScheme.totalPayable,
                                      totalPrice: selectedScheme.totalPrice,
                                      downPayment: selectedScheme.downPayment,
                                      totalPaidSoFar,
                                      remainingDue,
                                      nextDueDate: nextPending?.dueDate || null,
                                      walletName: 'Main Cash Drawer',
                                      paymentMethod: sched.paymentMethod || 'Cash',
                                      date: sched.paidDate || today,
                                    },
                                  });
                                }}
                                className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded font-semibold text-[10px] cursor-pointer"
                              >
                                Print Receipt
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setCollectingScheduleNo(sched.installmentNo)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[10px] cursor-pointer"
                              >
                                Collect
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sub-Collection Form */}
              {collectingScheduleNo !== null && (
                <form onSubmit={handleConfirmCollection} className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <div className="font-bold text-indigo-950 dark:text-indigo-200 text-xs flex justify-between items-center">
                    <span>Collect Installment #{collectingScheduleNo}</span>
                    <button type="button" onClick={() => setCollectingScheduleNo(null)} className="text-zinc-400 hover:text-zinc-600 text-xs">
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-0.5">Late Penalty (৳)</label>
                      <input
                        type="number"
                        min="0"
                        value={penaltyAmount || ''}
                        onChange={e => setPenaltyAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full p-2 bg-white dark:bg-zinc-800 border rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-0.5">Deposit To Wallet *</label>
                      <select
                        value={collectionWalletId}
                        onChange={e => setCollectionWalletId(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-800 border rounded text-xs"
                      >
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-0.5">Payment Method *</label>
                      <select
                        value={collectionPaymentMethod}
                        onChange={e => setCollectionPaymentMethod(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-800 border rounded text-xs"
                      >
                        <option value="Cash">Cash</option>
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-indigo-200 dark:border-indigo-900/60">
                    <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        id="sendCollectionSms"
                        checked={sendCollectionSms}
                        onChange={e => setSendCollectionSms(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="sendCollectionSms" className="cursor-pointer font-medium flex items-center gap-1 text-[11px]">
                        <Send className="w-3 h-3 text-indigo-600" />
                        <span>{language === 'bn' ? 'গ্রাহককে অটো SMS রসিদ পাঠান' : 'Send instant SMS receipt to customer'}</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Confirm Collection ({formatCurrency(selectedScheme.emiAmount + (penaltyAmount || 0))})
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="px-5 py-3 border-t bg-zinc-50 dark:bg-zinc-850 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedScheme(null)}
                className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK EMI / INSTALLMENT SMS MODAL                                         */}
      {/* ========================================================================= */}
      {smsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                  {language === 'bn' ? 'কিস্তি এসএমএস প্রেরণ (SMS Notification)' : 'Send Installment SMS Notice'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSmsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSendSms} className="p-5 space-y-4">
              {/* Recipient Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                    {language === 'bn' ? 'গ্রাহকের নাম:' : 'Customer Name:'}
                  </label>
                  <input
                    type="text"
                    value={smsRecipientName}
                    onChange={e => setSmsRecipientName(e.target.value)}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                    {language === 'bn' ? 'মোবাইল নম্বর *:' : 'Phone Number *:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={smsRecipientPhone}
                    onChange={e => setSmsRecipientPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              {/* Template Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {language === 'bn' ? 'মেসেজ টেমপ্লেট নির্বাচন করুন:' : 'Select Message Template:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                  {[
                    { id: 'OVERDUE', labelBn: '🚨 বকেয়া/খেলাপী তাগাদা', labelEn: '🚨 Overdue Notice' },
                    { id: 'UPCOMING', labelBn: '📅 আসন্ন কিস্তি স্মারক', labelEn: '📅 Upcoming Reminder' },
                    { id: 'RECEIPT', labelBn: '💳 কিস্তি জমা রসিদ', labelEn: '💳 Collection Receipt' },
                    { id: 'AGREEMENT', labelBn: '📄 চুক্তি তথ্য', labelEn: '📄 Agreement Info' },
                    { id: 'CUSTOM', labelBn: '✍️ কাস্টম মেসেজ', labelEn: '✍️ Custom Message' },
                  ].map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        const preset = tpl.id as any;
                        setSmsPresetType(preset);
                        setSmsMessage(
                          buildEmiSmsMessage(preset, {
                            customerName: smsRecipientName || 'Customer',
                            productName: 'পণ্য',
                            storeName: companySettings.name,
                            storePhone: companySettings.phone,
                          })
                        );
                      }}
                      className={`p-2 rounded-lg font-bold border transition-colors text-left cursor-pointer ${
                        smsPresetType === tpl.id
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {language === 'bn' ? tpl.labelBn : tpl.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Body Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {language === 'bn' ? 'এসএমএস টেক্সট (সম্পাদনাযোগ্য):' : 'SMS Message (Editable):'}
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {smsMessage.length} chars ({Math.ceil(smsMessage.length / 160) || 1} SMS)
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs leading-relaxed font-sans"
                />
              </div>

              {/* Gateway Info Note */}
              <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-900 dark:text-blue-300 flex items-center justify-between">
                <span>
                  {language === 'bn'
                    ? `গেটওয়ে: ${smsConfig.provider ? smsConfig.provider.toUpperCase() : 'সিমুলেটেড'} (${smsConfig.enabled ? 'সক্রিয় ✓' : 'সিমুলেশন মোড'})`
                    : `Gateway: ${smsConfig.provider ? smsConfig.provider.toUpperCase() : 'Simulated'} (${smsConfig.enabled ? 'Active ✓' : 'Simulation Mode'})`}
                </span>
                <span className="font-mono font-bold">
                  {smsConfig.apiKey ? 'API Key OK' : 'Dev Simulation'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSmsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingSms}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSendingSms
                      ? language === 'bn'
                        ? 'পাঠানো হচ্ছে...'
                        : 'Sending...'
                      : language === 'bn'
                      ? 'এসএমএস পাঠান'
                      : 'Send SMS Now'}
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
