-- ============================================================
-- Migration: Fix posts schema after create-post revamp
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Relax NOT NULL constraints (my_response & my_affirmation are now optional)
ALTER TABLE public.posts ALTER COLUMN my_response DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN my_word DROP NOT NULL;

-- 2. Handle my_confession -> my_affirmation rename
--    (adds my_affirmation if the rename hasn't happened yet)
DO $$
BEGIN
    -- If my_confession still exists, rename it to my_affirmation
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'posts'
          AND column_name  = 'my_confession'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'posts'
          AND column_name  = 'my_affirmation'
    ) THEN
        ALTER TABLE public.posts RENAME COLUMN my_confession TO my_affirmation;
    END IF;

    -- If my_affirmation doesn't exist at all, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'posts'
          AND column_name  = 'my_affirmation'
    ) THEN
        ALTER TABLE public.posts ADD COLUMN my_affirmation TEXT CHECK (char_length(my_affirmation) <= 400);
    END IF;
END $$;

-- 3. Drop the NOT NULL from my_affirmation if it was set
ALTER TABLE public.posts ALTER COLUMN my_affirmation DROP NOT NULL;

-- 4. Drop NOT NULL from session_title (legacy column, no longer used)
ALTER TABLE public.posts ALTER COLUMN session_title DROP NOT NULL;

-- 5. Add missing columns (safe — uses IF NOT EXISTS)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS service_type TEXT
    CHECK (service_type IN ('sunday_service','midweek_service','personal_bible_study','prayer_time','conference','others'));

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS preacher TEXT;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS my_testimony TEXT
    CHECK (char_length(my_testimony) <= 400);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS prayer_points JSONB;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS link_url TEXT;

-- 6. Create index on service_type for filtering
CREATE INDEX IF NOT EXISTS idx_posts_service_type ON public.posts(service_type);

-- ============================================================
-- Verification: run this SELECT to confirm columns exist
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'posts'
-- ORDER BY ordinal_position;
-- ============================================================
