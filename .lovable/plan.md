
# Fix "Failed to Load Items" Error

## Root Cause Analysis

The bookmarks page is failing due to **two separate issues**:

### Issue 1: Missing `deleted_at` Column in Database
The code attempts to query and filter by `deleted_at` column which doesn't exist in the `items` table.

**Current `items` table columns:**
- `id`, `type`, `title`, `content`, `summary`, `tags`, `category_id`, `preview_image_url`, `user_notes`, `created_at`, `updated_at`, `user_id`, `embedding`, `category`, `metadata`

**Missing column:** `deleted_at` (used for soft delete / trash functionality)

### Issue 2: TypeScript Build Error in `trash.ts`
The `supabase.storage.from(bucket)` call expects a literal bucket type, but receives a `string` variable.

```
src/features/bookmarks/utils/trash.ts(23,28): error TS2345: Argument of type 'string' is not assignable to parameter of type '"item-images" | "thumbnails"'.
```

---

## Implementation Plan

### Step 1: Add `deleted_at` Column to Database
Create a database migration to add the missing column:

```sql
-- Add deleted_at column for soft delete functionality
ALTER TABLE public.items 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient trash queries
CREATE INDEX idx_items_deleted_at ON public.items(deleted_at);

-- Add comment for documentation
COMMENT ON COLUMN public.items.deleted_at IS 'Timestamp when item was soft-deleted (moved to trash). NULL means item is active.';
```

### Step 2: Fix TypeScript Type Error in `trash.ts`
Update the `StorageObjectRef` type and `removeItemStorageObjects` function to use proper bucket types:

**File:** `src/features/bookmarks/utils/trash.ts`

Change the bucket type from `string` to a union of allowed bucket names:

```typescript
// Define allowed bucket types
type AllowedBucket = typeof SUPABASE_STORAGE_BUCKET_ITEM_IMAGES | typeof SUPABASE_STORAGE_BUCKET_THUMBNAILS;

type StorageObjectRef = {
  bucket: AllowedBucket;  // Change from string to AllowedBucket
  key: string;
};

// Update extraction functions to return the correct type
const extractFromPath = (path: string): StorageObjectRef | null => {
  const match = path.match(/^\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const bucket = match[1];
  const key = match[2];
  // Type guard to ensure bucket is an allowed value
  if (bucket !== SUPABASE_STORAGE_BUCKET_ITEM_IMAGES && 
      bucket !== SUPABASE_STORAGE_BUCKET_THUMBNAILS) {
    return null;
  }
  if (!key) return null;
  return { bucket, key };
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| Database Migration | Add `deleted_at` column to `items` table |
| `src/features/bookmarks/utils/trash.ts` | Fix bucket type from `string` to literal union type |

---

## Technical Details

### Why the App is Broken
1. The `fetchItems` function on line 115-126 queries with `deleted_at` filter
2. The database returns error: `column items.deleted_at does not exist`
3. The error triggers the catch block showing "Failed to Load Items"

### Database Migration Safety
- Adding a nullable column with `DEFAULT NULL` is non-breaking
- All existing rows will have `deleted_at = NULL` (treated as active items)
- The index improves query performance for trash view

### TypeScript Fix Approach
Using type guards ensures TypeScript knows the bucket is a valid literal type before passing it to `supabase.storage.from()`, resolving the type error while maintaining runtime validation.

---

## After Implementation

1. Build errors will be resolved
2. Bookmarks page will load successfully
3. Trash functionality (soft delete, restore, permanent delete) will work
4. Both light and dark mode will display correctly
