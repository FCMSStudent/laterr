/**
 * Database client - replaces Supabase client
 * This provides a compatible interface with the old Supabase client
 */

import { database as baseDatabase } from '@/lib/database/client';
import { initDatabase } from '@/lib/database/init';

// Initialize database on module load
let dbInitPromise: Promise<any> | null = null;

function ensureDatabase() {
  if (!dbInitPromise) {
    dbInitPromise = initDatabase();
  }
  return dbInitPromise;
}

// Wrap the database client to ensure initialization before operations
const database = {
  from: (tableName: string) => {
    const builder = baseDatabase.from(tableName);
    // Wrap the then method to wait for initialization
    const originalThen = builder.then.bind(builder);
    builder.then = async function(onfulfilled) {
      await ensureDatabase();
      return originalThen(onfulfilled);
    };
    return builder;
  },
  auth: baseDatabase.auth,
  storage: baseDatabase.storage,
  functions: baseDatabase.functions,
  rpc: baseDatabase.rpc,
};

// Start initialization immediately
ensureDatabase();

// Export the database client as 'supabase' for compatibility
export const supabase = database;

// Re-export types for compatibility
export type { User, Session } from '@/lib/database/auth';
