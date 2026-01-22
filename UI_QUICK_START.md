# UI Primitives - Quick Start Guide

## Import Pattern

### ✅ New Way (Use This)
```tsx
import { Button, Card, Dialog, Input } from '@/ui';
```

### ❌ Old Way (Don't Use)
```tsx
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
```

---

## Common Components

### Buttons
```tsx
import { Button, LoadingButton, IconButton } from '@/ui';

// Basic button
<Button variant="default" size="md">Click me</Button>

// Loading button
<LoadingButton loading={isLoading} loadingText="Saving...">
  Save
</LoadingButton>

// Icon button
<IconButton aria-label="Delete" size="lg">
  <Trash2 className="h-4 w-4" />
</IconButton>
```

### Cards
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/ui';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

### Modals
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
    </DialogHeader>
    <p>Modal content</p>
  </DialogContent>
</Dialog>
```

### Forms
```tsx
import { Form, Label, Input, Checkbox, Button } from '@/ui';

<Form>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
  
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms</Label>
  
  <Button type="submit">Submit</Button>
</Form>
```

### Feedback
```tsx
import { Alert, useToast, Progress } from '@/ui';

// Alert
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>

// Toast
const { toast } = useToast();
toast({
  title: "Success",
  description: "Action completed"
});

// Progress
<Progress value={50} />
```

---

## Component Categories

### Button (`@/ui`)
- `Button` - Base button
- `LoadingButton` - With loading state
- `IconButton` - Icon-only button

### Card (`@/ui`)
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

### Input (`@/ui`)
- `Input`, `EnhancedInput`
- `Textarea`, `EnhancedTextarea`

### Badge (`@/ui`)
- `Badge`

### Modal (`@/ui`)
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`
- `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`

### Loader (`@/ui`)
- `Skeleton`
- `LoadingSpinner`

### Form (`@/ui`)
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
- `Label`
- `Checkbox`
- `RadioGroup`, `RadioGroupItem`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`
- `Switch`

### Layout (`@/ui`)
- `Separator`
- `ScrollArea`
- `AspectRatio`
- `Resizable`, `ResizablePanel`, `ResizableHandle`

### Navigation (`@/ui`)
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`

### Feedback (`@/ui`)
- `Alert`, `AlertTitle`, `AlertDescription`
- `Toast`, `Toaster`, `useToast`
- `Progress`
- `Sonner`

### Overlay (`@/ui`)
- `Popover`, `PopoverTrigger`, `PopoverContent`
- `Tooltip`, `TooltipProvider`, `TooltipTrigger`, `TooltipContent`
- `HoverCard`, `HoverCardTrigger`, `HoverCardContent`
- `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`

### Data (`@/ui`)
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- `Pagination`

### Media (`@/ui`)
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`

### Calendar (`@/ui`)
- `Calendar`

### Advanced (`@/ui`)
- `Command`, `CommandInput`, `CommandList`, `CommandItem`
- `Sidebar`, `SidebarProvider`, `SidebarTrigger`
- `Chart`
- `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`
- And more...

---

## When to Use `@/ui` vs Feature Components

### Use `@/ui` when:
✅ Component is purely presentational  
✅ No business logic or API calls  
✅ Can be reused across multiple features  
✅ No feature-specific concepts (bookmark, health, subscription)

### Keep in feature folder when:
❌ Contains Supabase queries  
❌ Has feature-specific logic  
❌ References domain concepts  
❌ Tightly coupled to a feature

---

## Adding New UI Components

1. **Create folder** in appropriate category:
   ```bash
   mkdir src/ui/my-category/
   ```

2. **Add component file**:
   ```tsx
   // src/ui/my-category/MyComponent.tsx
   export const MyComponent = () => {
     return <div>My Component</div>;
   };
   ```

3. **Create types file** (optional):
   ```tsx
   // src/ui/my-category/my-component.types.ts
   export interface MyComponentProps {
     // props here
   }
   ```

4. **Create barrel export**:
   ```tsx
   // src/ui/my-category/index.ts
   export * from './MyComponent';
   export type * from './my-component.types';
   ```

5. **Export from main index**:
   ```tsx
   // src/ui/index.ts
   export * from './my-category';
   ```

---

## TypeScript Types

All component types are exported:

```tsx
import type { 
  ButtonProps, 
  LoadingButtonProps,
  CardProps,
  DialogProps 
} from '@/ui';
```

---

## Best Practices

1. **Always import from `@/ui`** - Never import from subdirectories
2. **Keep components pure** - No business logic in UI primitives
3. **Use TypeScript** - Leverage type safety
4. **Follow naming conventions** - PascalCase for components
5. **Document props** - Add JSDoc comments for complex props
6. **Keep it simple** - Don't over-engineer primitives

---

## Migration Checklist

If you're updating old code:

- [ ] Replace `@/shared/components/ui/*` imports with `@/ui`
- [ ] Test component renders correctly
- [ ] Verify TypeScript types work
- [ ] Check for any breaking changes
- [ ] Run build to ensure no errors

---

## Need Help?

- See `UI_REFACTORING_COMPLETE.md` for full documentation
- Check `UI_PRIMITIVES_ANALYSIS.md` for migration details
- Look at existing components for examples
- All components follow shadcn/ui patterns

---

**Remember**: Import from `@/ui`, keep it simple, and keep UI primitives pure! 🎨
