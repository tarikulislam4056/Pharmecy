import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronRight, RotateCcw, Filter, Check } from 'lucide-react';

export type FilterPeriodType = 'daily' | 'monthly' | 'custom' | 'all';

interface DatePeriodFilterProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string, periodLabel?: string) => void;
  language?: 'bn' | 'en';
  className?: string;
  compact?: boolean;
}

export const DatePeriodFilter: React.FC<DatePeriodFilterProps> = ({
  startDate,
  endDate,
  onChange,
  language = 'bn',
  className = '',
  compact = false,
}) => {
  const isBn = language === 'bn';

  // Helper to format Date to YYYY-MM-DD
  const toDateStr = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = toDateStr(new Date());

  // Determine initial period mode based on current startDate & endDate
  const detectInitialMode = (): FilterPeriodType => {
    if (!startDate && !endDate) return 'all';
    if (startDate && endDate && startDate === endDate) return 'daily';
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (s.getDate() === 1 && e.getDate() === new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate() && s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
        return 'monthly';
      }
    }
    return 'custom';
  };

  const [periodType, setPeriodType] = useState<FilterPeriodType>(detectInitialMode());
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>(startDate || todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    startDate ? startDate.substring(0, 7) : todayStr.substring(0, 7)
  );

  // Keep internal state in sync with props (e.g. when reset or external filter is changed)
  useEffect(() => {
    if (!startDate && !endDate) {
      setPeriodType('all');
    } else if (startDate && endDate && startDate === endDate) {
      setPeriodType('daily');
      setSelectedSingleDate(startDate);
    } else if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (
        !isNaN(s.getTime()) &&
        !isNaN(e.getTime()) &&
        s.getDate() === 1 &&
        e.getDate() === new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate() &&
        s.getMonth() === e.getMonth() &&
        s.getFullYear() === e.getFullYear()
      ) {
        setPeriodType('monthly');
        setSelectedMonth(startDate.substring(0, 7));
      } else {
        setPeriodType('custom');
      }
    } else {
      setPeriodType('custom');
    }
  }, [startDate, endDate]);

  // Quick Preset Actions
  const handleSetToday = () => {
    setPeriodType('daily');
    setSelectedSingleDate(todayStr);
    onChange(todayStr, todayStr, isBn ? 'আজ (দৈনিক)' : 'Today (Daily)');
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yStr = toDateStr(d);
    setPeriodType('daily');
    setSelectedSingleDate(yStr);
    onChange(yStr, yStr, isBn ? 'গতকাল (দৈনিক)' : 'Yesterday (Daily)');
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const sStr = toDateStr(start);
    const eStr = toDateStr(end);
    setPeriodType('monthly');
    setSelectedMonth(todayStr.substring(0, 7));
    onChange(sStr, eStr, isBn ? 'চলতি মাস (মাসিক)' : 'This Month (Monthly)');
  };

  const handleSetLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const sStr = toDateStr(start);
    const eStr = toDateStr(end);
    setPeriodType('monthly');
    setSelectedMonth(sStr.substring(0, 7));
    onChange(sStr, eStr, isBn ? 'গত মাস (মাসিক)' : 'Last Month (Monthly)');
  };

  const handleSetLast7Days = () => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 6);
    const sStr = toDateStr(start);
    const eStr = toDateStr(now);
    setPeriodType('custom');
    onChange(sStr, eStr, isBn ? 'গত ৭ দিন' : 'Last 7 Days');
  };

  const handleSetLast30Days = () => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 29);
    const sStr = toDateStr(start);
    const eStr = toDateStr(now);
    setPeriodType('custom');
    onChange(sStr, eStr, isBn ? 'গত ৩০ দিন' : 'Last 30 Days');
  };

  const handleSetThisYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    const sStr = toDateStr(start);
    const eStr = toDateStr(end);
    setPeriodType('custom');
    onChange(sStr, eStr, isBn ? `${now.getFullYear()} সাল (চলতি বছর)` : `Year ${now.getFullYear()} (This Year)`);
  };

  const handleSetAllTime = () => {
    setPeriodType('all');
    onChange('', '', isBn ? 'সকল সময় (All Time)' : 'All Time');
  };

  // Custom Single Date Change
  const handleSingleDateChange = (dateVal: string) => {
    setSelectedSingleDate(dateVal);
    if (dateVal) {
      onChange(dateVal, dateVal, `${isBn ? 'তারিখ:' : 'Date:'} ${dateVal}`);
    } else {
      handleSetAllTime();
    }
  };

  // Custom Month Change
  const handleMonthChange = (monthVal: string) => {
    setSelectedMonth(monthVal);
    if (monthVal) {
      const [y, m] = monthVal.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      const sStr = toDateStr(start);
      const eStr = toDateStr(end);
      onChange(sStr, eStr, `${isBn ? 'মাস:' : 'Month:'} ${monthVal}`);
    } else {
      handleSetAllTime();
    }
  };

  // Custom Range Change
  const handleCustomStartChange = (val: string) => {
    onChange(val, endDate, val && endDate ? `${val} হতে ${endDate}` : isBn ? 'কাস্টম রেঞ্জ' : 'Custom Range');
  };

  const handleCustomEndChange = (val: string) => {
    onChange(startDate, val, startDate && val ? `${startDate} হতে ${val}` : isBn ? 'কাস্টম রেঞ্জ' : 'Custom Range');
  };

  // Generate Current Active Summary Label
  const getActivePeriodSummary = () => {
    if (!startDate && !endDate) {
      return isBn ? 'সকল সময় (কোনো তারিখ ফিল্টার নেই)' : 'All Time (No date filter applied)';
    }
    if (startDate && endDate && startDate === endDate) {
      if (startDate === todayStr) {
        return isBn ? `আজ (${startDate})` : `Today (${startDate})`;
      }
      return isBn ? `দৈনিক রিপোর্ট: ${startDate}` : `Daily Report: ${startDate}`;
    }
    if (startDate && endDate) {
      return isBn ? `${startDate} হতে ${endDate} পর্যন্ত` : `${startDate} to ${endDate}`;
    }
    if (startDate) {
      return isBn ? `${startDate} তারিখ থেকে শুরু` : `From ${startDate}`;
    }
    if (endDate) {
      return isBn ? `${endDate} তারিখ পর্যন্ত` : `Until ${endDate}`;
    }
    return '';
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-2xs space-y-2.5 ${className}`}>
      {/* 1. Main Mode Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setPeriodType('daily');
              handleSetToday();
            }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              periodType === 'daily'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isBn ? '১. দৈনিক (Daily)' : '1. Daily'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPeriodType('monthly');
              handleSetThisMonth();
            }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              periodType === 'monthly'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isBn ? '২. মাসিক (Monthly)' : '2. Monthly'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPeriodType('custom');
              if (!startDate && !endDate) {
                handleSetLast30Days();
              }
            }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              periodType === 'custom'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isBn ? '৩. ডেট টু ডেট (Date Range)' : '3. Date Range'}</span>
          </button>

          <button
            type="button"
            onClick={handleSetAllTime}
            className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
              periodType === 'all'
                ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>{isBn ? 'সব সময়' : 'All Time'}</span>
          </button>
        </div>

        {/* Active Range Badge */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 px-2.5 py-1 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="font-medium">{getActivePeriodSummary()}</span>
        </div>
      </div>

      {/* 2. Interactive Input Controls Based on Selected Mode */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Mode A: Daily */}
        {periodType === 'daily' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {isBn ? 'তারিখ নির্বাচন করুন:' : 'Select Date:'}
            </span>
            <input
              type="date"
              value={selectedSingleDate}
              onChange={e => handleSingleDateChange(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Quick Daily Buttons */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={handleSetToday}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedSingleDate === todayStr
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {isBn ? 'আজ (Today)' : 'Today'}
              </button>
              <button
                type="button"
                onClick={handleSetYesterday}
                className="px-2.5 py-1 rounded-md text-xs font-semibold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {isBn ? 'গতকাল (Yesterday)' : 'Yesterday'}
              </button>
            </div>
          </div>
        )}

        {/* Mode B: Monthly */}
        {periodType === 'monthly' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {isBn ? 'মাস নির্বাচন করুন:' : 'Select Month:'}
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => handleMonthChange(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />

            {/* Quick Month Buttons */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={handleSetThisMonth}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedMonth === todayStr.substring(0, 7)
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {isBn ? 'চলতি মাস (This Month)' : 'This Month'}
              </button>
              <button
                type="button"
                onClick={handleSetLastMonth}
                className="px-2.5 py-1 rounded-md text-xs font-semibold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {isBn ? 'গত মাস (Last Month)' : 'Last Month'}
              </button>
            </div>
          </div>
        )}

        {/* Mode C: Custom Date-to-Date Range */}
        {periodType === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                {isBn ? 'তারিখ হতে:' : 'From:'}
              </span>
              <input
                type="date"
                value={startDate}
                onChange={e => handleCustomStartChange(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                {isBn ? 'পর্যন্ত:' : 'To:'}
              </span>
              <input
                type="date"
                value={endDate}
                onChange={e => handleCustomEndChange(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick Range Presets */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={handleSetLast7Days}
                className="px-2 py-1 rounded-md text-[11px] font-semibold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {isBn ? '৭ দিন' : '7 Days'}
              </button>
              <button
                type="button"
                onClick={handleSetLast30Days}
                className="px-2 py-1 rounded-md text-[11px] font-semibold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {isBn ? '৩০ দিন' : '30 Days'}
              </button>
              <button
                type="button"
                onClick={handleSetThisMonth}
                className="px-2 py-1 rounded-md text-[11px] font-semibold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {isBn ? 'চলতি মাস' : 'This Month'}
              </button>
              <button
                type="button"
                onClick={handleSetThisYear}
                className="px-2 py-1 rounded-md text-[11px] font-semibold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {isBn ? 'চলতি বছর' : 'This Year'}
              </button>
            </div>
          </div>
        )}

        {/* Mode D: All Time */}
        {periodType === 'all' && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>
              {isBn
                ? 'সিস্টেমের শুরু থেকে বর্তমান পর্যন্ত সমস্ত ডাটা প্রদর্শিত হচ্ছে।'
                : 'Showing all records from the beginning of time.'}
            </span>
          </div>
        )}

        {/* Reset Filter Button */}
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={handleSetAllTime}
            className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer shrink-0 ml-auto"
            title={isBn ? 'তারিখ ফিল্টার মুছুন' : 'Clear Date Filter'}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isBn ? 'ফিল্টার রিসেট' : 'Clear'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
