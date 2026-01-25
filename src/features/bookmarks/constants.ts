export const DEFAULT_ITEM_TAG = "read later" as const;
export const DEFAULT_ITEM_TAGS: string[] = [DEFAULT_ITEM_TAG];

export const CATEGORY_OPTIONS = [
  { value: "watch later", label: "⏰ Watch Later" },
  { value: "read later", label: "📖 Read Later" },
  { value: "wishlist", label: "⭐ Wishlist" },
  { value: "work on", label: "🛠 Work On" },
] as const;

export const CATEGORY_VALUES: string[] = CATEGORY_OPTIONS.map((option) => option.value);
export const CATEGORY_SUGGESTIONS: string[] = [...CATEGORY_VALUES];

export const ALLOWED_FILE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
] as const;

export const FILE_INPUT_ACCEPT = [
  ...ALLOWED_FILE_MIME_TYPES,
  ".pdf",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".csv",
  ".pptx",
  ".ppt",
  ".txt",
  ".mp4",
  ".mov",
  ".avi",
  ".webm",
].join(",");

export const FILE_SIZE_LIMIT_MB = 20;
export const FILE_SIZE_LIMIT_BYTES = FILE_SIZE_LIMIT_MB * 1024 * 1024;

export const URL_MAX_LENGTH = 2048;
export const NOTE_MAX_LENGTH = 100000;
export const NOTE_TITLE_MAX_LENGTH = 100;
export const NOTE_SUMMARY_MAX_LENGTH = 200;

export const SUPABASE_ITEMS_TABLE = "items" as const;
export {
  SUPABASE_STORAGE_BUCKET_ITEM_IMAGES,
  SUPABASE_STORAGE_BUCKET_THUMBNAILS,
  SUPABASE_STORAGE_ITEM_IMAGES_PATH_PREFIX,
  SUPABASE_STORAGE_THUMBNAILS_PATH_PREFIX,
} from "@/shared/lib/storage-constants";
export const SUPABASE_FUNCTION_ANALYZE_URL = "analyze-url" as const;
export const SUPABASE_FUNCTION_ANALYZE_FILE = "analyze-file" as const;
export const SUPABASE_FUNCTION_GENERATE_EMBEDDING = "generate-embedding" as const;

export const FILE_ANALYSIS_SIGNED_URL_EXPIRATION = 60 * 10;
export const PREVIEW_SIGNED_URL_EXPIRATION = 60 * 60;

// Thumbnail generation constants
// Higher resolution for better preview quality on high-DPI displays
export const THUMBNAIL_WIDTH = 800;
export const THUMBNAIL_HEIGHT = 450;
export const THUMBNAIL_QUALITY = 0.9;

// Embedding configuration (must match database vector dimension)
export const EMBEDDING_DIMENSION = 1536;

/**
 * Validates that an embedding has the correct dimension
 */
export function isValidEmbedding(embedding: unknown): embedding is number[] {
  return Array.isArray(embedding) && embedding.length === EMBEDDING_DIMENSION;
}
