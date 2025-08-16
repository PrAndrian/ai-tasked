import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useConvexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ai-tasked/backend";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  Clock, 
  Star, 
  CheckCircle2, 
  Circle, 
  Play, 
  Trash2,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaskListProps {
  userId: string;
  onTaskUpdate?: () => void;
}

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  scheduledFor?: number;
  duration?: number;
  xpValue: number;
  difficultyLevel: number;
  aiGenerated: boolean;
  createdAt: number;
}

export function TaskList({ userId, onTaskUpdate }: TaskListProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");

  // Fetch tasks
  const queryResult = useConvexQuery(
    api.tasks.getAllTasks,
    { userId: userId as any }
  );
  
  const tasks = queryResult?.data || [];
  const isLoading = queryResult?.isLoading || false;
  const error = queryResult?.error;

  if (error) {
    console.error("TaskList query error:", error);
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-500">
          Failed to load tasks. Please try refreshing the page.
        </CardContent>
      </Card>
    );
  }

  const completeTask = useConvexMutation(api.tasks.completeTask);
  const updateTask = useConvexMutation(api.tasks.updateTask);
  const deleteTask = useConvexMutation(api.tasks.deleteTask);

  const completeTaskMutation = useMutation({
    mutationFn: (taskId: string) => completeTask({ taskId: taskId as any }),
    onSuccess: (result) => {
      toast.success(
        `Task completed! +${result.xpResult.xpAwarded} XP`,
        {
          description: result.xpResult.levelUp 
            ? `🎉 Level up! You're now level ${result.xpResult.newLevel}!`
            : undefined,
        }
      );
      onTaskUpdate?.();
    },
    onError: (error) => {
      console.error("Complete task error:", error);
      toast.error("Failed to complete task");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: Task["status"] }) => 
      updateTask({ taskId: taskId as any, status }),
    onSuccess: () => {
      onTaskUpdate?.();
    },
    onError: (error) => {
      console.error("Update task error:", error);
      toast.error("Failed to update task");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask({ taskId: taskId as any }),
    onSuccess: () => {
      toast.success("Task deleted");
      onTaskUpdate?.();
    },
    onError: (error) => {
      console.error("Delete task error:", error);
      toast.error("Failed to delete task");
    },
  });

  const handleStatusChange = (task: Task, newStatus: Task["status"]) => {
    if (newStatus === "completed") {
      completeTaskMutation.mutate(task._id);
    } else {
      updateTaskMutation.mutate({ taskId: task._id, status: newStatus });
    }
  };

  const filteredTasks = (tasks || []).filter(task => 
    filter === "all" || task?.status === filter
  );

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress": return <Play className="h-4 w-4 text-blue-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "All Tasks" },
          { key: "pending", label: "Pending" },
          { key: "in_progress", label: "In Progress" },
          { key: "completed", label: "Completed" },
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key as any)}
          >
            {label}
            <Badge variant="secondary" className="ml-2">
              {(tasks || []).filter(t => key === "all" || t?.status === key).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {filter === "all" 
                ? "No tasks yet. Create your first task above!" 
                : `No ${filter} tasks.`
              }
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card 
              key={task._id}
              className={cn(
                "transition-all duration-200 hover:shadow-md",
                task.status === "completed" && "opacity-75"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Status Checkbox */}
                  <div className="pt-1">
                    {getStatusIcon(task.status)}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className={cn(
                          "font-medium",
                          task.status === "completed" && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                          {task.aiGenerated && (
                            <Zap className="inline h-3 w-3 ml-1 text-blue-500" />
                          )}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {task.status !== "completed" && (
                          <>
                            {task.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(task, "in_progress")}
                              >
                                Start
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(task, "completed")}
                              disabled={completeTaskMutation.isPending}
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTaskMutation.mutate(task._id)}
                          disabled={deleteTaskMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Task Metadata */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      {/* Priority */}
                      <div className="flex items-center gap-1">
                        <div className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority))} />
                        <span className="capitalize">{task.priority}</span>
                      </div>

                      {/* XP Value */}
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        <span>{task.xpValue} XP</span>
                      </div>

                      {/* Difficulty */}
                      <div className="flex items-center gap-1">
                        <span>Difficulty: {task.difficultyLevel}/5</span>
                      </div>

                      {/* Scheduled Time */}
                      {task.scheduledFor && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(task.scheduledFor).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {/* Duration */}
                      {task.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{task.duration}m</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}