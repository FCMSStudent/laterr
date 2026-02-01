
# Gradient Background Update Plan

## Overview
Replace the current multi-radial gradient system with clean linear gradients that match the two reference images: a sky-blue-to-cream gradient for light/day mode, and a deep-navy-to-lavender gradient for dark/night mode.

## Reference Analysis

**Light Mode (Day) Gradient:**
- Top: Soft sky blue
- Middle: Light blue transitioning to cream
- Bottom: Warm cream/off-white

**Dark Mode (Night) Gradient:**
- Top: Deep navy/black
- Middle: Rich indigo/purple
- Bottom: Light lavender/periwinkle

---

## Implementation Steps

### Step 1: Update Theme Color Variables
**File: `src/styles/gradient.css`**

Update the `:root`, `.theme-day`, and `.theme-night` / `.dark` selectors with new color values extracted from the reference images:

**Day Theme Colors:**
```css
--c-accent: hsl(205, 55%, 72%);     /* Sky blue (top) */
--c-accent-2: hsl(210, 45%, 82%);   /* Light blue (middle) */
--c-accent-3: hsl(35, 45%, 94%);    /* Warm cream (bottom) */
--c-bg: hsl(35, 40%, 96%);          /* Cream base */
```

**Night Theme Colors:**
```css
--c-accent: hsl(245, 50%, 8%);      /* Deep navy (top) */
--c-accent-2: hsl(255, 45%, 28%);   /* Indigo purple (middle) */
--c-accent-3: hsl(260, 35%, 75%);   /* Light lavender (bottom) */
--c-bg: hsl(245, 50%, 8%);          /* Deep navy base */
```

### Step 2: Replace Radial Gradients with Linear Gradient
**File: `src/styles/gradient.css`**

Change the `.gradient-bg` background from complex radial gradients to a simple three-stop linear gradient that flows from top to bottom:

```css
background-image: linear-gradient(
  to bottom,
  var(--c-accent) 0%,
  var(--c-accent-2) 50%,
  var(--c-accent-3) 100%
);
```

### Step 3: Adjust Filter and Positioning
- Reduce blur from `80px` to something more subtle (`40px`) since we're using a clean linear gradient
- Remove the mask that fades the bottom (the gradient already handles the transition)
- Adjust `inset` values for proper coverage without over-extending

### Step 4: Update Dawn and Dusk Themes (Optional Refinement)
Keep intermediate themes (dawn/dusk) with adjusted colors that smoothly transition between the day and night palettes to maintain the time-of-day system.

---

## Technical Details

### Files Modified
1. `src/styles/gradient.css` - Main gradient CSS file

### Color Mapping Table

| Variable | Day Mode | Night Mode |
|----------|----------|------------|
| `--c-accent` | Sky Blue `hsl(205, 55%, 72%)` | Deep Navy `hsl(245, 50%, 8%)` |
| `--c-accent-2` | Light Blue `hsl(210, 45%, 82%)` | Indigo `hsl(255, 45%, 28%)` |
| `--c-accent-3` | Warm Cream `hsl(35, 45%, 94%)` | Lavender `hsl(260, 35%, 75%)` |
| `--c-bg` | Cream `hsl(35, 40%, 96%)` | Deep Navy `hsl(245, 50%, 8%)` |

### Transition Behavior
- Smooth 3-second transitions between themes remain intact
- The `@property` declarations allow CSS custom properties to animate
- DynamicBackground component will continue applying theme classes based on time of day

---

## Visual Result
- **Light Mode**: A serene, airy gradient reminiscent of a clear daytime sky fading into warm cream at the bottom
- **Dark Mode**: A dramatic night sky effect with deep navy at top transitioning through rich purple to a soft lavender glow at the bottom
