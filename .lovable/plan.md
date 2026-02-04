
# Fix: Add Missing Database Columns for URL Bookmarks

## Problem Identified

When you paste a URL and click "Add URL", the database insert fails with:
```
Could not find the 'category' column of 'items' in the schema cache
```

The frontend code is trying to save two fields (`category` and `metadata`) that don't exist in the database yet.

## Root Cause

The code was updated to send enhanced metadata from URL analysis, but the corresponding database migration was never applied. The `items` table is missing:
1. `category` - A text field for the item category
2. `metadata` - A JSONB field for extended metadata (author, platform, contentType, etc.)

## Solution

### Step 1: Add Missing Columns to Database

Run a database migration to add the two missing columns:

```sql
ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS metadata JSONB;
```

This will:
- Add a `category` text column (nullable) for storing categories like "article", "video", etc.
- Add a `metadata` JSONB column (nullable) for storing extended metadata from URL analysis

### Step 2: Verify the Fix

After the migration runs, the URL bookmark flow will work:
1. Paste URL → Click "Add URL"
2. URL is analyzed for metadata
3. Embeddings are generated
4. Item is saved to database with all metadata
5. Success toast appears

## Files to Modify

| File | Change |
|------|--------|
| Database Migration | Add `category` and `metadata` columns to `items` table |

## Technical Details

- Both columns are nullable to maintain backward compatibility with existing items
- The `metadata` JSONB field stores: author, platform, contentType, siteName, publishedTime, confidence
- No code changes needed - the frontend already sends these fields correctly
