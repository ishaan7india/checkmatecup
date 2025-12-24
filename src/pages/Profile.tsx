import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Edit2, Loader2, Trophy, Swords, Award, Target, Play, History, Crown, Minus } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

interface GameHistory {
  id: string;
  result: string;
  round: number;
  white_player_id: string;
  black_player_id: string;
  ended_at: string | null;
  opponent_username: string;
  opponent_avatar_url: string | null;
  opponent_avatar_initials: string | null;
  played_as: 'white' | 'black';
}

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  time_control: string;
}

const Profile = () => {
  const { user, profile, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    fetchTournament();
  }, [profile]);

  const fetchTournament = async () => {
    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('*')
      .in('status', ['registration', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tournamentData) {
      setTournament(tournamentData as Tournament);
      
      if (profile) {
        const { data: registration } = await supabase
          .from('tournament_players')
          .select('id')
          .eq('tournament_id', tournamentData.id)
          .eq('player_id', profile.id)
          .maybeSingle();
        
        setIsRegistered(!!registration);

        // Fetch active game for user
        if (tournamentData.status === 'in_progress') {
          const { data: activeGame } = await supabase
            .from('games')
            .select('id')
            .eq('tournament_id', tournamentData.id)
            .in('result', ['pending', 'in_progress'])
            .or(`white_player_id.eq.${profile.id},black_player_id.eq.${profile.id}`)
            .limit(1)
            .maybeSingle();
          
          if (activeGame) {
            setActiveGameId(activeGame.id);
          }
        }
      }
    }
    
    // Fetch game history
    if (profile) {
      fetchGameHistory();
    }
  };

  const fetchGameHistory = async () => {
    if (!profile) return;

    const { data: games } = await supabase
      .from('games')
      .select('id, result, round, white_player_id, black_player_id, ended_at')
      .or(`white_player_id.eq.${profile.id},black_player_id.eq.${profile.id}`)
      .not('result', 'in', '("pending","in_progress")')
      .order('ended_at', { ascending: false })
      .limit(10);

    if (games && games.length > 0) {
      // Fetch opponent data for each game
      const historyWithOpponents: GameHistory[] = await Promise.all(
        games.map(async (game) => {
          const opponentId = game.white_player_id === profile.id 
            ? game.black_player_id 
            : game.white_player_id;
          
          const { data: opponent } = await supabase
            .from('profiles')
            .select('username, avatar_url, avatar_initials')
            .eq('id', opponentId)
            .single();

          return {
            ...game,
            opponent_username: opponent?.username || 'Unknown',
            opponent_avatar_url: opponent?.avatar_url || null,
            opponent_avatar_initials: opponent?.avatar_initials || null,
            played_as: game.white_player_id === profile.id ? 'white' : 'black',
          } as GameHistory;
        })
      );

      setGameHistory(historyWithOpponents);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !user) return;
    setIsLoading(true);

    let avatarUrl = profile.avatar_url;

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = data.publicUrl;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
        avatar_initials: generateInitials(fullName),
      })
      .eq('id', profile.id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to update profile", description: error.message });
    } else {
      toast({ title: "Profile updated!" });
      setIsEditing(false);
      window.location.reload();
    }
    setIsLoading(false);
  };

  const handleRegister = async () => {
    if (!tournament || !profile) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('tournament_players')
      .insert({
        tournament_id: tournament.id,
        player_id: profile.id,
      });

    if (error) {
      toast({ variant: "destructive", title: "Registration failed", description: error.message });
    } else {
      toast({ title: "Registered!", description: "You're in the tournament!" });
      setIsRegistered(true);
    }
    setIsLoading(false);
  };

  const generateInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return words[0]?.substring(0, 2).toUpperCase() || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display">Player Profile</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit2 className="h-4 w-4 mr-2" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <PlayerAvatar
                    avatarUrl={avatarPreview}
                    initials={profile.avatar_initials}
                    name={profile.full_name}
                    size="xl"
                  />
                  {isEditing && (
                    <button
                      className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input value={profile.username} disabled className="bg-muted" />
                      <p className="text-xs text-muted-foreground">Username cannot be changed</p>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Username</p>
                      <p className="font-bold text-xl">{profile.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{profile.full_name}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-hover">
            <CardContent className="pt-6 text-center">
              <Swords className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{profile.games_played}</p>
              <p className="text-sm text-muted-foreground">Games Played</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="pt-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{profile.games_won}</p>
              <p className="text-sm text-muted-foreground">Wins</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">{profile.games_drawn}</p>
              <p className="text-sm text-muted-foreground">Draws</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="pt-6 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{Number(profile.score).toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Tournament Registration */}
        {tournament && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                {tournament.name}
              </CardTitle>
              <CardDescription>
                Format: {tournament.format.replace(/_/g, ' ')} • Time Control: {tournament.time_control}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tournament.status === 'registration' ? (
                isRegistered ? (
                  <div className="bg-secondary/20 p-4 rounded-lg text-center">
                    <p className="text-secondary dark:text-neon-cyan font-bold">✓ You are registered!</p>
                    <p className="text-sm text-muted-foreground mt-1">Waiting for tournament to start...</p>
                  </div>
                ) : (
                  <Button onClick={handleRegister} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Swords className="h-4 w-4 mr-2" />}
                    Register for Tournament
                  </Button>
                )
              ) : (
                <div className="bg-primary/10 p-4 rounded-lg text-center space-y-3">
                  <p className="font-bold">Tournament in progress</p>
                  <p className="text-sm text-muted-foreground">Round Active</p>
                  {activeGameId ? (
                    <Button 
                      onClick={() => navigate(`/game/${activeGameId}`)} 
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Play Now
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active game found</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Game History */}
        {gameHistory.length > 0 && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {gameHistory.map((game) => {
                  const isWin = (game.played_as === 'white' && game.result === 'white_wins') ||
                               (game.played_as === 'black' && game.result === 'black_wins');
                  const isLoss = (game.played_as === 'white' && game.result === 'black_wins') ||
                                (game.played_as === 'black' && game.result === 'white_wins');
                  const isDraw = game.result === 'draw';

                  return (
                    <div
                      key={game.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:scale-[1.01] transition-all ${
                        isWin ? 'bg-green-500/10 border-green-500/30' :
                        isLoss ? 'bg-red-500/10 border-red-500/30' :
                        'bg-muted border-muted-foreground/20'
                      }`}
                      onClick={() => navigate(`/game/${game.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <PlayerAvatar
                          avatarUrl={game.opponent_avatar_url}
                          initials={game.opponent_avatar_initials}
                          name={game.opponent_username}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">vs {game.opponent_username}</p>
                          <p className="text-xs text-muted-foreground">
                            Round {game.round} • {game.played_as === 'white' ? '♔ White' : '♚ Black'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isWin && <Crown className="h-5 w-5 text-green-500" />}
                        {isLoss && <Target className="h-5 w-5 text-red-500" />}
                        {isDraw && <Minus className="h-5 w-5 text-muted-foreground" />}
                        <span className={`font-bold ${
                          isWin ? 'text-green-500' : isLoss ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {isWin ? 'Won' : isLoss ? 'Lost' : 'Draw'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profile;
