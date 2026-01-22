# Styles

Global styles, CSS variables, and theme configuration.

## Files

- **Global CSS** - Application-wide styles
- **Theme variables** - CSS custom properties for theming
- **Utility classes** - Reusable CSS utilities
- **Animations** - Keyframe animations

## Global Styles

Located in `src/index.css` and `src/App.css`:

```css
/* index.css - Global styles and theme variables */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode variables */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 330 81% 60%;
    /* ... */
  }

  .dark {
    /* Dark mode variables */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... */
  }
}
```

## CSS Variables

### Color System

```css
:root {
  /* Base colors */
  --background: ...;
  --foreground: ...;
  
  /* Brand colors */
  --primary: ...;
  --secondary: ...;
  --accent: ...;
  
  /* Semantic colors */
  --destructive: ...;
  --success: ...;
  --warning: ...;
  
  /* UI colors */
  --muted: ...;
  --border: ...;
  --input: ...;
  --ring: ...;
}
```

### Typography

```css
:root {
  /* Font families */
  --font-sans: "Source Sans Pro", sans-serif;
  --font-serif: "Georgia", serif;
  --font-mono: "Fira Code", monospace;
  
  /* Font sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
}
```

### Spacing & Layout

```css
:root {
  /* Border radius */
  --radius: 1.5rem;
  --radius-sm: 0.75rem;
  --radius-lg: 2rem;
  
  /* Spacing */
  --spacing-unit: 0.25rem;
}
```

## Tailwind Configuration

Extend Tailwind with custom values in `tailwind.config.ts`:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        // ...
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
};
```

## Theme System

### Light & Dark Mode

The app uses CSS variables for theming:

```tsx
// Toggle theme
<html className="dark">
  {/* Dark mode active */}
</html>

<html className="light">
  {/* Light mode active */}
</html>
```

### Using Theme Colors

```tsx
// In Tailwind classes
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Primary Button
  </button>
</div>

// In custom CSS
.my-component {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

## Custom Utilities

### Utility Classes

```css
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### Component Classes

```css
@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-colors;
  }
  
  .card {
    @apply bg-card text-card-foreground rounded-lg border shadow-sm;
  }
}
```

## Animations

### CSS Animations

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}
```

### Tailwind Animations

Configure in `tailwind.config.ts`:

```typescript
export default {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
};
```

## Best Practices

### 1. Use CSS Variables
Prefer CSS variables over hardcoded values for consistency and theming.

### 2. Follow Naming Conventions
- Use semantic names (primary, destructive) not colors (red, blue)
- Use HSL format for colors: `hsl(var(--color))`
- Prefix custom properties with `--`

### 3. Leverage Tailwind
Use Tailwind utilities instead of custom CSS when possible.

### 4. Organize Styles
- Global styles in `index.css`
- Component-specific styles in component files
- Shared utilities in `@layer utilities`

### 5. Performance
- Minimize custom CSS
- Use Tailwind's purge feature
- Avoid deep nesting
- Use CSS containment when appropriate

## Responsive Design

Use Tailwind's responsive utilities:

```tsx
<div className="
  text-sm md:text-base lg:text-lg
  p-4 md:p-6 lg:p-8
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
">
  Responsive content
</div>
```

## Dark Mode

Implement dark mode with Tailwind:

```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Content adapts to theme
</div>
```
