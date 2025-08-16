import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// XP Calculation based on PRD
export const calculateXP = (priority: string, difficultyLevel: number, subtaskCount = 0): number => {
  const baseXPValues = {
    low: 10,
    medium: 25,
    high: 50,
    urgent: 75,
  };
  const baseXP: number = baseXPValues[priority as keyof typeof baseXPValues] || 10;

  const difficultyMultiplier = difficultyLevel * 0.5;
  const subtaskBonus = subtaskCount * 5;

  return Math.round(baseXP * difficultyMultiplier + subtaskBonus);
};

// Calculate level from XP
export const calculateLevel = (totalXp: number): number => {
  // Level formula: Level = floor(sqrt(XP / 100)) + 1
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
};

// Calculate character stage from XP
export const calculateCharacterStage = (totalXp: number): number => {
  const stages = [
    { stage: 1, requiredXP: 0 },     // Seed
    { stage: 2, requiredXP: 100 },   // Sprout
    { stage: 3, requiredXP: 500 },   // Sapling
    { stage: 4, requiredXP: 2000 },  // Tree
    { stage: 5, requiredXP: 10000 }, // Ancient Tree
  ];

  for (let i = stages.length - 1; i >= 0; i--) {
    if (totalXp >= stages[i].requiredXP) {
      return stages[i].stage;
    }
  }
  return 1;
};

// Award XP when task is completed
export const awardXP = internalMutation({
  args: {
    userId: v.id("users"),
    xpAmount: v.number(),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!progress) {
      throw new Error("User progress not found");
    }

    const newTotalXp = progress.totalXp + args.xpAmount;
    const newLevel = calculateLevel(newTotalXp);
    const newCharacterStage = calculateCharacterStage(newTotalXp);
    const now = Date.now();

    // Calculate streak
    const today = new Date().toDateString();
    const lastCompletedDate = progress.lastTaskCompletedDate 
      ? new Date(progress.lastTaskCompletedDate).toDateString()
      : null;
    
    let newStreak = progress.currentStreak;
    if (lastCompletedDate !== today) {
      // First task of the day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();
      
      if (lastCompletedDate === yesterdayString) {
        // Consecutive day
        newStreak += 1;
      } else if (lastCompletedDate !== today) {
        // Streak broken or first task ever
        newStreak = 1;
      }
    }

    const newLongestStreak = Math.max(progress.longestStreak, newStreak);

    await ctx.db.patch(progress._id, {
      totalXp: newTotalXp,
      currentLevel: newLevel,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      characterStage: newCharacterStage,
      tasksCompleted: progress.tasksCompleted + 1,
      lastTaskCompletedDate: now,
      updatedAt: now,
    });

    // Check for achievements
    await checkAchievements(ctx, args.userId, {
      totalXp: newTotalXp,
      tasksCompleted: progress.tasksCompleted + 1,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
    });

    return {
      xpAwarded: args.xpAmount,
      newTotalXp,
      newLevel,
      levelUp: newLevel > progress.currentLevel,
      newCharacterStage,
      stageUp: newCharacterStage > progress.characterStage,
      newStreak,
    };
  },
});

// Check and unlock achievements
const checkAchievements = async (
  ctx: any,
  userId: string,
  stats: {
    totalXp: number;
    tasksCompleted: number;
    currentStreak: number;
    longestStreak: number;
  }
) => {
  const achievements = await ctx.db.query("achievements").collect();
  const progress = await ctx.db
    .query("userProgress")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!progress) return;

  const newAchievements = [];

  for (const achievement of achievements) {
    if (progress.unlockedAchievements.includes(achievement._id)) {
      continue; // Already unlocked
    }

    const { type, value } = achievement.requirements;
    let unlocked = false;

    switch (type) {
      case "tasks_completed":
        unlocked = stats.tasksCompleted >= value;
        break;
      case "total_xp":
        unlocked = stats.totalXp >= value;
        break;
      case "streak_days":
        unlocked = stats.longestStreak >= value;
        break;
      case "perfect_days":
        unlocked = progress.perfectDays >= value;
        break;
    }

    if (unlocked) {
      newAchievements.push(achievement._id);
    }
  }

  if (newAchievements.length > 0) {
    await ctx.db.patch(progress._id, {
      unlockedAchievements: [
        ...progress.unlockedAchievements,
        ...newAchievements,
      ],
      updatedAt: Date.now(),
    });
  }
};

// Get user progress
export const getUserProgress = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Get achievements
export const getAchievements = query({
  handler: async (ctx) => {
    return await ctx.db.query("achievements").collect();
  },
});

// Seed initial achievements
export const seedAchievements = mutation({
  handler: async (ctx) => {
    const existingAchievements = await ctx.db.query("achievements").collect();
    if (existingAchievements.length > 0) {
      return; // Already seeded
    }

    const achievements = [
      {
        name: "First Steps",
        description: "Complete your first task",
        icon: "🌱",
        requirements: { type: "tasks_completed" as const, value: 1 },
        xpReward: 50,
      },
      {
        name: "Getting Started",
        description: "Complete 10 tasks",
        icon: "🚀",
        requirements: { type: "tasks_completed" as const, value: 10 },
        xpReward: 100,
      },
      {
        name: "Task Master",
        description: "Complete 100 tasks",
        icon: "🏆",
        requirements: { type: "tasks_completed" as const, value: 100 },
        xpReward: 500,
      },
      {
        name: "Streak Starter",
        description: "Maintain a 3-day streak",
        icon: "🔥",
        requirements: { type: "streak_days" as const, value: 3 },
        xpReward: 75,
      },
      {
        name: "Consistency King",
        description: "Maintain a 7-day streak",
        icon: "👑",
        requirements: { type: "streak_days" as const, value: 7 },
        xpReward: 200,
      },
      {
        name: "XP Hunter",
        description: "Earn 1000 XP",
        icon: "⚡",
        requirements: { type: "total_xp" as const, value: 1000 },
        xpReward: 100,
      },
    ];

    for (const achievement of achievements) {
      await ctx.db.insert("achievements", {
        ...achievement,
        createdAt: Date.now(),
      });
    }
  },
});