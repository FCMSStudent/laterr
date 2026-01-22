# Button Components

Button components for user interactions with various states and styles.

## Files

- **Button.tsx** - Base button component with ripple effect and variants
- **LoadingButton.tsx** - Button with built-in loading state and spinner
- **IconButton.tsx** - Square button optimized for icon-only actions
- **button.types.ts** - TypeScript type definitions
- **index.ts** - Barrel export

## Usage

```tsx
import { Button, LoadingButton, IconButton } from '@/ui';

// Basic button
<Button variant="default" size="md">
  Click me
</Button>

// Loading button
<LoadingButton loading={isSubmitting} loadingText="Saving...">
  Save Changes
</LoadingButton>

// Icon button
<IconButton aria-label="Delete item" size="lg">
  <Trash2 className="h-4 w-4" />
</IconButton>
```

## Variants

- `default` - Primary action button
- `destructive` - Dangerous actions (delete, remove)
- `outline` - Secondary actions
- `secondary` - Less prominent actions
- `ghost` - Minimal styling
- `link` - Link-styled button

## Sizes

- `sm` - Small (32px height)
- `md` - Medium (40px height)
- `lg` - Large (44px height)
- `icon` - Square icon button
