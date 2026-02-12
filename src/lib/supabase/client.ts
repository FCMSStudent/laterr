import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

type RuntimeEnv = Record<string, string | undefined>;

const FALLBACK_SUPABASE_URL = 'http://127.0.0.1:54321';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';

const getRuntimeEnv = (): RuntimeEnv => {
  const viteEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as unknown as RuntimeEnv)
      : {};
  const processEnv =
    typeof process !== 'undefined' && process.env
      ? (process.env as RuntimeEnv)
      : {};

  return { ...processEnv, ...viteEnv };
};

const runtimeEnv = getRuntimeEnv();
const SUPABASE_URL = runtimeEnv.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
const isBrowser = typeof window !== 'undefined';
const isDev = runtimeEnv.DEV === 'true' || runtimeEnv.NODE_ENV === 'development';
const isTestRuntime = runtimeEnv.VITEST === 'true' || runtimeEnv.NODE_ENV === 'test';

// Validate Supabase configuration
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const errorMessage = '❌ Supabase configuration error:';
  const missingVars: string[] = [];
  
  if (!SUPABASE_URL) {
    missingVars.push('VITE_SUPABASE_URL');
  }
  if (!SUPABASE_PUBLISHABLE_KEY) {
    missingVars.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  
  console.error(errorMessage);
  console.error(`  Missing environment variables: ${missingVars.join(', ')}`);
  console.error('  Please check your .env file and ensure all required variables are set.');
  console.error('  See .env.example for reference.');
  
  // In browser development, throw an error to make the issue more visible.
  // Skip hard-fail in test/runtime tooling so unit tests can mock Supabase.
  if (isBrowser && isDev && !isTestRuntime) {
    throw new Error(
      `Supabase configuration incomplete. Missing: ${missingVars.join(', ')}. ` +
      'Please check your .env file.'
    );
  }
}

// Import the supabase client like this:
// import { supabase } from "@/lib/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL || FALLBACK_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: isBrowser ? window.localStorage : undefined,
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
    }
  }
);
