import { useState, useEffect } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ai-tasked/backend";
import { toast } from "sonner";

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logoutMutation = useConvexMutation(api.enhanced_auth.logout);

  // Check for existing session on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("ai-tasked-user-id");
    const storedSessionId = localStorage.getItem("ai-tasked-session-id");
    
    if (storedUserId && storedSessionId) {
      setUserId(storedUserId);
      setSessionId(storedSessionId);
    }
    
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = (newUserId: string, newSessionId?: string) => {
    setUserId(newUserId);
    if (newSessionId) {
      setSessionId(newSessionId);
      localStorage.setItem("ai-tasked-session-id", newSessionId);
    }
    localStorage.setItem("ai-tasked-user-id", newUserId);
  };

  const handleSignOut = async () => {
    try {
      // If we have a session, invalidate it on the server
      if (sessionId) {
        await logoutMutation({ sessionId: sessionId as any });
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with logout even if server call fails
    } finally {
      // Always clear local state
      setUserId(null);
      setSessionId(null);
      localStorage.removeItem("ai-tasked-user-id");
      localStorage.removeItem("ai-tasked-session-id");
      toast.success("Signed out successfully");
    }
  };

  return {
    userId,
    sessionId,
    isLoading,
    isAuthenticated: !!userId,
    handleAuthSuccess,
    handleSignOut,
  };
}