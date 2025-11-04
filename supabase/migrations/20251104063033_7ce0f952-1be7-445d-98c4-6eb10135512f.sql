-- Make the item-images bucket public so AI gateway can access files
UPDATE storage.buckets 
SET public = true 
WHERE id = 'item-images';