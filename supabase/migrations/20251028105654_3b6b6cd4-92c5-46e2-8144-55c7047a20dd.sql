-- Add user_id columns to tables
ALTER TABLE public.items ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tag_icons ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id NOT NULL (after adding the column to allow existing data)
-- For existing data, we'll need to handle this separately, but for new installs this is fine
ALTER TABLE public.items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.tag_icons ALTER COLUMN user_id SET NOT NULL;

-- Drop old public policies
DROP POLICY IF EXISTS "Allow public read access to items" ON public.items;
DROP POLICY IF EXISTS "Allow public write access to items" ON public.items;
DROP POLICY IF EXISTS "Allow public update access to items" ON public.items;
DROP POLICY IF EXISTS "Allow public delete access to items" ON public.items;

DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public write access to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public update access to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public delete access to categories" ON public.categories;

DROP POLICY IF EXISTS "Allow public read access to tag_icons" ON public.tag_icons;
DROP POLICY IF EXISTS "Allow public write access to tag_icons" ON public.tag_icons;
DROP POLICY IF EXISTS "Allow public update access to tag_icons" ON public.tag_icons;
DROP POLICY IF EXISTS "Allow public delete access to tag_icons" ON public.tag_icons;

-- Create owner-based RLS policies for items
CREATE POLICY "Users can view own items" ON public.items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own items" ON public.items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" ON public.items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items" ON public.items
  FOR DELETE USING (auth.uid() = user_id);

-- Create owner-based RLS policies for categories
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create owner-based RLS policies for tag_icons
CREATE POLICY "Users can view own tag_icons" ON public.tag_icons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tag_icons" ON public.tag_icons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tag_icons" ON public.tag_icons
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tag_icons" ON public.tag_icons
  FOR DELETE USING (auth.uid() = user_id);

-- Drop old public storage policies
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can update images" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete images" ON storage.objects;

-- Update storage bucket to be private
UPDATE storage.buckets SET public = false WHERE id = 'item-images';

-- Create user-specific storage policies
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