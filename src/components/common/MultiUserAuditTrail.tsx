import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EntryContributor } from '../../types';
import {
  User,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clock,
  Users,
  Info,
  Layers,
} from 'lucide-react';

export interface MultiUserAuditTrailProps {
  createdBy?: string;
  createdByName?: string;
  completedBy?: string;
  completedByName?: string;
  updatedBy?: string;
  approvedBy?: string;
  convertedBy?: string;
  cashierName?: string;
  contributors?: EntryContributor[];
  createdAt?: string;
  completedAt?: string;
  mode?: 'table-cell' | 'compact-badge' | 'detailed' | 'print';
  displayMode?: 'table-cell' | 'compact-badge' | 'detailed' | 'print';
  className?: string;
}

export const MultiUserAuditTrail: React.FC<MultiUserAuditTrailProps> = ({
  createdBy,
  createdByName,
  completedBy,
  completedByName,
  updatedBy,
  approvedBy,
  convertedBy,
  cashierName,
  contributors = [],
  createdAt,
  completedAt,
  mode = 'table-cell',
  displayMode,
  className = '',
}) => {
  const effectiveMode = displayMode || mode;
  const { language, users, currentUser } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);

  // Helper to resolve user details
  const resolveUser = (userKey?: string, fallbackRole = 'USER') => {
    if (!userKey) return null;
    const cleanKey = userKey.trim();
    if (!cleanKey) return null;

    const matched = users?.find(
      u =>
        u.id === cleanKey ||
        u.username.toLowerCase() === cleanKey.toLowerCase() ||
        u.fullName.toLowerCase() === cleanKey.toLowerCase()
    );

    if (matched) {
      const name = matched.fullName || matched.username;
      const initials =
        name
          .split(' ')
          .filter(Boolean)
          .map(w => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'US';
      return {
        id: matched.id,
        name,
        role: matched.role,
        initials,
      };
    }

    if (cleanKey === 'usr-1' || cleanKey === 'usr-admin' || cleanKey.toLowerCase() === 'admin') {
      const adminUser = users?.find(u => u.role === 'ADMIN');
      const name = adminUser?.fullName || 'Super Admin';
      return {
        id: 'usr-1',
        name,
        role: 'ADMIN',
        initials: 'AD',
      };
    }

    if (cleanKey === 'usr-2' || cleanKey === 'cashier-1') {
      const cashierUser = users?.find(u => u.role === 'CASHIER');
      const name = cashierUser?.fullName || 'Cashier';
      return {
        id: 'usr-2',
        name,
        role: 'CASHIER',
        initials: 'CS',
      };
    }

    // Direct name string
    const initials =
      cleanKey
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'US';

    return {
      id: cleanKey,
      name: cleanKey,
      role: fallbackRole,
      initials,
    };
  };

  // Build ordered list of participating persons & their actions
  const actionList: Array<{
    user: { id: string; name: string; role: string; initials: string };
    actionType: 'CREATED' | 'APPROVED' | 'CONVERTED' | 'UPDATED' | 'COMPLETED' | 'COLLECTED';
    labelEn: string;
    labelBn: string;
    timestamp?: string;
    note?: string;
  }> = [];

  const addedUserActionKeys = new Set<string>();

  // 1. Explicit Contributors array if present
  if (contributors && contributors.length > 0) {
    contributors.forEach(c => {
      const u = resolveUser(c.userName || c.userId, c.userRole);
      if (u) {
        const key = `${u.name}-${c.action}`;
        if (!addedUserActionKeys.has(key)) {
          addedUserActionKeys.add(key);
          actionList.push({
            user: u,
            actionType: c.action.toLowerCase().includes('complet') || c.action.toLowerCase().includes('cleared')
              ? 'COMPLETED'
              : c.action.toLowerCase().includes('approv')
              ? 'APPROVED'
              : c.action.toLowerCase().includes('convert')
              ? 'CONVERTED'
              : c.action.toLowerCase().includes('collect') || c.action.toLowerCase().includes('paid')
              ? 'COLLECTED'
              : c.action.toLowerCase().includes('creat') || c.action.toLowerCase().includes('invoice')
              ? 'CREATED'
              : 'UPDATED',
            labelEn: c.action,
            labelBn: c.actionBn || (
              c.action.toLowerCase().includes('creat') ? 'এন্ট্রি কারী' :
              c.action.toLowerCase().includes('convert') ? 'রূপান্তর কারী' :
              c.action.toLowerCase().includes('approv') ? 'অনুমোদন কারী' :
              c.action.toLowerCase().includes('collect') ? 'টাকা সংগ্রহ' :
              c.action.toLowerCase().includes('complet') ? 'সম্পন্ন কারী' : c.action
            ),
            timestamp: c.timestamp,
            note: c.note,
          });
        }
      }
    });
  }

  // 2. Creator (Entry By)
  const creatorKey = createdByName || createdBy || cashierName;
  const creatorObj = resolveUser(creatorKey, 'CASHIER');
  if (creatorObj) {
    const key = `${creatorObj.name}-CREATED`;
    if (!addedUserActionKeys.has(key) && actionList.length === 0) {
      addedUserActionKeys.add(key);
      actionList.push({
        user: creatorObj,
        actionType: 'CREATED',
        labelEn: 'Entry / Created',
        labelBn: 'এন্ট্রি কারী',
        timestamp: createdAt,
      });
    }
  }

  // 3. Approver
  if (approvedBy) {
    const approverObj = resolveUser(approvedBy, 'ADMIN');
    if (approverObj) {
      const key = `${approverObj.name}-APPROVED`;
      if (!addedUserActionKeys.has(key)) {
        addedUserActionKeys.add(key);
        actionList.push({
          user: approverObj,
          actionType: 'APPROVED',
          labelEn: 'Approved',
          labelBn: 'অনুমোদন কারী',
        });
      }
    }
  }

  // 4. Converter (e.g. Quotation to Sale, PO to Purchase Bill)
  if (convertedBy) {
    const converterObj = resolveUser(convertedBy, 'SALESMAN');
    if (converterObj) {
      const key = `${converterObj.name}-CONVERTED`;
      if (!addedUserActionKeys.has(key)) {
        addedUserActionKeys.add(key);
        actionList.push({
          user: converterObj,
          actionType: 'CONVERTED',
          labelEn: 'Converted / Received',
          labelBn: 'রূপান্তর / রিসিভ',
        });
      }
    }
  }

  // 5. Completer (e.g. Final Due Collection, Replacement, Warranty Resolution)
  if (completedBy) {
    const completerObj = resolveUser(completedByName || completedBy, 'CASHIER');
    if (completerObj) {
      const key = `${completerObj.name}-COMPLETED`;
      if (!addedUserActionKeys.has(key)) {
        addedUserActionKeys.add(key);
        actionList.push({
          user: completerObj,
          actionType: 'COMPLETED',
          labelEn: 'Completed / Cleared',
          labelBn: 'সম্পন্ন কারী',
          timestamp: completedAt,
        });
      }
    }
  }

  // 6. Updater
  if (updatedBy && updatedBy !== createdBy && updatedBy !== completedBy) {
    const updaterObj = resolveUser(updatedBy, 'USER');
    if (updaterObj) {
      const key = `${updaterObj.name}-UPDATED`;
      if (!addedUserActionKeys.has(key)) {
        addedUserActionKeys.add(key);
        actionList.push({
          user: updaterObj,
          actionType: 'UPDATED',
          labelEn: 'Updated By',
          labelBn: 'আপডেট কারী',
        });
      }
    }
  }

  // Fallback if empty
  if (actionList.length === 0) {
    const fallbackUser = resolveUser(currentUser?.fullName || 'Admin', 'ADMIN')!;
    actionList.push({
      user: fallbackUser,
      actionType: 'CREATED',
      labelEn: 'Entry / Created',
      labelBn: 'এন্ট্রি কারী',
    });
  }

  // Check unique users
  const uniqueUsers = Array.from(new Set(actionList.map(a => a.user.name)));
  const isMultiUser = uniqueUsers.length > 1;

  // Render for Print mode
  if (effectiveMode === 'print') {
    if (!isMultiUser) {
      const single = actionList[0];
      return (
        <div className={`text-xs text-slate-700 dark:text-slate-300 font-sans ${className}`}>
          <span className="font-semibold">{language === 'bn' ? 'এন্ট্রি কারী: ' : 'Entry By: '}</span>
          <span>{single.user.name}</span>
        </div>
      );
    }

    return (
      <div className={`text-xs space-y-0.5 text-slate-700 dark:text-slate-300 font-sans ${className}`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{language === 'bn' ? '১. এন্ট্রি কারী: ' : '1. Entry By: '}</span>
          <span className="font-medium">{actionList[0].user.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{language === 'bn' ? '২. সম্পন্ন / অনুমোদিত: ' : '2. Completed / Approved: '}</span>
          <span className="font-medium">{actionList[actionList.length - 1].user.name}</span>
        </div>
      </div>
    );
  }

  // Detailed Card Mode (for Modals & Sidebars)
  if (effectiveMode === 'detailed') {
    return (
      <div className={`p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 ${className}`}>
        <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{language === 'bn' ? 'ইউজার অডিট হিস্টোরি ও কার্যক্রম' : 'User Audit Trail & Ownership'}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
            {uniqueUsers.length} {language === 'bn' ? 'জন কর্মী' : 'person(s)'}
          </span>
        </div>

        <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
          {actionList.map((item, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === actionList.length - 1;
            return (
              <div key={idx} className="flex items-start gap-3 relative z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border shadow-2xs shrink-0 ${
                    item.actionType === 'CREATED'
                      ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                      : item.actionType === 'COMPLETED'
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : item.actionType === 'CONVERTED'
                      ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                      : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  }`}
                >
                  {item.user.initials}
                </div>
                <div className="flex-1 min-w-0 bg-white dark:bg-slate-900/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {item.user.name}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        item.actionType === 'CREATED'
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : item.actionType === 'COMPLETED'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : item.actionType === 'CONVERTED'
                          ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {language === 'bn' ? item.labelBn : item.labelEn}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-2.5 h-2.5 text-blue-500" />
                      {item.user.role}
                    </span>
                    {item.timestamp && (
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        {item.timestamp}
                      </span>
                    )}
                  </div>
                  {item.note && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                      💬 {item.note}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // TABLE CELL MODE (Default for Active Tables)
  // =========================================================================

  // Case 1: Single User
  if (!isMultiUser || actionList.length === 1) {
    const single = actionList[0];
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
          {single.user.initials}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]" title={single.user.name}>
            {single.user.name}
          </div>
          <div className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
            <User className="w-2.5 h-2.5" />
            <span>{language === 'bn' ? single.labelBn : single.labelEn}</span>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Exactly Two Users (Created by User A, Completed/Converted by User B)
  if (actionList.length === 2 && uniqueUsers.length === 2) {
    const first = actionList[0];
    const second = actionList[1];

    return (
      <div className={`relative group/userAudit ${className}`}>
        <div className="flex flex-col gap-1 text-xs">
          {/* First User (Creator / Entry By) */}
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[8px] flex items-center justify-center border border-blue-300 dark:border-blue-800 shrink-0">
              {first.user.initials.charAt(0)}
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[100px]" title={first.user.name}>
              {first.user.name}
            </span>
            <span className="text-[9px] px-1 py-0.2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded font-semibold border border-blue-200 dark:border-blue-800 shrink-0">
              {language === 'bn' ? 'এন্ট্রি' : 'Entry'}
            </span>
          </div>

          {/* Second User (Completed / Converted / Approved) */}
          <div className="flex items-center gap-1.5 pl-2 border-l-2 border-emerald-400 dark:border-emerald-600">
            <ArrowRight className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
            <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[8px] flex items-center justify-center border border-emerald-300 dark:border-emerald-800 shrink-0">
              {second.user.initials.charAt(0)}
            </span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-[11px] truncate max-w-[95px]" title={second.user.name}>
              {second.user.name}
            </span>
            <span className="text-[9px] px-1 py-0.2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
              {language === 'bn' ? (second.actionType === 'CONVERTED' ? 'রূপান্তর' : 'সম্পন্ন') : (second.actionType === 'CONVERTED' ? 'Conv' : 'Done')}
            </span>
          </div>
        </div>

        {/* Hover details tooltip */}
        <div className="absolute left-0 bottom-full mb-2 hidden group-hover/userAudit:block z-50 w-64 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs border border-slate-700 pointer-events-none">
          <div className="font-bold text-slate-200 mb-1.5 flex items-center gap-1 text-[11px] border-b border-slate-700 pb-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === 'bn' ? '২ জন কর্মীর অংশগ্রহণ' : '2 Users Involved'}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">১. {first.user.name}:</span>
              <span className="text-blue-400 font-mono text-[10px]">{first.labelEn}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-300 font-semibold">২. {second.user.name}:</span>
              <span className="text-emerald-400 font-mono text-[10px]">{second.labelEn}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Multiple Users (3+ Persons Involved)
  const first = actionList[0];
  const last = actionList[actionList.length - 1];
  const extraCount = uniqueUsers.length - 2;

  return (
    <div className={`relative group/userMulti ${className}`}>
      <div className="flex flex-col gap-1">
        {/* First & Last User Summary */}
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[8px] flex items-center justify-center border border-blue-300 dark:border-blue-800 shrink-0">
            {first.user.initials.charAt(0)}
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[90px]" title={first.user.name}>
            {first.user.name}
          </span>
          <span className="text-[9px] px-1 py-0.2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded font-semibold border border-blue-200 dark:border-blue-800">
            {language === 'bn' ? 'এন্ট্রি' : 'Entry'}
          </span>
        </div>

        {/* Final User & Multi-badge */}
        <div className="flex items-center gap-1.5 pl-2 border-l-2 border-purple-400 dark:border-purple-600">
          <ArrowRight className="w-2.5 h-2.5 text-purple-500 shrink-0" />
          <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[8px] flex items-center justify-center border border-purple-300 dark:border-purple-800 shrink-0">
            {last.user.initials.charAt(0)}
          </span>
          <span className="font-extrabold text-purple-700 dark:text-purple-300 text-[11px] truncate max-w-[85px]" title={last.user.name}>
            {last.user.name}
          </span>
          <span className="text-[9px] px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded font-extrabold border border-purple-300 dark:border-purple-800 flex items-center gap-0.5">
            <Users className="w-2 h-2" />
            <span>+{extraCount > 0 ? extraCount : 1}</span>
          </span>
        </div>
      </div>

      {/* Hover Multi-user timeline popover */}
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover/userMulti:block z-50 w-72 p-3 bg-slate-900 text-white rounded-xl shadow-2xl text-xs border border-slate-700 pointer-events-none">
        <div className="font-bold text-slate-200 mb-2 flex items-center justify-between border-b border-slate-700 pb-1.5">
          <div className="flex items-center gap-1.5 text-xs text-blue-400">
            <Users className="w-4 h-4" />
            <span>{language === 'bn' ? 'সকল কর্মী ও কার্যক্রম তালিকা' : 'Full Contributor Timeline'}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-slate-300">
            {actionList.length} actions
          </span>
        </div>
        <div className="space-y-2">
          {actionList.map((act, index) => (
            <div key={index} className="flex items-center justify-between text-[11px] border-b border-slate-800/80 pb-1 last:border-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-mono text-slate-400">{index + 1}.</span>
                <span className="font-semibold text-slate-200 truncate max-w-[120px]">{act.user.name}</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                  act.actionType === 'CREATED'
                    ? 'bg-blue-900 text-blue-200'
                    : act.actionType === 'COMPLETED'
                    ? 'bg-emerald-900 text-emerald-200'
                    : act.actionType === 'CONVERTED'
                    ? 'bg-purple-900 text-purple-200'
                    : 'bg-amber-900 text-amber-200'
                }`}
              >
                {act.labelEn}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
