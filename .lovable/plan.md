

# Fix: Product Cards Showing "ITEM" Instead of "Wishlist"

## Root Cause

The "ITEM" badge appears because of a tag mismatch between the backend and frontend:

1. **Backend** (`analyze-url`): Correctly detects products and sets `tag: "wishlist"`, but the AI also returns a `tags` array with descriptive tags like `["beauty-of-joseon", "sunscreen", "spf50+"]` -- without "wishlist" in it.

2. **Frontend** (`AddItemModal`): On line 196, saves `data.tags || [data.tag]`. Since `data.tags` is truthy (has descriptive tags), `data.tag` ("wishlist") is never used. So the saved item has tags like `["beauty-of-joseon", "sunscreen"]` but no "wishlist".

3. **Card display** (`BookmarkCard`): The badge logic checks tags for "wishlist", "read later", or "watch later". None match, so it falls through to the default: "Item".

## Changes

### 1. Ensure "wishlist" tag is always included for products
**File:** `src/features/bookmarks/components/AddItemModal.tsx`

When saving a URL item, if `data.tag` is "wishlist" (or "watch later"), prepend it to the `data.tags` array so the category tag is always present alongside descriptive tags.

```
// Before:
tags: data.tags || (data.tag ? [data.tag] : [...DEFAULT_ITEM_TAGS])

// After: always include the primary category tag
const primaryTag = data.tag || DEFAULT_ITEM_TAG;
const descriptiveTags = data.tags || [...DEFAULT_ITEM_TAGS];
const finalTags = descriptiveTags.includes(primaryTag) 
  ? descriptiveTags 
  : [primaryTag, ...descriptiveTags];
// then use finalTags
```

### 2. Fix the same issue for embeddings
**File:** `src/features/bookmarks/components/AddItemModal.tsx`

Apply the same logic on line 155 where embedding tags are computed, so embeddings also reflect the correct category.

### 3. Add "url" fallback to BookmarkCard type badges
**File:** `src/features/bookmarks/components/BookmarkCard.tsx`

Add a `url` entry to `TYPE_FALLBACK_BADGES` so that even if a URL item has no category tag at all, it shows "Read Later" (or "Link") instead of the generic "Item".

```typescript
url: {
  label: 'Read Later',
  icon: BookOpen,
  color: 'bg-amber-500/80 text-white'
}
```

## Result

- Product URLs will always have "wishlist" in their tags, so cards show the green "Wishlist" badge
- Regular URLs without special tags show "Read Later" instead of "Item"
- Existing items with the wrong tags can be fixed by re-saving or editing them
