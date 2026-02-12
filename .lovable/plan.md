
# Smooth Blending Overlay

## Problem
The frosted glass panel currently has a hard `backdrop-blur-xl` edge where it meets the image above. The gradient and blur don't taper off, creating a visible boundary rather than a seamless blend.

## Solution
Replace the single frosted-glass div with a two-layer approach:

1. **Gradient-only layer (upper transition zone)** -- A tall, transparent-to-colored gradient with NO blur that feathers the color upward smoothly.
2. **Frosted glass layer (lower text area)** -- A shorter panel with backdrop-blur that holds the text, using a mask-image to fade the blur effect at its top edge so it doesn't cut off abruptly.

## Technical Details

**File:** `src/features/bookmarks/components/BookmarkCard.tsx` (lines 429-493)

### Change 1: Refine the full-card gradient overlay (lines 429-439)
Extend the gradient with more stops and a gentler curve so the color blends further up:

```
background: dominantColor
  ? linear-gradient(to top,
      dominantColor@0.95 0%,
      dominantColor@0.80 12%,
      dominantColor@0.50 28%,
      dominantColor@0.20 42%,
      dominantColor@0.08 55%,
      transparent 68%)
  : linear-gradient(to top,
      rgba(0,0,0,0.90) 0%,
      rgba(0,0,0,0.60) 15%,
      rgba(0,0,0,0.30) 35%,
      rgba(0,0,0,0.08) 52%,
      transparent 68%)
```

### Change 2: Frosted glass panel with mask-faded blur (lines 449-493)
- Reduce `backdrop-blur-xl` to `backdrop-blur-md` for a subtler frosted effect.
- Apply a CSS `mask-image: linear-gradient(to top, black 60%, transparent 100%)` on the blur panel so the blur itself fades out toward the top, preventing a hard edge.
- Make the inner background gradient lighter/more transparent so it works as a supplement to the main overlay rather than a second opaque layer.

```
<div className="absolute bottom-0 left-0 right-0 z-40">
  <div
    className="px-5 pb-5 pt-6 backdrop-blur-md space-y-2"
    style={{
      background: dominantColor
        ? linear-gradient(to top,
            dominantColor@0.40 0%,
            dominantColor@0.10 70%,
            transparent 100%)
        : linear-gradient(to top,
            rgba(0,0,0,0.25) 0%,
            rgba(0,0,0,0.05) 70%,
            transparent 100%),
      maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
    }}
  >
    {/* ...existing text content unchanged... */}
  </div>
</div>
```

The result is a seamless upward blend: the color gradient feathers gently, and the blur itself tapers from full strength at the bottom to invisible where it meets the clean image.
