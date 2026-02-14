

# Fix: Production Build Failing Due to Duplicate `Toaster` Export

## Root Cause

The published site at `laterr.lovable.app` is completely blank because the **production build fails silently**. The Lovable preview works fine because the dev server is more forgiving.

The build error is caused by a **duplicate export name collision**:

- `src/shared/components/ui/feedback/index.ts` line 3 exports `Toaster` from `./toaster`
- Line 5 does `export * from './sonner'`, which **also** exports a component named `Toaster`
- Rollup (used for production builds) rejects this ambiguity

Additionally, `src/app/providers.tsx` imports `Toaster` twice from the same barrel path, so the Sonner toast component was never actually being used in production anyway.

## Fix (2 files)

### 1. `src/shared/components/ui/feedback/sonner.tsx`
Rename the export from `Toaster` to `SonnerToaster` to eliminate the name collision:
```tsx
export { Toaster as SonnerToaster };
```

### 2. `src/shared/components/ui/feedback/index.ts`
Export the Sonner toaster under its distinct name:
```ts
export * from './alert';
export * from './toast';
export { Toaster } from './toaster';
export * from './progress';
export { SonnerToaster } from './sonner';
```

### 3. `src/app/providers.tsx`
Update the import to use the renamed export:
```tsx
import { Toaster, SonnerToaster } from "@/shared/components/ui";
```
And use `<SonnerToaster />` instead of `<Sonner />` in the JSX.

### 4. Any other files importing Sonner's Toaster
Search for and update any other imports of the Sonner Toaster throughout the codebase.

## After the Fix

Click **Publish > Update** to deploy the fixed build. The site should load correctly on all devices.

## Technical Details

- Vite's dev server uses ESM with hot module replacement, which resolves duplicate exports by last-write-wins -- so the preview works
- Rollup (production bundler) treats duplicate named exports as an error, causing the build to produce an empty output
- This is the same class of issue as the previous duplicate `NotePreview` import, but at the export/barrel level

