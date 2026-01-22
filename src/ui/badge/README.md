# Badge Component

Small status indicators and labels for categorization and status display.

## Files

- **badge.tsx** - Badge component with variants
- **index.ts** - Barrel export

## Usage

```tsx
import { Badge } from '@/ui';

// Default badge
<Badge>New</Badge>

// Variants
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

## Variants

- `default` - Primary badge (pink/primary color)
- `secondary` - Subtle gray badge
- `destructive` - Red badge for errors/warnings
- `outline` - Outlined badge with transparent background

## Common Use Cases

- Status indicators (Active, Pending, Completed)
- Category labels
- Notification counts
- Feature tags
- Content type labels
