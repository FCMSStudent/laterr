# UI Primitives Migration Analysis

## Current State

### Existing UI Components Location
- **shadcn/ui components**: `src/shared/components/ui/` (48 components)
- **Shared components**: `src/shared/components/` (15+ components)
- **Feature components**: `src/features/*/components/` (41 components)

### Current Import Pattern
```tsx
import { Button } from "@/shared/components/ui/button";
```

### Target Import Pattern
```tsx
import { Button } from "@/ui";
```

---

## Migration Strategy

### Phase 1: Create UI Primitives Layer

Move shadcn/ui components from `src/shared/components/ui/` to `src/ui/` with proper structure:

```
src/ui/
├─ button/
│  ├─ Button.tsx (from button.tsx)
│  ├─ LoadingButton.tsx (from loading-button.tsx)
│  ├─ IconButton.tsx (from icon-button.tsx)
│  ├─ button.types.ts
│  └─ index.ts
├─ card/
│  ├─ Card.tsx
│  ├─ CardHeader.tsx
│  ├─ CardContent.tsx
│  ├─ CardFooter.tsx
│  ├─ card.types.ts
│  └─ index.ts
├─ input/
│  ├─ Input.tsx
│  ├─ EnhancedInput.tsx
│  ├─ input.types.ts
│  └─ index.ts
├─ modal/
│  ├─ Dialog.tsx
│  ├─ Drawer.tsx
│  ├─ Sheet.tsx
│  ├─ modal.types.ts
│  └─ index.ts
└─ index.ts (barrel export)
```

### Components to Move to src/ui/

#### Core Primitives (High Priority)
1. **button/** - Button, LoadingButton, IconButton
2. **card/** - Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription
3. **input/** - Input, EnhancedInput, Textarea, EnhancedTextarea
4. **badge/** - Badge
5. **modal/** - Dialog, Drawer, Sheet, AlertDialog
6. **loader/** - Skeleton, LoadingSpinner
7. **form/** - Form, Label, Checkbox, Radio, Select, Switch
8. **layout/** - Separator, ScrollArea, AspectRatio, Resizable
9. **navigation/** - Tabs, Accordion, Collapsible
10. **feedback/** - Alert, Toast, Toaster, Progress
11. **overlay/** - Popover, Tooltip, HoverCard, ContextMenu, DropdownMenu
12. **data/** - Table, Pagination
13. **media/** - Avatar, Carousel
14. **calendar/** - Calendar
15. **advanced/** - Command, Menubar, NavigationMenu, Sidebar, Slider, Toggle, ToggleGroup

#### Components to Keep in src/shared/components/
These have feature-specific or app-specific logic:
- ActivityFeedCard (app-specific)
- Breadcrumbs (navigation logic)
- CollapsibleSummary (app-specific)
- CompactListRow (app-specific)
- DashboardWidget (app-specific)
- GradientBackground (app-specific styling)
- MobileBottomNav (app navigation)
- ModuleNavigationCard (app-specific)
- NavigationHeader (app navigation)
- QuickStatsGrid (app-specific)
- RecentlyViewedSection (app-specific)
- SearchBar (might have app-specific logic)
- ThemeProvider (app-specific)
- ThemeToggle (app-specific)

---

## Implementation Plan

### Step 1: Create UI Folder Structure
Create organized folders in `src/ui/` with proper TypeScript types and barrel exports.

### Step 2: Move and Refactor Components
- Copy components from `src/shared/components/ui/` to `src/ui/`
- Organize into logical folders (button, card, input, etc.)
- Add TypeScript type files
- Create barrel exports

### Step 3: Create Root Barrel Export
Create `src/ui/index.ts` that exports all UI primitives:
```tsx
export * from './button';
export * from './card';
export * from './input';
// ... etc
```

### Step 4: Update Imports Incrementally
Replace imports across the codebase:
```tsx
// Before
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

// After
import { Button, Card } from "@/ui";
```

### Step 5: Update Path Aliases (if needed)
Ensure `@/ui` resolves correctly in tsconfig and vite config.

### Step 6: Remove Old Files
After verifying all imports work, remove `src/shared/components/ui/` folder.

---

## Quality Checklist

- [ ] All components have TypeScript types
- [ ] All components are accessible (ARIA attributes)
- [ ] All components use consistent Tailwind patterns
- [ ] Barrel exports work correctly
- [ ] No feature-specific logic in UI primitives
- [ ] No breaking changes to existing behavior
- [ ] All imports updated across the app
- [ ] Build passes without errors
- [ ] No duplicate UI code in features

---

## Risk Mitigation

1. **Import Errors**: Update all imports incrementally, test after each batch
2. **Type Errors**: Ensure all type definitions are properly exported
3. **Runtime Errors**: Test key user flows after migration
4. **Build Errors**: Run build frequently during migration

---

## Success Criteria

✅ Clean `src/ui/` folder with organized primitives  
✅ Single import source: `import { ... } from '@/ui'`  
✅ No duplicated UI markup in features  
✅ All existing functionality preserved  
✅ TypeScript types working correctly  
✅ Build succeeds without errors
