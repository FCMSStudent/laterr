

# Fix: Tag Input Styling in Detail Panel

## Problem

The "Tag name" input field in the card detail panel has a dark `glass-input` background with low-contrast text, making it nearly unreadable against the blurred backdrop (visible in screenshot).

## Change

**File:** `src/features/bookmarks/components/CardDetailRightPanel.tsx`

Update the tag input wrapper (line 240) and edit-tag input wrapper (line 219) to use a lighter, more readable style:

- Replace `glass-input border border-primary` with `bg-secondary/60 border border-border/50` on both the add-tag and edit-tag input wrappers
- Ensure `placeholder:text-muted-foreground` has sufficient contrast

This matches the existing tag badge styling (`bg-secondary/60`) so the input looks like a tag being created inline, rather than a dark floating pill.

