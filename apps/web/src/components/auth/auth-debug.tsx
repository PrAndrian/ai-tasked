import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthDebug() {
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowDebug(true)}
        className="mb-4"
      >
        Show Debug Info
      </Button>
    );
  }

  // Only access window on client side
  const config = {
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    convexUrl: import.meta.env.VITE_CONVEX_URL,
    currentOrigin: typeof window !== "undefined" ? window.location.origin : "SSR",
    currentUrl: typeof window !== "undefined" ? window.location.href : "SSR",
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">Debug Info</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowDebug(false)}
          className="w-fit"
        >
          Hide
        </Button>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          <strong>Google Client ID:</strong> {config.googleClientId ? "✅ Set" : "❌ Missing"}
          {config.googleClientId && (
            <div className="text-muted-foreground">
              {config.googleClientId.substring(0, 20)}...
            </div>
          )}
        </div>
        <div>
          <strong>Convex URL:</strong> {config.convexUrl ? "✅ Set" : "❌ Missing"}
        </div>
        <div>
          <strong>Current Origin:</strong> {config.currentOrigin}
        </div>
        <div>
          <strong>Redirect URI:</strong> {config.currentOrigin}/auth/google/callback
        </div>
        <div>
          <strong>Current URL:</strong> {config.currentUrl}
        </div>
      </CardContent>
    </Card>
  );
}