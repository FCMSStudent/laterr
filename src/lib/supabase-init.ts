// Safe wrapper for Supabase client with validation
// This file exists because src/integrations/supabase/client.ts is auto-generated
// and should not contain custom validation logic

import { supabase } from "@/integrations/supabase/client";

// Re-export the validated client
export { supabase };

// Export a helper to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key);
};
