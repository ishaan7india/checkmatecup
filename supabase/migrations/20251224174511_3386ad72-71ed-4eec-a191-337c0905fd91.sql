-- Add draw offer tracking to games table
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS draw_offered_by uuid DEFAULT NULL;

-- Add rating columns to player display query capability
COMMENT ON COLUMN public.games.draw_offered_by IS 'Player ID who offered a draw, null if no offer pending';