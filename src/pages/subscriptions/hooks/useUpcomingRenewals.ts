/**
 * Custom hook for fetching upcoming subscription renewals
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UpcomingRenewal, BillingCycle, SubscriptionStatus } from '../types';

interface UseUpcomingRenewalsOptions {
  daysAhead?: number;
}

export const useUpcomingRenewals = (options?: UseUpcomingRenewalsOptions) => {
  const daysAhead = options?.daysAhead ?? 14;

  const {
    data: renewals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['upcoming-renewals', daysAhead],
    queryFn: async (): Promise<UpcomingRenewal[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('get_upcoming_renewals', {
          p_user_id: user.id,
          p_days_ahead: daysAhead,
        });

      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        currency: item.currency,
        billing_cycle: item.billing_cycle as BillingCycle,
        next_billing_date: item.next_billing_date,
        days_until_renewal: item.days_until_renewal,
        logo_url: item.logo_url,
        status: item.status as SubscriptionStatus,
      }));
    },
    // Refetch every 5 minutes to keep data fresh
    refetchInterval: 5 * 60 * 1000,
  });

  // Get urgency level based on days until renewal
  const getUrgencyLevel = (daysUntil: number): 'high' | 'medium' | 'low' => {
    if (daysUntil <= 2) return 'high';
    if (daysUntil <= 5) return 'medium';
    return 'low';
  };

  return {
    renewals,
    isLoading,
    error,
    refetch,
    getUrgencyLevel,
  };
};
