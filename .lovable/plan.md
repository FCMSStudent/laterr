

# Fix: Bookmark Card Text Hidden Behind Image

## Problem
The text overlay on bookmark cards is invisible because of incorrect z-index stacking:
- Image: `z-20`
- Gradient overlay: `z-30`
- Text overlay: `z-10` (behind both the image and gradient)

The text content (category label, title, summary) renders below the image layer and is completely hidden.

## Solution
Update the z-index of the text overlay from `z-10` to `z-40` so it renders above both the image and the gradient.

## Technical Details

**File:** `src/features/bookmarks/components/BookmarkCard.tsx`

**Change (line 449):**
- From: `className="absolute bottom-0 left-0 right-0 p-5 z-10 space-y-1.5"`
- To: `className="absolute bottom-0 left-0 right-0 p-5 z-40 space-y-1.5"`

This single class change restores the correct stacking order:
1. Base tint / fallback background (no z-index)
2. Image (`z-20`)
3. Gradient overlay (`z-30`)
4. Text content (`z-40`) -- now on top

