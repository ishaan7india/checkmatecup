-- Add rating column to profiles table with default 1200
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating integer DEFAULT 1200;