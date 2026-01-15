import type { User as SupabaseUser } from '@supabase/supabase-js';

export type ItemType = 'url' | 'note' | 'image' | 'document' | 'file' | 'video';

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
  embedding?: number[] | null;
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

// Note-related types
export interface NoteBlock {
  id: string;
  type: 'text' | 'heading' | 'checklist' | 'bullet' | 'numbered';
  content: string;
  checked?: boolean;
  level?: 1 | 2 | 3;
}

export interface NotesData {
  version: 1;
  blocks: NoteBlock[];
}

export const createEmptyNotesData = (): NotesData => ({
  version: 1,
  blocks: [],
});

export const createTextBlock = (content: string = ''): NoteBlock => ({
  id: crypto.randomUUID(),
  type: 'text',
  content,
});

export const createChecklistBlock = (content: string = '', checked: boolean = false): NoteBlock => ({
  id: crypto.randomUUID(),
  type: 'checklist',
  content,
  checked,
});

export const createHeadingBlock = (content: string = '', level: 1 | 2 | 3 = 2): NoteBlock => ({
  id: crypto.randomUUID(),
  type: 'heading',
  content,
  level,
});

export const createBulletBlock = (content: string = ''): NoteBlock => ({
  id: crypto.randomUUID(),
  type: 'bullet',
  content,
});
