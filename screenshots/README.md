# UI Components Screenshots

This directory contains automatically generated screenshots of all UI components in the Laterr application.

## Screenshot Generation

Screenshots are automatically generated using Playwright tests. To regenerate screenshots:

```bash
# Install Playwright browsers (first time only)
npx playwright install --with-deps chromium

# Run screenshot generation
npm run screenshots
```

## Available Screenshots

- `00-full-page.png` - Full page view of the component showcase
- `1-navigation-layout.png` - Navigation & Layout Components
- `2-data-display.png` - Data Display Components
- `3-form-input.png` - Form & Input Components
- `4-overlays-feedback.png` - Overlays & Feedback Components
- `5-miscellaneous.png` - Miscellaneous Components

## Component Categories

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

## Component Showcase Page

You can view all components interactively at:
```
http://localhost:8080/components
```

When the development server is running.

## Documentation

For a comprehensive visual reference with all screenshots, see the main documentation:
- [laterr_ui_components_canvas_document.md](../laterr_ui_components_canvas_document.md)

## Updating Screenshots

When components are updated or new components are added:

1. Update the component showcase page at `src/features/core/pages/ComponentShowcasePage.tsx`
2. Update the test file at `tests/screenshots.spec.ts` to include new sections
3. Run `npm run screenshots` to regenerate all screenshots
4. The markdown documentation will be automatically updated

## Notes

- Screenshots are generated in a headless Chrome browser
- The showcase page uses the actual production components
- All screenshots are taken at desktop resolution (1280x720)
