# Subscriptions Feature

Subscription management system for tracking recurring payments and services.

## Overview

The subscriptions feature allows users to:
- Track recurring subscriptions and payments
- Set up renewal reminders
- Categorize subscriptions by type
- View spending analytics
- Manage subscription status (active, paused, cancelled)
- Track payment history

## Structure

```
subscriptions/
├── components/      # UI components for subscriptions
└── utils/           # Utility functions
```

## Components

### Core Components
- **AddSubscriptionModal.tsx** - Add new subscription
- **EditSubscriptionModal.tsx** - Edit existing subscription
- **SubscriptionCard.tsx** - Display subscription card
- **SubscriptionDetailModal.tsx** - View subscription details

### Utility Components
- **StatusFilterTabs.tsx** - Filter by subscription status
- **CollapsibleStatsSummary.tsx** - Summary statistics

## Utils

Utility functions for:
- Date calculations (next billing date, days until renewal)
- Cost calculations (monthly/yearly totals)
- Subscription status logic
- Reminder scheduling

## Data Model

```typescript
interface Subscription {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  category: string;
  status: 'active' | 'paused' | 'cancelled';
  next_billing_date: string;
  reminder_days_before?: number;
  payment_method?: string;
  website_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

## Features

### 1. Subscription Tracking
Keep track of all recurring payments in one place.

### 2. Cost Analytics
View total monthly/yearly spending and breakdown by category.

### 3. Renewal Reminders
Get notified before subscriptions renew.

### 4. Status Management
Mark subscriptions as active, paused, or cancelled.

### 5. Payment History
Track payment history and upcoming charges.

## Usage Example

```tsx
import { 
  SubscriptionCard, 
  AddSubscriptionModal,
  StatusFilterTabs 
} from '@/features/subscriptions/components';

function SubscriptionsPage() {
  const [filter, setFilter] = useState('active');

  return (
    <div>
      <StatusFilterTabs value={filter} onChange={setFilter} />
      
      <div className="grid gap-4">
        {subscriptions
          .filter(sub => sub.status === filter)
          .map(subscription => (
            <SubscriptionCard 
              key={subscription.id} 
              subscription={subscription} 
            />
          ))}
      </div>

      <AddSubscriptionModal />
    </div>
  );
}
```

## Categories

Common subscription categories:
- Entertainment (Netflix, Spotify, etc.)
- Productivity (Office 365, Adobe, etc.)
- Cloud Storage (Dropbox, Google Drive, etc.)
- Software/SaaS
- News & Media
- Fitness & Health
- Other

## Integration

- Uses Supabase for data storage
- Real-time updates for subscription changes
- Notification system for reminders
- Currency conversion support
