import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Crown, Play, Settings, Trophy, Users, Eye, EyeOff, Loader2, Award, UserPlus } from "lucide-react";
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

const ADMIN_KEY = "ChristmasGambit2K25Admin";
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
  
  const [format, setFormat] = useState("swiss");
  const [timeControl, setTimeControl] = useState("10 | 5");
  
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      fetchTournament();
      fetchPlayers();
    }
  }, [isAuthenticated]);

  const adminAction = async (action: string, data: Record<string, unknown> = {}) => {
    const { data: result, error } = await supabase.functions.invoke('admin-action', {
      body: { action, data, adminKey: ADMIN_KEY }
    });
    
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result;
  };

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
    try {
      const result = await adminAction('createTournament', {
        name: 'Christmas Gambit Cup 2K25',
        format,
        timeControl,
      });
      setTournament(result as Tournament);
      toast({ title: "Tournament created!" });
      fetchTournament();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to create tournament", description: String(error) });
    }
    setIsLoading(false);
  };

  const updateTournamentSettings = async () => {
    if (!tournament) return;
    setIsLoading(true);
    
    try {
      await adminAction('updateTournament', {
        tournamentId: tournament.id,
        format,
        timeControl,
      });
      toast({ title: "Settings updated!" });
      fetchTournament();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update", description: String(error) });
    }
    setIsLoading(false);
  };

  const registerAllPlayers = async () => {
    if (!tournament) return;
    setIsLoading(true);
    
    try {
      const result = await adminAction('registerAllPlayers', {
        tournamentId: tournament.id,
      });
      toast({ title: "All players registered!", description: `${result.count} players added` });
      fetchTournament();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to register players", description: String(error) });
    }
    setIsLoading(false);
  };

  const startTournament = async () => {
    if (!tournament || registeredPlayers.length < 2) {
      toast({ variant: "destructive", title: "Need at least 2 players to start" });
      return;
    }
    
    setIsLoading(true);
    
    let totalRounds = Math.ceil(Math.log2(registeredPlayers.length));
    if (format === 'swiss' || format === 'swiss_playoffs' || format === 'swiss_super_league') {
      totalRounds = Math.ceil(Math.log2(registeredPlayers.length)) + 1;
    } else if (format === 'round_robin_playoffs') {
      totalRounds = registeredPlayers.length - 1;
    } else if (format === 'arena') {
      totalRounds = 10;
    }

    try {
      await adminAction('startTournament', {
        tournamentId: tournament.id,
        totalRounds,
      });
      await generatePairings();
      toast({ title: "Tournament started!" });
      fetchTournament();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to start tournament", description: String(error) });
    }
    setIsLoading(false);
  };

  const generatePairings = async () => {
    if (!tournament) return;
    
    const { data: tournamentPlayers } = await supabase
      .from('tournament_players')
      .select('player_id, score')
      .eq('tournament_id', tournament.id)
      .eq('is_eliminated', false)
      .order('score', { ascending: false });

    if (!tournamentPlayers || tournamentPlayers.length < 2) return;

    const playerIds = tournamentPlayers.map(p => p.player_id);

    for (let i = 0; i < playerIds.length - 1; i += 2) {
      await adminAction('createGame', {
        tournamentId: tournament.id,
        round: (tournament.current_round || 0) + 1,
        whitePlayerId: playerIds[i],
        blackPlayerId: playerIds[i + 1],
      });
    }

    if (playerIds.length % 2 === 1) {
      const byePlayer = playerIds[playerIds.length - 1];
      const currentScore = tournamentPlayers[tournamentPlayers.length - 1].score;
      await adminAction('updatePlayerScore', {
        tournamentId: tournament.id,
        playerId: byePlayer,
        score: Number(currentScore) + 1,
      });
    }
  };

  const publishResults = async () => {
    if (!tournament) return;
    setIsLoading(true);

    try {
      const { data: topPlayers } = await supabase
        .from('tournament_players')
        .select('player_id, score')
        .eq('tournament_id', tournament.id)
        .order('score', { ascending: false })
        .limit(3);

      if (topPlayers && topPlayers.length >= 1) {
        await adminAction('publishResults', {
          tournamentId: tournament.id,
          firstPlace: topPlayers[0]?.player_id || null,
          secondPlace: topPlayers[1]?.player_id || null,
          thirdPlace: topPlayers[2]?.player_id || null,
        });

        toast({ title: "Results published!", description: "Champions page is now live!" });
        fetchTournament();
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to publish results", description: String(error) });
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
                    <SelectItem value="swiss">Swiss Only</SelectItem>
                    <SelectItem value="knockouts">Knockouts Only</SelectItem>
                    <SelectItem value="round_robin_playoffs">Round Robin + Playoffs</SelectItem>
                    <SelectItem value="swiss_playoffs">Swiss + Playoffs</SelectItem>
                    <SelectItem value="swiss_super_league">Swiss + Super League</SelectItem>
                    <SelectItem value="arena">Arena</SelectItem>
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

              <div className="flex flex-col gap-2">
                {!tournament ? (
                  <Button onClick={createTournament} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Tournament
                  </Button>
                ) : tournament.status === 'registration' ? (
                  <>
                    <Button onClick={updateTournamentSettings} disabled={isLoading} variant="outline">
                      Save Settings
                    </Button>
                    <Button onClick={registerAllPlayers} disabled={isLoading} variant="secondary">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                      Register All Players
                    </Button>
                    <Button onClick={startTournament} disabled={isLoading || registeredPlayers.length < 2}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      Start Tournament
                    </Button>
                  </>
                ) : tournament.status === 'in_progress' ? (
                  <Button onClick={publishResults} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Award className="h-4 w-4 mr-2" />}
                    Publish Results
                  </Button>
                ) : (
                  <p className="text-muted-foreground">Tournament completed</p>
                )}
              </div>
            </CardContent>
          </Card>

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
