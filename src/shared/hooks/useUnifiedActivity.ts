import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface UnifiedActivity {
  id: string;
  user_id: string;
  entity_type: 'bookmark' | 'subscription' | 'health_measurement';
  entity_id: string;
  title: string;
  summary: string | null;
  activity_date: string;
  activity_type: 'created' | 'renewal_due' | 'recorded';
}

export interface UseUnifiedActivityResult {
  activities: UnifiedActivity[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useUnifiedActivity = (limit: number = 10): UseUnifiedActivityResult => {
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const userId = session.user.id;

      // Fetch from multiple tables in parallel
      const [itemsResult, subscriptionsResult, measurementsResult] = await Promise.all([
        supabase
          .from('items')
          .select('id, user_id, title, summary, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('subscriptions')
          .select('id, user_id, name, notes, next_billing_date, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('health_measurements')
          .select('id, user_id, measurement_type, notes, measured_at, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);

      const unified: UnifiedActivity[] = [];

      // Map items to unified format
      if (itemsResult.data) {
        itemsResult.data.forEach(item => {
          unified.push({
            id: `bookmark-${item.id}`,
            user_id: item.user_id,
            entity_type: 'bookmark',
            entity_id: item.id,
            title: item.title,
            summary: item.summary,
            activity_date: item.created_at,
            activity_type: 'created',
          });
        });
      }

      // Map subscriptions to unified format
      if (subscriptionsResult.data) {
        subscriptionsResult.data.forEach(sub => {
          unified.push({
            id: `subscription-${sub.id}`,
            user_id: sub.user_id,
            entity_type: 'subscription',
            entity_id: sub.id,
            title: sub.name,
            summary: sub.notes,
            activity_date: sub.created_at,
            activity_type: 'created',
          });
        });
      }

      // Map measurements to unified format
      if (measurementsResult.data) {
        measurementsResult.data.forEach(m => {
          unified.push({
            id: `measurement-${m.id}`,
            user_id: m.user_id,
            entity_type: 'health_measurement',
            entity_id: m.id,
            title: m.measurement_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            summary: m.notes,
            activity_date: m.measured_at,
            activity_type: 'recorded',
          });
        });
      }

      // Sort by date and limit
      unified.sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime());
      setActivities(unified.slice(0, limit));
      setError(null);
    } catch (err) {
      console.error("Error fetching unified activity:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refresh: fetchActivities,
  };
};
