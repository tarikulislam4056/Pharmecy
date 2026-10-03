import { SaleInvoice, PurchaseInvoice } from '../types';

/**
 * Generates an automatic, sequential, non-conflicting Invoice Number for Sales.
 * E.g., INV-2026-0001, INV-2026-0002
 */
export const generateSaleInvoiceNumber = (
  existingSales: SaleInvoice[] = []
): string => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}`;
  const prefixRegex = new RegExp(`^INV[-_]?${currentYear}[-_]?(\\d+)$`, 'i');

  const existingInvoices = Array.isArray(existingSales) ? existingSales : [];
  let maxSeq = 0;

  for (const s of existingInvoices) {
    if (s && s.invoiceNumber) {
      const trimmed = s.invoiceNumber.trim();
      const match = trimmed.match(prefixRegex);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      } else {
        // Fallback check for numbers in invoices
        const numMatch = trimmed.match(/(\d{3,})/);
        if (numMatch && numMatch[1]) {
          const parsed = parseInt(numMatch[1], 10);
          if (!isNaN(parsed) && parsed > maxSeq && parsed < 999999) {
            maxSeq = parsed;
          }
        }
      }
    }
  }

  let nextNumber = Math.max(maxSeq, existingInvoices.length) + 1;
  const existingSet = new Set(
    existingInvoices
      .filter(s => Boolean(s && s.invoiceNumber))
      .map(s => s.invoiceNumber.trim().toLowerCase())
  );

  let candidate = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
  while (existingSet.has(candidate.toLowerCase())) {
    nextNumber++;
    candidate = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
  }

  return candidate;
};

/**
 * Generates an automatic, sequential, non-conflicting Bill / Invoice Number for Purchases.
 * E.g., PUR-2026-0001, PUR-2026-0002
 */
export const generatePurchaseBillNumber = (
  existingPurchases: PurchaseInvoice[] = []
): string => {
  const currentYear = new Date().getFullYear();
  const prefix = `PUR-${currentYear}`;
  const prefixRegex = new RegExp(`^PUR[-_]?${currentYear}[-_]?(\\d+)$`, 'i');

  const existingBills = Array.isArray(existingPurchases) ? existingPurchases : [];
  let maxSeq = 0;

  for (const p of existingBills) {
    const raw = p.billNumber || p.supplierInvoiceNo;
    if (raw) {
      const trimmed = raw.trim();
      const match = trimmed.match(prefixRegex);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      } else {
        const numMatch = trimmed.match(/(\d{3,})/);
        if (numMatch && numMatch[1]) {
          const parsed = parseInt(numMatch[1], 10);
          if (!isNaN(parsed) && parsed > maxSeq && parsed < 999999) {
            maxSeq = parsed;
          }
        }
      }
    }
  }

  let nextNumber = Math.max(maxSeq, existingBills.length) + 1;
  const existingSet = new Set<string>();
  existingBills.forEach(p => {
    if (p.billNumber && p.billNumber.trim()) {
      existingSet.add(p.billNumber.trim().toLowerCase());
    }
    if (p.supplierInvoiceNo && p.supplierInvoiceNo.trim()) {
      existingSet.add(p.supplierInvoiceNo.trim().toLowerCase());
    }
  });

  let candidate = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
  while (existingSet.has(candidate.toLowerCase())) {
    nextNumber++;
    candidate = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
  }

  return candidate;
};

/**
 * Checks if a given Sale Invoice Number already exists.
 */
export const checkDuplicateSaleInvoice = (
  invoiceNumber: string,
  existingSales: SaleInvoice[] = [],
  currentInvoiceId?: string
): SaleInvoice | undefined => {
  if (!invoiceNumber || !invoiceNumber.trim()) return undefined;
  const target = invoiceNumber.trim().toLowerCase();
  return existingSales.find(
    s => s.id !== currentInvoiceId && s.invoiceNumber && s.invoiceNumber.trim().toLowerCase() === target
  );
};

/**
 * Checks if a given Purchase Invoice / Bill Number already exists.
 */
export const checkDuplicatePurchaseInvoice = (
  invoiceNumber: string,
  existingPurchases: PurchaseInvoice[] = [],
  currentPurchaseId?: string
): PurchaseInvoice | undefined => {
  if (!invoiceNumber || !invoiceNumber.trim()) return undefined;
  const target = invoiceNumber.trim().toLowerCase();
  return existingPurchases.find(
    p =>
      p.id !== currentPurchaseId &&
      ((p.billNumber && p.billNumber.trim().toLowerCase() === target) ||
        (p.supplierInvoiceNo && p.supplierInvoiceNo.trim().toLowerCase() === target))
  );
};
