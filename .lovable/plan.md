

# Fix: Video Preview External Link Button Alignment

## Problem
The external link button on the video thumbnail in the detail view appears mispositioned in the top-left corner instead of top-right, and is always visible instead of showing only on hover.

## Root Cause
The button at line 83-91 in `VideoPreview.tsx` is placed inside a `group cursor-pointer` div (line 54), but the button uses `absolute top-2 right-2`. The issue is that the button's parent (`div.relative.w-full.h-full.group`) is correct, but the button also has `opacity-0 group-hover:opacity-100` which may conflict with the detail view's always-visible state. Additionally, the `left` positioning from the `glass-light` class or button defaults may override `right-2`.

## Fix

**File: `src/features/bookmarks/components/VideoPreview.tsx`**

1. Move the external link button **outside** the play-state conditional (the `group` div) and place it directly inside the root `relative` container (line 44) so it always positions correctly relative to the video container
2. Change positioning to ensure `top-2 left-2` (matching the screenshot's intended corner) or keep `right-2` — based on the design, top-left with a subtle glass background is the standard pattern for action buttons on media cards
3. Remove `opacity-0 group-hover:opacity-100` so it's always visible in the detail view, matching the screenshot

Updated button (moved to line ~44, inside the root relative div, outside the conditional):
```tsx
<div className="relative w-full aspect-video bg-black overflow-hidden rounded-2xl">
  {/* External link button - always visible */}
  <Button
    variant="ghost"
    size="sm"
    onClick={handleOpenExternal}
    className="absolute top-2 left-2 glass-light hover:shadow-md text-foreground h-8 w-8 p-0 rounded-full z-10"
    aria-label="Open video in new tab"
  >
    <ExternalLink className="h-4 w-4" />
  </Button>

  {isPlaying && embedUrl ? (
    <iframe ... />
  ) : (
    <div className="relative w-full h-full group cursor-pointer" onClick={handlePlayClick}>
      {/* thumbnail + play button, no external link button here */}
    </div>
  )}
</div>
```

| File | Change |
|------|--------|
| `src/features/bookmarks/components/VideoPreview.tsx` | Move external link button outside conditional, fix position to top-left, always visible |

