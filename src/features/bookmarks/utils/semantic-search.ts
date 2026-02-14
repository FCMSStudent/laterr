/**
 * Semantic search utilities using embeddings for content recommendations
 */

import { supabase } from "@/integrations/supabase/client";
import type { Item } from "@/features/bookmarks/types";
import { isValidEmbedding } from "@/features/bookmarks/constants";

/**
 * Find similar items based on embedding similarity
 * @param itemId - The ID of the reference item
 * @param limit - Maximum number of similar items to return
 * @param threshold - Minimum similarity score (0-1)
 * @returns Array of similar items with similarity scores
 */
export async function findSimilarItems(
  itemId: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<(Item & { similarity: number })[]> {
  try {
    // Get the reference item's embedding
    const { data: refItem, error: refError } = await supabase
      .from('items')
      .select('embedding, user_id')
      .eq('id', itemId)
      .single();

    if (refError || !refItem?.embedding) {
      console.error('Failed to get reference item embedding:', refError);
      return [];
    }

    // Call the find_similar_items function - user_id is now enforced server-side via auth.uid()
    const { data, error } = await supabase.rpc('find_similar_items', {
      query_embedding: refItem.embedding,
      match_threshold: threshold,
      match_count: limit + 1 // +1 to account for the reference item itself
    });

    if (error) {
      console.error('Failed to find similar items:', error);
      return [];
    }

    // Filter out the reference item itself and return
    return (data || [])
      .filter((item) => item.id !== itemId)
      .slice(0, limit) as (Item & { similarity: number })[];
  } catch (error) {
    console.error('Error in findSimilarItems:', error);
    return [];
  }
}

/**
 * Find items similar to given text (without an existing item)
 * @param text - Text to find similar items for
 * @param limit - Maximum number of similar items to return
 * @param threshold - Minimum similarity score (0-1)
 * @returns Array of similar items with similarity scores
 */
export async function findSimilarItemsByText(
  text: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<(Item & { similarity: number })[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('User not authenticated');
      return [];
    }

    // Generate embedding for the text
    const { data: embeddingData, error: embError } = await supabase.functions.invoke('generate-embedding', {
      body: {
        title: '',
        summary: text,
        tags: [],
        extractedText: ''
      }
    });

    if (embError || !embeddingData?.embedding) {
      console.error('Failed to generate embedding:', embError);
      return [];
    }

    if (!isValidEmbedding(embeddingData.embedding)) {
      console.error('Invalid embedding dimension:', embeddingData.embedding?.length);
      return [];
    }

    // Call the find_similar_items function - user_id is now enforced server-side via auth.uid()
    const { data, error } = await supabase.rpc('find_similar_items', {
      query_embedding: embeddingData.embedding,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      console.error('Failed to find similar items:', error);
      return [];
    }

    return (data || []) as (Item & { similarity: number })[];
  } catch (error) {
    console.error('Error in findSimilarItemsByText:', error);
    return [];
  }
}

/**
 * Get recommendations for a user based on their recent items
 * @param limit - Maximum number of recommendations to return
 * @returns Array of recommended items
 */
export async function getRecommendations(
  limit: number = 10
): Promise<Item[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('User not authenticated');
      return [];
    }

    // Get user's most recent items with embeddings
    const { data: recentItems, error: recentError } = await supabase
      .from('items')
      .select('id, embedding')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('embedding', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError || !recentItems || recentItems.length === 0) {
      console.warn('No recent items with embeddings found');
      return [];
    }

    // Get similar items for each recent item
    const allSimilar: Map<string, Item & { similarity: number }> = new Map();
    
    for (const item of recentItems) {
      const similar = await findSimilarItems(item.id, limit, 0.7);
      similar.forEach(s => {
        if (!allSimilar.has(s.id) || (allSimilar.get(s.id)!.similarity < s.similarity)) {
          allSimilar.set(s.id, s);
        }
      });
    }

    // Sort by similarity and return top results
    return Array.from(allSimilar.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('Error in getRecommendations:', error);
    return [];
  }
}
