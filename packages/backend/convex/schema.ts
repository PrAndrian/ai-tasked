import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User Authentication
  users: defineTable({
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    
    // Google Calendar OAuth
    googleCalendarTokens: v.optional(v.object({
      accessToken: v.string(),
      refreshToken: v.string(),
      expiresAt: v.number(),
    })),
  })
  .index("by_email", ["email"]),

  // Task Management
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    
    // Scheduling
    scheduledFor: v.optional(v.number()), // Unix timestamp
    duration: v.optional(v.number()), // Minutes
    
    // AI Date Suggestions & XP Boosts
    suggestedDate: v.optional(v.number()), // AI suggested optimal date
    xpBoost: v.optional(v.number()), // Extra XP for accepting AI suggestion
    suggestionReason: v.optional(v.string()), // Why AI suggests this date
    usedSuggestedDate: v.optional(v.boolean()), // Whether user accepted suggestion
    
    // Recurrence
    recurrence: v.optional(v.object({
      pattern: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      interval: v.number(),
      endDate: v.optional(v.number())
    })),
    
    // Hierarchy
    parentTaskId: v.optional(v.id("tasks")),
    
    // Gamification
    xpValue: v.number(),
    difficultyLevel: v.number(), // 1-5 (AI controlled)
    
    // AI Generated
    aiGenerated: v.boolean(),
    aiContext: v.optional(v.string()),
    
    // Google Calendar Integration
    googleCalendarEventId: v.optional(v.string()),
    
    createdAt: v.number(),
    updatedAt: v.number()
  })
  .index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"])
  .index("by_scheduled", ["userId", "scheduledFor"])
  .index("by_parent", ["parentTaskId"]),

  // User Progress & Gamification
  userProgress: defineTable({
    userId: v.id("users"),
    totalXp: v.number(),
    currentLevel: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastTaskCompletedDate: v.optional(v.number()),
    
    // Character/Plant state
    characterType: v.string(), // "plant", "pet", "avatar"
    characterStage: v.number(), // Growth stage
    characterCustomization: v.object({
      color: v.string(),
      accessories: v.array(v.string())
    }),
    
    // Achievements
    unlockedAchievements: v.array(v.string()),
    
    // Stats
    tasksCompleted: v.number(),
    perfectDays: v.number(),
    
    createdAt: v.number(),
    updatedAt: v.number()
  })
  .index("by_user", ["userId"]),

  // Achievements System
  achievements: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    requirements: v.object({
      type: v.union(
        v.literal("tasks_completed"),
        v.literal("streak_days"),
        v.literal("total_xp"),
        v.literal("perfect_days")
      ),
      value: v.number()
    }),
    xpReward: v.number(),
    createdAt: v.number()
  }),

  // Legacy todos table (keep for migration)
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
});
