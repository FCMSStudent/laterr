# Subscription Tracker Module

This module allows users to manage their recurring subscriptions with comprehensive analytics and renewal notifications.

## Features

- **Subscription Management**: Add, edit, pause, resume, cancel, and delete subscriptions
- **Analytics Dashboard**: View total monthly/yearly spending, breakdown by category
- **Renewal Reminders**: See upcoming renewals with urgency indicators
- **Filtering & Sorting**: Filter by category, status, billing cycle; sort by date, amount, or name
- **Search**: Search subscriptions by name or category

## Directory Structure

```
src/pages/subscriptions/
├── Index.tsx                 # Main page component
├── index.ts                  # Module exports
├── types.ts                  # TypeScript types and constants
├── components/
│   ├── AddSubscriptionModal.tsx     # Modal for adding new subscriptions
│   ├── AnalyticsPanel.tsx           # Analytics summary cards and charts
│   ├── DetailViewModal.tsx          # Full subscription details view
│   ├── EditSubscriptionModal.tsx    # Modal for editing subscriptions
│   ├── SearchBar.tsx                # Search input component
│   ├── SpendingBreakdownChart.tsx   # Pie chart for category spending
│   ├── SubscriptionCard.tsx         # Card component for subscription display
│   ├── SubscriptionCardSkeleton.tsx # Loading skeleton for cards
│   ├── SubscriptionFilterBar.tsx    # Filter and sort controls
│   └── UpcomingRenewalsPanel.tsx    # Panel showing upcoming renewals
└── hooks/
    ├── useSubscriptions.ts          # CRUD operations with TanStack Query
    ├── useSubscriptionAnalytics.ts  # Analytics data fetching
    └── useUpcomingRenewals.ts       # Upcoming renewals data fetching
```

## Database Schema

The module uses three tables:

1. **subscriptions**: Main table for subscription data
2. **subscription_payments**: Transaction history
3. **subscription_analytics**: Pre-computed aggregate data

Database functions:
- `get_upcoming_renewals(user_id, days_ahead)`: Returns subscriptions due for renewal
- `calculate_subscription_analytics(user_id, start_date, end_date)`: Returns category breakdown
- `get_subscription_totals(user_id)`: Returns monthly/yearly totals and active count

## Usage

Navigate to `/subscriptions` to access the module. Users must be authenticated.

## Technologies

- React 18 with TypeScript
- TanStack Query for state management
- Recharts for data visualization
- Shadcn/ui components
- Supabase for backend
