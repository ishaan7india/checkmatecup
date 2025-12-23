-- Add unique constraint for tournament_players to enable upsert
ALTER TABLE public.tournament_players 
ADD CONSTRAINT tournament_players_tournament_player_unique 
UNIQUE (tournament_id, player_id);