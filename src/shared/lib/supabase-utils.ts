/**
 * Supabase utility functions for common operations like signed URL generation,
 * file uploads, and other Supabase-related tasks
 */

import { supabase } from "@/integrations/supabase/client";
import {
  SUPABASE_STORAGE_BUCKET_ITEM_IMAGES,
  SUPABASE_STORAGE_BUCKET_THUMBNAILS,
  SUPABASE_STORAGE_ITEM_IMAGES_PATH_PREFIX,
  SUPABASE_STORAGE_THUMBNAILS_PATH_PREFIX,
  PREVIEW_SIGNED_URL_EXPIRATION,
} from "@/constants";
import type { Item } from "@/types";

/**
 * Generates a signed URL from a storage path
 * @param storagePath - The full storage path (e.g., "/item-images/path/to/file.jpg")
 * @param expiresIn - Number of seconds until the signed URL expires
 * @returns The signed URL or null if generation fails
 */
export async function generateSignedUrl(
  storagePath: string,
  expiresIn: number = PREVIEW_SIGNED_URL_EXPIRATION
): Promise<string | null> {
  try {
    const marker = SUPABASE_STORAGE_ITEM_IMAGES_PATH_PREFIX;
    const idx = storagePath.indexOf(marker);
    
    if (idx === -1) {
      return null;
    }

    const key = storagePath.substring(idx + marker.length);
    const { data, error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET_ITEM_IMAGES)
      .createSignedUrl(key, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (e) {
    console.error('Failed to create signed URL', e);
    return null;
  }
}

/**
 * Generates signed URLs for an array of items with preview images
 * @param items - Array of items to process
 * @returns Array of items with signed URLs for preview images
 * 
 * Note: Processes all items concurrently. For very large datasets, consider batching.
 * Individual failures are caught and logged without affecting other items.
 */
export async function generateSignedUrlsForItems(items: Item[]): Promise<Item[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.preview_image_url) {
        return item;
      }

      try {
        const signedUrl = await generateSignedUrl(item.preview_image_url);
        if (signedUrl) {
          return { ...item, preview_image_url: signedUrl };
        }
      } catch (e) {
        console.error('Failed to create signed URL for item:', item.id, e);
      }

      return item;
    })
  );
}

/**
 * Uploads a file to Supabase storage
 * @param file - The file to upload
 * @param userId - The user ID for path organization
 * @returns Object containing the file name and storage path
 * @throws Error if upload fails
 */
export async function uploadFileToStorage(
  file: File,
  userId: string
): Promise<{ fileName: string; storagePath: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET_ITEM_IMAGES)
    .upload(fileName, file);

  if (uploadError) {
    throw uploadError;
  }

  // Return storage path instead of public URL for private buckets
  const storagePath = `${SUPABASE_STORAGE_ITEM_IMAGES_PATH_PREFIX}${fileName}`;

  return { fileName, storagePath };
}

/**
 * Creates a signed URL for a file that was just uploaded
 * @param fileName - The file name in storage
 * @param expiresIn - Number of seconds until the signed URL expires
 * @returns The signed URL
 * @throws Error if signed URL creation fails
 */
export async function createSignedUrlForFile(
  fileName: string,
  expiresIn: number
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET_ITEM_IMAGES)
    .createSignedUrl(fileName, expiresIn);

  if (error || !data?.signedUrl) {
    throw error || new Error('Failed to create signed URL');
  }

  return data.signedUrl;
}

/**
 * Uploads a thumbnail to Supabase storage
 * @param thumbnailBlob - The thumbnail blob to upload
 * @param userId - The user ID for path organization
 * @returns The public URL of the uploaded thumbnail
 * @throws Error if upload fails
 */
export async function uploadThumbnailToStorage(
  thumbnailBlob: Blob,
  userId: string
): Promise<string> {
  const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.jpg`;
  
  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET_THUMBNAILS)
    .upload(fileName, thumbnailBlob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

  if (uploadError) {
    throw uploadError;
  }

  // Return the public URL since thumbnails bucket is public
  const { data } = supabase.storage
    .from(SUPABASE_STORAGE_BUCKET_THUMBNAILS)
    .getPublicUrl(fileName);

  return data.publicUrl;
}
