# Loader Components

Loading indicators and skeleton placeholders for async content.

## Files

- **skeleton.tsx** - Skeleton placeholder for loading states
- **LoadingSpinner.tsx** - Animated spinner component
- **index.ts** - Barrel export

## Usage

### Skeleton
```tsx
import { Skeleton } from '@/ui';

// Loading placeholder
<div className="space-y-2">
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
  <Skeleton className="h-4 w-[150px]" />
</div>

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-[200px]" />
    <Skeleton className="h-4 w-[300px]" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-[200px] w-full" />
  </CardContent>
</Card>
```

### LoadingSpinner
```tsx
import { LoadingSpinner } from '@/ui';

// Default spinner
<LoadingSpinner />

// With custom size
<LoadingSpinner size="lg" />

// With text
<div className="flex flex-col items-center gap-2">
  <LoadingSpinner />
  <p>Loading...</p>
</div>
```

## Best Practices

- Use **Skeleton** for content placeholders (cards, lists, text)
- Use **LoadingSpinner** for actions, page loads, and overlays
- Match skeleton dimensions to actual content for smooth transitions
- Combine multiple skeletons to represent complex layouts
