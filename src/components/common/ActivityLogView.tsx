import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Search,
  Filter,
  Trash2,
  Sliders,
  Settings,
  UserCheck,
  Download,
  Calendar,
  RefreshCw,
  Globe,
  MapPin,
  Laptop,
  LogIn,
  LogOut,
  Smartphone,
  Monitor,
  Activity,
} from 'lucide-react';

export const ActivityLogView: React.FC = () => {
  const { activityLogs, language } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const matchSearch =
        !searchQuery ||
        log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.userName && log.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.ip && log.ip.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.location && log.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.device && log.device.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = selectedType === 'ALL' || log.actionType === selectedType;
      const matchSeverity = selectedSeverity === 'ALL' || log.severity === selectedSeverity;

      return matchSearch && matchType && matchSeverity;
    });
  }, [activityLogs, searchQuery, selectedType, selectedSeverity]);

  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'Action Type',
      'User Name',
      'Role',
      'IP Address',
      'Location',
      'Device & Client',
      'Title',
      'Description',
    ];
    const rows = filteredLogs.map(l => [
      `"${l.timestamp}"`,
      l.actionType,
      `"${l.userName || ''}"`,
      l.role || '',
      `"${l.ip || '103.145.74.22'}"`,
      `"${(l.location || 'Dhaka, Bangladesh').replace(/"/g, '""')}"`,
      `"${(l.device || 'Desktop PC').replace(/"/g, '""')}"`,
      `"${l.title.replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Activity_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-inner shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {language === 'bn' ? 'অ্যাক্টিভিটি লগ ও ডিভাইস অডিট' : 'Activity Log & Device Security Audit'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'bn'
                ? 'ব্যবহারকারীর লগইন, আইপি এড্রেস, লোকেশন, ডিভাইস এবং সিস্টেমের গুরুত্বপূর্ণ পরিবর্তন ট্র্যাক করুন।'
                : 'Tracks user logins, IP address, geographic location, device hardware, deletions, and administrative changes.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'bn' ? 'CSV এক্সপোর্ট' : 'Export Logs CSV'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            {language === 'bn' ? 'মোট লগ এন্ট্রি' : 'Total Activity Logs'}
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {activityLogs.length}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase flex items-center gap-1">
            <LogIn className="w-3 h-3" />
            <span>{language === 'bn' ? 'লগইন সেশন লগ' : 'Login / Auth Logs'}</span>
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {activityLogs.filter(l => l.actionType === 'LOGIN' || l.actionType === 'LOGOUT').length}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-rose-500 uppercase">
            {language === 'bn' ? 'ডিলিট অপারেশন' : 'Deletions'}
          </span>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
            {activityLogs.filter(l => l.actionType === 'DELETE').length}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-blue-500 uppercase">
            {language === 'bn' ? 'অন্যান্য সিস্টেম অ্যাক্টিভিটি' : 'Stock & Settings'}
          </span>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {activityLogs.filter(l => l.actionType !== 'DELETE' && l.actionType !== 'LOGIN' && l.actionType !== 'LOGOUT').length}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            {language === 'bn' ? 'অ্যাকশন টাইপ ফিল্টার' : 'Action Type Filter'}
          </label>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
          >
            <option value="ALL">{language === 'bn' ? 'সকল অ্যাকশন টাইপ' : 'All Action Types'}</option>
            <option value="LOGIN">{language === 'bn' ? 'লগইন (Login)' : 'LOGIN'}</option>
            <option value="LOGOUT">{language === 'bn' ? 'লগআউট (Logout)' : 'LOGOUT'}</option>
            <option value="DELETE">{language === 'bn' ? 'ডিলিট (Delete)' : 'DELETE'}</option>
            <option value="STOCK_ADJUSTMENT">{language === 'bn' ? 'স্টক অ্যাডজাস্টমেন্ট' : 'STOCK_ADJUSTMENT'}</option>
            <option value="SETTINGS_UPDATE">{language === 'bn' ? 'সেটিংস আপডেট' : 'SETTINGS_UPDATE'}</option>
            <option value="USER_ACTION">{language === 'bn' ? 'ইউজার অ্যাকশন' : 'USER_ACTION'}</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            {language === 'bn' ? 'ঝুঁকি স্তর (Severity)' : 'Severity Level'}
          </label>
          <select
            value={selectedSeverity}
            onChange={e => setSelectedSeverity(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
          >
            <option value="ALL">{language === 'bn' ? 'সকল লেভেল' : 'All Severities'}</option>
            <option value="danger">{language === 'bn' ? 'বিপদজনক / ডিলিট (Danger)' : 'Danger'}</option>
            <option value="warning">{language === 'bn' ? 'সতর্কতা / স্টক (Warning)' : 'Warning'}</option>
            <option value="info">{language === 'bn' ? 'সাধারণ তথ্য (Info)' : 'Info'}</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            {language === 'bn' ? 'অনুসন্ধান (IP, ডিভাইস বা নাম)' : 'Search Log, IP, Device...'}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                language === 'bn'
                  ? 'আইপি, লোকেশন, ডিভাইস, ইউজার বা শিরোনাম দিয়ে খুঁজুন...'
                  : 'Search by IP, location, device, user, or title...'
              }
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">{language === 'bn' ? 'সময় ও তারিখ' : 'Timestamp'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'অ্যাকশন ধরণ' : 'Action Type'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'ইউজার / অপারেটর' : 'User / Operator'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'ডিভাইস, আইপি ও লোকেশন' : 'Device, IP & Location'}</th>
                <th className="py-3 px-4">{language === 'bn' ? 'কার্যক্রম বিবরণী' : 'Action Details'}</th>
                <th className="py-3 px-4 text-center">{language === 'bn' ? 'ঝুঁকি' : 'Severity'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                    {language === 'bn' ? 'কোনো অ্যাক্টিভিটি লগ পাওয়া যায়নি।' : 'No activity logs found matching current filters.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isDanger = log.severity === 'danger' || log.actionType === 'DELETE';
                  const isWarning = log.severity === 'warning' || log.actionType === 'STOCK_ADJUSTMENT';
                  const isLogin = log.actionType === 'LOGIN';
                  const isLogout = log.actionType === 'LOGOUT';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[10px] ${
                            isDanger
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                              : isWarning
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
                              : isLogin
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                              : isLogout
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
                          }`}
                        >
                          {log.actionType === 'DELETE' && <Trash2 className="w-3 h-3" />}
                          {log.actionType === 'STOCK_ADJUSTMENT' && <Sliders className="w-3 h-3" />}
                          {log.actionType === 'SETTINGS_UPDATE' && <Settings className="w-3 h-3" />}
                          {log.actionType === 'LOGIN' && <LogIn className="w-3 h-3" />}
                          {log.actionType === 'LOGOUT' && <LogOut className="w-3 h-3" />}
                          {log.actionType === 'USER_ACTION' && <UserCheck className="w-3 h-3" />}
                          <span>{log.actionType}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.userName || 'Admin'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono uppercase">
                          {log.role || 'ADMIN'}
                        </div>
                      </td>

                      {/* Client Device, IP & Location Column */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-1">
                          {/* IP Address */}
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              <Globe className="w-3 h-3 text-blue-500 shrink-0" />
                              <span>{log.ip || '103.145.74.22'}</span>
                            </span>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 truncate" title={log.location || 'Dhaka, Bangladesh'}>
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{log.location || 'Dhaka, Bangladesh'}</span>
                          </div>

                          {/* Device / OS / Browser */}
                          <div className="flex items-center gap-1 text-[10.5px] text-slate-500 dark:text-slate-400 truncate" title={log.device || 'Desktop PC (Windows · Chrome)'}>
                            <Laptop className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate">{log.device || 'Desktop PC (Windows · Chrome)'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {log.title}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-snug">
                          {log.description}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            isDanger
                              ? 'bg-rose-500'
                              : isWarning
                              ? 'bg-amber-500'
                              : isLogin
                              ? 'bg-emerald-500'
                              : 'bg-blue-500'
                          }`}
                          title={log.severity}
                        />
                        <span className="text-[10px] text-slate-400 uppercase block mt-0.5 font-mono">
                          {log.severity}
                        </span>
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
  );
};
