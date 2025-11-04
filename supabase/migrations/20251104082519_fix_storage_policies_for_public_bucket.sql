-- Fix storage policies to work with public bucket
-- The bucket was made public for AI gateway access, but policies still restrict access

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Create new policies that work with public bucket
-- Allow authenticated users to upload to their own folder
-- Note: This relies on the user ID being the first folder in the path (userId/filename.ext)
-- The uploadFileToStorage function enforces this pattern
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
