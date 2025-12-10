/**
 * ⚠️ WARNING: Avoid using this barrel file in entry points (App.tsx, main.tsx) or lazy-loaded components.
 * 
 * Barrel files can cause "Cannot access before initialization" errors in production bundles
 * when the bundler creates circular initialization chains during code-splitting.
 * 
 * RECOMMENDED: Use direct imports instead:
 *   ✅ import { GradientBackground } from '@/shared/components/layout/GradientBackground'
 *   ❌ import { GradientBackground } from '@/shared/components'
 * 
 * This is especially critical for components imported in:
 * - Entry points (main.tsx, App.tsx)
 * - Lazy-loaded routes
 * - Components that are code-split by Vite
 */

// Layout components
export { BottomNav } from './layout/BottomNav';
export { MobileHeader } from './layout/MobileHeader';
export { Breadcrumbs } from './layout/Breadcrumbs';
export { GradientBackground } from './layout/GradientBackground';

// Feedback components
export { LoadingSpinner } from './feedback/LoadingSpinner';
