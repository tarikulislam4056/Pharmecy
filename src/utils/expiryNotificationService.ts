/**
 * DokanPro ERP - Expiry Push Notification & Alert Service
 * Alerts Admin Panel when any product/batch is expiring within 5 days (or expired).
 * Provides browser Web Push Notifications, synthesized audio chime, and in-app alerts.
 */

import { Product } from '../types';
import { getDaysRemaining, normalizeDateToISO } from './dateUtils';

export interface ExpiringProductItem {
  productId: string;
  productName: string;
  productNameBn: string;
  generic?: string;
  barcode?: string;
  batchId?: string;
  batchNumber?: string;
  expDate: string;
  daysRemaining: number;
  stock: number;
  unit: string;
  urgency: 'EXPIRED' | 'CRITICAL' | 'WARNING'; // EXPIRED: <0, CRITICAL: 0-2 days, WARNING: 3-5 days
}

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks all products and batches for items expiring within specified days (default: 5 days)
 */
export function getExpiringProductsWithinDays(
  products: Product[],
  daysThreshold: number = 5
): ExpiringProductItem[] {
  const result: ExpiringProductItem[] = [];

  products.forEach(p => {
    // 1. Check Batches if product has them
    if (p.batches && p.batches.length > 0) {
      p.batches.forEach(b => {
        if (!b.expDate) return;
        const days = getDaysRemaining(b.expDate);
        if (days !== null && days <= daysThreshold) {
          result.push({
            productId: p.id,
            productName: p.name,
            productNameBn: p.nameBn || p.name,
            generic: p.generic,
            barcode: p.barcode,
            batchId: b.id,
            batchNumber: b.batchNumber,
            expDate: normalizeDateToISO(b.expDate) || b.expDate,
            daysRemaining: days,
            stock: b.stock ?? p.stock,
            unit: p.unit || 'Pcs',
            urgency: days < 0 ? 'EXPIRED' : days <= 2 ? 'CRITICAL' : 'WARNING',
          });
        }
      });
      return;
    }

    // 2. Simple product with root expDate
    if (p.expDate) {
      const days = getDaysRemaining(p.expDate);
      if (days !== null && days <= daysThreshold) {
        result.push({
          productId: p.id,
          productName: p.name,
          productNameBn: p.nameBn || p.name,
          generic: p.generic,
          barcode: p.barcode,
          batchNumber: p.batchNumber,
          expDate: normalizeDateToISO(p.expDate) || p.expDate,
          daysRemaining: days,
          stock: p.stock || 0,
          unit: p.unit || 'Pcs',
          urgency: days < 0 ? 'EXPIRED' : days <= 2 ? 'CRITICAL' : 'WARNING',
        });
      }
    }
  });

  // Sort: expired items first, then smallest daysRemaining
  return result.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Get current browser Push Notification permission state
 */
export function getPushPermissionStatus(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionState;
}

/**
 * Request browser Push Notification permission
 */
export async function requestPushPermission(): Promise<PushPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm as PushPermissionState;
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return 'denied';
  }
}

/**
 * Play a gentle synthesized chime sound via Web Audio API
 */
export function playNotificationTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Chime 1 (High note)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Chime 2 (Harmonic note)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.12); // D6
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Send a native browser push notification
 */
export function sendBrowserPushNotification(title: string, options?: NotificationOptions): Notification | null {
  if (getPushPermissionStatus() !== 'granted') return null;

  try {
    playNotificationTone();
    const notification = new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      silent: false,
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (err) {
    console.error('Failed to dispatch browser notification:', err);
    return null;
  }
}

/**
 * Evaluates expiring products (<= 5 days) and triggers push notifications in Admin Panel.
 * Uses localStorage cache to avoid spamming the same notification repeatedly in a single day.
 */
export function triggerExpiryPushNotifications(
  products: Product[],
  options?: {
    daysThreshold?: number;
    force?: boolean;
    language?: 'en' | 'bn';
  }
): { notifiedCount: number; expiringItems: ExpiringProductItem[] } {
  const daysThreshold = options?.daysThreshold ?? 5;
  const force = options?.force ?? false;
  const isBn = options?.language !== 'en';

  const expiringItems = getExpiringProductsWithinDays(products, daysThreshold);
  if (expiringItems.length === 0) {
    return { notifiedCount: 0, expiringItems: [] };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const cacheKey = `dokanpro_expiry_notified_${todayStr}`;

  let notifiedIds: string[] = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) notifiedIds = JSON.parse(raw);
  } catch {}

  const itemsToNotify = force
    ? expiringItems
    : expiringItems.filter(item => !notifiedIds.includes(`${item.productId}_${item.batchId || 'root'}`));

  if (itemsToNotify.length === 0) {
    return { notifiedCount: 0, expiringItems };
  }

  // If push permission is granted, dispatch notifications
  if (getPushPermissionStatus() === 'granted') {
    if (itemsToNotify.length === 1) {
      const item = itemsToNotify[0];
      const daysText =
        item.daysRemaining < 0
          ? (isBn ? 'মেয়াদ শেষ হয়ে গেছে' : 'already expired')
          : item.daysRemaining === 0
          ? (isBn ? 'আজকে মেয়াদ শেষ' : 'expires today')
          : (isBn ? `মেয়াদ শেষ হতে আর মাত্র ${item.daysRemaining} দিন বাকি` : `expires in ${item.daysRemaining} days`);

      const title = isBn
        ? `⚠️ মেয়াদ সতর্কতা (৫ দিনের মধ্যে): ${item.productName}`
        : `⚠️ Expiry Alert (Within 5 Days): ${item.productName}`;

      const body = isBn
        ? `${daysText} (${item.expDate})। মজুদ স্টক: ${item.stock} ${item.unit}। অ্যাডমিন প্যানেল থেকে প্রয়োজনীয় ব্যবস্থা নিন।`
        : `${daysText} (${item.expDate}). Stock: ${item.stock} ${item.unit}. Please check in admin panel.`;

      sendBrowserPushNotification(title, {
        body,
        tag: `expiry-${item.productId}`,
      });
    } else {
      // Group notification for multiple items
      const urgentCount = itemsToNotify.filter(i => i.daysRemaining <= 2).length;
      const title = isBn
        ? `⚠️ মেয়াদ সতর্কতা: ${itemsToNotify.length}টি পণ্যের মেয়াদ ৫ দিনের মধ্যে শেষ হচ্ছে!`
        : `⚠️ Expiry Alert: ${itemsToNotify.length} items expiring within 5 days!`;

      const firstItem = itemsToNotify[0];
      const body = isBn
        ? `'${firstItem.productName}' (${firstItem.daysRemaining <= 0 ? 'মেয়াদোত্তীর্ণ' : `${firstItem.daysRemaining} দিন বাকি`}) সহ মোট ${itemsToNotify.length}টি পণ্যের মেয়াদ ৫ দিন বা তার চেয়ে কম।`
        : `'${firstItem.productName}' (${firstItem.daysRemaining <= 0 ? 'expired' : `${firstItem.daysRemaining}d left`}) and ${itemsToNotify.length - 1} other items expiring soon.`;

      sendBrowserPushNotification(title, {
        body,
        tag: `expiry-group-${todayStr}`,
      });
    }

    // Update notified cache
    try {
      const updatedCache = Array.from(
        new Set([...notifiedIds, ...itemsToNotify.map(i => `${i.productId}_${i.batchId || 'root'}`)])
      );
      localStorage.setItem(cacheKey, JSON.stringify(updatedCache));
    } catch {}
  }

  return {
    notifiedCount: itemsToNotify.length,
    expiringItems,
  };
}
