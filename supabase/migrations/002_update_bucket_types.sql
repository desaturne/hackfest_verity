-- Allow video mime types in the media bucket
-- This updates the existing 'media' bucket to allow video/webm and video/mp4, or removes restrictions entirely.

-- Option 1: Allow specific types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'video/webm', 'video/mp4']
WHERE id = 'media';

-- Option 2: Allow all types (Uncomment to use this instead)
-- UPDATE storage.buckets
-- SET allowed_mime_types = null
-- WHERE id = 'media';