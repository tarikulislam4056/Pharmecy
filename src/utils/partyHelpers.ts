import { Party, PartyType } from '../types';

/**
 * Generates an automatic, sequential serial number / code for a new Customer or Supplier.
 * Example: CUST-0001, CUST-0002, SUPP-0001, SUPP-0002
 */
export const generatePartySerialNumber = (
  type: PartyType,
  existingParties: Party[] = []
): string => {
  const prefix = type === 'CUSTOMER' ? 'CUST' : 'SUPP';
  const prefixRegex = new RegExp(`^${prefix}[-_]?(\\d+)$`, 'i');

  const filtered = Array.isArray(existingParties)
    ? existingParties.filter(p => p && p.type === type)
    : [];

  let maxSeq = 0;

  for (const p of filtered) {
    if (p.serialNumber) {
      const match = p.serialNumber.trim().match(prefixRegex);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      } else {
        // Numeric fallback if someone entered pure number like "1005"
        const numOnly = parseInt(p.serialNumber.replace(/\D/g, ''), 10);
        if (!isNaN(numOnly) && numOnly > maxSeq && numOnly < 100000) {
          maxSeq = numOnly;
        }
      }
    }
  }

  // Next sequential number is greater than max found or party count
  let nextNumber = Math.max(maxSeq, filtered.length) + 1;
  const existingSet = new Set(
    existingParties
      .filter(p => Boolean(p && p.serialNumber))
      .map(p => p.serialNumber!.trim().toLowerCase())
  );

  let candidate = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
  while (existingSet.has(candidate.toLowerCase())) {
    nextNumber++;
    candidate = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
  }
  return candidate;
};

/**
 * Returns a guaranteed serial number for display, falling back gracefully
 * to an indexed serial if older records don't have one stored.
 */
export const getPartyDisplaySerial = (party: Party, fallbackIndex: number = 0): string => {
  if (party && party.serialNumber && party.serialNumber.trim() !== '') {
    return party.serialNumber.trim();
  }
  const prefix = party?.type === 'SUPPLIER' ? 'SUPP' : 'CUST';
  return `${prefix}-${String(fallbackIndex + 1).padStart(4, '0')}`;
};

/**
 * Normalizes a serial number string for robust comparison:
 * - Trims whitespaces
 * - Converts Bengali numerals (০-৯) to English digits (0-9)
 * - Converts to lower-case
 */
export const normalizeSerialString = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString())
    .toLowerCase();
};

/**
 * Checks if a serial number is already in use by another party.
 * Compares exact string, normalized string (including Bengali digits),
 * and fallback display serials to ensure absolute uniqueness.
 */
export const findDuplicatePartySerial = (
  serialToTest: string,
  parties: Party[],
  excludePartyId?: string
): Party | null => {
  const normalizedTest = normalizeSerialString(serialToTest);
  if (!normalizedTest) return null;

  for (let i = 0; i < parties.length; i++) {
    const p = parties[i];
    if (excludePartyId && p.id === excludePartyId) continue;

    const storedSerial = p.serialNumber ? normalizeSerialString(p.serialNumber) : '';
    const displaySerial = normalizeSerialString(getPartyDisplaySerial(p, i));

    if (storedSerial === normalizedTest || displaySerial === normalizedTest) {
      return p;
    }
  }

  return null;
};
