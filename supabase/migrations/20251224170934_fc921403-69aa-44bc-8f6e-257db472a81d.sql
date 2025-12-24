-- Add ready status columns to games table
ALTER TABLE public.games 
ADD COLUMN white_ready boolean DEFAULT false,
ADD COLUMN black_ready boolean DEFAULT false;