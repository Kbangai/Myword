-- Relax constraints on existing columns
ALTER TABLE public.posts ALTER COLUMN session_title DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN my_response DROP NOT NULL;

-- Rename my_confession to my_affirmation and relax constraint
ALTER TABLE public.posts RENAME COLUMN my_confession TO my_affirmation;
ALTER TABLE public.posts ALTER COLUMN my_affirmation DROP NOT NULL;

-- Add new columns
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS preacher TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS my_testimony TEXT CHECK (char_length(my_testimony) <= 400);
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS prayer_points TEXT[];
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Create storage bucket for post images if it doesn't exist
-- Note: This requires the storage extension/schema to be present.
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
-- Allow public read access to post-images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'post-images' );

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'post-images' AND auth.role() = 'authenticated' );
