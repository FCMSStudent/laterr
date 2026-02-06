import { supabase } from "@/integrations/supabase/client";
import type { Item } from "@/features/bookmarks/types";
import {
  SUPABASE_STORAGE_BUCKET_ITEM_IMAGES,
  SUPABASE_STORAGE_BUCKET_THUMBNAILS,
} from "@/shared/lib/storage-constants";

type StorageObjectRef = {
  bucket: string;
  key: string;
};

const ALLOWED_BUCKETS = new Set([
  SUPABASE_STORAGE_BUCKET_ITEM_IMAGES,
  SUPABASE_STORAGE_BUCKET_THUMBNAILS,
]);

const extractFromPath = (path: string): StorageObjectRef | null => {
  const match = path.match(/^\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const bucket = match[1];
  const key = match[2];
  if (!ALLOWED_BUCKETS.has(bucket) || !key) return null;
  return { bucket, key };
};

const extractFromUrlPath = (pathname: string): StorageObjectRef | null => {
  const match = pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const bucket = match[1];
  const key = match[2];
  if (!ALLOWED_BUCKETS.has(bucket) || !key) return null;
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

const groupRefsByBucket = (refs: StorageObjectRef[]): Map<string, string[]> => {
  const grouped = new Map<string, string[]>();
  refs.forEach((ref) => {
    const current = grouped.get(ref.bucket) ?? [];
    current.push(ref.key);
    grouped.set(ref.bucket, current);
  });
  return grouped;
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const removeItemStorageObjects = async (item: Item): Promise<void> => {
  const refs = collectItemStorageRefs(item);
  if (refs.length === 0) return;

  const grouped = groupRefsByBucket(refs);
  for (const [bucket, keys] of grouped.entries()) {
    const keyChunks = chunk(keys, 100);
    for (const keyBatch of keyChunks) {
      const { error } = await supabase.storage.from(bucket).remove(keyBatch);
      if (error) {
        console.warn("Failed to remove storage objects", {
          bucket,
          keys: keyBatch,
          error,
        });
      }
    }
  }
};
