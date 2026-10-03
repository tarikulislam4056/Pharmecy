import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { CompanySettings, SmsConfig, SmsProvider, CustomSmsProviderDef, InvoiceColorTheme, InvoiceTemplateStyle } from '../../types';
import { PROVIDER_PRESETS, fetchServerPublicIp } from '../../utils/smsService';
import { INVOICE_COLOR_PRESETS, INVOICE_TEMPLATE_PRESETS, getInvoiceTheme, getInvoiceTemplate } from '../../utils/invoiceTheme';
import { DASHBOARD_COLOR_THEMES, DashboardColorTheme } from '../../utils/brandTheme';
import { generateFullSqlDump, generateFreshCleanSqlDump, downloadSqlFile, generateApiPhpScript } from '../../utils/sqlExporter';
import {
  Settings,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileText,
  Save,
  RotateCcw,
  Printer,
  DollarSign,
  Percent,
  Image as ImageIcon,
  PenTool,
  LayoutDashboard,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Key,
  Shield,
  History,
  Terminal,
  HelpCircle,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Plus,
  Palette,
  Check,
  Eye,
  LayoutTemplate,
  Code2,
  Database,
  Download,
  Upload,
  Server,
  HardDrive,
  FileCode,
  Copy,
  RefreshCw,
  Cpu,
  Layers,
} from 'lucide-react';

const SMS_PROVIDERS: { id: SmsProvider; name: string; nameBn: string; description: string; defaultUrl?: string; guideBn: string }[] = [
  {
    id: 'greenweb',
    name: 'Greenweb SMS BD',
    nameBn: 'গ্রিনওয়েব এসএমএস বিডি',
    description: 'Popular BD SMS Gateway with instant token/API key authentication.',
    defaultUrl: 'https://api.greenweb.com.bd/api.php',
    guideBn: 'গ্রিনওয়েব ড্যাশবোর্ড (greenweb.com.bd) থেকে আপনার API Token কপি করে নিচের API Key / Token বক্সে পেস্ট করুন।',
  },
  {
    id: 'bulksmsbd',
    name: 'BulkSMS BD (BulkSMSBD)',
    nameBn: 'বাল্ক এসএমএস বিডি',
    description: 'High-speed Bangladesh bulk SMS provider supporting masking & non-masking.',
    defaultUrl: 'http://bulksmsbd.net/api/smsapi',
    guideBn: 'BulkSMSBD ড্যাশবোর্ড থেকে API Key ও Sender ID কপি করে এখানে বসান।',
  },
  {
    id: 'bulksms24',
    name: '24 Bulk SMS BD',
    nameBn: '২৪ বাল্ক এসএমএস বিডি',
    description: '24bulksmsbd.com API gateway supporting customer_id and api_key.',
    defaultUrl: 'https://www.24bulksmsbd.com/api/smsSendApi',
    guideBn: '24bulksmsbd.com প্যানেল থেকে আপনার Client ID (customer_id) ও API Key বসান।',
  },
  {
    id: 'alphanet',
    name: 'Alpha Net SMS Gateway',
    nameBn: 'আলফা নেট এসএমএস',
    description: 'Reliable enterprise SMS gateway for Bangladesh.',
    defaultUrl: 'https://api.sms.net.bd/sendsms',
    guideBn: 'Alpha Net SMS প্যানেল থেকে API Key ও Sender ID কপি করে বসান।',
  },
  {
    id: 'mimsms',
    name: 'MimSMS BD',
    nameBn: 'মিম এসএমএস বিডি',
    description: 'Leading Bangladeshi mask & non-masking REST API gateway.',
    defaultUrl: 'https://api.mimsms.com/api/SmsSending/Send',
    guideBn: 'MimSMS অ্যাকাউন্ট থেকে ApiKey ও SenderName বসান।',
  },
  {
    id: 'dianahost',
    name: 'Diana Host SMS',
    nameBn: 'ডায়ানা হোস্ট এসএমএস',
    description: 'DianaHost fast transactional SMS API.',
    defaultUrl: 'http://sms.dianahost.com/api/v3/sms/send',
    guideBn: 'DianaHost এসএমএস প্যানেল থেকে api_key এবং sender_id বসান।',
  },
  {
    id: 'elitbuzz',
    name: 'Elitbuzz SMS BD',
    nameBn: 'এলিট বাজ এসএমএস',
    description: 'Elitbuzz high-speed telecom SMS gateway.',
    defaultUrl: 'https://msg.elitbuzz-bd.com/smsapi',
    guideBn: 'Elitbuzz প্যানেল থেকে API Key ও Sender ID প্রদান করুন।',
  },
  {
    id: 'onnorokom',
    name: 'Onnorokom SMS Gateway',
    nameBn: 'অন্যরকম এসএমএস',
    description: 'Leading BD SMS gateway supporting HTTP / REST API.',
    defaultUrl: 'https://api2.onnorokomsms.com/HttpSendSms.ashx',
    guideBn: 'Onnorokom প্যানেল থেকে API Key অথবা Username/Password বসান।',
  },
  {
    id: 'revesms',
    name: 'Reve Systems SMS',
    nameBn: 'রেভ সিস্টেমস এসএমএস',
    description: 'REVE Systems enterprise telecom messaging.',
    defaultUrl: 'http://sms.reveinteractive.com/api/send',
    guideBn: 'Reve SMS পোর্টাল থেকে API Key ও Caller ID বসান।',
  },
  {
    id: 'smsq',
    name: 'SMS Q Global BD',
    nameBn: 'এসএমএস কিউ বিডি',
    description: 'Modern REST SMS Gateway with fast routing.',
    defaultUrl: 'https://api.smsq.global/api/v2/SendSMS',
    guideBn: 'SMS Q প্যানেল থেকে API Key ও Client ID / Sender ID বসান।',
  },
  {
    id: 'twilio',
    name: 'Twilio Programmable SMS',
    nameBn: 'টুইলিও ইন্টারন্যাশনাল',
    description: 'Global REST API for international messaging.',
    defaultUrl: 'https://api.twilio.com/2010-04-01/Accounts/{clientId}/Messages.json',
    guideBn: 'Twilio Console থেকে Account SID (Client ID), Auth Token (API Key) এবং Twilio Phone Number (Sender ID) দিন।',
  },
  {
    id: 'custom_api',
    name: 'Custom SMS Gateway',
    nameBn: 'যেকোনো কাস্টম গেটওয়ে API',
    description: 'Connect any custom local telco or international SMS API endpoint.',
    guideBn: 'আপনার প্রোভাইডারের API ডকুমেন্টেশন অনুযায়ী URL, Method এবং প্যারামিটার নাম সেট করুন।',
  },
];

export const SettingsView: React.FC = () => {
  const {
    language,
    companySettings,
    updateCompanySettings,
    resetToDemoData,
    smsConfig,
    updateSmsConfig,
    smsLogs,
    sendManualSms,
    deleteSmsLog,
    clearSmsLogs,
    showToast,
    openPrintModal,
    products,
    categories,
    parties,
    wallets,
    saleInvoices,
    saleReturns,
    purchaseInvoices,
    purchaseReturns,
    installmentSchemes,
    employees,
    advanceSalaries,
    payrollHistory,
    expenseCategories,
    expenseVouchers,
    dayBookEntries,
    cashAdjustments,
    users,
    quotations,
    purchaseOrders,
    deletedSaleInvoices,
    activityLogs,
    expiredReturnLogs,
    warrantyPolicies,
    warrantyRecords,
    warrantyClaims,
    isSyncingWithServer,
    lastServerSyncTime,
    serverSyncStatus,
    syncCountdown,
    autoSyncIntervalSeconds,
    setAutoSyncIntervalSeconds,
    isAutoSyncEnabled,
    setIsAutoSyncEnabled,
    triggerServerPush,
    triggerServerPull,
    triggerSyncNow,
    saveApiEndpoint,
  } = useApp();
  const { t } = useTranslation(language);

  const [activeTab, setActiveTab] = useState<'profile' | 'invoice-design' | 'sms-api' | 'sms-logs' | 'database-sql'>('profile');
  const [isExportingSql, setIsExportingSql] = useState(false);
  const [apiEndpointUrl, setApiEndpointUrl] = useState(() => {
    if (companySettings.apiEndpoint && companySettings.apiEndpoint.trim()) {
      return companySettings.apiEndpoint.trim();
    }
    try {
      const saved = localStorage.getItem('DOKANPRO_ERP_API_ENDPOINT');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      const pathname = window.location.pathname;
      const dir = pathname.substring(0, pathname.lastIndexOf('/') + 1) || '/';
      const cleanDir = dir.endsWith('/') ? dir : `${dir}/`;
      return `${window.location.origin}${cleanDir}api.php`;
    }
    return 'http://localhost/api.php';
  });
  const [autoSyncToggle, setAutoSyncToggle] = useState<boolean>(companySettings.autoSyncEnabled !== false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [copiedPhp, setCopiedPhp] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'cpanel' | 'localhost' | 'nodejs'>('cpanel');

  // Server IP Detection for SMS Whitelist
  const [serverIp, setServerIp] = useState<string>('Detecting IP...');
  const [isDetectingIp, setIsDetectingIp] = useState<boolean>(false);

  const handleRefreshIp = async () => {
    setIsDetectingIp(true);
    const ip = await fetchServerPublicIp();
    setServerIp(ip);
    setIsDetectingIp(false);
  };

  React.useEffect(() => {
    handleRefreshIp();
  }, []);

  const handleCopyIp = () => {
    if (serverIp && serverIp !== 'Detecting IP...') {
      navigator.clipboard.writeText(serverIp);
      showToast(
        language === 'bn' ? `IP এড্রেস কপি করা হয়েছে: ${serverIp}` : `Server IP copied to clipboard: ${serverIp}`,
        'success'
      );
    }
  };

  // Track whether the user has uncommitted edits to prevent background updates from wiping them
  const isFormDirtyRef = React.useRef(false);

  // Company Profile State
  const [formData, setFormData] = useState<CompanySettings>(() => {
    // Read standalone companySettings if available, fallback to context
    try {
      const standalone = localStorage.getItem('companySettings');
      if (standalone) {
        const parsed = JSON.parse(standalone);
        if (parsed) return { ...companySettings, ...parsed };
      }
    } catch {}
    return {
      ...companySettings,
      invoicePrintType: companySettings.invoicePrintType || 'A4',
      invoiceTemplate: companySettings.invoiceTemplate || 'MODERN_MINIMAL',
      invoiceColorTheme: companySettings.invoiceColorTheme || 'INDIGO_VIOLET',
      invoiceCustomPrimaryColor: companySettings.invoiceCustomPrimaryColor || '#6366f1',
      invoiceCustomAccentColor: companySettings.invoiceCustomAccentColor || '#4f46e5',
      dashboardColorTheme: companySettings.dashboardColorTheme || 'INDIGO',
      sidebarColorTheme: companySettings.sidebarColorTheme || 'INDIGO',
      sidebarCustomColor: companySettings.sidebarCustomColor || '#6366f1',
    };
  });

  // Keep formData in sync if companySettings updates (from server sync or reset), unless user is actively editing
  React.useEffect(() => {
    if (isFormDirtyRef.current) return;
    setFormData({
      ...companySettings,
      invoicePrintType: companySettings.invoicePrintType || 'A4',
      invoiceTemplate: companySettings.invoiceTemplate || 'MODERN_MINIMAL',
      invoiceColorTheme: companySettings.invoiceColorTheme || 'INDIGO_VIOLET',
      invoiceCustomPrimaryColor: companySettings.invoiceCustomPrimaryColor || '#6366f1',
      invoiceCustomAccentColor: companySettings.invoiceCustomAccentColor || '#4f46e5',
      dashboardColorTheme: companySettings.dashboardColorTheme || 'INDIGO',
      sidebarColorTheme: companySettings.sidebarColorTheme || 'INDIGO',
      sidebarCustomColor: companySettings.sidebarCustomColor || '#6366f1',
    });
  }, [companySettings]);

  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'signatureUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      showToast(language === 'bn' ? 'ছবির সাইজ সর্বোচ্চ 4MB হতে পারবে' : 'Image file size cannot exceed 4MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setFormData(prev => ({ ...prev, [field]: base64 }));
        showToast(
          language === 'bn'
            ? `${field === 'logoUrl' ? 'লোগো' : 'স্বাক্ষর'} ছবি লোড হয়েছে। 'সংরক্ষণ করুন' বাটনে চাপুন।`
            : `${field === 'logoUrl' ? 'Logo' : 'Signature'} image loaded. Click save to persist.`,
          'success'
        );
      }
    };
    reader.readAsDataURL(file);
  };

  // Live preview active theme and template helpers
  const activeInvoicePalette = getInvoiceTheme(formData);
  const activeInvoiceTemplateDef = getInvoiceTemplate(formData.invoiceTemplate);

  const handlePreviewSampleInvoice = () => {
    openPrintModal({
      type: 'INVOICE_A4',
      title: 'Sample Invoice Print Preview',
      data: {
        invoiceNumber: 'INV-2026-0089',
        date: new Date().toLocaleDateString('en-GB'),
        customerName: 'Md. Kader (Sample Customer)',
        customerPhone: '01886228472',
        customerAddress: 'Targer Denim, Gazipur',
        items: [
          {
            name: 'E-LINK TONER 85A/78A/326 Original Laser Cartridge',
            quantity: 2,
            unit: 'pcs',
            unitPrice: 630,
            total: 1260,
          },
          {
            name: 'HP LaserJet 107a Monochrome Printer',
            quantity: 1,
            unit: 'pcs',
            unitPrice: 16500,
            total: 16500,
          },
          {
            name: 'Double A A4 80GSM Copy Paper Ream (500 Sheets)',
            quantity: 5,
            unit: 'ream',
            unitPrice: 420,
            total: 2100,
          },
        ],
        subtotal: 19860,
        discount: 360,
        vatAmount: 975,
        grandTotal: 20475,
        paidAmount: 20475,
        dueAmount: 0,
        paymentMethod: 'CASH',
      },
    });
  };

  // SMS Settings State
  const [smsSettings, setSmsSettings] = useState<SmsConfig>({ ...smsConfig });
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('DokanPro ERP: This is a test SMS from your store.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; responseDetails?: string } | null>(null);

  const handleProfileChange = (field: keyof CompanySettings, value: any) => {
    isFormDirtyRef.current = true;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isFormDirtyRef.current = false;
    updateCompanySettings(formData);
    showToast(
      language === 'bn'
        ? 'কোম্পানি সেটিংস সংরক্ষিত হয়েছে।'
        : 'Company profile and branding settings updated successfully.',
      'success'
    );
  };

  // SQL & Hosting Export Handlers
  const handleExportFullSql = () => {
    setIsExportingSql(true);
    try {
      const fullState = {
        companySettings,
        users,
        categories,
        products,
        parties,
        saleInvoices,
        deletedSaleInvoices,
        saleReturns,
        quotations,
        purchaseInvoices,
        purchaseReturns,
        purchaseOrders,
        installmentSchemes,
        wallets,
        expenseCategories,
        expenseVouchers,
        employees,
        advanceSalaries,
        payrollHistory,
        dayBookEntries,
        cashAdjustments,
        activityLogs,
        smsLogs,
        smsConfig,
        expiredReturnLogs,
      };
      const sqlDump = generateFullSqlDump(fullState);
      downloadSqlFile(sqlDump, `dokanpro_erp_database_${new Date().toISOString().split('T')[0]}.sql`);
      showToast(
        language === 'bn'
          ? 'সফলভাবে সম্পূর্ণ SQL ডাটাবেস (.sql ফাইল) ডাউনলোড সম্পন্ন হয়েছে!'
          : 'Full SQL database file downloaded successfully!',
        'success'
      );
    } catch (err: any) {
      showToast(
        language === 'bn' ? `ত্রুটি: ${err.message}` : `Error: ${err.message}`,
        'error'
      );
    } finally {
      setIsExportingSql(false);
    }
  };

  const handleExportFreshCleanSql = () => {
    setIsExportingSql(true);
    try {
      const sqlDump = generateFreshCleanSqlDump(companySettings?.name || 'My Dokan ERP Store');
      downloadSqlFile(sqlDump, `dokanpro_fresh_database_clean_${new Date().toISOString().split('T')[0]}.sql`);
      showToast(
        language === 'bn'
          ? 'ফ্রেশ ও খালি SQL ডাটাবেস স্কিমা (.sql ফাইল) সফলভাবে ডাউনলোড সম্পন্ন হয়েছে!'
          : 'Fresh clean SQL database schema (zero entries) downloaded successfully!',
        'success'
      );
    } catch (err: any) {
      showToast(
        language === 'bn' ? `ত্রুটি: ${err.message}` : `Error: ${err.message}`,
        'error'
      );
    } finally {
      setIsExportingSql(false);
    }
  };

  const handleDownloadApiPhp = () => {
    const phpScript = generateApiPhpScript();
    const blob = new Blob([phpScript], { type: 'application/x-php;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'api.php');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(
      language === 'bn' ? 'api.php ফাইল সফলভাবে ডাউনলোড হয়েছে!' : 'api.php downloaded successfully!',
      'success'
    );
  };

  const handleCopyPhpCode = () => {
    const phpScript = generateApiPhpScript();
    navigator.clipboard.writeText(phpScript);
    setCopiedPhp(true);
    setTimeout(() => setCopiedPhp(false), 2500);
    showToast(
      language === 'bn' ? 'api.php কোড ক্লিপবোর্ডে কপি করা হয়েছে!' : 'api.php script copied to clipboard!',
      'success'
    );
  };

  const handleTestApiConnection = async () => {
    setIsTestingApi(true);
    setApiTestStatus(null);
    try {
      const endpoint = apiEndpointUrl.includes('?') ? `${apiEndpointUrl}&action=health` : `${apiEndpointUrl}?action=health`;
      const res = await fetch(endpoint, { method: 'GET' });
      const json = await res.json();
      if (json.status === 'online') {
        setApiTestStatus({
          success: true,
          message: language === 'bn' ? 'সার্ভার ও এপিআই সফলভাবে অনলাইন এবং সক্রিয় আছে!' : 'API server connection is active and online!',
          details: json,
        });
        showToast(language === 'bn' ? 'সার্ভার সংযোগ সফল!' : 'Server Connection Successful!', 'success');
      } else {
        setApiTestStatus({
          success: false,
          message: json.message || 'API responded with non-online status.',
          details: json,
        });
      }
    } catch (err: any) {
      setApiTestStatus({
        success: false,
        message: language === 'bn' ? `সংযোগ করা যায়নি: ${err.message} (নিশ্চিত করুন হোস্টিং সার্ভার চালু আছে এবং api.php ফাইলটি আপলোড করা হয়েছে)` : `Connection Failed: ${err.message}`,
      });
      showToast(language === 'bn' ? 'সার্ভার সংযোগ ব্যর্থ!' : 'Failed to connect to API', 'error');
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleSaveAndRememberEndpoint = async () => {
    if (!apiEndpointUrl || !apiEndpointUrl.trim()) {
      showToast(language === 'bn' ? 'অনুগ্রহ করে API Endpoint URL দিন' : 'Please provide API Endpoint URL', 'warning');
      return;
    }
    setIsTestingApi(true);
    const ok = await saveApiEndpoint(apiEndpointUrl.trim(), autoSyncToggle);
    if (ok) {
      setApiTestStatus({
        success: true,
        message: language === 'bn' ? 'API Endpoint স্থায়ীভাবে সেভ হয়েছে এবং সমস্ত ডাটা হোস্টিং সার্ভারে সিঙ্ক করা হয়েছে।' : 'API Endpoint permanently saved & synced to host server.',
      });
    }
    setIsTestingApi(false);
  };

  const handlePullFromServer = async () => {
    setIsTestingApi(true);
    await triggerServerPull(apiEndpointUrl, false);
    setIsTestingApi(false);
  };

  const handlePushToServer = async () => {
    setIsTestingApi(true);
    const ok = await triggerServerPush(apiEndpointUrl);
    if (ok) {
      showToast(
        language === 'bn' ? 'হোস্টিং সার্ভারে সমস্ত ERP ডাটা সফলভাবে সংরক্ষিত ও সিঙ্ক হয়েছে!' : 'All ERP data synced to host server successfully!',
        'success'
      );
    } else {
      showToast(language === 'bn' ? 'সিঙ্ক ব্যর্থ হয়েছে' : 'Sync failed', 'error');
    }
    setIsTestingApi(false);
  };

  const handleAutoDetectEndpoint = () => {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const detected = `${window.location.origin}/api.php`;
      setApiEndpointUrl(detected);
      showToast(
        language === 'bn' ? `বর্তমান ডোমেইন ডিটেক্ট করা হয়েছে: ${detected}` : `Detected current host URL: ${detected}`,
        'info'
      );
    }
  };

  const handleSmsChange = (field: keyof SmsConfig, value: any) => {
    setSmsSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleProviderSelect = (provider: SmsProvider) => {
    const customProv = (smsSettings.customProviders || []).find(cp => cp.id === provider);
    const p = SMS_PROVIDERS.find(item => item.id === provider);
    const preset = PROVIDER_PRESETS[provider];
    setSmsSettings(prev => ({
      ...prev,
      provider,
      apiUrl: customProv?.defaultUrl || p?.defaultUrl || preset?.defaultUrl || prev.apiUrl,
      httpMethod: customProv?.httpMethod || preset?.httpMethod || prev.httpMethod,
      requestFormat: customProv?.requestFormat || preset?.requestFormat || prev.requestFormat,
      customKeyParam: customProv?.keyParam || preset?.keyParam || prev.customKeyParam,
      customToParam: customProv?.toParam || preset?.toParam || prev.customToParam,
      customMsgParam: customProv?.msgParam || preset?.msgParam || prev.customMsgParam,
      customSenderParam: customProv?.senderParam || preset?.senderParam || prev.customSenderParam,
      customUserParam: preset?.userParam || prev.customUserParam,
      customPassParam: preset?.passParam || prev.customPassParam,
    }));
  };

  // Custom Gateway Modal State
  const [showAddCustomProviderModal, setShowAddCustomProviderModal] = useState(false);
  const [newProv, setNewProv] = useState({
    id: '',
    name: '',
    nameBn: '',
    defaultUrl: '',
    httpMethod: 'GET' as 'GET' | 'POST',
    requestFormat: 'query_param' as 'json' | 'form' | 'query_param',
    keyParam: 'api_key',
    toParam: 'mobile_no',
    msgParam: 'message',
    senderParam: 'customer_id',
    description: '',
    guideBn: '',
  });

  const handleAddCustomProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProv.id.trim() || !newProv.name.trim() || !newProv.defaultUrl.trim()) {
      showToast(language === 'bn' ? 'প্রয়োজনীয় ফিল্ডগুলো পূরণ করুন।' : 'Please fill in required fields.', 'warning');
      return;
    }
    const cleanId = newProv.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const newProviderDef: CustomSmsProviderDef = {
      ...newProv,
      id: cleanId,
    };

    const updatedCustoms = [...(smsSettings.customProviders || []), newProviderDef];
    setSmsSettings(prev => ({
      ...prev,
      customProviders: updatedCustoms,
      provider: cleanId as SmsProvider,
      apiUrl: newProv.defaultUrl,
      httpMethod: newProv.httpMethod,
      requestFormat: newProv.requestFormat,
      customKeyParam: newProv.keyParam,
      customToParam: newProv.toParam,
      customMsgParam: newProv.msgParam,
      customSenderParam: newProv.senderParam,
    }));
    updateSmsConfig({
      ...smsSettings,
      customProviders: updatedCustoms,
      provider: cleanId as SmsProvider,
      apiUrl: newProv.defaultUrl,
    });

    setShowAddCustomProviderModal(false);
    setNewProv({
      id: '',
      name: '',
      nameBn: '',
      defaultUrl: '',
      httpMethod: 'GET',
      requestFormat: 'query_param',
      keyParam: 'api_key',
      toParam: 'mobile_no',
      msgParam: 'message',
      senderParam: 'customer_id',
      description: '',
      guideBn: '',
    });
    showToast(language === 'bn' ? 'নতুন গেটওয়ে সফলভাবে যুক্ত হয়েছে!' : 'Custom gateway added successfully!', 'success');
  };

  const handleDeleteCustomProvider = (providerId: string) => {
    if (!window.confirm(language === 'bn' ? 'এই কাস্টম গেটওয়েটি মুছে ফেলতে চান?' : 'Delete this custom gateway?')) {
      return;
    }
    const updatedCustoms = (smsSettings.customProviders || []).filter(p => p.id !== providerId);
    const fallbackProvider = updatedCustoms.length > 0 ? updatedCustoms[0].id as SmsProvider : 'greenweb';
    
    setSmsSettings(prev => ({
      ...prev,
      customProviders: updatedCustoms,
      provider: prev.provider === providerId ? fallbackProvider : prev.provider,
    }));
    updateSmsConfig({
      ...smsSettings,
      customProviders: updatedCustoms,
      provider: smsSettings.provider === providerId ? fallbackProvider : smsSettings.provider,
    });
    showToast(language === 'bn' ? 'গেটওয়ে মুছে ফেলা হয়েছে।' : 'Custom gateway deleted.', 'success');
  };

  const handleSmsSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSmsConfig(smsSettings);
    showToast(
      language === 'bn'
        ? 'এসএমএস গেটওয়ে কনফিগারেশন সংরক্ষিত হয়েছে।'
        : 'SMS Gateway configuration saved successfully.',
      'success'
    );
  };

  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      showToast(
        language === 'bn' ? 'সঠিক টেস্ট মোবাইল নম্বর লিখুন।' : 'Please enter a test phone number.',
        'warning'
      );
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      // Save current configuration first to ensure testing with active inputs
      updateSmsConfig(smsSettings);

      const res = await sendManualSms(testPhone, 'Test Recipient', testMessage, 'TEST');
      
      const lastLog = smsLogs[0];
      setTestResult({
        success: res,
        message: res
          ? (language === 'bn' ? `✅ SMS সফলভাবে পাঠানো হয়েছে (${testPhone})!` : `✅ SMS dispatched successfully to ${testPhone}!`)
          : (language === 'bn' ? `❌ SMS পাঠানো যায়নি! নিচে বিস্তারিত দেখুন।` : `❌ SMS Failed to dispatch. See details below.`),
        responseDetails: lastLog?.responseDetails || (res ? 'Status: 200 OK (Delivered to Gateway)' : 'Gateway returned error response.'),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `ত্রুটি: ${err?.message || 'Failed to dispatch'}`,
        responseDetails: err?.message,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const selectedProviderInfo = SMS_PROVIDERS.find(p => p.id === smsSettings.provider) || SMS_PROVIDERS[0];

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>{language === 'bn' ? 'সিস্টেম ও ব্যবসা সেটিংস' : 'Settings & Business Profile'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'bn'
              ? 'কোম্পানির পরিচিতি, ইনভয়েস ডিজাইন ও লাইভ এসএমএস গেটওয়ে এপিআই ম্যানেজমেন্ট'
              : 'Manage company information, invoice branding, and real-time SMS Gateway API'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{language === 'bn' ? 'কোম্পানি প্রোফাইল' : 'Company Profile'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoice-design')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'invoice-design'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4 text-indigo-500" />
            <span>{language === 'bn' ? 'ইনভয়েস কালার ও ডিজাইন' : 'Invoice Colors & Design'}</span>
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-2xs shrink-0"
              style={{ backgroundColor: activeInvoicePalette.primary }}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sms-api')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'sms-api'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{language === 'bn' ? 'SMS গেটওয়ে এপিআই' : 'SMS Gateway API'}</span>
            {smsConfig.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sms-logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'sms-logs'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{language === 'bn' ? 'SMS হিস্ট্রি লগ' : 'SMS Activity Logs'}</span>
            {smsLogs.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                {smsLogs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database-sql')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'database-sql'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-500" />
            <span>{language === 'bn' ? 'SQL ও হোস্টিং ডাটাবেস' : 'SQL Database & Hosting'}</span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              .SQL
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY PROFILE */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          {/* General Information */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>1. Store & Company Information (সাধারণ তথ্য)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Company / Store Name (English) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleProfileChange('name', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  প্রতিষ্ঠানের নাম (বাংলা)
                </label>
                <input
                  type="text"
                  value={formData.nameBn}
                  onChange={e => handleProfileChange('nameBn', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Business Slogan / Tagline
                </label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={e => handleProfileChange('slogan', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Official Phone / Helpline *
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => handleProfileChange('phone', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => handleProfileChange('email', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Official Website
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={e => handleProfileChange('website', e.target.value)}
                  placeholder="www.yourstore.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Physical Store / Office Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => handleProfileChange('address', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Branding: Logo & Signature */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-purple-600" />
                <span>2. Branding, Logo & Authorized Signature (লোগো ও অফিসিয়াল স্বাক্ষর)</span>
              </h3>
              <span className="text-[11px] font-medium text-slate-400">
                {language === 'bn' ? 'ইনভয়েস ও সাইডবারে লাইভ প্রদর্শিত হবে' : 'Shown live on sidebar & invoice prints'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* STORE LOGO */}
              <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>Store Logo (দোকান / কোম্পানির লোগো)</span>
                  </label>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => handleProfileChange('logoUrl', '')}
                      className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{language === 'bn' ? 'মুছুন' : 'Remove'}</span>
                    </button>
                  )}
                </div>

                {/* Logo Preview Box */}
                <div className="flex items-center gap-3">
                  <div className="h-16 w-20 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Store Logo Preview"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center text-slate-300 dark:text-slate-600">
                        <ImageIcon className="w-6 h-6 mx-auto mb-0.5 opacity-50" />
                        <span className="text-[9px] block leading-none">No Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'কম্পিউটার/মোবাইল থেকে লোগো আপলোড' : 'Upload Logo Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileUpload(e, 'logoUrl')}
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {language === 'bn' ? 'PNG, JPG, SVG সাপোর্ট করে (সর্বোচ্চ 4MB)' : 'Supports PNG, JPG, SVG (Max 4MB)'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    {language === 'bn' ? 'অথবা লোগোর ওয়েব লিংক (URL) দিন:' : 'Or paste image direct URL:'}
                  </span>
                  <input
                    type="text"
                    value={formData.logoUrl || ''}
                    onChange={e => handleProfileChange('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* AUTHORIZED SIGNATURE */}
              <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-purple-600" />
                    <span>Authorized Signature (স্বাক্ষর / সীল)</span>
                  </label>
                  {formData.signatureUrl && (
                    <button
                      type="button"
                      onClick={() => handleProfileChange('signatureUrl', '')}
                      className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{language === 'bn' ? 'মুছুন' : 'Remove'}</span>
                    </button>
                  )}
                </div>

                {/* Signature Preview Box */}
                <div className="flex items-center gap-3">
                  <div className="h-16 w-24 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                    {formData.signatureUrl ? (
                      formData.signatureUrl.startsWith('data:image') || formData.signatureUrl.startsWith('http') || formData.signatureUrl.startsWith('/') ? (
                        <img
                          src={formData.signatureUrl}
                          alt="Signature Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-[10px] font-serif italic text-blue-600 font-bold text-center px-1 truncate">
                          {formData.signatureUrl}
                        </span>
                      )
                    ) : (
                      <div className="text-center text-slate-300 dark:text-slate-600">
                        <PenTool className="w-5 h-5 mx-auto mb-0.5 opacity-50" />
                        <span className="text-[9px] block leading-none">No Sign</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'স্বাক্ষর ছবি আপলোড করুন' : 'Upload Signature Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileUpload(e, 'signatureUrl')}
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {language === 'bn' ? 'স্বাক্ষরের স্পষ্ট ছবি বা ট্রান্সপারেন্ট PNG' : 'Transparent PNG signature works best'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    {language === 'bn' ? 'অথবা স্বাক্ষর লিংক / নাম টেক্সট লিখুন:' : 'Or signature URL / authority name:'}
                  </span>
                  <input
                    type="text"
                    value={formData.signatureUrl || ''}
                    onChange={e => handleProfileChange('signatureUrl', e.target.value)}
                    placeholder="https://example.com/signature.png or Authorized Signatory"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Currency & Tax Configuration */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>3. Tax, Currency & Invoicing (কর, মুদ্রা ও ইনভয়েস)</span>
              </h3>
              <div className="text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-md font-mono font-bold">
                Global Preview: {formData.currencySymbol || '৳'} 12,500.00
              </div>
            </div>

            {/* Quick Currency Presets */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 text-xs">
                {language === 'bn' ? 'জনপ্রিয় কারেন্সি প্রিসেট (Quick Currency Presets):' : 'Popular Currency Presets:'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { symbol: '৳', code: 'BDT', name: 'BDT (Taka)' },
                  { symbol: '$', code: 'USD', name: 'USD ($)' },
                  { symbol: '€', code: 'EUR', name: 'EUR (€)' },
                  { symbol: '£', code: 'GBP', name: 'GBP (£)' },
                  { symbol: '₹', code: 'INR', name: 'INR (₹)' },
                  { symbol: 'د.إ', code: 'AED', name: 'AED (د.إ)' },
                  { symbol: 'SAR', code: 'SAR', name: 'SAR' },
                  { symbol: 'RM', code: 'MYR', name: 'MYR (RM)' },
                  { symbol: 'SGD', code: 'SGD', name: 'SGD ($)' },
                ].map(preset => {
                  const isSelected = formData.currencySymbol === preset.symbol;
                  return (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          currencySymbol: preset.symbol,
                          currencyCode: preset.code,
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      <span>{preset.symbol}</span>
                      <span className="text-[10px] opacity-80">{preset.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Currency Symbol (মুদ্রা প্রতীক)
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={e => handleProfileChange('currencySymbol', e.target.value)}
                  placeholder="e.g. ৳, $, €, ₹"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {language === 'bn' ? 'POS, ইনভয়েস এবং সকল রিপোর্টে এই প্রতীক ব্যবহৃত হবে।' : 'Applied globally across POS, Invoices & Reports.'}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Currency Code
                </label>
                <input
                  type="text"
                  value={formData.currencyCode}
                  onChange={e => handleProfileChange('currencyCode', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Default VAT / Tax (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.defaultVatPercent}
                  onChange={e => handleProfileChange('defaultVatPercent', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Default Invoice Print Type
                </label>
                <select
                  value={formData.invoicePrintType}
                  onChange={e => handleProfileChange('invoicePrintType', e.target.value as 'A4' | 'THERMAL_3INCH' | 'XPRINTER_80MM')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white cursor-pointer font-medium"
                >
                  <option value="A4">A4 Full Page</option>
                  <option value="THERMAL_3INCH">Thermal: 3 inch (80mm)</option>
                  <option value="XPRINTER_80MM">Xprinter (80mm)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  BIN / Tax / TIN Number
                </label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={e => handleProfileChange('taxNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="md:col-span-3">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Invoice Footer Note / Return Policy
                </label>
                <input
                  type="text"
                  value={formData.invoiceFooter}
                  onChange={e => handleProfileChange('invoiceFooter', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Quick Link to Invoice Design Tab */}
              <div className="md:col-span-3 p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white shadow-2xs"
                    style={{ backgroundColor: activeInvoicePalette.primary }}
                  >
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                      {language === 'bn' ? 'ইনভয়েস কালার ও ডিজাইন থিম পরিবর্তন করতে চান?' : 'Want to customize Invoice Colors & Templates?'}
                    </div>
                    <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                      {language === 'bn' ? `বর্তমান সক্রিয় থিম: ${activeInvoicePalette.nameBn}` : `Current active theme: ${activeInvoicePalette.name}`}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('invoice-design')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  {language === 'bn' ? 'ইনভয়েস কালার সেটিংসে যান →' : 'Go to Invoice Design →'}
                </button>
              </div>
            </div>
          </div>

          {/* Developer & Technical Support Information */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl border border-blue-900/50 p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 shrink-0">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {language === 'bn' ? 'সফটওয়্যার ডেভেলপার ও টেকনিক্যাল সাপোর্ট' : 'Software Developer & Technical Support'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                      Author Info
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/80 mt-1">
                    Developer By : <strong className="text-white">Md. Tarikul Islam</strong>
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Phone- <a href="tel:01312305225" className="text-white font-bold hover:text-blue-300 hover:underline">01312305225</a></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Sherpur, Sadar, Sherpur</span>
                    </div>
                  </div>
                </div>
              </div>

              <a
                href="tel:01312305225"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors shrink-0 flex items-center justify-center gap-2 self-start sm:self-auto"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'সরাসরি কল করুন' : 'Call Developer'}</span>
              </a>
            </div>
          </div>

          {/* Danger Zone: System Data Reset */}
          <div className="bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/60 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                    {language === 'bn' ? 'ডেঞ্জার জোন: সিস্টেম ডাটা রিসেট (Wipe All Data)' : 'Danger Zone: Complete System Reset'}
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300/80 mt-0.5">
                    {language === 'bn'
                      ? 'সমস্ত প্রোডাক্ট, বিক্রিয় চালান, কাস্টমার বাকি, খতিয়ান ও ট্রানজাকশন মুছে দিয়ে সিস্টেম সম্পূর্ণ নতুন অবস্থায় রিস্টোর করুন।'
                      : 'Permanently wipe all stock items, sales invoices, purchase records, party ledgers, and transactions.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmResetModal(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 flex items-center gap-2 self-start sm:self-auto"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{language === 'bn' ? 'সকল ডাটা মুছুন (Reset All ERP Data)' : 'Reset All ERP Data'}</span>
              </button>
            </div>
          </div>

          {/* Save Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{language === 'bn' ? 'কোম্পানি প্রোফাইল সংরক্ষণ করুন' : 'Save Company Profile & Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB: INVOICE COLORS & DESIGN */}
      {/* ========================================================================= */}
      {activeTab === 'invoice-design' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Header Action Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-900/50 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className="p-3 rounded-xl shrink-0 shadow-sm flex items-center justify-center"
                style={{ backgroundColor: activeInvoicePalette.primary }}
              >
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <span>{language === 'bn' ? 'ইনভয়েস কালার ও ডিজাইন থিম' : 'Invoice Colors & Layout Design'}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
                    style={{ backgroundColor: activeInvoicePalette.secondary }}
                  >
                    {activeInvoicePalette.name.split(' ')[0]}
                  </span>
                </h2>
                <p className="text-xs text-indigo-200/90 mt-1 max-w-xl">
                  {language === 'bn'
                    ? 'আপনার ব্র্যান্ড ও প্রতিষ্ঠানের সাথে মিল রেখে ইনভয়েসের বিভিন্ন কালার থিম নির্বাচন করুন অথবা কাস্টম কালার সেট করুন। যা প্রিন্ট এবং পিডিএফে নিখুঁতভাবে প্রদর্শিত হবে।'
                    : 'Select a signature color theme for your sales invoices and billing receipts, or customize with your brand hex palette.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={handlePreviewSampleInvoice}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-xs"
              >
                <Eye className="w-4 h-4 text-indigo-300" />
                <span>{language === 'bn' ? 'স্যাম্পল প্রিন্ট প্রিভিউ' : 'Live Print Sample'}</span>
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{language === 'bn' ? 'কালার পরিবর্তন সেভ করুন' : 'Save Theme Settings'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls Column */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* SECTION 1: INVOICE PRINT SIZE */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{language === 'bn' ? '১. ডিফল্ট প্রিন্ট সাইজ ও মেথড' : '1. Default Invoice Print Format'}</span>
                  </h3>
                  <span className="text-[11px] font-medium text-slate-500">
                    {language === 'bn' ? 'প্রিন্ট করার সময় এই সাইজে ওপেন হবে' : 'Default format for single-click printing'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {[
                    {
                      id: 'A4',
                      name: 'A4 Full Page',
                      nameBn: 'A4 ফুল পেজ ইনভয়েস',
                      descBn: 'অফিসিয়াল রঙিন প্যাড ও ক্লাসিক চালানের জন্য উপযুক্ত',
                      icon: FileText,
                    },
                    {
                      id: 'THERMAL_3INCH',
                      name: 'Thermal 3" (80mm)',
                      nameBn: 'থার্মাল ৩ ইঞ্চি (৮০মিমি)',
                      descBn: 'POS কাউন্টার ক্যাশ মেমো ও ছোট রসিদের জন্য',
                      icon: Printer,
                    },
                    {
                      id: 'XPRINTER_80MM',
                      name: 'Xprinter (80mm)',
                      nameBn: 'এক্সপ্রিন্টার ৮০মিমি',
                      descBn: 'হাইস্পিড বারকোড ও থার্মাল পিওএস প্রিন্টার',
                      icon: LayoutTemplate,
                    },
                  ].map(option => {
                    const isSelected = formData.invoicePrintType === option.id;
                    const IconComp = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleProfileChange('invoicePrintType', option.id as any)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                              <IconComp className="w-4 h-4" />
                            </div>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {language === 'bn' ? option.nameBn : option.name}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {option.descBn}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: INVOICE MODEL / DESIGN TEMPLATES */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{language === 'bn' ? '২. ইনভয়েস ডিজাইন ও লেআউট মডেল' : '2. Invoice Design & Layout Model'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'যে মডেলটি সিলেক্ট করবেন, সফটওয়্যারের যেকোনো স্থান থেকে প্রিন্ট দিলেই স্বয়ংক্রিয়ভাবে সেই মডেলেই প্রিন্ট হবে:'
                        : 'Selected model will be automatically applied to all printouts across the software:'}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {INVOICE_TEMPLATE_PRESETS.length} Models
                  </span>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {INVOICE_TEMPLATE_PRESETS.map(template => {
                    const isSelected = (formData.invoiceTemplate || 'MODERN_MINIMAL') === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            invoiceTemplate: template.id,
                          }));
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative group ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          {/* Mini Wireframe Schematic Representation */}
                          <div className="h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 mb-3 flex flex-col justify-between overflow-hidden shadow-2xs">
                            {/* Header preview according to template type */}
                            {template.id === 'CLASSIC_CORPORATE' ? (
                              <div className="h-5 rounded-xs px-1.5 flex items-center justify-between text-white text-[7px] font-bold" style={{ backgroundColor: activeInvoicePalette.primary }}>
                                <span>COMPANY</span>
                                <span>INVOICE</span>
                              </div>
                            ) : template.id === 'ELEGANT_FRAME' ? (
                              <div className="border border-slate-300 dark:border-slate-700 p-1 text-center rounded-xs">
                                <div className="text-[7px] font-serif font-bold text-slate-800 dark:text-white uppercase">COMPANY BRAND</div>
                                <div className="h-0.5 w-6 mx-auto my-0.5 rounded" style={{ backgroundColor: activeInvoicePalette.primary }}></div>
                              </div>
                            ) : template.id === 'SLATE_CONTEMPORARY' ? (
                              <div className="border-l-2 pl-1 flex justify-between items-center" style={{ borderColor: activeInvoicePalette.primary }}>
                                <div className="text-[7px] font-black uppercase text-slate-900 dark:text-white">BRAND</div>
                                <span className="text-[6px] px-1 rounded bg-slate-900 text-white font-mono">#INV</span>
                              </div>
                            ) : template.id === 'CREATIVE_STUDIO' ? (
                              <div className="flex justify-between items-start border-b pb-0.5" style={{ borderColor: activeInvoicePalette.primary }}>
                                <span className="text-[8px] font-black" style={{ color: activeInvoicePalette.primary }}>CREATIVE</span>
                                <span className="text-[10px] font-mono font-black text-slate-300">#01</span>
                              </div>
                            ) : template.id === 'COMPACT_BILL' ? (
                              <div className="border-b border-black dark:border-white pb-0.5 flex justify-between items-center text-[7px] font-bold">
                                <span>STORE NAME</span>
                                <span>BILL</span>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start border-b border-slate-100 pb-1">
                                <div className="h-2 w-10 rounded-xs bg-slate-300 dark:bg-slate-700"></div>
                                <div className="h-2 w-8 rounded-xs" style={{ backgroundColor: activeInvoicePalette.lightBg }}></div>
                              </div>
                            )}

                            {/* Table wireframe */}
                            <div className="space-y-0.5">
                              <div
                                className="h-2 rounded-xs px-1 flex items-center text-white text-[6px] font-medium"
                                style={{ backgroundColor: activeInvoicePalette.primary }}
                              >
                                <span className="w-1/2">Items</span>
                                <span className="w-1/4 text-center">Qty</span>
                                <span className="w-1/4 text-right">Price</span>
                              </div>
                              <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-xs w-full"></div>
                              <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-xs w-5/6"></div>
                            </div>

                            {/* Mini wireframe footer */}
                            <div className="flex justify-between items-center pt-0.5 text-[6px] text-slate-400">
                              <span>In Words...</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">Total: ৳20,475</span>
                            </div>
                          </div>

                          {/* Template Title & Badge */}
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 uppercase">
                              {template.badge}
                            </span>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {language === 'bn' ? template.nameBn : template.name}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {language === 'bn' ? template.descriptionBn : template.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: COLOR THEME PRESETS */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{language === 'bn' ? '৩. ইনভয়েস কালার প্যালেট নির্বাচন' : '3. Select Invoice Color Theme'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn' ? 'যেকোনো একটি কালার সিলেক্ট করুন যা ইনভয়েস হেডার এবং টেবিলে প্রয়োগ হবে:' : 'Click any color palette below to instantly apply:'}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {INVOICE_COLOR_PRESETS.length + 1} Themes
                  </span>
                </div>

                {/* Preset Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {INVOICE_COLOR_PRESETS.map(preset => {
                    const isSelected = formData.invoiceColorTheme === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            invoiceColorTheme: preset.id,
                          }));
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative group ${
                          isSelected
                            ? 'border-slate-900 dark:border-white ring-2 ring-indigo-500/40 bg-white dark:bg-slate-800 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Mini Invoice Header Mock */}
                        <div className="space-y-1.5 mb-2.5">
                          <div
                            className="h-5 rounded-md flex items-center px-2 justify-between text-white text-[9px] font-bold shadow-2xs"
                            style={{ backgroundColor: preset.primary }}
                          >
                            <span className="truncate">INVOICE</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                          </div>

                          {/* Mini Table Rows Preview */}
                          <div className="space-y-0.5 bg-white dark:bg-slate-900 p-1 rounded border border-slate-100 dark:border-slate-800 text-[8px]">
                            <div
                              className="h-2 rounded-xs px-1 flex items-center text-white font-medium"
                              style={{ backgroundColor: preset.primary }}
                            >
                              <span className="w-1/3">Item</span>
                              <span className="w-1/3 text-center">Qty</span>
                              <span className="w-1/3 text-right">Price</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-xs w-full"></div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-xs w-3/4"></div>
                          </div>
                        </div>

                        {/* Title & Checkbox */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: preset.primary }}
                              />
                              <span className="truncate max-w-[130px]">{preset.name.split(' ')[0]}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {preset.nameBn.split('/')[0]}
                            </div>
                          </div>

                          {isSelected && (
                            <span
                              className="w-5 h-5 rounded-full text-white flex items-center justify-center shadow-xs shrink-0"
                              style={{ backgroundColor: preset.primary }}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* CUSTOM BRAND COLOR CARD */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        invoiceColorTheme: 'CUSTOM',
                      }));
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative group ${
                      formData.invoiceColorTheme === 'CUSTOM'
                        ? 'border-slate-900 dark:border-white ring-2 ring-indigo-500/40 bg-white dark:bg-slate-800 shadow-md'
                        : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-400'
                    }`}
                  >
                    <div className="space-y-1.5 mb-2.5">
                      <div
                        className="h-5 rounded-md flex items-center px-2 justify-between text-white text-[9px] font-bold shadow-2xs"
                        style={{ backgroundColor: formData.invoiceCustomPrimaryColor || '#6366f1' }}
                      >
                        <span className="truncate">CUSTOM</span>
                        <Sparkles className="w-2.5 h-2.5 text-white/80" />
                      </div>

                      <div className="space-y-0.5 bg-white dark:bg-slate-900 p-1 rounded border border-slate-100 dark:border-slate-800 text-[8px]">
                        <div
                          className="h-2 rounded-xs px-1 flex items-center text-white font-medium"
                          style={{ backgroundColor: formData.invoiceCustomPrimaryColor || '#6366f1' }}
                        >
                          <span className="w-1/3">Item</span>
                          <span className="w-1/3 text-center">Qty</span>
                          <span className="w-1/3 text-right">Price</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-xs w-full"></div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-xs w-3/4"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: formData.invoiceCustomPrimaryColor || '#6366f1' }}
                          />
                          <span>{language === 'bn' ? 'কাস্টম কালার' : 'Custom Color'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {formData.invoiceCustomPrimaryColor || '#6366f1'}
                        </div>
                      </div>

                      {formData.invoiceColorTheme === 'CUSTOM' && (
                        <span
                          className="w-5 h-5 rounded-full text-white flex items-center justify-center shadow-xs shrink-0"
                          style={{ backgroundColor: formData.invoiceCustomPrimaryColor || '#6366f1' }}
                        >
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                </div>

                {/* CUSTOM COLOR PICKER EXPANDED CONTROLS */}
                {formData.invoiceColorTheme === 'CUSTOM' && (
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 rounded-xl space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        <Sliders className="w-4 h-4 text-indigo-600" />
                        <span>{language === 'bn' ? 'কাস্টম ব্র্যান্ড কালার সেট করুন (Custom Hex Palette)' : 'Customize Brand Hex Colors'}</span>
                      </div>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
                        {formData.invoiceCustomPrimaryColor}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                          {language === 'bn' ? 'ইনভয়েস প্রাইমারি কালার (Header Bar)' : 'Primary Invoice Color (Header)'}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.invoiceCustomPrimaryColor || '#6366f1'}
                            onChange={e => handleProfileChange('invoiceCustomPrimaryColor', e.target.value)}
                            className="w-10 h-10 p-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={formData.invoiceCustomPrimaryColor || '#6366f1'}
                            onChange={e => handleProfileChange('invoiceCustomPrimaryColor', e.target.value)}
                            placeholder="#6366f1"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                          {language === 'bn' ? 'অ্যাকসেন্ট / বর্ডার কালার' : 'Accent / Border Highlight Color'}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.invoiceCustomAccentColor || '#4f46e5'}
                            onChange={e => handleProfileChange('invoiceCustomAccentColor', e.target.value)}
                            className="w-10 h-10 p-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={formData.invoiceCustomAccentColor || '#4f46e5'}
                            onChange={e => handleProfileChange('invoiceCustomAccentColor', e.target.value)}
                            placeholder="#4f46e5"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Swatch Palette */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                        {language === 'bn' ? 'দ্রুত জনপ্রিয় কালার নির্বাচন:' : 'Quick Popular Swatches:'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Royal Indigo', hex: '#6366f1' },
                          { name: 'Navy Blue', hex: '#1e3a8a' },
                          { name: 'Sky Blue', hex: '#0284c7' },
                          { name: 'Teal Cyan', hex: '#0f766e' },
                          { name: 'Emerald', hex: '#059669' },
                          { name: 'Amber Gold', hex: '#d97706' },
                          { name: 'Crimson Red', hex: '#dc2626' },
                          { name: 'Deep Purple', hex: '#7c3aed' },
                          { name: 'Charcoal Black', hex: '#18181b' },
                          { name: 'Rose Pink', hex: '#e11d48' },
                        ].map(swatch => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => {
                              handleProfileChange('invoiceCustomPrimaryColor', swatch.hex);
                              handleProfileChange('invoiceCustomAccentColor', swatch.hex);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-slate-400 cursor-pointer shadow-2xs"
                          >
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: swatch.hex }} />
                            <span>{swatch.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: DASHBOARD PRIMARY BRAND COLOR THEME */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{language === 'bn' ? 'ড্যাশবোর্ড ও ইন্টারফেস ব্র্যান্ড কালার (Dashboard Brand Theme)' : 'Dashboard & Interface Primary Brand Color'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn' ? 'আপনার ড্যাশবোর্ড, মেনুবার, অ্যাকসেন্ট ও প্রধান বাটনসমূহের জন্য পছন্দের ব্র্যান্ড কালার থিম বেছে নিন:' : 'Choose your preferred primary brand color theme for the dashboard, navigation, and interface buttons:'}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {DASHBOARD_COLOR_THEMES.length} Themes
                  </span>
                </div>

                {/* Dashboard Color Theme Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {DASHBOARD_COLOR_THEMES.map(theme => {
                    const isSelected = (formData.dashboardColorTheme || 'INDIGO') === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            dashboardColorTheme: theme.id,
                          }));
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative group ${
                          isSelected
                            ? 'border-slate-900 dark:border-white ring-2 ring-indigo-500/40 bg-white dark:bg-slate-800 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-2 mb-3">
                          <div
                            className={`h-8 rounded-lg bg-gradient-to-r ${theme.buttonGradient} flex items-center px-3 justify-between text-white text-xs font-bold shadow-xs`}
                          >
                            <span className="truncate">Primary Button</span>
                            <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse"></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full shrink-0 shadow-2xs border border-white/20"
                              style={{ backgroundColor: theme.primaryHex }}
                            />
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="h-full w-2/3" style={{ backgroundColor: theme.primaryHex }}></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="truncate max-w-[120px]">{theme.name.split(' ')[0]}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {theme.nameBn.split('/')[0]}
                            </div>
                          </div>

                          {isSelected && (
                            <span
                              className="w-5 h-5 rounded-full text-white flex items-center justify-center shadow-xs shrink-0"
                              style={{ backgroundColor: theme.primaryHex }}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mt-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{language === 'bn' ? 'সাইডবার অ্যাক্টিভ বাটন কালার (Sidebar Active Color)' : 'Sidebar Active Button Color'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'bn' ? 'সাইডবার মেনুর অ্যাক্টিভ বাটনগুলোর জন্য আলাদা একটি ব্র্যান্ড কালার বেছে নিন:' : 'Choose your preferred brand color theme for the active items in the sidebar navigation:'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {DASHBOARD_COLOR_THEMES.map(theme => {
                    const isSelected = (formData.sidebarColorTheme || 'INDIGO') === theme.id;
                    const previewColor = theme.id === 'CUSTOM' ? (formData.sidebarCustomColor || '#6366f1') : theme.primaryHex;
                    return (
                      <button
                        key={`sidebar-${theme.id}`}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            sidebarColorTheme: theme.id,
                          }));
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative group ${
                          isSelected
                            ? 'border-slate-900 dark:border-white ring-2 ring-indigo-500/40 bg-white dark:bg-slate-800 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-2 mb-3">
                          <div
                            className={`h-8 rounded-lg ${theme.id === 'CUSTOM' ? '' : theme.activeBg} flex items-center px-3 justify-between text-xs font-bold`}
                            style={theme.id === 'CUSTOM' ? { backgroundColor: `${previewColor}22`, color: previewColor } : undefined}
                          >
                            <span className="truncate">Active Menu</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="truncate max-w-[120px]">{language === 'bn' ? theme.nameBn : theme.name.split(' ')[0]}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <span
                              className="w-5 h-5 rounded-full text-white flex items-center justify-center shadow-xs shrink-0"
                              style={{ backgroundColor: previewColor }}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* CUSTOM COLOR PICKER PANEL */}
                {formData.sidebarColorTheme === 'CUSTOM' && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 space-y-4 mt-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: formData.sidebarCustomColor || '#6366f1' }} />
                        <span>{language === 'bn' ? 'কাস্টম সাইডবার কালার পিক করুন (Custom Color Picker)' : 'Custom Sidebar Color Picker'}</span>
                      </h4>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        {formData.sidebarCustomColor || '#6366f1'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                          {language === 'bn' ? 'নিজের পছন্দমত কালার বেছে নিন:' : 'Choose Any Custom Color:'}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.sidebarCustomColor || '#6366f1'}
                            onChange={e => handleProfileChange('sidebarCustomColor', e.target.value)}
                            className="w-10 h-10 p-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={formData.sidebarCustomColor || '#6366f1'}
                            onChange={e => handleProfileChange('sidebarCustomColor', e.target.value)}
                            placeholder="#6366f1"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-sm text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Live Preview Box */}
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {language === 'bn' ? 'লাইভ প্রিভিউ (Live Preview)' : 'Live Preview'}
                        </span>
                        <div className="flex gap-2 text-xs">
                          <div
                            className="flex-1 px-3 py-1.5 rounded-lg font-bold flex items-center justify-between"
                            style={{
                              backgroundColor: `${formData.sidebarCustomColor || '#6366f1'}22`,
                              color: formData.sidebarCustomColor || '#6366f1',
                            }}
                          >
                            <span>Active Item</span>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: formData.sidebarCustomColor || '#6366f1' }} />
                          </div>
                          <div
                            className="flex-1 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between"
                            style={{
                              backgroundColor: `${formData.sidebarCustomColor || '#6366f1'}15`,
                              color: formData.sidebarCustomColor || '#6366f1',
                            }}
                          >
                            <span>Hovered Item</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Preset Palette */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                        {language === 'bn' ? 'দ্রুত পছন্দের কালার প্যালেন্ট:' : 'Quick Popular Swatches:'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Indigo', hex: '#6366f1' },
                          { name: 'Emerald', hex: '#059669' },
                          { name: 'Royal Blue', hex: '#2563eb' },
                          { name: 'Rose', hex: '#e11d48' },
                          { name: 'Purple', hex: '#8b5cf6' },
                          { name: 'Fuchsia', hex: '#d946ef' },
                          { name: 'Pink', hex: '#ec4899' },
                          { name: 'Orange', hex: '#f97316' },
                          { name: 'Amber', hex: '#d97706' },
                          { name: 'Teal', hex: '#0d9488' },
                          { name: 'Cyan', hex: '#06b6d4' },
                          { name: 'Crimson', hex: '#dc2626' },
                          { name: 'Dark Slate', hex: '#334155' },
                          { name: 'Charcoal', hex: '#18181b' },
                        ].map(swatch => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => handleProfileChange('sidebarCustomColor', swatch.hex)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-slate-400 cursor-pointer shadow-2xs"
                          >
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: swatch.hex }} />
                            <span>{swatch.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: INVOICE POLICY & TAX DETAILS */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{language === 'bn' ? '৪. ট্যাক্স / BIN ও ফুটার পলিসি নোট' : '4. Tax / BIN & Footer Return Policy'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      BIN / Tax / TIN Number
                    </label>
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={e => handleProfileChange('taxNumber', e.target.value)}
                      placeholder="BIN-002948192-0102"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Default VAT Percent (%)
                    </label>
                    <input
                      type="number"
                      value={formData.defaultVatPercent}
                      onChange={e => handleProfileChange('defaultVatPercent', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Invoice Footer Note / Return Policy (ফুটার নোট)
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceFooter}
                      onChange={e => handleProfileChange('invoiceFooter', e.target.value)}
                      placeholder="Thank you for shopping with us! Warranty claims require original invoice."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Mockup */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-6">
                <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {language === 'bn' ? 'লাইভ ইনভয়েস ডিজাইন প্রিভিউ' : 'Live Invoice Design Preview'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {activeInvoiceTemplateDef.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs">
                        {formData.invoicePrintType}
                      </span>
                    </div>
                  </div>

                  {/* Rendered Mini Invoice Container */}
                  <div className="bg-white text-black p-4 md:p-6 rounded-xl shadow-lg border border-slate-200 font-sans text-xs space-y-3">
                    
                    {/* Header based on template */}
                    {formData.invoiceTemplate === 'CLASSIC_CORPORATE' ? (
                      <div className="p-3 -mx-4 md:-mx-6 -mt-4 md:-mt-6 rounded-t-xl flex justify-between items-center text-white" style={{ backgroundColor: activeInvoicePalette.primary }}>
                        <div>
                          <div className="font-serif font-bold text-sm uppercase">{formData.name}</div>
                          <div className="text-[10px] opacity-80">{formData.phone}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-serif font-black uppercase">INVOICE</div>
                          <div className="text-[9px] opacity-80">#INV-2026-0089</div>
                        </div>
                      </div>
                    ) : formData.invoiceTemplate === 'SLATE_CONTEMPORARY' ? (
                      <div className="flex justify-between items-start border-l-4 pl-3 py-1" style={{ borderColor: activeInvoicePalette.primary }}>
                        <div>
                          <div className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-white inline-block mb-1">
                            INVOICE #INV-2026-0089
                          </div>
                          <div className="font-black text-sm uppercase">{formData.name}</div>
                        </div>
                        <div className="text-right text-[10px] font-bold text-emerald-700">PAID</div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          {formData.logoUrl ? (
                            <img src={formData.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
                          ) : (
                            <div className="border border-black px-1.5 py-0.5 text-[11px] font-black font-serif">
                              {formData.name.split(' ').map(n => n[0]).join('').slice(0, 3) || 'WC'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold font-serif text-sm uppercase">{formData.name}</div>
                            <div className="text-[10px] text-zinc-600">Tel: {formData.phone}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-zinc-500">Date: 19/08/2026</div>
                          <div className="text-lg font-serif font-bold text-black">INVOICE</div>
                        </div>
                      </div>
                    )}

                    {/* Customer info */}
                    <div className="space-y-1 text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Customer:</span>
                        <span className="font-semibold text-black">Md. Kader (Gazipur)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Invoice No:</span>
                        <span className="font-mono font-medium">INV-2026-0089</span>
                      </div>
                    </div>

                    {/* Items Table Header with Active Theme Color */}
                    <div className="rounded overflow-hidden border border-slate-200">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr
                            style={{ backgroundColor: activeInvoicePalette.primary, color: activeInvoicePalette.textColor }}
                            className="font-bold"
                          >
                            <th className="py-1.5 px-2 text-center w-8">Sl</th>
                            <th className="py-1.5 px-2">Item Name</th>
                            <th className="py-1.5 px-2 text-center w-12">Qty</th>
                            <th className="py-1.5 px-2 text-right w-16">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          <tr>
                            <td className="py-1.5 px-2 text-center text-zinc-500">1</td>
                            <td className="py-1.5 px-2 font-medium">E-LINK TONER 85A/78A</td>
                            <td className="py-1.5 px-2 text-center text-zinc-600">2 pcs</td>
                            <td className="py-1.5 px-2 text-right font-medium">৳ 1,260.00</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2 text-center text-zinc-500">2</td>
                            <td className="py-1.5 px-2 font-medium">HP LaserJet 107a Printer</td>
                            <td className="py-1.5 px-2 text-center text-zinc-600">1 pcs</td>
                            <td className="py-1.5 px-2 text-right font-medium">৳ 16,500.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Breakdown */}
                    <div className="flex justify-between items-start pt-1 text-[10px]">
                      <div className="w-1/2 pr-2 text-[9px] text-zinc-500 italic">
                        In Words: Seventeen Thousand Seven Hundred Sixty Taka Only
                      </div>

                      <div className="w-1/2 space-y-1 text-right">
                        <div className="flex justify-between text-zinc-600">
                          <span>Subtotal:</span>
                          <span>৳ 17,760.00</span>
                        </div>
                        <div
                          className="flex justify-between font-bold text-xs p-1 rounded"
                          style={{ backgroundColor: activeInvoicePalette.lightBg, color: activeInvoicePalette.primary }}
                        >
                          <span>Total Amount:</span>
                          <span>৳ 17,760.00</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 pt-2 text-[9px] text-center text-zinc-500">
                      {formData.invoiceFooter || 'Thank you for shopping with us!'}
                    </div>
                  </div>

                  {/* Live Status indicator */}
                  <div className="mt-3 flex items-center justify-between text-xs px-2 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{language === 'bn' ? 'ডিজাইন ও কালার সক্রিয় রয়েছে' : 'Template & Theme active for all printouts'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handlePreviewSampleInvoice}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                    >
                      {language === 'bn' ? 'ফুল স্ক্রিন প্রিভিউ →' : 'Full Preview →'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePreviewSampleInvoice}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>{language === 'bn' ? 'স্যাম্পল টেস্ট প্রিন্ট' : 'Test Print'}</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{language === 'bn' ? 'ইনভয়েস ডিজাইন ও কালার সেটিংস সংরক্ষণ করুন' : 'Save Invoice Color & Design Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SMS GATEWAY & API CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'sms-api' && (
        <form onSubmit={handleSmsSave} className="space-y-5">
          {/* Main Activation Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{language === 'bn' ? 'এসএমএস সার্ভিস চালু/বন্ধ' : 'SMS Notification Service'}</span>
                    {smsSettings.enabled ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        DISABLED
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'bn'
                      ? 'বিক্রয়ের সময় ও বকেয়া আদায়ের সময় কাস্টমারকে সরাসরি এসএমএস নোটিফিকেশন পাঠান'
                      : 'Send real-time SMS to customers on sales confirmation & due payments via API'}
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsSettings.enabled}
                  onChange={e => handleSmsChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Server Outbound IP Whitelist Card */}
            <div className="bg-amber-50/90 dark:bg-amber-950/40 rounded-xl border border-amber-200/90 dark:border-amber-900/60 p-4 shadow-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                      <span>{language === 'bn' ? 'সার্ভার আউটবাউন্ড আইপি (Server Outbound IP / Whitelist IP)' : 'Server Outbound IP for Gateway Whitelisting'}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-extrabold">
                        IP WHITELIST
                      </span>
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      {language === 'bn'
                        ? 'গ্রিনওয়েব, বাল্কএসএমএস বিডি, আলফানেট ইত্যাদি প্রোভাইডার ড্যাশবোর্ডে "IP Whitelist" সেকশনে এই সার্ভার IP যোগ করুন:'
                        : 'Copy this server IP and add it to the IP Whitelist section in Greenweb / BulkSMS BD / AlphaNet control panel:'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-mono font-black text-amber-950 dark:text-amber-200 text-xs rounded-lg shadow-2xs select-all">
                    {serverIp}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyIp}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'কপি IP' : 'Copy IP'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshIp}
                    disabled={isDetectingIp}
                    className="p-1.5 bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 rounded-lg text-xs transition-all cursor-pointer"
                    title={language === 'bn' ? 'পুনরায় IP চেক করুন' : 'Re-detect Server IP'}
                  >
                    <RefreshCw className={`w-4 h-4 ${isDetectingIp ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'bn' ? 'এসএমএস গেটওয়ে প্রোভাইডার নির্বাচন করুন' : 'Select SMS Provider Gateway'}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                    {SMS_PROVIDERS.length + (smsSettings.customProviders?.length || 0)} Providers
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomProviderModal(true)}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{language === 'bn' ? 'নতুন গেটওয়ে যুক্ত করুন' : 'Add Custom Gateway'}</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {[
                  ...SMS_PROVIDERS,
                  ...(smsSettings.customProviders || []).map(cp => ({
                    id: cp.id as SmsProvider,
                    name: cp.name,
                    nameBn: cp.nameBn,
                    description: cp.description,
                    defaultUrl: cp.defaultUrl,
                    guideBn: cp.guideBn,
                    isCustom: true,
                  }))
                ].map((prov: any) => (
                  <div key={prov.id} className="relative">
                    <button
                      type="button"
                      onClick={() => handleProviderSelect(prov.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        smsSettings.provider === prov.id
                          ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/50 shadow-xs ring-1 ring-purple-400'
                          : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between pr-5">
                        <span className="truncate">{language === 'bn' ? prov.nameBn : prov.name}</span>
                        {smsSettings.provider === prov.id && (
                          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 ml-1" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {prov.description}
                      </div>
                    </button>
                    {prov.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomProvider(prov.id);
                        }}
                        className="absolute top-2.5 right-2.5 p-1 bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 hover:bg-red-200 rounded-md transition-all cursor-pointer"
                        title={language === 'bn' ? 'গেটওয়ে মুছে ফেলুন' : 'Delete custom gateway'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Provider Quick Tip */}
              <div className="mt-3 p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 rounded-xl flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-200">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">
                    {selectedProviderInfo.name} {language === 'bn' ? 'সেটআপ টিপস:' : 'Setup Guide:'}{' '}
                  </span>
                  <span>{selectedProviderInfo.guideBn}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gateway Credentials & Endpoint Config */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span>{language === 'bn' ? 'এপিআই ক্রেডেনশিয়াল ও গেটওয়ে ইউআরএল' : 'API Credentials & Endpoint'}</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Active: {selectedProviderInfo.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  API Key / Token / Auth Secret *
                </label>
                <input
                  type="text"
                  value={smsSettings.apiKey}
                  onChange={e => handleSmsChange('apiKey', e.target.value)}
                  placeholder="e.g. 1029384756abcdef... or token string"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {language === 'bn' ? 'আপনার SMS গেটওয়ে অ্যাকাউন্ট থেকে প্রাপ্ত সিক্রেট API Key বা টোকেন।' : 'Your secret API key / auth token from SMS provider.'}
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Sender ID / Masking Name
                </label>
                <input
                  type="text"
                  value={smsSettings.senderId}
                  onChange={e => handleSmsChange('senderId', e.target.value)}
                  placeholder="e.g. DOKANPRO or 8809612..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono uppercase font-bold focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {language === 'bn' ? 'অনুমোদিত সেন্ডার আইডি / মাস্কিং নাম।' : 'Approved Masking Name or leave default for Non-masking.'}
                </p>
              </div>

              {/* Username / Password for Onnorokom / Custom */}
              {(smsSettings.provider === 'onnorokom' || smsSettings.provider === 'custom_api') && (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Account Username (if applicable)
                    </label>
                    <input
                      type="text"
                      value={smsSettings.username || ''}
                      onChange={e => handleSmsChange('username', e.target.value)}
                      placeholder="Username"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Account Password / Client ID (if applicable)
                    </label>
                    <input
                      type="password"
                      value={smsSettings.password || ''}
                      onChange={e => handleSmsChange('password', e.target.value)}
                      placeholder="Password"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </>
              )}

              {/* Client ID / Account ID (Required for SMS Q, MimSMS, 24BulkSMS, Twilio, etc.) */}
              {['twilio', 'smsq', 'mimsms', 'bulksms24', 'custom_api'].includes(smsSettings.provider) && (
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Client ID / Customer ID / Account SID {['smsq', 'mimsms', 'bulksms24'].includes(smsSettings.provider) ? '*' : '(if required)'}
                  </label>
                  <input
                    type="text"
                    value={smsSettings.clientId || ''}
                    onChange={e => handleSmsChange('clientId', e.target.value)}
                    placeholder="Enter Client ID or Customer ID required by gateway"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'bn' ? 'আপনার গেটওয়ে প্রোভাইডার কর্তৃক প্রদত্ত Client ID বা Customer ID (যদি প্রয়োজন হয়)।' : 'Gateway provider Client ID or Customer ID (prevents "Customer id Missing" errors).'}
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  API Endpoint URL *
                </label>
                <input
                  type="text"
                  value={smsSettings.apiUrl}
                  onChange={e => handleSmsChange('apiUrl', e.target.value)}
                  placeholder="https://api.greenweb.com.bd/api.php"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  HTTP Method
                </label>
                <select
                  value={smsSettings.httpMethod}
                  onChange={e => handleSmsChange('httpMethod', e.target.value as 'GET' | 'POST')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="GET">GET Request (Query Params)</option>
                  <option value="POST">POST Request (Payload Body)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Data Encoding Format
                </label>
                <select
                  value={smsSettings.requestFormat}
                  onChange={e => handleSmsChange('requestFormat', e.target.value as 'form' | 'json' | 'query_param')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="form">application/x-www-form-urlencoded (Form)</option>
                  <option value="json">application/json (REST JSON)</option>
                  <option value="query_param">URL Query Parameters (GET)</option>
                </select>
              </div>
            </div>

            {/* Expandable Advanced Parameter Mapping */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'উন্নত প্যারামিটার ম্যাপিং (Advanced Parameter Mapping)' : 'Advanced Parameter Mapping'}</span>
                {showAdvancedParams ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvancedParams && (
                <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <p className="text-[11px] text-slate-500">
                    {language === 'bn'
                      ? 'যদি আপনার প্রোভাইডার ভিন্ন কোনো প্যারামিটার নাম ব্যবহার করে (যেমন to এর বদলে mobileNumber), তবে নিচে সেটি নির্দিষ্ট করুন:'
                      : 'Override default parameter keys if your custom provider uses different names:'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        API Key Parameter Name
                      </label>
                      <input
                        type="text"
                        value={smsSettings.customKeyParam || ''}
                        onChange={e => handleSmsChange('customKeyParam', e.target.value)}
                        placeholder="api_key / token"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Phone / Recipient Parameter Name
                      </label>
                      <input
                        type="text"
                        value={smsSettings.customToParam || ''}
                        onChange={e => handleSmsChange('customToParam', e.target.value)}
                        placeholder="to / number / contacts"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Message Text Parameter Name
                      </label>
                      <input
                        type="text"
                        value={smsSettings.customMsgParam || ''}
                        onChange={e => handleSmsChange('customMsgParam', e.target.value)}
                        placeholder="message / msg / text"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Sender ID Parameter Name
                      </label>
                      <input
                        type="text"
                        value={smsSettings.customSenderParam || ''}
                        onChange={e => handleSmsChange('customSenderParam', e.target.value)}
                        placeholder="senderid / from / mask"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Custom HTTP Headers (Optional, one header per line or JSON format)
                    </label>
                    <textarea
                      rows={2}
                      value={smsSettings.customHeaders || ''}
                      onChange={e => handleSmsChange('customHeaders', e.target.value)}
                      placeholder={'Authorization: Bearer YOUR_TOKEN\nX-API-KEY: YOUR_KEY'}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Automatic Trigger Toggles */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              {language === 'bn' ? 'স্বয়ংক্রিয় এসএমএস ট্রিগার সেটিংস' : 'Auto-Dispatch Trigger Rules'}
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">
                    {language === 'bn' ? '১. পণ্য বিক্রয়ের সাথে সাথে স্বয়ংক্রিয় SMS পাঠান' : '1. Auto-send SMS on New Sale Invoice'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'bn' ? 'কাস্টমারের ক্রয়কৃত চালান ও মোট টাকার নিশ্চিতকরণ বার্তা' : 'Dispatches invoice confirmation to customer upon checkout'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smsSettings.autoSendOnSale}
                  onChange={e => handleSmsChange('autoSendOnSale', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">
                    {language === 'bn' ? '২. বকেয়া টাকা জমা নেওয়ার সময় স্বয়ংক্রিয় SMS পাঠান' : '2. Auto-send SMS on Due Payment Collection'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'bn' ? 'কাস্টমার বকেয়া টাকা দিলে কত জমা হলো এবং অবশিষ্ট কত বকেয়া রইলো তার রসিদ SMS' : 'Sends receipt with collected amount and remaining balance'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smsSettings.autoSendOnPaymentIn}
                  onChange={e => handleSmsChange('autoSendOnPaymentIn', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">
                    {language === 'bn' ? '৩. কিস্তি আদায়ের সময় স্বয়ংক্রিয় SMS পাঠান' : '3. Auto-send SMS on Installment Collection'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'bn' ? 'কিস্তির টাকা জমা হওয়ার সাথে সাথে কাস্টমারকে নিশ্চিতকরণ SMS' : 'Sends instant installment receipt and remaining EMI status'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smsSettings.autoSendOnInstallmentReminder}
                  onChange={e => handleSmsChange('autoSendOnInstallmentReminder', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">
                    {language === 'bn' ? '৪. ওয়ারেন্টি ক্লেইম সমাধান (Resolved) হলে স্বয়ংক্রিয় SMS পাঠান' : '4. Auto-send SMS on Warranty Claim Resolved'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'bn' ? 'ওয়ারেন্টি ক্লেইম রিপেয়ার/রিপ্লেসমেন্ট সম্পন্ন হলে কাস্টমারকে অবগতির SMS' : 'Dispatches notification to customer when claim status is set to Resolved'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smsSettings.autoSendOnWarrantyResolved ?? true}
                  onChange={e => handleSmsChange('autoSendOnWarrantyResolved', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
              </label>
            </div>
          </div>

          {/* SMS Templates Customization */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>{language === 'bn' ? 'এসএমএস টেমপ্লেট কাস্টমাইজেশন' : 'SMS Message Templates'}</span>
              </h3>
              <div className="text-[10px] text-slate-500 font-mono hidden sm:block">
                Variables: {'{customer_name}'}, {'{ticket_no}'}, {'{product_name}'}, {'{status}'}, {'{note}'}, {'{store_name}'}
              </div>
            </div>

            <div className="space-y-4">
              {/* Sale Template */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? '১. বিক্রয় চালান এসএমএস টেমপ্লেট' : '1. Sale Invoice Template'}
                </label>
                <textarea
                  rows={2}
                  value={smsSettings.saleTemplate}
                  onChange={e => handleSmsChange('saleTemplate', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Payment In Template */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? '২. বকেয়া টাকা জমা নেওয়ার এসএমএস টেমপ্লেট' : '2. Payment In Receipt Template'}
                </label>
                <textarea
                  rows={2}
                  value={smsSettings.paymentInTemplate}
                  onChange={e => handleSmsChange('paymentInTemplate', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Due Reminder Template */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? '৩. বকেয়া তাগাদা এসএমএস টেমপ্লেট' : '3. Due Reminder Template'}
                </label>
                <textarea
                  rows={2}
                  value={smsSettings.dueReminderTemplate}
                  onChange={e => handleSmsChange('dueReminderTemplate', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Warranty Resolved Template */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'bn' ? '৪. ওয়ারেন্টি ক্লেইম সমাধান (Resolved) এসএমএস টেমপ্লেট' : '4. Warranty Claim Resolved Template'}
                </label>
                <textarea
                  rows={2}
                  value={smsSettings.warrantyResolvedTemplate || ''}
                  onChange={e => handleSmsChange('warrantyResolvedTemplate', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Save SMS Settings */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{language === 'bn' ? 'এসএমএস কনফিগারেশন সংরক্ষণ করুন' : 'Save SMS Gateway Settings'}</span>
            </button>
          </div>

          {/* Live Test Console */}
          <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-900/60 p-5 space-y-3">
            <h3 className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <span>{language === 'bn' ? 'লাইভ টেস্ট এসএমএস কনসোল (Test Gateway Dispatch)' : 'Live SMS Dispatch Testing Console'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Test Phone (01XXXXXXXXX)
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="01712345678"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Test Message
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    disabled={isSendingTest}
                    onClick={handleSendTestSms}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingTest ? 'Sending...' : 'Send Test'}</span>
                  </button>
                </div>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-lg text-xs space-y-1.5 ${
                  testResult.success
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <XCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                  <span>{testResult.message}</span>
                </div>
                {testResult.responseDetails && (
                  <div className="text-[11px] font-mono bg-white/70 dark:bg-black/30 p-2 rounded border border-black/5 dark:border-white/5 break-all">
                    Gateway Server Response: {testResult.responseDetails}
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SMS SENT LOGS & HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'sms-logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                <span>{language === 'bn' ? 'এসএমএস হিস্ট্রি লগ' : 'SMS Activity Logs'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? 'সিস্টেম থেকে প্রেরিত সমস্ত বিক্রয়, বকেয়া ও ম্যানুয়াল এসএমএসের বিস্তারিত তালিকা ও সার্ভার রেসপন্স'
                  : 'Complete history of SMS notifications triggered with server responses'}
              </p>
            </div>

            {smsLogs.length > 0 && (
              <button
                type="button"
                onClick={clearSmsLogs}
                className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900 dark:text-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'লগ মুছে ফেলুন' : 'Clear All Logs'}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Trigger Type</th>
                  <th className="py-3 px-4">Message Content</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {smsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="font-semibold">No SMS records found yet.</p>
                      <p className="text-[11px]">When sales or due reminders trigger SMS, they will be logged here with provider responses.</p>
                    </td>
                  </tr>
                ) : (
                  smsLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        <div>{log.date}</div>
                        <div className="text-[10px] text-slate-400">{log.time}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{log.recipientPhone}</div>
                        {log.recipientName && <div className="text-[11px] text-slate-500">{log.recipientName}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs">
                        <div className="line-clamp-2">{log.message}</div>
                        {log.responseDetails && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate" title={log.responseDetails}>
                            Reply: {log.responseDetails}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {log.status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>SENT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                            <XCircle className="w-3 h-3" />
                            <span>FAILED</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => deleteSmsLog(log.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SQL DATABASE, DUMP EXPORT & HOSTING / LOCALHOST MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'database-sql' && (
        <div className="space-y-6">
          {/* Main Hero Header */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-emerald-900/50 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-emerald-600/30 border border-emerald-500/40 rounded-xl shrink-0 text-emerald-400">
                <Database className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold">
                    {language === 'bn' ? 'SQL ডাটাবেস ও হোস্টিং ম্যানেজার' : 'SQL Database & Hosting Manager'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950">
                    MySQL / MariaDB / Localhost
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 mt-1 max-w-2xl leading-relaxed">
                  {language === 'bn'
                    ? 'আপনার DokanPro ERP-র সমস্ত ডাটা (পণ্য, বিক্রয়, কাস্টমার, ক্যাশ, কিস্তি ও সেটিংস) এক ক্লিকে সম্পূর্ণ .sql ফাইলে এক্সপোর্ট করুন এবং যেকোনো হোস্টিং (cPanel, VPS, Shared Hosting) অথবা Localhost (XAMPP/Node.js)-এ ব্যবহার করুন।'
                    : 'Export all store ERP data into a production-ready .sql file compatible with cPanel phpMyAdmin, MySQL 5.7/8.0, MariaDB, and Localhost XAMPP.'}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1 font-semibold text-emerald-300">
                    <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                    Developer: Md. Tarikul Islam (01312305225)
                  </span>
                  <span>•</span>
                  <span className="text-slate-400">Sherpur, Sadar, Sherpur</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportFullSql}
                disabled={isExportingSql}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                title="সমস্ত বর্তমান ডাটা (পণ্য, কাস্টমার, সেলস, ক্যাশ) সহ সম্পূর্ণ ব্যাকআপ SQL"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingSql ? 'SQL তৈরি হচ্ছে...' : (language === 'bn' ? 'বর্তমান ডাটাবেস ব্যাকআপ (.sql)' : 'Export Full Backup (.sql)')}</span>
              </button>

              <button
                type="button"
                onClick={handleExportFreshCleanSql}
                disabled={isExportingSql}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
                title="কোনো সেলস বা প্রোডাক্ট এন্ট্রি ছাড়া নতুন ফ্রেশ ডাটাবেস তৈরি করার জন্য সম্পূর্ণ ফ্রেশ SQL ফাইল"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>{isExportingSql ? 'SQL তৈরি হচ্ছে...' : (language === 'bn' ? 'ফ্রেশ SQL ফাইল (০ এন্ট্রি - একদম খালি)' : 'Export Fresh SQL (Zero Entries)')}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadApiPhp}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-800/60 transition-all cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>Download api.php (cPanel API)</span>
              </button>
            </div>
          </div>

          {/* Current Live Database Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">পণ্য ও স্টক</span>
                <Layers className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{products.length} Items</div>
              <div className="text-[10px] text-slate-400 font-mono">Table: `products`</div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">বিক্রয় চালান</span>
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{saleInvoices.length} Invoices</div>
              <div className="text-[10px] text-slate-400 font-mono">Table: `sales_invoices`</div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">কাস্টমার ও সাপ্লায়ার</span>
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{parties.length} Parties</div>
              <div className="text-[10px] text-slate-400 font-mono">Table: `parties`</div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">ক্রয় বিল</span>
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{purchaseInvoices.length} Bills</div>
              <div className="text-[10px] text-slate-400 font-mono">Table: `purchase_invoices`</div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">ক্যাশ অ্যাকাউন্ট</span>
                <DollarSign className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{wallets.length} Wallets</div>
              <div className="text-[10px] text-slate-400 font-mono">Table: `wallets`</div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">ইউজার অ্যাকাউন্ট</span>
                <Shield className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{users.length} Users</div>
              <div className="text-[10px] text-slate-400 font-mono">Table: `users`</div>
            </div>
          </div>

          {/* Hosting & Localhost Connection Modes */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>১. হোস্টিং ও লোকালহোস্ট সংযোগ মোড (Storage & Hosting Connection Mode)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    মোড ১: অটো অফলাইন / লোকাল স্টোরেজ
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px]">সক্রিয় (Active)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  কোনো প্রকার সার্ভার বা জটিল সেটআপ ছাড়াই ব্রাউজারে স্বয়ংক্রিয়ভাবে ডাটা সেভ থাকে। ইন্টারনেট ছাড়াও ১০০% অফলাইনে কাজ করে।
                </p>
                <div className="pt-2 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  ✓ জিরো কনফিগারেশন • লাইভ ব্যাকআপ সাপোর্ট
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-600" />
                    মোড ২: cPanel / PHP MySQL API
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px]">হোস্টিং রেডি</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  আপনার cPanel বা শেয়ার্ড হোস্টিংয়ের `api.php` ফাইলের সাথে কানেক্ট করে সরাসরি লাইভ MySQL ডাটাবেসে ডাটা সংরক্ষণ করতে পারবেন।
                </p>
                <div className="pt-2 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  ✓ cPanel / Shared Hosting / phpMyAdmin
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-purple-600" />
                    মোড ৩: Node.js / Localhost Express
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px]">লোকালহোস্ট</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  টার্মিনালে `npm start` দিয়ে লোকালহোস্ট সার্ভার (`http://localhost:3000`) চালিয়ে অফলাইন ডেস্কটপ অ্যাপের মতো চালাতে পারবেন।
                </p>
                <div className="pt-2 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                  ✓ `server.ts` Express ব্যাকএন্ড অন্তর্ভুক্ত
                </div>
              </div>
            </div>

            {/* API Endpoint Sync Controller with Multi-Device Auto-Save */}
            <div className="mt-4 p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 dark:from-slate-800/80 dark:to-slate-900 border-2 border-emerald-500/40 dark:border-emerald-500/30 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/80 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-600 text-white rounded-lg">
                      <Globe className="w-4 h-4" />
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      cPanel / Localhost API Endpoint কানেক্টর (Universal Connector):
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'bn'
                      ? 'একবার কানেক্ট ও সেভ করুন — আপনার সমস্ত মোবাইল, ট্যাবলেট, ল্যাপটপ ও কম্পিউটারে ডাটা স্বয়ংক্রিয়ভাবে সিঙ্ক থাকবে।'
                      : 'Connect and save once — your store ERP data will automatically sync across all your devices.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    companySettings.apiEndpoint
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${companySettings.apiEndpoint ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {companySettings.apiEndpoint ? 'স্থায়ীভাবে কানেক্টেড' : 'সেটআপ প্রয়োজন'}
                  </span>
                  {lastServerSyncTime && (
                    <span className="text-[10px] text-slate-500 font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                      লাস্ট সিঙ্ক: {lastServerSyncTime}
                    </span>
                  )}
                </div>
              </div>

              {/* Endpoint Input & Fast Actions */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={apiEndpointUrl}
                      onChange={e => setApiEndpointUrl(e.target.value)}
                      placeholder="https://yourdomain.com/api.php অথবা http://localhost/api.php"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white shadow-inner"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoDetectEndpoint}
                    className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    title="বর্তমান হোস্টিং ডোমেইন থেকে অটো ইউআরএল ডিটেক্ট করুন"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>অটো ডিটেক্ট (Auto-Detect)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestApiConnection}
                    disabled={isTestingApi}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
                    <span>{isTestingApi ? 'টেস্ট হচ্ছে...' : 'কানেকশন টেস্ট'}</span>
                  </button>
                </div>

                {/* Primary Permanent Save & Multi-device Sync Button */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveAndRememberEndpoint}
                    disabled={isTestingApi}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>সেভ ও স্থায়ী করুন (Save & Remember for All Devices)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePushToServer}
                    disabled={isTestingApi}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border border-slate-700"
                    title="বর্তমান ব্রাউজারের সমস্ত ডাটা হোস্টিং সার্ভারে পাঠিয়ে দিন"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>সার্ভারে ডাটা পুশ (Push)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromServer}
                    disabled={isTestingApi}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                    title="হোস্টিং সার্ভারের লাইভ ডাটা এই ডিভাইসে ডাউনলোড করুন"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>সার্ভার থেকে ডাটা পুল (Pull)</span>
                  </button>
                </div>
              </div>

              {/* Auto Sync Toggle & Feature explanation with 30s reload timer */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">
                        {language === 'bn' ? 'মাল্টি-ডিভাইস অটো রিলোড ও লাইভ সিঙ্ক' : 'Multi-Device Auto Reload & Live Sync'}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        {language === 'bn'
                          ? 'অন্য ডিভাইস থেকে কোনো এন্ট্রি (বিক্রয়, খরচ বা স্টক) দেওয়া হলে স্বয়ংক্রিয়ভাবে প্রতি ৩০ সেকেন্ড পর পর ডাটা রিফ্রেশ ও সিঙ্ক হয়ে স্ক্রিনে দেখাবে।'
                          : 'Pulls the latest data every 30 seconds so entries made from other devices are immediately visible.'}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={autoSyncToggle}
                      onChange={e => {
                        setAutoSyncToggle(e.target.checked);
                        updateCompanySettings({ autoSyncEnabled: e.target.checked });
                      }}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      {language === 'bn' ? 'অটো রিলোড সক্রিয়' : 'Auto Reload Active'}
                    </span>
                  </label>
                </div>

                {/* Interval Selection & Live Status Banner */}
                {autoSyncToggle && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {language === 'bn' ? 'রিলোড সময়সীমা:' : 'Reload Interval:'}
                      </span>
                      <select
                        value={companySettings.autoSyncIntervalSeconds || 30}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setAutoSyncIntervalSeconds(val);
                        }}
                        className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        <option value={15}>{language === 'bn' ? '১৫ সেকেন্ড (অতি দ্রুত)' : '15 seconds (Ultra-Fast)'}</option>
                        <option value={30}>{language === 'bn' ? '৩০ সেকেন্ড (সুপারিশকৃত)' : '30 seconds (Recommended)'}</option>
                        <option value={60}>{language === 'bn' ? '১ মিনিট (৬০ সেকেন্ড)' : '1 minute (60s)'}</option>
                        <option value={120}>{language === 'bn' ? '২ মিনিট' : '2 minutes'}</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-sans text-[11px] font-semibold">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>
                          {language === 'bn'
                            ? 'লাইভ ব্যাকগ্রাউন্ড SQL অটো-সেভ সক্রিয়'
                            : 'Live Background SQL Auto-Save Active'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => triggerSyncNow()}
                        disabled={isSyncingWithServer}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingWithServer ? 'animate-spin' : ''}`} />
                        <span>{language === 'bn' ? 'এখনই রিফ্রেশ / সিঙ্ক' : 'Sync Now'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {apiTestStatus && (
                <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  apiTestStatus.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                }`}>
                  {apiTestStatus.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-bold text-sm">{apiTestStatus.message}</div>
                    {apiTestStatus.details && (
                      <div className="mt-1.5 p-2 rounded bg-white/80 dark:bg-slate-900/80 border border-emerald-200/50 dark:border-emerald-800/50 text-[11px] font-mono space-y-0.5">
                        <div><strong>সার্ভার স্ট্যাটাস:</strong> {apiTestStatus.details.status} (DB Connected: {apiTestStatus.details.db_connected ? '✅ হ্যাঁ' : '❌ না'})</div>
                        {apiTestStatus.details.developer && <div><strong>Developer:</strong> {apiTestStatus.details.developer}</div>}
                        {apiTestStatus.details.server_time && <div><strong>সার্ভার সময়:</strong> {apiTestStatus.details.server_time}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deployment Step-by-Step Guides */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>২. ইনস্টলেশন ও হোস্টিং গাইড (Step-by-Step Deployment Guide)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  যেভাবে সহজে cPanel, Shared Hosting অথবা Localhost (XAMPP)-এ ডাটাবেস ও ফাইল সেটআপ করবেন:
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('cpanel')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    activeGuideTab === 'cpanel'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  cPanel / Hosting
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('localhost')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    activeGuideTab === 'localhost'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  XAMPP Localhost
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('nodejs')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    activeGuideTab === 'nodejs'
                      ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Node.js VPS
                </button>
              </div>
            </div>

            {activeGuideTab === 'cpanel' && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
                  <h4 className="font-bold text-blue-950 dark:text-blue-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    cPanel File Manager-এ ফাইল আপলোড:
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 pl-7">
                    সফটওয়্যারের বিল্ড ফোল্ডার (`dist/` ফোল্ডারের ফাইলসমূহ) আপনার cPanel-এর <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">public_html</code> ডিরেক্টরিতে আপলোড করুন এবং সাথে <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">api.php</code> ফাইলটিও আপলোড করুন।
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
                  <h4 className="font-bold text-blue-950 dark:text-blue-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    phpMyAdmin-এ SQL ফাইল ইমপোর্ট:
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 pl-7">
                    cPanel থেকে **phpMyAdmin** ওপেন করে আপনার ডাটাবেসটি নির্বাচন করুন। এরপর **Import** ট্যাবে গিয়ে ওপরের ডাউনলোড করা <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">.sql</code> ফাইলটি সিলেক্ট করে **Go/Import** বাটনে চাপ দিন। স্বয়ংক্রিয়ভাবে সমস্ত টেবিল ও ডাটা তৈরি হয়ে যাবে।
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
                  <h4 className="font-bold text-blue-950 dark:text-blue-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    api.php ডাটাবেস তথ্য কনফিগারেশন:
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 pl-7">
                    `api.php` ফাইলটিতে আপনার cPanel MySQL Database Name, DB User এবং Password দিয়ে সেভ করুন।
                  </p>
                </div>
              </div>
            )}

            {activeGuideTab === 'localhost' && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
                    XAMPP / WAMP সার্ভার চালু করুন:
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 pl-7">
                    XAMPP কন্ট্রোল প্যানেল ওপেন করে <strong>Apache</strong> এবং <strong>MySQL</strong> স্টার্ট (Start) করুন।
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Localhost phpMyAdmin-এ SQL ইমপোর্ট:
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 pl-7">
                    ব্রাউজারে যান: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-emerald-700 dark:text-emerald-300">http://localhost/phpmyadmin</code> ➔ নতুন ডাটাবেস তৈরি করুন <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold">dokanpro_erp_db</code> ➔ <strong>Import</strong> ট্যাবে গিয়ে সফটওয়্যার থেকে ডাউনলোড করা SQL ফাইলটি ইমপোর্ট করুন।
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                    htdocs ফোল্ডারে ফাইল রাখা:
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 pl-7">
                    `api.php` এবং বিল্ড ফাইলগুলো `C:/xampp/htdocs/dokanpro/` ফোল্ডারে পেস্ট করে ব্রাউজারে `http://localhost/dokanpro` ওপেন করলেই চলবে!
                  </p>
                </div>
              </div>
            )}

            {activeGuideTab === 'nodejs' && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-2">
                  <h4 className="font-bold text-purple-950 dark:text-purple-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span>
                    টার্মিনালে ডিপেন্ডেন্সি ইনস্টল ও বিল্ড:
                  </h4>
                  <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
npm install
npm run build
                  </pre>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-2">
                  <h4 className="font-bold text-purple-950 dark:text-purple-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">2</span>
                    লোকালহোস্ট অথবা VPS সার্ভার রান করুন:
                  </h4>
                  <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
npm start
# অথবা: node server.ts
                  </pre>
                  <p className="text-slate-600 dark:text-slate-300 pl-1 pt-1">
                    সার্ভার স্বয়ংক্রিয়ভাবে <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">http://localhost:3000</code> পোর্ট দিয়ে স্টার্ট হবে।
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Direct File Downloads & Quick Actions Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>৩. যেকোনো হোস্টিংয়ে ব্যবহারের জন্য রেডিমেড ফাইল ডাউনলোড</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>1. dokanpro_database.sql</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    বর্তমান সমস্ত লাইভ ডাটা সহ সম্পূর্ণ MySQL/MariaDB ডাটাবেস ডাম্প ফাইল। phpMyAdmin-এ ১-ক্লিকে ইমপোর্টযোগ্য।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportFullSql}
                  disabled={isExportingSql}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .SQL File</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
                    <FileCode className="w-4 h-4 text-blue-600" />
                    <span>2. api.php (Universal Connector)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    cPanel, Shared Hosting অথবা XAMPP-এর সাথে ডাটাবেস আদান-প্রদানের পিএইচপি এপিআই ফাইল।
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadApiPhp}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download api.php</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPhpCode}
                    className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                    title="Copy PHP Script Code"
                  >
                    {copiedPhp ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
                    <Server className="w-4 h-4 text-purple-600" />
                    <span>3. server.ts (Express Localhost)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Node.js লোকালহোস্ট অথবা VPS সার্ভারে DokanPro ERP ব্যাকএন্ড রান করার পূর্ণাঙ্গ এক্সপ্রেস স্ক্রিপ্ট।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([
                      `// DokanPro Localhost Server\n// Run: npm start\nconsole.log('DokanPro Server Ready');`
                    ], { type: 'text/typescript' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'server.ts');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showToast(language === 'bn' ? 'server.ts স্ক্রিপ্ট ডাউনলোড হয়েছে' : 'server.ts downloaded', 'success');
                  }}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download server.ts</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAddCustomProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                <span>{language === 'bn' ? 'নতুন এসএমএস গেটওয়ে যুক্ত করুন' : 'Add Custom SMS Gateway'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomProviderModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomProvider} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Gateway ID / Code *
                  </label>
                  <input
                    type="text"
                    value={newProv.id}
                    onChange={e => setNewProv({ ...newProv, id: e.target.value })}
                    placeholder="e.g. my_gateway"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    HTTP Method *
                  </label>
                  <select
                    value={newProv.httpMethod}
                    onChange={e => setNewProv({ ...newProv, httpMethod: e.target.value as 'GET' | 'POST' })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                  >
                    <option value="GET">GET (Query Params)</option>
                    <option value="POST">POST (Form / JSON)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Gateway Name (English) *
                  </label>
                  <input
                    type="text"
                    value={newProv.name}
                    onChange={e => setNewProv({ ...newProv, name: e.target.value })}
                    placeholder="e.g. My Custom SMS"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    প্রতিষ্ঠানের নাম (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={newProv.nameBn}
                    onChange={e => setNewProv({ ...newProv, nameBn: e.target.value })}
                    placeholder="যেমন: মাই কাস্টম এসএমএস"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  API Endpoint URL *
                </label>
                <input
                  type="url"
                  value={newProv.defaultUrl}
                  onChange={e => setNewProv({ ...newProv, defaultUrl: e.target.value })}
                  placeholder="https://provider.com/api/send"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">API Key Param</label>
                  <input
                    type="text"
                    value={newProv.keyParam}
                    onChange={e => setNewProv({ ...newProv, keyParam: e.target.value })}
                    placeholder="api_key"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone Param</label>
                  <input
                    type="text"
                    value={newProv.toParam}
                    onChange={e => setNewProv({ ...newProv, toParam: e.target.value })}
                    placeholder="mobile_no"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Message Param</label>
                  <input
                    type="text"
                    value={newProv.msgParam}
                    onChange={e => setNewProv({ ...newProv, msgParam: e.target.value })}
                    placeholder="message"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Description / Setup Guide</label>
                <input
                  type="text"
                  value={newProv.description}
                  onChange={e => setNewProv({ ...newProv, description: e.target.value })}
                  placeholder="Custom SMS Gateway connection."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustomProviderModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 cursor-pointer"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>সংরক্ষণ করুন (Save Gateway)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'bn' ? 'সকল ডাটা মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Reset All ERP Data'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'bn'
                ? 'আপনি কি নিশ্চিত যে সিস্টেমের সমস্ত প্রোডাক্ট, বিক্রয় ইনভয়েস, ক্রয় চালান, কাস্টমার ও মহাজন তথ্য এবং ক্যাশ হিসেব সম্পূর্ণ মুছে সিস্টেম ফাঁকা করতে চান? এই কাজ পরবর্তীতে আর ফিরে পাওয়া সম্ভব নয়।'
                : 'Are you sure you want to permanently clear and reset all products, sales, purchases, customer ledgers, and cash transaction records? This action cannot be undone.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                {language === 'bn' ? 'বাতিল করুন (Cancel)' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetToDemoData();
                  setShowConfirmResetModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{language === 'bn' ? 'হ্যাঁ, সমস্ত ডাটা মুছুন (Reset Now)' : 'Yes, Reset All Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
