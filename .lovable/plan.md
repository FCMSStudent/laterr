

# Bookmark Card Preview Polish — Three Fixes

## P1: Text Contrast on Light Thumbnails

The `ensureDark()` helper (line 157) currently caps perceived brightness at 80/255. For pastel or near-white thumbnails, 80 is still too bright when combined with semi-transparent gradient stops (e.g., 0.50 at 28%). Two changes:

1. **Lower the brightness cap from 80 to 55** in `ensureDark()` — this produces a noticeably darker base that holds contrast even at reduced opacity stops.
2. **Add a subtle text shadow** to the title and summary text as an additional safety net, ensuring legibility even on edge-case gradients.

**File:** `BookmarkCard.tsx`
- Line 164: change `brightness > 80` to `brightness > 55`
- Line 166: change `80 / brightness` to `55 / brightness`
- Line 495: add `text-shadow: 0 1px 4px rgba(0,0,0,0.5)` style to title
- Line 501: add same text shadow to summary

---

## P2: Aggressive Preview Cropping

Documents and landscape thumbnails get heavily cropped by `object-cover`. Fix: switch to `object-contain` for document/file types so the full page is visible, with a dark background fill behind it.

**File:** `BookmarkCard.tsx`
- Line 441: conditionally use `object-contain` for document/file types, keep `object-cover` for images/videos/URLs
- Add a dark background to the image container so `object-contain` letterboxing looks intentional

```
className={cn(
  "absolute inset-0 w-full h-full z-20",
  imageLoaded ? "opacity-100" : "opacity-0",
  (type === 'document' || type === 'file') ? "object-contain" : "object-cover"
)}
```

- Add a background to the AspectRatio or its parent for document types:
```
style={{
  backgroundColor: (type === 'document' || type === 'file')
    ? (dominantColor ? toRgba(dominantColor, 0.15) : 'hsl(220 15% 12%)')
    : undefined
}}
```

---

## P3: Raw Markdown in Note Cards

Note cards currently render `summary || title` as plain text (line 348), showing raw checklist syntax. Fix: use the existing `NotePreview` component (already built at `src/features/bookmarks/components/NotePreview.tsx`) instead of the plain `<p>` tag.

**File:** `BookmarkCard.tsx`
- Import `NotePreview` at the top
- Replace lines 347-351 (the plain text paragraph) with:

```tsx
<div className="flex-1 overflow-hidden">
  {content ? (
    <NotePreview
      content={content}
      maxLines={6}
      variant="compact"
      showProgress={true}
      className="p-0"
    />
  ) : (
    <p className="text-foreground/80 text-sm leading-relaxed line-clamp-10">
      {summary || title}
    </p>
  )}
</div>
```

This renders checklists with proper check/uncheck icons, headings with bold styling, and bullets with dots — matching the polished look of media cards.

---

## Summary of File Changes

All changes are in `src/features/bookmarks/components/BookmarkCard.tsx`:
- Tighten `ensureDark` brightness threshold (2 lines)
- Add text shadows to title and summary (2 lines)
- Conditional `object-contain` for documents (1 line change + 1 style addition)
- Swap plain text for `NotePreview` in note cards (1 import + ~10 lines)

