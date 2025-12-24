import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Crown, Eye, EyeOff, Upload, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sign In state
  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  
  // Sign Up state
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");

  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    navigate('/');
    return null;
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(signInUsername, signInPassword);

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message || "Invalid username or password",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpPassword !== signUpConfirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
      });
      return;
    }

    if (signUpPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    if (signUpUsername.length < 3) {
      toast({
        variant: "destructive",
        title: "Username too short",
        description: "Username must be at least 3 characters.",
      });
      return;
    }

    setIsLoading(true);

    // Upload avatar first if selected
    let avatarUrl: string | undefined;
    if (avatarFile) {
      // We need to create a temporary ID for the file
      const tempId = `${Date.now()}`;
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `temp/${tempId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = data.publicUrl;
      }
    }

    const { error } = await signUp(signUpUsername, signUpPassword, signUpFullName, avatarUrl);

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: error.message || "Could not create account",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Welcome to the Christmas Gambit Cup!",
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  const generateInitials = (name: string) => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return words[0]?.substring(0, 2).toUpperCase() || '';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Crown className="h-16 w-16 text-primary animate-float" />
              <span className="absolute -top-2 -right-2 text-2xl">🎄</span>
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Christmas Gambit Cup
          </h1>
          <p className="text-muted-foreground mt-2 font-gamer-body">
            2K25 School Chess Tournament
          </p>
        </div>

        <Card className="border-2 shadow-lg card-hover">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <CardHeader>
                <CardTitle className="font-display">Welcome Back</CardTitle>
                <CardDescription>
                  Enter your credentials to continue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-username">Username</Label>
                    <Input
                      id="signin-username"
                      placeholder="Enter your username"
                      value={signInUsername}
                      onChange={(e) => setSignInUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader>
                <CardTitle className="font-display">Join the Tournament</CardTitle>
                <CardDescription>
                  Create your player account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center gap-3">
                    <div 
                      className="relative h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-muted"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                      ) : signUpFullName ? (
                        <span className="text-2xl font-bold text-primary">
                          {generateInitials(signUpFullName)}
                        </span>
                      ) : (
                        <User className="h-10 w-10 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Upload className="h-6 w-6" />
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <span className="text-xs text-muted-foreground">
                      Click to upload profile picture (optional)
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username *</Label>
                    <Input
                      id="signup-username"
                      placeholder="Choose a unique username"
                      value={signUpUsername}
                      onChange={(e) => setSignUpUsername(e.target.value)}
                      required
                      minLength={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">Full Name *</Label>
                    <Input
                      id="signup-fullname"
                      placeholder="Your real name"
                      value={signUpFullName}
                      onChange={(e) => setSignUpFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password *</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Confirm your password"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
