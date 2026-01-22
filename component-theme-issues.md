# Component-Level Theme Issues

## Hardcoded Colors in Components

### 1. BookmarkCard.tsx
**Location**: Line 305
```tsx
<Badge className={cn("... bg-[#ec4699]/[0.83]")}>
```
**Issue**: Hardcoded pink color `#ec4699` with opacity. This should use CSS variables.
**Impact**: Badge color won't adapt properly to theme changes.

### 2. ItemCard.tsx
**Location**: Line 237
```tsx
<div className="... bg-[#ec4699]/[0.67]">
```
**Issue**: Same hardcoded pink color for video play button overlay.
**Impact**: Video play button overlay won't adapt to theme.

### 3. DOCXPreview.tsx
**Location**: Line 84
```tsx
<div className="... bg-white/95 dark:bg-gray-900/95 ...">
```
**Issue**: Uses Tailwind's default gray scale instead of theme variables.
**Impact**: Document preview background may not match the overall theme palette.

**Location**: Line 131
```tsx
<div className="prose prose-sm dark:prose-invert ...">
```
**Issue**: Uses Tailwind's prose dark mode variant.
**Status**: ✓ This is actually correct usage for typography.

### 4. MeasurementGroup.tsx
**Location**: Line 91
```tsx
<div className="text-xs text-green-600 dark:text-green-500">
```
**Issue**: Uses Tailwind's default green colors instead of `--success` variable.
**Impact**: Success indicators won't match the theme's success color.

### 5. CollapsibleStatsSummary.tsx
**Location**: Line 44
```tsx
<span className="text-amber-600 dark:text-amber-500">
```
**Issue**: Uses Tailwind's default amber colors instead of `--warning` variable.
**Impact**: Warning indicators won't match the theme's warning color.

### 6. Auth.tsx
**Location**: Lines 311-312, 382-383
```tsx
<div className="... bg-green-100 dark:bg-green-900/30 ...">
  <Check className="... text-green-600 dark:text-green-400" />
</div>
```
**Issue**: Uses Tailwind's default green colors instead of `--success` variable.
**Impact**: Success checkmarks won't match the theme's success color.

### 7. AddItemModal.tsx
**Location**: Lines 465, 492
```tsx
className="... text-[15px] ..."
```
**Issue**: Hardcoded font size.
**Status**: ⚠️ Minor - font sizes are often hardcoded, but should be consistent.

### 8. FilterBar.tsx
**Location**: Line 58
```tsx
<Badge variant="destructive" className="... text-[10px]">
```
**Issue**: Hardcoded font size.
**Status**: ⚠️ Minor - uses proper `destructive` variant.

### 9. MobileBottomNav.tsx
**Location**: Line 73
```tsx
className="text-[11px] ... text-primary"
```
**Issue**: Hardcoded font size, but correctly uses `text-primary`.
**Status**: ✓ Properly uses theme variable.

### 10. ThemeToggle.tsx
**Location**: Lines 16-17
```tsx
<Sun className="... dark:-rotate-90 dark:scale-0" />
<Moon className="... dark:rotate-0 dark:scale-100" />
```
**Status**: ✓ Correct implementation for theme toggle animation.

### 11. calendar.tsx
**Location**: Line 29
```tsx
head_cell: "text-muted-foreground ... text-[0.8rem]"
```
**Status**: ✓ Uses theme variable with hardcoded size (acceptable).

### 12. chart.tsx
**Location**: Lines 48, 185-189
```tsx
className={cn("... [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 ...")}
```
**Issue**: References to `#ccc` in Recharts selectors, but remaps them to theme variables.
**Status**: ✓ This is correct - it's overriding Recharts defaults with theme colors.

## Summary of Component Issues

### 🔴 Critical - Must Fix

1. **Hardcoded Brand Color** (`#ec4699`):
   - `BookmarkCard.tsx` line 305
   - `ItemCard.tsx` line 237
   - Should use `hsl(var(--primary))` or a dedicated brand color variable

2. **Semantic Color Misuse**:
   - `MeasurementGroup.tsx` - Should use `hsl(var(--success))`
   - `CollapsibleStatsSummary.tsx` - Should use `hsl(var(--warning))`
   - `Auth.tsx` - Should use `hsl(var(--success))`

### ⚠️ Medium Priority

3. **Background Color Inconsistency**:
   - `DOCXPreview.tsx` - Should use theme background variables

### ✓ Working Correctly

- ThemeToggle component
- Chart component (properly remaps colors)
- Calendar component
- Components using `text-primary`, `text-muted-foreground`, etc.

## Recommendations

1. **Create a brand color variable** in `index.css`:
   ```css
   :root {
     --brand: 330 81.1881% 60.3922%;
     --brand-foreground: 0 0% 100%;
   }
   
   .dark {
     --brand: 330 81.1881% 60.3922%; /* Keep same vibrant color */
     --brand-foreground: 0 0% 100%;
   }
   ```

2. **Replace hardcoded colors** with theme variables:
   - `bg-[#ec4699]/[0.83]` → `bg-brand/[0.83]` or `bg-primary/[0.83]`
   - `text-green-600 dark:text-green-500` → `text-success`
   - `text-amber-600 dark:text-amber-500` → `text-warning`

3. **Update Tailwind config** to include custom color classes if not already present.
