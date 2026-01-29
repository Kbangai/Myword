-- Migration: Add new columns for enhanced posts
-- Run this migration after 001_initial_schema.sql

-- Add service_type column
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS service_type TEXT CHECK (
    service_type IN ('sunday_service', 'midweek_service', 'personal_bible_study', 'prayer_time', 'conference', 'others')
);

-- Add preacher column (replacing session_title concept)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS preacher TEXT;

-- Rename my_confession to my_affirmation (if column exists, add new one)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS my_affirmation TEXT CHECK (char_length(my_affirmation) <= 400);

-- Rename additional_notes to my_testimony
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS my_testimony TEXT CHECK (char_length(my_testimony) <= 400);

-- Add prayer_points as JSON array (up to 10 points)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS prayer_points JSONB;

-- Add media attachment columns
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS link_url TEXT;

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create index on service_type for filtering
CREATE INDEX IF NOT EXISTS idx_posts_service_type ON public.posts(service_type);

-- Add check constraint for prayer_points array length
-- Note: This uses a function to validate the array length
CREATE OR REPLACE FUNCTION check_prayer_points_length(points JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    IF points IS NULL THEN
        RETURN TRUE;
    END IF;
    RETURN jsonb_array_length(points) <= 10;
END;
$$ LANGUAGE plpgsql;

-- Add constraint if not exists (PostgreSQL 9.4+)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_prayer_points_max_10'
    ) THEN
        ALTER TABLE public.posts 
        ADD CONSTRAINT check_prayer_points_max_10 
        CHECK (check_prayer_points_length(prayer_points));
    END IF;
END $$;

-- Comments for documentation
COMMENT ON COLUMN public.posts.service_type IS 'Type of service: sunday_service, midweek_service, personal_bible_study, prayer_time, conference, others';
COMMENT ON COLUMN public.posts.preacher IS 'Name of the preacher/minister (optional)';
COMMENT ON COLUMN public.posts.my_affirmation IS 'User affirmation or declaration of faith';
COMMENT ON COLUMN public.posts.my_testimony IS 'User testimony or experience sharing (optional)';
COMMENT ON COLUMN public.posts.prayer_points IS 'Array of prayer points (up to 10)';
COMMENT ON COLUMN public.posts.image_url IS 'URL to attached image (uploaded or external)';
COMMENT ON COLUMN public.posts.link_url IS 'External link attachment';
COMMENT ON COLUMN public.posts.audio_url IS 'URL to voice note recording';

-- Create storage buckets for images and audio (run in Supabase dashboard or via API)
-- Note: Storage bucket creation must be done via Supabase dashboard or management API
-- 1. Create bucket 'post-images' (public)
-- 2. Create bucket 'post-audio' (public)
-- 3. Allow authenticated users to upload to both buckets
-- 4. Allow public read access to both buckets
