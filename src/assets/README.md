# Assets

Static assets including images, fonts, icons, and other media files.

## Structure

```
assets/
├── images/          # Image files (logos, illustrations, etc.)
├── icons/           # Icon files (SVG, PNG)
├── fonts/           # Custom font files
└── ...              # Other static assets
```

## Usage

### Importing Assets

```tsx
// Import images
import logo from '@/assets/images/logo.png';
import heroImage from '@/assets/images/hero.jpg';

function Header() {
  return <img src={logo} alt="Logo" />;
}
```

### Using in CSS

```css
.background {
  background-image: url('/src/assets/images/bg.jpg');
}
```

## File Organization

### Images
- **logos/** - Brand logos and variations
- **illustrations/** - Illustrations and graphics
- **photos/** - Photography and stock images
- **icons/** - Icon images (prefer SVG)

### Fonts
- Store custom font files (.woff, .woff2, .ttf)
- Include font licenses
- Define in CSS with @font-face

### Icons
- Prefer SVG for scalability
- Use icon libraries when possible (lucide-react, heroicons)
- Organize by category or feature

## Best Practices

### 1. Optimization
- **Compress images** - Use tools like ImageOptim, TinyPNG
- **Use appropriate formats**:
  - JPEG for photos
  - PNG for graphics with transparency
  - SVG for icons and logos
  - WebP for modern browsers
- **Lazy load** - Load images on demand
- **Responsive images** - Provide multiple sizes

### 2. Naming Conventions
```
// Good
logo-primary.svg
hero-background.jpg
icon-user-profile.svg

// Avoid
IMG_1234.jpg
untitled.png
new-file-final-v2.svg
```

### 3. File Size
- Keep images under 200KB when possible
- Use image optimization tools
- Consider CDN for large assets
- Implement progressive loading

### 4. Accessibility
- Always provide alt text
- Use descriptive file names
- Ensure sufficient contrast
- Provide text alternatives

### 5. Version Control
- Avoid committing large binary files when possible
- Use Git LFS for large assets
- Consider external asset hosting (CDN, S3)
- Keep assets organized and documented

## Image Optimization

### Build-time Optimization
```bash
# Install optimization tools
npm install -D vite-plugin-imagemin

# Configure in vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';

export default {
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      svgo: { plugins: [{ removeViewBox: false }] },
    }),
  ],
};
```

### Runtime Optimization
```tsx
// Lazy loading
<img src={image} alt="Description" loading="lazy" />

// Responsive images
<img
  src={imageMobile}
  srcSet={`${imageMobile} 480w, ${imageTablet} 768w, ${imageDesktop} 1200w`}
  sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
  alt="Description"
/>
```

## SVG Icons

Prefer inline SVG or icon libraries:

```tsx
// Using lucide-react
import { User, Settings, LogOut } from 'lucide-react';

<User className="h-4 w-4" />
<Settings className="h-5 w-5" />
<LogOut className="h-4 w-4" />
```

## External Assets

For assets hosted externally:

```tsx
// Use absolute URLs
<img src="https://cdn.example.com/image.jpg" alt="External image" />

// Or store URLs in config
const ASSET_CDN = 'https://cdn.example.com';
<img src={`${ASSET_CDN}/image.jpg`} alt="CDN image" />
```

## License Compliance

- Document licenses for all third-party assets
- Ensure commercial use is permitted
- Attribute when required
- Keep license files in the repository
