export type DashboardColorTheme = 'INDIGO' | 'EMERALD' | 'BLUE' | 'ROSE' | 'AMBER' | 'TEAL' | 'VIOLET' | 'SLATE' | 'CUSTOM';

export interface DashboardThemeDef {
  id: DashboardColorTheme;
  name: string;
  nameBn: string;
  primaryHex: string;
  badgeBg: string;
  badgeText: string;
  buttonGradient: string;
  hoverButtonGradient: string;
  ringColor: string;
  activeBg: string;
  sidebarHover: string;
  iconColor: string;
  isCustom?: boolean;
}

export const DASHBOARD_COLOR_THEMES: DashboardThemeDef[] = [
  {
    id: 'INDIGO',
    name: 'Royal Indigo (রয়্যাল ইন্ডিগো)',
    nameBn: 'রয়্যাল ইন্ডিগো ও ভায়োলেট',
    primaryHex: '#6366f1',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    buttonGradient: 'from-indigo-600 to-violet-600',
    hoverButtonGradient: 'hover:from-indigo-700 hover:to-violet-700',
    ringColor: 'ring-indigo-500/40',
    activeBg: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    sidebarHover: 'hover:bg-indigo-50/80 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300',
  },
  {
    id: 'EMERALD',
    name: 'Emerald Forest (পান্না সবুজ)',
    nameBn: 'পান্না ও ফরেস্ট গ্রিন',
    primaryHex: '#059669',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    buttonGradient: 'from-emerald-600 to-teal-600',
    hoverButtonGradient: 'hover:from-emerald-700 hover:to-teal-700',
    ringColor: 'ring-emerald-500/40',
    activeBg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    sidebarHover: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300',
  },
  {
    id: 'BLUE',
    name: 'Corporate Blue (কর্পোরেট ব্লু)',
    nameBn: 'কর্পোরেট রয়্যাল ব্লু',
    primaryHex: '#2563eb',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
    badgeText: 'text-blue-700 dark:text-blue-300',
    buttonGradient: 'from-blue-600 to-indigo-600',
    hoverButtonGradient: 'hover:from-blue-700 hover:to-indigo-700',
    ringColor: 'ring-blue-500/40',
    activeBg: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
    sidebarHover: 'hover:bg-blue-50/80 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300',
  },
  {
    id: 'ROSE',
    name: 'Ruby Rose (রুবি রোস)',
    nameBn: 'রুবি রোস ও পিংক',
    primaryHex: '#e11d48',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
    badgeText: 'text-rose-700 dark:text-rose-300',
    buttonGradient: 'from-rose-600 to-pink-600',
    hoverButtonGradient: 'hover:from-rose-700 hover:to-pink-700',
    ringColor: 'ring-rose-500/40',
    activeBg: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300',
    iconColor: 'text-rose-600 dark:text-rose-400',
    sidebarHover: 'hover:bg-rose-50/80 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-300',
  },
  {
    id: 'AMBER',
    name: 'Amber Gold (অ্যাম্বার গোল্ড)',
    nameBn: 'অ্যাম্বার গোল্ড ও সানসেট',
    primaryHex: '#d97706',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
    buttonGradient: 'from-amber-600 to-orange-600',
    hoverButtonGradient: 'hover:from-amber-700 hover:to-orange-700',
    ringColor: 'ring-amber-500/40',
    activeBg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400',
    sidebarHover: 'hover:bg-amber-50/80 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-300',
  },
  {
    id: 'TEAL',
    name: 'Ocean Teal (ওশেন টিল)',
    nameBn: 'সায়ান ও ওশেন টিল',
    primaryHex: '#0d9488',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/50',
    badgeText: 'text-teal-700 dark:text-teal-300',
    buttonGradient: 'from-teal-600 to-cyan-600',
    hoverButtonGradient: 'hover:from-teal-700 hover:to-cyan-700',
    ringColor: 'ring-teal-500/40',
    activeBg: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/30 dark:hover:bg-teal-950/50 text-teal-700 dark:text-teal-300',
    iconColor: 'text-teal-600 dark:text-teal-400',
    sidebarHover: 'hover:bg-teal-50/80 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-300',
  },
  {
    id: 'VIOLET',
    name: 'Deep Violet (ডিপ ভায়োলেট)',
    nameBn: 'ডিপ পার্পল ও ভায়োলেট',
    primaryHex: '#7c3aed',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/50',
    badgeText: 'text-purple-700 dark:text-purple-300',
    buttonGradient: 'from-purple-600 to-indigo-600',
    hoverButtonGradient: 'hover:from-purple-700 hover:to-indigo-700',
    ringColor: 'ring-purple-500/40',
    activeBg: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300',
    iconColor: 'text-purple-600 dark:text-purple-400',
    sidebarHover: 'hover:bg-purple-50/80 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300',
  },
  {
    id: 'SLATE',
    name: 'Midnight Slate (মিডনাইট স্লেট)',
    nameBn: 'চারকোল ও স্লেট ব্ল্যাক',
    primaryHex: '#334155',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-800 dark:text-slate-200',
    buttonGradient: 'from-slate-700 to-zinc-800',
    hoverButtonGradient: 'hover:from-slate-800 hover:to-zinc-900',
    ringColor: 'ring-slate-500/40',
    activeBg: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white',
    iconColor: 'text-slate-700 dark:text-slate-300',
    sidebarHover: 'hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white',
  },
  {
    id: 'CUSTOM',
    name: 'Custom Choice (কাস্টম পছন্দের রং)',
    nameBn: 'নিজের ইচ্ছা মত কালার',
    primaryHex: '#6366f1',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    buttonGradient: 'from-indigo-600 to-violet-600',
    hoverButtonGradient: 'hover:from-indigo-700 hover:to-violet-700',
    ringColor: 'ring-indigo-500/40',
    activeBg: 'custom-sidebar-active',
    iconColor: 'custom-sidebar-icon',
    sidebarHover: 'custom-sidebar-hover',
    isCustom: true,
  },
];

export const getDashboardTheme = (themeId?: DashboardColorTheme, customHex?: string): DashboardThemeDef => {
  const found = DASHBOARD_COLOR_THEMES.find(t => t.id === (themeId || 'INDIGO'));
  const theme = found || DASHBOARD_COLOR_THEMES[0];
  if (theme.id === 'CUSTOM' || themeId === 'CUSTOM') {
    const hex = customHex || '#6366f1';
    return {
      ...DASHBOARD_COLOR_THEMES.find(t => t.id === 'CUSTOM')!,
      primaryHex: hex,
      isCustom: true,
    };
  }
  return theme;
};
