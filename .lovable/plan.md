
# Plan: Unify BookmarkCard UI with Health Module Style

## Overview
Redesign the `BookmarkCard` component to match the visual style of the Health module cards (`MeasurementCard`, `HealthDocumentCard`), while preserving bookmark-specific functionality like selection mode, swipe-to-delete, and content type handling.

## Target Visual Style (from Health Module)
- Glass card effect with soft backdrop blur
- Colored left border accent (4px) based on content type
- Rounded corners (2xl = 16px)
- Consistent padding (p-6)
- Icon in a circular pill with semi-transparent background
- Clean vertical stacking with consistent spacing
- Subtle hover scale and shadow effects
- Type badge with subtle background tint

---

## Changes

### 1. Card Container Structure
**Current:** Different structures for note-type vs media-type cards with full-bleed images and gradient overlays.

**New:** Unified glass-card structure for all content types:
- Base: `glass-card rounded-2xl p-6 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl`
- Add colored left border: `border-l-4` with color based on content type (e.g., `border-l-primary` for URLs, `border-l-blue-500` for documents, etc.)

### 2. Content Type Color Mapping
Create a color mapping for bookmark types similar to `MEASUREMENT_COLORS`:

| Type | Border Color |
|------|-------------|
| url/article | `border-l-primary` |
| video | `border-l-red-500` |
| note | `border-l-amber-500` |
| document | `border-l-blue-500` |
| image | `border-l-green-500` |
| file | `border-l-purple-500` |

### 3. Header Section
Replace the current layout with:
- Icon in a circular container: `p-2 rounded-full bg-primary/10 text-primary`
- Type label next to icon (text-sm font-medium text-muted-foreground)
- Same row alignment as MeasurementCard

### 4. Preview Thumbnail
- Use `AspectRatio ratio={16/9}` with `mb-4`
- Centered icon fallback inside `bg-muted/30` if no image
- For images/videos: show thumbnail with subtle rounded corners
- Remove the full-bleed overlay style

### 5. Title and Metadata
- Title: `font-bold text-base line-clamp-2 leading-snug tracking-tight`
- Date with icon: similar to HealthDocumentCard style with `Calendar` icon
- Summary: `text-sm text-muted-foreground line-clamp-2`

### 6. Tags Section
- Match Health module style: `flex flex-wrap gap-2`
- Show max 3 tags + overflow badge
- Use `variant="secondary"` with `text-xs`

### 7. Actions Menu
- Keep existing dropdown menu functionality
- Position: `absolute top-4 right-4`
- Same reveal behavior (opacity-0 to opacity-100 on hover)
- Match button style: `bg-background/80 hover:bg-background rounded-full`

### 8. Preserve Mobile Behaviors
- Keep swipe-to-delete logic
- Keep long-press for selection mode
- Keep touch gesture handling

---

## Technical Details

### File: `src/features/bookmarks/components/BookmarkCard.tsx`

**New imports needed:**
- Add Calendar icon from lucide-react

**New constants to add:**
```typescript
const BOOKMARK_COLORS: Record<ItemType, string> = {
  url: 'border-l-primary',
  video: 'border-l-red-500',
  note: 'border-l-amber-500',
  document: 'border-l-blue-500',
  image: 'border-l-green-500',
  file: 'border-l-purple-500',
};
```

**Key structural changes:**
1. Remove the separate note-type vs media-type card variants
2. Use a single unified card structure for all types
3. Remove full-bleed image with gradient overlay approach
4. Add the health-style header with icon pill and type label
5. Thumbnail becomes a contained preview area (not full-bleed)

---

## Visual Comparison

### Before (Current BookmarkCard)
- Full-bleed images with dark gradient overlay
- Text overlaid on images (white on dark gradient)
- Different structure for notes vs media
- Badge positioned top-left over content

### After (Health-Style BookmarkCard)
- Glass card with solid background
- Colored left border accent
- Icon in circular pill header
- Thumbnail in a contained area
- All text on solid background (better readability)
- Consistent structure regardless of content type

---

## Files to Modify
1. **`src/features/bookmarks/components/BookmarkCard.tsx`** - Main component restructure
2. Optionally: Add shared constants file if color mapping should be reusable

## Notes
- The masonry layout logic in the parent page remains unchanged
- This change only affects the card's internal UI, not its sizing or aspect ratio behavior
- All existing props and callbacks remain the same
