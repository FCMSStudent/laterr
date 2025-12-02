-- Create thumbnails storage bucket for storing generated preview thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true);

-- Add RLS policies for thumbnails bucket
-- Allow authenticated users to upload thumbnails to their own folder
CREATE POLICY "Users can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view thumbnails (public bucket)
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Allow users to delete their own thumbnails
CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);