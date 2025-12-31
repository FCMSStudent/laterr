/**
 * Custom hook for managing subscriptions
 * Provides CRUD operations and state management using TanStack Query
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  Subscription, 
  SubscriptionFormData, 
  BillingCycle, 
  SubscriptionStatus 
} from '../types';

const SUBSCRIPTIONS_TABLE = 'subscriptions';

interface UseSubscriptionsOptions {
  category?: string;
  status?: SubscriptionStatus;
  search?: string;
}

export const useSubscriptions = (options?: UseSubscriptionsOptions) => {
  const queryClient = useQueryClient();

  // Fetch all subscriptions for the current user
  const {
    data: subscriptions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['subscriptions', options],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from(SUBSCRIPTIONS_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('next_billing_date', { ascending: true });

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Normalize the data
      const normalizedData: Subscription[] = (data || []).map(item => ({
        ...item,
        tags: item.tags ?? [],
        billing_cycle: item.billing_cycle as BillingCycle,
        status: item.status as SubscriptionStatus,
      }));

      // Apply search filter client-side if provided
      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        return normalizedData.filter(sub => 
          sub.name.toLowerCase().includes(searchLower) ||
          sub.category.toLowerCase().includes(searchLower) ||
          sub.notes?.toLowerCase().includes(searchLower)
        );
      }

      return normalizedData;
    },
  });

  // Fetch single subscription by ID
  const fetchSubscription = useCallback(async (id: string): Promise<Subscription | null> => {
    const { data, error } = await supabase
      .from(SUBSCRIPTIONS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return {
      ...data,
      tags: data.tags ?? [],
      billing_cycle: data.billing_cycle as BillingCycle,
      status: data.status as SubscriptionStatus,
    };
  }, []);

  // Create subscription mutation
  const createMutation = useMutation({
    mutationFn: async (formData: SubscriptionFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from(SUBSCRIPTIONS_TABLE)
        .insert({
          ...formData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-totals'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-renewals'] });
      toast.success('Subscription added successfully! 🎉');
    },
    onError: (error) => {
      console.error('Error creating subscription:', error);
      toast.error('Failed to add subscription', {
        description: 'Please try again later',
      });
    },
  });

  // Update subscription mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubscriptionFormData> }) => {
      const { data: result, error } = await supabase
        .from(SUBSCRIPTIONS_TABLE)
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-totals'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-renewals'] });
      toast.success('Subscription updated! ✨');
    },
    onError: (error) => {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription', {
        description: 'Please try again later',
      });
    },
  });

  // Delete subscription mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(SUBSCRIPTIONS_TABLE)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-totals'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-renewals'] });
      toast.success('Subscription deleted');
    },
    onError: (error) => {
      console.error('Error deleting subscription:', error);
      toast.error('Failed to delete subscription', {
        description: 'Please try again later',
      });
    },
  });

  // Pause subscription
  const pauseSubscription = useCallback(async (id: string) => {
    await updateMutation.mutateAsync({
      id,
      data: { status: 'paused' },
    });
  }, [updateMutation]);

  // Resume subscription
  const resumeSubscription = useCallback(async (id: string) => {
    await updateMutation.mutateAsync({
      id,
      data: { status: 'active' },
    });
  }, [updateMutation]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (id: string) => {
    await updateMutation.mutateAsync({
      id,
      data: { status: 'cancelled' },
    });
  }, [updateMutation]);

  return {
    subscriptions,
    isLoading,
    error,
    refetch,
    fetchSubscription,
    createSubscription: createMutation.mutate,
    createSubscriptionAsync: createMutation.mutateAsync,
    updateSubscription: updateMutation.mutate,
    updateSubscriptionAsync: updateMutation.mutateAsync,
    deleteSubscription: deleteMutation.mutate,
    deleteSubscriptionAsync: deleteMutation.mutateAsync,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
