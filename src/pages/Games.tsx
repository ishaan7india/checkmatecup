import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords, Eye, Clock } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

interface GameWithPlayers {
  id: string;
  round: number;
  result: string;
  white_player: { username: string; avatar_url: string | null; avatar_initials: string | null };
  black_player: { username: string; avatar_url: string | null; avatar_initials: string | null };
  white_player_id: string;
  black_player_id: string;
}

const Games = () => {
  const { profile } = useAuth();
  const [games, setGames] = useState<GameWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
    
    const channel = supabase
      .channel('games-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        fetchGames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGames = async () => {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id')
      .in('status', ['in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tournament) {
      const { data } = await supabase
        .from('games')
        .select(`
          id,
          round,
          result,
          white_player_id,
          black_player_id,
          white_player:white_player_id (username, avatar_url, avatar_initials),
          black_player:black_player_id (username, avatar_url, avatar_initials)
        `)
        .eq('tournament_id', tournament.id)
        .order('round', { ascending: false })
        .order('created_at', { ascending: false });

      if (data) {
        setGames(data as unknown as GameWithPlayers[]);
      }
    }
    setLoading(false);
  };

  const getResultBadge = (result: string, isWhite: boolean, isBlack: boolean) => {
    if (result === 'pending') return <span className="text-muted-foreground">Pending</span>;
    if (result === 'in_progress') return <span className="text-primary">Live</span>;
    if (result === 'draw') return <span className="text-muted-foreground">Draw</span>;
    if (result === 'white_wins' && isWhite) return <span className="text-green-500">Won</span>;
    if (result === 'black_wins' && isBlack) return <span className="text-green-500">Won</span>;
    if (result === 'white_wins' && isBlack) return <span className="text-destructive">Lost</span>;
    if (result === 'black_wins' && isWhite) return <span className="text-destructive">Lost</span>;
    return <span className="capitalize">{result.replace(/_/g, ' ')}</span>;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Games</h1>
          <p className="text-muted-foreground font-gamer-body">Active and completed matches</p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" />
              Match List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading games...</div>
            ) : games.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No games yet. The tournament hasn't started.
              </div>
            ) : (
              <div className="space-y-3">
                {games.map((game) => {
                  const isWhite = profile?.id === game.white_player_id;
                  const isBlack = profile?.id === game.black_player_id;
                  const isMyGame = isWhite || isBlack;

                  return (
                    <div
                      key={game.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                        isMyGame ? 'border-primary/30 bg-primary/5' : ''
                      } ${game.result === 'in_progress' ? 'ring-2 ring-primary' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <span className="text-xs text-muted-foreground">Round</span>
                          <p className="font-bold">{game.round}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <PlayerAvatar
                              avatarUrl={game.white_player?.avatar_url}
                              initials={game.white_player?.avatar_initials}
                              size="sm"
                            />
                            <span className={`font-medium ${isWhite ? 'text-primary font-bold' : ''}`}>
                              {game.white_player?.username}
                            </span>
                          </div>
                          
                          <span className="text-muted-foreground">vs</span>
                          
                          <div className="flex items-center gap-2">
                            <PlayerAvatar
                              avatarUrl={game.black_player?.avatar_url}
                              initials={game.black_player?.avatar_initials}
                              size="sm"
                            />
                            <span className={`font-medium ${isBlack ? 'text-primary font-bold' : ''}`}>
                              {game.black_player?.username}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {getResultBadge(game.result, isWhite, isBlack)}
                        </div>

                        <Link to={`/game/${game.id}`}>
                          <Button
                            size="sm"
                            variant={game.result === 'in_progress' && isMyGame ? 'default' : 'outline'}
                          >
                            {game.result === 'in_progress' ? (
                              isMyGame ? (
                                <>
                                  <Clock className="h-4 w-4 mr-1" /> Play
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" /> Watch
                                </>
                              )
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-1" /> View
                              </>
                            )}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Games;
