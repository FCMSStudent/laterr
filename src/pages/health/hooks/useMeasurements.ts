/**
 * Custom hook for managing health measurements
 * Provides CRUD operations and state management using TanStack Query
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  HealthMeasurement, 
  MeasurementFormData,
  MeasurementType 
} from '../types';

interface UseMeasurementsOptions {
  measurementType?: MeasurementType | string;
  daysBack?: number;
}

export const useMeasurements = (options?: UseMeasurementsOptions) => {
  const queryClient = useQueryClient();

  // Fetch all measurements for the current user
  const {
    data: measurements = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['health-measurements', options],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('health_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false });

      if (options?.measurementType) {
        query = query.eq('measurement_type', options.measurementType);
      }

      if (options?.daysBack) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.daysBack);
        query = query.gte('measured_at', cutoffDate.toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []) as HealthMeasurement[];
    },
  });

  // Fetch single measurement by ID
  const fetchMeasurement = useCallback(async (id: string): Promise<HealthMeasurement | null> => {
    const { data, error } = await supabase
      .from('health_measurements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching measurement:', error);
      return null;
    }

    return data as HealthMeasurement;
  }, []);

  // Create measurement mutation
  const createMutation = useMutation({
    mutationFn: async (formData: MeasurementFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('health_measurements')
        .insert({
          ...formData,
          user_id: user.id,
          tags: formData.tags || [],
          source: formData.source || 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data as HealthMeasurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-measurements'] });
      queryClient.invalidateQueries({ queryKey: ['health-summary'] });
      toast.success('Measurement added successfully! 📊');
    },
    onError: (error) => {
      console.error('Error creating measurement:', error);
      toast.error('Failed to add measurement', {
        description: 'Please try again later',
      });
    },
  });

  // Update measurement mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MeasurementFormData> }) => {
      const { data: result, error } = await supabase
        .from('health_measurements')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as HealthMeasurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-measurements'] });
      queryClient.invalidateQueries({ queryKey: ['health-summary'] });
      toast.success('Measurement updated! ✨');
    },
    onError: (error) => {
      console.error('Error updating measurement:', error);
      toast.error('Failed to update measurement', {
        description: 'Please try again later',
      });
    },
  });

  // Delete measurement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('health_measurements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-measurements'] });
      queryClient.invalidateQueries({ queryKey: ['health-summary'] });
      toast.success('Measurement deleted');
    },
    onError: (error) => {
      console.error('Error deleting measurement:', error);
      toast.error('Failed to delete measurement', {
        description: 'Please try again later',
      });
    },
  });

  return {
    measurements,
    isLoading,
    error,
    refetch,
    fetchMeasurement,
    createMeasurement: createMutation.mutate,
    createMeasurementAsync: createMutation.mutateAsync,
    updateMeasurement: updateMutation.mutate,
    updateMeasurementAsync: updateMutation.mutateAsync,
    deleteMeasurement: deleteMutation.mutate,
    deleteMeasurementAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
