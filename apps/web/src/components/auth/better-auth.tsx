import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader, Mail } from "lucide-react";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ai-tasked/backend";
import { initiateGoogleAuth, exchangeCodeForTokens, getUserFromToken } from "@/lib/google-auth";
import { AuthDebug } from "./auth-debug";

interface BetterAuthProps {
  onAuthSuccess: (userId: string, sessionId?: string) => void;
}

export function BetterAuth({ onAuthSuccess }: BetterAuthProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const signUpMutation = useConvexMutation(api.enhanced_auth.signUpWithSession);
  const signInMutation = useConvexMutation(api.enhanced_auth.signInWithSession);
  const googleSignInMutation = useConvexMutation(api.enhanced_auth.signInWithGoogle);

  // Handle Google OAuth callback
  useEffect(() => {
    const handleGoogleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      
      if (code) {
        setIsLoading(true);
        try {
          const tokens = await exchangeCodeForTokens(code);
          const googleUser = await getUserFromToken(tokens.access_token);
          
          const result = await googleSignInMutation({
            email: googleUser.email,
            name: googleUser.name,
            avatar: googleUser.picture,
            googleId: googleUser.id,
          });
          
          toast.success("Successfully signed in with Google!");
          onAuthSuccess(result.userId, result.sessionId);
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error("Google auth error:", error);
          toast.error("Google sign in failed. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleGoogleCallback();
  }, [googleSignInMutation, onAuthSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (isSignUp && !name.trim()) {
      toast.error("Name is required for sign up");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await signUpMutation({
          email: email.trim(),
          name: name.trim(),
        });

        toast.success("Account created successfully!");
        onAuthSuccess(result.userId, result.sessionId);
      } else {
        const result = await signInMutation({
          email: email.trim(),
        });

        toast.success("Welcome back!");
        onAuthSuccess(result.userId, result.sessionId);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    try {
      setIsLoading(true);
      initiateGoogleAuth();
    } catch (error: any) {
      console.error("Google auth initiation error:", error);
      toast.error(error.message || "Failed to initiate Google authentication");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <AuthDebug />
        <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">AI-Tasked</CardTitle>
          <CardDescription>
            {isSignUp ? "Create your account" : "Welcome back"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Sign In */}
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            <Mail className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isLoading}
                required
              />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? "Creating Account..." : "Signing In..."}
                </>
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                disabled={isLoading}
                className="text-sm"
              >
                {isSignUp 
                  ? "Already have an account? Sign in" 
                  : "Need an account? Sign up"
                }
              </Button>
            </div>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}