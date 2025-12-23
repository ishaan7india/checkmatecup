import { Bot, Crown, LogIn, LogOut, Trophy, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Crown className="h-8 w-8 text-primary group-hover:animate-float transition-all" />
              <span className="absolute -top-1 -right-1 text-xs">🎄</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-wide text-foreground">
                Christmas Gambit
              </span>
              <span className="text-xs text-muted-foreground font-gamer-body">
                Cup 2K25
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/practice" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-gamer-body"
            >
              <Bot className="h-4 w-4" />
              Practice
            </Link>
            <Link 
              to="/standings" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-gamer-body"
            >
              <Trophy className="h-4 w-4" />
              Standings
            </Link>
            <Link 
              to="/champions" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-gamer-body"
            >
              <Crown className="h-4 w-4" />
              Champions
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="gap-2">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.username}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : profile?.avatar_initials ? (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                        {profile.avatar_initials}
                      </div>
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{profile?.username}</span>
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
