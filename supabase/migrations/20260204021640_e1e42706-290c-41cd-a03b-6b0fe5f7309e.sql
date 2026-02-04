-- Add missing columns to items table for enhanced URL metadata storage

-- Add category column for storing item categories (article, video, etc.)
ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT;

-- Add metadata column for storing extended metadata from URL analysis
-- Stores: author, platform, contentType, siteName, publishedTime, confidence
ALTER TABLE items ADD COLUMN IF NOT EXISTS metadata JSONB;