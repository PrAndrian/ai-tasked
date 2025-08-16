// Google OAuth configuration
function getGoogleConfig() {
  // Only access window on client side
  if (typeof window === "undefined") {
    return {
      clientId: "",
      redirectUri: "",
      scope: "",
    };
  }
  
  return {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
    redirectUri: `${window.location.origin}/auth/google/callback`,
    scope: [
      "openid",
      "profile", 
      "email"
    ].join(" "),
  };
}

export const googleConfig = getGoogleConfig();

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export function initiateGoogleAuth() {
  // Ensure we're on the client side
  if (typeof window === "undefined") {
    throw new Error("Google auth can only be initiated on the client side");
  }

  // Get fresh config for client side
  const config = getGoogleConfig();
  
  // Check if client ID is configured
  if (!config.clientId) {
    throw new Error("Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scope,
    access_type: "offline",
    prompt: "select_account",
    include_granted_scopes: "true",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  
  console.log("Google OAuth URL:", authUrl);
  console.log("Redirect URI:", config.redirectUri);
  console.log("Client ID:", config.clientId);
  
  window.location.href = authUrl;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const config = getGoogleConfig();
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  return response.json();
}

export async function getUserFromToken(accessToken: string): Promise<GoogleUser> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  return response.json();
}