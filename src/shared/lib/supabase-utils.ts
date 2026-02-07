/**
 * Supabase utility functions for common operations like signed URL generation,
 * file uploads, and other Supabase-related tasks
 */

import { supabase } from "@/integrations/supabase/client";
import { PREVIEW_SIGNED_URL_EXPIRATION } from "@/features/bookmarks/constants";
import {
  SUPABASE_STORAGE_BUCKET_ITEM_IMAGES,
  SUPABASE_STORAGE_BUCKET_THUMBNAILS,
  SUPABASE_STORAGE_ITEM_IMAGES_PATH_PREFIX,
} from "@/shared/lib/storage-constants";
import type { Item } from "@/features/bookmarks/types";

export interface UploadValidationOptions {
  allowedMimeTypes?: readonly string[];
  maxFileSizeBytes?: number;
}

export interface UploadValidationError {
  code: 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'NO_FILE';
  message: string;
}

/**
 * Validates a file for upload based on provided options
 * @throws UploadValidationError if validation fails
 */
export function validateFileForUpload(file: File | null, options?: UploadValidationOptions): void {
  if (!file) {
    throw { code: 'NO_FILE', message: 'No file provided' } as UploadValidationError;
  }

  if (options?.maxFileSizeBytes && file.size > options.maxFileSizeBytes) {
    const maxSizeMB = Math.round(options.maxFileSizeBytes / (1024 * 1024));
    throw { 
      code: 'FILE_TOO_LARGE', 
      message: `File size exceeds ${maxSizeMB}MB limit` 
    } as UploadValidationError;
  }

  if (options?.allowedMimeTypes && !options.allowedMimeTypes.includes(file.type)) {
    throw { 
      code: 'INVALID_FILE_TYPE', 
      message: `File type ${file.type} is not supported` 
    } as UploadValidationError;
  }
}

interface StorageUploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
}

interface StorageUploadConfig {
  bucket: string;
  userId: string;
  folder: string;
  file: File;
  options?: {
    uploadOptions?: StorageUploadOptions;
    signedUrlExpiresIn?: number;
  };
}

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
 * Note: Batches requests to Supabase storage to reduce network overhead.
 * Individual failures are caught and logged without affecting other items.
 */
export async function generateSignedUrlsForItems(items: Item[]): Promise<Item[]> {
  const marker = SUPABASE_STORAGE_ITEM_IMAGES_PATH_PREFIX;

  // Identify items that need processing and extract their storage keys
  const itemsToProcess = items
    .filter(item => item.preview_image_url && item.preview_image_url.includes(marker))
    .map(item => {
      const idx = item.preview_image_url!.indexOf(marker);
      const key = item.preview_image_url!.substring(idx + marker.length);
      return { id: item.id, key };
    });

  if (itemsToProcess.length === 0) {
    return items;
  }

  // Deduplicate keys to minimize API calls
  const uniqueKeys = Array.from(new Set(itemsToProcess.map(i => i.key)));

  try {
    const { data, error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET_ITEM_IMAGES)
      .createSignedUrls(uniqueKeys, PREVIEW_SIGNED_URL_EXPIRATION);

    if (error) throw error;

    // Create a lookup map for signed URLs: path -> signedUrl
    const signedUrlsMap = new Map<string, string>();
    data?.forEach(entry => {
      if (entry.signedUrl && !entry.error) {
        signedUrlsMap.set(entry.path || '', entry.signedUrl);
      } else if (entry.error) {
        console.error(`Failed to create signed URL for path ${entry.path}:`, entry.error);
      }
    });

    // Map of itemId to its respective storage key for O(1) lookup during item mapping
    const itemKeyMap = new Map(itemsToProcess.map(i => [i.id, i.key]));

    // Return items with their updated signed URLs
    return items.map(item => {
      const key = itemKeyMap.get(item.id);
      if (key && signedUrlsMap.has(key)) {
        return {
          ...item,
          preview_image_url: signedUrlsMap.get(key)
        };
      }
      return item;
    });
  } catch (e) {
    console.error('Failed to create batched signed URLs:', e);
    // On error, return original items. Alternatively, we could fallback to individual requests,
    // but a batch failure usually indicates a larger issue (auth, network, etc.)
    return items;
  }
}

/**
 * Uploads a file to Supabase storage with optional signed URL generation.
 */
export async function uploadFileToStorageWithSignedUrl({
  bucket,
  userId,
  folder,
  file,
  options,
}: StorageUploadConfig): Promise<{ fileName: string; storagePath: string; signedUrl?: string }> {
  const fileExt = file.name.split('.').pop() || 'bin';
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  const fileName = folder
    ? `${userId}/${folder}/${uniqueName}`
    : `${userId}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, options?.uploadOptions);

  if (uploadError) {
    throw uploadError;
  }

  const storagePath = `/${bucket}/${fileName}`;
  let signedUrl: string | undefined;

  if (options?.signedUrlExpiresIn) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, options.signedUrlExpiresIn);

    if (error || !data?.signedUrl) {
      throw error || new Error('Failed to create signed URL');
    }

    signedUrl = data.signedUrl;
  }

  return { fileName, storagePath, signedUrl };
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
