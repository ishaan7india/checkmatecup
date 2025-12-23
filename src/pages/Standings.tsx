import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

interface Player {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  avatar_initials: string | null;
  score: number | null;
  games_played: number | null;
  games_won: number | null;
}

const Standings = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [tournamentName, setTournamentName] = useState("Christmas Gambit Cup 2K25");

  useEffect(() => {
    fetchStandings();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('standings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchStandings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStandings = async () => {
    // Get active tournament name
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name')
      .in('status', ['registration', 'in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tournament) {
      setTournamentName(tournament.name);
    }

    // Get ALL profiles ordered by score - no tournament registration required
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, avatar_initials, score, games_played, games_won')
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
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Tournament Standings</h1>
          <p className="text-muted-foreground font-gamer-body">{tournamentName}</p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Current Rankings
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
                  <div className="col-span-6">Player</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-2 text-center">W/L</div>
                  <div className="col-span-1 text-center">GP</div>
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
                    <div className="col-span-6 flex items-center gap-3">
                      <PlayerAvatar
                        avatarUrl={player.avatar_url}
                        initials={player.avatar_initials}
                        name={player.full_name}
                        size="sm"
                      />
                      <div>
                        <p className="font-bold">{player.username}</p>
                        <p className="text-xs text-muted-foreground">{player.full_name}</p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-lg">{Number(player.score || 0).toFixed(1)}</span>
                    </div>
                    <div className="col-span-2 text-center text-sm">
                      <span className="text-green-500">{player.games_won || 0}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-500">{(player.games_played || 0) - (player.games_won || 0)}</span>
                    </div>
                    <div className="col-span-1 text-center text-muted-foreground">
                      {player.games_played || 0}
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
