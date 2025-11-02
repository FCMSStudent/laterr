import { supabase } from "@/integrations/supabase/client";
import {
  SUPABASE_STORAGE_BUCKET_ITEM_IMAGES,
  SUPABASE_STORAGE_ITEM_IMAGES_PATH_PREFIX,
  PREVIEW_SIGNED_URL_EXPIRATION,
} from "@/constants";

/**
 * Extracts the storage key from a full storage URL
 * @param url - The full storage URL
 * @returns The storage key or null if not found
 */
export function extractStorageKey(url: string): string | null {
  const marker = SUPABASE_STORAGE_ITEM_IMAGES_PATH_PREFIX;
  const idx = url.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  return url.substring(idx + marker.length);
}

/**
 * Generates a signed URL for a storage file
 * @param storageUrl - The full storage URL or storage key
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if generation fails
 */
export async function generateSignedUrl(
  storageUrl: string,
  expiresIn: number = PREVIEW_SIGNED_URL_EXPIRATION
): Promise<string | null> {
  try {
    const key = extractStorageKey(storageUrl);
    if (!key) {
      return null;
    }

    const { data, error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET_ITEM_IMAGES)
      .createSignedUrl(key, expiresIn);

    if (error) {
      console.error('Signed URL generation error:', error);
      return null;
    }

    return data?.signedUrl ?? null;
  } catch (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }
}

/**
 * Generates signed URLs for multiple storage files
 * @param storageUrls - Array of storage URLs
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Array of signed URLs (null for failed generations)
 */
export async function generateSignedUrls(
  storageUrls: (string | null)[],
  expiresIn: number = PREVIEW_SIGNED_URL_EXPIRATION
): Promise<(string | null)[]> {
  return Promise.all(
    storageUrls.map(async (url) => {
      if (!url) return null;
      return generateSignedUrl(url, expiresIn);
    })
  );
}
