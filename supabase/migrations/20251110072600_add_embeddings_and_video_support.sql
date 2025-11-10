-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to items table for multimodal embeddings
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add video type support to items table
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_type_check;
ALTER TABLE items ADD CONSTRAINT items_type_check 
CHECK (type = ANY (ARRAY['url'::text, 'note'::text, 'image'::text, 'document'::text, 'file'::text, 'video'::text]));

-- Create index on embedding column for fast similarity search
CREATE INDEX IF NOT EXISTS items_embedding_idx ON public.items 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function to find similar items based on embeddings
CREATE OR REPLACE FUNCTION find_similar_items(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  summary text,
  tags text[],
  preview_image_url text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    items.id,
    items.type,
    items.title,
    items.summary,
    items.tags,
    items.preview_image_url,
    1 - (items.embedding <=> query_embedding) as similarity
  FROM public.items
  WHERE 
    items.embedding IS NOT NULL
    AND (user_id_filter IS NULL OR items.user_id = user_id_filter)
    AND 1 - (items.embedding <=> query_embedding) > match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
