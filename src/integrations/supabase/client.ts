// This file is now a compatibility layer for the SQLite database client
// It re-exports the database client to maintain compatibility with existing code

export { supabase } from '@/integrations/database/client';
export type { User, Session } from '@/integrations/database/client';