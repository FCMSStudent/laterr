/**
 * Utility functions for backfilling embeddings on existing items
 * Run this to add embeddings to items that were created before the feature was implemented
 */

import { supabase } from "@/integrations/supabase/client";
import { EMBEDDING_DIMENSION, isValidEmbedding } from "@/features/bookmarks/constants";

export interface BackfillProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentItem?: string;
}

export type ProgressCallback = (progress: BackfillProgress) => void;

/**
 * Backfill embeddings for all items that don't have them
 * @param batchSize Number of items to process in each batch
 * @param onProgress Callback for progress updates
 * @returns Summary of the backfill operation
 */
export async function backfillAllEmbeddings(
  batchSize: number = 50,
  onProgress?: ProgressCallback
): Promise<BackfillProgress> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get count of items without embeddings
    const { count, error: countError } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('embedding', null);

    if (countError) {
      throw countError;
    }

    const total = count || 0;
    console.log(`Found ${total} items without embeddings`);

    if (total === 0) {
      return { total: 0, processed: 0, successful: 0, failed: 0 };
    }

    let processed = 0;
    let successful = 0;
    let failed = 0;

    // Process in batches
    while (processed < total) {
      // Fetch next batch of items without embeddings
      const { data: items, error: fetchError } = await supabase
        .from('items')
        .select('id, title, summary, tags, content, type')
        .eq('user_id', user.id)
        .is('embedding', null)
        .limit(batchSize);

      if (fetchError) {
        console.error('Error fetching items:', fetchError);
        break;
      }

      if (!items || items.length === 0) {
        break;
      }

      // Process each item
      for (const item of items) {
        try {
          onProgress?.({
            total,
            processed,
            successful,
            failed,
            currentItem: item.title
          });

          // Generate embedding
          const { data: embeddingData, error: embError } = await supabase.functions.invoke('generate-embedding', {
            body: {
              title: item.title || '',
              summary: item.summary || '',
              tags: item.tags || [],
              extractedText: item.type === 'note' ? (item.content?.substring(0, 1000) || '') : ''
            }
          });

          if (embError) {
            throw embError;
          }

          if (!embeddingData?.embedding) {
            throw new Error('No embedding returned');
          }

          if (!isValidEmbedding(embeddingData.embedding)) {
            throw new Error(`Invalid embedding dimension: ${embeddingData.embedding?.length} (expected ${EMBEDDING_DIMENSION})`);
          }

          // Update item with embedding
          const { error: updateError } = await supabase
            .from('items')
            .update({ embedding: embeddingData.embedding })
            .eq('id', item.id);

          if (updateError) {
            throw updateError;
          }

          successful++;
          console.log(`✅ Generated embedding for: ${item.title}`);
        } catch (error) {
          failed++;
          console.error(`❌ Failed to generate embedding for: ${item.title}`, error);
        }

        processed++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onProgress?.({
        total,
        processed,
        successful,
        failed
      });
    }

    console.log(`Backfill complete: ${successful} successful, ${failed} failed`);

    return {
      total,
      processed,
      successful,
      failed
    };
  } catch (error) {
    console.error('Error in backfillAllEmbeddings:', error);
    throw error;
  }
}

/**
 * Check how many items need embeddings
 * @returns Count of items without embeddings
 */
export async function countItemsNeedingEmbeddings(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return 0;
    }

    const { count, error } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('embedding', null);

    if (error) {
      console.error('Error counting items:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in countItemsNeedingEmbeddings:', error);
    return 0;
  }
}

/**
 * Regenerate embedding for a specific item
 * Useful when item content has been updated
 * @param itemId ID of the item to regenerate
 */
export async function regenerateEmbedding(itemId: string): Promise<boolean> {
  try {
    // Fetch item
    const { data: item, error: fetchError } = await supabase
      .from('items')
      .select('title, summary, tags, content, type')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      throw new Error('Failed to fetch item');
    }

    // Generate new embedding
    const { data: embeddingData, error: embError } = await supabase.functions.invoke('generate-embedding', {
      body: {
        title: item.title || '',
        summary: item.summary || '',
        tags: item.tags || [],
        extractedText: item.type === 'note' ? (item.content?.substring(0, 1000) || '') : ''
      }
    });

    if (embError || !embeddingData?.embedding) {
      throw new Error('Failed to generate embedding');
    }

    if (!isValidEmbedding(embeddingData.embedding)) {
      throw new Error(`Invalid embedding dimension: ${embeddingData.embedding?.length} (expected ${EMBEDDING_DIMENSION})`);
    }

    // Update item
    const { error: updateError } = await supabase
      .from('items')
      .update({ embedding: embeddingData.embedding })
      .eq('id', itemId);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Regenerated embedding for item: ${itemId}`);
    return true;
  } catch (error) {
    console.error('Error in regenerateEmbedding:', error);
    return false;
  }
}
