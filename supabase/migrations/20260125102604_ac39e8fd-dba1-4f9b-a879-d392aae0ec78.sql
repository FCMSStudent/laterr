-- Fix search_path for find_similar_health_documents function
-- This prevents search_path injection attacks by explicitly setting the schema
CREATE OR REPLACE FUNCTION public.find_similar_health_documents(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE(id uuid, title text, similarity double precision)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    health_documents.id,
    health_documents.title,
    1 - (health_documents.embedding <=> query_embedding) as similarity
  FROM health_documents
  WHERE health_documents.embedding IS NOT NULL
    AND health_documents.user_id = auth.uid()
    AND 1 - (health_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY health_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;