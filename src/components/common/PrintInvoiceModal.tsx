import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  X,
  FileText,
  Package,
  Barcode,
  Calendar,
  CheckCircle2,
  FileDown,
  Loader2,
  Palette,
  Check,
  LayoutTemplate,
  Sparkles,
  Building2,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { printElement } from '../../utils/printHelper';
import { exportElementToPdf } from '../../utils/pdfExportHelper';
import { getInvoiceTheme, INVOICE_COLOR_PRESETS, getInvoiceTemplate, INVOICE_TEMPLATE_PRESETS } from '../../utils/invoiceTheme';
import { InvoiceColorPalette, InvoiceTemplateStyle } from '../../types';

// SVG Barcode visual renderer
function renderSvgBarcode(code: string) {
  const safeCode = code && code.trim() ? code.trim() : '00000000';
  const bars: { width: number; isBlack: boolean }[] = [];
  
  // Guard start
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 1, isBlack: true });
  bars.push({ width: 1, isBlack: false });

  for (let i = 0; i < safeCode.length; i++) {
    const charCode = safeCode.charCodeAt(i);
    const pattern = [(charCode % 3) + 1, ((charCode >> 1) % 2) + 1, ((charCode >> 2) % 3) + 1, 1];
    pattern.forEach((w, idx) => {
      bars.push({ width: w, isBlack: idx % 2 === 0 });
    });
    bars.push({ width: 1, isBlack: false });
  }

  // Guard stop
  bars.push({ width: 1, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  const totalWidth = bars.reduce((s, b) => s + b.width, 0);
  let currentX = 0;

  return (
    <svg viewBox={`0 0 ${totalWidth} 40`} className="w-full h-8 my-1" preserveAspectRatio="none">
      {bars.map((bar, idx) => {
        const x = currentX;
        currentX += bar.width;
        if (!bar.isBlack) return null;
        return <rect key={idx} x={x} y={0} width={bar.width} height={40} fill="#000000" />;
      })}
    </svg>
  );
}

// Number to English words helper for In-Words conversion
export function numberToEnglishWords(num: number): string {
  if (!num || isNaN(num)) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numInt = Math.floor(Math.abs(num));
  if (numInt === 0) return 'Zero';

  function convertBelowThousand(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(numInt / 10000000);
  let remainder = numInt % 10000000;
  
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) words += convertBelowThousand(crore) + ' Crore ';
  if (lakh > 0) words += convertBelowThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += convertBelowThousand(thousand) + ' Thousand ';
  if (remainder > 0) words += convertBelowThousand(remainder);

  return words.trim();
}

export const PrintInvoiceModal: React.FC = () => {
  const { printableDoc, closePrintModal, companySettings, language, parties, showToast } = useApp();

  // Resolve default print format directly from Company Settings
  const resolveDefaultFormat = (): 'A4' | 'POS_80MM' | 'XPRINTER_80MM' => {
    if (companySettings.invoicePrintType === 'THERMAL_3INCH') return 'POS_80MM';
    if (companySettings.invoicePrintType === 'XPRINTER_80MM') return 'XPRINTER_80MM';
    return 'A4';
  };

  const [printFormat, setPrintFormat] = useState<'A4' | 'POS_80MM' | 'XPRINTER_80MM'>(resolveDefaultFormat);
  const [printOrientation, setPrintOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [overrideTheme, setOverrideTheme] = useState<InvoiceColorPalette | null>(null);
  const [overrideTemplate, setOverrideTemplate] = useState<InvoiceTemplateStyle | null>(null);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Automatically sync print format whenever printableDoc opens or invoicePrintType changes in settings
  useEffect(() => {
    if (printableDoc) {
      if (printableDoc.type === 'POS_80MM') {
        setPrintFormat('POS_80MM');
        setPrintOrientation('PORTRAIT');
      } else if (companySettings.invoicePrintType === 'THERMAL_3INCH') {
        setPrintFormat('POS_80MM');
        setPrintOrientation('PORTRAIT');
      } else if (companySettings.invoicePrintType === 'XPRINTER_80MM') {
        setPrintFormat('XPRINTER_80MM');
        setPrintOrientation('PORTRAIT');
      } else {
        setPrintFormat('A4');
        // Smart defaults: reports, lists, and items tables default to landscape
        const lowerTitle = (printableDoc.title || '').toLowerCase();
        const docType = printableDoc.type as string;
        if (
          docType === 'PRODUCT_LIST' ||
          docType === 'REPORT' ||
          docType === 'DELETED_SALE_INVOICES_REPORT' ||
          lowerTitle.includes('list') ||
          lowerTitle.includes('report') ||
          lowerTitle.includes('summary') ||
          lowerTitle.includes('statement')
        ) {
          setPrintOrientation('LANDSCAPE');
        } else {
          setPrintOrientation('PORTRAIT');
        }
      }
    }
  }, [printableDoc, companySettings.invoicePrintType]);

  useEffect(() => {
    if (printableDoc?.autoDownloadPdf && !isExportingPdf) {
      const timer = setTimeout(() => {
        handleDownloadPdf().then(() => {
          closePrintModal();
        });
      }, 500); // Wait for fonts and layout to render
      return () => clearTimeout(timer);
    }
  }, [printableDoc?.autoDownloadPdf]);

  const invoiceTheme = overrideTheme || getInvoiceTheme(companySettings);
  const activeTemplateDef = INVOICE_TEMPLATE_PRESETS.find(t => t.id === (overrideTemplate || companySettings.invoiceTemplate || 'MODERN_MINIMAL')) || INVOICE_TEMPLATE_PRESETS[0];
  const activeTemplateId = activeTemplateDef.id;

  if (!printableDoc) return null;

  const { type, title, data } = printableDoc;

  // Document labels based on document title / type
  const isPurchase = type === 'PURCHASE_VOUCHER' || data.documentTitle?.includes('PURCHASE') || data.documentTitle?.includes('ক্রয়');
  const isChalan = data.isChalan || data.documentTitle?.includes('CHALAN') || data.documentTitle?.includes('চালান');
  const isQuotation = data.isQuotation || data.documentTitle?.includes('QUOTATION') || data.documentTitle?.includes('কোটেশন');
  
  let docTitle = 'Invoice';
  if (data.documentTitle) docTitle = data.documentTitle;
  else if (isChalan) docTitle = 'Delivery Chalan';
  else if (isPurchase) docTitle = 'Purchase Bill';
  else if (isQuotation) docTitle = language === 'bn' ? 'প্রাইস কোটেশন' : 'Price Quotation';

  const showPaymentStatus = !isQuotation || data.status === 'CONVERTED_TO_SALE';

  const handlePrint = () => {
    const isThermal = printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM';
    printElement(printContentRef.current, {
      documentTitle: title || docTitle || 'DokanPro Document',
      isThermal80mm: isThermal,
      isLandscape: !isThermal && printOrientation === 'LANDSCAPE',
    });
  };

  const handleDownloadPdf = async () => {
    if (!printableDoc) return;
    setIsExportingPdf(true);
    try {
      const docName = (docTitle || title || 'Document').replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_');
      const docId = data.invoiceNumber || data.voucherNo || data.billNumber || data.poNumber || data.returnNumber || data.id || 'doc';
      const fileName = `${docName}_${docId}.pdf`;
      const isThermal = printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM';
      const success = await exportElementToPdf(
        printContentRef.current, 
        fileName,
        !isThermal && printOrientation === 'LANDSCAPE'
      );
      if (success) {
        if (showToast) {
          showToast(language === 'bn' ? 'PDF সফলভাবে ডাউনলোড হয়েছে' : 'PDF downloaded successfully', 'success');
        }
      } else {
        if (showToast) {
          showToast(language === 'bn' ? 'PDF তৈরিতে সমস্যা হয়েছে, প্রিন্ট উইন্ডো খোলা হচ্ছে' : 'PDF export encountered an issue, opening print dialog', 'info');
        }
      }
    } catch (err) {
      console.error('Download PDF Error:', err);
      if (showToast) {
        showToast(language === 'bn' ? 'PDF ডাউনলোডে ত্রুটি ঘটেছে' : 'Error downloading PDF', 'error');
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Find party for current / previous receivables
  const targetParty = parties.find(p => p.id === data.partyId || p.id === data.customerId || p.name === data.customerName || p.name === data.supplierName);
  const previousDue = data.previousDue !== undefined 
    ? data.previousDue 
    : (targetParty ? Math.max(0, targetParty.currentBalance - (data.dueAmount || 0)) : 0);
  const currentTotalReceivable = previousDue + (data.dueAmount || 0);

  const grandTotal = data.grandTotal || data.totalAmount || data.amount || 0;
  const inWordsText = `${numberToEnglishWords(grandTotal)} Taka Only`;

  // Print Date formatting
  const printToday = new Date().toLocaleDateString('en-GB');

  // Helper for rendering Store Logo with high reliability & fallback
  const renderStoreLogo = (customClass = "h-12 w-auto object-contain shrink-0") => {
    if (companySettings.logoUrl) {
      return (
        <img
          src={companySettings.logoUrl}
          alt={companySettings.name || 'Store Logo'}
          className={customClass}
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    return null;
  };

  // Helper for rendering Authorized Signature (Image link, Base64 data URL, or Authority text)
  const renderAuthorizedSignature = (label = 'Authorized Signature', align: 'center' | 'right' | 'left' = 'center', widthClass = 'w-48') => {
    return (
      <div className={`text-${align} ${widthClass} inline-block`}>
        {companySettings.signatureUrl ? (
          <div className="flex flex-col items-center justify-end h-12 mb-1">
            {companySettings.signatureUrl.startsWith('data:image') || companySettings.signatureUrl.startsWith('http') || companySettings.signatureUrl.startsWith('/') ? (
              <img
                src={companySettings.signatureUrl}
                alt="Authorized Signature"
                className="max-h-11 max-w-[150px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="font-serif italic font-bold text-xs text-blue-900 leading-tight text-center">
                {companySettings.signatureUrl}
              </span>
            )}
          </div>
        ) : (
          <div className="h-9" />
        )}
        <div className="border-t border-zinc-400 pt-1 font-medium text-xs">
          {label}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[95vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full print:max-w-none">
        
        {/* Action Header - Hidden on Print */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 truncate">
              <h3 className="font-semibold text-zinc-900 dark:text-white text-xs sm:text-sm truncate">
                {title || docTitle}
              </h3>
              <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {language === 'bn' ? 'চালান / ইনভয়েস প্রিন্ট ভিউ' : 'Invoice & Bill Print Preview'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Format Selector: Available for all document types (Invoices, Reports, Lists, Vouchers) */}
            <div className="flex items-center bg-zinc-200 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px] sm:text-xs font-medium">
              <button
                type="button"
                onClick={() => setPrintFormat('A4')}
                className={`px-2 sm:px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  printFormat === 'A4'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('POS_80MM')}
                className={`px-2 sm:px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  printFormat === 'POS_80MM'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Thermal
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('XPRINTER_80MM')}
                className={`px-2 sm:px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  printFormat === 'XPRINTER_80MM'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Xprinter
              </button>
            </div>

            {/* Color Palette Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowColorMenu(!showColorMenu);
                  setShowTemplateMenu(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-xs transition-colors cursor-pointer"
                title="Change invoice color theme"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs shrink-0"
                  style={{ backgroundColor: invoiceTheme.primary }}
                />
                <Palette className="w-3.5 h-3.5 text-zinc-500" />
                <span className="hidden sm:inline">{invoiceTheme.name.split(' ')[0]}</span>
              </button>

              {showColorMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-2 z-50 space-y-1"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 px-2 py-1 uppercase tracking-wider">
                    {language === 'bn' ? 'ইনভয়েস কালার থিম' : 'Invoice Color Theme'}
                  </div>
                  <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto">
                    {INVOICE_COLOR_PRESETS.map(preset => {
                      const isSelected = invoiceTheme.id === preset.id && !overrideTheme?.id?.includes('CUSTOM');
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setOverrideTheme(preset);
                            setShowColorMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-2xs"
                              style={{ backgroundColor: preset.primary }}
                            />
                            <span className="truncate">{preset.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Template Selector Dropdown (A4 mode) */}
            {printFormat === 'A4' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateMenu(!showTemplateMenu);
                    setShowColorMenu(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-xs transition-colors cursor-pointer"
                  title="Change invoice design template"
                >
                  <LayoutTemplate className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline truncate max-w-[110px]">
                    {language === 'bn' ? activeTemplateDef.nameBn.split(' ')[0] : activeTemplateDef.name.split(' ')[0]}
                  </span>
                </button>

                {showTemplateMenu && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-2 z-50 space-y-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
                      <span>{language === 'bn' ? 'ইনভয়েস ডিজাইন মডেল' : 'Invoice Template Design'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                        {INVOICE_TEMPLATE_PRESETS.length} Styles
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 max-h-72 overflow-y-auto">
                      {INVOICE_TEMPLATE_PRESETS.map(tpl => {
                        const isSelected = activeTemplateId === tpl.id;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => {
                              setOverrideTemplate(tpl.id);
                              setShowTemplateMenu(false);
                            }}
                            className={`w-full flex items-start justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold text-xs ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-900 dark:text-white'}`}>
                                  {language === 'bn' ? tpl.nameBn : tpl.name}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                  {tpl.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                                {language === 'bn' ? tpl.descriptionBn : tpl.description}
                              </p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Orientation Toggle (A4 mode) */}
            {printFormat === 'A4' && (
              <div className="flex items-center bg-zinc-200 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px] sm:text-xs font-medium border border-zinc-300 dark:border-zinc-700 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPrintOrientation('PORTRAIT')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    printOrientation === 'PORTRAIT'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title={language === 'bn' ? 'লম্বালম্বি (পোর্ট্রেট)' : 'Portrait Orientation'}
                >
                  <span className="w-1.5 h-2.5 border border-current rounded-xs block opacity-80" />
                  <span>{language === 'bn' ? 'পোর্ট্রেট' : 'Portrait'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintOrientation('LANDSCAPE')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    printOrientation === 'LANDSCAPE'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title={language === 'bn' ? 'আড়াআড়ি (ল্যান্ডস্কেপ)' : 'Landscape Orientation'}
                >
                  <span className="w-2.5 h-1.5 border border-current rounded-xs block opacity-80" />
                  <span>{language === 'bn' ? 'ল্যান্ডস্কেপ' : 'Landscape'}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>{language === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'bn' ? 'প্রিন্ট করুন' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={closePrintModal}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body Viewport */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-100 dark:bg-zinc-950 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div ref={printContentRef} className="printable-document-container w-full flex justify-center">
          {/* ========================================================================= */}
          {/* FORMAT 1: 80MM POS THERMAL RECEIPT */}
          {/* ========================================================================= */}
          {printFormat === 'POS_80MM' && (type === 'INVOICE_A4' || type === 'POS_80MM' || type === 'PURCHASE_VOUCHER') ? (
            <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
              <div className="text-center border-b border-dashed border-zinc-400 pb-3 mb-3">
                {companySettings.logoUrl && (
                  <div className="mb-2 flex justify-center">
                    <img
                      src={companySettings.logoUrl}
                      alt={companySettings.name}
                      className="max-h-12 max-w-[140px] object-contain mx-auto"
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <h2 className="text-base font-bold uppercase tracking-wider">{companySettings.name || 'DokanPro ERP'}</h2>
                {companySettings.nameBn && <p className="text-[11px] text-zinc-600">{companySettings.nameBn}</p>}
                <p className="text-[10px] text-zinc-600 mt-1">{companySettings.address}</p>
                <p className="text-[10px] text-zinc-600">Tel: {companySettings.phone}</p>
                {companySettings.taxNumber && (
                  <p className="text-[10px] text-zinc-600">BIN: {companySettings.taxNumber}</p>
                )}
              </div>

              <div className="space-y-1 mb-3 text-[11px] border-b border-dashed border-zinc-400 pb-2">
                <div className="flex justify-between">
                  <span className="font-semibold">{docTitle}:</span>
                  <span>#{data.invoiceNumber || data.billNumber}</span>
                </div>
                {(data.originalInvoiceNumber || data.originalBillNumber) && (
                  <div className="flex justify-between font-bold text-rose-800">
                    <span>{language === 'bn' ? 'মূল ইনভয়েস/বিল নং:' : 'Original Invoice/Bill No:'}</span>
                    <span>#{data.originalInvoiceNumber || data.originalBillNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{data.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="truncate max-w-[180px] font-medium">{data.customerName || data.supplierName || 'Walk-in Customer'}</span>
                </div>
                {(data.customerPhone || data.supplierPhone) && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{data.customerPhone || data.supplierPhone}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-left mb-3 text-[11px]">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    {!isChalan && (
                      <>
                        <th className="py-1 text-right">Price</th>
                        <th className="py-1 text-right">Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-zinc-200">
                  {data.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1 pr-1">
                        <div className="font-medium">{item.name || item.productName}</div>
                      </td>
                      <td className="py-1 text-center whitespace-nowrap">{item.quantity} {item.unit || 'pcs'}</td>
                      {!isChalan && (
                        <>
                          <td className="py-1 text-right whitespace-nowrap">৳{item.unitPrice || item.purchasePrice}</td>
                          <td className="py-1 text-right font-medium whitespace-nowrap">৳{item.total}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              {!isChalan && (
                <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Sub Total:</span>
                    <span>৳{data.subtotal?.toLocaleString()}</span>
                  </div>
                  {data.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span>-৳{data.discount?.toLocaleString()}</span>
                    </div>
                  )}
                  {data.vatAmount > 0 && (
                    <div className="flex justify-between">
                      <span>VAT ({companySettings.defaultVatPercent}%):</span>
                      <span>+৳{data.vatAmount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
                    <span>Total Amount:</span>
                    <span>৳{data.grandTotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Paid Amount:</span>
                    <span className="font-semibold">৳{data.paidAmount?.toLocaleString()}</span>
                  </div>
                  {data.dueAmount > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold border-t border-dashed border-zinc-300 pt-1">
                      <span>Total Due:</span>
                      <span>৳{data.dueAmount?.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-dashed border-zinc-400 text-center space-y-1">
                {companySettings.signatureUrl && (
                  <div className="py-1 flex flex-col items-center justify-center">
                    {companySettings.signatureUrl.startsWith('data:image') || companySettings.signatureUrl.startsWith('http') || companySettings.signatureUrl.startsWith('/') ? (
                      <img src={companySettings.signatureUrl} alt="Signature" className="max-h-9 max-w-[130px] object-contain mx-auto" />
                    ) : (
                      <span className="text-[10px] italic font-serif font-bold text-zinc-700">{companySettings.signatureUrl}</span>
                    )}
                    <span className="text-[9px] text-zinc-500 border-t border-dashed border-zinc-400 px-3 mt-0.5">Authorized Signature</span>
                  </div>
                )}
                <p className="text-[10px] font-medium">{companySettings.invoiceFooter || 'Thank you for your business!'}</p>
                <p className="text-[9px] text-zinc-500">The report is computer generated.</p>
              </div>
            </div>
          ) : null}

          {/* ========================================================================= */}
          {/* FORMAT 1B: 80MM XPRINTER DEDICATED POS SLIP */}
          {/* ========================================================================= */}
          {printFormat === 'XPRINTER_80MM' && (type === 'INVOICE_A4' || type === 'POS_80MM' || type === 'PURCHASE_VOUCHER') ? (
            <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
              {/* Top Store Header */}
              <div className="text-center border-b-2 border-black pb-2 mb-2">
                {companySettings.logoUrl && (
                  <div className="mb-2 flex justify-center">
                    <img
                      src={companySettings.logoUrl}
                      alt={companySettings.name}
                      className="max-h-12 max-w-[140px] object-contain mx-auto"
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <h2 className="text-base font-black uppercase tracking-wider">{companySettings.name || 'DokanPro ERP'}</h2>
                {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{companySettings.address}</p>
                <p className="text-[10px] text-zinc-800 font-bold">Tel: {companySettings.phone}</p>
                {companySettings.taxNumber && (
                  <p className="text-[10px] text-zinc-600">BIN / Tax: {companySettings.taxNumber}</p>
                )}
              </div>

              {/* Barcode & Memo Info */}
              <div className="text-center mb-2">
                {renderSvgBarcode(data.invoiceNumber || data.billNumber || '20260089')}
                <div className="text-[10px] font-bold tracking-widest uppercase">
                  #{data.invoiceNumber || data.billNumber || 'INV-2026-0089'}
                </div>
              </div>

              <div className="space-y-1 mb-2 text-[11px] border-y border-dashed border-zinc-400 py-1.5">
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>{data.date} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {(data.originalInvoiceNumber || data.originalBillNumber) && (
                  <div className="flex justify-between font-bold text-rose-800">
                    <span>{language === 'bn' ? 'মূল ইনভয়েস/বিল:' : 'Orig. Invoice/Bill:'}</span>
                    <span>#{data.originalInvoiceNumber || data.originalBillNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="truncate max-w-[180px] font-bold">{data.customerName || data.supplierName || 'Cash Customer'}</span>
                </div>
                {(data.customerPhone || data.supplierPhone) && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{data.customerPhone || data.supplierPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Cashier / User:</span>
                  <span>{data.cashierName || 'Admin'}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left mb-2 text-[11px]">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    {!isChalan && (
                      <>
                        <th className="py-1 text-right">Rate</th>
                        <th className="py-1 text-right">Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-zinc-200">
                  {data.items?.map((item: any, idx: number) => {
                    const unitPrice = item.unitPrice || item.purchasePrice || 0;
                    const itemTotal = item.total || (unitPrice * (item.quantity || 1));
                    return (
                      <tr key={idx} className="align-top">
                        <td className="py-1 pr-1">
                          <div className="font-bold leading-tight">{item.name || item.productName}</div>
                        </td>
                        <td className="py-1 text-center whitespace-nowrap">{item.quantity}</td>
                        {!isChalan && (
                          <>
                            <td className="py-1 text-right whitespace-nowrap">৳{unitPrice}</td>
                            <td className="py-1 text-right font-bold whitespace-nowrap">৳{itemTotal}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Calculations breakdown */}
              {!isChalan && (
                <div className="border-t-2 border-black pt-1.5 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Sub Total:</span>
                    <span>৳{data.subtotal?.toLocaleString()}</span>
                  </div>
                  {data.discount > 0 && (
                    <div className="flex justify-between font-medium">
                      <span>Discount:</span>
                      <span>-৳{data.discount?.toLocaleString()}</span>
                    </div>
                  )}
                  {data.vatAmount > 0 && (
                    <div className="flex justify-between">
                      <span>VAT ({companySettings.defaultVatPercent}%):</span>
                      <span>+৳{data.vatAmount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm border-t border-black pt-1 mt-1">
                    <span>NET TOTAL:</span>
                    <span>৳{data.grandTotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Paid Amount:</span>
                    <span>৳{data.paidAmount?.toLocaleString()}</span>
                  </div>
                  {data.dueAmount > 0 ? (
                    <div className="flex justify-between font-bold text-rose-700 border-t border-dashed border-zinc-400 pt-1">
                      <span>Current Due:</span>
                      <span>৳{data.dueAmount?.toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[10px] text-zinc-600">
                      <span>Payment Status:</span>
                      <span className="font-bold uppercase">PAID IN FULL</span>
                    </div>
                  )}
                </div>
              )}

              {/* In Words */}
              {!isChalan && (
                <div className="my-2 pt-1 border-t border-dashed border-zinc-400 text-[10px] text-zinc-700">
                  <span className="font-bold">Words:</span> {inWordsText}
                </div>
              )}

              {/* Footer Policy */}
              <div className="mt-3 pt-2 border-t-2 border-black text-center space-y-1">
                {companySettings.signatureUrl && (
                  <div className="py-1 flex flex-col items-center justify-center">
                    {companySettings.signatureUrl.startsWith('data:image') || companySettings.signatureUrl.startsWith('http') || companySettings.signatureUrl.startsWith('/') ? (
                      <img src={companySettings.signatureUrl} alt="Signature" className="max-h-9 max-w-[130px] object-contain mx-auto" />
                    ) : (
                      <span className="text-[10px] italic font-serif font-bold text-zinc-700">{companySettings.signatureUrl}</span>
                    )}
                    <span className="text-[9px] text-zinc-500 border-t border-dashed border-zinc-400 px-3 mt-0.5">Authorized Signature</span>
                  </div>
                )}
                <p className="text-[10px] font-bold">{companySettings.invoiceFooter || 'Thank you for shopping with us!'}</p>
                <p className="text-[9px] text-zinc-500">*** Software by DokanPro ERP ***</p>
              </div>
            </div>
          ) : null}

          {/* ========================================================================= */}
          {/* FORMAT 2: DYNAMIC INVOICE DESIGN TEMPLATES (6 Distinct A4 Styles)         */}
          {/* ========================================================================= */}
          {printFormat === 'A4' && (type === 'INVOICE_A4' || type === 'PURCHASE_VOUCHER' || type === 'POS_80MM') && (
            <div className={`printable-invoice w-full ${printOrientation === 'LANDSCAPE' ? 'max-w-[1120px] min-h-[794px]' : 'max-w-[850px] min-h-[1080px]'} bg-white text-black p-8 md:p-12 shadow-xl border border-zinc-200 rounded-sm font-sans flex flex-col justify-between print:shadow-none print:border-none print:p-8 print:w-full print:max-w-none print:min-h-screen`}>
              
              {/* ========================================== */}
              {/* TEMPLATE 1: MODERN MINIMAL                */}
              {/* ========================================== */}
              {activeTemplateId === 'MODERN_MINIMAL' && (
                <div className="flex flex-col justify-between h-full min-h-[980px]">
                  <div>
                    {/* Top Header */}
                    <div className="flex justify-between items-start pb-4 border-b border-zinc-200">
                      <div className="flex items-start gap-3.5">
                        {companySettings.logoUrl ? (
                          <img src={companySettings.logoUrl} alt="Logo" className="h-12 w-auto object-contain shrink-0" />
                        ) : (
                          <div className="border border-black px-2 py-1 flex items-center justify-center bg-white rounded-xs shrink-0">
                            <span className="text-lg font-serif font-black tracking-tighter text-black">
                              {companySettings.name.split(' ').map(n => n[0]).join('').slice(0, 3) || 'WC'}
                            </span>
                          </div>
                        )}
                        <div>
                          <h1 className="text-xl font-bold uppercase tracking-wider text-black font-serif">
                            {companySettings.name || 'WILMA COMPUTER'}
                          </h1>
                          <p className="text-xs text-zinc-700 mt-0.5">Phone: {companySettings.phone || '01941624446'}</p>
                          {companySettings.email && <p className="text-xs text-zinc-600">Email: {companySettings.email}</p>}
                        </div>
                      </div>

                      <div className="text-right max-w-sm">
                        <div className="inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-1" style={{ backgroundColor: invoiceTheme.lightBg, color: invoiceTheme.primary }}>
                          {docTitle}
                        </div>
                        <div className="text-xs text-zinc-600">Date: <span className="font-semibold text-black">{data.date || printToday}</span></div>
                        <p className="text-[11px] text-zinc-600 leading-snug mt-1 whitespace-pre-line">
                          {companySettings.address || 'Rahman Shopping Mall, Chandona-1702, Chowrasta Gazipur'}
                        </p>
                      </div>
                    </div>

                    {/* Meta Bar */}
                    <div className="flex justify-between items-center text-xs font-normal text-black my-4 px-3 py-2 rounded" style={{ backgroundColor: invoiceTheme.lightBg }}>
                      <div>
                        <span className="text-zinc-600">{isPurchase ? 'Bill No:' : 'Invoice No:'}</span>{' '}
                        <span className="font-bold text-black">{data.invoiceNumber || data.billNumber || 'INV-100234'}</span>
                      </div>
                      {(data.originalInvoiceNumber || data.originalBillNumber) && (
                        <div>
                          <span className="text-zinc-600">{language === 'bn' ? 'মূল ইনভয়েস/বিল:' : 'Orig. Invoice/Bill:'}</span>{' '}
                          <span className="font-bold text-rose-700">#{data.originalInvoiceNumber || data.originalBillNumber}</span>
                        </div>
                      )}
                      {showPaymentStatus && (
                        <div>
                          <span className="text-zinc-600">Payment:</span>{' '}
                          <span className="font-bold uppercase text-emerald-700">
                            {(data.dueAmount ?? 0) > 0 ? ((data.paidAmount ?? 0) > 0 ? 'PARTIAL' : 'DUE') : 'PAID'}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-600">Issued Date:</span>{' '}
                        <span className="font-semibold">{data.date || printToday}</span>
                      </div>
                    </div>

                    {/* Customer / Supplier */}
                    <div className="space-y-2 mb-6 text-xs text-black">
                      <div className="flex items-baseline border-b border-zinc-200 pb-1">
                        <span className="w-24 text-zinc-600">{isPurchase ? 'Supplier:' : 'Customer:'}</span>
                        <span className="font-bold text-black">{data.customerName || data.supplierName || 'Md. Kader'}</span>
                      </div>
                      <div className="flex items-baseline border-b border-zinc-200 pb-1">
                        <span className="w-24 text-zinc-600">Phone:</span>
                        <span className="text-black">{data.customerPhone || data.supplierPhone || '01886228472'}</span>
                      </div>
                      <div className="flex items-baseline border-b border-zinc-200 pb-1">
                        <span className="w-24 text-zinc-600">Address:</span>
                        <span className="text-black">{data.customerAddress || data.supplierAddress || 'Target Denim, Gazipur'}</span>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="mb-6 overflow-hidden rounded border border-zinc-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }} className="font-semibold">
                            <th className="py-2.5 px-3 text-center w-12 font-medium">Sl</th>
                            <th className="py-2.5 px-3 font-medium">Item Name & Description</th>
                            <th className="py-2.5 px-3 text-center w-24 font-medium">Qty</th>
                            {!isChalan && (
                              <>
                                <th className="py-2.5 px-3 text-right w-28 font-medium">Price</th>
                                <th className="py-2.5 px-3 text-right w-28 font-medium">Total</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="text-black divide-y divide-zinc-200">
                          {data.items && data.items.length > 0 ? (
                            data.items.map((item: any, idx: number) => {
                              const unitPrice = item.unitPrice || item.purchasePrice || item.price || 0;
                              const total = item.total || (unitPrice * (item.quantity || 1));
                              return (
                                <tr key={idx} className={idx % 2 === 1 ? 'bg-zinc-50/50' : 'bg-white'}>
                                  <td className="py-2.5 px-3 text-center text-zinc-600">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-medium text-black">
                                    {item.name || item.productName || 'E-LINK TONER 85A/78A/326'}
                                    {item.warranty && <span className="block text-[10px] text-zinc-500 font-normal">Warranty: {item.warranty}</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-zinc-800 whitespace-nowrap">{item.quantity} {item.unit || 'pcs'}</td>
                                  {!isChalan && (
                                    <>
                                      <td className="py-2.5 px-3 text-right whitespace-nowrap">৳ {Number(unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">৳ {Number(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </>
                                  )}
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td className="py-2.5 px-3 text-center">1</td>
                              <td className="py-2.5 px-3">E-LINK TONER 85A/78A/326</td>
                              <td className="py-2.5 px-3 text-center">1 pcs</td>
                              {!isChalan && (
                                <>
                                  <td className="py-2.5 px-3 text-right">৳ 630.00</td>
                                  <td className="py-2.5 px-3 text-right">৳ 630.00</td>
                                </>
                              )}
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Breakdown */}
                    {!isChalan && (
                      <div className="flex justify-between items-start pt-2 text-xs">
                        <div className="w-1/2 pr-6">
                          <div className="text-xs text-black leading-relaxed p-3 rounded" style={{ backgroundColor: invoiceTheme.lightBg }}>
                            <span className="font-bold">In Words:</span> {inWordsText}
                          </div>
                          {companySettings.invoiceFooter && (
                            <p className="text-[11px] text-zinc-600 italic mt-3">{companySettings.invoiceFooter}</p>
                          )}
                        </div>

                        <div className="w-1/2 max-w-[300px] space-y-1.5 text-xs text-black border border-zinc-200 rounded-lg p-3.5 bg-zinc-50/50">
                          <div className="flex justify-between items-center text-zinc-700">
                            <span>Sub Total:</span>
                            <span className="font-semibold text-black">৳ {Number(data.subtotal || grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          {data.discount > 0 && (
                            <div className="flex justify-between items-center text-zinc-700">
                              <span>Discount:</span>
                              <span>- ৳ {Number(data.discount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {data.vatAmount > 0 && (
                            <div className="flex justify-between items-center text-zinc-700">
                              <span>VAT ({companySettings.defaultVatPercent}%):</span>
                              <span>+ ৳ {Number(data.vatAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center font-bold text-sm pt-1.5 border-t border-zinc-200" style={{ color: invoiceTheme.primary }}>
                            <span>Total Amount:</span>
                            <span>৳ {Number(grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center text-zinc-700">
                            <span>Total Paid:</span>
                            <span className="font-semibold text-emerald-700">৳ {Number(data.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center font-semibold text-rose-700">
                            <span>Total Due:</span>
                            <span>৳ {Number(data.dueAmount !== undefined ? data.dueAmount : Math.max(0, grandTotal - (data.paidAmount || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          {previousDue > 0 && (
                            <div className="flex justify-between items-center text-zinc-600 text-[11px] pt-1 border-t border-dashed border-zinc-300">
                              <span>Previous Receivable:</span>
                              <span>৳ {Number(previousDue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center font-bold text-xs pt-1 border-t border-zinc-300 text-black">
                            <span>Current Balance:</span>
                            <span>৳ {Number(currentTotalReceivable).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {isChalan && companySettings.invoiceFooter && (
                      <div className="mt-4 pt-4 border-t border-zinc-100">
                        <p className="text-[11px] text-zinc-600 italic">{companySettings.invoiceFooter}</p>
                      </div>
                    )}
                  </div>

                  {/* User Info for Quotations */}
                  {data.isQuotation && (
                    <div className="mt-8 flex gap-8 text-[10px] text-zinc-600">
                      <div>
                        <span className="font-bold">Prepared By:</span> {data.createdBy || 'Admin'}
                      </div>
                      {data.approvedBy && (
                        <div>
                          <span className="font-bold">Approved By:</span> {data.approvedBy}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer & Signatures */}
                  <div className="mt-16">
                    <div className="flex justify-between items-end text-xs text-black mb-12">
                      <div className="text-center w-48">
                        <div className="h-10" />
                        <div className="border-t border-zinc-400 pt-1 font-medium">Customer Signature</div>
                      </div>
                      {renderAuthorizedSignature('Authorized Signature', 'center', 'w-48')}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-200">
                      <div className="flex-1 text-center">This is a computer generated invoice. No stamp required.</div>
                      <div className="text-right">Page 1 / 1</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* TEMPLATE 2: CLASSIC CORPORATE             */}
              {/* ========================================== */}
              {activeTemplateId === 'CLASSIC_CORPORATE' && (
                <div className="flex flex-col justify-between h-full min-h-[980px]">
                  <div>
                    {/* Top Solid Banner */}
                    <div className="p-5 rounded-t-sm flex justify-between items-center -mx-8 -mt-8 md:-mx-12 md:-mt-12 mb-6" style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}>
                      <div className="flex items-center gap-4">
                        {companySettings.logoUrl && (
                          <img src={companySettings.logoUrl} alt="Logo" className="h-12 w-auto bg-white p-1 rounded object-contain shrink-0" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                        )}
                        <div>
                          <h1 className="text-2xl font-bold uppercase tracking-wider font-serif">{companySettings.name || 'DokanPro ERP'}</h1>
                          {companySettings.nameBn && <p className="text-xs opacity-90">{companySettings.nameBn}</p>}
                          <p className="text-xs opacity-90">{companySettings.address}</p>
                          <p className="text-xs opacity-90">Phone: {companySettings.phone} {companySettings.email && `| ${companySettings.email}`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <h2 className="text-3xl font-extrabold tracking-tight uppercase font-serif">{docTitle}</h2>
                        <p className="text-xs font-mono opacity-90 mt-1">#{data.invoiceNumber || data.billNumber || 'INV-2026-001'}</p>
                        {(data.originalInvoiceNumber || data.originalBillNumber) && (
                          <p className="text-xs font-mono font-bold mt-0.5 text-yellow-200">
                            {language === 'bn' ? 'মূল ইনভয়েস/বিল:' : 'Orig. Invoice/Bill:'} #{data.originalInvoiceNumber || data.originalBillNumber}
                          </p>
                        )}
                        <p className="text-xs opacity-85">Date: {data.date || printToday}</p>
                      </div>
                    </div>

                    {/* Dual Boxed Section: Billed From & Billed To */}
                    <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                      <div className="border border-zinc-300 rounded p-3 bg-zinc-50">
                        <div className="font-bold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5 pb-1 border-b border-zinc-200">
                          {isPurchase ? 'Bill Issued To (ক্রেতা):' : 'Billed From (বিক্রেতা):'}
                        </div>
                        <div className="font-bold text-black">{companySettings.name || 'DokanPro ERP'}</div>
                        <div className="text-zinc-600">{companySettings.address}</div>
                        <div className="text-zinc-600">Phone: {companySettings.phone}</div>
                        {companySettings.taxNumber && <div className="text-zinc-600">BIN / Tax ID: {companySettings.taxNumber}</div>}
                      </div>

                      <div className="border border-zinc-300 rounded p-3 bg-zinc-50">
                        <div className="font-bold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5 pb-1 border-b border-zinc-200">
                          {isPurchase ? 'Supplier Details (সরবরাহকারী):' : 'Billed To (ক্রেতার বিবরণ):'}
                        </div>
                        <div className="font-bold text-black text-sm">{data.customerName || data.supplierName || 'Md. Kader'}</div>
                        <div className="text-zinc-600">Phone: {data.customerPhone || data.supplierPhone || '01886228472'}</div>
                        <div className="text-zinc-600">Address: {data.customerAddress || data.supplierAddress || 'Gazipur, Bangladesh'}</div>
                      </div>
                    </div>

                    {/* Double Border Table */}
                    <div className="mb-6 overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs border border-zinc-300">
                        <thead>
                          <tr className="border-b-2 border-zinc-400 bg-zinc-100 text-zinc-900 font-bold">
                            <th className="py-2.5 px-3 text-center w-12 border-r border-zinc-300">Sl</th>
                            <th className="py-2.5 px-3 border-r border-zinc-300">Item Description</th>
                            <th className="py-2.5 px-3 text-center w-24 border-r border-zinc-300">Quantity</th>
                            {!isChalan && (
                              <>
                                <th className="py-2.5 px-3 text-right w-28 border-r border-zinc-300">Unit Price</th>
                                <th className="py-2.5 px-3 text-right w-28">Amount</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-300">
                          {data.items && data.items.length > 0 ? (
                            data.items.map((item: any, idx: number) => {
                              const unitPrice = item.unitPrice || item.purchasePrice || item.price || 0;
                              const total = item.total || (unitPrice * (item.quantity || 1));
                              return (
                                <tr key={idx} className="border-b border-zinc-300">
                                  <td className="py-2 px-3 text-center border-r border-zinc-300 font-mono">{idx + 1}</td>
                                  <td className="py-2 px-3 border-r border-zinc-300 font-semibold">{item.name || item.productName}</td>
                                  <td className="py-2 px-3 text-center border-r border-zinc-300">{item.quantity} {item.unit || 'pcs'}</td>
                                  {!isChalan && (
                                    <>
                                      <td className="py-2 px-3 text-right border-r border-zinc-300">৳ {Number(unitPrice).toFixed(2)}</td>
                                      <td className="py-2 px-3 text-right font-bold">৳ {Number(total).toFixed(2)}</td>
                                    </>
                                  )}
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td className="py-2 px-3 text-center border-r border-zinc-300">1</td>
                              <td className="py-2 px-3 border-r border-zinc-300">Sample Product</td>
                              <td className="py-2 px-3 text-center border-r border-zinc-300">1 pcs</td>
                              {!isChalan && (
                                <>
                                  <td className="py-2 px-3 text-right border-r border-zinc-300">৳ 1,000.00</td>
                                  <td className="py-2 px-3 text-right">৳ 1,000.00</td>
                                </>
                              )}
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Formal Calculations Grid */}
                    {!isChalan && (
                      <div className="flex justify-between items-start pt-2 text-xs">
                        <div className="w-1/2 pr-6 space-y-3">
                          <div className="border border-zinc-300 rounded p-2.5 bg-zinc-50 text-xs">
                            <span className="font-bold text-zinc-700">Amount in Words:</span>
                            <p className="italic text-zinc-900 mt-0.5">{inWordsText}</p>
                          </div>
                          {companySettings.invoiceFooter && (
                            <div className="border-l-2 border-zinc-400 pl-2 text-[11px] text-zinc-600">
                              <strong>Terms & Conditions:</strong>
                              <p>{companySettings.invoiceFooter}</p>
                            </div>
                          )}
                        </div>

                        <div className="w-1/2 max-w-[320px] border-2 border-zinc-300 rounded overflow-hidden">
                          <table className="w-full text-xs">
                            <tbody className="divide-y divide-zinc-200">
                              <tr className="bg-zinc-50">
                                <td className="py-1.5 px-3 text-zinc-600">Sub Total:</td>
                                <td className="py-1.5 px-3 text-right font-medium">৳ {Number(data.subtotal || grandTotal).toFixed(2)}</td>
                              </tr>
                              {data.discount > 0 && (
                                <tr>
                                  <td className="py-1.5 px-3 text-zinc-600">Discount:</td>
                                  <td className="py-1.5 px-3 text-right text-rose-600">- ৳ {Number(data.discount).toFixed(2)}</td>
                                </tr>
                              )}
                              {data.vatAmount > 0 && (
                                <tr>
                                  <td className="py-1.5 px-3 text-zinc-600">VAT ({companySettings.defaultVatPercent}%):</td>
                                  <td className="py-1.5 px-3 text-right">+ ৳ {Number(data.vatAmount).toFixed(2)}</td>
                                </tr>
                              )}
                              <tr style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }} className="font-bold">
                                <td className="py-2 px-3 text-sm">Grand Total:</td>
                                <td className="py-2 px-3 text-right text-sm">৳ {Number(grandTotal).toFixed(2)}</td>
                              </tr>
                              <tr className="bg-zinc-50">
                                <td className="py-1.5 px-3 text-zinc-700">Paid Amount:</td>
                                <td className="py-1.5 px-3 text-right font-bold text-emerald-700">৳ {Number(data.paidAmount || 0).toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td className="py-1.5 px-3 text-zinc-700 font-semibold">Total Due:</td>
                                <td className="py-1.5 px-3 text-right font-bold text-rose-700">৳ {Number(data.dueAmount || 0).toFixed(2)}</td>
                              </tr>
                              <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-400">
                                <td className="py-2 px-3">Total Receivable:</td>
                                <td className="py-2 px-3 text-right">৳ {Number(currentTotalReceivable).toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {isChalan && companySettings.invoiceFooter && (
                      <div className="mt-4 pt-4 border-t border-zinc-200">
                        <strong>Notes:</strong>
                        <p className="text-[11px] text-zinc-600 italic mt-1">{companySettings.invoiceFooter}</p>
                      </div>
                    )}
                  </div>

                  {/* Signatures & Seal */}
                  <div className="mt-16">
                    <div className="flex justify-between items-end text-xs text-black mb-10">
                      <div className="text-center w-48">
                        <div className="h-10" />
                        <div className="border-t-2 border-black pt-1 font-bold">Customer Signature</div>
                      </div>
                      <div className="text-center w-56">
                        {renderAuthorizedSignature(`For ${companySettings.name || 'Authorized Signatory'}`, 'center', 'w-56')}
                      </div>
                    </div>
                    <div className="text-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-200">
                      Thank you for your business! Corporate ERP Generated Bill.
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* TEMPLATE 3: ELEGANT FRAME                 */}
              {/* ========================================== */}
              {activeTemplateId === 'ELEGANT_FRAME' && (
                <div className="flex flex-col justify-between h-full min-h-[980px] p-6 border-2 border-zinc-400 rounded-sm relative">
                  {/* Decorative Frame Corners */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: invoiceTheme.primary }} />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: invoiceTheme.primary }} />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: invoiceTheme.primary }} />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: invoiceTheme.primary }} />

                  <div>
                    {/* Centered Luxury Header */}
                    <div className="text-center pb-4 border-b border-zinc-300 mb-6">
                      {companySettings.logoUrl && (
                        <img src={companySettings.logoUrl} alt="Logo" className="h-14 w-auto mx-auto object-contain mb-2" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                      )}
                      <h1 className="text-2xl font-serif font-bold uppercase tracking-widest text-zinc-900">{companySettings.name || 'DokanPro ERP'}</h1>
                      {companySettings.nameBn && <p className="text-xs text-zinc-600">{companySettings.nameBn}</p>}
                      <p className="text-xs text-zinc-600 mt-1">{companySettings.address} | Phone: {companySettings.phone}</p>
                      
                      <div className="flex items-center justify-center gap-3 my-3">
                        <div className="h-px bg-zinc-300 w-24" />
                        <span className="text-xs font-serif italic text-zinc-500">◆ {docTitle.toUpperCase()} ◆</span>
                        <div className="h-px bg-zinc-300 w-24" />
                      </div>

                      <div className="flex justify-center gap-8 text-xs text-zinc-700">
                        <div>Invoice No: <strong className="font-serif">{data.invoiceNumber || data.billNumber || 'EF-9082'}</strong></div>
                        {(data.originalInvoiceNumber || data.originalBillNumber) && (
                          <div>{language === 'bn' ? 'মূল ইনভয়েস/বিল:' : 'Orig. Invoice/Bill:'} <strong className="font-serif text-rose-700">#{data.originalInvoiceNumber || data.originalBillNumber}</strong></div>
                        )}
                        <div>Date: <strong>{data.date || printToday}</strong></div>
                      </div>
                    </div>

                    {/* Customer Ribbon */}
                    <div className="p-3 mb-6 rounded border border-zinc-200 flex justify-between items-center text-xs" style={{ backgroundColor: invoiceTheme.lightBg }}>
                      <div>
                        <span className="text-zinc-500">{isPurchase ? 'Supplier:' : 'Billed To:'} </span>
                        <strong className="text-black text-sm">{data.customerName || data.supplierName || 'Md. Kader'}</strong>
                        <span className="text-zinc-600 ml-3">Phone: {data.customerPhone || data.supplierPhone || '01886228472'}</span>
                      </div>
                      <div className="text-zinc-600 truncate max-w-[260px]">
                        Address: {data.customerAddress || data.supplierAddress || 'Gazipur'}
                      </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-left text-xs mb-6 border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }} className="font-serif">
                          <th className="py-2.5 px-3 text-center w-12 font-semibold">#</th>
                          <th className="py-2.5 px-3 font-semibold">Description of Goods</th>
                          <th className="py-2.5 px-3 text-center w-24 font-semibold">Qty</th>
                          {!isChalan && (
                            <>
                              <th className="py-2.5 px-3 text-right w-28 font-semibold">Rate</th>
                              <th className="py-2.5 px-3 text-right w-28 font-semibold">Total Amount</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {data.items && data.items.length > 0 ? (
                          data.items.map((item: any, idx: number) => {
                            const unitPrice = item.unitPrice || item.purchasePrice || item.price || 0;
                            const total = item.total || (unitPrice * (item.quantity || 1));
                            return (
                              <tr key={idx} className="hover:bg-zinc-50">
                                <td className="py-2.5 px-3 text-center font-serif text-zinc-500">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-medium text-black">{item.name || item.productName}</td>
                                <td className="py-2.5 px-3 text-center">{item.quantity} {item.unit || 'pcs'}</td>
                                {!isChalan && (
                                  <>
                                    <td className="py-2.5 px-3 text-right">৳ {Number(unitPrice).toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-right font-semibold">৳ {Number(total).toFixed(2)}</td>
                                  </>
                                )}
                              </tr>
                            );
                          })
                        ) : null}
                      </tbody>
                    </table>

                    {/* Totals & Notes */}
                    {!isChalan && (
                      <div className="flex justify-between items-start text-xs pt-4 border-t border-zinc-300">
                        <div className="w-1/2 pr-6 space-y-2">
                          <div className="text-xs text-zinc-700">
                            <span className="font-serif font-bold">In Words:</span> {inWordsText}
                          </div>
                          {companySettings.invoiceFooter && (
                            <div className="text-[11px] text-zinc-500 italic pt-2">
                              {companySettings.invoiceFooter}
                            </div>
                          )}
                        </div>

                        <div className="w-1/2 max-w-[280px] space-y-1.5 border p-3 rounded" style={{ borderColor: invoiceTheme.borderColor, backgroundColor: invoiceTheme.lightBg }}>
                          <div className="flex justify-between text-zinc-600"><span>Sub Total:</span><span className="font-medium">৳ {Number(data.subtotal || grandTotal).toFixed(2)}</span></div>
                          {data.discount > 0 && <div className="flex justify-between text-zinc-600"><span>Discount:</span><span>- ৳ {Number(data.discount).toFixed(2)}</span></div>}
                          <div className="flex justify-between font-bold text-sm pt-1 border-t border-zinc-300" style={{ color: invoiceTheme.primary }}>
                            <span>Grand Total:</span><span>৳ {Number(grandTotal).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-800 font-semibold"><span>Paid:</span><span>৳ {Number(data.paidAmount || 0).toFixed(2)}</span></div>
                          <div className="flex justify-between text-rose-800 font-semibold"><span>Due:</span><span>৳ {Number(data.dueAmount || 0).toFixed(2)}</span></div>
                        </div>
                      </div>
                    )}

                    {isChalan && companySettings.invoiceFooter && (
                      <div className="mt-4 pt-4 border-t border-zinc-200">
                        <p className="text-[11px] text-zinc-500 italic">
                          {companySettings.invoiceFooter}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="mt-16 flex justify-between items-end text-xs text-black">
                    <div className="text-center w-48">
                      <div className="h-10" />
                      <div className="border-t border-zinc-400 pt-1 font-serif">Customer Acceptance</div>
                    </div>
                    {renderAuthorizedSignature('Authorized Signatory', 'center', 'w-48')}
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* TEMPLATE 4: SLATE CONTEMPORARY            */}
              {/* ========================================== */}
              {activeTemplateId === 'SLATE_CONTEMPORARY' && (
                <div className="flex flex-col justify-between h-full min-h-[980px] border-l-4 pl-6" style={{ borderColor: invoiceTheme.primary }}>
                  <div>
                    {/* Modern Asymmetric Header */}
                    <div className="flex justify-between items-start pb-6 border-b border-zinc-200">
                      <div>
                        {companySettings.logoUrl && (
                          <div className="mb-2">
                            <img src={companySettings.logoUrl} alt="Logo" className="h-12 w-auto object-contain" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                          </div>
                        )}
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 text-white text-[11px] font-mono uppercase tracking-wider mb-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: invoiceTheme.accent }} />
                          {docTitle} #{data.invoiceNumber || data.billNumber || '78291'}
                        </div>
                        {(data.originalInvoiceNumber || data.originalBillNumber) && (
                          <div className="text-xs font-mono font-bold text-rose-700 mb-1">
                            {language === 'bn' ? 'মূল ইনভয়েস/বিল:' : 'Orig. Invoice/Bill:'} #{data.originalInvoiceNumber || data.originalBillNumber}
                          </div>
                        )}
                        <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">{companySettings.name || 'DokanPro ERP'}</h1>
                        {companySettings.nameBn && <p className="text-xs text-zinc-600 font-bold">{companySettings.nameBn}</p>}
                        <p className="text-xs text-zinc-600 mt-1">{companySettings.address} • {companySettings.phone}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono text-zinc-500">DATE OF ISSUE</div>
                        <div className="text-sm font-bold text-zinc-900">{data.date || printToday}</div>
                        <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: data.dueAmount > 0 ? '#fee2e2' : '#dcfce7', color: data.dueAmount > 0 ? '#b91c1c' : '#15803d' }}>
                          {data.dueAmount > 0 ? 'Payment Due' : 'Fully Settled'}
                        </div>
                      </div>
                    </div>

                    {/* Customer Card */}
                    <div className="grid grid-cols-2 gap-4 my-6 p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Client Information</div>
                        <div className="text-sm font-bold text-zinc-900 mt-0.5">{data.customerName || data.supplierName || 'Md. Kader'}</div>
                        <div className="text-zinc-600 mt-1">{data.customerPhone || data.supplierPhone || '01886228472'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Delivery Location</div>
                        <div className="text-zinc-700 mt-0.5">{data.customerAddress || data.supplierAddress || 'Gazipur, Bangladesh'}</div>
                      </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-left text-xs mb-6 border-collapse">
                      <thead>
                        <tr className="bg-zinc-900 text-white rounded-lg">
                          <th className="py-2.5 px-3 text-center w-12 font-medium">SL</th>
                          <th className="py-2.5 px-3 font-medium">Product / Service</th>
                          <th className="py-2.5 px-3 text-center w-24 font-medium">Qty</th>
                          {!isChalan && (
                            <>
                              <th className="py-2.5 px-3 text-right w-28 font-medium">Rate</th>
                              <th className="py-2.5 px-3 text-right w-28 font-medium">Total</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {data.items && data.items.length > 0 ? (
                          data.items.map((item: any, idx: number) => {
                            const unitPrice = item.unitPrice || item.purchasePrice || item.price || 0;
                            const total = item.total || (unitPrice * (item.quantity || 1));
                            return (
                              <tr key={idx} className={idx % 2 === 1 ? 'bg-zinc-50' : 'bg-white'}>
                                <td className="py-2.5 px-3 text-center font-mono text-zinc-500">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-semibold text-zinc-900">{item.name || item.productName}</td>
                                <td className="py-2.5 px-3 text-center font-mono">{item.quantity} {item.unit || 'pcs'}</td>
                                {!isChalan && (
                                  <>
                                    <td className="py-2.5 px-3 text-right font-mono">৳{Number(unitPrice).toLocaleString()}</td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold">৳{Number(total).toLocaleString()}</td>
                                  </>
                                )}
                              </tr>
                            );
                          })
                        ) : null}
                      </tbody>
                    </table>

                    {/* Contemporary Summary Card */}
                    {!isChalan && (
                      <div className="flex justify-between items-start text-xs pt-4">
                        <div className="w-1/2 pr-6">
                          <div className="text-[11px] text-zinc-500 font-mono">AMOUNT IN WORDS</div>
                          <div className="font-semibold text-zinc-900 mt-0.5">{inWordsText}</div>
                          {companySettings.invoiceFooter && (
                            <p className="text-xs text-zinc-600 mt-3">{companySettings.invoiceFooter}</p>
                          )}
                        </div>

                        <div className="w-1/2 max-w-[280px] bg-zinc-900 text-white rounded-xl p-4 space-y-2">
                          <div className="flex justify-between text-zinc-400"><span>Subtotal:</span><span>৳{Number(data.subtotal || grandTotal).toLocaleString()}</span></div>
                          {data.discount > 0 && <div className="flex justify-between text-rose-400"><span>Discount:</span><span>- ৳{Number(data.discount).toLocaleString()}</span></div>}
                          <div className="flex justify-between font-bold text-base pt-2 border-t border-zinc-800" style={{ color: invoiceTheme.accent }}>
                            <span>Net Amount:</span><span>৳{Number(grandTotal).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-emerald-400"><span>Paid:</span><span>৳{Number(data.paidAmount || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between text-rose-400 font-bold"><span>Balance Due:</span><span>৳{Number(data.dueAmount || 0).toLocaleString()}</span></div>
                        </div>
                      </div>
                    )}

                    {isChalan && companySettings.invoiceFooter && (
                      <div className="mt-4 pt-4 border-t border-zinc-200">
                        <p className="text-xs text-zinc-600">{companySettings.invoiceFooter}</p>
                      </div>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="mt-16 flex justify-between items-end text-xs text-black">
                    <div className="text-center w-48">
                      <div className="h-10" />
                      <div className="border-t border-zinc-400 pt-1">Client Signature</div>
                    </div>
                    {renderAuthorizedSignature('Manager Signature', 'center', 'w-48')}
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* TEMPLATE 5: COMPACT BILL                  */}
              {/* ========================================== */}
              {activeTemplateId === 'COMPACT_BILL' && (
                <div className="flex flex-col justify-between h-full min-h-[980px] text-xs">
                  <div>
                    {/* Compact Dense Header */}
                    <div className="border-b-2 border-black pb-2 mb-3 flex justify-between items-end">
                      <div className="flex items-center gap-3">
                        {companySettings.logoUrl && (
                          <img src={companySettings.logoUrl} alt="Logo" className="h-10 w-auto object-contain" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                        )}
                        <div>
                          <h1 className="text-lg font-black uppercase">{companySettings.name || 'DokanPro ERP'}</h1>
                          {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                          <p className="text-[11px] text-zinc-700">{companySettings.address} | Tel: {companySettings.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black uppercase">{docTitle}</div>
                        <div className="text-[11px]">No: <strong>{data.invoiceNumber || data.billNumber || 'CB-01'}</strong> | Date: <strong>{data.date || printToday}</strong></div>
                        {(data.originalInvoiceNumber || data.originalBillNumber) && (
                          <div className="text-[11px] font-bold text-rose-700 mt-0.5">
                            {language === 'bn' ? 'মূল ইনভয়েস/বিল নং:' : 'Orig. Invoice/Bill No:'} <strong>#{data.originalInvoiceNumber || data.originalBillNumber}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Line */}
                    <div className="flex justify-between items-center bg-zinc-100 px-2.5 py-1 mb-3 text-[11px]">
                      <div><strong>Party:</strong> {data.customerName || data.supplierName || 'Md. Kader'} ({data.customerPhone || data.supplierPhone || '01886228472'})</div>
                      <div><strong>Address:</strong> {data.customerAddress || data.supplierAddress || 'Gazipur'}</div>
                    </div>

                    {/* High-density Table */}
                    <table className="w-full text-left text-xs border border-black mb-3 border-collapse">
                      <thead>
                        <tr className="bg-zinc-200 border-b border-black font-bold">
                          <th className="py-1 px-2 border-r border-black w-8 text-center">#</th>
                          <th className="py-1 px-2 border-r border-black">Item Description</th>
                          <th className="py-1 px-2 border-r border-black text-center w-16">Qty</th>
                          {!isChalan && (
                            <>
                              <th className="py-1 px-2 border-r border-black text-right w-20">Rate</th>
                              <th className="py-1 px-2 text-right w-24">Total</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-300">
                        {data.items && data.items.length > 0 ? (
                          data.items.map((item: any, idx: number) => {
                            const unitPrice = item.unitPrice || item.purchasePrice || item.price || 0;
                            const total = item.total || (unitPrice * (item.quantity || 1));
                            return (
                              <tr key={idx}>
                                <td className="py-1 px-2 border-r border-black text-center">{idx + 1}</td>
                                <td className="py-1 px-2 border-r border-black font-medium">{item.name || item.productName}</td>
                                <td className="py-1 px-2 border-r border-black text-center">{item.quantity} {item.unit || 'pcs'}</td>
                                {!isChalan && (
                                  <>
                                    <td className="py-1 px-2 border-r border-black text-right">৳{Number(unitPrice).toFixed(2)}</td>
                                    <td className="py-1 px-2 text-right font-semibold">৳{Number(total).toFixed(2)}</td>
                                  </>
                                )}
                              </tr>
                            );
                          })
                        ) : null}
                      </tbody>
                    </table>

                    {/* Dense Totals */}
                    {!isChalan && (
                      <div className="flex justify-between items-start pt-1 text-xs">
                        <div className="w-1/2 pr-4 text-[11px]">
                          <div><strong>Words:</strong> {inWordsText}</div>
                          <div className="mt-2 text-zinc-600">{companySettings.invoiceFooter}</div>
                        </div>
                        <div className="w-1/2 max-w-[240px] space-y-1 text-xs border border-black p-2">
                          <div className="flex justify-between"><span>Subtotal:</span><span>৳{Number(data.subtotal || grandTotal).toFixed(2)}</span></div>
                          {data.discount > 0 && <div className="flex justify-between text-zinc-600"><span>Discount:</span><span>-৳{Number(data.discount).toFixed(2)}</span></div>}
                          <div className="flex justify-between font-bold border-t border-black pt-1"><span>Total:</span><span>৳{Number(grandTotal).toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>Paid:</span><span>৳{Number(data.paidAmount || 0).toFixed(2)}</span></div>
                          <div className="flex justify-between font-bold text-rose-700"><span>Due:</span><span>৳{Number(data.dueAmount || 0).toFixed(2)}</span></div>
                        </div>
                      </div>
                    )}

                    {isChalan && companySettings.invoiceFooter && (
                      <div className="mt-2 text-[11px] text-zinc-600">{companySettings.invoiceFooter}</div>
                    )}
                  </div>

                  {/* Minimal Bottom Signature */}
                  <div className="mt-12 flex justify-between items-end text-xs">
                    <div className="text-center w-40">
                      <div className="h-8" />
                      <div className="border-t border-black pt-1 font-medium">Customer</div>
                    </div>
                    {renderAuthorizedSignature('Authorized Cashier', 'center', 'w-40')}
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* TEMPLATE 6: CREATIVE STUDIO               */}
              {/* ========================================== */}
              {activeTemplateId === 'CREATIVE_STUDIO' && (
                <div className="flex flex-col justify-between h-full min-h-[980px]">
                  <div>
                    {/* Creative Studio Top */}
                    <div className="flex justify-between items-start pb-6 mb-6 border-b-2" style={{ borderColor: invoiceTheme.primary }}>
                      <div>
                        {companySettings.logoUrl && (
                          <div className="mb-2">
                            <img src={companySettings.logoUrl} alt="Logo" className="h-12 w-auto object-contain" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                          </div>
                        )}
                        <div className="text-3xl font-black tracking-tight" style={{ color: invoiceTheme.primary }}>
                          {companySettings.name || 'DokanPro ERP'}
                        </div>
                        {companySettings.nameBn && <p className="text-xs text-zinc-700 font-bold mt-0.5">{companySettings.nameBn}</p>}
                        <p className="text-xs text-zinc-600 mt-1 max-w-sm">{companySettings.address}</p>
                        <p className="text-xs text-zinc-600">Phone: {companySettings.phone}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-4xl font-extrabold font-mono tracking-tighter text-zinc-200">
                          #{data.invoiceNumber ? data.invoiceNumber.slice(-4) : '001'}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-900 mt-1">{docTitle}</div>
                        {(data.originalInvoiceNumber || data.originalBillNumber) && (
                          <div className="text-[11px] font-mono font-bold text-rose-600 mt-0.5">
                            {language === 'bn' ? 'মূল ইনভয়েস/বিল:' : 'Orig. Invoice/Bill:'} #{data.originalInvoiceNumber || data.originalBillNumber}
                          </div>
                        )}
                        <div className="text-xs text-zinc-500">Date: {data.date || printToday}</div>
                      </div>
                    </div>

                    {/* Floating Info Pill */}
                    <div className="flex justify-between items-center p-3.5 rounded-xl border border-zinc-200 mb-6 text-xs bg-zinc-50">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-zinc-400">Invoice Issued For</div>
                        <div className="font-bold text-sm text-black">{data.customerName || data.supplierName || 'Md. Kader'}</div>
                        <div className="text-zinc-600">{data.customerPhone || data.supplierPhone || '01886228472'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-zinc-400">Invoice ID</div>
                        <div className="font-mono font-bold">{data.invoiceNumber || data.billNumber || 'CS-2026-99'}</div>
                      </div>
                    </div>

                    {/* Clean Underlined Table */}
                    <table className="w-full text-left text-xs mb-6 border-collapse">
                      <thead>
                        <tr className="border-b-2 text-zinc-700" style={{ borderColor: invoiceTheme.primary }}>
                          <th className="py-2.5 px-3 text-center w-12 font-bold">#</th>
                          <th className="py-2.5 px-3 font-bold">Item Description</th>
                          <th className="py-2.5 px-3 text-center w-24 font-bold">Quantity</th>
                          {!isChalan && (
                            <>
                              <th className="py-2.5 px-3 text-right w-28 font-bold">Rate</th>
                              <th className="py-2.5 px-3 text-right w-28 font-bold">Total</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {data.items && data.items.length > 0 ? (
                          data.items.map((item: any, idx: number) => {
                            const unitPrice = item.unitPrice || item.purchasePrice || item.price || 0;
                            const total = item.total || (unitPrice * (item.quantity || 1));
                            return (
                              <tr key={idx} className="hover:bg-zinc-50/50">
                                <td className="py-3 px-3 text-center font-mono text-zinc-400">{idx + 1}</td>
                                <td className="py-3 px-3 font-medium text-black">{item.name || item.productName}</td>
                                <td className="py-3 px-3 text-center">{item.quantity} {item.unit || 'pcs'}</td>
                                {!isChalan && (
                                  <>
                                    <td className="py-3 px-3 text-right">৳ {Number(unitPrice).toFixed(2)}</td>
                                    <td className="py-3 px-3 text-right font-bold">৳ {Number(total).toFixed(2)}</td>
                                  </>
                                )}
                              </tr>
                            );
                          })
                        ) : null}
                      </tbody>
                    </table>

                    {/* Creative Bottom Totals */}
                    {!isChalan && (
                      <div className="flex justify-between items-start text-xs pt-4">
                        <div className="w-1/2 pr-6">
                          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                            <span className="font-bold text-zinc-700">In Words:</span> {inWordsText}
                          </div>
                          {companySettings.invoiceFooter && (
                            <p className="text-xs text-zinc-500 mt-3 italic">{companySettings.invoiceFooter}</p>
                          )}
                        </div>

                        <div className="w-1/2 max-w-[280px] p-4 rounded-xl space-y-2 border" style={{ backgroundColor: invoiceTheme.lightBg, borderColor: invoiceTheme.borderColor }}>
                          <div className="flex justify-between text-zinc-700"><span>Sub Total:</span><span>৳ {Number(data.subtotal || grandTotal).toFixed(2)}</span></div>
                          {data.discount > 0 && <div className="flex justify-between text-rose-600"><span>Discount:</span><span>- ৳ {Number(data.discount).toFixed(2)}</span></div>}
                          <div className="flex justify-between font-bold text-base pt-2 border-t" style={{ borderColor: invoiceTheme.borderColor, color: invoiceTheme.primary }}>
                            <span>Total Amount:</span><span>৳ {Number(grandTotal).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700 font-semibold"><span>Total Paid:</span><span>৳ {Number(data.paidAmount || 0).toFixed(2)}</span></div>
                          <div className="flex justify-between text-rose-700 font-semibold"><span>Remaining Due:</span><span>৳ {Number(data.dueAmount || 0).toFixed(2)}</span></div>
                        </div>
                      </div>
                    )}

                    {isChalan && companySettings.invoiceFooter && (
                      <div className="mt-4 pt-4 border-t border-zinc-100">
                        <p className="text-xs text-zinc-500 italic">{companySettings.invoiceFooter}</p>
                      </div>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="mt-16 flex justify-between items-end text-xs text-black">
                    <div className="text-center w-48">
                      <div className="h-10" />
                      <div className="border-t border-zinc-400 pt-1 font-medium">Customer Signature</div>
                    </div>
                    {renderAuthorizedSignature('Authorized Studio Seal', 'center', 'w-48')}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMAT 3: MONEY RECEIPT (RECEIPT VOUCHER / টাকা প্রাপ্তি রসিদ)             */}
          {/* ========================================================================= */}
          {type === 'MONEY_RECEIPT' && (
            printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM' ? (
              <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
                {/* Store Header */}
                <div className="text-center border-b border-dashed border-zinc-400 pb-2 mb-2">
                  {companySettings.logoUrl && (
                    <div className="mb-1 flex justify-center">
                      <img
                        src={companySettings.logoUrl}
                        alt={companySettings.name}
                        className="max-h-10 max-w-[130px] object-contain mx-auto"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <h2 className="text-base font-bold uppercase tracking-wider">{companySettings.name || 'DokanPro ERP'}</h2>
                  {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                  {companySettings.address && <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{companySettings.address}</p>}
                  {companySettings.phone && <p className="text-[10px] text-zinc-600">Tel: {companySettings.phone}</p>}
                </div>

                {/* Receipt Title */}
                <div className="text-center my-2 border-b-2 border-dashed border-black pb-1.5">
                  <div className="text-xs font-black uppercase tracking-wider">
                    *** MONEY RECEIPT (টাকা প্রাপ্তি রসিদ) ***
                  </div>
                  <div className="text-[10px] text-zinc-700 font-bold">
                    CREDIT VOUCHER (জমা ভাউচার)
                  </div>
                </div>

                {/* Meta Details */}
                <div className="space-y-1 mb-2 text-[11px] border-b border-dashed border-zinc-300 pb-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Receipt #:</span>
                    <span className="font-bold font-mono">{data.voucherNo || data.receiptNo || 'REC-VOUCHER'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{data.date || printToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold text-zinc-900">{data.partyName || 'Customer'}</span>
                  </div>
                  {data.partyPhone && (
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span>{data.partyPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Deposited To:</span>
                    <span className="font-semibold text-emerald-700">{data.walletName || 'Main Cash'}</span>
                  </div>
                </div>

                {/* Particulars & Purpose */}
                <div className="space-y-1 mb-2 text-[11px] border-b border-dashed border-zinc-300 pb-2">
                  <div className="text-[10px] text-zinc-700">
                    <span className="font-semibold text-zinc-600">Purpose / Note: </span>
                    <span>{data.remarks || 'Customer Due Payment Settlement'}</span>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="my-2 p-2 bg-emerald-50 border border-emerald-300 rounded text-center">
                  <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">AMOUNT RECEIVED (জমা টাকা)</div>
                  <div className="text-xl font-black font-mono text-emerald-950 my-0.5">
                    ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-800">
                    STATUS: RECEIVED & CREDITED
                  </div>
                </div>

                {/* Due Balance Status */}
                {(data.previousDue !== undefined || data.remainingDue !== undefined) && (
                  <div className="space-y-1 text-[10px] bg-zinc-50 p-2 rounded border border-zinc-200 mb-2 font-mono">
                    {data.previousDue !== undefined && (
                      <div className="flex justify-between text-zinc-600">
                        <span>Previous Due (পূর্বের বকেয়া):</span>
                        <span>৳{Number(data.previousDue).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Amount Received (জমা):</span>
                      <span>-৳{Number(data.amount || 0).toLocaleString()}</span>
                    </div>
                    {data.remainingDue !== undefined && (
                      <div className="flex justify-between font-bold text-rose-800 border-t border-dashed border-zinc-300 pt-1">
                        <span>Current Due (অবশিষ্ট বকেয়া):</span>
                        <span>৳{Number(data.remainingDue).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* In Words */}
                <div className="text-[10px] text-zinc-700 mb-3 border-b border-dashed border-zinc-300 pb-2">
                  <span className="font-bold">In Words: </span>
                  {numberToEnglishWords(data.amount || 0)} Taka Only
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-4 text-center text-[10px]">
                  <div>
                    <div className="h-6" />
                    <div className="border-t border-dashed border-zinc-600 pt-1 text-zinc-700 font-medium">Customer's Sign</div>
                  </div>
                  <div>
                    <div className="h-6" />
                    <div className="border-t border-dashed border-zinc-600 pt-1 text-zinc-900 font-bold">Cashier / Receiver</div>
                  </div>
                </div>

                <div className="mt-3 pt-1 border-t border-dashed border-zinc-300 text-center text-[9px] text-zinc-500">
                  Thank You For Your Payment • DokanPro ERP
                </div>
              </div>
            ) : (
              <div className="printable-voucher w-full max-w-[780px] bg-white text-zinc-900 p-6 sm:p-8 shadow-lg border border-zinc-200 rounded-xl text-xs print:shadow-none print:border-none print:p-4 font-sans flex flex-col justify-between">
                <div>
                  {/* Top Company Header */}
                  <div className="flex justify-between items-start border-b-2 pb-4 mb-4" style={{ borderColor: invoiceTheme.primary }}>
                    <div className="flex items-start gap-3.5">
                      {renderStoreLogo('h-14 w-auto object-contain shrink-0')}
                      <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-black font-serif">
                          {companySettings.name || 'DokanPro Business ERP'}
                        </h1>
                        {companySettings.nameBn && (
                          <p className="text-xs text-zinc-700 font-bold mt-0.5">{companySettings.nameBn}</p>
                        )}
                        {companySettings.address && (
                          <p className="text-xs text-zinc-600 mt-0.5">{companySettings.address}</p>
                        )}
                        <div className="text-[11px] text-zinc-600 mt-0.5 flex flex-wrap gap-x-3">
                          {companySettings.phone && <span><strong>Phone:</strong> {companySettings.phone}</span>}
                          {companySettings.email && <span><strong>Email:</strong> {companySettings.email}</span>}
                          {companySettings.taxNumber && <span><strong>BIN/VAT:</strong> {companySettings.taxNumber}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded inline-block shadow-2xs"
                        style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                      >
                        MONEY RECEIPT VOUCHER
                      </div>
                      <div className="text-[11px] text-emerald-700 font-bold mt-1">
                        টাকা প্রাপ্তি রসিদ ও ক্রেডিট ভাউচার
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-1">
                        Voucher #: #{data.voucherNo || data.receiptNo || 'REC-VOUCHER'}
                      </div>
                    </div>
                  </div>

                  {/* Voucher Meta Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-5 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Receipt / Voucher #</span>
                      <strong className="font-mono text-zinc-900 text-sm">{data.voucherNo || data.receiptNo}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Collection Date</span>
                      <strong className="text-zinc-800 text-sm">{data.date || printToday}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Received From</span>
                      <strong className="text-zinc-800 text-sm block truncate">{data.partyName || 'Customer'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Deposited Account (ওয়ালেট)</span>
                      <span className="font-bold text-emerald-700 text-sm block truncate">{data.walletName || 'Main Cash'}</span>
                    </div>
                  </div>

                  {/* Structured Table */}
                  <div className="border border-zinc-200 rounded-lg overflow-hidden mb-5 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }} className="font-bold">
                          <th className="py-2.5 px-3 text-center w-10">#</th>
                          <th className="py-2.5 px-4">Receipt Purpose & Particulars (প্রাপ্তির বিবরণ ও খাত)</th>
                          <th className="py-2.5 px-4">Customer Details (কাস্টমার তথ্য)</th>
                          <th className="py-2.5 px-4">Payment Channel (মাধ্যম)</th>
                          <th className="py-2.5 px-4 text-right">Received Amount (জমা টাকা)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        <tr className="bg-white">
                          <td className="py-3.5 px-3 text-center font-mono text-zinc-500">1</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-sm text-zinc-900">
                              {data.remarks || 'Customer Due Settlement / Payment In'}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              Payment received with thanks and credited to account ledger.
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-zinc-900">{data.partyName || 'Customer'}</div>
                            {data.partyPhone && (
                              <div className="text-[11px] text-zinc-600 font-mono mt-0.5">Tel: {data.partyPhone}</div>
                            )}
                            {data.companyName && (
                              <div className="text-[10px] text-zinc-500">{data.companyName}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-emerald-700">{data.walletName || 'Cash'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-zinc-950 whitespace-nowrap">
                            ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                          <td colSpan={4} className="py-2.5 px-4 text-right uppercase tracking-wider text-zinc-700">
                            Total Received (সর্বমোট জমা):
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-base text-emerald-700 whitespace-nowrap">
                            ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Customer Balance Breakdown Card (if dues available) */}
                  {(data.previousDue !== undefined || data.remainingDue !== undefined) && (
                    <div className="grid grid-cols-3 gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg mb-5 text-center">
                      <div className="p-2 bg-white rounded border border-emerald-100 shadow-2xs">
                        <span className="text-[10px] text-zinc-500 block uppercase font-medium">Previous Balance Due (পূর্বের বকেয়া)</span>
                        <strong className="text-sm font-mono text-zinc-800">৳{Number(data.previousDue || 0).toLocaleString()}</strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-emerald-200 shadow-2xs">
                        <span className="text-[10px] text-emerald-800 block uppercase font-bold">Collected Now (আজকের জমা)</span>
                        <strong className="text-base font-mono text-emerald-700">৳{Number(data.amount || 0).toLocaleString()}</strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-rose-200 shadow-2xs">
                        <span className="text-[10px] text-rose-800 block uppercase font-bold">Net Remaining Due (অবশিষ্ট বকেয়া)</span>
                        <strong className="text-sm font-mono text-rose-700">৳{Number(data.remainingDue || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                  )}

                  {/* Amount in words & Status Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg mb-8 text-xs">
                    <div>
                      <span className="text-zinc-500 font-medium">In Words (কথায়): </span>
                      <strong className="text-zinc-900 capitalize">{numberToEnglishWords(data.amount || 0)} Taka Only</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[11px]">Payment Status:</span>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded font-bold text-xs uppercase tracking-wider">
                        RECEIVED & CREDITED
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3-Part Commercial Authorization Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs mt-6 border-t border-zinc-200">
                  <div>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-zinc-400 font-mono">Payer / Customer</span>
                    </div>
                    <div className="border-t border-zinc-400 pt-1.5 text-zinc-700 font-medium">
                      জমাকারীর স্বাক্ষর (Customer Sign)
                    </div>
                  </div>
                  <div>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-zinc-400 font-mono">Entry Operator</span>
                    </div>
                    <div className="border-t border-zinc-400 pt-1.5 text-zinc-700 font-medium">
                      প্রস্তুতকারক (Prepared By)
                    </div>
                  </div>
                  <div>
                    {renderAuthorizedSignature('ক্যাশিয়ার / অনুমোদনকারী (Cashier / Receiver)', 'center', 'w-full')}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* FORMAT 3B: PAYMENT OUT / SUPPLIER DEBIT VOUCHER                           */}
          {/* ========================================================================= */}
          {type === 'PAYMENT_OUT_VOUCHER' && (
            printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM' ? (
              <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
                {/* Store Header */}
                <div className="text-center border-b border-dashed border-zinc-400 pb-2 mb-2">
                  {companySettings.logoUrl && (
                    <div className="mb-1 flex justify-center">
                      <img
                        src={companySettings.logoUrl}
                        alt={companySettings.name}
                        className="max-h-10 max-w-[130px] object-contain mx-auto"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <h2 className="text-base font-bold uppercase tracking-wider">{companySettings.name || 'DokanPro ERP'}</h2>
                  {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                  {companySettings.address && <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{companySettings.address}</p>}
                  {companySettings.phone && <p className="text-[10px] text-zinc-600">Tel: {companySettings.phone}</p>}
                </div>

                {/* Voucher Title */}
                <div className="text-center my-2 border-b-2 border-dashed border-black pb-1.5">
                  <div className="text-xs font-black uppercase tracking-wider">
                    *** PAYMENT DEBIT VOUCHER ***
                  </div>
                  <div className="text-[10px] text-zinc-700 font-bold">
                    (টাকা পরিশোধ ডেবিট ভাউচার)
                  </div>
                </div>

                {/* Meta Details */}
                <div className="space-y-1 mb-2 text-[11px] border-b border-dashed border-zinc-300 pb-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Voucher #:</span>
                    <span className="font-bold font-mono">{data.voucherNo || 'PAY-VOUCHER'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{data.date || printToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid To:</span>
                    <span className="font-bold text-zinc-900">{data.partyName || 'Supplier / Vendor'}</span>
                  </div>
                  {data.partyPhone && (
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span>{data.partyPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Paid From:</span>
                    <span className="font-semibold text-rose-700">{data.walletName || 'Main Cash'}</span>
                  </div>
                </div>

                {/* Purpose */}
                <div className="space-y-1 mb-2 text-[11px] border-b border-dashed border-zinc-300 pb-2">
                  <div className="text-[10px] text-zinc-700">
                    <span className="font-semibold text-zinc-600">Particulars: </span>
                    <span>{data.remarks || 'Supplier Bill Due Settlement'}</span>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="my-2 p-2 bg-amber-50 border border-amber-300 rounded text-center">
                  <div className="text-[10px] text-amber-900 font-bold uppercase tracking-wider">AMOUNT DISBURSED (পরিশোধিত টাকা)</div>
                  <div className="text-xl font-black font-mono text-amber-950 my-0.5">
                    ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-bold text-amber-900">
                    STATUS: PAID & DEBITED
                  </div>
                </div>

                {/* Remaining Due */}
                {data.remainingDue !== undefined && (
                  <div className="flex justify-between text-[10px] font-mono bg-zinc-50 p-2 rounded border border-zinc-200 mb-2">
                    <span className="text-zinc-600">Remaining Payable:</span>
                    <span className="font-bold text-zinc-900">৳{Number(data.remainingDue).toLocaleString()}</span>
                  </div>
                )}

                {/* In Words */}
                <div className="text-[10px] text-zinc-700 mb-3 border-b border-dashed border-zinc-300 pb-2">
                  <span className="font-bold">In Words: </span>
                  {numberToEnglishWords(data.amount || 0)} Taka Only
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-4 text-center text-[10px]">
                  <div>
                    <div className="h-6" />
                    <div className="border-t border-dashed border-zinc-600 pt-1 text-zinc-700 font-medium">Receiver's Sign</div>
                  </div>
                  <div>
                    <div className="h-6" />
                    <div className="border-t border-dashed border-zinc-600 pt-1 text-zinc-900 font-bold">Accountant / Cashier</div>
                  </div>
                </div>

                <div className="mt-3 pt-1 border-t border-dashed border-zinc-300 text-center text-[9px] text-zinc-500">
                  System Generated Debit Voucher • DokanPro ERP
                </div>
              </div>
            ) : (
              <div className="printable-voucher w-full max-w-[780px] bg-white text-zinc-900 p-6 sm:p-8 shadow-lg border border-zinc-200 rounded-xl text-xs print:shadow-none print:border-none print:p-4 font-sans flex flex-col justify-between">
                <div>
                  {/* Top Company Header */}
                  <div className="flex justify-between items-start border-b-2 pb-4 mb-4" style={{ borderColor: invoiceTheme.primary }}>
                    <div className="flex items-start gap-3.5">
                      {renderStoreLogo('h-14 w-auto object-contain shrink-0')}
                      <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-black font-serif">
                          {companySettings.name || 'DokanPro Business ERP'}
                        </h1>
                        {companySettings.nameBn && (
                          <p className="text-xs text-zinc-700 font-bold mt-0.5">{companySettings.nameBn}</p>
                        )}
                        {companySettings.address && (
                          <p className="text-xs text-zinc-600 mt-0.5">{companySettings.address}</p>
                        )}
                        <div className="text-[11px] text-zinc-600 mt-0.5 flex flex-wrap gap-x-3">
                          {companySettings.phone && <span><strong>Phone:</strong> {companySettings.phone}</span>}
                          {companySettings.email && <span><strong>Email:</strong> {companySettings.email}</span>}
                          {companySettings.taxNumber && <span><strong>BIN/VAT:</strong> {companySettings.taxNumber}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded inline-block shadow-2xs"
                        style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                      >
                        PAYMENT DEBIT VOUCHER
                      </div>
                      <div className="text-[11px] text-amber-700 font-bold mt-1">
                        টাকা পরিশোধ ডেবিট ভাউচার
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-1">
                        Voucher #: #{data.voucherNo || 'PAY-VOUCHER'}
                      </div>
                    </div>
                  </div>

                  {/* Voucher Meta Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-5 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Voucher / Ref #</span>
                      <strong className="font-mono text-zinc-900 text-sm">{data.voucherNo}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Payment Date</span>
                      <strong className="text-zinc-800 text-sm">{data.date || printToday}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Paid To (Supplier)</span>
                      <strong className="text-zinc-800 text-sm block truncate">{data.partyName || 'Supplier'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Paid Account (ওয়ালেট)</span>
                      <span className="font-bold text-rose-700 text-sm block truncate">{data.walletName || 'Main Cash'}</span>
                    </div>
                  </div>

                  {/* Structured Table */}
                  <div className="border border-zinc-200 rounded-lg overflow-hidden mb-5 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }} className="font-bold">
                          <th className="py-2.5 px-3 text-center w-10">#</th>
                          <th className="py-2.5 px-4">Payment Purpose & Particulars (পরিশোধের বিবরণ ও খাত)</th>
                          <th className="py-2.5 px-4">Supplier / Vendor Details (সরবরাহকারী)</th>
                          <th className="py-2.5 px-4">Payment Channel (মাধ্যম)</th>
                          <th className="py-2.5 px-4 text-right">Disbursed Amount (পরিশোধিত টাকা)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        <tr className="bg-white">
                          <td className="py-3.5 px-3 text-center font-mono text-zinc-500">1</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-sm text-zinc-900">
                              {data.remarks || 'Supplier Bill Due Settlement / Vendor Payment'}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              Payment disbursed to supplier against purchases/invoices.
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-zinc-900">{data.partyName || 'Supplier'}</div>
                            {data.partyPhone && (
                              <div className="text-[11px] text-zinc-600 font-mono mt-0.5">Tel: {data.partyPhone}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-rose-700">{data.walletName || 'Cash'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-zinc-950 whitespace-nowrap">
                            ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                          <td colSpan={4} className="py-2.5 px-4 text-right uppercase tracking-wider text-zinc-700">
                            Total Disbursed (মোট পরিশোধ):
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-base text-rose-700 whitespace-nowrap">
                            ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Amount in words & Status Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg mb-8 text-xs">
                    <div>
                      <span className="text-zinc-500 font-medium">In Words (কথায়): </span>
                      <strong className="text-zinc-900 capitalize">{numberToEnglishWords(data.amount || 0)} Taka Only</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[11px]">Payment Status:</span>
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded font-bold text-xs uppercase tracking-wider">
                        PAID & DEBITED
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3-Part Commercial Authorization Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs mt-6 border-t border-zinc-200">
                  <div>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-zinc-400 font-mono">Receiver / Vendor</span>
                    </div>
                    <div className="border-t border-zinc-400 pt-1.5 text-zinc-700 font-medium">
                      প্রাপকের স্বাক্ষর (Receiver's Sign)
                    </div>
                  </div>
                  <div>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-zinc-400 font-mono">Entry Operator</span>
                    </div>
                    <div className="border-t border-zinc-400 pt-1.5 text-zinc-700 font-medium">
                      প্রস্তুতকারক (Prepared By)
                    </div>
                  </div>
                  <div>
                    {renderAuthorizedSignature('হিসাবরক্ষক / অনুমোদনকারী (Accountant / Cashier)', 'center', 'w-full')}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* FORMAT 4: EMI INSTALLMENT RECEIPT                                         */}
          {/* ========================================================================= */}
          {type === 'EMI_RECEIPT' && (
            printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM' ? (
              <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
                {/* Store Header */}
                <div className="text-center border-b-2 border-black pb-2 mb-2">
                  <h2 className="text-base font-black uppercase tracking-wider">{companySettings.name}</h2>
                  {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                  <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{companySettings.address}</p>
                  <p className="text-[10px] text-zinc-800 font-bold">Tel: {companySettings.phone}</p>
                </div>

                <div className="text-center mb-2 border-b border-dashed border-zinc-400 pb-2">
                  <div className="text-xs font-black uppercase tracking-wider">
                    INSTALLMENT RECEIPT (কিস্তি রসিদ)
                  </div>
                  <div className="text-[10px] font-mono text-zinc-700 mt-0.5">
                    Receipt #: <strong>{data.receiptNo}</strong> | Date: {data.date}
                  </div>
                </div>

                <div className="space-y-1 text-[11px] mb-2 border-b border-dashed border-zinc-400 pb-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Scheme #:</span>
                    <strong className="font-mono">{data.schemeNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Installment #:</span>
                    <strong className="font-mono">#{data.installmentNo} {data.totalInstallments ? `of ${data.totalInstallments}` : ''}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Customer:</span>
                    <span className="font-bold">{data.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Phone:</span>
                    <span>{data.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Item:</span>
                    <span className="font-semibold">{data.productName}</span>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-1 text-[11px] mb-3 border-b border-dashed border-zinc-400 pb-2">
                  <div className="flex justify-between">
                    <span>EMI Amount:</span>
                    <span className="font-mono">৳{Number(data.amount || 0).toLocaleString()}</span>
                  </div>
                  {Number(data.penalty || 0) > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Late Penalty / Fine:</span>
                      <span className="font-mono">+৳{Number(data.penalty).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t border-black pt-1 mt-1 text-black">
                    <span>TOTAL PAID:</span>
                    <span className="font-mono text-base">৳{Number(data.totalCollected || data.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600">
                    <span>Payment Mode:</span>
                    <span>{data.walletName || 'Cash'} ({data.paymentMethod || 'Cash'})</span>
                  </div>
                </div>

                {/* Account Balance Summary */}
                {(data.totalSchemeAmount || data.remainingDue !== undefined) && (
                  <div className="space-y-1 text-[10px] bg-zinc-50 p-2 rounded border border-zinc-200 mb-3 font-mono">
                    {data.totalSchemeAmount && (
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Total Scheme Price:</span>
                        <span>৳{Number(data.totalSchemeAmount).toLocaleString()}</span>
                      </div>
                    )}
                    {data.totalPaidSoFar !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Total Paid So Far:</span>
                        <span>৳{Number(data.totalPaidSoFar).toLocaleString()}</span>
                      </div>
                    )}
                    {data.remainingDue !== undefined && (
                      <div className="flex justify-between font-bold text-rose-800 border-t border-dashed border-zinc-300 pt-1">
                        <span>Remaining Due:</span>
                        <span>৳{Number(data.remainingDue).toLocaleString()}</span>
                      </div>
                    )}
                    {data.nextDueDate && Number(data.remainingDue || 0) > 0 && (
                      <div className="flex justify-between text-zinc-700 font-semibold">
                        <span>Next Due Date:</span>
                        <span>{data.nextDueDate}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-4 text-[10px] text-center border-t border-zinc-300">
                  <div>
                    <div className="h-6" />
                    <div className="border-t border-zinc-400 pt-0.5 text-zinc-600">Customer Sign</div>
                  </div>
                  <div>
                    <div className="h-6" />
                    <div className="border-t border-zinc-400 pt-0.5 text-zinc-600">Collector Sign</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2 text-center text-[9px] text-zinc-500 border-t border-dashed border-zinc-300">
                  Thank you for your installment payment!
                </div>
              </div>
            ) : (
              <div className="printable-report w-full max-w-[800px] bg-white text-zinc-900 p-8 shadow-xl border border-zinc-200 rounded-lg text-sm print:shadow-none print:border-none print:p-6 print:w-full print:max-w-none">
                {/* Header with Logo and Company Info */}
                <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4 mb-5">
                  <div className="flex items-start gap-4">
                    {companySettings.logoUrl ? (
                      <img
                        src={companySettings.logoUrl}
                        alt={companySettings.name || 'Store Logo'}
                        className="h-14 w-auto object-contain shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        className="px-3 py-2 flex items-center justify-center rounded-xs"
                        style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                      >
                        <span className="text-xl font-serif font-black tracking-wider">
                          {companySettings.name ? companySettings.name.slice(0, 3).toUpperCase() : 'POS'}
                        </span>
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-bold uppercase tracking-wide text-black font-serif">
                        {companySettings.name || 'DokanPro ERP'}
                      </h1>
                      {companySettings.nameBn && (
                        <p className="text-xs text-zinc-700 font-bold mt-0.5">{companySettings.nameBn}</p>
                      )}
                      {companySettings.address && (
                        <p className="text-xs text-zinc-600 mt-0.5">{companySettings.address}</p>
                      )}
                      {companySettings.phone && (
                        <p className="text-xs text-zinc-600">
                          Phone: {companySettings.phone} {companySettings.email ? `• Email: ${companySettings.email}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className="inline-block px-3 py-1.5 text-xs font-black tracking-wider uppercase rounded-xs shadow-2xs"
                      style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                    >
                      INSTALLMENT PAYMENT RECEIPT
                    </div>
                    <p className="text-[11px] text-zinc-600 font-bold mt-1">(কিস্তি জমা রসিদ)</p>
                    <div className="mt-2 text-xs text-zinc-700 font-mono">
                      <div>Receipt No: <strong className="text-black">{data.receiptNo}</strong></div>
                      <div>Date: <strong className="text-black">{data.date}</strong></div>
                    </div>
                  </div>
                </div>

                {/* 2-Column Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Left: Scheme & Payment Info */}
                  <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-xs space-y-2">
                    <div className="font-bold text-zinc-800 border-b pb-1 text-[11px] uppercase tracking-wide flex justify-between">
                      <span>Agreement Details</span>
                      <span className="text-indigo-600 font-mono">#{data.schemeNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Scheme No:</span>
                      <strong className="font-mono text-zinc-900">{data.schemeNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Installment Serial:</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        #{data.installmentNo} {data.totalInstallments ? `of ${data.totalInstallments}` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Payment Date:</span>
                      <span>{data.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Collection Account:</span>
                      <span className="font-medium text-zinc-800">{data.walletName || 'Main Cash Drawer'} ({data.paymentMethod || 'Cash'})</span>
                    </div>
                  </div>

                  {/* Right: Customer Info */}
                  <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-xs space-y-2">
                    <div className="font-bold text-zinc-800 border-b pb-1 text-[11px] uppercase tracking-wide">
                      Customer Info (গ্রাহকের বিবরণ)
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Customer Name:</span>
                      <strong className="text-zinc-900">{data.customerName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Phone Number:</span>
                      <span className="font-mono font-medium">{data.customerPhone}</span>
                    </div>
                    {data.customerAddress && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Address:</span>
                        <span className="text-right truncate max-w-[180px]">{data.customerAddress}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Purchased Item:</span>
                      <strong className="text-indigo-900">{data.productName}</strong>
                    </div>
                  </div>
                </div>

                {/* Payment Voucher Table */}
                <div className="border border-zinc-200 rounded-lg overflow-hidden mb-6">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr
                        className="font-bold text-xs"
                        style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                      >
                        <th className="py-2.5 px-4">Description (বিবরণ)</th>
                        <th className="py-2.5 px-4 text-center">Scheme #</th>
                        <th className="py-2.5 px-4 text-center">Inst #</th>
                        <th className="py-2.5 px-4 text-right">Amount (টাকা)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      <tr>
                        <td className="py-3 px-4 font-semibold text-zinc-800">
                          Installment Principal Collection ({data.productName})
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-600">{data.schemeNumber}</td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-zinc-800">#{data.installmentNo}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                          ৳ {Number(data.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                      {Number(data.penalty || 0) > 0 && (
                        <tr className="bg-rose-50/50 text-rose-800">
                          <td className="py-2 px-4 font-semibold">Late Payment Penalty / Fine (বিলম্ব ফি)</td>
                          <td className="py-2 px-4 text-center font-mono">-</td>
                          <td className="py-2 px-4 text-center font-mono">-</td>
                          <td className="py-2 px-4 text-right font-mono font-bold">+৳ {Number(data.penalty).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-indigo-50/80 border-t-2 border-indigo-200 text-indigo-950 font-bold">
                        <td colSpan={3} className="py-3 px-4 text-right text-sm">
                          TOTAL AMOUNT COLLECTED (সর্বমোট আদায়):
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-lg text-indigo-900">
                          ৳ {Number(data.totalCollected || data.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Amount In Words & Account Statement Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {/* Amount in words */}
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-1">
                    <div className="text-zinc-500 font-bold uppercase text-[10px]">In Words (কথায়):</div>
                    <div className="font-bold text-zinc-800 italic">
                      {numberToEnglishWords(data.totalCollected || data.amount || 0)} Taka Only
                    </div>
                    {data.notes && (
                      <div className="pt-2 mt-2 border-t text-[11px] text-zinc-600">
                        <strong>Notes:</strong> {data.notes}
                      </div>
                    )}
                  </div>

                  {/* EMI Account Summary */}
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs space-y-1.5">
                    <div className="font-bold text-emerald-900 uppercase text-[10px] border-b border-emerald-200 pb-1">
                      EMI Account Statement Summary
                    </div>
                    <div className="flex justify-between text-zinc-700">
                      <span>Total Scheme Value:</span>
                      <span className="font-mono font-bold">৳ {Number(data.totalSchemeAmount || data.totalPrice || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-700">
                      <span>Total Paid So Far (সহ বর্তমান):</span>
                      <span className="font-mono text-emerald-700 font-bold">৳ {Number(data.totalPaidSoFar || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-800 font-bold border-t border-emerald-200 pt-1">
                      <span>Remaining Due Balance:</span>
                      <span className="font-mono text-sm">৳ {Number(data.remainingDue || 0).toLocaleString()}</span>
                    </div>
                    {data.nextDueDate && Number(data.remainingDue || 0) > 0 && (
                      <div className="flex justify-between text-zinc-600 font-semibold text-[11px] pt-0.5">
                        <span>Next Due Date:</span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">{data.nextDueDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs">
                  <div>
                    <div className="h-10" />
                    <div className="border-t border-zinc-400 pt-1 text-zinc-700 font-medium">Customer's Signature</div>
                  </div>
                  <div>
                    <div className="h-10" />
                    <div className="border-t border-zinc-400 pt-1 text-zinc-800 font-semibold">Collector / Cashier</div>
                  </div>
                  <div>
                    {renderAuthorizedSignature('Authorized Officer', 'center', 'w-full')}
                  </div>
                </div>

                {/* Footer Note */}
                <div className="mt-8 pt-3 border-t border-zinc-200 text-center text-[10px] text-zinc-500">
                  <p>কিস্তি পরিশোধের জন্য আপনাকে ধন্যবাদ। সময়মতো পরবর্তী কিস্তির টাকা পরিশোধ করুন।</p>
                  <p className="mt-0.5 text-[9px] text-zinc-400">Software Generated Receipt • DokanPro ERP</p>
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* FORMAT 5: SALARY PAYSLIP */}
          {/* ========================================================================= */}
          {type === 'PAYSLIP' && (
            <div className="printable-voucher w-full max-w-[650px] bg-white text-zinc-900 p-8 shadow-md border border-zinc-200 rounded-lg text-sm print:shadow-none print:border-none">
              <div className="text-center border-b border-zinc-200 pb-4 mb-4">
                {companySettings.logoUrl && (
                  <div className="mb-2 flex justify-center">
                    <img src={companySettings.logoUrl} alt="Logo" className="h-12 w-auto object-contain mx-auto" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                  </div>
                )}
                <h2 className="text-xl font-bold uppercase font-serif text-black">{companySettings.name || 'DokanPro ERP'}</h2>
                {companySettings.nameBn && <p className="text-xs text-zinc-600 font-bold">{companySettings.nameBn}</p>}
                <p className="text-xs text-zinc-500">{companySettings.address}</p>
                <div className="inline-block mt-2 px-3 py-1 bg-zinc-900 text-white text-xs font-bold rounded">
                  SALARY PAYSLIP - {data.payrollMonth}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 p-4 rounded mb-6">
                <div>
                  <div>Employee: <strong>{data.employeeName}</strong></div>
                  <div className="text-zinc-500 mt-1">Code: {data.employeeCode}</div>
                  <div className="text-zinc-500">Designation: {data.designation}</div>
                </div>
                <div className="text-right">
                  <div>Voucher No: <strong className="font-mono">{data.voucherNo}</strong></div>
                  <div className="text-zinc-500 mt-1">Payment Date: {data.paymentDate || data.createdAt?.split(' ')[0]}</div>
                  <div className="text-zinc-500">Disbursed From: {data.walletName}</div>
                  {data.installmentNo && (
                    <div className="text-blue-600 font-bold mt-0.5">
                      {data.installmentNo === 1 ? '1st Installment' : `${data.installmentNo}nd/Final Installment (Due Settlement)`}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-xs mb-6">
                {/* Earnings */}
                <div className="border border-zinc-200 rounded p-3">
                  <h4 className="font-bold text-emerald-800 uppercase text-[11px] mb-2 border-b pb-1">Earnings</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span>Basic Salary:</span>
                      <span className="font-mono">৳{data.baseSalary?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Allowances:</span>
                      <span className="font-mono">৳{data.allowances?.toLocaleString()}</span>
                    </div>
                    {data.bonus > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Performance Bonus:</span>
                        <span className="font-mono">+৳{data.bonus?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-1 text-zinc-900">
                      <span>Gross Pay:</span>
                      <span className="font-mono">৳{data.grossPay?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-zinc-200 rounded p-3">
                  <h4 className="font-bold text-rose-800 uppercase text-[11px] mb-2 border-b pb-1">Deductions</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span>Advance Deduction:</span>
                      <span className="font-mono text-rose-600">
                        {data.advanceDeduction > 0 ? `-৳${data.advanceDeduction?.toLocaleString()}` : '৳0'}
                      </span>
                    </div>
                    {data.fineDeduction > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Fine / Penalty:</span>
                        <span className="font-mono">-৳{data.fineDeduction?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-1 text-rose-800">
                      <span>Total Deductions:</span>
                      <span className="font-mono">৳{((data.advanceDeduction || 0) + (data.fineDeduction || 0))?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay & Settlement Summary */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded mb-8 space-y-2">
                <div className="flex justify-between items-center text-xs text-zinc-700 pb-2 border-b border-emerald-200">
                  <span>Total Net Payable for Month:</span>
                  <span className="font-mono font-bold">
                    ৳{(data.payableAmount ?? (data.grossPay - (data.advanceDeduction || 0)))?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs font-semibold text-emerald-900">DISBURSED IN THIS VOUCHER</div>
                    <div className="text-2xl font-black text-emerald-800 font-mono">
                      ৳{(data.paidAmount ?? data.netPay)?.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    {(data.dueAmount ?? 0) === 0 ? (
                      <span className="text-xs px-3 py-1 bg-emerald-200 text-emerald-900 font-bold rounded inline-block">
                        PAID IN FULL ✓
                      </span>
                    ) : (
                      <span className="text-xs px-3 py-1 bg-amber-200 text-amber-900 font-bold rounded inline-block">
                        PARTIAL PAID (Due: ৳{data.dueAmount?.toLocaleString()})
                      </span>
                    )}
                    {(data.dueAmount ?? 0) > 0 && (
                      <div className="text-[11px] text-rose-700 font-bold mt-1">
                        Remaining Due: ৳{data.dueAmount?.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                {data.notes && (
                  <div className="text-[11px] text-zinc-500 pt-1 border-t border-emerald-200">
                    Note: {data.notes}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-12 pt-6 text-center text-xs">
                <div className="text-center">
                  <div className="h-10" />
                  <div className="border-t border-zinc-400 pt-1 text-zinc-600 font-medium">Employee Signature</div>
                </div>
                <div className="text-center">
                  {renderAuthorizedSignature('Director / HR Head', 'center', 'w-full')}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMAT 6: EXPENSE VOUCHER (THERMAL 80MM & COMMERCIAL A4 DEBIT VOUCHER)     */}
          {/* ========================================================================= */}
          {type === 'EXPENSE_VOUCHER' && (
            printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM' ? (
              <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
                {/* Store Header */}
                <div className="text-center border-b border-dashed border-zinc-400 pb-2 mb-2">
                  {companySettings.logoUrl && (
                    <div className="mb-1 flex justify-center">
                      <img
                        src={companySettings.logoUrl}
                        alt={companySettings.name}
                        className="max-h-10 max-w-[130px] object-contain mx-auto"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <h2 className="text-base font-bold uppercase tracking-wider">{companySettings.name || 'DokanPro ERP'}</h2>
                  {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                  {companySettings.address && <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{companySettings.address}</p>}
                  {companySettings.phone && <p className="text-[10px] text-zinc-600">Tel: {companySettings.phone}</p>}
                </div>

                {/* Voucher Title */}
                <div className="text-center my-2 border-b-2 border-dashed border-black pb-1.5">
                  <div className="text-xs font-black uppercase tracking-wider">
                    *** EXPENSE DEBIT VOUCHER ***
                  </div>
                  <div className="text-[10px] text-zinc-700 font-bold">
                    (দোকান খরচ ডেবিট ভাউচার)
                  </div>
                </div>

                {/* Voucher Meta */}
                <div className="space-y-1 mb-2 text-[11px] border-b border-dashed border-zinc-300 pb-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Voucher #:</span>
                    <span className="font-bold font-mono">{data.voucherNo || data.receiptNo || 'EXP-VOUCHER'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{data.date || printToday}</span>
                  </div>
                  {data.receiptNo && data.receiptNo !== data.voucherNo && (
                    <div className="flex justify-between">
                      <span>Receipt/Ref #:</span>
                      <span className="font-mono">{data.receiptNo}</span>
                    </div>
                  )}
                </div>

                {/* Expense Breakdown Details */}
                <div className="space-y-1.5 mb-2 text-[11px] border-b border-dashed border-zinc-300 pb-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Category (খাত):</span>
                    <strong className="text-zinc-900">{data.categoryName || data.category || 'General Expense'}</strong>
                  </div>
                  {data.payee && data.payee !== '-' && (
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Paid To (প্রাপক):</span>
                      <span className="font-semibold">{data.payee}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Disbursed From:</span>
                    <span className="font-semibold text-rose-700">{data.walletName || data.wallet || 'Main Cash'}</span>
                  </div>
                  {(data.note || data.remarks || data.notes) && (
                    <div className="pt-1 text-[10px] text-zinc-700">
                      <span className="font-semibold text-zinc-600">Particulars: </span>
                      <span className="italic">{data.note || data.remarks || data.notes}</span>
                    </div>
                  )}
                </div>

                {/* Amount Box */}
                <div className="my-2 p-2 bg-zinc-100 border border-zinc-300 rounded text-center">
                  <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">TOTAL DEBIT AMOUNT (টাকার পরিমাণ)</div>
                  <div className="text-xl font-black font-mono text-zinc-950 my-0.5">
                    ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-bold text-rose-800">
                    STATUS: PAID & DEBITED
                  </div>
                </div>

                {/* In Words */}
                <div className="text-[10px] text-zinc-700 mb-4 border-b border-dashed border-zinc-300 pb-2">
                  <span className="font-bold">In Words: </span>
                  {numberToEnglishWords(data.amount || 0)} Taka Only
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-4 text-center text-[10px]">
                  <div>
                    <div className="h-6" />
                    <div className="border-t border-dashed border-zinc-600 pt-1 text-zinc-700 font-medium">Receiver's Sign</div>
                  </div>
                  <div>
                    <div className="h-6" />
                    <div className="border-t border-dashed border-zinc-600 pt-1 text-zinc-900 font-bold">Cashier / Accounts</div>
                  </div>
                </div>

                <div className="mt-3 pt-1 border-t border-dashed border-zinc-300 text-center text-[9px] text-zinc-500">
                  System Generated Debit Voucher • DokanPro ERP
                </div>
              </div>
            ) : (
              <div className="printable-voucher w-full max-w-[780px] bg-white text-zinc-900 p-6 sm:p-8 shadow-lg border border-zinc-200 rounded-xl text-xs print:shadow-none print:border-none print:p-4 font-sans flex flex-col justify-between">
                <div>
                  {/* Top Company Header */}
                  <div className="flex justify-between items-start border-b-2 pb-4 mb-4" style={{ borderColor: invoiceTheme.primary }}>
                    <div className="flex items-start gap-3.5">
                      {renderStoreLogo('h-14 w-auto object-contain shrink-0')}
                      <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-black font-serif">
                          {companySettings.name || 'DokanPro Business ERP'}
                        </h1>
                        {companySettings.nameBn && (
                          <p className="text-xs text-zinc-700 font-bold mt-0.5">{companySettings.nameBn}</p>
                        )}
                        {companySettings.address && (
                          <p className="text-xs text-zinc-600 mt-0.5">{companySettings.address}</p>
                        )}
                        <div className="text-[11px] text-zinc-600 mt-0.5 flex flex-wrap gap-x-3">
                          {companySettings.phone && <span><strong>Phone:</strong> {companySettings.phone}</span>}
                          {companySettings.email && <span><strong>Email:</strong> {companySettings.email}</span>}
                          {companySettings.taxNumber && <span><strong>BIN/VAT:</strong> {companySettings.taxNumber}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded inline-block shadow-2xs"
                        style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                      >
                        EXPENSE DEBIT VOUCHER
                      </div>
                      <div className="text-[11px] text-rose-700 font-bold mt-1">
                        খরচের ডেবিট ভাউচার
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-1">
                        Ref: #{data.voucherNo || data.receiptNo || 'EXP-VOUCHER'}
                      </div>
                    </div>
                  </div>

                  {/* Voucher Meta Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-5 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Voucher Number</span>
                      <strong className="font-mono text-zinc-900 text-sm">{data.voucherNo || data.receiptNo}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Date of Expense</span>
                      <strong className="text-zinc-800 text-sm">{data.date || printToday}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Money Receipt / Ref #</span>
                      <strong className="font-mono text-zinc-800 text-sm">{data.receiptNo || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Paid Account (ওয়ালেট)</span>
                      <span className="font-bold text-rose-700 text-sm block truncate">{data.walletName || data.wallet || 'Main Cash'}</span>
                    </div>
                  </div>

                  {/* Structured Voucher Particulars Table */}
                  <div className="border border-zinc-200 rounded-lg overflow-hidden mb-5 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }} className="font-bold">
                          <th className="py-2.5 px-3 text-center w-10">#</th>
                          <th className="py-2.5 px-4">Expense Head & Purpose (খরচের খাত ও বিবরণ)</th>
                          <th className="py-2.5 px-4">Payee / Beneficiary (প্রাপক)</th>
                          <th className="py-2.5 px-4">Disbursed From (মাধ্যম)</th>
                          <th className="py-2.5 px-4 text-right">Debit Amount (টাকা)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        <tr className="bg-white">
                          <td className="py-3.5 px-3 text-center font-mono text-zinc-500">1</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-sm text-zinc-900">
                              {data.categoryName || data.category || 'General Operating Expense'}
                            </div>
                            {(data.note || data.remarks || data.notes) && (
                              <p className="text-xs text-zinc-600 mt-1 leading-relaxed italic bg-zinc-50 p-1.5 rounded border border-zinc-100">
                                {data.note || data.remarks || data.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-zinc-800">
                            {data.payee || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-zinc-800">{data.walletName || data.wallet || 'Cash'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-zinc-950 whitespace-nowrap">
                            ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                          <td colSpan={4} className="py-2.5 px-4 text-right uppercase tracking-wider text-zinc-700">
                            Net Debited Total (মোট খরচ):
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-base text-rose-700 whitespace-nowrap">
                            ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Amount in words & Paid Status Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg mb-8 text-xs">
                    <div>
                      <span className="text-zinc-500 font-medium">In Words (কথায়): </span>
                      <strong className="text-zinc-900 capitalize">{numberToEnglishWords(data.amount || 0)} Taka Only</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[11px]">Payment Status:</span>
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-200 rounded font-bold text-xs uppercase tracking-wider">
                        PAID & DEBITED
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3-Part Commercial Authorization Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs mt-6 border-t border-zinc-200">
                  <div>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-zinc-400 font-mono">Verified Entry</span>
                    </div>
                    <div className="border-t border-zinc-400 pt-1.5 text-zinc-700 font-medium">
                      প্রস্তুতকারক (Prepared By)
                    </div>
                  </div>
                  <div>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-zinc-400 font-mono">{data.payee ? `Payee: ${data.payee}` : ''}</span>
                    </div>
                    <div className="border-t border-zinc-400 pt-1.5 text-zinc-700 font-medium">
                      প্রাপকের স্বাক্ষর (Receiver's Sign)
                    </div>
                  </div>
                  <div>
                    {renderAuthorizedSignature('হিসাবরক্ষক / অনুমোদনকারী (Cashier / Approved)', 'center', 'w-full')}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* FORMAT 6B: CASH ADJUSTMENT VOUCHER (CAPITAL INJECTION / DRAWING)          */}
          {/* ========================================================================= */}
          {type === 'CASH_ADJUSTMENT_VOUCHER' && (
            <div className="printable-voucher w-full max-w-[650px] bg-white text-zinc-900 p-8 shadow-md border border-zinc-200 rounded-lg text-sm print:shadow-none print:border-none">
              <div className="text-center border-b border-zinc-200 pb-4 mb-4">
                {companySettings.logoUrl && (
                  <div className="mb-2 flex justify-center">
                    <img src={companySettings.logoUrl} alt="Logo" className="h-12 w-auto object-contain mx-auto" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                  </div>
                )}
                <h2 className="text-xl font-bold uppercase font-serif text-black">{companySettings.name || 'DokanPro ERP'}</h2>
                {companySettings.nameBn && <p className="text-xs text-zinc-600 font-bold">{companySettings.nameBn}</p>}
                <p className="text-xs text-zinc-600">{companySettings.address}</p>
                <p className="text-xs text-zinc-500">Phone: {companySettings.phone}</p>
                <div className={`inline-block mt-2 px-3 py-1 text-xs font-bold rounded uppercase ${
                  data.type === 'CASH_ADD' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                }`}>
                  {data.type === 'CASH_ADD' ? 'CAPITAL DEPOSIT VOUCHER (মূলধন জমা ভাউচার)' : 'OWNER DRAWING VOUCHER (মালিকের উত্তোলন ভাউচার)'}
                </div>
              </div>

              <div className="flex justify-between text-xs mb-4">
                <div>Voucher No: <strong className="font-mono">{data.voucherNo}</strong></div>
                <div>Date & Time: <strong>{data.date} {data.time || ''}</strong></div>
              </div>

              <div className="space-y-2.5 bg-zinc-50 p-4 rounded border border-zinc-200 text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Adjustment Nature / Type:</span>
                  <span className={`font-bold ${data.type === 'CASH_ADD' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {data.type === 'CASH_ADD' ? 'CASH ADD (দোকানের মূলধন জমা)' : 'CASH WITHDRAW (মালিকের ব্যক্তিগত উত্তোলন)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Target Account / Wallet:</span>
                  <span className="font-bold text-zinc-900">{data.walletName}</span>
                </div>
                {data.accountNumber && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Account Number:</span>
                    <span className="font-mono">{data.accountNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">Reason / Description:</span>
                  <span className="font-medium text-zinc-800 italic">{data.reason || 'Owner capital adjustment'}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-2">
                  <span className="text-zinc-500">Authorized / Processed By:</span>
                  <span className="font-bold text-zinc-900">{data.authorizedBy || 'Admin'}</span>
                </div>
              </div>

              <div className={`p-4 border rounded flex justify-between items-center mb-4 ${
                data.type === 'CASH_ADD' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
              }`}>
                <div>
                  <div className={`text-xs font-semibold ${data.type === 'CASH_ADD' ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {data.type === 'CASH_ADD' ? 'Total Amount Deposited (জমা টাকা)' : 'Total Amount Withdrawn (উত্তোলিত টাকা)'}
                  </div>
                  <div className={`text-2xl font-black font-mono ${data.type === 'CASH_ADD' ? 'text-emerald-950' : 'text-rose-950'}`}>
                    ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className={`inline-block px-2.5 py-1 font-bold rounded ${
                    data.type === 'CASH_ADD' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                  }`}>
                    {data.type === 'CASH_ADD' ? 'CREDITED TO ACCOUNT' : 'DEBITED FROM ACCOUNT'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-zinc-600 mb-8 border-b border-dashed border-zinc-300 pb-3">
                <strong>Amount in Words:</strong> {numberToEnglishWords(data.amount || 0)} Taka Only
              </div>

              <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
                <div>
                  <div className="h-10" />
                  <div className="border-t border-zinc-400 pt-1 text-zinc-600 font-medium">Depositor / Receiver Sign</div>
                </div>
                <div>
                  <div className="h-10" />
                  <div className="border-t border-zinc-400 pt-1 font-semibold text-zinc-800">Cashier / Accountant</div>
                </div>
                <div>
                  {renderAuthorizedSignature('Managing Director', 'center', 'w-full')}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMAT 6C: INTER-ACCOUNT WALLET TRANSFER VOUCHER                         */}
          {/* ========================================================================= */}
          {type === 'WALLET_TRANSFER_VOUCHER' && (
            <div className="printable-voucher w-full max-w-[650px] bg-white text-zinc-900 p-8 shadow-md border border-zinc-200 rounded-lg text-sm print:shadow-none print:border-none">
              <div className="text-center border-b border-zinc-200 pb-4 mb-4">
                {companySettings.logoUrl && (
                  <div className="mb-2 flex justify-center">
                    <img src={companySettings.logoUrl} alt="Logo" className="h-12 w-auto object-contain mx-auto" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                  </div>
                )}
                <h2 className="text-xl font-bold uppercase font-serif text-black">{companySettings.name || 'DokanPro ERP'}</h2>
                {companySettings.nameBn && <p className="text-xs text-zinc-600 font-bold">{companySettings.nameBn}</p>}
                <p className="text-xs text-zinc-600">{companySettings.address}</p>
                <p className="text-xs text-zinc-500">Phone: {companySettings.phone}</p>
                <div className="inline-block mt-2 px-3 py-1 bg-indigo-50 text-indigo-900 text-xs font-bold rounded uppercase">
                  INTER-ACCOUNT TRANSFER SLIP (আন্তঃঅ্যাকাউন্ট ফান্ড ট্রান্সফার ভাউচার)
                </div>
              </div>

              <div className="flex justify-between text-xs mb-4">
                <div>Transfer Ref / Voucher: <strong className="font-mono">{data.voucherNo || 'TRF-' + Date.now().toString().slice(-6)}</strong></div>
                <div>Date & Time: <strong>{data.date} {data.time || ''}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-rose-50 border border-rose-200 rounded p-3 text-xs space-y-1">
                  <div className="font-bold text-rose-800 uppercase tracking-wider text-[10px]">Source Account (টাকা কাটা হয়েছে - DEBIT)</div>
                  <div className="text-sm font-bold text-zinc-900">{data.fromWalletName}</div>
                  {data.fromWalletAccount && <div className="text-zinc-600 font-mono text-[11px]">A/C: {data.fromWalletAccount}</div>}
                  {data.fromWalletType && <div className="text-[10px] text-rose-600 font-semibold">{data.fromWalletType}</div>}
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs space-y-1">
                  <div className="font-bold text-emerald-800 uppercase tracking-wider text-[10px]">Destination Account (টাকা জমা হয়েছে - CREDIT)</div>
                  <div className="text-sm font-bold text-zinc-900">{data.toWalletName}</div>
                  {data.toWalletAccount && <div className="text-zinc-600 font-mono text-[11px]">A/C: {data.toWalletAccount}</div>}
                  {data.toWalletType && <div className="text-[10px] text-emerald-600 font-semibold">{data.toWalletType}</div>}
                </div>
              </div>

              <div className="space-y-2 bg-zinc-50 p-3.5 rounded border border-zinc-200 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Transfer Note / Remarks:</span>
                  <span className="font-medium text-zinc-800 italic">{data.note || data.remarks || 'Inter-account liquid balance re-allocation'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Transferred By:</span>
                  <span className="font-bold text-zinc-900">{data.authorizedBy || 'System Admin'}</span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded flex justify-between items-center mb-4">
                <div>
                  <div className="text-xs text-indigo-800 font-semibold">Total Transferred Amount (স্থানান্তরিত মোট টাকা)</div>
                  <div className="text-2xl font-black text-indigo-950 font-mono">
                    ৳ {Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="inline-block px-2.5 py-1 bg-indigo-200 text-indigo-900 font-bold rounded">
                    TRANSFER COMPLETED
                  </span>
                </div>
              </div>

              <div className="text-xs text-zinc-600 mb-8 border-b border-dashed border-zinc-300 pb-3">
                <strong>Amount in Words:</strong> {numberToEnglishWords(data.amount || 0)} Taka Only
              </div>

              <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
                <div>
                  <div className="h-10" />
                  <div className="border-t border-zinc-400 pt-1 text-zinc-600 font-medium">Disbursed By</div>
                </div>
                <div>
                  <div className="h-10" />
                  <div className="border-t border-zinc-400 pt-1 font-semibold text-zinc-800">Accountant / Cashier</div>
                </div>
                <div>
                  {renderAuthorizedSignature('Authorized Officer', 'center', 'w-full')}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMAT 7: PRODUCT LIST & INVENTORY VALUATION CATALOG                     */}
          {/* ========================================================================= */}
          {type === 'PRODUCT_LIST' && (
            printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM' ? (
              <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
                {/* Store Header */}
                <div className="text-center border-b-2 border-black pb-2 mb-2">
                  <h2 className="text-base font-black uppercase tracking-wider">{companySettings.name}</h2>
                  {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                  <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{companySettings.address}</p>
                  <p className="text-[10px] text-zinc-800 font-bold">Tel: {companySettings.phone}</p>
                </div>

                <div className="text-center mb-2 border-b border-dashed border-zinc-400 pb-2">
                  <div className="text-xs font-black uppercase tracking-wider">
                    {data.reportHeading || title || 'STOCK VALUATION REPORT'}
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    Date: {data.generatedDate || printToday} • Items: {data.products?.length || 0}
                  </div>
                </div>

                {/* Stock Table */}
                <table className="w-full text-left mb-3 text-[11px]">
                  <thead>
                    <tr className="border-b border-black font-bold">
                      <th className="py-1">Item / SKU</th>
                      <th className="py-1 text-center">Stock</th>
                      <th className="py-1 text-right">Cost</th>
                      <th className="py-1 text-right">Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-zinc-200">
                    {data.products?.map((p: any, idx: number) => {
                      const cost = Number(p.purchasePrice || 0);
                      const stock = Number(p.stock || 0);
                      const val = cost * stock;
                      return (
                        <tr key={p.id || idx} className="align-top">
                          <td className="py-1 pr-1">
                            <div className="font-semibold leading-tight">{p.name}</div>
                            {p.sku && <div className="text-[9px] text-zinc-500 font-mono">SKU: {p.sku}</div>}
                          </td>
                          <td className="py-1 text-center whitespace-nowrap font-bold">
                            {stock} {p.unit || 'pcs'}
                          </td>
                          <td className="py-1 text-right whitespace-nowrap">৳{cost.toLocaleString()}</td>
                          <td className="py-1 text-right font-medium whitespace-nowrap">৳{val.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Summary Totals */}
                <div className="border-t-2 border-black pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span>Total Stock Units:</span>
                    <span>{data.totalUnits?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t border-dashed border-zinc-400 pt-1">
                    <span>Total Cost Value:</span>
                    <span>৳{Number(data.totalCostValue || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-2 border-t border-dashed border-zinc-400 text-center text-[9px] text-zinc-500">
                  The report is computer generated and no signature is required.
                </div>
              </div>
            ) : (
              <div className={`printable-report w-full ${printOrientation === 'LANDSCAPE' ? 'max-w-[1200px]' : 'max-w-[950px]'} bg-white text-black p-8 md:p-10 shadow-xl border border-zinc-200 rounded-sm font-sans flex flex-col justify-between min-h-[1080px] print:shadow-none print:border-none print:p-6 print:w-full print:max-w-none print:min-h-screen`}>
                <div>
                  {/* Top Header */}
                  <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-3 mb-4">
                    <div className="flex items-start gap-3">
                      {companySettings.logoUrl ? (
                        <img
                          src={companySettings.logoUrl}
                          alt={companySettings.name || 'Store Logo'}
                          className="h-12 w-auto object-contain shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div
                          className="px-2.5 py-1.5 flex items-center justify-center rounded-xs"
                          style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                        >
                          <span className="text-base font-serif font-black tracking-wider">
                            {companySettings.name ? companySettings.name.slice(0, 3).toUpperCase() : 'POS'}
                          </span>
                        </div>
                      )}
                      <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-black font-serif">
                          {companySettings.name || 'DokanPro ERP'}
                        </h1>
                        {companySettings.nameBn && (
                          <p className="text-xs text-zinc-700 font-bold">{companySettings.nameBn}</p>
                        )}
                        {companySettings.address && (
                          <p className="text-xs text-zinc-700">{companySettings.address}</p>
                        )}
                        {companySettings.phone && (
                          <p className="text-xs text-zinc-700">
                            Phone: {companySettings.phone} {companySettings.email ? `• ${companySettings.email}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-zinc-800 font-semibold">
                        Period: {data.period || 'All Time'}
                      </div>
                      <div className="text-xs text-zinc-700 mt-1">
                        Date: {data.generatedDate || printToday}
                      </div>
                    </div>
                  </div>

                  {/* Centered Report Title Banner */}
                  <div className="text-center my-4">
                    <div
                      className="inline-block px-8 py-2 text-base md:text-lg font-black tracking-widest uppercase font-serif rounded-xs shadow-xs"
                      style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                    >
                      {data.reportHeading || title || 'PRODUCT STOCK & VALUATION REPORT'}
                    </div>
                  </div>

                  {/* Products Table */}
                  <table className="w-full text-left border-collapse text-xs mb-6">
                    <thead>
                      <tr
                        className="font-semibold"
                        style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                      >
                        <th className="py-2 px-2 text-center w-8 font-medium">#</th>
                        <th className="py-2 px-2 font-medium">Item Name & SKU</th>
                        <th className="py-2 px-2 font-medium">Generic</th>
                        <th className="py-2 px-2 font-medium">Brand / Manufacturer</th>
                        <th className="py-2 px-2 font-medium">Category</th>
                        <th className="py-2 px-2 font-mono font-medium">Barcode</th>
                        <th className="py-2 px-2 font-mono font-medium">Exp Date</th>
                        <th className="py-2 px-2 text-right font-medium">Cost Price</th>
                        <th className="py-2 px-2 text-right font-medium">Sales Price</th>
                        <th className="py-2 px-2 text-center font-medium">Stock</th>
                        <th className="py-2 px-2 text-right font-medium">Valuation (Cost)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {data.products && data.products.length > 0 ? (
                        data.products.map((p: any, idx: number) => {
                          const cost = Number(p.purchasePrice || 0);
                          const sale = Number(p.salesPrice || 0);
                          const stock = Number(p.stock || 0);
                          const val = cost * stock;
                          const isLow = stock <= (p.reorderLevel || 0);

                          return (
                            <tr key={p.id || idx} className="hover:bg-zinc-50">
                              <td className="py-1.5 px-2 text-center text-zinc-600 font-mono">{idx + 1}</td>
                              <td className="py-1.5 px-2 font-medium text-black">
                                <div>{p.name}</div>
                                {p.sku && <div className="text-[10px] text-zinc-500 font-mono">SKU: {p.sku}</div>}
                              </td>
                              <td className="py-1.5 px-2 text-zinc-700 font-medium text-[11px]">{p.generic || '—'}</td>
                              <td className="py-1.5 px-2 text-zinc-700 font-medium text-[11px]">{p.manufacturer || '—'}</td>
                              <td className="py-1.5 px-2 text-zinc-700 font-semibold text-[11px]">{p.categoryName || p.category || '—'}</td>
                              <td className="py-1.5 px-2 font-mono text-zinc-600 text-[11px]">{p.barcode || '-'}</td>
                              <td className="py-1.5 px-2 font-mono text-zinc-600 text-[11px]">{p.expDate || '-'}</td>
                              <td className="py-1.5 px-2 text-right font-mono">৳{cost.toLocaleString()}</td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold">৳{sale.toLocaleString()}</td>
                              <td className="py-1.5 px-2 text-center font-mono font-bold">
                                <span className={stock <= 0 ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-black'}>
                                  {stock} {p.unit || 'pcs'}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-medium">৳{val.toLocaleString()}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-zinc-500 font-medium">No products to display.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-900 font-bold text-black" style={{ backgroundColor: '#f4f4f5' }}>
                        <td colSpan={7} className="py-2.5 px-3 text-right">TOTAL INVENTORY SUMMARY:</td>
                        <td className="py-2.5 px-2 text-center font-mono">{data.totalUnits?.toLocaleString() || 0}</td>
                        <td colSpan={2}></td>
                        <td className="py-2.5 px-2 text-right font-mono text-emerald-800">৳ {Number(data.totalCostValue || 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* FORMAT 8: BARCODE LABEL STICKER SHEET                                     */}
          {/* ========================================================================= */}
          {type === 'BARCODE_SHEET' && (
            <div className="printable-barcodes w-full max-w-[850px] bg-white text-black p-6 shadow-xl border border-zinc-200 rounded-sm font-sans print:shadow-none print:border-none print:p-2 print:w-full print:max-w-none">
              <div className="no-print mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 flex justify-between items-center">
                <span>
                  Printing <strong>{data.quantity || 12}</strong> barcode labels for <strong>{data.product?.name}</strong>.
                </span>
                <span className="text-[11px] text-blue-700">Recommended: Print on standard sticker paper</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 print:grid-cols-3 print:gap-3">
                {Array.from({ length: data.quantity || 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="border border-zinc-300 rounded p-2.5 text-center flex flex-col items-center justify-between bg-white text-black print:border-zinc-400 page-break-inside-avoid"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-tight text-zinc-800 truncate w-full">
                      {companySettings.name}
                    </div>
                    <div className="text-[11px] font-semibold text-black leading-tight line-clamp-2 my-1">
                      {data.product?.name}
                    </div>
                    
                    {/* SVG Barcode Graphic */}
                    <div className="w-full px-1">
                      {renderSvgBarcode(data.product?.barcode || data.product?.sku || '10000001')}
                    </div>

                    <div className="text-[10px] font-mono tracking-widest text-zinc-900 font-bold">
                      {data.product?.barcode || data.product?.sku}
                    </div>

                    <div className="mt-1 pt-1 border-t border-zinc-200 w-full flex justify-between items-center text-[10px]">
                      <span className="text-zinc-500 font-mono">SKU: {data.product?.sku}</span>
                      <span className="font-bold text-black font-mono">
                        ৳ {Number(data.product?.salesPrice || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMAT 8.1: PRODUCT BATCH & EXPIRY MANAGEMENT REPORT                      */}
          {/* ========================================================================= */}
          {type === 'BATCH_EXPIRY_REPORT' && (
            printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM' ? (
              <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
                {/* Store Header */}
                <div className="text-center border-b-2 border-black pb-2 mb-2">
                  <h2 className="text-base font-black uppercase tracking-wider">{companySettings.name}</h2>
                  {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                  <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{companySettings.address}</p>
                  <p className="text-[10px] text-zinc-800 font-bold">Tel: {companySettings.phone}</p>
                </div>

                {/* Report Title */}
                <div className="text-center mb-2 border-b border-dashed border-zinc-400 pb-2">
                  <div className="text-xs font-black uppercase tracking-wider">
                    *** BATCH & EXPIRY REPORT ***
                  </div>
                  <div className="text-[10px] text-zinc-700 font-bold">
                    (পণ্য ব্যাচ ও মেয়াদভিত্তিক রিপোর্ট)
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">
                    Date: {data.generatedDate || printToday} {data.generatedTime || ''}
                  </div>
                </div>

                {/* KPI Summary Block */}
                {data.kpis && (
                  <div className="bg-zinc-50 p-2 rounded border border-zinc-200 text-[10px] mb-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Total Batches:</span>
                      <span className="font-bold font-mono">{data.kpis.totalBatches || (data.batches?.length || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Total Stock Qty:</span>
                      <span className="font-bold font-mono">{data.kpis.totalStockQty?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between text-blue-900 font-bold">
                      <span>Total Cost Asset:</span>
                      <span>৳{Number(data.kpis.totalCostValuation || 0).toLocaleString()}</span>
                    </div>
                    {data.kpis.expiringSoonCount > 0 && (
                      <div className="flex justify-between text-amber-800 font-bold">
                        <span>Expiring Soon (30d):</span>
                        <span>{data.kpis.expiringSoonCount} Batches (৳{Number(data.kpis.expiringSoonValuation || 0).toLocaleString()})</span>
                      </div>
                    )}
                    {data.kpis.expiredCount > 0 && (
                      <div className="flex justify-between text-rose-800 font-bold">
                        <span>Expired Batches:</span>
                        <span>{data.kpis.expiredCount} Batches (৳{Number(data.kpis.expiredValuation || 0).toLocaleString()})</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Filter info */}
                {data.filters && (
                  <div className="text-[9px] text-zinc-600 border-b border-dashed border-zinc-300 pb-1.5 mb-2">
                    <div>Filter: {data.filters.statusFilter || 'All Status'} | Batch: {data.filters.batchNumber || 'All'}</div>
                  </div>
                )}

                {/* Batches Table */}
                <table className="w-full text-left mb-3 text-[10px]">
                  <thead>
                    <tr className="border-b border-black font-bold">
                      <th className="py-1"># Batch / Item</th>
                      <th className="py-1 text-center">Exp (Days)</th>
                      <th className="py-1 text-center">Stock</th>
                      <th className="py-1 text-right">Cost Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-zinc-200">
                    {data.batches && data.batches.length > 0 ? (
                      data.batches.map((b: any, idx: number) => {
                        const isExp = b.daysDiff !== null && b.daysDiff < 0;
                        const isExpSoon = b.daysDiff !== null && b.daysDiff >= 0 && b.daysDiff <= 30;
                        return (
                          <tr key={idx} className="align-top">
                            <td className="py-1 pr-1">
                              <div className="font-bold text-zinc-900 font-mono text-[10px]">
                                {b.batchNumber}
                              </div>
                              <div className="text-[10px] leading-tight font-medium text-zinc-800">
                                {b.productName}
                              </div>
                              {b.sku && <div className="text-[8px] text-zinc-500 font-mono">SKU: {b.sku}</div>}
                            </td>
                            <td className="py-1 text-center whitespace-nowrap">
                              <div className="font-mono text-[9px]">{b.expDate || 'N/A'}</div>
                              <div className={`text-[8px] font-bold ${isExp ? 'text-rose-700' : isExpSoon ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {b.daysDiff !== null ? (b.daysDiff < 0 ? `${Math.abs(b.daysDiff)}d ago` : `${b.daysDiff}d left`) : 'No Exp'}
                              </div>
                            </td>
                            <td className="py-1 text-center whitespace-nowrap font-mono font-bold">
                              {b.stock} {b.unit || ''}
                            </td>
                            <td className="py-1 text-right font-mono font-semibold whitespace-nowrap">
                              ৳{Number(b.totalCostValuation || (b.stock * b.purchasePrice) || 0).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-3 text-center text-zinc-500">No batch records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Grand Total */}
                <div className="border-t-2 border-black pt-2 space-y-1 text-[10px]">
                  <div className="flex justify-between font-bold">
                    <span>TOTAL BATCH UNITS:</span>
                    <span className="font-mono">{data.totals?.totalStock?.toLocaleString() || data.kpis?.totalStockQty?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs border-t border-dashed border-zinc-300 pt-1 text-emerald-900">
                    <span>TOTAL COST ASSET:</span>
                    <span className="font-mono">৳{Number(data.totals?.totalCostValuation || data.kpis?.totalCostValuation || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-2 border-t border-dashed border-zinc-400 text-center text-[9px] text-zinc-500">
                  System Generated Batch Inventory Report • DokanPro ERP
                </div>
              </div>
            ) : (
              <div className="printable-report w-full max-w-[1100px] bg-white text-black p-6 md:p-8 shadow-xl border border-zinc-200 rounded-sm font-sans flex flex-col justify-between min-h-[1080px] print:shadow-none print:border-none print:p-4 print:w-full print:max-w-none print:min-h-screen">
                <div>
                  {/* Top Header */}
                  <div className="flex justify-between items-start border-b-2 pb-4 mb-4" style={{ borderColor: invoiceTheme.primary }}>
                    <div className="flex items-start gap-3.5">
                      {renderStoreLogo('h-14 w-auto object-contain shrink-0')}
                      <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-black font-serif">
                          {companySettings.name || 'DokanPro Business ERP'}
                        </h1>
                        {companySettings.nameBn && (
                          <p className="text-xs text-zinc-700 font-bold mt-0.5">{companySettings.nameBn}</p>
                        )}
                        {companySettings.address && (
                          <p className="text-xs text-zinc-600 mt-0.5">{companySettings.address}</p>
                        )}
                        <div className="text-[11px] text-zinc-600 mt-0.5 flex flex-wrap gap-x-3">
                          {companySettings.phone && <span><strong>Phone:</strong> {companySettings.phone}</span>}
                          {companySettings.email && <span><strong>Email:</strong> {companySettings.email}</span>}
                          {companySettings.taxNumber && <span><strong>BIN/VAT:</strong> {companySettings.taxNumber}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className="px-3.5 py-1 text-xs font-black uppercase tracking-wider rounded inline-block shadow-2xs"
                        style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                      >
                        BATCH & EXPIRY INVENTORY REPORT
                      </div>
                      <div className="text-[11px] text-indigo-900 font-bold mt-1">
                        পণ্য ব্যাচ ও মেয়াদভিত্তিক পূর্ণাঙ্গ ইনভেন্টরি রিপোর্ট
                      </div>
                      <div className="text-[11px] text-zinc-600 font-mono mt-1">
                        Report Ref: #BAT-{Date.now().toString().slice(-6)}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        Generated: {data.generatedDate || printToday} {data.generatedTime || ''}
                      </div>
                    </div>
                  </div>

                  {/* Active Filter Badges Strip */}
                  {data.filters && (
                    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg mb-4 text-xs">
                      <span className="text-zinc-500 font-bold uppercase text-[10px]">Applied Filters:</span>
                      {data.filters.batchNumber && data.filters.batchNumber !== 'ALL' && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-mono font-semibold text-[11px]">
                          Batch: {data.filters.batchNumber}
                        </span>
                      )}
                      {data.filters.productName && data.filters.productName !== 'ALL' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-medium text-[11px]">
                          Product: {data.filters.productName}
                        </span>
                      )}
                      {data.filters.categoryName && data.filters.categoryName !== 'ALL' && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded font-medium text-[11px]">
                          Category: {data.filters.categoryName}
                        </span>
                      )}
                      {data.filters.supplierName && data.filters.supplierName !== 'ALL' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-medium text-[11px]">
                          Supplier: {data.filters.supplierName}
                        </span>
                      )}
                      {data.filters.statusFilter && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-medium text-[11px]">
                          Status: {data.filters.statusFilter}
                        </span>
                      )}
                      {data.filters.expDateRange && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-900 rounded font-mono text-[11px]">
                          Exp Range: {data.filters.expDateRange}
                        </span>
                      )}
                      <span className="ml-auto font-bold text-zinc-700 text-[11px]">
                        Total Records: {data.batches?.length || 0} Batches
                      </span>
                    </div>
                  )}

                  {/* Executive KPI Summary Cards */}
                  {data.kpis && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5 text-center text-xs">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block">Total Batches</span>
                        <strong className="text-base font-mono text-zinc-900">{data.kpis.totalBatches}</strong>
                      </div>
                      <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg">
                        <span className="text-[10px] text-blue-800 font-bold uppercase block">Total Stock Units</span>
                        <strong className="text-base font-mono text-blue-900">{data.kpis.totalStockQty?.toLocaleString()}</strong>
                      </div>
                      <div className="p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-lg">
                        <span className="text-[10px] text-indigo-800 font-bold uppercase block">Cost Valuation (ক্রয়)</span>
                        <strong className="text-base font-mono text-indigo-900">৳{Number(data.kpis.totalCostValuation || 0).toLocaleString()}</strong>
                      </div>
                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                        <span className="text-[10px] text-emerald-800 font-bold uppercase block">Retail Valuation (বিক্রয়)</span>
                        <strong className="text-base font-mono text-emerald-900">৳{Number(data.kpis.totalSalesValuation || 0).toLocaleString()}</strong>
                      </div>
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="text-[10px] text-amber-800 font-bold uppercase block">Expiring Soon (30d)</span>
                        <strong className="text-base font-mono text-amber-900">{data.kpis.expiringSoonCount} Batches</strong>
                      </div>
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                        <span className="text-[10px] text-rose-800 font-bold uppercase block">Expired Stock</span>
                        <strong className="text-base font-mono text-rose-900">{data.kpis.expiredCount} Batches</strong>
                      </div>
                    </div>
                  )}

                  {/* Comprehensive Batches Table */}
                  <div className="border border-zinc-200 rounded-lg overflow-hidden mb-6 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }} className="font-bold">
                          <th className="py-2.5 px-2 text-center w-8">#</th>
                          <th className="py-2.5 px-2.5">Batch Number</th>
                          <th className="py-2.5 px-3">Product Name & Specifications</th>
                          <th className="py-2.5 px-2.5">Supplier / Inflow Ref</th>
                          <th className="py-2.5 px-2 text-center">Purchase Date</th>
                          <th className="py-2.5 px-2 text-center">Expiry Date</th>
                          <th className="py-2.5 px-2 text-center">Status / Countdown</th>
                          <th className="py-2.5 px-2 text-right">Cost Rate</th>
                          <th className="py-2.5 px-2 text-right">Sales Rate</th>
                          <th className="py-2.5 px-2 text-center">Initial / Sold</th>
                          <th className="py-2.5 px-2 text-center">Current Stock</th>
                          <th className="py-2.5 px-3 text-right">Total Valuation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {data.batches && data.batches.length > 0 ? (
                          data.batches.map((b: any, idx: number) => {
                            const isExp = b.daysDiff !== null && b.daysDiff < 0;
                            const isExpSoon = b.daysDiff !== null && b.daysDiff >= 0 && b.daysDiff <= 30;
                            const isFresh = b.daysDiff !== null && b.daysDiff > 30;
                            const isDepleted = b.stock <= 0;

                            return (
                              <tr key={idx} className={`hover:bg-zinc-50/80 ${idx % 2 === 1 ? 'bg-zinc-50/40' : 'bg-white'}`}>
                                <td className="py-2 px-2 text-center font-mono text-zinc-500 text-[11px]">{idx + 1}</td>
                                
                                {/* Batch Number */}
                                <td className="py-2 px-2.5">
                                  <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-300 inline-block text-[11px]">
                                    {b.batchNumber}
                                  </span>
                                </td>

                                {/* Product Name & Details */}
                                <td className="py-2 px-3">
                                  <div className="font-bold text-zinc-900">{b.productName}</div>
                                  {b.productNameBn && (
                                    <div className="text-[10px] text-zinc-600 font-medium">{b.productNameBn}</div>
                                  )}
                                  <div className="text-[10px] text-zinc-500 flex flex-wrap gap-x-2 mt-0.5">
                                    {b.sku && <span className="font-mono">SKU: {b.sku}</span>}
                                    {b.generic && <span>Gen: {b.generic}</span>}
                                    {b.categoryName && <span>Cat: {b.categoryName}</span>}
                                  </div>
                                </td>

                                {/* Supplier / Inflow */}
                                <td className="py-2 px-2.5 text-zinc-700">
                                  <div className="font-medium truncate max-w-[130px]">{b.supplierName || 'Initial Stock'}</div>
                                  {b.purchaseInvoiceNo && (
                                    <div className="text-[10px] font-mono text-zinc-500">{b.purchaseInvoiceNo}</div>
                                  )}
                                </td>

                                {/* Purchase Date */}
                                <td className="py-2 px-2 text-center font-mono text-zinc-700 whitespace-nowrap text-[11px]">
                                  {b.purchaseDate || '-'}
                                </td>

                                {/* Expiry Date */}
                                <td className="py-2 px-2 text-center font-mono font-bold whitespace-nowrap text-[11px]">
                                  <span className={isExp ? 'text-rose-700' : isExpSoon ? 'text-amber-700' : 'text-zinc-800'}>
                                    {b.expDate || 'N/A'}
                                  </span>
                                </td>

                                {/* Status / Countdown Badge */}
                                <td className="py-2 px-2 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                                      isDepleted
                                        ? 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                        : isExp
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                        : isExpSoon
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : isFresh
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}
                                  >
                                    {b.statusLabel || (b.daysDiff !== null ? (b.daysDiff < 0 ? `Expired (${Math.abs(b.daysDiff)}d)` : `${b.daysDiff}d Left`) : 'Valid')}
                                  </span>
                                </td>

                                {/* Cost & Sales Rate */}
                                <td className="py-2 px-2 text-right font-mono text-zinc-800 whitespace-nowrap text-[11px]">
                                  ৳{Number(b.purchasePrice || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-2 text-right font-mono font-medium text-zinc-900 whitespace-nowrap text-[11px]">
                                  ৳{Number(b.salesPrice || 0).toLocaleString()}
                                </td>

                                {/* Initial / Sold */}
                                <td className="py-2 px-2 text-center font-mono text-zinc-600 whitespace-nowrap text-[10px]">
                                  <span>{b.initialStock || b.stock}</span>
                                  <span className="text-zinc-400"> / </span>
                                  <span className="text-emerald-700 font-semibold">{b.soldQty || 0}</span>
                                </td>

                                {/* Current Stock */}
                                <td className="py-2 px-2 text-center font-mono font-bold whitespace-nowrap text-[11px]">
                                  <span className={b.stock <= 0 ? 'text-zinc-400' : 'text-zinc-950 font-black'}>
                                    {b.stock} {b.unit || ''}
                                  </span>
                                </td>

                                {/* Total Valuation */}
                                <td className="py-2 px-3 text-right font-mono font-bold text-zinc-950 whitespace-nowrap text-[11px]">
                                  ৳ {Number(b.totalCostValuation || (b.stock * b.purchasePrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={12} className="py-8 text-center text-zinc-500 font-medium">
                              No batch or expiry inventory records match the current filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-400 text-zinc-900">
                          <td colSpan={9} className="py-3 px-3 text-right uppercase tracking-wider text-xs">
                            GRAND TOTAL SUMMARY (সর্বমোট মজুদ ও স্টক মূল্যায়ন):
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-zinc-700">
                            {data.totals?.totalSoldQty || 0} Sold
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-sm text-indigo-950">
                            {data.totals?.totalStock?.toLocaleString() || data.kpis?.totalStockQty?.toLocaleString() || 0} Units
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm text-emerald-800 whitespace-nowrap">
                            ৳ {Number(data.totals?.totalCostValuation || data.kpis?.totalCostValuation || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Summary Notes */}
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg mb-8 text-xs text-zinc-600 flex justify-between items-center">
                    <div>
                      <span>* Stock valuation is calculated on First-Expiry-First-Out (FEFO) purchase cost basis.</span>
                    </div>
                    <div className="font-semibold text-zinc-800">
                      Print Date: {data.generatedDate || printToday} {data.generatedTime || ''}
                    </div>
                  </div>
                </div>

                {/* 3-Tier Commercial Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs mt-6 border-t border-zinc-300">
                  <div>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-zinc-400 font-mono">Inventory Operator</span>
                    </div>
                    <div className="border-t border-zinc-400 pt-1.5 text-zinc-700 font-medium">
                      প্রস্তুতকারক (Prepared By)
                    </div>
                  </div>
                  <div>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-zinc-400 font-mono">Store / Warehouse Incharge</span>
                    </div>
                    <div className="border-t border-zinc-400 pt-1.5 text-zinc-700 font-medium">
                      গুদাম কর্মকর্তা (Store Incharge)
                    </div>
                  </div>
                  <div>
                    {renderAuthorizedSignature('অনুমোদনকারী কর্মকর্তা (Authorized Sign & Seal)', 'center', 'w-full')}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* FORMAT 8.2: BATCH DETAILED INVOICES, VOUCHERS & TRACEABILITY LEDGER       */}
          {/* ========================================================================= */}
          {(type === 'BATCH_TRACEABILITY_SLIP' || type === 'BATCH_DETAILED_LEDGER') && (
            printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM' ? (
              <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
                {/* Store Header */}
                <div className="text-center border-b-2 border-black pb-2 mb-2">
                  <h2 className="text-base font-black uppercase tracking-wider">{companySettings.name}</h2>
                  {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                  <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{companySettings.address}</p>
                  <p className="text-[10px] text-zinc-800 font-bold">Tel: {companySettings.phone}</p>
                </div>

                {/* Report Title */}
                <div className="text-center mb-2 border-b border-dashed border-zinc-400 pb-2">
                  <div className="text-xs font-black uppercase tracking-wider">
                    {data.viewMode === 'DAILY' ? 'BATCH DAILY SUMMARY' : 'BATCH INVOICE & VOUCHER LEDGER'}
                  </div>
                  <div className="text-[11px] font-bold text-zinc-800">
                    {data.viewMode === 'DAILY' ? 'তারিখভিত্তিক ব্যাচ হিসাব' : 'চালানভিত্তিক বিস্তারিত ব্যাচ লেজার'}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">
                    Batch: <span className="font-bold">{data.batchNumber}</span> | SKU: {data.sku || '-'}
                  </div>
                  <div className="text-[10px] font-bold text-zinc-800 truncate">
                    {data.productName}
                  </div>
                </div>

                {/* Batch Metrics */}
                <div className="bg-zinc-100 p-2 rounded text-[10px] space-y-1 mb-2 border border-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Purchase Date:</span>
                    <span className="font-bold">{data.purchaseDate || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Expiry Date:</span>
                    <span className="font-bold text-rose-800">{data.expDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-1">
                    <span className="text-zinc-600">Total Inflow / Pur:</span>
                    <span className="font-bold">+{data.initialStock || data.totals?.totalInflow || 0} {data.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Total Sold / Outflow:</span>
                    <span className="font-bold text-rose-700">-{data.soldQty || data.totals?.totalOutflow || 0} {data.unit}</span>
                  </div>
                  <div className="flex justify-between font-bold text-black border-t border-zinc-300 pt-1 text-xs">
                    <span>Remaining Stock:</span>
                    <span>{data.stock || data.totals?.currentStock || 0} {data.unit}</span>
                  </div>
                </div>

                {/* Items / Transactions */}
                <div className="border-t border-b border-black py-1 mb-2">
                  <div className="grid grid-cols-12 text-[10px] font-black uppercase mb-1">
                    <div className="col-span-3">Date/Doc</div>
                    <div className="col-span-4">Type/Party</div>
                    <div className="col-span-2 text-center">In/Out</div>
                    <div className="col-span-3 text-right">Bal (Qty)</div>
                  </div>

                  <div className="divide-y divide-dashed divide-zinc-300">
                    {data.transactions && data.transactions.length > 0 ? (
                      data.transactions.map((t: any, idx: number) => (
                        <div key={idx} className="py-1 text-[10px]">
                          <div className="grid grid-cols-12">
                            <div className="col-span-3 font-mono text-[9px]">{t.date}</div>
                            <div className="col-span-4 font-bold truncate">{t.typeLabel || t.type}</div>
                            <div className="col-span-2 text-center font-bold font-mono">
                              {t.inQty > 0 ? `+${t.inQty}` : `-${t.outQty}`}
                            </div>
                            <div className="col-span-3 text-right font-black font-mono">
                              {t.runningBalance !== undefined ? t.runningBalance : '-'} {data.unit}
                            </div>
                          </div>
                          <div className="text-[9px] text-zinc-600 flex justify-between">
                            <span className="truncate max-w-[170px]">Doc: {t.docNo} ({t.partyName})</span>
                            <span className="font-mono">৳{Number(t.total || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-3 text-center text-zinc-500 text-[10px]">No transaction entries</div>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="text-[10px] space-y-1 mb-4 border-t border-black pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Current Stock Asset Value:</span>
                    <span>৳{Number(data.totalCostValuation || data.totals?.currentCostValuation || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 text-[9px]">
                    <span>Printed On:</span>
                    <span>{data.generatedDate || printToday} {data.generatedTime || ''}</span>
                  </div>
                </div>

                {/* Signature */}
                <div className="pt-4 border-t border-dashed border-zinc-400 text-center text-[10px]">
                  <div className="h-6" />
                  <div className="border-t border-black pt-1 font-bold">Store Auditor / Incharge</div>
                  <p className="text-[9px] text-zinc-500 mt-1">Thank you for your business!</p>
                </div>
              </div>
            ) : (
              /* A4 Commercial Statement Format */
              <div className="printable-report w-full max-w-[880px] bg-white text-zinc-900 p-6 md:p-8 shadow-xl border border-zinc-200 rounded-xl font-sans text-xs print:shadow-none print:border-none print:p-4 font-sans flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 pb-4 mb-4" style={{ borderColor: invoiceTheme.primary }}>
                    <div className="flex items-start gap-3.5">
                      {renderStoreLogo('h-14 w-auto object-contain shrink-0')}
                      <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-black font-serif">
                          {companySettings.name || 'DokanPro Business ERP'}
                        </h1>
                        {companySettings.nameBn && (
                          <p className="text-xs text-zinc-700 font-bold">{companySettings.nameBn}</p>
                        )}
                        <p className="text-xs text-zinc-600 mt-0.5">{companySettings.address}</p>
                        <div className="flex items-center gap-3 text-xs text-zinc-600 mt-0.5">
                          <span>Phone: {companySettings.phone}</span>
                          {companySettings.email && <span>• Email: {companySettings.email}</span>}
                          {companySettings.taxNumber && <span>• TAX/BIN: {companySettings.taxNumber}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className="px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-md inline-block shadow-2xs"
                        style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                      >
                        {data.viewMode === 'DAILY'
                          ? 'BATCH DAILY MOVEMENT STATEMENT'
                          : 'BATCH DETAILED INVOICES & VOUCHERS LEDGER'}
                      </div>
                      <div className="text-xs text-indigo-900 font-bold mt-1">
                        {data.viewMode === 'DAILY'
                          ? 'পণ্য ব্যাচ তারিখভিত্তিক ক্রয়-বিক্রয় ও স্টক সারাংশ'
                          : 'পণ্য ব্যাচ চালান ও ভাউচারভিত্তিক বিস্তারিত হিসাব বিবরণী'}
                      </div>
                      <div className="text-xs text-zinc-700 font-mono mt-1 font-bold">
                        Batch #{data.batchNumber}
                      </div>
                    </div>
                  </div>

                  {/* Batch Profile Meta Box */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 mb-4">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Product Name (পণ্যের নাম)</span>
                      <strong className="text-zinc-900 text-sm block truncate">{data.productName}</strong>
                      {data.productNameBn && <span className="text-[11px] text-zinc-600 block truncate">{data.productNameBn}</span>}
                      {data.sku && <span className="text-[10px] text-zinc-500 block font-mono">SKU: {data.sku}</span>}
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Batch & Category</span>
                      <strong className="font-mono text-indigo-800 text-sm block">#{data.batchNumber}</strong>
                      <span className="text-[11px] text-zinc-600 block">{data.categoryName || 'General'}</span>
                      {data.generic && <span className="text-[10px] text-zinc-500 italic block">{data.generic}</span>}
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Purchase Date & Supplier</span>
                      <strong className="text-zinc-800 text-xs font-mono block">{data.purchaseDate || '-'}</strong>
                      <span className="text-[11px] text-zinc-600 block truncate">{data.supplierName || 'Initial Stock'}</span>
                      <span className="text-[10px] text-zinc-500 block font-mono">Cost: ৳{Number(data.purchasePrice || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Expiry & Status</span>
                      <strong className="text-rose-700 text-xs font-mono block">{data.expDate || 'N/A'}</strong>
                      {data.statusLabel ? (
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded text-[10px] font-bold">
                          {data.statusLabel}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 block font-mono">MRP: ৳{Number(data.salesPrice || 0).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Ribbon */}
                  <div className="grid grid-cols-4 gap-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg mb-4 text-center">
                    <div className="border-r border-indigo-200/80 pr-2">
                      <span className="text-[10px] text-zinc-600 uppercase font-bold block">
                        মোট ক্রয় / ইনফ্লো (Inflow)
                      </span>
                      <strong className="text-sm font-mono text-indigo-900 block mt-0.5">
                        {data.initialStock || data.totals?.totalPurchased || data.totals?.totalInflow || 0} {data.unit}
                      </strong>
                      <span className="text-[10px] text-zinc-500 block">
                        ৳{Number(data.totals?.totalPurchasedAmount || (Number(data.initialStock || 0) * Number(data.purchasePrice || 0))).toLocaleString()}
                      </span>
                    </div>
                    <div className="border-r border-indigo-200/80 pr-2">
                      <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                        মোট বিক্রয় / আউটফ্লো (Sold)
                      </span>
                      <strong className="text-sm font-mono text-emerald-700 block mt-0.5">
                        {data.soldQty || data.totals?.totalSold || 0} {data.unit}
                      </strong>
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        ৳{Number(data.totals?.totalSoldAmount || (Number(data.soldQty || 0) * Number(data.salesPrice || 0))).toLocaleString()}
                      </span>
                    </div>
                    <div className="border-r border-indigo-200/80 pr-2">
                      <span className="text-[10px] text-purple-800 uppercase font-bold block">
                        গ্রাহক ফেরত (Returns)
                      </span>
                      <strong className="text-sm font-mono text-purple-700 block mt-0.5">
                        {data.returnedQty || data.totals?.totalReturned || 0} {data.unit}
                      </strong>
                      <span className="text-[10px] text-zinc-500 block">Restocked</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-950 uppercase font-black block">
                        বর্তমান অবশিষ্ট মজুদ (Stock)
                      </span>
                      <strong className="text-base font-mono text-indigo-950 font-black block mt-0.5">
                        {data.stock || data.totals?.currentStock || 0} {data.unit}
                      </strong>
                      <span className="text-[10px] font-bold text-indigo-900 block">
                        ৳{Number(data.totalCostValuation || data.totals?.currentCostValuation || 0).toLocaleString()} Value
                      </span>
                    </div>
                  </div>

                  {/* Filter Indicator (if any) */}
                  {data.dateFilter && (
                    <div className="mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-center justify-between">
                      <span><strong>তারিখ ফিল্টার:</strong> {data.dateFilter}</span>
                      <span className="text-[10px] text-zinc-500">Filtered View</span>
                    </div>
                  )}

                  {/* TABLE VIEW SELECTION: DETAILED INVOICES vs DAILY SUMMARY */}
                  {data.viewMode === 'DAILY' && data.dailySummaries && data.dailySummaries.length > 0 ? (
                    /* Daily Summary Table */
                    <div className="border border-zinc-200 rounded-lg overflow-hidden mb-5 shadow-2xs">
                      <div className="bg-zinc-100 px-3 py-2 border-b border-zinc-200 font-bold text-xs text-zinc-800 flex justify-between items-center">
                        <span>তারিখভিত্তিক ক্রয়-বিক্রয় ও স্টক মুভমেন্ট বিবরণী (Daily Date-wise Summary)</span>
                        <span className="text-[11px] font-normal text-zinc-500 font-mono">
                          {data.dailySummaries.length} Days Recorded
                        </span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                            <th className="py-2.5 px-3">Date (তারিখ)</th>
                            <th className="py-2.5 px-3 text-center">ক্রয় ইনফ্লো (+)</th>
                            <th className="py-2.5 px-3 text-center">বিক্রয় আউটফ্লো (-)</th>
                            <th className="py-2.5 px-3 text-center">ফেরত (+)</th>
                            <th className="py-2.5 px-3 text-right">ক্রয় মূল্য (৳)</th>
                            <th className="py-2.5 px-3 text-right">বিক্রয় মূল্য (৳)</th>
                            <th className="py-2.5 px-3 text-center">নেট তারতম্য</th>
                            <th className="py-2.5 px-3 text-center bg-indigo-50/50">সমাপনী ব্যালেন্স</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {data.dailySummaries.map((day: any, idx: number) => (
                            <tr key={idx} className="hover:bg-zinc-50">
                              <td className="py-2 px-3 font-mono font-bold text-zinc-800 whitespace-nowrap">{day.date}</td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                                {day.purchasedQty > 0 ? `+${day.purchasedQty} ${data.unit}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">
                                {day.soldQty > 0 ? `-${day.soldQty} ${data.unit}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-purple-700">
                                {day.returnedQty > 0 ? `+${day.returnedQty}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-700">
                                {day.purchasedAmount > 0 ? `৳${Number(day.purchasedAmount).toLocaleString()}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                {day.soldAmount > 0 ? `৳${Number(day.soldAmount).toLocaleString()}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold">
                                <span className={day.netDayMovement > 0 ? 'text-emerald-700' : day.netDayMovement < 0 ? 'text-amber-700' : 'text-zinc-400'}>
                                  {day.netDayMovement > 0 ? `+${day.netDayMovement}` : day.netDayMovement} {data.unit}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-black text-indigo-950 bg-indigo-50/40">
                                {day.closingBalance} {data.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-zinc-100 text-zinc-900 font-bold border-t-2 border-zinc-300">
                            <td className="py-2.5 px-3 uppercase text-[11px]">GRAND TOTALS:</td>
                            <td className="py-2.5 px-3 text-center font-mono text-emerald-800 font-black">
                              +{data.totals?.totalPurchased || data.totals?.totalInflow || 0} {data.unit}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-amber-800 font-black">
                              -{data.totals?.totalSold || data.totals?.totalOutflow || 0} {data.unit}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-purple-800">
                              +{data.totals?.totalReturned || 0}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-zinc-800">
                              ৳{Number(data.totals?.totalPurchasedAmount || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-black">
                              ৳{Number(data.totals?.totalSoldAmount || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-zinc-500">-</td>
                            <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-950 bg-indigo-100/60">
                              {data.stock || data.totals?.currentStock || 0} {data.unit}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    /* Detailed Invoices & Vouchers Table */
                    <div className="border border-zinc-200 rounded-lg overflow-hidden mb-5 shadow-2xs">
                      <div className="bg-zinc-100 px-3 py-2 border-b border-zinc-200 font-bold text-xs text-zinc-800 flex justify-between items-center">
                        <span>চালান ও ভাউচারভিত্তিক বিস্তারিত তালিকা (Detailed Invoices & Vouchers)</span>
                        <span className="text-[11px] font-normal text-zinc-500 font-mono">
                          {data.transactions ? data.transactions.length : 0} Records
                        </span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200 whitespace-nowrap">
                            <th className="py-2.5 px-2 text-center w-8">#</th>
                            <th className="py-2.5 px-3">Date (তারিখ)</th>
                            <th className="py-2.5 px-3">Type (ধরন)</th>
                            <th className="py-2.5 px-3">Invoice / Voucher #</th>
                            <th className="py-2.5 px-3">Expiry Date (মেয়াদ)</th>
                            <th className="py-2.5 px-3">Customer / Supplier</th>
                            <th className="py-2.5 px-3 text-center">ক্রয় (+ In)</th>
                            <th className="py-2.5 px-3 text-center">বিক্রয় (- Out)</th>
                            <th className="py-2.5 px-3 text-right">দর (Rate ৳)</th>
                            <th className="py-2.5 px-3 text-right">মোট (Total ৳)</th>
                            <th className="py-2.5 px-3 text-center bg-indigo-50/50">রানিং ব্যালেন্স</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {data.transactions && data.transactions.length > 0 ? (
                            data.transactions.map((t: any, idx: number) => (
                              <tr key={idx} className="hover:bg-zinc-50">
                                <td className="py-2 px-2 text-center font-mono text-zinc-500">{idx + 1}</td>
                                <td className="py-2 px-3 font-mono text-zinc-700 whitespace-nowrap">{t.date}</td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      t.type === 'PURCHASE'
                                        ? 'bg-blue-100 text-blue-800'
                                        : t.type === 'SALE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : t.type === 'SALE_RETURN'
                                        ? 'bg-purple-100 text-purple-800'
                                        : t.type === 'EXPIRED_RETURN'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-zinc-100 text-zinc-800'
                                    }`}
                                  >
                                    {t.typeLabel || t.type}
                                  </span>
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-zinc-900 whitespace-nowrap">{t.docNo}</td>
                                <td className="py-2 px-3 font-mono font-bold text-rose-700 whitespace-nowrap">{data.expDate || 'N/A'}</td>
                                <td className="py-2 px-3 text-zinc-700 max-w-[160px] truncate">{t.partyName}</td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">
                                  {t.inQty > 0 ? `+${t.inQty}` : '-'}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">
                                  {t.outQty > 0 ? `-${t.outQty}` : '-'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-zinc-700">
                                  ৳{Number(t.rate || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900">
                                  ৳{Number(t.total || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-black text-indigo-950 bg-indigo-50/40 whitespace-nowrap">
                                  {t.runningBalance !== undefined ? t.runningBalance : '-'} {data.unit}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={11} className="py-6 text-center text-zinc-500">
                                কোনো লেনদেন রেকর্ড পাওয়া যায়নি (No transaction entries found).
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-zinc-100 text-zinc-900 font-bold border-t-2 border-zinc-300">
                            <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px]">
                              GRAND TOTAL (সর্বমোট হিসাব):
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-blue-800 font-black">
                              +{data.totals?.totalPurchased || data.totals?.totalInflow || 0}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-amber-800 font-black">
                              -{data.totals?.totalSold || data.totals?.totalOutflow || 0}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-zinc-600">-</td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-zinc-950">
                              ৳{Number(data.totals?.totalSoldAmount || data.totals?.totalPurchasedAmount || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-950 bg-indigo-100/60">
                              {data.stock || data.totals?.currentStock || 0} {data.unit}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Summary Notes & Audit Info */}
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg mb-6 text-xs text-zinc-600 flex justify-between items-center">
                    <div>
                      <span>* ব্যাচ ব্যালেন্স ও প্রতিটি চালানের স্টক হিসাব FEFO এবং ক্রমানুযায়ী হিসাবভুক্ত করা হয়েছে।</span>
                    </div>
                    <div className="font-semibold text-zinc-800">
                      Printed On: {data.generatedDate || printToday} {data.generatedTime || ''}
                    </div>
                  </div>
                </div>

                {/* 3-Tier Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs mt-4 border-t border-zinc-300">
                  <div>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-zinc-400 font-mono">Inventory Operator</span>
                    </div>
                    <div className="border-t border-zinc-400 pt-1.5 text-zinc-700 font-medium">
                      প্রস্তুতকারক (Prepared By)
                    </div>
                  </div>
                  <div>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-zinc-400 font-mono">Store / Warehouse Auditor</span>
                    </div>
                    <div className="border-t border-zinc-400 pt-1.5 text-zinc-700 font-medium">
                      গুদাম কর্মকর্তা (Store Incharge)
                    </div>
                  </div>
                  <div>
                    {renderAuthorizedSignature('অনুমোদনকারী কর্মকর্তা (Authorized Sign & Seal)', 'center', 'w-full')}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* FORMAT 10: OFFICIAL PRODUCT WARRANTY CERTIFICATE CARD                      */}
          {/* ========================================================================= */}
          {type === 'WARRANTY_CARD' && (
            printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM' ? (
              <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
                <div className="text-center border-b-2 border-black pb-2 mb-2">
                  <h2 className="text-base font-black uppercase tracking-wider">{companySettings.name || 'STORE'}</h2>
                  {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                  <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{companySettings.address}</p>
                  <p className="text-[10px] text-zinc-800 font-bold">Tel: {companySettings.phone}</p>
                </div>

                <div className="text-center mb-3 border-b border-dashed border-zinc-400 pb-2">
                  <div className="text-xs font-black uppercase tracking-wider">OFFICIAL WARRANTY CARD</div>
                  <div className="text-[10px] text-zinc-600 font-bold mt-0.5">Code: {data.warrantyCode || 'N/A'}</div>
                </div>

                <div className="space-y-1.5 text-[11px] border-b border-dashed border-zinc-400 pb-3 mb-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Invoice No:</span>
                    <span className="font-bold">{data.invoiceNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Sale Date:</span>
                    <span>{data.saleDate || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Customer:</span>
                    <span className="font-bold">{data.customerName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Phone:</span>
                    <span>{data.customerPhone || '-'}</span>
                  </div>
                  <div className="pt-1 border-t border-zinc-200">
                    <span className="text-zinc-600 block">Product:</span>
                    <span className="font-bold block leading-tight">{data.productName || '-'}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">SKU: {data.sku || '-'}</span>
                  </div>
                  <div className="bg-zinc-100 p-1.5 rounded border border-zinc-300">
                    <span className="text-zinc-600 text-[10px] block font-bold">SERIAL / IMEI NO:</span>
                    <span className="font-mono font-bold text-xs block text-black">{data.serialNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Warranty Coverage:</span>
                    <span className="font-bold">{data.duration} {data.durationUnit} ({data.warrantyType})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Expiry Date:</span>
                    <span className="font-bold text-rose-700">{data.expiryDate || '-'}</span>
                  </div>
                </div>

                {data.terms && (
                  <div className="text-[10px] text-zinc-700 mb-3 p-1.5 bg-zinc-50 rounded border border-zinc-200">
                    <span className="font-bold block">Terms:</span>
                    <p className="leading-tight">{data.terms}</p>
                  </div>
                )}

                {renderSvgBarcode(data.serialNumber || data.warrantyCode || '00000')}

                <div className="mt-3 text-center text-[9px] text-zinc-500 border-t border-dashed border-zinc-300 pt-2">
                  Please preserve this card for future warranty claims & verification.
                </div>
              </div>
            ) : (
              <div className={`printable-report w-full ${printOrientation === 'LANDSCAPE' ? 'max-w-[1200px]' : 'max-w-[950px]'} bg-white text-black p-8 md:p-10 shadow-xl border border-zinc-200 rounded-sm font-sans flex flex-col justify-between min-h-[1080px] print:shadow-none print:border-none print:p-6 print:w-full print:max-w-none print:min-h-screen`}>
                <div>
                  <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4 mb-4">
                    <div className="flex items-start gap-4">
                      {companySettings.logoUrl ? (
                        <img
                          src={companySettings.logoUrl}
                          alt={companySettings.name || 'Store Logo'}
                          className="h-16 w-auto object-contain shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div
                          className="px-3 py-2 flex items-center justify-center rounded-xs"
                          style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                        >
                          <span className="text-lg font-serif font-black tracking-wider">
                            {companySettings.name ? companySettings.name.slice(0, 3).toUpperCase() : 'POS'}
                          </span>
                        </div>
                      )}
                      <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-black font-serif">
                          {companySettings.name || 'DokanPro ERP'}
                        </h1>
                        {companySettings.nameBn && (
                          <p className="text-sm text-zinc-700 font-bold">{companySettings.nameBn}</p>
                        )}
                        {companySettings.address && (
                          <p className="text-xs text-zinc-700 mt-0.5">{companySettings.address}</p>
                        )}
                        {companySettings.phone && (
                          <p className="text-xs text-zinc-700">Phone: {companySettings.phone} {companySettings.email ? `• ${companySettings.email}` : ''}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-block px-3 py-1 rounded bg-zinc-100 border border-zinc-300 text-xs font-mono font-bold text-zinc-800">
                        {data.warrantyCode || 'WAR-CARD'}
                      </div>
                      <div className="text-xs text-zinc-600 mt-2">
                        Issue Date: {data.saleDate || printToday}
                      </div>
                      <div className="text-xs text-zinc-600 font-bold mt-0.5">
                        Status: <span className="uppercase text-emerald-700">{data.status || 'ACTIVE'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center my-6">
                    <div
                      className="inline-block px-10 py-2.5 text-lg md:text-xl font-black tracking-widest uppercase font-serif rounded-xs shadow-xs"
                      style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                    >
                      OFFICIAL PRODUCT WARRANTY CERTIFICATE
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 uppercase font-semibold tracking-wider">
                      প্রোডাক্ট ওয়ারেন্টি কার্ড ও গ্রাহক নিশ্চয়তা পত্র
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="border border-zinc-300 rounded-md p-4 bg-zinc-50/50 space-y-3 text-xs">
                      <h3 className="font-bold text-sm text-zinc-900 border-b border-zinc-300 pb-1.5 flex items-center justify-between">
                        <span>PRODUCT DETAILS (পণ্যের বিবরণ)</span>
                        <span className="text-[10px] font-mono font-normal text-zinc-500">SKU: {data.sku || '-'}</span>
                      </h3>
                      <div>
                        <span className="text-zinc-500 block text-[11px]">Product Name:</span>
                        <span className="font-bold text-sm text-zinc-900 leading-snug block">{data.productName || '-'}</span>
                      </div>

                      <div className="p-3 bg-white rounded border-2 border-zinc-800">
                        <span className="text-[10px] font-bold tracking-wider text-zinc-600 block uppercase">
                          SERIAL / IMEI NUMBER:
                        </span>
                        <span className="font-mono text-base font-black text-black tracking-wide block my-0.5">
                          {data.serialNumber || 'N/A'}
                        </span>
                        {renderSvgBarcode(data.serialNumber || data.warrantyCode || '00000')}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-zinc-500 block">Warranty Type:</span>
                          <span className="font-bold text-zinc-800">{data.warrantyType || 'REPLACEMENT'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Coverage Duration:</span>
                          <span className="font-bold text-emerald-700">{data.duration} {data.durationUnit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-zinc-300 rounded-md p-4 bg-zinc-50/50 space-y-3 text-xs flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-zinc-900 border-b border-zinc-300 pb-1.5">
                          CUSTOMER & INVOICE DETAILS (গ্রাহক ও রসিদের তথ্য)
                        </h3>
                        <div className="space-y-2 mt-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Customer Name:</span>
                            <span className="font-bold text-zinc-900">{data.customerName || 'Walk-in Customer'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Customer Phone:</span>
                            <span className="font-mono font-bold text-zinc-900">{data.customerPhone || '-'}</span>
                          </div>
                          <div className="flex justify-between border-t border-zinc-200 pt-1.5">
                            <span className="text-zinc-500">Invoice Number:</span>
                            <span className="font-mono font-bold text-zinc-900">{data.invoiceNumber || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Purchase / Sale Date:</span>
                            <span className="font-bold text-zinc-800">{data.saleDate || '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded bg-amber-50 border border-amber-300 text-amber-950">
                        <div className="text-[11px] font-bold text-amber-900 uppercase">WARRANTY EXPIRY DATE (মেয়াদ উত্তীর্ণের তারিখ):</div>
                        <div className="text-base font-black font-mono text-rose-700 mt-0.5">
                          {data.expiryDate || '-'}
                        </div>
                        <p className="text-[10px] text-amber-800 mt-1">
                          Keep this certificate safe. Claims require original serial/IMEI verification.
                        </p>
                      </div>
                    </div>
                  </div>

                  {data.terms && (
                    <div className="border border-zinc-300 rounded-md p-4 mb-6 bg-white text-xs">
                      <h4 className="font-bold text-zinc-800 uppercase text-[11px] mb-1 border-b border-zinc-200 pb-1">
                        TERMS & CONDITIONS (ওয়ারেন্টি শর্তাবলী):
                      </h4>
                      <p className="text-zinc-700 whitespace-pre-line leading-relaxed text-[11px]">
                        {data.terms}
                      </p>
                    </div>
                  )}

                  <div className="border border-dashed border-zinc-300 rounded p-3 mb-6 bg-zinc-50 text-[10px] text-zinc-600 space-y-1">
                    <div className="font-bold text-zinc-800 uppercase text-[10px]">GENERAL WARRANTY POLICY & SERVICE RULES:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                      <li>Physical damage, water ingress, burn marks, or unauthorized tampering voids warranty immediately.</li>
                      <li>Serial/IMEI sticker must remain intact and legible on the product.</li>
                      <li>Replacement or repair service delivery timeline is subject to stock availability and vendor policy.</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-8 border-t-2 border-zinc-900">
                  <div className="grid grid-cols-2 gap-8 items-end mb-4">
                    <div className="text-center">
                      <div className="w-48 border-b border-zinc-400 mx-auto mb-1" />
                      <div className="text-xs font-bold text-zinc-800">Customer Signature</div>
                      <div className="text-[10px] text-zinc-500">গ্রাহকের স্বাক্ষর</div>
                    </div>
                    <div>
                      {renderAuthorizedSignature('অনুমোদনকারী কর্মকর্তা (Authorized Sign & Seal)', 'center', 'w-full')}
                    </div>
                  </div>
                  <div className="text-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-200">
                    {companySettings.name} • Official Warranty Certificate • Computer Generated Document
                  </div>
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* FORMAT 9: GENERAL REPORT & FINANCIAL STATEMENT (ANY REPORT)               */}
          {/* ========================================================================= */}
          {(type === 'REPORT' || type === 'STATEMENT') && (
            printFormat === 'POS_80MM' || printFormat === 'XPRINTER_80MM' ? (
              <div className="printable-receipt w-[340px] bg-white text-black p-4 font-mono text-xs shadow-md border border-zinc-200 rounded-sm print:shadow-none print:border-none">
                {/* Store Header */}
                <div className="text-center border-b-2 border-black pb-2 mb-2">
                  <h2 className="text-base font-black uppercase tracking-wider">{companySettings.name}</h2>
                  {companySettings.nameBn && <p className="text-[11px] font-bold text-zinc-700">{companySettings.nameBn}</p>}
                  <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{companySettings.address}</p>
                  <p className="text-[10px] text-zinc-800 font-bold">Tel: {companySettings.phone}</p>
                </div>

                {/* Report Title & Period */}
                <div className="text-center mb-2 border-b border-dashed border-zinc-400 pb-2">
                  <div className="text-xs font-black uppercase tracking-wider">
                    {data.reportTitle || title || 'REPORT STATEMENT'}
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    Period: {data.period || 'All Time'} • Date: {data.generatedDate || printToday}
                  </div>
                </div>

                {/* KPI Highlights if available */}
                {data.kpis && data.kpis.length > 0 && (
                  <div className="bg-zinc-50 p-2 rounded border border-zinc-200 text-[10px] mb-2 space-y-1">
                    {data.kpis.map((kpi: any, kIdx: number) => (
                      <div key={kIdx} className="flex justify-between">
                        <span className="text-zinc-600">{kpi.label}:</span>
                        <span className="font-bold font-mono">
                          {typeof kpi.value === 'number' ? `৳${kpi.value.toLocaleString()}` : kpi.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tabular Rows in 80mm format */}
                {data.columns && data.columns.length > 0 && (
                  <table className="w-full text-left mb-3 text-[10px]">
                    <thead>
                      <tr className="border-b border-black font-bold">
                        <th className="py-1">#</th>
                        <th className="py-1">{data.columns[0]?.header || 'Item'}</th>
                        {data.columns.length > 1 && (
                          <th className="py-1 text-center">{data.columns[data.columns.length - 2]?.header || 'Qty'}</th>
                        )}
                        <th className="py-1 text-right">{data.columns[data.columns.length - 1]?.header || 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-zinc-200">
                      {data.rows && data.rows.length > 0 ? (
                        data.rows.map((row: any, rIdx: number) => {
                          const col0Key = data.columns[0]?.key;
                          const lastColKey = data.columns[data.columns.length - 1]?.key;
                          const midColKey = data.columns.length > 2 ? data.columns[data.columns.length - 2]?.key : null;

                          const lastVal = row[lastColKey];
                          const midVal = midColKey ? row[midColKey] : null;

                          return (
                            <tr key={rIdx} className="align-top">
                              <td className="py-1 pr-1 text-zinc-500 font-mono">{rIdx + 1}</td>
                              <td className="py-1 pr-1">
                                <div className="font-medium leading-tight">{row[col0Key] || row.name || row.description || '-'}</div>
                                {row.date && <div className="text-[9px] text-zinc-500 font-mono">{row.date} {row.ref ? `• ${row.ref}` : ''}</div>}
                              </td>
                              {midColKey && (
                                <td className="py-1 text-center whitespace-nowrap font-mono">
                                  {midVal !== undefined && midVal !== null ? (typeof midVal === 'number' ? midVal.toLocaleString() : midVal) : '-'}
                                </td>
                              )}
                              <td className="py-1 text-right font-medium font-mono whitespace-nowrap">
                                {lastVal !== undefined && lastVal !== null
                                  ? typeof lastVal === 'number'
                                    ? `৳${lastVal.toLocaleString()}`
                                    : lastVal
                                  : '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-zinc-500">No records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {/* Totals */}
                {data.totals && (
                  <div className="border-t-2 border-black pt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span>REPORT TOTAL:</span>
                      <span className="font-mono">
                        {Object.values(data.totals).map((val: any, idx: number) => (
                          <span key={idx} className="ml-2">
                            {typeof val === 'number' ? `৳${val.toLocaleString()}` : val}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 pt-2 border-t border-dashed border-zinc-400 text-center text-[9px] text-zinc-500">
                  The report is computer generated and no signature is required.
                </div>
              </div>
            ) : (
              <div className={`printable-report w-full ${printOrientation === 'LANDSCAPE' ? 'max-w-[1200px]' : 'max-w-[950px]'} bg-white text-black p-8 md:p-10 shadow-xl border border-zinc-200 rounded-sm font-sans flex flex-col justify-between min-h-[1080px] print:shadow-none print:border-none print:p-6 print:w-full print:max-w-none print:min-h-screen`}>
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-3 mb-4">
                    <div className="flex items-start gap-3">
                      {companySettings.logoUrl ? (
                        <img
                          src={companySettings.logoUrl}
                          alt={companySettings.name || 'Store Logo'}
                          className="h-12 w-auto object-contain shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div
                          className="px-2.5 py-1.5 flex items-center justify-center rounded-xs"
                          style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                        >
                          <span className="text-base font-serif font-black tracking-wider">
                            {companySettings.name ? companySettings.name.slice(0, 3).toUpperCase() : 'POS'}
                          </span>
                        </div>
                      )}
                      <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-black font-serif">
                          {companySettings.name || 'DokanPro ERP'}
                        </h1>
                        {companySettings.nameBn && (
                          <p className="text-xs text-zinc-700 font-bold">{companySettings.nameBn}</p>
                        )}
                        {companySettings.address && (
                          <p className="text-xs text-zinc-700">{companySettings.address}</p>
                        )}
                        {companySettings.phone && (
                          <p className="text-xs text-zinc-700">Phone: {companySettings.phone} {companySettings.email ? `• ${companySettings.email}` : ''}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-zinc-800 font-semibold">
                        Period: {data.period || 'All Time'}
                      </div>
                      <div className="text-xs text-zinc-700 mt-1">
                        Date: {data.generatedDate || printToday}
                      </div>
                    </div>
                  </div>

                  {/* Centered Report Title Banner with Invoice Theme */}
                  <div className="text-center my-4">
                    <div
                      className="inline-block px-8 py-2 text-base md:text-lg font-black tracking-widest uppercase font-serif rounded-xs shadow-xs"
                      style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                    >
                      {data.reportTitle || title || 'REPORT STATEMENT'}
                    </div>
                  </div>

                  {/* Tabular Report Data */}
                  {data.columns && data.columns.length > 0 ? (
                    <table className="w-full text-left border-collapse text-xs mb-6">
                      <thead>
                        <tr
                          className="font-semibold"
                          style={{ backgroundColor: invoiceTheme.primary, color: invoiceTheme.textColor }}
                        >
                          <th className="py-2 px-2 text-center w-8 font-medium">#</th>
                          {data.columns.map((col: any, cIdx: number) => (
                            <th
                              key={cIdx}
                              className={`py-2 px-2 font-medium ${
                                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                              }`}
                            >
                              {col.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {data.rows && data.rows.length > 0 ? (
                          data.rows.map((row: any, rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-zinc-50">
                              <td className="py-2 px-2 text-center text-zinc-600 font-mono">{rIdx + 1}</td>
                              {data.columns.map((col: any, cIdx: number) => {
                                const val = row[col.key];
                                let displayVal = val;
                                if (col.format === 'currency' && typeof val === 'number') {
                                  displayVal = `৳ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                } else if (col.format === 'number' && typeof val === 'number') {
                                  displayVal = val.toLocaleString();
                                }
                                return (
                                  <td
                                    key={cIdx}
                                    className={`py-2 px-2 ${
                                      col.align === 'right'
                                        ? 'text-right font-mono'
                                        : col.align === 'center'
                                        ? 'text-center font-mono'
                                        : 'text-left'
                                    }`}
                                  >
                                    {displayVal !== undefined && displayVal !== null ? displayVal : '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={data.columns.length + 1} className="py-8 text-center text-zinc-500 font-medium">
                              No records found for the selected period / criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {data.totals && (
                        <tfoot>
                          <tr className="border-t-2 border-zinc-900 font-bold text-black" style={{ backgroundColor: '#f4f4f5' }}>
                            <td colSpan={2} className="py-2.5 px-3">REPORT TOTALS:</td>
                            {data.columns.slice(1).map((col: any, cIdx: number) => {
                              const totVal = data.totals[col.key];
                              return (
                                <td
                                  key={cIdx}
                                  className={`py-2.5 px-2 ${
                                    col.align === 'right'
                                      ? 'text-right font-mono'
                                      : col.align === 'center'
                                      ? 'text-center font-mono'
                                      : 'text-left'
                                  }`}
                                >
                                  {totVal !== undefined ? (typeof totVal === 'number' ? `৳ ${totVal.toLocaleString()}` : totVal) : ''}
                                </td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  ) : null}
                </div>
              </div>
            )
          )}

          </div>
        </div>
      </div>
    </div>
  );
};
