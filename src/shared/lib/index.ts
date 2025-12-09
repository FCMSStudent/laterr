/**
 * ⚠️ WARNING: Prefer direct imports over this barrel file in critical code paths.
 * 
 * Barrel files with wildcard exports (export *) can cause bundler initialization issues
 * and make it harder to tree-shake unused code.
 * 
 * RECOMMENDED for entry points and lazy-loaded components:
 *   ✅ import { cn } from '@/shared/lib/utils'
 *   ❌ import { cn } from '@/shared/lib'
 */
export * from './utils';
export * from './ui-utils';
export * from './supabase-utils';
export * from './error-utils';
export * from './error-messages';
