-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8B9A7F',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create items table for storing URLs, notes, and images
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('url', 'note', 'image')),
  title TEXT NOT NULL,
  content TEXT, -- URL or note content
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  preview_image_url TEXT,
  user_notes TEXT, -- Personal notes in markdown
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tag_icons table for custom AI-generated icons
CREATE TABLE public.tag_icons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_name TEXT NOT NULL UNIQUE,
  icon_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_icons ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required)
CREATE POLICY "Allow public read access to categories" 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Allow public write access to categories" 
ON public.categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to categories" 
ON public.categories FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to categories" 
ON public.categories FOR DELETE USING (true);

CREATE POLICY "Allow public read access to items" 
ON public.items FOR SELECT USING (true);

CREATE POLICY "Allow public write access to items" 
ON public.items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to items" 
ON public.items FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to items" 
ON public.items FOR DELETE USING (true);

CREATE POLICY "Allow public read access to tag_icons" 
ON public.tag_icons FOR SELECT USING (true);

CREATE POLICY "Allow public write access to tag_icons" 
ON public.tag_icons FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to tag_icons" 
ON public.tag_icons FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to tag_icons" 
ON public.tag_icons FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

-- Create storage policies
CREATE POLICY "Public can view images" 
ON storage.objects FOR SELECT USING (bucket_id = 'item-images');

CREATE POLICY "Public can upload images" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Public can update images" 
ON storage.objects FOR UPDATE USING (bucket_id = 'item-images');

CREATE POLICY "Public can delete images" 
ON storage.objects FOR DELETE USING (bucket_id = 'item-images');