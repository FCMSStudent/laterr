
# Bookmarks Dashboard Redesign Plan

## Overview
Redesign the bookmarks grid to match the reference UI - a clean Pinterest-style masonry layout with two distinct card styles: minimal note cards and full-bleed media cards with type badges.

## Key Design Changes

### 1. Card Variants

**Note Cards (type: 'note')**
- Clean white/muted background
- Text content preview fills the card
- Title and date at bottom with subtle border separator
- Arrow icon in bottom-right for navigation
- No type badge (cleaner look for notes)
- Minimal styling, no visible tags

**Media Cards (URLs, Images, Documents, Videos)**
- Full-bleed image/preview fills entire card
- Strong dark gradient overlay from bottom (for text readability)
- Colored type badge in top-left corner
- White title text overlaid at bottom
- Play button overlay for video content
- No visible tags on cards (cleaner aesthetic)

### 2. Type Badge Color System
Create a content-type color mapping:
- **Product/URL**: Pink (primary color - `bg-primary`)
- **Document**: Teal (`bg-teal-500`)
- **Video**: Teal (`bg-teal-500`)
- **Image**: Teal (`bg-teal-500`)

### 3. Layout Adjustments
- Keep the existing 4-column masonry layout
- Maintain dynamic aspect ratios per content type
- Ensure cards have consistent 20px border-radius

### 4. Simplification
- Remove visible tags from card face (can still filter by them)
- Remove summary text from media cards
- Focus on: image, type badge, title, date

---

## Technical Implementation

### Files to Modify

**1. `src/features/bookmarks/components/BookmarkCard.tsx`**
- Add badge color constants for different content types
- Update note card variant:
  - Remove border styling, use cleaner `bg-card` or `bg-muted/5`
  - Ensure text preview is prominent
  - Keep bottom section with title + arrow icon
- Update media card variant:
  - Strengthen gradient overlay for better text contrast
  - Update badge colors based on content type
  - Remove date from bottom (keep title only, or add subtle date)
  - Hide tags completely from card display
- Add `getTypeBadgeColor()` helper function

**2. `src/features/bookmarks/components/ItemCardSkeleton.tsx`**
- Update skeleton to match new simpler card structure
- Remove tag skeleton placeholders

### Code Changes Detail

```text
BookmarkCard.tsx changes:
1. Add BADGE_COLORS constant:
   - url: 'bg-primary' (pink)
   - document: 'bg-teal-500' 
   - video: 'bg-teal-500'
   - image: 'bg-teal-500'

2. Note card updates:
   - Background: bg-card (white/dark based on theme)
   - Remove border or make very subtle
   - Content: summary/title preview text
   - Bottom: title + arrow icon
   - Remove tags display

3. Media card updates:
   - Stronger gradient: from-black/80 via-black/40
   - Badge uses getTypeBadgeColor() 
   - Remove tags section
   - Keep: badge, title, optional date
```

### Skeleton Updates
- Simpler structure matching new card design
- Remove tag placeholder rows

---

## Visual Result
- Cleaner, more focused card design
- Strong visual hierarchy with type badges
- Consistent Pinterest/Raindrop.io aesthetic
- Better readability with stronger gradients
- Reduced visual noise by hiding tags on cards
