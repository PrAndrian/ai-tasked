import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ai-tasked/backend";
import { toast } from "sonner";
import { Loader } from "lucide-react";

interface SimpleAuthProps {
  onAuthSuccess: (userId: string) => void;
}

export function SimpleAuth({ onAuthSuccess }: SimpleAuthProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const createOrUpdateUser = useConvexMutation(api.auth.createOrUpdateUser);

  const authMutation = useMutation({
    mutationFn: async ({ email, name }: { email: string; name: string }) => {
      return createOrUpdateUser({ email, name });
    },
    onSuccess: (userId) => {
      toast.success(isSignUp ? "Account created successfully!" : "Welcome back!");
      onAuthSuccess(userId);
    },
    onError: (error) => {
      console.error("Auth error:", error);
      toast.error("Authentication failed. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (isSignUp && !name.trim()) {
      toast.error("Name is required for sign up");
      return;
    }

    authMutation.mutate({
      email: email.trim(),
      name: name.trim() || email.split("@")[0], // Use email prefix as fallback name
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">AI-Tasked</CardTitle>
          <CardDescription>
            {isSignUp ? "Create your account" : "Welcome back"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={authMutation.isPending}
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
                  disabled={authMutation.isPending}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={authMutation.isPending}
            >
              {authMutation.isPending ? (
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
                disabled={authMutation.isPending}
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
  );
}