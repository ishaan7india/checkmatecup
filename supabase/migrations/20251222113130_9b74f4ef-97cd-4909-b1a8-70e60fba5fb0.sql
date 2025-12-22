-- Create enum for tournament formats
CREATE TYPE public.tournament_format AS ENUM (
  'swiss',
  'knockouts',
  'round_robin_playoffs',
  'swiss_playoffs',
  'swiss_super_league',
  'arena'
);

-- Create enum for tournament status
CREATE TYPE public.tournament_status AS ENUM (
  'registration',
  'in_progress',
  'completed'
);

-- Create enum for game result
CREATE TYPE public.game_result AS ENUM (
  'white_wins',
  'black_wins',
  'draw',
  'pending',
  'in_progress'
);

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'player');

-- Create profiles table for players
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  avatar_initials TEXT,
  score NUMERIC DEFAULT 0,
  rank INTEGER,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_drawn INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Christmas Gambit Cup 2K25',
  format tournament_format NOT NULL DEFAULT 'swiss',
  status tournament_status NOT NULL DEFAULT 'registration',
  time_control TEXT NOT NULL DEFAULT '10 | 5',
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create tournament_players junction table
CREATE TABLE public.tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC DEFAULT 0,
  buchholz NUMERIC DEFAULT 0,
  sonneborg_berger NUMERIC DEFAULT 0,
  rank INTEGER,
  is_eliminated BOOLEAN DEFAULT false,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (tournament_id, player_id)
);

-- Create games table
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  round INTEGER NOT NULL,
  white_player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  black_player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  result game_result DEFAULT 'pending',
  pgn TEXT,
  fen TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  white_time_remaining INTEGER,
  black_time_remaining INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create champions table
CREATE TABLE public.champions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  first_place_id UUID REFERENCES public.profiles(id),
  second_place_id UUID REFERENCES public.profiles(id),
  third_place_id UUID REFERENCES public.profiles(id),
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.champions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "User roles are viewable by everyone"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Tournaments policies
CREATE POLICY "Tournaments are viewable by everyone"
  ON public.tournaments FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tournaments"
  ON public.tournaments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Tournament players policies
CREATE POLICY "Tournament players are viewable by everyone"
  ON public.tournament_players FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can register for tournaments"
  ON public.tournament_players FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND id = player_id)
  );

CREATE POLICY "Admins can manage tournament players"
  ON public.tournament_players FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Games policies
CREATE POLICY "Games are viewable by everyone"
  ON public.games FOR SELECT
  USING (true);

CREATE POLICY "Players can update their own games"
  ON public.games FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (id = white_player_id OR id = black_player_id))
  );

CREATE POLICY "Admins can manage games"
  ON public.games FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Champions policies
CREATE POLICY "Published champions are viewable by everyone"
  ON public.champions FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage champions"
  ON public.champions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate avatar initials
CREATE OR REPLACE FUNCTION public.generate_avatar_initials(full_name TEXT)
RETURNS TEXT AS $$
DECLARE
  words TEXT[];
  initials TEXT := '';
BEGIN
  words := string_to_array(trim(full_name), ' ');
  IF array_length(words, 1) >= 2 THEN
    initials := upper(substring(words[1] from 1 for 1) || substring(words[array_length(words, 1)] from 1 for 1));
  ELSIF array_length(words, 1) = 1 THEN
    initials := upper(substring(words[1] from 1 for 2));
  END IF;
  RETURN initials;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enable realtime for games table
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;