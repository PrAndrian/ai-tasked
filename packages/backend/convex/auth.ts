import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get current user
export const getCurrentUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    return user;
  },
});

// Create or update user
export const createOrUpdateUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    const now = Date.now();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        avatar: args.avatar,
        updatedAt: now,
      });
      return existingUser._id;
    } else {
      // Create new user
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
          color: "#10b981", // emerald-500
          accessories: [],
        },
        unlockedAchievements: [],
        tasksCompleted: 0,
        perfectDays: 0,
        createdAt: now,
        updatedAt: now,
      });

      return userId;
    }
  },
});

// Update Google Calendar tokens
export const updateGoogleCalendarTokens = mutation({
  args: {
    userId: v.id("users"),
    tokens: v.object({
      accessToken: v.string(),
      refreshToken: v.string(),
      expiresAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      googleCalendarTokens: args.tokens,
      updatedAt: Date.now(),
    });
  },
});

// Get user with progress
export const getUserWithProgress = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    return {
      ...user,
      progress,
    };
  },
});