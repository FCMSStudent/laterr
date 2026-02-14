
# Fix: Production Build Failures Causing Blank Page

## Problems Found

The `agentation` package is already removed from `App.tsx` — that's not the issue. After deeper investigation, here are the **actual remaining problems**:

### Problem 1: `process.env.NODE_ENV` in Vite project
**File:** `src/app/routes.tsx` (line 33)

```tsx
{process.env.NODE_ENV === "development" && (
  <Route path="/viewer-loading-test" element={<ViewerLoadingTestPage />} />
)}
```

Vite does **not** define `process.env` in production builds. This will throw a `ReferenceError: process is not defined` at runtime, crashing the entire app before it renders anything.

**Fix:** Replace with Vite's equivalent:
```tsx
{import.meta.env.DEV && (
  <Route path="/viewer-loading-test" element={<ViewerLoadingTestPage />} />
)}
```

### Problem 2: Duplicate Supabase client with `process.env` references
**File:** `src/lib/supabase/client.ts`

This is a **manually created duplicate** of the auto-generated `src/integrations/supabase/client.ts`. It references `process.env` (lines 14-16), which will also crash in Vite production builds. Worse, **28 files** import from this duplicate instead of the official auto-generated client.

**Fix (two parts):**
1. **Delete** `src/lib/supabase/client.ts` and `src/lib/supabase/types.ts`
2. **Update all 28 files** that import from `@/lib/supabase/client` to import from `@/integrations/supabase/client` instead

Affected files include:
- `src/features/bookmarks/pages/BookmarksPage.tsx`
- `src/features/bookmarks/components/AddItemModal.tsx`
- `src/features/dashboard/pages/DashboardPage.tsx`
- `src/features/health/pages/HealthPage.tsx`
- `src/features/settings/pages/SettingsPage.tsx`
- `src/features/subscriptions/components/EditSubscriptionModal.tsx`
- `src/shared/hooks/useDashboardStats.ts`
- `src/shared/lib/supabase-utils.ts`
- ...and ~20 more files

### Problem 3: `agentation` package still in `package.json`
Even though it's no longer imported, the `agentation` package (v1.3.2) is still listed as a dependency. It should be removed from `package.json` to keep the bundle clean and avoid any side-effect issues during tree-shaking.

## Summary of Changes

| File | Action |
|------|--------|
| `src/app/routes.tsx` | Replace `process.env.NODE_ENV` with `import.meta.env.DEV` |
| `src/lib/supabase/client.ts` | Delete |
| `src/lib/supabase/types.ts` | Delete |
| 28 source files | Change import path from `@/lib/supabase/client` to `@/integrations/supabase/client` |
| `package.json` | Remove `agentation` dependency |

## After the Fix

Click **Publish > Update** to deploy. The site should load correctly on all devices.
