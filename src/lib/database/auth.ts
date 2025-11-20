/**
 * Local authentication service
 * Replaces Supabase authentication with local JWT-based auth
 */

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { getDatabase, saveDatabaseToIndexedDB } from './init';

// JWT secret (in production, this should be from env or generated per user)
const JWT_SECRET = new TextEncoder().encode('laterr-local-secret-key-change-in-production');
const TOKEN_EXPIRY = '7d'; // 7 days

export interface User {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  user: User;
  token: string;
  expires_at: string;
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
  try {
    const db = getDatabase();
    
    // Check if user already exists
    const existingUser = db.exec(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existingUser.length > 0 && existingUser[0].values.length > 0) {
      return { user: null, error: new Error('User already exists') };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user ID
    const userId = generateUUID();
    const now = new Date().toISOString();

    // Insert user
    db.run(
      `INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [userId, email, passwordHash, now, now]
    );

    await saveDatabaseToIndexedDB(db);

    const user: User = {
      id: userId,
      email,
      created_at: now,
      updated_at: now
    };

    return { user, error: null };
  } catch (error) {
    return { user: null, error: error as Error };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email: string, password: string): Promise<{ session: Session | null; error: Error | null }> {
  try {
    const db = getDatabase();
    
    // Find user
    const result = db.exec(`SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = ?`, [email]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return { session: null, error: new Error('Invalid email or password') };
    }

    const row = result[0].values[0];
    const userId = row[0] as string;
    const userEmail = row[1] as string;
    const passwordHash = row[2] as string;
    const createdAt = row[3] as string;
    const updatedAt = row[4] as string;

    // Verify password
    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      return { session: null, error: new Error('Invalid email or password') };
    }

    const user: User = {
      id: userId,
      email: userEmail,
      created_at: createdAt,
      updated_at: updatedAt
    };

    // Create JWT token
    const token = await new SignJWT({ userId, email: userEmail })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Store session
    const sessionId = generateUUID();
    db.run(
      `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
      [sessionId, userId, token, expiresAt]
    );

    await saveDatabaseToIndexedDB(db);

    // Store session in localStorage
    localStorage.setItem('laterr_session', JSON.stringify({ user, token, expires_at: expiresAt }));

    return { session: { user, token, expires_at: expiresAt }, error: null };
  } catch (error) {
    return { session: null, error: error as Error };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const session = getSession();
    if (session) {
      const db = getDatabase();
      // Remove session from database
      db.run(`DELETE FROM sessions WHERE token = ?`, [session.token]);
      await saveDatabaseToIndexedDB(db);
    }

    // Remove from localStorage
    localStorage.removeItem('laterr_session');
    
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get current session from localStorage
 */
export function getSession(): Session | null {
  try {
    const sessionStr = localStorage.getItem('laterr_session');
    if (!sessionStr) return null;

    const session = JSON.parse(sessionStr) as Session;
    
    // Check if token is expired
    if (new Date(session.expires_at) < new Date()) {
      localStorage.removeItem('laterr_session');
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Get current user
 */
export async function getUser(): Promise<{ user: User | null; error: Error | null }> {
  try {
    const session = getSession();
    if (!session) {
      return { user: null, error: new Error('Not authenticated') };
    }

    // Verify token
    try {
      await jwtVerify(session.token, JWT_SECRET);
    } catch {
      localStorage.removeItem('laterr_session');
      return { user: null, error: new Error('Invalid token') };
    }

    return { user: session.user, error: null };
  } catch (error) {
    return { user: null, error: error as Error };
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void): { unsubscribe: () => void } {
  // Check current session
  const currentSession = getSession();
  setTimeout(() => callback('INITIAL_SESSION', currentSession), 0);

  // Listen for storage events (cross-tab sync)
  const handler = (e: StorageEvent) => {
    if (e.key === 'laterr_session') {
      const session = e.newValue ? JSON.parse(e.newValue) : null;
      callback(e.newValue ? 'SIGNED_IN' : 'SIGNED_OUT', session);
    }
  };

  window.addEventListener('storage', handler);

  return {
    unsubscribe: () => window.removeEventListener('storage', handler)
  };
}

/**
 * Generate UUID (simple version for browser)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
