# Laterr UI Components Canvas Document

This document provides a visual reference for all UI components available in the Laterr application.

Generated on: 2/2/2026

---

## Full Page Preview

![Full Page](./screenshots/00-full-page.png)

---

## Navigation & Layout Components

![Navigation & Layout Components](./screenshots/1-navigation-layout.png)

---

## Data Display Components

![Data Display Components](./screenshots/2-data-display.png)

---

## Form & Input Components

![Form & Input Components](./screenshots/3-form-input.png)

---

## Overlays & Feedback Components

![Overlays & Feedback Components](./screenshots/4-overlays-feedback.png)

---

## Miscellaneous Components

![Miscellaneous Components](./screenshots/5-miscellaneous.png)

---

## Component List

The following components are available:

### Navigation & Layout Components
- NavigationHeader
- MobileBottomNav
- ModuleNavigationCard
- Breadcrumbs
- SearchBar (wrapping EnhancedInput)
- CollapsibleSummary
- GradientBackground

### Data Display Components
- CompactListRow
- QuickStatsGrid
- DashboardWidget
- RecommendationsPanel (wrapping ItemCard)

### Form & Input Components
- EnhancedInput
- Input
- Textarea
- Form Components (FormLabel, FormItem, FormControl, FormDescription, FormMessage, FormField)
- RadioGroup & RadioGroupItem
- Switch & Checkbox

### Overlays & Feedback Components
- Dialog (includes DialogContent, DialogHeader, etc.)
- Drawer (includes DrawerContent, DrawerHeader, etc.)
- AlertDialog
- Sheet (includes SheetTrigger, SheetOverlay, etc.)
- Popover
- HoverCard
- Tooltip (includes TooltipProvider)
- Toaster (Radix Toast)
- Sonner Toaster
- LoadingSpinner
- PageLoading

### Miscellaneous Components
- Avatar
- Badge
- Tabs (includes TabsList, TabsTrigger, TabsContent)
- Separator

---

## Usage

All components can be imported from `@/shared/components/ui`:

```typescript
import { Button, Card, CardHeader, CardTitle, ... } from "@/shared/components/ui";
```

Custom shared components can be imported from `@/shared/components`:

```typescript
import { NavigationHeader, SearchBar, LoadingSpinner } from "@/shared/components";
```

For detailed usage examples, please refer to the component showcase page at `/components`.
