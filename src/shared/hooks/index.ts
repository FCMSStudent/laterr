/**
 * ⚠️ WARNING: Prefer direct imports over this barrel file in critical code paths.
 * 
 * Barrel files with wildcard exports (export *) can cause bundler initialization issues
 * and make it harder to tree-shake unused code.
 * 
 * RECOMMENDED for entry points and lazy-loaded components:
 *   ✅ import { useToast } from '@/shared/hooks/use-toast'
 *   ❌ import { useToast } from '@/shared/hooks'
 */
export * from './use-mobile';
export * from './use-toast';
export * from './use-form-field';
export * from './useGlassIntensity';
export * from './useRipple';
export * from './useDebounce';
