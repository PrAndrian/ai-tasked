import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// AI Orchestrator for task creation
export const processNaturalLanguageInput = action({
  args: {
    input: v.string(),
    inputType: v.union(v.literal("voice"), v.literal("text")),
    userId: v.id("users"),
    context: v.optional(v.object({
      previousTasks: v.optional(v.array(v.string())),
      userTimezone: v.optional(v.string()),
      currentTime: v.optional(v.number()),
    }))
  },
  handler: async (ctx, args): Promise<{success: boolean, tasks?: any[], error?: string}> => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      // Get user context
      const user = await ctx.runQuery(api.auth.getUserWithProgress, { 
        userId: args.userId 
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Prepare context for AI
      const contextPrompt = buildContextPrompt(args.input, args.context, user);
      
      // Call OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: TASK_CREATION_SYSTEM_PROMPT
            },
            {
              role: "user",
              content: contextPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `OpenAI API error: ${response.status}`;
        
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Please wait a moment and try again. You may need to add credits to your OpenAI account: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error("No response from AI");
      }

      // Parse AI response
      const parsedTasks = parseAIResponse(aiResponse);
      
      // Create tasks in database
      const createdTasks = [];
      for (const taskData of parsedTasks) {
        const task: any = await ctx.runMutation(api.tasks.createTask, {
          userId: args.userId,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          scheduledFor: taskData.scheduledFor,
          duration: taskData.duration,
          difficultyLevel: taskData.difficultyLevel,
          suggestedDate: taskData.suggestedDate,
          xpBoost: taskData.xpBoost,
          suggestionReason: taskData.reason,
          aiGenerated: true,
          aiContext: args.input,
        });

        createdTasks.push({
          ...task,
          hasDateSuggestion: !!(taskData.suggestedDate && taskData.xpBoost),
          suggestionData: taskData.suggestedDate && taskData.xpBoost ? {
            suggestedDate: taskData.suggestedDate,
            xpBoost: taskData.xpBoost,
            reason: taskData.reason
          } : null
        });

        // Create subtasks if any
        if (taskData.subtasks && taskData.subtasks.length > 0) {
          for (const subtaskData of taskData.subtasks) {
            await ctx.runMutation(api.tasks.createTask, {
              userId: args.userId,
              title: subtaskData.title,
              description: subtaskData.description,
              priority: subtaskData.priority || "medium",
              difficultyLevel: subtaskData.difficultyLevel || 1,
              parentTaskId: task!._id,
              aiGenerated: true,
              aiContext: args.input,
            });
          }
        }
      }

      return {
        success: true,
        tasks: createdTasks,
      };

    } catch (error) {
      console.error("AI processing error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// System prompt for task creation
const TASK_CREATION_SYSTEM_PROMPT = `You are an AI task planning assistant. Your job is to analyze natural language input and create structured, actionable tasks.

IMPORTANT: You must respond with ONLY a valid JSON array. No explanations, no markdown, no additional text.

For each task, determine:
1. title: Clear, actionable task title (required)
2. description: Detailed description if needed (optional)
3. priority: "low", "medium", "high", or "urgent" - YOU DECIDE (required)
4. difficultyLevel: 1-5 scale - YOU DECIDE based on task complexity (required)
5. duration: Estimated minutes (optional)
6. scheduledFor: Unix timestamp if user specified time (optional)
7. suggestedDate: Unix timestamp for optimal timing with reason (optional)
8. xpBoost: Extra XP reward if user accepts suggested date (optional, 10-50)
9. subtasks: Array of subtasks if task is complex (optional)

AI AUTHORITY RULES:
- YOU control priority AND difficulty - these determine XP rewards, preventing user XP farming
- YOU control difficulty level (1-5) based on task complexity, skills needed, time investment
- YOU control priority based on true urgency, importance, and consequences
- Priority levels: low=routine/optional, medium=important, high=urgent/significant, urgent=critical/time-sensitive
- Users can set their own dates, but YOUR suggestions offer rewards
- Suggest dates for: morning routines (early boost), urgent tasks (deadline bonus), habit building

PRIORITY ASSIGNMENT GUIDELINES:
- urgent: Critical deadlines, emergencies, health issues, legal matters
- high: Important deadlines, significant impact on goals, time-sensitive opportunities  
- medium: Regular responsibilities, planned activities, skill development
- low: Optional tasks, convenience items, nice-to-have improvements

Date Suggestion Examples:
- "Call doctor" → suggest next morning with +20 XP for early action
- "Exercise" → suggest consistent time with +15 XP for routine building
- "Study" → suggest optimal learning times with +25 XP for peak performance
- "Meal prep" → suggest Sunday with +30 XP for weekly planning

Example response:
[
  {
    "title": "Call doctor for appointment",
    "description": "Schedule annual checkup",
    "priority": "medium",
    "difficultyLevel": 2,
    "duration": 15,
    "suggestedDate": 1704110400000,
    "xpBoost": 20,
    "reason": "Morning calls are more likely to reach receptionist and show proactive health management"
  },
  {
    "title": "Weekly grocery shopping",
    "priority": "medium",
    "difficultyLevel": 3,
    "duration": 60,
    "suggestedDate": 1704196800000,
    "xpBoost": 25,
    "reason": "Sunday planning sets up the week for success and saves time"
  }
]`;

// Build context prompt with user information
function buildContextPrompt(
  input: string, 
  context: any, 
  user: any
): string {
  let prompt = `User input: "${input}"\n\n`;
  
  if (context?.currentTime) {
    const currentDate = new Date(context.currentTime);
    prompt += `Current time: ${currentDate.toISOString()}\n`;
  }
  
  if (context?.userTimezone) {
    prompt += `User timezone: ${context.userTimezone}\n`;
  }

  if (user.progress) {
    prompt += `User level: ${user.progress.currentLevel}\n`;
    prompt += `Current streak: ${user.progress.currentStreak} days\n`;
  }

  if (context?.previousTasks && context.previousTasks.length > 0) {
    prompt += `Recent tasks: ${context.previousTasks.join(", ")}\n`;
  }

  prompt += "\nPlease create structured tasks from this input:";
  
  return prompt;
}

// Parse AI response into task objects
function parseAIResponse(response: string): any[] {
  try {
    // Clean up response - remove any markdown or extra text
    let cleanResponse = response.trim();
    
    // Find JSON array in response
    const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanResponse = jsonMatch[0];
    }
    
    const parsedTasks = JSON.parse(cleanResponse);
    
    if (!Array.isArray(parsedTasks)) {
      throw new Error("AI response is not an array");
    }

    // Validate and clean each task
    return parsedTasks.map((task: any) => ({
      title: task.title || "Untitled Task",
      description: task.description || undefined,
      priority: ["low", "medium", "high", "urgent"].includes(task.priority) 
        ? task.priority 
        : "medium",
      difficultyLevel: Math.max(1, Math.min(5, task.difficultyLevel || 3)),
      duration: task.duration && task.duration > 0 ? task.duration : undefined,
      scheduledFor: task.scheduledFor && task.scheduledFor > 0 ? task.scheduledFor : undefined,
      suggestedDate: task.suggestedDate && task.suggestedDate > 0 ? task.suggestedDate : undefined,
      xpBoost: task.xpBoost && task.xpBoost > 0 ? Math.max(10, Math.min(50, task.xpBoost)) : undefined,
      reason: task.reason || undefined,
      subtasks: Array.isArray(task.subtasks) ? task.subtasks.map((subtask: any) => ({
        title: subtask.title || "Untitled Subtask",
        description: subtask.description || undefined,
        priority: ["low", "medium", "high", "urgent"].includes(subtask.priority) 
          ? subtask.priority 
          : "medium",
        difficultyLevel: Math.max(1, Math.min(5, subtask.difficultyLevel || 1)),
      })) : undefined,
    }));

  } catch (error) {
    console.error("Failed to parse AI response:", error);
    // Fallback: create a simple task from the original input
    return [{
      title: response.slice(0, 100) + (response.length > 100 ? "..." : ""),
      description: undefined,
      priority: "medium",
      difficultyLevel: 3,
    }];
  }
}

// Test AI connection
export const testAIConnection = action({
  handler: async () => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return { connected: false, error: "API key not configured" };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
        },
      });

      return { 
        connected: response.ok, 
        status: response.status,
        error: response.ok ? null : `HTTP ${response.status}`
      };
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  },
});