import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Google Calendar OAuth URLs
const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events"
].join(" ");

// Get Google OAuth URL for calendar integration
export const getGoogleCalendarAuthUrl = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/auth/google/callback";
    
    if (!clientId) {
      throw new Error("Google Client ID not configured");
    }

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", args.userId); // Pass user ID in state

    return { authUrl: authUrl.toString() };
  },
});

// Exchange OAuth code for tokens
export const exchangeGoogleCalendarCode = action({
  args: {
    code: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/auth/google/callback";

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code: args.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json();

      // Store tokens in user record
      await ctx.runMutation(api.auth.updateGoogleCalendarTokens, {
        userId: args.userId,
        tokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: Date.now() + (tokens.expires_in * 1000),
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Google Calendar token exchange error:", error);
      throw new Error("Failed to connect Google Calendar");
    }
  },
});

// Refresh Google Calendar tokens
export const refreshGoogleCalendarTokens = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<any> => {
    const user: any = await ctx.runQuery(api.auth.getUserWithProgress, { userId: args.userId });
    
    if (!user?.googleCalendarTokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    try {
      const refreshResponse: any = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          refresh_token: user.googleCalendarTokens.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error(`Token refresh failed: ${refreshResponse.status}`);
      }

      const tokens: any = await refreshResponse.json();

      // Update tokens
      await ctx.runMutation(api.auth.updateGoogleCalendarTokens, {
        userId: args.userId,
        tokens: {
          accessToken: tokens.access_token,
          refreshToken: user.googleCalendarTokens.refreshToken, // Keep existing refresh token
          expiresAt: Date.now() + (tokens.expires_in * 1000),
        },
      });

      return tokens.access_token;
    } catch (error) {
      console.error("Google Calendar token refresh error:", error);
      throw new Error("Failed to refresh Google Calendar tokens");
    }
  },
});

// Get valid access token (refresh if needed)
async function getValidAccessToken(ctx: any, userId: string): Promise<string> {
  const user = await ctx.runQuery(api.auth.getUserWithProgress, { userId });
  
  if (!user?.googleCalendarTokens) {
    throw new Error("Google Calendar not connected");
  }

  const { accessToken, expiresAt } = user.googleCalendarTokens;
  
  // Check if token is expired (refresh 5 minutes early)
  if (Date.now() >= (expiresAt - 5 * 60 * 1000)) {
    return await ctx.runAction(api.calendar.refreshGoogleCalendarTokens, { userId });
  }

  return accessToken;
}

// Fetch calendar events
export const fetchCalendarEvents = action({
  args: {
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const accessToken = await getValidAccessToken(ctx, args.userId);
      
      const startTime = new Date(args.startDate).toISOString();
      const endTime = new Date(args.endDate).toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        new URLSearchParams({
          timeMin: startTime,
          timeMax: endTime,
          singleEvents: "true",
          orderBy: "startTime",
        }),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        events: data.items || [],
        success: true,
      };
    } catch (error) {
      console.error("Fetch calendar events error:", error);
      return {
        events: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Find free time slots
export const findFreeTimeSlots = action({
  args: {
    userId: v.id("users"),
    date: v.number(), // Unix timestamp for the day
    durationMinutes: v.number(),
    preferredTimes: v.optional(v.array(v.object({
      start: v.string(), // "09:00"
      end: v.string(),   // "17:00"
    }))),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const dayStart = new Date(args.date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(args.date);
      dayEnd.setHours(23, 59, 59, 999);

      // Fetch calendar events for the day
      const calendarResult: any = await ctx.runAction(api.calendar.fetchCalendarEvents, {
        userId: args.userId,
        startDate: dayStart.getTime(),
        endDate: dayEnd.getTime(),
      });

      if (!calendarResult.success) {
        throw new Error(calendarResult.error);
      }

      // Convert events to busy time slots
      const busySlots: any[] = calendarResult.events
        .filter((event: any) => event.start?.dateTime && event.end?.dateTime)
        .map((event: any) => ({
          start: new Date(event.start.dateTime).getTime(),
          end: new Date(event.end.dateTime).getTime(),
        }))
        .sort((a: any, b: any) => a.start - b.start);

      // Define working hours (default 9 AM - 6 PM)
      const workingHours = args.preferredTimes || [{ start: "09:00", end: "18:00" }];
      const freeSlots = [];

      for (const workingPeriod of workingHours) {
        const [startHour, startMin] = workingPeriod.start.split(":").map(Number);
        const [endHour, endMin] = workingPeriod.end.split(":").map(Number);
        
        const periodStart = new Date(args.date);
        periodStart.setHours(startHour, startMin, 0, 0);
        
        const periodEnd = new Date(args.date);
        periodEnd.setHours(endHour, endMin, 0, 0);

        let currentTime = periodStart.getTime();
        const periodEndTime = periodEnd.getTime();

        while (currentTime + (args.durationMinutes * 60 * 1000) <= periodEndTime) {
          const slotEnd = currentTime + (args.durationMinutes * 60 * 1000);
          
          // Check if this slot conflicts with any busy slot
          const hasConflict = busySlots.some((busy: any) => 
            (currentTime < busy.end && slotEnd > busy.start)
          );

          if (!hasConflict) {
            freeSlots.push({
              start: currentTime,
              end: slotEnd,
              startTime: new Date(currentTime).toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit" 
              }),
              endTime: new Date(slotEnd).toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit" 
              }),
            });
          }

          // Move to next 15-minute slot
          currentTime += 15 * 60 * 1000;
        }
      }

      return {
        freeSlots,
        busySlots,
        success: true,
      };
    } catch (error) {
      console.error("Find free time slots error:", error);
      return {
        freeSlots: [],
        busySlots: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Create calendar event for task
export const createCalendarEvent = action({
  args: {
    userId: v.id("users"),
    taskId: v.id("tasks"),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const accessToken = await getValidAccessToken(ctx, args.userId);
      const task: any = await ctx.runQuery(api.tasks.getTask, { taskId: args.taskId });
      
      if (!task) {
        throw new Error("Task not found");
      }

      const event: any = {
        summary: task.title,
        description: task.description || "Created by AI-Tasked",
        start: {
          dateTime: new Date(args.startTime).toISOString(),
        },
        end: {
          dateTime: new Date(args.endTime).toISOString(),
        },
        reminders: {
          useDefault: true,
        },
      };

      const response: any = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar event creation failed: ${response.status}`);
      }

      const createdEvent: any = await response.json();

      // Update task with calendar event timing
      await ctx.runMutation(api.tasks.updateTask, {
        taskId: args.taskId,
        scheduledFor: args.startTime,
        duration: Math.round((args.endTime - args.startTime) / (1000 * 60)),
      });

      return {
        success: true,
        eventId: createdEvent.id,
        eventUrl: createdEvent.htmlLink,
      };
    } catch (error) {
      console.error("Create calendar event error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Check calendar connection status
export const getCalendarConnectionStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    return {
      connected: !!user?.googleCalendarTokens,
      expiresAt: user?.googleCalendarTokens?.expiresAt,
    };
  },
});