# Features

Feature-based modules containing domain-specific logic and components.

## Structure

```
features/
├── bookmarks/       # Bookmark management feature
├── health/          # Health tracking feature
└── subscriptions/   # Subscription management feature
```

## Feature Organization

Each feature follows a consistent structure:

```
feature-name/
├── components/      # Feature-specific components
├── hooks/           # Feature-specific React hooks
├── utils/           # Feature-specific utilities
└── types.ts         # Feature-specific TypeScript types (optional)
```

## Principles

### 1. Self-Contained
Each feature is self-contained with its own:
- Components for UI specific to the feature
- Hooks for feature-specific state and logic
- Utilities for feature-specific operations
- Types for feature-specific data structures

### 2. No Cross-Feature Dependencies
Features should not import from each other. If code needs to be shared:
- Move it to `/shared` if it's generic
- Create a new shared utility/hook
- Use composition at the page level

### 3. Compose UI Primitives
Feature components should compose UI primitives from `@/ui`:

```tsx
// ✅ Good - Compose UI primitives
import { Card, Button, Badge } from '@/ui';

export function BookmarkCard({ bookmark }) {
  return (
    <Card>
      <CardHeader>
        <Badge>{bookmark.type}</Badge>
      </CardHeader>
      <CardContent>
        <h3>{bookmark.title}</h3>
      </CardContent>
      <CardFooter>
        <Button>View</Button>
      </CardFooter>
    </Card>
  );
}
```

### 4. Business Logic Only
Feature components contain:
- ✅ Domain logic (bookmark operations, health calculations)
- ✅ API calls and data fetching
- ✅ Feature-specific state management
- ✅ Integration with Supabase
- ❌ Generic UI patterns (use `/ui` instead)

## Adding a New Feature

1. Create feature folder: `features/my-feature/`
2. Add subfolders: `components/`, `hooks/`, `utils/`
3. Create feature-specific components
4. Add hooks for state and logic
5. Create utilities for operations
6. Compose UI primitives from `@/ui`
7. Integrate at page level

## Examples

### Bookmarks Feature
Manages saved links, notes, and documents with tags and search.

### Health Feature
Tracks health measurements, documents, and provides AI-powered insights.

### Subscriptions Feature
Manages recurring subscriptions with reminders and analytics.
