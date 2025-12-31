// Subscription module types

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type PaymentStatus = 'completed' | 'pending' | 'failed';

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  status: SubscriptionStatus;
  payment_method: string | null;
  website_url: string | null;
  logo_url: string | null;
  notes: string | null;
  tags: string[];
  reminder_days_before: number;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  status: PaymentStatus;
  notes: string | null;
  created_at: string;
}

export interface SubscriptionAnalytics {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  total_monthly_cost: number;
  total_yearly_cost: number;
  active_count: number;
  by_category: Record<string, number>;
  created_at: string;
}

export interface UpcomingRenewal {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  days_until_renewal: number;
  logo_url: string | null;
  status: SubscriptionStatus;
}

export interface CategoryAnalytics {
  category: string;
  total_amount: number;
  monthly_equivalent: number;
  subscription_count: number;
}

export interface SubscriptionTotals {
  total_monthly: number;
  total_yearly: number;
  active_count: number;
}

// Form types
export interface SubscriptionFormData {
  name: string;
  category: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  status: SubscriptionStatus;
  payment_method?: string;
  website_url?: string;
  logo_url?: string;
  notes?: string;
  tags: string[];
  reminder_days_before: number;
  auto_renew: boolean;
}

// Constants
export const SUBSCRIPTION_CATEGORIES = [
  { value: 'streaming', label: '🎬 Streaming' },
  { value: 'software', label: '💻 Software' },
  { value: 'utilities', label: '⚡ Utilities' },
  { value: 'fitness', label: '💪 Fitness' },
  { value: 'education', label: '📚 Education' },
  { value: 'news', label: '📰 News & Media' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'music', label: '🎵 Music' },
  { value: 'cloud', label: '☁️ Cloud Storage' },
  { value: 'food', label: '🍕 Food & Delivery' },
  { value: 'other', label: '📦 Other' },
] as const;

export const BILLING_CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export const SUBSCRIPTION_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'paused', label: 'Paused', color: 'bg-yellow-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
] as const;

export const CURRENCIES = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'CAD', label: 'CAD ($)', symbol: 'C$' },
  { value: 'AUD', label: 'AUD ($)', symbol: 'A$' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
] as const;

export const REMINDER_OPTIONS = [
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
  { value: 14, label: '2 weeks before' },
] as const;
