# File Upload Fix - Deployment Guide

## Issue Summary
File uploads were failing with the error: "Failed to Add Item - Unable to add this item to your collection. Please try again."

## Root Cause
The storage bucket was made public (for AI gateway access) but the RLS policies still restricted access to user-specific folders only. This created a conflict where:
1. The bucket was public (migration `20251104063033`)
2. But storage policies from migration `20251028105654` still enforced user-specific folder restrictions
3. This caused uploads to fail due to policy conflicts

## Solution
Created a new migration (`20251104082519_fix_storage_policies_for_public_bucket.sql`) that:
1. Drops the old restrictive policies
2. Adds new policies that allow:
   - Authenticated users to upload/update/delete files in their own folders
   - Public read access (needed for AI gateway and preview URLs)

## Deployment Steps

### Option 1: Using Supabase CLI (Recommended)
```bash
# 1. Install Supabase CLI if not already installed
npm install -g supabase

# 2. Link to your Supabase project
supabase link --project-ref opzypedbkufjiprbhogl

# 3. Push the migration to your database
supabase db push

# 4. Verify the migration was applied
supabase db list
```

### Option 2: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/opzypedbkufjiprbhogl
2. Navigate to **Database** → **Migrations**
3. Click **New Migration**
4. Copy the contents of `supabase/migrations/20251104082519_fix_storage_policies_for_public_bucket.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration

### Option 3: Manual SQL Execution
1. Go to https://supabase.com/dashboard/project/opzypedbkufjiprbhogl
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the following SQL:

```sql
-- Fix storage policies to work with public bucket
-- The bucket was made public for AI gateway access, but policies still restrict access

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Create new policies that work with public bucket
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'item-images' AND 
    auth.role() = 'authenticated' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'item-images' AND 
    auth.role() = 'authenticated' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'item-images' AND 
    auth.role() = 'authenticated' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access since bucket is public (needed for AI gateway and previews)
CREATE POLICY "Public read access for item images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'item-images'
  );
```

5. Click **Run** to execute

## Verification Steps

### 1. Check Storage Policies
```sql
-- Run this query in SQL Editor to verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;
```

Expected output should show:
- `Authenticated users can upload to own folder` (INSERT)
- `Authenticated users can update own files` (UPDATE)
- `Authenticated users can delete own files` (DELETE)
- `Public read access for item images` (SELECT)

### 2. Check Bucket Configuration
```sql
-- Run this query to verify bucket is public
SELECT id, name, public
FROM storage.buckets
WHERE id = 'item-images';
```

Expected output: `public` should be `true`

### 3. Test File Upload
1. Log into your application
2. Click "Add Item" button
3. Switch to "Files" tab
4. Select a test image (JPG, PNG, or GIF)
5. Click "Upload File"
6. Verify:
   - File uploads successfully
   - No error messages appear
   - Item appears in your collection with preview image
   - AI analysis completes and shows title/summary

### 4. Test Different File Types
Repeat the upload test with:
- [ ] Image file (JPG/PNG/GIF)
- [ ] PDF file
- [ ] Word document (.docx)

All should upload and analyze successfully.

## Rollback Plan

If issues occur, you can rollback by re-applying the old policies:

```sql
-- Rollback: Restore old policies
DROP POLICY IF EXISTS "Authenticated users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for item images" ON storage.objects;

CREATE POLICY "Users can view own images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'item-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'item-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'item-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'item-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Troubleshooting

### Issue: "Still getting upload errors after migration"
**Solution**: Clear your browser cache and retry. The Supabase client may have cached the old policy configuration.

### Issue: "AI analysis fails with 403 error"
**Solution**: Verify that:
1. The bucket is public (`SELECT public FROM storage.buckets WHERE id = 'item-images'` should return `true`)
2. The "Public read access for item images" policy exists
3. Edge Functions have `verify_jwt = true` in `supabase/config.toml`

### Issue: "Other users can see my uploaded files"
**Solution**: This is expected for public read access. Files are organized by user folder and items are protected by RLS on the `items` table. Only you can see your items in the UI, but the storage files themselves are publicly readable (needed for AI processing).

If this is a concern, consider implementing signed URLs for preview images instead of public URLs.

## Support
If you continue to experience issues after following this guide, please:
1. Check browser console for detailed error messages
2. Check Supabase logs in the Dashboard
3. Verify your authentication is working correctly
4. Contact support with the specific error message
