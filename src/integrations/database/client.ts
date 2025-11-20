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
    
    // Create a proxy that wraps the then method
    return new Proxy(builder, {
      get(target, prop) {
        if (prop === 'then') {
          return async function(onfulfilled: any, onrejected: any) {
            await ensureDatabase();
            const originalThen = target.then.bind(target);
            return originalThen(onfulfilled, onrejected);
          };
        }
        return (target as any)[prop];
      }
    });
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
