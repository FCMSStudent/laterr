# Laterr UI Components Canvas Document

This document provides a visual reference for all UI components available in the Laterr application.

Generated on: 2/2/2026

---

## Full Page Preview

![Full Page](./screenshots/00-full-page.png)

---

## Buttons

![Buttons](./screenshots/1-buttons.png)

---

## Cards

![Cards](./screenshots/2-cards.png)

---

## Badges

![Badges](./screenshots/3-badges.png)

---

## Form Inputs

![Form Inputs](./screenshots/4-form-inputs.png)

---

## Select and Radio Groups

![Select and Radio Groups](./screenshots/5-select-radio.png)

---

## Slider and Calendar

![Slider and Calendar](./screenshots/6-slider-calendar.png)

---

## Progress and Alerts

![Progress and Alerts](./screenshots/7-progress-alerts.png)

---

## Avatars

![Avatars](./screenshots/8-avatar.png)

---

## Accordion and Tabs

![Accordion and Tabs](./screenshots/9-accordion-tabs.png)

---

## Dialogs and Modals

![Dialogs and Modals](./screenshots/10-dialogs.png)

---

## Dropdowns and Menus

![Dropdowns and Menus](./screenshots/11-dropdowns.png)

---

## Table

![Table](./screenshots/12-table.png)

---

## Navigation Components

![Navigation Components](./screenshots/13-navigation.png)

---

## Toggle Components

![Toggle Components](./screenshots/14-toggles.png)

---

## Layout Components

![Layout Components](./screenshots/15-layout.png)

---

## Loading States

![Loading States](./screenshots/16-skeleton.png)

---

## Collapsible

![Collapsible](./screenshots/17-collapsible.png)

---

## Command Palette

![Command Palette](./screenshots/18-command.png)

---

## Context Menu

![Context Menu](./screenshots/19-context-menu.png)

---

## Component List

The following components are available:

### Button Components
- Button (with variants: default, secondary, destructive, outline, ghost, link)
- IconButton
- LoadingButton

### Card Components
- Card
- CardHeader
- CardTitle
- CardDescription
- CardContent
- CardFooter

### Badge Components
- Badge (with variants: default, secondary, destructive, outline)

### Form Components
- Input
- Textarea
- Label
- Checkbox
- RadioGroup & RadioGroupItem
- Select (SelectTrigger, SelectValue, SelectContent, SelectItem)
- Switch
- Slider
- Calendar

### Feedback Components
- Alert (with AlertTitle, AlertDescription)
- Progress
- Toast & Toaster
- Sonner

### Media Components
- Avatar (with AvatarImage, AvatarFallback)
- Carousel

### Navigation Components
- Accordion (AccordionItem, AccordionTrigger, AccordionContent)
- Tabs (TabsList, TabsTrigger, TabsContent)
- Breadcrumb (BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator)
- NavigationMenu (NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink)
- Menubar (MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarSeparator)
- Collapsible (CollapsibleTrigger, CollapsibleContent)

### Modal Components
- Dialog (DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription)
- AlertDialog (AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel)
- Drawer
- Sheet

### Overlay Components
- DropdownMenu (DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator)
- Popover (PopoverTrigger, PopoverContent)
- Tooltip (TooltipTrigger, TooltipContent)
- HoverCard (HoverCardTrigger, HoverCardContent)
- ContextMenu (ContextMenuTrigger, ContextMenuContent, ContextMenuItem)

### Data Components
- Table (TableHeader, TableBody, TableRow, TableHead, TableCell)
- Pagination

### Layout Components
- Separator
- ScrollArea
- AspectRatio
- Resizable

### Advanced Components
- Command (CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem)
- Chart
- Sidebar
- InputOTP

### Toggle Components
- Toggle
- ToggleGroup (ToggleGroupItem)

### Loading Components
- Skeleton
- LoadingSpinner

---

## Usage

All components can be imported from `@/shared/components/ui`:

```typescript
import { Button, Card, CardHeader, CardTitle, ... } from "@/shared/components/ui";
```

For detailed usage examples, please refer to the component showcase page at `/components`.
