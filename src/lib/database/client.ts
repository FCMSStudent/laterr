/**
 * SQLite database client that mimics Supabase API
 * Provides a drop-in replacement for Supabase client operations
 */

import { getDatabase, saveDatabaseToIndexedDB } from './init';
import * as auth from './auth';
import type { User, Session } from './auth';

export interface PostgrestError {
  message: string;
  code?: string;
  details?: string;
}

export interface PostgrestResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

export interface PostgrestBuilder<T> {
  select(columns?: string): PostgrestBuilder<T>;
  insert(data: Partial<T> | Partial<T>[]): PostgrestBuilder<T>;
  update(data: Partial<T>): PostgrestBuilder<T>;
  delete(): PostgrestBuilder<T>;
  eq(column: string, value: any): PostgrestBuilder<T>;
  neq(column: string, value: any): PostgrestBuilder<T>;
  gt(column: string, value: any): PostgrestBuilder<T>;
  gte(column: string, value: any): PostgrestBuilder<T>;
  lt(column: string, value: any): PostgrestBuilder<T>;
  lte(column: string, value: any): PostgrestBuilder<T>;
  like(column: string, value: string): PostgrestBuilder<T>;
  ilike(column: string, value: string): PostgrestBuilder<T>;
  is(column: string, value: any): PostgrestBuilder<T>;
  in(column: string, values: any[]): PostgrestBuilder<T>;
  contains(column: string, value: any): PostgrestBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): PostgrestBuilder<T>;
  limit(count: number): PostgrestBuilder<T>;
  single(): PostgrestBuilder<T>;
  maybeSingle(): PostgrestBuilder<T>;
  then<TResult>(onfulfilled?: ((value: PostgrestResponse<T>) => TResult | PromiseLike<TResult>) | null): Promise<TResult>;
}

class QueryBuilder<T> implements PostgrestBuilder<T> {
  private tableName: string;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectColumns: string = '*';
  private whereConditions: Array<{ column: string; operator: string; value: any }> = [];
  private orderByClause: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private insertData: Partial<T> | Partial<T>[] | null = null;
  private updateData: Partial<T> | null = null;
  private singleRow: boolean = false;
  private maybeSingleRow: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*'): this {
    this.operation = 'select';
    this.selectColumns = columns;
    return this;
  }

  insert(data: Partial<T> | Partial<T>[]): this {
    this.operation = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: Partial<T>): this {
    this.operation = 'update';
    this.updateData = data;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any): this {
    this.whereConditions.push({ column, operator: '=', value });
    return this;
  }

  neq(column: string, value: any): this {
    this.whereConditions.push({ column, operator: '!=', value });
    return this;
  }

  gt(column: string, value: any): this {
    this.whereConditions.push({ column, operator: '>', value });
    return this;
  }

  gte(column: string, value: any): this {
    this.whereConditions.push({ column, operator: '>=', value });
    return this;
  }

  lt(column: string, value: any): this {
    this.whereConditions.push({ column, operator: '<', value });
    return this;
  }

  lte(column: string, value: any): this {
    this.whereConditions.push({ column, operator: '<=', value });
    return this;
  }

  like(column: string, value: string): this {
    this.whereConditions.push({ column, operator: 'LIKE', value });
    return this;
  }

  ilike(column: string, value: string): this {
    // SQLite LIKE is case-insensitive by default
    this.whereConditions.push({ column, operator: 'LIKE', value });
    return this;
  }

  is(column: string, value: any): this {
    if (value === null) {
      this.whereConditions.push({ column, operator: 'IS NULL', value: null });
    } else {
      this.whereConditions.push({ column, operator: '=', value });
    }
    return this;
  }

  in(column: string, values: any[]): this {
    this.whereConditions.push({ column, operator: 'IN', value: values });
    return this;
  }

  contains(column: string, value: any): this {
    // For JSON arrays stored as strings
    this.whereConditions.push({ column, operator: 'LIKE', value: `%${value}%` });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderByClause = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.singleRow = true;
    return this;
  }

  maybeSingle(): this {
    this.maybeSingleRow = true;
    return this;
  }

  async then<TResult>(
    onfulfilled?: ((value: PostgrestResponse<T>) => TResult | PromiseLike<TResult>) | null
  ): Promise<TResult> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result as any;
  }

  private async execute(): Promise<PostgrestResponse<T | T[]>> {
    try {
      const db = getDatabase();
      let result: any;

      switch (this.operation) {
        case 'select':
          result = await this.executeSelect(db);
          break;
        case 'insert':
          result = await this.executeInsert(db);
          break;
        case 'update':
          result = await this.executeUpdate(db);
          break;
        case 'delete':
          result = await this.executeDelete(db);
          break;
      }

      return { data: result, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: (error as Error).message } 
      };
    }
  }

  private async executeSelect(db: any): Promise<T | T[]> {
    let result;
    try {
      const whereClause = this.buildWhereClause();
      const orderClause = this.orderByClause 
        ? `ORDER BY ${this.orderByClause.column} ${this.orderByClause.ascending ? 'ASC' : 'DESC'}`
        : '';
      const limitClause = this.limitCount ? `LIMIT ${this.limitCount}` : '';

      const sql = `SELECT ${this.selectColumns} FROM ${this.tableName} ${whereClause} ${orderClause} ${limitClause}`.trim();
      const params = this.whereConditions.map(c => c.value).filter(v => v !== null);

      result = db.exec(sql, params);
    } catch (error) {
      // If it's a "no such table" error, return empty array (table will be created on first insert)
      if ((error as Error).message && (error as Error).message.includes('no such table')) {
        if (this.singleRow) {
          throw new Error('No rows found');
        }
        return [] as T[];
      }
      throw error;
    }
    
    if (result.length === 0 || result[0].values.length === 0) {
      if (this.singleRow) {
        throw new Error('No rows found');
      }
      return [] as T[];
    }

    const columns = result[0].columns;
    const rows = result[0].values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, idx: number) => {
        let value = row[idx];
        
        // Parse JSON fields
        if (col === 'tags' || col === 'embedding') {
          try {
            value = value ? JSON.parse(value) : (col === 'tags' ? [] : null);
          } catch {
            value = col === 'tags' ? [] : null;
          }
        }
        
        obj[col] = value;
      });
      return obj as T;
    });

    if (this.singleRow || this.maybeSingleRow) {
      if (rows.length > 1 && this.singleRow) {
        throw new Error('Multiple rows found');
      }
      return rows[0] || null;
    }

    return rows;
  }

  private async executeInsert(db: any): Promise<T | T[]> {
    if (!this.insertData) {
      throw new Error('No data to insert');
    }

    const dataArray = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
    const results: T[] = [];

    for (const data of dataArray) {
      // Generate ID if not provided
      if (!(data as any).id) {
        (data as any).id = this.generateUUID();
      }
      
      const keys = Object.keys(data);
      const values = keys.map(k => (data as any)[k]);
      
      // Convert arrays to JSON strings
      const processedValues = values.map((v, idx) => {
        const key = keys[idx];
        if (key === 'tags' || key === 'embedding') {
          return Array.isArray(v) ? JSON.stringify(v) : v;
        }
        return v;
      });

      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
      
      db.run(sql, processedValues);
      
      // Get the inserted row
      const lastId = (data as any).id;
      const selectResult = db.exec(`SELECT * FROM ${this.tableName} WHERE id = ?`, [lastId]);
      
      if (selectResult.length > 0 && selectResult[0].values.length > 0) {
        const columns = selectResult[0].columns;
        const row = selectResult[0].values[0];
        const obj: any = {};
        columns.forEach((col: string, idx: number) => {
          let value = row[idx];
          if (col === 'tags' || col === 'embedding') {
            try {
              value = value ? JSON.parse(value) : (col === 'tags' ? [] : null);
            } catch {
              value = col === 'tags' ? [] : null;
            }
          }
          obj[col] = value;
        });
        results.push(obj as T);
      }
    }

    await saveDatabaseToIndexedDB(db);
    return Array.isArray(this.insertData) ? results : results[0];
  }

  private async executeUpdate(db: any): Promise<T | T[]> {
    if (!this.updateData) {
      throw new Error('No data to update');
    }

    const keys = Object.keys(this.updateData);
    const values = keys.map(k => {
      const value = (this.updateData as any)[k];
      if (k === 'tags' || k === 'embedding') {
        return Array.isArray(value) ? JSON.stringify(value) : value;
      }
      return value;
    });

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const whereClause = this.buildWhereClause();
    const whereValues = this.whereConditions.map(c => c.value).filter(v => v !== null);

    const sql = `UPDATE ${this.tableName} SET ${setClause}, updated_at = datetime('now') ${whereClause}`;
    
    db.run(sql, [...values, ...whereValues]);
    
    // Get updated rows
    const selectSql = `SELECT * FROM ${this.tableName} ${whereClause}`;
    const result = db.exec(selectSql, whereValues);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return [] as T[];
    }

    const columns = result[0].columns;
    const rows = result[0].values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, idx: number) => {
        let value = row[idx];
        if (col === 'tags' || col === 'embedding') {
          try {
            value = value ? JSON.parse(value) : (col === 'tags' ? [] : null);
          } catch {
            value = col === 'tags' ? [] : null;
          }
        }
        obj[col] = value;
      });
      return obj as T;
    });

    await saveDatabaseToIndexedDB(db);
    return rows;
  }

  private async executeDelete(db: any): Promise<null> {
    const whereClause = this.buildWhereClause();
    const whereValues = this.whereConditions.map(c => c.value).filter(v => v !== null);

    const sql = `DELETE FROM ${this.tableName} ${whereClause}`;
    db.run(sql, whereValues);
    
    await saveDatabaseToIndexedDB(db);
    return null;
  }

  private buildWhereClause(): string {
    if (this.whereConditions.length === 0) return '';

    const conditions = this.whereConditions.map(c => {
      if (c.operator === 'IS NULL') {
        return `${c.column} IS NULL`;
      } else if (c.operator === 'IN') {
        const placeholders = c.value.map(() => '?').join(', ');
        return `${c.column} IN (${placeholders})`;
      } else {
        return `${c.column} ${c.operator} ?`;
      }
    });

    return `WHERE ${conditions.join(' AND ')}`;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * Main database client
 */
export const database = {
  from<T = any>(tableName: string): PostgrestBuilder<T> {
    return new QueryBuilder<T>(tableName);
  },
  
  auth: {
    signUp: async (credentials: { email: string; password: string }) => {
      return auth.signUp(credentials.email, credentials.password);
    },
    
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      return auth.signInWithPassword(credentials.email, credentials.password);
    },
    
    signOut: async () => {
      return auth.signOut();
    },
    
    getSession: async () => {
      const session = auth.getSession();
      return { data: { session }, error: null };
    },
    
    getUser: async () => {
      return auth.getUser();
    },
    
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
      const subscription = auth.onAuthStateChange(callback);
      return { data: { subscription }, error: null };
    }
  },

  storage: {
    from: (bucketName: string) => ({
      upload: async (path: string, file: File) => {
        // Store file as base64 in localStorage (simplified for browser)
        return new Promise<{ data: { path: string } | null; error: Error | null }>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const storageKey = `storage_${bucketName}_${path}`;
            localStorage.setItem(storageKey, base64);
            resolve({ data: { path }, error: null });
          };
          reader.onerror = () => {
            resolve({ data: null, error: new Error('Failed to read file') });
          };
          reader.readAsDataURL(file);
        });
      },
      
      createSignedUrl: async (path: string, expiresIn: number) => {
        // For local storage, just return the data URL
        const storageKey = `storage_item-images_${path}`;
        const data = localStorage.getItem(storageKey);
        if (data) {
          return { data: { signedUrl: data }, error: null };
        }
        return { data: null, error: new Error('File not found') };
      }
    })
  },

  functions: {
    invoke: async (functionName: string, options: { body: any }) => {
      // Mock functions for local development
      console.warn(`Function ${functionName} not implemented in local mode`);
      
      // Return mock data based on function name
      if (functionName === 'analyze-url' || functionName === 'analyze-file') {
        return {
          data: {
            title: 'Mock Title',
            summary: 'Mock summary',
            tag: 'general',
            description: 'Mock description'
          },
          error: null
        };
      }
      
      if (functionName === 'generate-embedding') {
        // Return null embedding (semantic search won't work but app will function)
        return {
          data: { embedding: null },
          error: null
        };
      }
      
      return { data: null, error: new Error('Function not implemented') };
    }
  },

  rpc: async (functionName: string, params: any) => {
    // Mock RPC functions
    console.warn(`RPC function ${functionName} not implemented in local mode`);
    return { data: [], error: null };
  }
};
