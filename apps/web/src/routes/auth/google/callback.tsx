import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/google/callback")({
  component: GoogleCallbackComponent,
});

function GoogleCallbackComponent() {
  useEffect(() => {
    // The Google OAuth callback is handled by the BetterAuth component
    // This route exists just to ensure the URL is valid
    // Redirect to home page where BetterAuth will handle the callback
    window.location.href = "/";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-lg">Processing Google authentication...</p>
      </div>
    </div>
  );
}