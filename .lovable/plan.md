

# Make Cards Smaller on Mobile (Pinterest-style)

## Problem
Currently on mobile, the grid is `columns-1` — a single column of full-width cards. This doesn't feel like Pinterest at all.

## Changes

### 1. Grid: 2 columns on mobile
**File: `src/features/bookmarks/pages/BookmarksPage.tsx`** (lines 559 and 584)

Change `columns-1 sm:columns-2` to `columns-2 sm:columns-2` so mobile always shows 2 columns. Reduce the gap on mobile:
```
columns-2 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 md:gap-6
```

Also update the margin-bottom on card wrappers (lines 563, 586) from `mb-5 md:mb-6` to `mb-3 md:mb-6`.

### 2. Smaller card text/padding on mobile
**File: `src/features/bookmarks/components/BookmarkCard.tsx`**

- Reduce mobile padding on the text overlay area (the frosted glass panel at the bottom)
- Shrink font sizes: title from `text-lg` to `text-sm` on mobile, category label smaller
- Reduce badge size on mobile
- These are minor className tweaks using responsive prefixes (`text-sm md:text-lg`, `p-3 md:p-5`, etc.)

### 3. Skeleton grid matches
**File: `src/features/bookmarks/pages/BookmarksPage.tsx`** — same column change on the skeleton loading grid (line 559).

## Result
Mobile will show a 2-column Pinterest-style masonry grid with compact cards, matching the Pinterest aesthetic the user wants.

