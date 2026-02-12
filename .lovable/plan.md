
# Bookmark Card Overlay Fix — Completed

## Problem
Light dominant colors (beige, light grey, pinkish-white) extracted from thumbnails were used directly in gradient overlays, making white text unreadable. Non-image cards also had light fallback backgrounds.

## Solution Applied
1. Added `ensureDark()` helper that clamps perceived brightness to ≤80/255, preserving hue but ensuring dark enough gradients for white text contrast.
2. All gradient overlays now use the darkened color automatically.
3. Non-image card fallbacks switched from light `muted` background to a dark gradient.
