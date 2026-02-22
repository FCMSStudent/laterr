import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_ITEMS_TABLE } from "@/features/bookmarks/constants";
import { SUBSCRIPTION_TABLES } from "@/features/subscriptions/constants";

export interface DashboardStats {
  totalBookmarks: number;
  activeSubscriptions: number;
  recentMeasurements: number;
  goalsProgress: number;
  loading: boolean;
  error: Error | null;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookmarks: 0,
    activeSubscriptions: 0,
    recentMeasurements: 0,
    goalsProgress: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        // Fetch bookmarks count
        const { count: bookmarksCount, error: bookmarksError } = await supabase
          .from(SUPABASE_ITEMS_TABLE)
          .select('id', { count: 'exact', head: true });

        if (bookmarksError) throw bookmarksError;

        // Fetch active subscriptions count
        const { count: subscriptionsCount, error: subscriptionsError } = await supabase
          .from(SUBSCRIPTION_TABLES.SUBSCRIPTIONS)
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');

        if (subscriptionsError) throw subscriptionsError;

        // Fetch recent measurements (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: measurementsCount, error: measurementsError } = await supabase
          .from('health_measurements')
          .select('id', { count: 'exact', head: true })
          .gte('measured_at', sevenDaysAgo.toISOString());

        if (measurementsError) throw measurementsError;

        // Fetch goals progress (active goals)
        const { count: goalsCount, error: goalsError } = await supabase
          .from('health_goals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');

        if (goalsError) throw goalsError;

        setStats({
          totalBookmarks: bookmarksCount || 0,
          activeSubscriptions: subscriptionsCount || 0,
          recentMeasurements: measurementsCount || 0,
          goalsProgress: goalsCount || 0,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};
