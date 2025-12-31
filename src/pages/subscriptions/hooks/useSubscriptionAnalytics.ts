/**
 * Custom hook for subscription analytics
 * Provides aggregated statistics and spending breakdown
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CategoryAnalytics, SubscriptionTotals } from '../types';

export const useSubscriptionAnalytics = () => {
  // Fetch subscription totals
  const {
    data: totals,
    isLoading: isLoadingTotals,
    error: totalsError,
  } = useQuery({
    queryKey: ['subscription-totals'],
    queryFn: async (): Promise<SubscriptionTotals> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('get_subscription_totals', {
          p_user_id: user.id,
        });

      if (error) throw error;
      
      // The function returns an array, get the first result
      const result = data?.[0];
      return {
        total_monthly: result?.total_monthly ?? 0,
        total_yearly: result?.total_yearly ?? 0,
        active_count: result?.active_count ?? 0,
      };
    },
  });

  // Fetch analytics by category
  const {
    data: categoryAnalytics = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useQuery({
    queryKey: ['subscription-category-analytics'],
    queryFn: async (): Promise<CategoryAnalytics[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('calculate_subscription_analytics', {
          p_user_id: user.id,
        });

      if (error) throw error;
      
      return (data || []).map(item => ({
        category: item.category,
        total_amount: item.total_amount,
        monthly_equivalent: item.monthly_equivalent,
        subscription_count: item.subscription_count,
      }));
    },
  });

  // Calculate average cost per subscription
  const averageCost = totals && totals.active_count > 0
    ? totals.total_monthly / totals.active_count
    : 0;

  return {
    totals: totals ?? { total_monthly: 0, total_yearly: 0, active_count: 0 },
    categoryAnalytics,
    averageCost,
    isLoading: isLoadingTotals || isLoadingCategories,
    error: totalsError || categoriesError,
  };
};
