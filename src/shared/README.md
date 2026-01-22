# Shared

Shared utilities, hooks, types, and components used across multiple features.

## Structure

```
shared/
├── components/      # Shared components (app-specific, not UI primitives)
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries and helpers
└── types/           # Shared TypeScript types
```

## Components

App-specific components that contain business logic or app-specific patterns:

- **NavigationHeader.tsx** - Main navigation header
- **MobileBottomNav.tsx** - Mobile navigation bar
- **ThemeToggle.tsx** - Dark/light mode toggle
- **ThemeProvider.tsx** - Theme context provider
- **ActivityFeedCard.tsx** - Activity feed component
- **Breadcrumbs.tsx** - Navigation breadcrumbs
- **DashboardWidget.tsx** - Dashboard widget wrapper
- **GradientBackground.tsx** - Gradient background component
- **SearchBar.tsx** - Global search bar
- And more...

### Note on `/shared/components/ui`
This folder contains the original shadcn/ui components. The new UI primitives layer is in `/ui`. Consider this folder deprecated in favor of importing from `@/ui`.

## Hooks

Reusable React hooks for common patterns:

### State Management
- **use-toast.ts** - Toast notification hook
- **use-sidebar.ts** - Sidebar state management
- **use-mobile.ts** - Mobile detection hook
- **use-form-field.ts** - Form field utilities

### Data & API
- Custom hooks for data fetching
- Debounce and throttle hooks
- Local storage hooks

### UI Interactions
- Modal state management
- Keyboard shortcuts
- Scroll detection
- Resize observers

## Lib

Utility libraries and helper functions:

### utils.ts
Common utility functions:
```typescript
// Class name merging
cn(...classes)

// Date formatting
formatDate(date)

// String manipulation
truncate(str, length)
```

### ui-utils.ts
UI-specific utilities:
- Button variant helpers
- Color manipulation
- Style calculations

## Types

Shared TypeScript types and interfaces:

```typescript
// Common types used across features
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export type Theme = 'light' | 'dark' | 'system';
```

## Usage Guidelines

### When to Add to `/shared`

Add code to `/shared` when:
- ✅ Used by 2+ features
- ✅ Generic and reusable
- ✅ No feature-specific logic
- ✅ Common patterns and utilities

### When NOT to Add to `/shared`

Don't add to `/shared` when:
- ❌ Feature-specific logic
- ❌ Only used in one place
- ❌ Pure UI components (use `/ui` instead)
- ❌ Tightly coupled to a feature

## Examples

### Using Shared Hooks
```tsx
import { useToast } from '@/shared/hooks/use-toast';
import { useIsMobile } from '@/shared/hooks/use-mobile';

function MyComponent() {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleClick = () => {
    toast({ title: 'Success!' });
  };

  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
}
```

### Using Shared Utils
```tsx
import { cn } from '@/shared/lib/utils';

function MyComponent({ className, isActive }) {
  return (
    <div className={cn(
      'base-class',
      isActive && 'active-class',
      className
    )}>
      Content
    </div>
  );
}
```

## Best Practices

1. **Keep it generic** - Shared code should be feature-agnostic
2. **Document well** - Add JSDoc comments for complex utilities
3. **Type everything** - Use TypeScript for all shared code
4. **Test thoroughly** - Shared code affects multiple features
5. **Avoid duplication** - Check `/shared` before creating new utilities
6. **Consider `/ui`** - If it's a pure UI component, put it in `/ui` instead
