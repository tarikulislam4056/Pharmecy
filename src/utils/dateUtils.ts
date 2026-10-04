/**
 * DokanPro Enterprise ERP - Universal Date & Expiry Utilities
 * Handles flexible date formats (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, ISO timestamps)
 * Prevents timezone off-by-one errors and provides robust batch/product shelf-life calculations.
 */

import { Product, ProductBatch } from '../types';

/**
 * Returns today's date in local 'YYYY-MM-DD' (avoiding UTC timezone shift)
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Normalizes any date string or timestamp into standard 'YYYY-MM-DD'
 * Supported inputs:
 * - 'YYYY-MM-DD' (e.g. '2026-09-25')
 * - 'YYYY/MM/DD' (e.g. '2026/09/25')
 * - 'DD-MM-YYYY' (e.g. '25-09-2026')
 * - 'DD/MM/YYYY' (e.g. '25/09/2026')
 * - 'YYYY-MM-DDTHH:mm:ss.sssZ' (ISO timestamps)
 * - 'YYYY-MM-DD HH:mm:ss' (MySQL datetime)
 * - Numeric timestamps & Date instances
 */
export function normalizeDateToISO(dateInput?: string | number | Date | null): string | null {
  if (dateInput === null || dateInput === undefined || dateInput === '') return null;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return getLocalDateString(dateInput);
  }

  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : getLocalDateString(d);
  }

  const str = String(dateInput).trim();
  if (!str) return null;

  // Split date part from time component (e.g. "2026-09-25 14:00:00" or "2026-09-25T00:00:00.000Z")
  const datePart = str.split(/[T\s]/)[0].trim();

  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = datePart.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Pattern 2: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = datePart.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback: standard Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return getLocalDateString(parsed);
  }

  return null;
}

/**
 * Calculates remaining whole calendar days from today (or baseDate) to targetDate
 * Returns:
 * - Positive number: days left in future
 * - 0: expires today
 * - Negative number: days since expired
 * - null: invalid / missing date
 */
export function getDaysRemaining(targetDate?: string | null, baseDate: string = getLocalDateString()): number | null {
  const targetISO = normalizeDateToISO(targetDate);
  const baseISO = normalizeDateToISO(baseDate);
  if (!targetISO || !baseISO) return null;

  const [ty, tm, td] = targetISO.split('-').map(Number);
  const [by, bm, bd] = baseISO.split('-').map(Number);

  const targetUtc = Date.UTC(ty, tm - 1, td);
  const baseUtc = Date.UTC(by, bm - 1, bd);

  return Math.round((targetUtc - baseUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if date has already passed.
 * If includeToday = true, today (daysRemaining <= 0) is considered expired.
 * If includeToday = false, only past dates (daysRemaining < 0) are expired.
 */
export function isExpiredDate(targetDate?: string | null, includeToday: boolean = true): boolean {
  const days = getDaysRemaining(targetDate);
  if (days === null) return false;
  return includeToday ? days <= 0 : days < 0;
}

/**
 * Returns true if date is within N days (default 30 days) and not expired.
 */
export function isExpiringSoonDate(targetDate?: string | null, withinDays: number = 30): boolean {
  const days = getDaysRemaining(targetDate);
  if (days === null) return false;
  return days > 0 && days <= withinDays;
}

/**
 * Returns true if date is fresh (more than withinDays days into the future)
 */
export function isFreshDate(targetDate?: string | null, beyondDays: number = 30): boolean {
  const days = getDaysRemaining(targetDate);
  if (days === null) return false;
  return days > beyondDays;
}

export interface ProductExpirySummary {
  hasExpired: boolean;
  hasExpiringSoon: boolean; // within 30 days
  hasFresh: boolean;
  hasAnyExpiry: boolean;
  expiredBatchesCount: number;
  expiringSoonBatchesCount: number;
  activeValidBatchesCount: number;
  earliestExpDate: string | null;
  minDaysRemaining: number | null;
  displayStatus: 'EXPIRED' | 'EXPIRING_SOON' | 'FRESH' | 'NO_EXPIRY';
  formattedDisplayDate: string;
}

/**
 * Computes a unified expiry status for a product, checking both product-level expDate
 * and any batches in `p.batches`.
 */
export function getProductExpirySummary(p: Product, withinDays: number = 30): ProductExpirySummary {
  // If product has batches
  if (p.batches && p.batches.length > 0) {
    let hasExpired = false;
    let hasExpiringSoon = false;
    let hasFresh = false;
    let hasAnyExpiry = false;
    let expiredBatchesCount = 0;
    let expiringSoonBatchesCount = 0;
    let activeValidBatchesCount = 0;
    let earliestExpDate: string | null = null;
    let minDaysRemaining: number | null = null;

    for (const b of p.batches) {
      const stock = Number(b.stock) || 0;
      const bExpISO = normalizeDateToISO(b.expDate || p.expDate);
      if (bExpISO) {
        hasAnyExpiry = true;
        const days = getDaysRemaining(bExpISO);
        if (days !== null && stock > 0) {
          if (minDaysRemaining === null || days < minDaysRemaining) {
            minDaysRemaining = days;
            earliestExpDate = bExpISO;
          }

          if (days <= 0) {
            hasExpired = true;
            expiredBatchesCount++;
          } else if (days <= withinDays) {
            hasExpiringSoon = true;
            expiringSoonBatchesCount++;
            activeValidBatchesCount++;
          } else {
            hasFresh = true;
            activeValidBatchesCount++;
          }
        }
      }
    }

    let displayStatus: 'EXPIRED' | 'EXPIRING_SOON' | 'FRESH' | 'NO_EXPIRY' = 'NO_EXPIRY';
    if (hasExpired) displayStatus = 'EXPIRED';
    else if (hasExpiringSoon) displayStatus = 'EXPIRING_SOON';
    else if (hasFresh) displayStatus = 'FRESH';

    return {
      hasExpired,
      hasExpiringSoon,
      hasFresh,
      hasAnyExpiry,
      expiredBatchesCount,
      expiringSoonBatchesCount,
      activeValidBatchesCount,
      earliestExpDate,
      minDaysRemaining,
      displayStatus,
      formattedDisplayDate: earliestExpDate || normalizeDateToISO(p.expDate) || '',
    };
  }

  // Simple product without batches
  const pExpISO = normalizeDateToISO(p.expDate);
  if (!pExpISO) {
    return {
      hasExpired: false,
      hasExpiringSoon: false,
      hasFresh: false,
      hasAnyExpiry: false,
      expiredBatchesCount: 0,
      expiringSoonBatchesCount: 0,
      activeValidBatchesCount: 1, // Changed from p.stock > 0 ? 1 : 0
      earliestExpDate: null,
      minDaysRemaining: null,
      displayStatus: 'NO_EXPIRY',
      formattedDisplayDate: '',
    };
  }

  const days = getDaysRemaining(pExpISO);
  const isExp = days !== null && days <= 0;
  const isSoon = days !== null && days > 0 && days <= withinDays;
  const isFr = days !== null && days > withinDays;

  return {
    hasExpired: isExp, // Changed from isExp && p.stock > 0
    hasExpiringSoon: isSoon, // Changed from isSoon && p.stock > 0
    hasFresh: isFr, // Changed from isFr && p.stock > 0
    hasAnyExpiry: true,
    expiredBatchesCount: isExp ? 1 : 0, // Changed
    expiringSoonBatchesCount: isSoon ? 1 : 0, // Changed
    activeValidBatchesCount: !isExp ? 1 : 0, // Changed
    earliestExpDate: pExpISO,
    minDaysRemaining: days,
    displayStatus: isExp ? 'EXPIRED' : isSoon ? 'EXPIRING_SOON' : isFr ? 'FRESH' : 'NO_EXPIRY', // Changed
    formattedDisplayDate: pExpISO,
  };
}
