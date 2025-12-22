import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Crown, Play, Settings, Trophy, Users, Eye, EyeOff, Loader2, Award } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  time_control: string;
  current_round: number;
  total_rounds: number | null;
}

interface Player {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  avatar_initials: string | null;
  score: number;
}

const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "P@s$w0rd";

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<string[]>([]);
  
  // Tournament settings
  const [format, setFormat] = useState("swiss");
  const [timeControl, setTimeControl] = useState("10 | 5");
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetchTournament();
      fetchPlayers();
    }
  }, [isAuthenticated]);

  const fetchTournament = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setTournament(data as Tournament);
      setFormat(data.format);
      setTimeControl(data.time_control);
      
      // Fetch registered players
      const { data: regPlayers } = await supabase
        .from('tournament_players')
        .select('player_id')
        .eq('tournament_id', data.id);
      
      if (regPlayers) {
        setRegisteredPlayers(regPlayers.map(p => p.player_id));
      }
    }
  };

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, avatar_initials, score')
      .order('username');
    
    if (data) {
      setPlayers(data);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast({ title: "Admin access granted" });
    } else {
      toast({ variant: "destructive", title: "Invalid credentials" });
    }
  };

  const createTournament = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: 'Christmas Gambit Cup 2K25',
        format: format as any,
        status: 'registration',
        time_control: timeControl,
      })
      .select()
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Failed to create tournament", description: error.message });
    } else {
      setTournament(data as Tournament);
      toast({ title: "Tournament created!" });
    }
    setIsLoading(false);
  };

  const updateTournamentSettings = async () => {
    if (!tournament) return;
    setIsLoading(true);
    
    const { error } = await supabase
      .from('tournaments')
      .update({
        format: format as any,
        time_control: timeControl,
      })
      .eq('id', tournament.id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to update", description: error.message });
    } else {
      toast({ title: "Settings updated!" });
      fetchTournament();
    }
    setIsLoading(false);
  };

  const startTournament = async () => {
    if (!tournament || registeredPlayers.length < 2) {
      toast({ variant: "destructive", title: "Need at least 2 players to start" });
      return;
    }
    
    setIsLoading(true);
    
    // Calculate total rounds based on format and player count
    let totalRounds = Math.ceil(Math.log2(registeredPlayers.length));
    if (format === 'swiss' || format === 'swiss_playoffs' || format === 'swiss_super_league') {
      totalRounds = Math.ceil(Math.log2(registeredPlayers.length)) + 1;
    } else if (format === 'round_robin_playoffs') {
      totalRounds = registeredPlayers.length - 1;
    } else if (format === 'arena') {
      totalRounds = 10; // Arena typically has fixed duration
    }

    const { error } = await supabase
      .from('tournaments')
      .update({
        status: 'in_progress',
        current_round: 1,
        total_rounds: totalRounds,
      })
      .eq('id', tournament.id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to start tournament", description: error.message });
    } else {
      toast({ title: "Tournament started!" });
      await generatePairings();
      fetchTournament();
    }
    setIsLoading(false);
  };

  const generatePairings = async () => {
    if (!tournament) return;
    
    // Get registered players with scores
    const { data: tournamentPlayers } = await supabase
      .from('tournament_players')
      .select('player_id, score')
      .eq('tournament_id', tournament.id)
      .eq('is_eliminated', false)
      .order('score', { ascending: false });

    if (!tournamentPlayers || tournamentPlayers.length < 2) return;

    const playerIds = tournamentPlayers.map(p => p.player_id);
    const pairings: { white: string; black: string }[] = [];

    // Simple Swiss pairing: pair adjacent players by score
    for (let i = 0; i < playerIds.length - 1; i += 2) {
      pairings.push({
        white: playerIds[i],
        black: playerIds[i + 1],
      });
    }

    // Handle bye if odd number of players
    if (playerIds.length % 2 === 1) {
      const byePlayer = playerIds[playerIds.length - 1];
      // Give bye player a win (1 point)
      await supabase
        .from('tournament_players')
        .update({ score: tournamentPlayers[tournamentPlayers.length - 1].score + 1 })
        .eq('tournament_id', tournament.id)
        .eq('player_id', byePlayer);
    }

    // Create games for pairings
    for (const pairing of pairings) {
      await supabase.from('games').insert({
        tournament_id: tournament.id,
        round: tournament.current_round + 1,
        white_player_id: pairing.white,
        black_player_id: pairing.black,
        result: 'pending',
      });
    }
  };

  const publishResults = async () => {
    if (!tournament) return;
    setIsLoading(true);

    // Get top 3 players
    const { data: topPlayers } = await supabase
      .from('tournament_players')
      .select('player_id, score')
      .eq('tournament_id', tournament.id)
      .order('score', { ascending: false })
      .limit(3);

    if (topPlayers && topPlayers.length >= 1) {
      await supabase.from('champions').insert({
        tournament_id: tournament.id,
        first_place_id: topPlayers[0]?.player_id || null,
        second_place_id: topPlayers[1]?.player_id || null,
        third_place_id: topPlayers[2]?.player_id || null,
        published: true,
      });

      await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournament.id);

      toast({ title: "Results published!", description: "Champions page is now live!" });
      fetchTournament();
    }
    setIsLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-2">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Settings className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="font-display">Admin Access</CardTitle>
            <CardDescription>Enter admin credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Admin username"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Admin password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full">Access Dashboard</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold">Tournament Admin</h1>
          </div>
          <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
            Logout
          </Button>
        </div>

        {/* Tournament Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tournament Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournament ? (
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Format</p>
                  <p className="font-bold capitalize">{tournament.format.replace(/_/g, ' ')}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-bold capitalize">{tournament.status.replace(/_/g, ' ')}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Round</p>
                  <p className="font-bold">{tournament.current_round} / {tournament.total_rounds || '?'}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Players</p>
                  <p className="font-bold">{registeredPlayers.length}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No tournament created yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tournament Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Tournament Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat} disabled={tournament?.status === 'in_progress'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="swiss">🧩 Swiss Only</SelectItem>
                    <SelectItem value="knockouts">⚔️ Knockouts Only</SelectItem>
                    <SelectItem value="round_robin_playoffs">🔄 Round Robin + IPL Playoffs</SelectItem>
                    <SelectItem value="swiss_playoffs">🔁 Swiss + Playoffs</SelectItem>
                    <SelectItem value="swiss_super_league">🏟 Swiss + Super League</SelectItem>
                    <SelectItem value="arena">⚡ Arena</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time Control</Label>
                <Select value={timeControl} onValueChange={setTimeControl} disabled={tournament?.status === 'in_progress'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 | 1">1 | 1 (Bullet)</SelectItem>
                    <SelectItem value="3 | 2">3 | 2 (Blitz)</SelectItem>
                    <SelectItem value="5 | 3">5 | 3 (Blitz)</SelectItem>
                    <SelectItem value="10 | 0">10 | 0 (Rapid)</SelectItem>
                    <SelectItem value="10 | 5">10 | 5 (Rapid)</SelectItem>
                    <SelectItem value="15 | 10">15 | 10 (Rapid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                {!tournament ? (
                  <Button onClick={createTournament} disabled={isLoading} className="flex-1">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Tournament
                  </Button>
                ) : tournament.status === 'registration' ? (
                  <>
                    <Button onClick={updateTournamentSettings} disabled={isLoading} variant="outline" className="flex-1">
                      Save Settings
                    </Button>
                    <Button onClick={startTournament} disabled={isLoading || registeredPlayers.length < 2} className="flex-1">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      Start Tournament
                    </Button>
                  </>
                ) : tournament.status === 'in_progress' ? (
                  <Button onClick={publishResults} disabled={isLoading} className="flex-1">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Award className="h-4 w-4 mr-2" />}
                    Publish Results
                  </Button>
                ) : (
                  <p className="text-muted-foreground">Tournament completed</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Registered Players */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Registered Players ({registeredPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {players.filter(p => registeredPlayers.includes(p.id)).map((player) => (
                  <div key={player.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                    <PlayerAvatar
                      avatarUrl={player.avatar_url}
                      initials={player.avatar_initials}
                      name={player.full_name}
                      size="sm"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{player.username}</p>
                      <p className="text-xs text-muted-foreground">{player.full_name}</p>
                    </div>
                  </div>
                ))}
                {registeredPlayers.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No players registered yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
