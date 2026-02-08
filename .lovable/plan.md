
# Enhanced Bookmark Card with Dominant Color Gradient

## Overview

Transform the `BookmarkCard` component to match the App Store-style preview shown in the reference image. The card will feature a full-bleed thumbnail with a rich, vibrant gradient overlay using the dominant color extracted from the image.

## Design Analysis

The reference image shows these key design elements:
- **Full-bleed hero image** at the top ~40% of the card
- **Rich gradient overlay** covering the bottom ~60%, using the dominant image color
- **Category label** - Small uppercase text (e.g., "LIVE EVENT")
- **Large title** - Bold, prominent heading
- **Description** - Subtitle/summary text below the title
- **Source attribution** - App icon + name at the very bottom
- **Play button** - Centered overlay for video content
- **Action button** - "Get" or similar CTA (optional)

---

## Current State

The `BookmarkCard` component already has:
- `useDominantColor` hook integration
- Dynamic gradient using extracted color
- Category badge system
- Play button overlay for videos

However, the current gradient is more subtle and doesn't match the bold App Store aesthetic.

---

## Implementation Plan

### File: `src/features/bookmarks/components/BookmarkCard.tsx`

#### Change 1: Enhance Gradient Overlay

**Current (lines 374-376):**
```typescript
<div className="absolute inset-0 pointer-events-none" style={{
  background: dominantColor 
    ? `linear-gradient(to top, ${dominantColor} 0%, ${dominantColor}dd 30%, ${dominantColor}aa 50%, ${dominantColor}00 100%)` 
    : 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.4) 60%, transparent 100%)'
}} />
```

**New approach:**
- Start the solid color at 0% and extend to ~35%
- More opaque mid-section (40-60%)
- Smoother fade to transparent at top
- Add slight blur/vibrancy effect for modern look

```typescript
<div className="absolute inset-0 pointer-events-none" style={{
  background: dominantColor 
    ? `linear-gradient(to top, 
        ${dominantColor} 0%, 
        ${dominantColor} 25%,
        ${dominantColor}f0 35%,
        ${dominantColor}cc 50%,
        ${dominantColor}66 65%,
        transparent 85%)`
    : 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.9) 25%, rgba(0,0,0,0.7) 45%, rgba(0,0,0,0.3) 65%, transparent 85%)'
}} />
```

#### Change 2: Enhanced Text Overlay Layout

Update the bottom content area to include:
- Uppercase category label above title
- Larger, bolder title
- Summary/description text
- Optional source attribution

**Current structure (lines 392-398):**
```typescript
<div className="absolute bottom-0 left-0 right-0 p-5 z-10">
  <h3 className="font-bold text-white text-base leading-tight line-clamp-2">
    {title}
  </h3>
</div>
```

**New structure:**
```typescript
<div className="absolute bottom-0 left-0 right-0 p-5 z-10">
  {/* Category label */}
  <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">
    {categoryBadge.label}
  </span>
  
  {/* Title */}
  <h3 className="font-bold text-white text-lg leading-snug line-clamp-2 mb-1.5">
    {title}
  </h3>
  
  {/* Summary/description */}
  {summary && (
    <p className="text-white/80 text-sm leading-relaxed line-clamp-2">
      {summary}
    </p>
  )}
</div>
```

#### Change 3: Adjust Badge Positioning

Move the category badge from top-left corner into the text overlay area as a label, or keep it but make it more subtle as a secondary indicator.

**Option A:** Remove top badge, use text label instead
**Option B:** Keep badge for type identification, add text label for category

Recommend **Option A** for cleaner design matching the reference.

#### Change 4: Update Aspect Ratio for Taller Cards

The reference shows a taller card to accommodate more content.

**Current (lines 165-172):**
```typescript
const mediaRatio = useMemo(() => {
  if (isVideo) return 16 / 9;
  if (type === 'image') return 4 / 5;
  // ...
}, [isVideo, type]);
```

**Updated ratios:**
```typescript
const mediaRatio = useMemo(() => {
  if (isVideo) return 9 / 16;  // Tall video cards
  if (type === 'image') return 3 / 4;  // Portrait for images
  if (type === 'url') return 4 / 5;  // URL bookmarks
  return 1;  // Square fallback
}, [isVideo, type]);
```

#### Change 5: Add Play Button Centering

Move play button to visual center of the card (not offset to avoid text).

---

## Props to Add

| Prop | Type | Description |
|------|------|-------------|
| `summary` | Already exists | Display below title |
| `sourceName` | `string?` | Source app/website name (optional enhancement) |
| `sourceFavicon` | `string?` | Source favicon URL (optional enhancement) |

---

## Visual Comparison

```text
┌─────────────────────────┐     ┌─────────────────────────┐
│                         │     │                         │
│      [thumbnail]        │     │      [thumbnail]        │
│                         │     │                         │
│   ┌─────────────────┐   │     │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│   │ [badge]         │   │     │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
├───┴─────────────────┴───┤     │▒ CATEGORY LABEL ▒▒▒▒▒▒▒│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     │▒ Large Bold Title ▒▒▒▒▒│
│▓▓▓ Title ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     │▒ Description text... ▒▒│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
└─────────────────────────┘     └─────────────────────────┘
      CURRENT                         NEW DESIGN
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/features/bookmarks/components/BookmarkCard.tsx` | Enhanced gradient, text layout, aspect ratios |

---

## Summary

This enhancement transforms the bookmark cards to match the premium App Store-style design from the reference image by:

1. Creating a richer, more vibrant dominant color gradient (solid at bottom, smooth fade to top)
2. Adding category label text above the title
3. Increasing title size and adding summary display
4. Adjusting aspect ratios for taller, more content-rich cards
5. Repositioning the play button for better visual balance

The existing `useDominantColor` hook provides the color extraction, so this is primarily a styling and layout update.
