# Typography Design System

## Overview
This document defines the typography standards for the Laterr application, ensuring consistent and readable text across all components.

## Font Family
- **Primary Font**: Inter
- **Fallback Fonts**: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
- **Font Smoothing**: Antialiased for better rendering on screens

## Type Scale

### Display & Heading Sizes
| Class | Size | Line Height | Letter Spacing | Use Case | Mobile Size |
|-------|------|-------------|----------------|----------|-------------|
| `text-7xl` | 72px (4.5rem) | 1.1 | -0.03em | Hero headlines | N/A |
| `text-6xl` | 60px (3.75rem) | 1.1 | -0.03em | Page titles (h1) | 32px (2rem) |
| `text-5xl` | 48px (3rem) | 1.15 | -0.02em | Section headers (h2) | 28px (1.75rem) |
| `text-4xl` | 36px (2.25rem) | 2.5rem | -0.02em | Subsection headers (h3) | 24px (1.5rem) |
| `text-3xl` | 30px (1.875rem) | 2.25rem | -0.02em | Card headers (h4) | 24px (1.5rem) |
| `text-2xl` | 24px (1.5rem) | 2rem | -0.02em | Small headers (h5-h6) | 20px (1.25rem) |

### Body Text Sizes
| Class | Size | Line Height | Letter Spacing | Use Case |
|-------|------|-------------|----------------|----------|
| `text-xl` | 20px (1.25rem) | 1.75rem | -0.01em | Lead paragraphs |
| `text-lg` | 18px (1.125rem) | 1.75rem | 0em | Large body text |
| `text-base` | 16px (1rem) | 1.5rem | 0em | Standard body text |
| `text-sm` | 14px (0.875rem) | 1.25rem | 0em | Secondary text |
| `text-xs` | 12px (0.75rem) | 1rem | 0em | Labels, captions |

## Line Height Standards

### For Headings
- **Large Display (h1-h2)**: 1.1 - Tighter for impact
- **Standard Headings (h3-h6)**: 1.15-1.3 - Balanced for readability

### For Body Text
- **Standard Body**: 1.6 - Optimal for comfortable reading
- **Relaxed**: 1.75 - For longer content blocks
- **Compact**: 1.5 - For UI elements and tight layouts

Use the custom line-height utilities:
- `leading-heading` (1.15) - For display text
- `leading-subheading` (1.3) - For section headings
- `leading-body` (1.6) - For paragraphs
- `leading-relaxed` (1.75) - For comfortable reading

## Letter Spacing

### Headings
- **Large headings (h1-h3)**: -0.02em to -0.03em for visual tightness
- **Smaller headings (h4-h6)**: -0.02em for subtle refinement

### Body Text
- **Standard text**: 0em (default spacing)
- **Small text**: 0em (no adjustment needed)

All heading letter-spacing is automatically applied via CSS.

## Responsive Typography

Typography automatically scales down on mobile devices (≤640px) for better readability:

- **h1**: 60px → 32px
- **h2**: 48px → 28px
- **h3**: 36px → 24px

This ensures headings remain legible without overwhelming small screens.

## Maximum Line Length

For optimal readability, text blocks should be limited to 65-75 characters per line:

- `.prose` or `.prose-content`: 65 characters (ideal)
- `.prose-narrow`: 55 characters (for sidebars)
- `.prose-wide`: 75 characters (maximum)

### Usage Example
```tsx
<div className="prose mx-auto">
  <p>This paragraph will automatically limit to 65 characters per line...</p>
</div>
```

## Best Practices

### Do's ✅
- Use semantic HTML heading tags (h1-h6) with corresponding Tailwind classes
- Apply `prose` classes to long-form content for readability
- Use the defined type scale for consistency
- Let responsive typography handle mobile scaling automatically

### Don'ts ❌
- Don't skip heading levels (e.g., h1 → h3)
- Don't use multiple h1 tags on a single page
- Don't create custom font sizes outside the type scale
- Don't override letter-spacing on headings without good reason

## Examples

### Page Header
```tsx
<h1 className="text-6xl font-bold text-foreground mb-3 tracking-tight">
  Laterr
</h1>
<p className="text-lg text-muted-foreground">
  Your digital garden
</p>
```

### Section Header
```tsx
<h2 className="text-5xl font-bold text-foreground mb-6">
  Recent Items
</h2>
```

### Card Content
```tsx
<article className="prose">
  <h3 className="text-2xl font-bold mb-2">Card Title</h3>
  <p className="text-base text-muted-foreground leading-body">
    This is the card description with optimal line height...
  </p>
</article>
```

### Long-form Content
```tsx
<div className="prose mx-auto px-4">
  <h2>Article Title</h2>
  <p className="text-lg leading-relaxed">
    Introduction paragraph with comfortable spacing...
  </p>
  <p className="leading-body">
    Standard body paragraph with optimal readability...
  </p>
</div>
```

## Testing Checklist

When implementing typography:
- [ ] Verify heading hierarchy is semantic (h1 → h2 → h3)
- [ ] Check mobile rendering (headings should scale down)
- [ ] Ensure text blocks don't exceed 75 characters per line
- [ ] Confirm letter-spacing on headings looks refined
- [ ] Test readability with different content lengths
- [ ] Validate contrast ratios meet WCAG AA standards

## Related Files
- `tailwind.config.ts` - Type scale configuration
- `src/index.css` - Base typography styles and responsive rules
- `UI_UX_FEEDBACK.md` - Section 1.2 Typography recommendations
