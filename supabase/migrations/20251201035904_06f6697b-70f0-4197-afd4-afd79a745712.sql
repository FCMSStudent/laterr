-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to items table for semantic search
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create an index for faster similarity searches using cosine distance
CREATE INDEX IF NOT EXISTS items_embedding_idx 
ON public.items 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function to find similar items based on embedding similarity
CREATE OR REPLACE FUNCTION find_similar_items(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    items.id,
    items.title,
    1 - (items.embedding <=> query_embedding) as similarity
  FROM items
  WHERE items.embedding IS NOT NULL
    AND 1 - (items.embedding <=> query_embedding) > match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;