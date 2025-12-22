import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  avatar_initials: string | null;
  score: number;
  rank: number | null;
  games_played: number;
  games_won: number;
  games_drawn: number;
  games_lost: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (username: string, password: string, fullName: string, avatarUrl?: string) => Promise<{ error: any }>;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data && !error) {
      setProfile(data as Profile);
    }
  };

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();
    
    setIsAdmin(!!data && !error);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const generateInitials = (fullName: string): string => {
    const words = fullName.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return words[0].substring(0, 2).toUpperCase();
  };

  const signUp = async (username: string, password: string, fullName: string, avatarUrl?: string) => {
    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return { error: { message: 'Username already taken' } };
    }

    // Create fake email from username for auth
    const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@chessgambit.local`;
    
    const { data, error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          username,
          full_name: fullName,
        }
      }
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      const initials = generateInitials(fullName);
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          username,
          full_name: fullName,
          avatar_url: avatarUrl || null,
          avatar_initials: initials,
        });

      if (profileError) {
        return { error: profileError };
      }

      // Add player role
      await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'player',
        });
    }

    return { error: null };
  };

  const signIn = async (username: string, password: string) => {
    // Get profile by username to get the fake email
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', username)
      .single();

    if (!profileData) {
      return { error: { message: 'Username not found' } };
    }

    // Get user's email from auth.users (we'll use the fake email pattern)
    const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@chessgambit.local`;
    
    const { error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
