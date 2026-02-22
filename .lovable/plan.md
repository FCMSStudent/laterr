

# Fix: Consistent Navigation Header and Build Error

## Problem

Two issues need fixing:

1. **Inconsistent header**: The Bookmarks page has its own custom inline header (lines 535-680 in BookmarksPage.tsx) that duplicates all the NavigationHeader logic (sign out confirmation, settings button, theme toggle, overflow menu) but with completely different styling:
   - Bookmarks uses plain `border-border/50 bg-muted/20` inputs
   - Other pages (Dashboard, Health, Subscriptions) use the shared `NavigationHeader` with glass-style inputs
   - The duplicated code also means any future header changes need to be made in two places

2. **Build error**: `HealthChartPanel.tsx` uses `useCallback` but doesn't import it (line 1 imports `useState, useMemo` but not `useCallback`)

## Changes

### 1. Fix HealthChartPanel build error
**File:** `src/features/health/components/HealthChartPanel.tsx`

Add `useCallback` to the existing React imports on line 1.

### 2. Refactor BookmarksPage to use the shared NavigationHeader
**File:** `src/features/bookmarks/pages/BookmarksPage.tsx`

- Remove the entire custom inline header block (lines 535-680) including the duplicated sign-out dialog, settings button, theme toggle, and overflow menu
- Remove now-unused imports: `Settings`, `LogOut`, `MoreVertical`, `Sun`, `AlertDialog*`, `DropdownMenu*`, `ThemeToggle`, `LoadingSpinner`, `useTheme`, `AuthError`, `AUTH_ERRORS`, `signingOut` state, `handleSignOut`, `handleToggleTheme`
- Replace with the shared `NavigationHeader` component, passing:
  - `title="Bookmarks"`
  - `searchValue` / `onSearchChange` for the inline search
  - `onAddClick` for the Add button (hidden in trash view)
  - `filterButton` with the existing `MobileFilterSortButton`

### 3. Add All/Trash toggle as a custom element alongside the header
**File:** `src/features/bookmarks/pages/BookmarksPage.tsx`

The All/Trash pill toggle is Bookmarks-specific, so it will be placed just below the `NavigationHeader` or passed via the `overflowExtra` prop, keeping the header itself clean and consistent with other pages.

## Result

- All pages will share the same header component with consistent glass styling, button sizes, and behavior
- The All/Trash toggle remains as a Bookmarks-specific UI element
- The build error is fixed
- ~100 lines of duplicated code removed from BookmarksPage

