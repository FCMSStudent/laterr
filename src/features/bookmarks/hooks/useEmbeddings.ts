/**
 * Custom hook for managing embeddings and semantic search
 * Provides utilities for generating embeddings and finding similar content
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { EMBEDDING_DIMENSION, isValidEmbedding } from '@/features/bookmarks/constants';
import { getGenerateEmbeddingErrorMessage } from '@/shared/lib/error-messages';

interface EmbeddingState {
  loading: boolean;
  error: string | null;
}

export const useEmbeddings = () => {
  const [state, setState] = useState<EmbeddingState>({
    loading: false,
    error: null,
  });

  /**
   * Generate embedding for given content
   */
  const generateEmbedding = useCallback(async (
    title: string,
    summary: string,
    tags: string[],
    extractedText: string = ''
  ): Promise<number[] | null> => {
    setState({ loading: true, error: null });

    try {
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: {
          title,
          summary,
          tags,
          extractedText,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.embedding) {
        throw new Error('No embedding returned');
      }

      // Validate embedding is an array with correct dimension
      if (!isValidEmbedding(data.embedding)) {
        console.warn('Invalid embedding dimension:', data.embedding?.length);
        throw new Error(`Invalid embedding dimension: ${data.embedding?.length} (expected ${EMBEDDING_DIMENSION})`);
      }

      setState({ loading: false, error: null });
      return data.embedding;
    } catch (err) {
      const status = typeof (err as { status?: number }).status === 'number'
        ? (err as { status?: number }).status
        : typeof (err as { context?: { status?: number } }).context?.status === 'number'
          ? (err as { context?: { status?: number } }).context?.status
          : undefined;
      const code = typeof (err as { code?: string }).code === 'string'
        ? (err as { code?: string }).code
        : undefined;
      const userMessage = getGenerateEmbeddingErrorMessage(status, code)
        ?? 'Unable to generate embeddings right now.';
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate embedding';

      setState({ loading: false, error: userMessage });
      console.error('Error generating embedding:', {
        status,
        code,
        message: errorMessage,
        error: err,
      });
      return null;
    }
  }, []);

  /**
   * Update embedding for an existing item
   */
  const updateItemEmbedding = useCallback(async (itemId: string): Promise<boolean> => {
    setState({ loading: true, error: null });

    try {
      // Fetch the item
      const { data: item, error: fetchError } = await supabase
        .from('items')
        .select('title, summary, tags, content')
        .eq('id', itemId)
        .single();

      if (fetchError || !item) {
        throw new Error('Failed to fetch item');
      }

      // Generate new embedding
      const embedding = await generateEmbedding(
        item.title,
        item.summary || '',
        item.tags || [],
        item.content?.substring(0, 1000) || ''
      );

      if (!embedding) {
        throw new Error('Failed to generate embedding');
      }

      // Update the item with new embedding
      const { error: updateError } = await supabase
        .from('items')
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', itemId);

      if (updateError) {
        throw updateError;
      }

      setState({ loading: false, error: null });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update embedding';
      setState({ loading: false, error: errorMessage });
      console.error('Error updating item embedding:', err);
      return false;
    }
  }, [generateEmbedding]);

  /**
   * Batch update embeddings for multiple items
   * Useful for backfilling embeddings on existing items
   */
  const batchUpdateEmbeddings = useCallback(async (
    itemIds: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ success: number; failed: number }> => {
    setState({ loading: true, error: null });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const result = await updateItemEmbedding(itemId);
      
      if (result) {
        success++;
      } else {
        failed++;
      }

      onProgress?.(i + 1, itemIds.length);

      // Add a small delay to avoid rate limiting
      if (i < itemIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setState({ loading: false, error: null });
    return { success, failed };
  }, [updateItemEmbedding]);

  return {
    loading: state.loading,
    error: state.error,
    generateEmbedding,
    updateItemEmbedding,
    batchUpdateEmbeddings,
  };
};
