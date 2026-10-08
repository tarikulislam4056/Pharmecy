import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  X,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  ShieldAlert,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  ExpiringProductItem,
  getExpiringProductsWithinDays,
  getPushPermissionStatus,
  requestPushPermission,
  sendBrowserPushNotification,
  triggerExpiryPushNotifications,
  PushPermissionState,
} from '../../utils/expiryNotificationService';

interface ExpiryAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToBatches?: () => void;
  onNavigateToProducts?: () => void;
}

export const ExpiryAlertModal: React.FC<ExpiryAlertModalProps> = ({
  isOpen,
  onClose,
  onNavigateToBatches,
  onNavigateToProducts,
}) => {
  const { products, language, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'EXPIRED' | 'CRITICAL' | 'WARNING'>('ALL');
  const [pushStatus, setPushStatus] = useState<PushPermissionState>(() => getPushPermissionStatus());
  const [isRequestingPush, setIsRequestingPush] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPushStatus(getPushPermissionStatus());
    }
  }, [isOpen]);

  // Products expiring within 5 days
  const expiringItems = useMemo(() => {
    return getExpiringProductsWithinDays(products, 5);
  }, [products]);

  const filteredItems = useMemo(() => {
    return expiringItems.filter(item => {
      const matchSearch =
        !searchQuery ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productNameBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.generic && item.generic.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.batchNumber && item.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.barcode && item.barcode.includes(searchQuery));

      let matchFilter = true;
      if (filterType === 'EXPIRED') matchFilter = item.urgency === 'EXPIRED';
      else if (filterType === 'CRITICAL') matchFilter = item.urgency === 'CRITICAL';
      else if (filterType === 'WARNING') matchFilter = item.urgency === 'WARNING';

      return matchSearch && matchFilter;
    });
  }, [expiringItems, searchQuery, filterType]);

  const expiredCount = useMemo(() => expiringItems.filter(i => i.urgency === 'EXPIRED').length, [expiringItems]);
  const criticalCount = useMemo(() => expiringItems.filter(i => i.urgency === 'CRITICAL').length, [expiringItems]);
  const warningCount = useMemo(() => expiringItems.filter(i => i.urgency === 'WARNING').length, [expiringItems]);

  const handleEnablePush = async () => {
    setIsRequestingPush(true);
    try {
      const perm = await requestPushPermission();
      setPushStatus(perm);
      if (perm === 'granted') {
        showToast(
          language === 'bn'
            ? 'ব্রাউজার পুশ নোটিফিকেশন সফলভাবে চালু করা হয়েছে!'
            : 'Browser push notifications successfully enabled!',
          'success'
        );
        // Dispatch test notification
        sendBrowserPushNotification(
          language === 'bn' ? '🔔 DokanPro ERP মেয়াদ সতর্কতা সিস্টেম' : '🔔 DokanPro ERP Expiry Alerts Active',
          {
            body:
              language === 'bn'
                ? 'এখন থেকে যেকোনো পণ্যের মেয়াদ ৫ দিন আগে আপনাকে পুশ নোটিফিকেশন দেওয়া হবে।'
                : 'You will now receive push notifications 5 days before any item expires.',
          }
        );
      } else {
        showToast(
          language === 'bn'
            ? 'পুশ নোটিফিকেশন পারমিশন দেওয়া হয়নি। ব্রাউজার সেটিংসে অনুমতি দিন।'
            : 'Notification permission not granted. Please allow in browser settings.',
          'warning'
        );
      }
    } finally {
      setIsRequestingPush(false);
    }
  };

  const handleSendTestPush = () => {
    if (pushStatus !== 'granted') {
      handleEnablePush();
      return;
    }

    const res = triggerExpiryPushNotifications(products, {
      daysThreshold: 5,
      force: true,
      language: language as any,
    });

    if (res.notifiedCount > 0) {
      showToast(
        language === 'bn'
          ? `${res.notifiedCount}টি পণ্যের জন্য পুশ নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!`
          : `Push notification sent for ${res.notifiedCount} items!`,
        'success'
      );
    } else {
      // Send a general notification if no items currently expire in <= 5 days
      sendBrowserPushNotification(
        language === 'bn' ? '✅ মেয়াদ পুশ নোটিফিকেশন টেস্ট' : '✅ Expiry Push Notification Test',
        {
          body:
            language === 'bn'
              ? 'বর্তমানে ৫ দিনের মধ্যে কোনো পণ্য মেয়াদোত্তীর্ণ হচ্ছে না। সিস্টেম সফলভাবে সক্রিয় আছে।'
              : 'No items currently expiring within 5 days. Notification system is fully active.',
        }
      );
      showToast(
        language === 'bn'
          ? 'টেস্ট পুশ নোটিফিকেশন সফলভাবে পাঠানো হয়েছে।'
          : 'Test push notification sent successfully.',
        'info'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {language === 'bn' ? 'মেয়াদোত্তীর্ণ ও ৫ দিনের মেয়াদ সতর্কতা' : 'Product Expiry & 5-Day Push Alerts'}
                </h3>
                <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {expiringItems.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'bn'
                  ? 'কোনো প্রোডাক্টের মেয়াদ শেষ হওয়ার ৫ দিন আগে থেকে অ্যাডমিন প্যানেলে পুশ নোটিফিকেশন পাঠানো হয়।'
                  : 'Automatic browser push notifications are triggered 5 days prior to product expiration.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Push Notification Controls Card */}
        <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {language === 'bn' ? 'ব্রাউজার পুশ নোটিফিকেশন:' : 'Browser Push Notifications:'}
                </span>
                {pushStatus === 'granted' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{language === 'bn' ? 'চালু আছে (Active)' : 'Active'}</span>
                  </span>
                ) : pushStatus === 'denied' ? (
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
                    {language === 'bn' ? 'ব্লক করা (Blocked)' : 'Blocked in Browser'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                    {language === 'bn' ? 'অনুমতি প্রয়োজন' : 'Permission Required'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'bn'
                  ? 'মেয়াদ ৫ দিন বাকি থাকলেই ডিভাইসে রিয়েল পুশ অ্যালার্ট ভেসে উঠবে।'
                  : 'Real desktop/mobile alerts will pop up 5 days before expiration.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {pushStatus !== 'granted' ? (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isRequestingPush}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'পুশ নোটিফিকেশন চালু করুন' : 'Enable Push Notifications'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendTestPush}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'টেস্ট নোটিফিকেশন পাঠান' : 'Send Test Notification'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {language === 'bn' ? 'সবগুলো' : 'All'} ({expiringItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('EXPIRED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'EXPIRED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              {language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Expired'} ({expiredCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('CRITICAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'CRITICAL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              {language === 'bn' ? '০-২ দিন বাকি' : '0-2 Days'} ({criticalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('WARNING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'WARNING'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100'
              }`}
            >
              {language === 'bn' ? '৩-৫ দিন বাকি' : '3-5 Days'} ({warningCount})
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={language === 'bn' ? 'পণ্য বা ব্যাচ খুঁজুন...' : 'Search product or batch...'}
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {language === 'bn' ? 'কোনো পণ্য ৫ দিনের মধ্যে মেয়াদোত্তীর্ণ হচ্ছে না!' : 'No products expiring within 5 days!'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {language === 'bn'
                  ? 'আপনার ইনভেন্টরির সকল পণ্যের মেয়াদ নিরাপদ রয়েছে। কোনো পণ্য ৫ দিন সীমার মধ্যে এলে স্বয়ংক্রিয় পুশ অ্যালার্ট দেওয়া হবে।'
                  : 'All inventory products have sufficient shelf life. Automatic push alerts will trigger when an item enters the 5-day window.'}
              </p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isExpired = item.daysRemaining < 0;
              const isToday = item.daysRemaining === 0;

              return (
                <div
                  key={`${item.productId}-${item.batchId || 'root'}`}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isExpired
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : isToday || item.daysRemaining <= 2
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {item.productName}
                      </span>
                      {item.productNameBn && item.productNameBn !== item.productName && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ({item.productNameBn})
                        </span>
                      )}
                      {item.generic && (
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                          {item.generic}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                      {item.batchNumber && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                          <Layers className="w-3 h-3 text-slate-400" />
                          <span>Batch: {item.batchNumber}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Exp: <strong className="text-slate-700 dark:text-slate-200">{item.expDate}</strong></span>
                      </span>
                      <span className="text-[11px] font-medium">
                        {language === 'bn' ? 'মজুদ:' : 'Stock:'}{' '}
                        <strong className="text-slate-800 dark:text-slate-200">{item.stock} {item.unit}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Urgency Badge */}
                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <div className="text-right">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl font-black text-xs bg-rose-600 text-white shadow-xs">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Expired'}</span>
                        </span>
                      ) : isToday ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl font-black text-xs bg-rose-500 text-white animate-pulse shadow-xs">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'আজকে মেয়াদ শেষ!' : 'Expires Today!'}</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl font-black text-xs ${
                            item.daysRemaining <= 2
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-blue-600 text-white shadow-xs'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {language === 'bn' ? `আর মাত্র ${item.daysRemaining} দিন বাকি` : `${item.daysRemaining} Days Left`}
                          </span>
                        </span>
                      )}
                      <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                        {language === 'bn' ? 'পুশ অ্যালার্ট অন্তর্ভুক্ত' : 'Push alert active'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{language === 'bn' ? 'অ্যাডমিন পুশ নোটিফিকেশন সার্ভিস ৫-দিন ব্যবধানে সক্রিয়' : 'Admin push notification active for 5-day expiry window'}</span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToBatches && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToBatches();
                }}
                className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ব্যাচ ইনভেন্টরি' : 'Batch Inventory'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
