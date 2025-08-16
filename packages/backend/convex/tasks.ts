import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { calculateXP } from "./gamification";
import { api, internal } from "./_generated/api";

// Get all tasks for a user
export const getAllTasks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Sort by scheduledFor (null values last), then by createdAt
    return tasks.sort((a, b) => {
      if (a.scheduledFor && b.scheduledFor) {
        return a.scheduledFor - b.scheduledFor;
      }
      if (a.scheduledFor && !b.scheduledFor) return -1;
      if (!a.scheduledFor && b.scheduledFor) return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

// Get tasks by status
export const getTasksByStatus = query({
  args: { 
    userId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"))
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_status", (q) => 
        q.eq("userId", args.userId).eq("status", args.status)
      )
      .collect();
  },
});

// Get scheduled tasks for a date range
export const getScheduledTasks = query({
  args: { 
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number()
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_scheduled", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("scheduledFor"), args.startDate),
          q.lte(q.field("scheduledFor"), args.endDate)
        )
      )
      .collect();

    return tasks.sort((a, b) => (a.scheduledFor || 0) - (b.scheduledFor || 0));
  },
});

// Get subtasks
export const getSubtasks = query({
  args: { parentTaskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_parent", (q) => q.eq("parentTaskId", args.parentTaskId))
      .collect();
  },
});

// Create a new task
export const createTask = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    scheduledFor: v.optional(v.number()),
    duration: v.optional(v.number()),
    difficultyLevel: v.optional(v.number()),
    parentTaskId: v.optional(v.id("tasks")),
    aiGenerated: v.optional(v.boolean()),
    aiContext: v.optional(v.string()),
    suggestedDate: v.optional(v.number()),
    xpBoost: v.optional(v.number()),
    suggestionReason: v.optional(v.string()),
    recurrence: v.optional(v.object({
      pattern: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      interval: v.number(),
      endDate: v.optional(v.number())
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const difficultyLevel = args.difficultyLevel || 1;
    
    // Calculate XP value based on priority and difficulty
    const xpValue = calculateXP(args.priority, difficultyLevel);

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      userId: args.userId,
      status: "pending",
      priority: args.priority,
      scheduledFor: args.scheduledFor,
      duration: args.duration,
      recurrence: args.recurrence,
      parentTaskId: args.parentTaskId,
      xpValue,
      difficultyLevel,
      aiGenerated: args.aiGenerated || false,
      aiContext: args.aiContext,
      suggestedDate: args.suggestedDate,
      xpBoost: args.xpBoost,
      suggestionReason: args.suggestionReason,
      usedSuggestedDate: false,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(taskId);
  },
});

// Update task (only user-editable fields)
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"))),
    scheduledFor: v.optional(v.number()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ task: any; xpResult: any }> => {
    const { taskId, ...updates } = args;
    const task = await ctx.db.get(taskId);
    
    if (!task) {
      throw new Error("Task not found");
    }

    // Handle XP adjustments for status changes
    let xpResult = null;
    if (updates.status && updates.status !== task.status) {
      // If moving FROM completed to another status, deduct XP
      if (task.status === "completed" && updates.status !== "completed") {
        const subtasks = await ctx.db
          .query("tasks")
          .withIndex("by_parent", (q) => q.eq("parentTaskId", taskId))
          .collect();
        
        const xpToDeduct = calculateXP(task.priority, task.difficultyLevel, subtasks.length);
        xpResult = await ctx.runMutation(internal.gamification.awardXP, {
          userId: task.userId,
          xpAmount: -xpToDeduct, // Negative XP to deduct
          taskId: taskId,
        });
      }
      // If moving TO completed from another status, award XP
      else if (task.status !== "completed" && updates.status === "completed") {
        const subtasks = await ctx.db
          .query("tasks")
          .withIndex("by_parent", (q) => q.eq("parentTaskId", taskId))
          .collect();
        
        const xpToAward = calculateXP(task.priority, task.difficultyLevel, subtasks.length);
        xpResult = await ctx.runMutation(internal.gamification.awardXP, {
          userId: task.userId,
          xpAmount: xpToAward,
          taskId: taskId,
        });
      }
    }

    // Note: Priority and difficulty are AI-controlled and cannot be updated by users
    // XP value remains unchanged as it's based on AI-set priority and difficulty

    await ctx.db.patch(taskId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return {
      task: await ctx.db.get(taskId),
      xpResult
    };
  },
});

// Complete task (awards XP)
export const completeTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args): Promise<any> => {
    const task = await ctx.db.get(args.taskId);
    
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status === "completed") {
      throw new Error("Task is already completed");
    }

    // Update task status
    await ctx.db.patch(args.taskId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    // Count subtasks for XP bonus
    const subtasks = await ctx.db
      .query("tasks")
      .withIndex("by_parent", (q) => q.eq("parentTaskId", args.taskId))
      .collect();

    // Award XP
    const xpResult: any = await ctx.runMutation(internal.gamification.awardXP, {
      userId: task.userId,
      xpAmount: calculateXP(task.priority, task.difficultyLevel, subtasks.length),
      taskId: args.taskId,
    });

    return {
      task: await ctx.db.get(args.taskId),
      xpResult,
    };
  },
});

// Delete task
export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    
    if (!task) {
      throw new Error("Task not found");
    }

    // Delete all subtasks first
    const subtasks = await ctx.db
      .query("tasks")
      .withIndex("by_parent", (q) => q.eq("parentTaskId", args.taskId))
      .collect();

    for (const subtask of subtasks) {
      await ctx.db.delete(subtask._id);
    }

    // Delete the main task
    await ctx.db.delete(args.taskId);

    return { success: true };
  },
});

// Get task by ID
export const getTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

// Accept AI date suggestion and apply XP boost
export const acceptDateSuggestion = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    
    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.suggestedDate || !task.xpBoost) {
      throw new Error("No date suggestion available");
    }

    if (task.usedSuggestedDate) {
      throw new Error("Date suggestion already used");
    }

    // Update task with suggested date and mark as used
    await ctx.db.patch(args.taskId, {
      scheduledFor: task.suggestedDate,
      usedSuggestedDate: true,
      updatedAt: Date.now(),
    });

    // Award immediate XP boost
    const xpResult: any = await ctx.runMutation(internal.gamification.awardXP, {
      userId: task.userId,
      xpAmount: task.xpBoost,
      taskId: args.taskId,
    });

    return {
      task: await ctx.db.get(args.taskId),
      xpResult,
      boost: task.xpBoost,
    };
  },
});

// Search tasks
export const searchTasks = query({
  args: { 
    userId: v.id("users"),
    searchTerm: v.string()
  },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const searchTerm = args.searchTerm.toLowerCase();
    
    return allTasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm) ||
      (task.description && task.description.toLowerCase().includes(searchTerm))
    );
  },
});