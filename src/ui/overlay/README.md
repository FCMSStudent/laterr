# Overlay Components

Floating overlay components for contextual information and menus.

## Files

- **popover.tsx** - Floating popover for content
- **tooltip.tsx** - Hover tooltip for hints
- **hover-card.tsx** - Rich hover card with content
- **context-menu.tsx** - Right-click context menu
- **dropdown-menu.tsx** - Dropdown menu for actions
- **index.ts** - Barrel export

## Usage

### Popover
```tsx
import { Popover, PopoverTrigger, PopoverContent } from '@/ui';

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>
    <p>Popover content here</p>
  </PopoverContent>
</Popover>
```

### Tooltip
```tsx
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/ui';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost">Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Helpful tooltip text</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### HoverCard
```tsx
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/ui';

<HoverCard>
  <HoverCardTrigger asChild>
    <Button variant="link">@username</Button>
  </HoverCardTrigger>
  <HoverCardContent className="w-80">
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">@username</h4>
      <p className="text-sm">User bio and information</p>
    </div>
  </HoverCardContent>
</HoverCard>
```

### ContextMenu
```tsx
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/ui';

<ContextMenu>
  <ContextMenuTrigger>
    <div className="border rounded p-4">
      Right click me
    </div>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Edit</ContextMenuItem>
    <ContextMenuItem>Duplicate</ContextMenuItem>
    <ContextMenuItem>Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

### DropdownMenu
```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/ui';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## When to Use

- **Popover** - Forms, filters, additional content
- **Tooltip** - Short hints, icon explanations
- **HoverCard** - Rich previews, user cards, detailed info
- **ContextMenu** - Right-click actions, item operations
- **DropdownMenu** - Action menus, navigation, user menus
