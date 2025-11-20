/**
 * SQLite database initialization using sql.js
 * This module handles database creation, schema setup, and persistence
 */

import initSqlJs, { Database } from 'sql.js';

const DB_NAME = 'laterr_db';
const DB_VERSION = 1;

let dbInstance: Database | null = null;

/**
 * Initialize the SQLite database
 * Loads existing database from IndexedDB or creates a new one
 */
export async function initDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Initialize sql.js
  const SQL = await initSqlJs({
    locateFile: file => `https://sql.js.org/dist/${file}`
  });

  // Try to load existing database from IndexedDB
  const savedDb = await loadDatabaseFromIndexedDB();
  
  if (savedDb) {
    dbInstance = new SQL.Database(savedDb);
  } else {
    dbInstance = new SQL.Database();
    await createSchema(dbInstance);
  }

  return dbInstance;
}

/**
 * Create the database schema
 */
async function createSchema(db: Database): Promise<void> {
  // Create users table for local authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#8B9A7F',
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create items table
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('url', 'note', 'image', 'document', 'file', 'video')),
      title TEXT NOT NULL,
      content TEXT,
      summary TEXT,
      tags TEXT, -- JSON array stored as string
      category_id TEXT,
      preview_image_url TEXT,
      user_notes TEXT,
      user_id TEXT NOT NULL,
      embedding TEXT, -- JSON array stored as string
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // Create tag_icons table
  db.run(`
    CREATE TABLE IF NOT EXISTS tag_icons (
      id TEXT PRIMARY KEY,
      tag_name TEXT NOT NULL UNIQUE,
      icon_url TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create sessions table for JWT token management
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_items_type ON items(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tag_icons_user_id ON tag_icons(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);

  // Save the initial schema
  await saveDatabaseToIndexedDB(db);
}

/**
 * Get the current database instance
 */
export function getDatabase(): Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

/**
 * Save database to IndexedDB for persistence
 */
export async function saveDatabaseToIndexedDB(db: Database = getDatabase()): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = db.export();
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['databases'], 'readwrite');
      const store = transaction.objectStore('databases');
      store.put({ id: 'main', data });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Load database from IndexedDB
 */
async function loadDatabaseFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('databases')) {
        resolve(null);
        return;
      }

      const transaction = db.transaction(['databases'], 'readonly');
      const store = transaction.objectStore('databases');
      const getRequest = store.get('main');

      getRequest.onsuccess = () => {
        const result = getRequest.result;
        resolve(result ? result.data : null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Clear the database (for testing/reset)
 */
export async function clearDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      dbInstance = null;
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
