-- Create media table
CREATE TABLE IF NOT EXISTS public.media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  user_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_media_user_id ON public.media(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_media_created_at ON public.media(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own media
CREATE POLICY "Users can view their own media"
  ON public.media
  FOR SELECT
  USING (auth.uid()::text = user_id OR user_id = 'guest');

-- Create policy: Users can insert their own media
CREATE POLICY "Users can insert their own media"
  ON public.media
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id = 'guest');

-- Create policy: Users can delete their own media
CREATE POLICY "Users can delete their own media"
  ON public.media
  FOR DELETE
  USING (auth.uid()::text = user_id OR user_id = 'guest');

-- Create storage bucket for media
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy: Anyone can upload to their own folder
CREATE POLICY "Users can upload their own media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'guest')
  );

-- Create storage policy: Anyone can view media
CREATE POLICY "Media is publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'media');

-- Create storage policy: Users can delete their own media
CREATE POLICY "Users can delete their own media"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'media' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'guest')
  );
