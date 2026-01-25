-- Add status, archived_at, and trashed_at columns to items table
-- This enables the archive/trash functionality for bookmarks

-- Add status column with default 'active'
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Add archived_at timestamp (when item was marked as read/watched)
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add trashed_at timestamp (when item was moved to trash)
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMP WITH TIME ZONE;

-- Add check constraint for valid status values
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_status_check;
ALTER TABLE public.items ADD CONSTRAINT items_status_check 
  CHECK (status IN ('active', 'archived', 'trashed'));

-- Create index on status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);

-- Create index on trashed_at for finding items to auto-delete after retention period
CREATE INDEX IF NOT EXISTS idx_items_trashed_at ON public.items(trashed_at) WHERE trashed_at IS NOT NULL;
