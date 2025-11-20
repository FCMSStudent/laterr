/**
 * Database client - replaces Supabase client
 * This provides a compatible interface with the old Supabase client
 */

import { database } from '@/lib/database/client';
import { initDatabase } from '@/lib/database/init';

// Initialize database on module load
let dbInitPromise: Promise<any> | null = null;

function ensureDatabase() {
  if (!dbInitPromise) {
    dbInitPromise = initDatabase();
  }
  return dbInitPromise;
}

// Ensure database is initialized before any operations
ensureDatabase();

// Export the database client as 'supabase' for compatibility
export const supabase = database;

// Re-export types for compatibility
export type { User, Session } from '@/lib/database/auth';
