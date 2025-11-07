# Button Guidelines

## Button Sizes

### When to use each size:

- **default (h-10)**: Standard button size for most use cases
  - Form submissions in compact layouts
  - Toolbar actions
  - Secondary actions in dialogs
  - Default choice for most buttons

- **sm (h-9)**: Smaller buttons for dense interfaces
  - Table row actions
  - Inline editing controls
  - Tag controls and chips
  - Compact toolbars

- **lg (h-11)**: Larger buttons for emphasis
  - Primary call-to-action buttons
  - Modal submit buttons
  - Hero section actions
  - Important form submissions
  - Mobile-first designs (better touch targets)

- **icon (h-10 w-10)**: Square buttons for icon-only actions
  - Close/dismiss buttons
  - Delete/edit actions
  - Toolbar icon buttons
  - Navigation controls

## Touch Target Guidelines

All interactive elements should meet the **44x44px minimum** touch target size on mobile devices:
- Use `size="lg"` (h-11/h-12) for primary buttons on mobile
- Icon buttons are 40x40px by default, consider using `h-11 w-11` on mobile
- Add adequate padding around clickable elements
- Use responsive classes: `h-10 sm:h-11` for size adjustments

## Loading States

Always use the LoadingButton component for actions that trigger async operations:
- Automatically disables during loading
- Shows spinner icon
- Prevents double-clicks
- Provides consistent loading UX

## Focus States

All buttons have visible focus indicators by default:
- `focus-visible:ring-2` creates a focus ring
- `focus-visible:ring-ring` uses the theme ring color
- `focus-visible:ring-offset-2` adds spacing around the ring
- Never remove focus states for accessibility

## Icon Sizing

Icons in buttons should consistently use:
- **w-4 h-4** (16px): Standard size for all button icons
- Applied automatically via `[&_svg]:size-4` in buttonVariants
- Ensures visual consistency across the application

## Ripple Effects

Buttons support Material-style ripple feedback on click:
- Automatically applied via the Button component
- Provides tactile feedback for user interactions
- Enhances perceived responsiveness
