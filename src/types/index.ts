import { Database } from "@/integrations/supabase/types";

// Type aliases for database tables
export type Item = Database['public']['Tables']['items']['Row'];

// Custom types for user data from Supabase Auth
export interface UserData {
  id: string;
  email?: string;
}
