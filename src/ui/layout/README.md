# Layout Components

Utility components for layout structure and spacing.

## Files

- **separator.tsx** - Horizontal or vertical divider line
- **scroll-area.tsx** - Scrollable container with custom scrollbar
- **aspect-ratio.tsx** - Maintain aspect ratio wrapper
- **resizable.tsx** - Resizable panel layout
- **index.ts** - Barrel export

## Usage

### Separator
```tsx
import { Separator } from '@/ui';

<div>
  <p>Content above</p>
  <Separator className="my-4" />
  <p>Content below</p>
</div>

// Vertical separator
<div className="flex h-5 items-center space-x-4">
  <div>Item 1</div>
  <Separator orientation="vertical" />
  <div>Item 2</div>
</div>
```

### ScrollArea
```tsx
import { ScrollArea } from '@/ui';

<ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
  <div className="space-y-4">
    {/* Long content that scrolls */}
  </div>
</ScrollArea>
```

### AspectRatio
```tsx
import { AspectRatio } from '@/ui';

// 16:9 aspect ratio
<AspectRatio ratio={16 / 9}>
  <img src="image.jpg" alt="Image" className="object-cover" />
</AspectRatio>

// 1:1 square
<AspectRatio ratio={1}>
  <img src="avatar.jpg" alt="Avatar" className="object-cover" />
</AspectRatio>
```

### Resizable
```tsx
import { Resizable, ResizablePanel, ResizableHandle } from '@/ui';

<Resizable>
  <ResizablePanel defaultSize={50}>
    <div>Left panel</div>
  </ResizablePanel>
  <ResizableHandle />
  <ResizablePanel defaultSize={50}>
    <div>Right panel</div>
  </ResizablePanel>
</Resizable>
```

## Use Cases

- **Separator** - Visual dividers between sections
- **ScrollArea** - Custom scrollbars, constrained content areas
- **AspectRatio** - Images, videos, responsive media
- **Resizable** - Split views, adjustable layouts, editors
