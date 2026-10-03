import { CompanySettings, InvoiceColorTheme, InvoiceColorPalette, InvoiceTemplateStyle, InvoiceTemplateDef } from '../types';

export const INVOICE_TEMPLATE_PRESETS: InvoiceTemplateDef[] = [
  {
    id: 'MODERN_MINIMAL',
    name: 'Modern Minimal (মডার্ন মিনিমাল)',
    nameBn: 'মডার্ন মিনিমাল ও ক্লিন',
    description: 'Clean modern grid layout with high-contrast typography, distinct invoice header badge & QR summary.',
    descriptionBn: 'ক্লিন ও আধুনিক পরিচ্ছন্ন লেআউট, স্পষ্ট টেবিল, কিউআর কোড ও প্রফেশনাল মিনিমাল বর্ডার।',
    badge: 'Popular',
  },
  {
    id: 'CLASSIC_CORPORATE',
    name: 'Classic Corporate (কর্পোরেট স্ট্যান্ডার্ড)',
    nameBn: 'কর্পোরেট স্ট্যান্ডার্ড ও ব্যানার',
    description: 'Full-width solid color banner header, dual Billed-To/Billed-By cards, double-border table & official stamps.',
    descriptionBn: 'ফুল-উইডথ কালার ব্যানার হেডার, অফিশিয়াল ক্রেতা-বিক্রেতা বক্স, স্ট্যান্ডার্ড টেবিল ও সিগনেচার সিল।',
    badge: 'Official',
  },
  {
    id: 'ELEGANT_FRAME',
    name: 'Elegant Framed (এলিগ্যান্ট ফ্রেম)',
    nameBn: 'এলিগ্যান্ট বর্ডার ফ্রেম',
    description: 'Sophisticated outer border with corner accents, luxury typography, item warranty rows & payment method card.',
    descriptionBn: 'চারপাশে নিখুঁত বর্ডার ফ্রেম, লাক্সারি হেডার, ওয়ারেন্টি নোট ও ডেডিকেটেড পেমেন্ট মেথড ব্লক।',
    badge: 'Luxury',
  },
  {
    id: 'SLATE_CONTEMPORARY',
    name: 'Slate Contemporary (কনটেম্পরারি)',
    nameBn: 'কনটেম্পরারি ডার্ক বার',
    description: 'Modern asymmetric layout with accent sidebar stripe, paid status pills & highlighted net total box.',
    descriptionBn: 'আধুনিক অ্যাসিম্যাট্রিক হেডার, পেইড/ডিউ স্ট্যাটাস ব্যাজ ও ডার্ক অ্যাকসেন্ট হাইলাইট সামারি।',
    badge: 'Modern',
  },
  {
    id: 'COMPACT_BILL',
    name: 'Compact Wholesale (কমপ্যাক্ট রিটেইল)',
    nameBn: 'কমপ্যাক্ট রিটেইল ও হোলসেল',
    description: 'High-density space-saving format engineered for multi-item invoices, wholesale trading & paper conservation.',
    descriptionBn: 'কাগজ সাশ্রয়ী হাই-ডেনসিটি লেআউট, একসাথে অনেক আইটেম প্রিন্ট ও পাইকারি ব্যবসার জন্য সেরা।',
    badge: 'Fast & Dense',
  },
  {
    id: 'CREATIVE_STUDIO',
    name: 'Creative Studio (প্রিমিয়াম স্টুডিও)',
    nameBn: 'প্রিমিয়াম ক্রিয়েটিভ স্টুডিও',
    description: 'Bold creative design with oversized invoice number display, floating payment chips, QR code & bank details.',
    descriptionBn: 'স্টাইলিশ বোল্ড মেমো ও ইনভয়েস নম্বর, ব্যাংক/বিকাশ অ্যাকাউন্ট বক্স ও আধুনিক ক্রিয়েটিভ ফিনিশিং।',
    badge: 'Creative',
  },
];

export const getInvoiceTemplate = (settingsOrId?: Partial<CompanySettings> | InvoiceTemplateStyle | string): InvoiceTemplateDef => {
  const templateId = typeof settingsOrId === 'string' 
    ? settingsOrId 
    : (settingsOrId?.invoiceTemplate || 'MODERN_MINIMAL');
  const found = INVOICE_TEMPLATE_PRESETS.find(t => t.id === templateId);
  return found || INVOICE_TEMPLATE_PRESETS[0];
};

export const INVOICE_COLOR_PRESETS: InvoiceColorPalette[] = [
  {
    id: 'INDIGO_VIOLET',
    name: 'Royal Indigo (ভায়োলেট / ইন্ডিগো)',
    nameBn: 'রয়্যাল ইন্ডিগো / ভায়োলেট',
    primary: '#6366f1',
    secondary: '#4f46e5',
    lightBg: '#eef2ff',
    borderColor: '#c7d2fe',
    textColor: '#ffffff',
  },
  {
    id: 'NAVY_BLUE',
    name: 'Corporate Navy (কর্পোরেট নেভি ব্লু)',
    nameBn: 'কর্পোরেট নেভি ব্লু',
    primary: '#1e3a8a',
    secondary: '#1d4ed8',
    lightBg: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#ffffff',
  },
  {
    id: 'CLASSIC_BLACK',
    name: 'Classic Black & Zinc (ক্ল্যাসিক ব্ল্যাক)',
    nameBn: 'ক্ল্যাসিক ব্ল্যাক ও চারকোল',
    primary: '#18181b',
    secondary: '#27272a',
    lightBg: '#f4f4f5',
    borderColor: '#e4e4e7',
    textColor: '#ffffff',
  },
  {
    id: 'EMERALD_GREEN',
    name: 'Emerald Forest (পান্না সবুজ)',
    nameBn: 'পান্না ও ফরেস্ট গ্রিন',
    primary: '#065f46',
    secondary: '#059669',
    lightBg: '#ecfdf5',
    borderColor: '#a7f3d0',
    textColor: '#ffffff',
  },
  {
    id: 'CRIMSON_RED',
    name: 'Crimson & Ruby (রুবী রেড)',
    nameBn: 'ক্রিমসন ও রুবী রেড',
    primary: '#991b1b',
    secondary: '#dc2626',
    lightBg: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#ffffff',
  },
  {
    id: 'ROYAL_PURPLE',
    name: 'Imperial Purple (রয়্যাল পার্পল)',
    nameBn: 'রাজকীয় পার্পল ও ভায়োলেট',
    primary: '#581c87',
    secondary: '#7c3aed',
    lightBg: '#faf5ff',
    borderColor: '#e9d5ff',
    textColor: '#ffffff',
  },
  {
    id: 'DARK_TEAL',
    name: 'Ocean Teal (ডিপ টিল / সায়ান)',
    nameBn: 'ওশান টিল ও সায়ান',
    primary: '#134e4a',
    secondary: '#0d9488',
    lightBg: '#f0fdfa',
    borderColor: '#99f6e4',
    textColor: '#ffffff',
  },
  {
    id: 'AMBER_WARM',
    name: 'Warm Bronze & Amber (ব্রোঞ্জ ও অ্যাম্বার)',
    nameBn: 'উষ্ণ ব্রোঞ্জ ও গোল্ডেন',
    primary: '#78350f',
    secondary: '#d97706',
    lightBg: '#fffbeb',
    borderColor: '#fde68a',
    textColor: '#ffffff',
  },
  {
    id: 'SLATE_MODERN',
    name: 'Modern Slate (মডার্ন স্লেট)',
    nameBn: 'মডার্ন স্লেট ও গ্রে',
    primary: '#334155',
    secondary: '#475569',
    lightBg: '#f8fafc',
    borderColor: '#cbd5e1',
    textColor: '#ffffff',
  },
];

export const getInvoiceTheme = (settings?: Partial<CompanySettings>): InvoiceColorPalette => {
  const themeId = settings?.invoiceColorTheme || 'INDIGO_VIOLET';

  if (themeId === 'CUSTOM' && settings?.invoiceCustomPrimaryColor) {
    const primary = settings.invoiceCustomPrimaryColor;
    const secondary = settings.invoiceCustomAccentColor || primary;
    return {
      id: 'CUSTOM',
      name: 'Custom Brand Color',
      nameBn: 'কাস্টম ব্র্যান্ড কালার',
      primary: primary,
      secondary: secondary,
      lightBg: '#f8fafc',
      borderColor: '#e2e8f0',
      textColor: '#ffffff',
    };
  }

  const found = INVOICE_COLOR_PRESETS.find(p => p.id === themeId);
  return found || INVOICE_COLOR_PRESETS[0];
};
