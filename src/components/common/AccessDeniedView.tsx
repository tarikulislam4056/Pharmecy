import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { getFirstAllowedTab } from '../../utils/permissions';

interface AccessDeniedViewProps {
  moduleName?: string;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({ moduleName }) => {
  const { language, currentUser, setActiveTab } = useApp();

  const handleGoToAllowedTab = () => {
    const firstAllowed = getFirstAllowedTab(currentUser);
    setActiveTab(firstAllowed);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-lg space-y-5">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-2xl mx-auto flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {language === 'bn' ? 'প্রবেশাধিকার সংরক্ষিত (Access Denied)' : 'Access Restricted'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {language === 'bn'
              ? `আপনার ইউজার অ্যাকাউন্টে (${currentUser.fullName} - ${currentUser.role}) এই মডিউলটি ব্যবহারের অনুমতি দেওয়া হয়নি। শুধুমাত্র অনুমোদিত মডিউলগুলোতে আপনার প্রবেশাধিকার রয়েছে।`
              : `Your account (${currentUser.fullName} - ${currentUser.role}) does not have permission to access ${moduleName ? `the ${moduleName} module` : 'this area'}. Please contact your administrator if you need access.`}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleGoToAllowedTab}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'bn' ? 'অনুমোদিত পেজে ফিরুন' : 'Go to Allowed Page'}</span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Role-Based Access Control (RBAC) Active</span>
        </div>
      </div>
    </div>
  );
};
