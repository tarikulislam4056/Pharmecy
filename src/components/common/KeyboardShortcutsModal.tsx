import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Keyboard, Command, Zap, ArrowRight } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

interface ShortcutGroup {
  categoryBn: string;
  categoryEn: string;
  shortcuts: {
    keys: string[];
    labelBn: string;
    labelEn: string;
    targetTab?: string;
  }[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { language } = useApp();

  if (!isOpen) return null;

  const shortcutGroups: ShortcutGroup[] = [
    {
      categoryBn: 'প্রধান নেভিগেশন (Navigation)',
      categoryEn: 'Main Navigation',
      shortcuts: [
        {
          keys: ['Ctrl', 'N'],
          labelBn: 'নতুন বিক্রয় / POS এ যান',
          labelEn: 'New Sale / Open POS',
          targetTab: 'pos',
        },
        {
          keys: ['Ctrl', 'P'],
          labelBn: 'পণ্য ও স্টক তালিকা',
          labelEn: 'Products & Inventory',
          targetTab: 'products-list',
        },
        {
          keys: ['Ctrl', 'D'],
          labelBn: 'ড্যাশবোর্ড হোমে ফিরুন',
          labelEn: 'Return to Dashboard',
          targetTab: 'dashboard',
        },
        {
          keys: ['Ctrl', 'B'],
          labelBn: 'ডে বুক ও ক্যাশ হিসাব',
          labelEn: 'Day Book & Daily Cash',
          targetTab: 'daybook',
        },
        {
          keys: ['Ctrl', 'S'],
          labelBn: 'বিক্রি তালিকা (Sales List)',
          labelEn: 'Sales History & Invoices',
          targetTab: 'sales-list',
        },
        {
          keys: ['Ctrl', 'Shift', 'P'],
          labelBn: 'নতুন ক্রয় ইন্ট্রি (Purchase Entry)',
          labelEn: 'New Purchase Entry',
          targetTab: 'purchase-entry',
        },
        {
          keys: ['Ctrl', 'R'],
          labelBn: 'রিপোর্টস ও অ্যানালিটিক্স',
          labelEn: 'Reports & Business Analytics',
          targetTab: 'reports',
        },
      ],
    },
    {
      categoryBn: 'দ্রুত ইন্ট্রি ও পপআপ (Quick Actions)',
      categoryEn: 'Quick Entry & Modals',
      shortcuts: [
        {
          keys: ['Ctrl', 'E'],
          labelBn: 'নতুন খরচ যুক্ত করুন (Add Expense)',
          labelEn: 'Record New Expense',
        },
        {
          keys: ['Ctrl', 'I'],
          labelBn: 'কাস্টমার থেকে টাকা প্রাপ্তি (Payment In)',
          labelEn: 'Receive Customer Payment',
        },
        {
          keys: ['Ctrl', 'O'],
          labelBn: 'মহাজনকে টাকা পরিশোধ (Payment Out)',
          labelEn: 'Supplier Payment Out',
        },
        {
          keys: ['Ctrl', 'K'],
          labelBn: 'ভাউচার ও মেমো দ্রুত সার্চ',
          labelEn: 'Global Voucher & Memo Search',
        },
      ],
    },
    {
      categoryBn: 'সিস্টেম ও হেল্প (System & Help)',
      categoryEn: 'System & Helper',
      shortcuts: [
        {
          keys: ['Shift', '?'],
          labelBn: 'কীবোর্ড শর্টকাট গাইড খুলুন/বন্ধ করুন',
          labelEn: 'Open / Close Keyboard Shortcuts',
        },
        {
          keys: ['Esc'],
          labelBn: 'যেকোনো খোলা পপআপ / উইন্ডো বন্ধ করুন',
          labelEn: 'Close active modal / overlay',
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8572FF]/10 text-[#8572FF] flex items-center justify-center border border-[#8572FF]/20 shrink-0">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {language === 'bn' ? 'কীবোর্ড শর্টকাট গাইড' : 'Keyboard Shortcuts Guide'}
                </span>
                <span className="text-[10px] font-mono uppercase bg-[#8572FF] text-white px-2 py-0.5 rounded-full font-black tracking-wider">
                  Power User
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'bn'
                  ? 'দ্রুত নেভিগেশন এবং ডাটা এন্ট্রির জন্য শর্টকাটগুলো ব্যবহার করুন (Ctrl বা Alt বিকল্প)'
                  : 'Press keys anytime for instant navigation and faster workflow (Ctrl or Alt)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcut Groups */}
        <div className="p-5 overflow-y-auto space-y-6 divide-y divide-slate-100 dark:divide-slate-800/60">
          {shortcutGroups.map((group, idx) => (
            <div key={idx} className={idx > 0 ? 'pt-5' : ''}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8572FF] mb-3 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? group.categoryBn : group.categoryEn}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.shortcuts.map((sc, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (sc.targetTab && onNavigate) {
                        onNavigate(sc.targetTab);
                        onClose();
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-[#8572FF]/40 transition-all ${
                      sc.targetTab ? 'cursor-pointer hover:bg-[#8572FF]/5 group' : ''
                    }`}
                  >
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <span>{language === 'bn' ? sc.labelBn : sc.labelEn}</span>
                      {sc.targetTab && (
                        <ArrowRight className="w-3 h-3 text-[#8572FF] opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </span>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {sc.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd className="px-2 py-1 text-[10px] font-mono font-black text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-2xs">
                            {k}
                          </kbd>
                          {kIdx < sc.keys.length - 1 && (
                            <span className="text-[10px] text-slate-400 font-bold">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Command className="w-4 h-4 text-slate-400" />
            <span>
              {language === 'bn'
                ? 'সংকেত: Windows এ Ctrl এবং Mac এ Cmd ব্যবহার করুন'
                : 'Tip: Works with Ctrl or Cmd key combinations'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#8572FF] hover:bg-[#725cf7] text-white rounded-lg font-bold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            {language === 'bn' ? 'ঠিক আছে' : 'Got It'}
          </button>
        </div>
      </div>
    </div>
  );
};
