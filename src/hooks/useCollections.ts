import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Collection } from '@/types';
import { toast } from 'sonner';

// Fetch all collections for the current user
export const useCollections = () => {
  return useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Collection[];
    },
  });
};

// Create a new collection
export const useCreateCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name,
          color: null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Collection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection created successfully');
    },
    onError: (error) => {
      console.error('Error creating collection:', error);
      toast.error('Failed to create collection');
    },
  });
};

// Update a collection
export const useUpdateCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string | null }) => {
      const updates: { name?: string; color?: string | null } = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;

      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Collection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection updated successfully');
    },
    onError: (error) => {
      console.error('Error updating collection:', error);
      toast.error('Failed to update collection');
    },
  });
};

// Delete a collection
export const useDeleteCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Collection deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting collection:', error);
      toast.error('Failed to delete collection');
    },
  });
};

// Assign an item to a collection
export const useAssignItemToCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, collectionId }: { itemId: string; collectionId: string | null }) => {
      const { error } = await supabase
        .from('items')
        .update({ category_id: collectionId })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Item moved to collection');
    },
    onError: (error) => {
      console.error('Error assigning item to collection:', error);
      toast.error('Failed to move item');
    },
  });
};
