# Source Directory

Root source directory for the application.

## Structure

```
src/
├── assets/          # Static assets (images, fonts, etc.)
├── features/        # Feature modules (bookmarks, health, subscriptions)
├── integrations/    # External service integrations (Supabase)
├── pages/           # Page components and routes
├── shared/          # Shared utilities, hooks, and components
├── styles/          # Global styles and CSS
├── ui/              # UI primitives and design system
├── App.tsx          # Main application component
├── App.css          # Application styles
├── index.css        # Global styles
└── main.tsx         # Application entry point
```

## Key Directories

### `/features`
Feature-based modules containing domain-specific logic, components, and utilities. Each feature is self-contained with its own components, hooks, and business logic.

### `/ui`
Centralized UI primitives layer - pure, reusable components with no business logic. Import from `@/ui`.

### `/pages`
Top-level page components that compose features and UI primitives. These map to routes in the application.

### `/shared`
Shared utilities, hooks, types, and components used across multiple features.

### `/integrations`
External service integrations and API clients (e.g., Supabase).

## Import Aliases

- `@/ui` - UI primitives
- `@/shared` - Shared utilities
- `@/features` - Feature modules
- `@/pages` - Page components
- `@/integrations` - Service integrations

## Architecture Principles

1. **Feature-based organization** - Group by feature, not by file type
2. **UI primitives separation** - Pure UI components in `/ui`, business logic in `/features`
3. **Shared utilities** - Common code in `/shared` to avoid duplication
4. **Clear boundaries** - Features don't import from each other directly
