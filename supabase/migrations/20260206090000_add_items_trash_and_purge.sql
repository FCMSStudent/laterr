-- Add soft delete support to items and update related views/functions

-- Add deleted_at for trash
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index to optimize active/trash queries
CREATE INDEX IF NOT EXISTS items_user_deleted_at_idx ON public.items (user_id, deleted_at, created_at);

-- Update find_similar_items to ignore trashed items
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
    AND items.user_id = auth.uid()
    AND items.deleted_at IS NULL
    AND 1 - (items.embedding <=> query_embedding) > match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update unified_activity_feed view to ignore trashed items
CREATE OR REPLACE VIEW unified_activity_feed AS
SELECT 
  id,
  user_id,
  'bookmark' as entity_type,
  id as entity_id,
  title,
  summary,
  created_at as activity_date,
  'created' as activity_type
FROM items
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  id,
  user_id,
  'subscription' as entity_type,
  id as entity_id,
  name as title,
  null as summary,
  next_billing_date as activity_date,
  'renewal_due' as activity_type
FROM subscriptions 
WHERE next_billing_date <= NOW() + INTERVAL '7 days'
  AND next_billing_date >= NOW()
  AND status = 'active'

UNION ALL

SELECT 
  id,
  user_id,
  'health_measurement' as entity_type,
  id as entity_id,
  measurement_type as title,
  value::text as summary,
  measured_at as activity_date,
  'recorded' as activity_type
FROM health_measurements

ORDER BY activity_date DESC;
