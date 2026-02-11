// Subscription billing cycle options
export type SubscriptionBillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one-time';

// Subscription status options
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

// Transaction status options
export type TransactionStatus = 'paid' | 'pending' | 'failed';

// Main subscription interface
export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  provider?: string | null;
  category: string;
  amount: number;
  currency: string;
  billing_cycle: SubscriptionBillingCycle;
  next_billing_date: string;
  status: SubscriptionStatus;
  payment_method?: string | null;
  auto_renew: boolean;
  website_url?: string | null;
  logo_url?: string | null;
  notes?: string | null;
  reminder_days_before: number;
  tags?: string[] | null;
  is_favorite?: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at?: string | null;
}

// Subscription transaction interface
export interface SubscriptionTransaction {
  id: string;
  subscription_id: string;
  user_id: string;
  amount: number;
  transaction_date: string;
  payment_method?: string | null;
  status: TransactionStatus;
  notes?: string | null;
  created_at: string;
}

// Subscription category interface
export interface SubscriptionCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  budget_limit?: number | null;
  created_at: string;
}

// Analytics interface for dashboard stats
export interface SubscriptionAnalytics {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  byCategory: {
    category: string;
    total: number;
    monthlyEquivalent: number;
    count: number;
  }[];
  upcomingRenewals: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    daysUntil: number;
    nextBillingDate: string;
  }[];
}

// Form data for creating/editing subscriptions
export interface SubscriptionFormData {
  name: string;
  provider?: string;
  category: string;
  amount: number;
  currency: string;
  billing_cycle: SubscriptionBillingCycle;
  next_billing_date: string;
  status: SubscriptionStatus;
  payment_method?: string;
  auto_renew: boolean;
  website_url?: string;
  notes?: string;
  reminder_days_before: number;
  tags?: string[];
}
