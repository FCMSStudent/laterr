
# Detail View Modal Redesign Plan

## Overview
Redesign the DetailViewModal to match the reference UI - a clean, modern modal with a large image preview on the left and a well-organized details panel on the right with pink-accented section labels.

## Current State Analysis
The existing `CardDetailRightPanel.tsx` has the right structure but uses:
- Gray/muted section labels (Summary, Tags)
- Different visual hierarchy 
- Different button styling

The reference shows:
- Pink/primary colored section labels ("TL;DR", "Tags")
- Cleaner spacing and visual hierarchy
- Centered "Delete" button with icon

## Key Design Changes

### 1. Section Labels
Change from gray muted labels to pink/primary accent:
- "Summary" → "TL;DR" (with pink text)
- "Tags" label in pink

### 2. Visual Styling
- Section labels: `text-primary` (pink) instead of `text-muted-foreground`
- Larger, bolder title at top
- More generous spacing between sections
- Remove some visual clutter

### 3. Action Buttons
Keep "Visit" and "Copy" side-by-side but style to match reference:
- Light background/ghost style with icons
- Centered alignment in their row

### 4. Tags Section
- Pink "Tags" label
- Tag pills with rounded style
- "+ Add" button inline with tags

### 5. Delete Button
- Centered at bottom of panel
- Pink/destructive text with trash icon
- Clean, minimal styling

### 6. Preview Container (Left)
- Ensure the image has proper rounded corners
- Light gray background for the container
- Proper aspect ratio handling

---

## Technical Implementation

### Files to Modify

**1. `src/features/bookmarks/components/CardDetailRightPanel.tsx`**
Main changes:
- Update section label classes from `text-muted-foreground/70` to `text-primary`
- Change "Summary" text to "TL;DR"
- Adjust spacing and padding for cleaner look
- Update delete button styling to be centered with pink text
- Keep the existing functionality (tags, notes, etc.)

**2. `src/features/bookmarks/components/DetailViewModal.tsx`**
Minor changes:
- Adjust preview container styling for proper rounded corners
- Ensure consistent background color on preview area
- Review grid gap and padding

### Detailed Code Changes

**CardDetailRightPanel.tsx**

```text
1. Section labels:
   - Change `text-muted-foreground/70` → `text-primary font-semibold`
   - Change "Summary" → "TL;DR"

2. Title section:
   - Increase font size slightly
   - Adjust padding/margin

3. Tags label:
   - Use `text-primary` for pink color
   - Keep "Tags" label

4. Delete button:
   - Center in footer section
   - Use `text-destructive` or `text-primary` styling
   - Icon + "Delete" text
```

**DetailViewModal.tsx**

```text
1. Preview container:
   - Add rounded-2xl or rounded-3xl
   - Use bg-muted/20 or bg-secondary for light gray background
   
2. Grid layout:
   - Keep existing 1.4fr_1fr split
   - Review gap spacing
```

---

## Visual Result
- Cleaner, more modern detail view
- Pink accent color for section labels creates visual hierarchy
- Better readability with "TL;DR" instead of "Summary"
- Consistent with the reference design aesthetic
- Maintains all existing functionality (edit tags, notes, delete, etc.)
