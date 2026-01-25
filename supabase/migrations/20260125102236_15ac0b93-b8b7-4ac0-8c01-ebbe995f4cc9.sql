-- Fix 1: Make the item-images bucket private to enforce RLS policies
UPDATE storage.buckets SET public = false WHERE id = 'item-images';

-- Fix 2: Replace find_similar_items function to use auth.uid() for server-side user isolation
-- This removes the user_id_filter parameter and enforces user isolation at the database level
CREATE OR REPLACE FUNCTION public.find_similar_items(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (id uuid, title text, similarity double precision)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    items.id,
    items.title,
    1 - (items.embedding <=> query_embedding) as similarity
  FROM items
  WHERE items.embedding IS NOT NULL
    AND items.user_id = auth.uid()  -- Server-side enforcement via auth.uid()
    AND 1 - (items.embedding <=> query_embedding) > match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;