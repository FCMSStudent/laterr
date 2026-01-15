import { CURRENCY_OPTIONS } from '@/constants/subscriptions';
import type { SubscriptionBillingCycle } from '@/types/subscription';

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const currency = CURRENCY_OPTIONS.find((c) => c.code === currencyCode);
  return currency?.symbol ?? currencyCode;
}

/**
 * Format amount with proper currency symbol and formatting
 */
export function formatCurrency(amount: number, currencyCode: string = 'SAR'): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // Place symbol before or after based on currency convention
  if (currencyCode === 'SAR') {
    return `${formattedAmount} ${symbol}`;
  }
  return `${symbol}${formattedAmount}`;
}

/**
 * Calculate annual cost from any billing cycle
 */
export function calculateAnnualCost(cost: number, billingCycle: SubscriptionBillingCycle): number {
  switch (billingCycle) {
    case 'weekly':
      return cost * 52;
    case 'monthly':
      return cost * 12;
    case 'quarterly':
      return cost * 4;
    case 'yearly':
      return cost;
    case 'one-time':
      return cost; // One-time doesn't recur, but return the cost for reference
    default:
      return cost * 12; // Default to monthly
  }
}

/**
 * Calculate monthly cost from any billing cycle
 */
export function calculateMonthlyCost(cost: number, billingCycle: SubscriptionBillingCycle): number {
  switch (billingCycle) {
    case 'weekly':
      return cost * 4.33; // Average weeks per month
    case 'monthly':
      return cost;
    case 'quarterly':
      return cost / 3;
    case 'yearly':
      return cost / 12;
    case 'one-time':
      return 0; // One-time doesn't have monthly cost
    default:
      return cost;
  }
}

/**
 * Calculate daily cost from any billing cycle
 */
export function calculateDailyCost(cost: number, billingCycle: SubscriptionBillingCycle): number {
  switch (billingCycle) {
    case 'weekly':
      return cost / 7;
    case 'monthly':
      return cost / 30;
    case 'quarterly':
      return cost / 90;
    case 'yearly':
      return cost / 365;
    case 'one-time':
      return 0;
    default:
      return cost / 30;
  }
}

/**
 * Get billing cycle multiplier for converting to monthly
 */
export function getBillingCycleMultiplier(billingCycle: SubscriptionBillingCycle): number {
  switch (billingCycle) {
    case 'weekly':
      return 4.33;
    case 'monthly':
      return 1;
    case 'quarterly':
      return 1 / 3;
    case 'yearly':
      return 1 / 12;
    case 'one-time':
      return 0;
    default:
      return 1;
  }
}

/**
 * Format billing cycle for display
 */
export function formatBillingCycle(billingCycle: SubscriptionBillingCycle): string {
  switch (billingCycle) {
    case 'weekly':
      return 'week';
    case 'monthly':
      return 'month';
    case 'quarterly':
      return 'quarter';
    case 'yearly':
      return 'year';
    case 'one-time':
      return 'one-time';
    default:
      return 'month';
  }
}
