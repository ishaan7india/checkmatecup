import { Crown, Trophy, Users, Swords, Calendar, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Crown className="h-24 w-24 text-primary trophy-shine" />
                <span className="absolute -top-4 -right-4 text-4xl animate-float">🎄</span>
                <span className="absolute -bottom-2 -left-4 text-3xl animate-float" style={{ animationDelay: '0.5s' }}>❄️</span>
              </div>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-christmas-gradient dark:bg-neon-gradient">
              Christmas Gambit Cup
            </h1>
            <p className="font-gamer text-2xl md:text-3xl text-accent dark:text-neon-cyan mb-4">
              • DPSBE 2K25 •
            </p>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto font-gamer-body">
              The ultimate DPSBE chess tournament. Compete, strategize, and claim your place among champions.
            </p>

            <div className="candy-divider w-48 mx-auto mb-8 dark:hidden" />

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <Link to="/auth">
                  <Button size="lg" className="gap-2 text-lg px-8 animate-glow-pulse">
                    <Swords className="h-5 w-5" />
                    Join Tournament
                  </Button>
                </Link>
              ) : (
                <Link to="/profile">
                  <Button size="lg" className="gap-2 text-lg px-8">
                    <Users className="h-5 w-5" />
                    My Profile
                  </Button>
                </Link>
              )}
              <Link to="/standings">
                <Button variant="outline" size="lg" className="gap-2 text-lg px-8">
                  <Trophy className="h-5 w-5" />
                  View Standings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-hover border-2 group">
              <CardContent className="pt-6 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Swords className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">Live Games</h3>
                <p className="text-muted-foreground font-gamer-body">
                  Play real-time chess matches with automatic time controls and result tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover border-2 group">
              <CardContent className="pt-6 text-center">
                <div className="h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Trophy className="h-8 w-8 text-secondary dark:text-neon-purple" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">Multiple Formats</h3>
                <p className="text-muted-foreground font-gamer-body">
                  Swiss, Knockouts, Round Robin, Arena – choose your battle style.
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover border-2 group">
              <CardContent className="pt-6 text-center">
                <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="h-8 w-8 text-accent dark:text-neon-magenta" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">Auto Pairings</h3>
                <p className="text-muted-foreground font-gamer-body">
                  Automatic matchmaking, standings updates, and tournament progression.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Make Your Move?
          </h2>
          <p className="text-muted-foreground mb-8 font-gamer-body text-lg">
            Join the tournament and compete for the Christmas Gambit Cup!
          </p>
          <Link to={user ? "/profile" : "/auth"}>
            <Button size="lg" className="gap-2">
              Get Started <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground font-gamer-body">
          <p>🎄 Christmas Gambit Cup 2K25 • School Chess Tournament ♟️</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
