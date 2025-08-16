import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get authenticated user from session stored in localStorage
export const getUserFromSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      googleId: user.googleId,
    };
  },
});

// Get user with progress for authenticated session
export const getUserWithProgressFromSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    return {
      ...user,
      progress,
    };
  },
});

// Validate session and return userId
export const validateSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    
    return session.userId;
  },
});