import type { User as SupabaseUser } from '@supabase/supabase-js';

export type ItemType = 'url' | 'note' | 'image' | 'document' | 'file';

export interface Tag {
  id?: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Item {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  content: string | null;
  summary: string | null;
  user_notes: string | null;
  tags: string[];
  preview_image_url: string | null;
  created_at: string;
  updated_at?: string;
}

export type User = SupabaseUser;

export interface PaginatedResponse<T> {
  data: T[];
  count?: number;
}

export interface ApiError {
  message: string;
  status?: number;
}
