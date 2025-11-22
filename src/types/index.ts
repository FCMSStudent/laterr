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

export interface User {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count?: number;
}

export interface ApiError {
  message: string;
  status?: number;
}
