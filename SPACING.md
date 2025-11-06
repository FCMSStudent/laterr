# Spacing & Layout Guidelines

## Overview
This document defines the spacing scale and layout conventions for the Laterr application. All spacing should follow these guidelines to maintain visual consistency across the application.

## Base Unit
The spacing system uses a **4px base unit** (0.25rem). All spacing values should be multiples of this base unit.

## Spacing Scale

### Tailwind Spacing Classes
Our spacing scale follows Tailwind's default spacing with specific usage guidelines:

| Class | Value | rem | Pixels | Usage |
|-------|-------|-----|--------|-------|
| `gap-1` / `p-1` / `m-1` | 0.25rem | 0.25rem | 4px | Minimal spacing (tight layouts) |
| `gap-2` / `p-2` / `m-2` | 0.5rem | 0.5rem | 8px | Very tight spacing |
| `gap-3` / `p-3` / `m-3` | 0.75rem | 0.75rem | 12px | Tight spacing |
| `gap-4` / `p-4` / `m-4` | 1rem | 1rem | 16px | **Standard spacing** (recommended default) |
| `gap-5` / `p-5` / `m-5` | 1.25rem | 1.25rem | 20px | Comfortable spacing |
| `gap-6` / `p-6` / `m-6` | 1.5rem | 1.5rem | 24px | **Card/component internal spacing** |
| `p-7` / `m-7` | 1.75rem | 1.75rem | 28px | **Enhanced card padding** (for less cramped feel) |
| `gap-8` / `p-8` / `m-8` | 2rem | 2rem | 32px | Section spacing |
| `gap-10` / `p-10` / `m-10` | 2.5rem | 2.5rem | 40px | Large section spacing |
| `gap-12` / `p-12` / `m-12` | 3rem | 3rem | 48px | Extra large section spacing |
| `gap-16` / `p-16` / `m-16` | 4rem | 4rem | 64px | Major section dividers |

## Usage Guidelines

### Grid Layouts
- **Card Grids**: Use `gap-6` (24px) for optimal card spacing
- **Tag/Badge Lists**: Use `gap-3` (12px) for compact horizontal layouts
- **Form Fields**: Use `gap-4` (16px) for vertical field spacing
- **Button Groups**: Use `gap-3` (12px) for related actions

**Standardized Grid Gaps:**
```tsx
// ✅ Recommended
<div className="grid grid-cols-3 gap-6">  {/* Card grids */}
<div className="flex flex-wrap gap-3">     {/* Tags, badges */}
<div className="flex gap-4">                {/* Button groups */}

// ❌ Avoid mixing
<div className="grid gap-5">  {/* Non-standard, use gap-4 or gap-6 */}
```

### Component Internal Spacing

#### Cards (ItemCard, DetailViewModal, etc.)
- **Outer padding**: `p-6` (24px) or `p-7` (28px) for enhanced breathing room
- **Internal spacing**: `space-y-4` (16px) between content blocks
- **Image margins**: `mb-5` (20px) or `mb-6` (24px) below preview images

```tsx
// ✅ ItemCard spacing
<div className="glass-card rounded-2xl p-7">
  {previewImage && <div className="mb-6">...</div>}
  <div className="space-y-4">
    <div>Title</div>
    <div>Summary</div>
    <div className="flex gap-2">Tags</div>
  </div>
</div>
```

#### Modals
- **Content padding**: `p-8` (32px) for breathing room
- **Section spacing**: `space-y-6` (24px) between major sections
- **Footer spacing**: `mt-8` (32px) before action buttons

### Page Layout Spacing

#### Sections
- **Between header and search**: `mb-12` (48px)
- **Between search and filters**: `mb-10` (40px)
- **Between filters and content**: `mb-12` (48px)
- **Bottom padding**: `pb-12` (48px) for footer breathing room

```tsx
// ✅ Index page sections
<header className="mb-12">Header</header>
<div className="mb-10">Search</div>
<nav className="mb-12">Filters</nav>
<main>Content</main>
```

#### Container Padding
- **Mobile** (< 640px): `px-4` (16px)
- **Tablet** (640px - 1024px): `px-6` (24px)
- **Desktop** (> 1024px): `px-8` (32px)

```tsx
<div className="px-4 sm:px-6 lg:px-8">
  {/* Responsive container */}
</div>
```

### Vertical Rhythm

Maintain consistent vertical spacing to create visual rhythm:

1. **Page sections**: Use `mb-10` or `mb-12` (40-48px)
2. **Component groups**: Use `mb-8` (32px)
3. **Related elements**: Use `mb-4` or `mb-6` (16-24px)
4. **Tight groups**: Use `mb-2` or `mb-3` (8-12px)

### Typography Spacing

- **Heading bottom margin**: `mb-3` or `mb-4` (12-16px)
- **Paragraph spacing**: `space-y-4` (16px)
- **List item spacing**: `space-y-2` (8px)
- **Caption/helper text**: `mt-2` (8px) below related input

## Container Queries

For responsive components that need to adapt based on their container size (not viewport), use container queries:

```tsx
// Setup container
<div className="@container">
  <div className="@md:grid @md:grid-cols-2">
    {/* Responsive grid based on container width */}
  </div>
</div>
```

This is particularly useful for:
- Modal content that needs to adapt to dialog size
- Card layouts within different container widths
- Sidebar components

## Best Practices

### Do's ✅
- Use multiples of 4px (Tailwind's spacing scale)
- Be consistent within similar components
- Use `gap-6` for card grids
- Use `gap-3` for tag/badge lists
- Add generous spacing between major sections (`mb-10`, `mb-12`)
- Use `space-y-*` utilities for vertical stacks
- Document deviations from these guidelines

### Don'ts ❌
- Avoid arbitrary values like `gap-[18px]` unless absolutely necessary
- Don't mix `gap-4` and `gap-5` in similar contexts
- Don't use `gap-2` for card grids (too cramped)
- Don't forget mobile padding (`px-4`)
- Avoid negative margins except for intentional overlaps

## Examples

### Card Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
  {items.map(item => <ItemCard key={item.id} {...item} />)}
</div>
```

### Section Spacing
```tsx
<div className="space-y-12">
  <section className="mb-12">
    <h2 className="mb-4">Section Title</h2>
    <div className="space-y-4">
      {/* Content */}
    </div>
  </section>
  <section>
    {/* Next section */}
  </section>
</div>
```

### Card Internal Spacing
```tsx
<div className="glass-card p-6">
  <div className="space-y-4">
    <div className="flex items-start gap-3">
      <Icon />
      <h3>Title</h3>
    </div>
    <p>Description</p>
    <div className="flex flex-wrap gap-2 pt-2">
      {/* Tags */}
    </div>
  </div>
</div>
```

## Reference

- Based on Tailwind CSS spacing scale: https://tailwindcss.com/docs/customizing-spacing
- 4px base unit provides flexibility while maintaining consistency
- All measurements are in rem for better accessibility and scaling
