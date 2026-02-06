import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type StorageObjectRef = {
  bucket: string;
  key: string;
};

const ALLOWED_BUCKETS = new Set(["item-images", "thumbnails"]);

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

const extractStorageObjectRef = (value: string | null | undefined): StorageObjectRef | null => {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== cronSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Supabase credentials are not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const batchSize = 200;
  let totalDeleted = 0;
  let totalErrors = 0;

  while (true) {
    const { data, error } = await supabase
      .from("items")
      .select("id, content, preview_image_url")
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff)
      .order("deleted_at", { ascending: true })
      .range(0, batchSize - 1);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data || data.length === 0) break;

    const ids = data.map((row) => row.id);
    const refsMap = new Map<string, StorageObjectRef>();

    data.forEach((row) => {
      const contentRef = extractStorageObjectRef(row.content);
      const previewRef = extractStorageObjectRef(row.preview_image_url);

      if (contentRef) refsMap.set(`${contentRef.bucket}/${contentRef.key}`, contentRef);
      if (previewRef) refsMap.set(`${previewRef.bucket}/${previewRef.key}`, previewRef);
    });

    const groupedRefs = groupRefsByBucket(Array.from(refsMap.values()));
    for (const [bucket, keys] of groupedRefs.entries()) {
      const keyChunks = chunk(keys, 100);
      for (const keyBatch of keyChunks) {
        const { error: removeError } = await supabase.storage.from(bucket).remove(keyBatch);
        if (removeError) {
          console.warn("Failed to remove storage objects", { bucket, keys: keyBatch, error: removeError });
        }
      }
    }

    const { error: deleteError } = await supabase.from("items").delete().in("id", ids);
    if (deleteError) {
      totalErrors += ids.length;
    } else {
      totalDeleted += ids.length;
    }

  }

  return new Response(
    JSON.stringify({
      deleted: totalDeleted,
      errors: totalErrors,
      cutoff,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
