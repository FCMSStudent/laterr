-- Update the items_type_check constraint to include document and file types
ALTER TABLE items DROP CONSTRAINT items_type_check;

ALTER TABLE items ADD CONSTRAINT items_type_check 
CHECK (type = ANY (ARRAY['url'::text, 'note'::text, 'image'::text, 'document'::text, 'file'::text]));