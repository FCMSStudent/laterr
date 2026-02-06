-- Add deleted_at column for soft delete functionality
ALTER TABLE public.items 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient trash queries
CREATE INDEX idx_items_deleted_at ON public.items(deleted_at);

-- Add comment for documentation
COMMENT ON COLUMN public.items.deleted_at IS 'Timestamp when item was soft-deleted (moved to trash). NULL means item is active.';