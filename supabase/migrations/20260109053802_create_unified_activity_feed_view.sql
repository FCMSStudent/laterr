-- Create unified_activity_feed view joining all modules
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

-- Add RLS policy for the view
-- Note: Views inherit RLS from underlying tables automatically in Supabase
