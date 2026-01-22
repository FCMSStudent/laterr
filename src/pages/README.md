# Pages

Top-level page components that map to application routes.

## Overview

Pages are the entry points for different routes in the application. They compose features and UI primitives to create complete user experiences.

## Files

- **Landing.tsx** - Landing/home page
- **Auth.tsx** - Authentication page (login/signup)
- **Dashboard.tsx** - Main dashboard (if exists)
- **Bookmarks.tsx** - Bookmarks management page
- **Health.tsx** - Health tracking page
- **Subscriptions.tsx** - Subscriptions management page
- **Settings.tsx** - User settings page
- **NotFound.tsx** - 404 error page
- **ViewerLoadingTest.tsx** - Test page for viewers

## Page Structure

Pages typically follow this pattern:

```tsx
import { useState } from 'react';
import { FeatureComponent } from '@/features/feature-name/components';
import { Button, Card } from '@/ui';

export default function PageName() {
  // Page-level state
  const [state, setState] = useState();

  // Page-level logic
  const handleAction = () => {
    // ...
  };

  return (
    <div className="container mx-auto p-6">
      <header>
        <h1>Page Title</h1>
      </header>

      <main>
        {/* Compose features and UI primitives */}
        <FeatureComponent />
      </main>
    </div>
  );
}
```

## Responsibilities

### Pages Should:
✅ Compose features and UI primitives  
✅ Handle routing and navigation  
✅ Manage page-level state  
✅ Handle authentication checks  
✅ Provide layout structure  
✅ Coordinate multiple features  

### Pages Should NOT:
❌ Contain business logic (use features)  
❌ Implement UI primitives (use `/ui`)  
❌ Make direct API calls (use feature hooks)  
❌ Duplicate feature logic  

## Routing

Pages are mapped to routes in the router configuration:

```tsx
// Example routing setup
const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/auth', element: <Auth /> },
  { path: '/bookmarks', element: <Bookmarks /> },
  { path: '/health', element: <Health /> },
  { path: '/subscriptions', element: <Subscriptions /> },
  { path: '/settings', element: <Settings /> },
  { path: '*', element: <NotFound /> },
]);
```

## Page Examples

### Landing Page
Public-facing landing page with marketing content and call-to-action.

### Auth Page
Authentication flow with login and signup forms.

### Bookmarks Page
Main interface for managing bookmarks with search, filters, and CRUD operations.

### Health Page
Health tracking dashboard with measurements, documents, and AI insights.

### Subscriptions Page
Subscription management with cost analytics and renewal tracking.

### Settings Page
User preferences, account settings, and configuration.

### NotFound Page
404 error page with navigation back to home.

## Layout

Pages can use shared layout components:

```tsx
import { NavigationHeader } from '@/shared/components';

export default function MyPage() {
  return (
    <>
      <NavigationHeader />
      <main className="container mx-auto p-6">
        {/* Page content */}
      </main>
    </>
  );
}
```

## Best Practices

1. **Keep pages thin** - Delegate logic to features and hooks
2. **Use composition** - Combine features and UI primitives
3. **Handle loading states** - Show skeletons while loading
4. **Error boundaries** - Wrap pages in error boundaries
5. **SEO considerations** - Set page titles and meta tags
6. **Responsive design** - Ensure mobile-friendly layouts
