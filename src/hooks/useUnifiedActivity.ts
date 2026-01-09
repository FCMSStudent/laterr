import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

      const { data, error: fetchError } = await supabase
        .from('unified_activity_feed')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(limit);

      if (fetchError) throw fetchError;

      setActivities(data as UnifiedActivity[] || []);
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
