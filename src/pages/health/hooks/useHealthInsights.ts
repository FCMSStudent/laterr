/**
 * Custom hook for managing health insights
 * Provides fetching and managing AI-generated insights using TanStack Query
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HealthInsight } from '../types';

export const useHealthInsights = () => {
  const queryClient = useQueryClient();

  // Fetch all non-dismissed insights for the current user
  const {
    data: insights = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['health-insights'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('health_insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .order('generated_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []) as HealthInsight[];
    },
  });

  // Dismiss insight mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('health_insights')
        .update({ dismissed: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-insights'] });
      toast.success('Insight dismissed');
    },
    onError: (error) => {
      console.error('Error dismissing insight:', error);
      toast.error('Failed to dismiss insight', {
        description: 'Please try again later',
      });
    },
  });

  // Generate new insights
  const generateMutation = useMutation({
    mutationFn: async (forceRegenerate: boolean = false) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-health-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            forceRegenerate,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate insights');
      }

      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['health-insights'] });
      if (data.count > 0) {
        toast.success(`Generated ${data.count} new insights! 💡`);
      } else {
        toast.info(data.message || 'No new insights generated');
      }
    },
    onError: (error) => {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate insights', {
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    },
  });

  return {
    insights,
    isLoading,
    error,
    refetch,
    dismissInsight: dismissMutation.mutate,
    dismissInsightAsync: dismissMutation.mutateAsync,
    generateInsights: generateMutation.mutate,
    generateInsightsAsync: generateMutation.mutateAsync,
    isDismissing: dismissMutation.isPending,
    isGenerating: generateMutation.isPending,
  };
};
