// Table name constants for Supabase queries
export const SUBSCRIPTION_TABLES = {
  SUBSCRIPTIONS: 'subscriptions',
  TRANSACTIONS: 'subscription_transactions',
  CATEGORIES: 'subscription_categories',
} as const;

// Default subscription categories
export const DEFAULT_CATEGORIES = [
  'Streaming',
  'Software',
  'Fitness',
  'Cloud Storage',
  'Gaming',
  'News',
  'Music',
  'Other',
] as const;

// Category colors for visual distinction
export const CATEGORY_COLORS: Record<string, string> = {
  Streaming: '#E50914',
  Software: '#0078D4',
  Fitness: '#4CAF50',
  'Cloud Storage': '#FF9800',
  Gaming: '#9C27B0',
  News: '#607D8B',
  Music: '#1DB954',
  Other: '#8B9A7F',
};

// Supported currencies with symbols
export const CURRENCY_OPTIONS = [
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
] as const;

// Billing cycle options
export const BILLING_CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one-time', label: 'One-time' },
] as const;

// Subscription status options
export const SUBSCRIPTION_STATUSES = [
  { value: 'active', label: 'Active', color: 'hsl(var(--accent))' },
  { value: 'paused', label: 'Paused', color: 'hsl(var(--muted-foreground))' },
  { value: 'cancelled', label: 'Cancelled', color: 'hsl(var(--destructive))' },
] as const;

// Default reminder days options
export const REMINDER_DAYS_OPTIONS = [1, 3, 7, 14, 30] as const;

// Popular subscription services for quick-add
export const POPULAR_SUBSCRIPTIONS = [
  { name: 'Netflix', category: 'Streaming', logo: 'https://logo.clearbit.com/netflix.com' },
  { name: 'Spotify', category: 'Music', logo: 'https://logo.clearbit.com/spotify.com' },
  { name: 'YouTube Premium', category: 'Streaming', logo: 'https://logo.clearbit.com/youtube.com' },
  { name: 'Adobe Creative Cloud', category: 'Software', logo: 'https://logo.clearbit.com/adobe.com' },
  { name: 'Microsoft 365', category: 'Software', logo: 'https://logo.clearbit.com/microsoft.com' },
  { name: 'iCloud+', category: 'Cloud Storage', logo: 'https://logo.clearbit.com/apple.com' },
  { name: 'Google One', category: 'Cloud Storage', logo: 'https://logo.clearbit.com/google.com' },
  { name: 'Amazon Prime', category: 'Streaming', logo: 'https://logo.clearbit.com/amazon.com' },
] as const;
