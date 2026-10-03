import { Party, InstallmentScheme } from '../types';

/**
 * Calculates pending EMI / installment dues for a customer.
 */
export const getCustomerEmiDue = (
  customerId: string,
  customerPhone?: string,
  schemes: InstallmentScheme[] = []
): number => {
  if (!schemes || !Array.isArray(schemes)) return 0;
  const customerSchemes = schemes.filter(
    s =>
      (s.customerId === customerId || (customerPhone && !!s.customerPhone && s.customerPhone === customerPhone)) &&
      s.status !== 'COMPLETED'
  );

  return customerSchemes.reduce((sum, s) => {
    const totalPayable = Number(s.totalPayable || (s.totalPrice + (s.interestAmount || 0)));
    const dp = Number(s.downPayment || 0);
    const paidSchedules = (s.schedules || []).reduce((pSum, sched) => {
      if (sched.status === 'PAID') {
        return pSum + Number(sched.paidAmount || sched.amount || 0);
      }
      return pSum + Number(sched.paidAmount || 0);
    }, 0);
    const schemeDue = Math.max(0, totalPayable - (dp + paidSchedules));
    return sum + schemeDue;
  }, 0);
};

/**
 * Calculates total pending due for a customer (regular credit due + EMI due).
 */
export const getCustomerTotalDue = (
  customer: Party,
  schemes: InstallmentScheme[] = []
): number => {
  if (!customer) return 0;
  const regularDue = Number(customer.currentBalance || 0);
  const emiDue = getCustomerEmiDue(customer.id, customer.phone, schemes);
  return regularDue + emiDue;
};

/**
 * Returns a detailed breakdown of customer due balance.
 */
export const getDueBreakdown = (
  customer: Party,
  schemes: InstallmentScheme[] = []
) => {
  const regularDue = Number(customer?.currentBalance || 0);
  const emiDue = getCustomerEmiDue(customer?.id || '', customer?.phone, schemes);
  const totalDue = regularDue + emiDue;
  const creditLimit = Number(customer?.creditLimit || 0);
  const hasCreditLimit = creditLimit > 0;
  const availableCredit = hasCreditLimit ? Math.max(0, creditLimit - totalDue) : Infinity;
  const isCreditExceeded = hasCreditLimit && totalDue > creditLimit;
  const creditUsagePercent = hasCreditLimit ? Math.min(100, Math.round((totalDue / creditLimit) * 100)) : 0;

  return {
    regularDue,
    emiDue,
    totalDue,
    hasRegularDue: regularDue > 0,
    hasEmiDue: emiDue > 0,
    creditLimit,
    hasCreditLimit,
    availableCredit,
    isCreditExceeded,
    creditUsagePercent,
  };
};

/**
 * Checks whether adding a new due amount exceeds the customer's credit limit.
 */
export const checkCustomerCreditLimit = (
  customer: Party | null | undefined,
  additionalDue: number,
  schemes: InstallmentScheme[] = []
): {
  isAllowed: boolean;
  creditLimit: number;
  currentDue: number;
  projectedDue: number;
  exceededBy: number;
  availableCredit: number;
} => {
  if (!customer || !customer.id || customer.id === 'walk-in') {
    return {
      isAllowed: true,
      creditLimit: 0,
      currentDue: 0,
      projectedDue: additionalDue,
      exceededBy: 0,
      availableCredit: Infinity,
    };
  }

  const creditLimit = Number(customer.creditLimit || 0);
  // If credit limit is 0, it means "No Limit"
  if (creditLimit <= 0) {
    const currentDue = getCustomerTotalDue(customer, schemes);
    return {
      isAllowed: true,
      creditLimit: 0,
      currentDue,
      projectedDue: currentDue + additionalDue,
      exceededBy: 0,
      availableCredit: Infinity,
    };
  }

  const currentDue = getCustomerTotalDue(customer, schemes);
  const projectedDue = currentDue + additionalDue;
  const isAllowed = projectedDue <= creditLimit;
  const exceededBy = Math.max(0, projectedDue - creditLimit);
  const availableCredit = Math.max(0, creditLimit - currentDue);

  return {
    isAllowed,
    creditLimit,
    currentDue,
    projectedDue,
    exceededBy,
    availableCredit,
  };
};
