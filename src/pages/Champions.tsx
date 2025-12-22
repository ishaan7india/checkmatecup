import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Medal, Award, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

interface Champion {
  id: string;
  published: boolean;
  first_place: Profile | null;
  second_place: Profile | null;
  third_place: Profile | null;
  tournament: { name: string } | null;
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  avatar_initials: string | null;
}

const Champions = () => {
  const [champions, setChampions] = useState<Champion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChampions();
  }, []);

  const fetchChampions = async () => {
    const { data } = await supabase
      .from('champions')
      .select(`
        id,
        published,
        first_place:first_place_id (id, username, full_name, avatar_url, avatar_initials),
        second_place:second_place_id (id, username, full_name, avatar_url, avatar_initials),
        third_place:third_place_id (id, username, full_name, avatar_url, avatar_initials),
        tournament:tournament_id (name)
      `)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setChampions(data as unknown as Champion);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Crown className="h-16 w-16 mx-auto text-primary animate-float" />
          <p className="mt-4 text-muted-foreground">Loading champions...</p>
        </div>
      </div>
    );
  }

  if (!champions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Trophy className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">No Champions Yet</h1>
          <p className="text-muted-foreground">
            The tournament hasn't concluded yet. Check back after the final games!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative overflow-hidden">
      {/* Festive Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      
      {/* Confetti Effect */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              backgroundColor: ['#FFD700', '#C41E3A', '#228B22', '#00D4FF', '#8B5CF6'][Math.floor(Math.random() * 5)],
              animation: `confetti-fall ${5 + Math.random() * 5}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="flex justify-center mb-4">
            <Crown className="h-20 w-20 text-accent trophy-shine" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-christmas-gradient dark:bg-neon-gradient">
            Christmas Gambit Cup 2K25
          </h1>
          <p className="text-xl text-muted-foreground font-gamer-body">Champions</p>
        </div>

        {/* Podium */}
        <div className="grid md:grid-cols-3 gap-6 items-end">
          {/* Second Place */}
          <div className="order-2 md:order-1 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {champions.second_place && (
              <Card className="border-2 border-gray-400/30 card-hover">
                <CardContent className="pt-6 text-center">
                  <div className="relative inline-block mb-4">
                    <PlayerAvatar
                      avatarUrl={champions.second_place.avatar_url}
                      initials={champions.second_place.avatar_initials}
                      name={champions.second_place.full_name}
                      size="lg"
                      className="ring-4 ring-gray-400"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-gray-400 rounded-full p-2">
                      <Medal className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold">{champions.second_place.username}</h3>
                  <p className="text-muted-foreground">{champions.second_place.full_name}</p>
                  <div className="mt-4 py-2 bg-gray-400/20 rounded-lg">
                    <p className="text-2xl font-bold text-gray-400">🥈</p>
                    <p className="text-sm font-medium">Runner-up</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* First Place - Champion */}
          <div className="order-1 md:order-2 animate-fade-in-up">
            {champions.first_place && (
              <Card className="border-4 border-yellow-500/50 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-amber-500/10" />
                <CardContent className="pt-8 pb-6 text-center relative">
                  <div className="relative inline-block mb-4">
                    <PlayerAvatar
                      avatarUrl={champions.first_place.avatar_url}
                      initials={champions.first_place.avatar_initials}
                      name={champions.first_place.full_name}
                      size="xl"
                      className="ring-4 ring-yellow-500 trophy-shine"
                    />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Crown className="h-10 w-10 text-yellow-500 trophy-shine" />
                    </div>
                  </div>
                  <h3 className="font-display text-2xl font-bold">{champions.first_place.username}</h3>
                  <p className="text-muted-foreground">{champions.first_place.full_name}</p>
                  <div className="mt-4 py-3 bg-yellow-500/20 rounded-lg">
                    <p className="text-3xl font-bold">🏆</p>
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">CHAMPION</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Third Place */}
          <div className="order-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {champions.third_place && (
              <Card className="border-2 border-amber-700/30 card-hover">
                <CardContent className="pt-6 text-center">
                  <div className="relative inline-block mb-4">
                    <PlayerAvatar
                      avatarUrl={champions.third_place.avatar_url}
                      initials={champions.third_place.avatar_initials}
                      name={champions.third_place.full_name}
                      size="lg"
                      className="ring-4 ring-amber-700"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-amber-700 rounded-full p-2">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold">{champions.third_place.username}</h3>
                  <p className="text-muted-foreground">{champions.third_place.full_name}</p>
                  <div className="mt-4 py-2 bg-amber-700/20 rounded-lg">
                    <p className="text-2xl font-bold text-amber-700">🥉</p>
                    <p className="text-sm font-medium">Third Place</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <div className="candy-divider w-48 mx-auto mb-4 dark:hidden" />
          <p className="text-muted-foreground font-gamer-body">
            🎄 Congratulations to all participants! 🎄
          </p>
        </div>
      </div>
    </div>
  );
};

export default Champions;
