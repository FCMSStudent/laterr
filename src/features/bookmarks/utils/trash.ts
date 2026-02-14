import { supabase } from "@/integrations/supabase/client";
import type { Item } from "@/features/bookmarks/types";
import {
  SUPABASE_STORAGE_BUCKET_ITEM_IMAGES,
  SUPABASE_STORAGE_BUCKET_THUMBNAILS,
} from "@/shared/lib/storage-constants";

// Define allowed bucket types as a union of literal types
type AllowedBucket = typeof SUPABASE_STORAGE_BUCKET_ITEM_IMAGES | typeof SUPABASE_STORAGE_BUCKET_THUMBNAILS;

type StorageObjectRef = {
  bucket: AllowedBucket;
  key: string;
};

const isAllowedBucket = (bucket: string): bucket is AllowedBucket => {
  return bucket === SUPABASE_STORAGE_BUCKET_ITEM_IMAGES || 
         bucket === SUPABASE_STORAGE_BUCKET_THUMBNAILS;
};

const extractFromPath = (path: string): StorageObjectRef | null => {
  const match = path.match(/^\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const bucket = match[1];
  const key = match[2];
  if (!isAllowedBucket(bucket) || !key) return null;
  return { bucket, key };
};

const extractFromUrlPath = (pathname: string): StorageObjectRef | null => {
  const match = pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const bucket = match[1];
  const key = match[2];
  if (!isAllowedBucket(bucket) || !key) return null;
  return { bucket, key };
};

export const extractStorageObjectRef = (value: string | null | undefined): StorageObjectRef | null => {
  if (!value) return null;

  if (value.startsWith("/")) {
    return extractFromPath(value);
  }

  try {
    const url = new URL(value);
    return extractFromUrlPath(url.pathname);
  } catch {
    return null;
  }
};

export const collectItemStorageRefs = (item: Item): StorageObjectRef[] => {
  const refs = new Map<string, StorageObjectRef>();
  const contentRef = extractStorageObjectRef(item.content);
  const previewRef = extractStorageObjectRef(item.preview_image_url);

  if (contentRef) {
    refs.set(`${contentRef.bucket}/${contentRef.key}`, contentRef);
  }
  if (previewRef) {
    refs.set(`${previewRef.bucket}/${previewRef.key}`, previewRef);
  }

  return Array.from(refs.values());
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const removeItemStorageObjects = async (item: Item): Promise<void> => {
  return removeMultipleItemsStorageObjects([item]);
};

/**
 * Removes storage objects for multiple items in batches.
 * Optimized to minimize API calls by grouping by bucket and chunking.
 */
export const removeMultipleItemsStorageObjects = async (items: Item[]): Promise<void> => {
  if (items.length === 0) return;

  const allRefs: StorageObjectRef[] = [];
  items.forEach(item => {
    allRefs.push(...collectItemStorageRefs(item));
  });

  if (allRefs.length === 0) return;

  // Group by bucket and deduplicate keys within each bucket
  const grouped = new Map<string, Set<string>>();
  allRefs.forEach((ref) => {
    if (!grouped.has(ref.bucket)) {
      grouped.set(ref.bucket, new Set());
    }
    grouped.get(ref.bucket)!.add(ref.key);
  });

  const promises: Promise<void>[] = [];

  for (const [bucket, keySet] of grouped.entries()) {
    const keys = Array.from(keySet);
    const keyChunks = chunk(keys, 100);

    for (const keyBatch of keyChunks) {
      promises.push(
        supabase.storage.from(bucket).remove(keyBatch).then(({ error }) => {
          if (error) {
            console.warn("Failed to remove storage objects", {
              bucket,
              keys: keyBatch,
              error,
            });
          }
        })
      );
    }
  }

  await Promise.all(promises);
};
