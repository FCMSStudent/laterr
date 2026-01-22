# Card Components

Container components for grouping related content with consistent styling.

## Files

- **Card.tsx** - Main card container
- **CardHeader.tsx** - Header section with spacing
- **CardTitle.tsx** - Title heading element
- **CardDescription.tsx** - Description text with muted styling
- **CardContent.tsx** - Main content area
- **CardFooter.tsx** - Footer section for actions
- **card.types.ts** - TypeScript type definitions
- **index.ts** - Barrel export

## Usage

```tsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent, 
  CardFooter 
} from '@/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Main content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

## Composition

Cards are highly composable - use only the parts you need:

```tsx
// Minimal card
<Card>
  <CardContent>Simple content</CardContent>
</Card>

// Card with header only
<Card>
  <CardHeader>
    <CardTitle>Title Only</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```
