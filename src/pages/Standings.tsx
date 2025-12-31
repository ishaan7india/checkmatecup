import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Zap } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";

interface Player {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  avatar_initials: string | null;
  score: number | null;
  games_played: number | null;
  games_won: number | null;
  games_lost: number | null;
  rating: number | null;
}

interface SuperLeaguePlayer extends Player {
  super_league_score: number;
}

const Standings = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [superLeaguePlayers, setSuperLeaguePlayers] = useState<SuperLeaguePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tournamentName, setTournamentName] = useState("Checkmate Cup 2K25");
  const [hasSuperLeague, setHasSuperLeague] = useState(false);
  const { isUserOnline } = useOnlinePresence();

  useEffect(() => {
    fetchStandings();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('standings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchStandings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        fetchStandings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStandings = async () => {
    // Get active tournament
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name, format, current_round, total_rounds')
      .in('status', ['registration', 'in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tournament) {
      setTournamentName(tournament.name);
      
      // Check if super league is active
      // Super league only shows when format is swiss_super_league AND current_round > total_rounds (swiss rounds)
      const isSuperLeagueFormat = tournament.format === 'swiss_super_league' || tournament.format === 'swiss_playoffs';
      const swissRoundsComplete = tournament.current_round && tournament.total_rounds && 
                                   tournament.current_round > tournament.total_rounds;
      
      if (isSuperLeagueFormat && swissRoundsComplete) {
        // Check for super league games (games after swiss rounds)
        const { data: superLeagueGames } = await supabase
          .from('games')
          .select(`
            id,
            white_player_id,
            black_player_id,
            result,
            round
          `)
          .eq('tournament_id', tournament.id)
          .gt('round', tournament.total_rounds);

        if (superLeagueGames && superLeagueGames.length > 0) {
          // Get unique player IDs from super league games
          const playerIds = new Set<string>();
          superLeagueGames.forEach(game => {
            playerIds.add(game.white_player_id);
            playerIds.add(game.black_player_id);
          });

          // Calculate super league scores
          const superLeagueScores: Record<string, number> = {};
          superLeagueGames.forEach(game => {
            if (!superLeagueScores[game.white_player_id]) superLeagueScores[game.white_player_id] = 0;
            if (!superLeagueScores[game.black_player_id]) superLeagueScores[game.black_player_id] = 0;
            
            if (game.result === 'white_wins') {
              superLeagueScores[game.white_player_id] += 1;
            } else if (game.result === 'black_wins') {
              superLeagueScores[game.black_player_id] += 1;
            } else if (game.result === 'draw') {
              superLeagueScores[game.white_player_id] += 0.5;
              superLeagueScores[game.black_player_id] += 0.5;
            }
          });

          // Get swiss scores for these players from tournament_players
          const { data: tournamentPlayersData } = await supabase
            .from('tournament_players')
            .select('player_id, score')
            .eq('tournament_id', tournament.id)
            .in('player_id', Array.from(playerIds));

          const swissScores: Record<string, number> = {};
          tournamentPlayersData?.forEach(tp => {
            swissScores[tp.player_id] = Number(tp.score) || 0;
          });

          // Fetch super league player profiles
          const { data: slProfiles } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, avatar_initials, score, games_played, games_won, games_lost, rating')
            .in('id', Array.from(playerIds));

          if (slProfiles && slProfiles.length > 0) {
            const slPlayersWithScores: SuperLeaguePlayer[] = slProfiles.map(p => ({
              ...p,
              super_league_score: (swissScores[p.id] || 0) + (superLeagueScores[p.id] || 0)
            })).sort((a, b) => b.super_league_score - a.super_league_score);

            setSuperLeaguePlayers(slPlayersWithScores);
            setHasSuperLeague(true);
          }
        }
      } else {
        // Not in super league phase, reset the state
        setHasSuperLeague(false);
        setSuperLeaguePlayers([]);
      }
    }

    // Get ALL profiles ordered by score - no tournament registration required
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, avatar_initials, score, games_played, games_won, games_lost, rating')
      .order('score', { ascending: false, nullsFirst: false })
      .order('games_won', { ascending: false, nullsFirst: false });

    if (data) {
      setPlayers(data);
    }
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500 trophy-shine" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-amber-700" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">{index + 1}</span>;
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30";
    if (index === 1) return "bg-gradient-to-r from-gray-400/20 to-slate-400/20 border-gray-400/30";
    if (index === 2) return "bg-gradient-to-r from-amber-700/20 to-orange-700/20 border-amber-700/30";
    return "";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Tournament Standings</h1>
          <p className="text-muted-foreground font-gamer-body">{tournamentName}</p>
        </div>

        {/* Super League Standings */}
        {hasSuperLeague && superLeaguePlayers.length > 0 && (
          <Card className="border-2 dark:rgb-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent dark:rgb-text" />
                <span className="dark:rgb-text">Super League Standings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Player</div>
                  <div className="col-span-2 text-center">Rating</div>
                  <div className="col-span-2 text-center">SL Score</div>
                  <div className="col-span-2 text-center">Total</div>
                </div>

                {/* Super League Players */}
                {superLeaguePlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-lg border transition-all hover:scale-[1.01] ${getRankStyle(index)} dark:rgb-glow`}
                    style={{ animationDelay: `${index * 0.5}s` }}
                  >
                    <div className="col-span-1">
                      {getRankIcon(index)}
                    </div>
                    <div className="col-span-5 flex items-center gap-3">
                      <PlayerAvatar
                        avatarUrl={player.avatar_url}
                        initials={player.avatar_initials}
                        name={player.full_name}
                        size="sm"
                        showOnlineIndicator
                        isOnline={isUserOnline(player.id)}
                      />
                      <div>
                        <p className="font-bold">{player.username}</p>
                        <p className="text-xs text-muted-foreground">{player.full_name}</p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-primary">{player.rating || 1200}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-lg text-accent">{player.super_league_score.toFixed(1)}</span>
                    </div>
                    <div className="col-span-2 text-center text-sm text-muted-foreground">
                      {Number(player.score || 0).toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Swiss / Overall Standings */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {hasSuperLeague ? 'Swiss Round Rankings' : 'Current Rankings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading standings...</div>
            ) : players.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No players yet.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Player</div>
                  <div className="col-span-2 text-center">Rating</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-2 text-center">W/L</div>
                </div>

                {/* Players */}
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-lg border transition-all hover:scale-[1.01] ${getRankStyle(index)}`}
                  >
                    <div className="col-span-1">
                      {getRankIcon(index)}
                    </div>
                    <div className="col-span-5 flex items-center gap-3">
                      <PlayerAvatar
                        avatarUrl={player.avatar_url}
                        initials={player.avatar_initials}
                        name={player.full_name}
                        size="sm"
                        showOnlineIndicator
                        isOnline={isUserOnline(player.id)}
                      />
                      <div>
                        <p className="font-bold">{player.username}</p>
                        <p className="text-xs text-muted-foreground">{player.full_name}</p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-primary">{player.rating || 1200}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-lg">{Number(player.score || 0).toFixed(1)}</span>
                    </div>
                    <div className="col-span-2 text-center text-sm">
                      <span className="text-green-500">{player.games_won || 0}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-500">{player.games_lost || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Standings;