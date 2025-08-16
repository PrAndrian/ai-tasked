import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Session management
export const createSession = mutation({
  args: {
    userId: v.id("users"),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
    return sessionId;
  },
});

export const getSessionUser = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    
    const user = await ctx.db.get(session.userId);
    return user;
  },
});

export const invalidateSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sessionId);
  },
});

// Enhanced user creation with session
export const signUpWithSession = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User already exists");
    }

    const now = Date.now();
    
    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      avatar: args.avatar,
      createdAt: now,
      updatedAt: now,
    });

    // Initialize user progress
    await ctx.db.insert("userProgress", {
      userId,
      totalXp: 0,
      currentLevel: 1,
      currentStreak: 0,
      longestStreak: 0,
      characterType: "plant",
      characterStage: 1,
      characterCustomization: {
        color: "#10b981",
        accessories: [],
      },
      unlockedAchievements: [],
      tasksCompleted: 0,
      perfectDays: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Create session (7 days)
    const sessionId = await ctx.db.insert("sessions", {
      userId,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    return { userId, sessionId };
  },
});

export const signInWithSession = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    
    // Create new session (7 days)
    const sessionId = await ctx.db.insert("sessions", {
      userId: user._id,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    return { userId: user._id, sessionId };
  },
});

// Google OAuth integration
export const signInWithGoogle = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    googleId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if user exists
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      // Create new user
      const userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        avatar: args.avatar,
        googleId: args.googleId,
        createdAt: now,
        updatedAt: now,
      });

      // Initialize user progress
      await ctx.db.insert("userProgress", {
        userId,
        totalXp: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
        characterType: "plant",
        characterStage: 1,
        characterCustomization: {
          color: "#10b981",
          accessories: [],
        },
        unlockedAchievements: [],
        tasksCompleted: 0,
        perfectDays: 0,
        createdAt: now,
        updatedAt: now,
      });

      user = await ctx.db.get(userId);
    } else {
      // Update existing user with Google info
      await ctx.db.patch(user._id, {
        name: args.name,
        avatar: args.avatar,
        googleId: args.googleId,
        updatedAt: now,
      });
    }

    // Create session
    const sessionId = await ctx.db.insert("sessions", {
      userId: user!._id,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    return { userId: user!._id, sessionId };
  },
});

// Logout - invalidate session
export const logout = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    try {
      // Delete the session
      await ctx.db.delete(args.sessionId);
      return { success: true };
    } catch (error) {
      // Session might already be deleted or invalid
      return { success: true }; // Still return success for UX
    }
  },
});

// Logout all sessions for a user
export const logoutAllSessions = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all sessions for the user
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Delete all sessions
    await Promise.all(
      sessions.map(session => ctx.db.delete(session._id))
    );

    return { sessionsDeleted: sessions.length };
  },
});