/**
 * Custom hook for managing health goals
 * Provides CRUD operations and progress tracking using TanStack Query
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HealthGoal, GoalFormData, GoalStatus, GoalValue, Milestone } from '../types';

interface UseHealthGoalsOptions {
  status?: GoalStatus;
}

export const useHealthGoals = (options?: UseHealthGoalsOptions) => {
  const queryClient = useQueryClient();

  // Fetch all goals for the current user
  const {
    data: goals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['health-goals', options],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('health_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []) as unknown as HealthGoal[];
    },
  });

  // Fetch single goal by ID
  const fetchGoal = useCallback(async (id: string): Promise<HealthGoal | null> => {
    const { data, error } = await supabase
      .from('health_goals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching goal:', error);
      return null;
    }

    return data as unknown as HealthGoal;
  }, []);

  // Create goal mutation
  const createMutation = useMutation({
    mutationFn: async (formData: GoalFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData = {
        goal_type: formData.goal_type,
        target_value: formData.target_value as GoalValue,
        start_date: formData.start_date,
        target_date: formData.target_date,
        motivation: formData.motivation,
        user_id: user.id,
        current_value: {} as GoalValue,
        status: 'active' as const,
        milestones: (formData.milestones || []) as Milestone[],
      };

      const { data, error } = await supabase
        .from('health_goals')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as HealthGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-goals'] });
      queryClient.invalidateQueries({ queryKey: ['health-summary'] });
      toast.success('Goal created successfully! 🎯');
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal', {
        description: 'Please try again later',
      });
    },
  });

  // Update goal mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GoalFormData> & { status?: GoalStatus; current_value?: GoalValue } }) => {
      // Define proper interface for update data to improve type safety
      interface GoalUpdateData {
        goal_type?: string;
        target_value?: GoalValue;
        start_date?: string;
        target_date?: string;
        motivation?: string;
        milestones?: Milestone[];
        status?: GoalStatus;
        current_value?: GoalValue;
      }

      // Convert to plain object compatible with Supabase types
      const updateData: GoalUpdateData = {};
      if (data.goal_type !== undefined) updateData.goal_type = data.goal_type;
      if (data.target_value !== undefined) updateData.target_value = data.target_value;
      if (data.start_date !== undefined) updateData.start_date = data.start_date;
      if (data.target_date !== undefined) updateData.target_date = data.target_date;
      if (data.motivation !== undefined) updateData.motivation = data.motivation;
      if (data.milestones !== undefined) updateData.milestones = data.milestones;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.current_value !== undefined) updateData.current_value = data.current_value;

      const { data: result, error } = await supabase
        .from('health_goals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as unknown as HealthGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-goals'] });
      queryClient.invalidateQueries({ queryKey: ['health-summary'] });
      toast.success('Goal updated! ✨');
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal', {
        description: 'Please try again later',
      });
    },
  });

  // Delete goal mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('health_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-goals'] });
      queryClient.invalidateQueries({ queryKey: ['health-summary'] });
      toast.success('Goal deleted');
    },
    onError: (error) => {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal', {
        description: 'Please try again later',
      });
    },
  });

  // Mark goal as completed
  const completeGoal = useCallback(async (id: string) => {
    await updateMutation.mutateAsync({
      id,
      data: { status: 'completed' },
    });
  }, [updateMutation]);

  // Abandon goal
  const abandonGoal = useCallback(async (id: string) => {
    await updateMutation.mutateAsync({
      id,
      data: { status: 'abandoned' },
    });
  }, [updateMutation]);

  return {
    goals,
    isLoading,
    error,
    refetch,
    fetchGoal,
    createGoal: createMutation.mutate,
    createGoalAsync: createMutation.mutateAsync,
    updateGoal: updateMutation.mutate,
    updateGoalAsync: updateMutation.mutateAsync,
    deleteGoal: deleteMutation.mutate,
    deleteGoalAsync: deleteMutation.mutateAsync,
    completeGoal,
    abandonGoal,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
