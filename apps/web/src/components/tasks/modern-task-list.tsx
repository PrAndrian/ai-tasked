import { useState } from "react";
import { useConvexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ai-tasked/backend";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskEditDrawer } from "./task-edit-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Calendar, 
  Clock, 
  Star, 
  CheckCircle2, 
  Circle, 
  Play, 
  Trash2,
  Zap,
  MoreHorizontal,
  Filter,
  Sparkles,
  Edit3,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

interface ModernTaskListProps {
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
  suggestedDate?: number;
  xpBoost?: number;
  suggestionReason?: string;
  usedSuggestedDate?: boolean;
}


export function ModernTaskList({ userId, onTaskUpdate }: ModernTaskListProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [language] = useState<"en-US" | "fr-FR">("fr-FR"); // Could be passed as prop
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const tasks = useConvexQuery(
    api.tasks.getAllTasks,
    { userId: userId as any }
  );
  
  const isLoading = tasks === undefined;
  const error = null; // Convex queries handle errors differently

  const completeTask = useConvexMutation(api.tasks.completeTask);
  const updateTask = useConvexMutation(api.tasks.updateTask);
  const deleteTask = useConvexMutation(api.tasks.deleteTask);

  const completeTaskMutation = useMutation({
    mutationFn: (taskId: string) => completeTask({ taskId: taskId as any }),
    onSuccess: (result) => {
      toast.success(
        `${language === "fr-FR" ? "Tâche terminée ! +" : "Task completed! +"}${result.xpResult?.xpAwarded || 0} XP`,
        {
          description: result.xpResult?.levelUp 
            ? `🎉 ${language === "fr-FR" ? "Niveau supérieur ! Vous êtes maintenant niveau" : "Level up! You're now level"} ${result.xpResult.newLevel}!`
            : undefined,
        }
      );
      onTaskUpdate?.();
    },
    onError: () => {
      toast.error(language === "fr-FR" ? "Échec de la finalisation de la tâche" : "Failed to complete task");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: Task["status"] }) => 
      updateTask({ taskId: taskId as any, status }),
    onSuccess: (result) => {
      // Handle XP changes when status changes
      if (result?.xpResult) {
        const xpChange = result.xpResult.xpAwarded || 0;
        if (xpChange > 0) {
          toast.success(`✅ ${language === "fr-FR" ? "Tâche terminée ! +" : "Task completed! +"}${xpChange} XP`);
        } else if (xpChange < 0) {
          toast.info(`↩️ ${language === "fr-FR" ? "Tâche réouverte. " : "Task reopened. "}${xpChange} XP`);
        }
      }
      onTaskUpdate?.();
    },
    onError: () => {
      toast.error(language === "fr-FR" ? "Échec de la mise à jour de la tâche" : "Failed to update task");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask({ taskId: taskId as any }),
    onSuccess: () => {
      toast.success(language === "fr-FR" ? "Tâche supprimée" : "Task deleted");
      onTaskUpdate?.();
    },
    onError: () => {
      toast.error(language === "fr-FR" ? "Échec de la suppression de la tâche" : "Failed to delete task");
    },
  });

  const handleStatusChange = (task: Task, newStatus: Task["status"]) => {
    // Use updateTask for all status changes (it handles XP adjustments)
    updateTaskMutation.mutate({ taskId: task._id, status: newStatus });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditDrawerOpen(true);
  };

  const handleEditDrawerClose = () => {
    setIsEditDrawerOpen(false);
    setEditingTask(null);
  };

  const handleTaskUpdated = () => {
    onTaskUpdate?.();
  };

  const getFilteredTasks = (status: string) => {
    if (!tasks) return [];
    if (status === "all") return tasks;
    return tasks.filter((task: Task) => task.status === status);
  };

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

  const getStatusLabel = (status: Task["status"]) => {
    switch (status) {
      case "pending": return language === "fr-FR" ? "En attente" : "Pending";
      case "in_progress": return language === "fr-FR" ? "En cours" : "In Progress";
      case "completed": return language === "fr-FR" ? "Terminé" : "Completed";
    }
  };

  const getAvailableStatusOptions = (currentStatus: Task["status"]): Task["status"][] => {
    switch (currentStatus) {
      case "pending": return ["in_progress", "completed"];
      case "in_progress": return ["pending", "completed"];
      case "completed": return ["pending", "in_progress"];
      default: return [];
    }
  };

  const getTabCounts = () => {
    if (!tasks) return { all: 0, pending: 0, in_progress: 0, completed: 0 };
    return {
      all: tasks.length,
      pending: tasks.filter((t: Task) => t.status === "pending").length,
      in_progress: tasks.filter((t: Task) => t.status === "in_progress").length,
      completed: tasks.filter((t: Task) => t.status === "completed").length,
    };
  };

  const tabCounts = getTabCounts();

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-500">
          {language === "fr-FR" 
            ? "Échec du chargement des tâches. Veuillez actualiser la page." 
            : "Failed to load tasks. Please refresh the page."
          }
        </CardContent>
      </Card>
    );
  }

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
    <div className="space-y-6">

      {/* Task Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="text-xs">
            {language === "fr-FR" ? "Toutes" : "All"}
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
              {tabCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            {language === "fr-FR" ? "En attente" : "Pending"}
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
              {tabCounts.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs">
            {language === "fr-FR" ? "En cours" : "In Progress"}
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
              {tabCounts.in_progress}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            {language === "fr-FR" ? "Terminées" : "Completed"}
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
              {tabCounts.completed}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {["all", "pending", "in_progress", "completed"].map((status) => (
          <TabsContent key={status} value={status} className="space-y-3 mt-4">
            {getFilteredTasks(status).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {language === "fr-FR" 
                    ? `Aucune tâche ${status === "all" ? "" : status === "pending" ? "en attente" : status === "in_progress" ? "en cours" : "terminée"}.`
                    : `No ${status === "all" ? "" : status + " "}tasks.`
                  }
                </CardContent>
              </Card>
            ) : (
              getFilteredTasks(status).map((task: Task) => (
                <Card 
                  key={task._id}
                  className={cn(
                    "transition-all duration-200 hover:shadow-md",
                    task.status === "completed" && "opacity-75"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="pt-1">
                        {getStatusIcon(task.status)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={cn(
                              "font-medium text-sm sm:text-base",
                              task.status === "completed" && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                              {task.aiGenerated && (
                                <Zap className="inline h-3 w-3 ml-1 text-blue-500" />
                              )}
                            </h3>
                            {task.description && (
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Desktop: Inline buttons (hidden on mobile) */}
                          <div className="hidden sm:flex items-center gap-1 flex-wrap">
                            {task.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(task, "in_progress")}
                                  disabled={updateTaskMutation.isPending}
                                >
                                  {language === "fr-FR" ? "Démarrer" : "Start"}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(task, "completed")}
                                  disabled={updateTaskMutation.isPending}
                                >
                                  {language === "fr-FR" ? "Terminer" : "Complete"}
                                </Button>
                              </>
                            )}
                            
                            {task.status === "in_progress" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(task, "pending")}
                                  disabled={updateTaskMutation.isPending}
                                >
                                  {language === "fr-FR" ? "En attente" : "Pending"}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(task, "completed")}
                                  disabled={updateTaskMutation.isPending}
                                >
                                  {language === "fr-FR" ? "Terminer" : "Complete"}
                                </Button>
                              </>
                            )}
                            
                            {task.status === "completed" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(task, "pending")}
                                  disabled={updateTaskMutation.isPending}
                                >
                                  {language === "fr-FR" ? "En attente" : "Pending"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(task, "in_progress")}
                                  disabled={updateTaskMutation.isPending}
                                >
                                  {language === "fr-FR" ? "En cours" : "In Progress"}
                                </Button>
                              </>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditTask(task)}
                              title={language === "fr-FR" ? "Modifier la tâche" : "Edit task"}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteTaskMutation.mutate(task._id)}
                              disabled={deleteTaskMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Mobile: Compact dropdown design */}
                          <div className="flex sm:hidden items-center gap-2">
                            {/* Status Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-1 min-w-0"
                                  disabled={updateTaskMutation.isPending}
                                >
                                  {getStatusIcon(task.status)}
                                  <span className="text-xs truncate">
                                    {getStatusLabel(task.status)}
                                  </span>
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-40">
                                {getAvailableStatusOptions(task.status).map((statusOption) => (
                                  <DropdownMenuItem
                                    key={statusOption}
                                    onClick={() => handleStatusChange(task, statusOption)}
                                    className="flex items-center gap-2"
                                  >
                                    {getStatusIcon(statusOption)}
                                    <span>{getStatusLabel(statusOption)}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Action Icons */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditTask(task)}
                              className="p-2"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteTaskMutation.mutate(task._id)}
                              disabled={deleteTaskMutation.isPending}
                              className="p-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <div className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority))} />
                            <span className="capitalize">{task.priority}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            <span>{task.xpValue} XP</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span>{language === "fr-FR" ? "Difficulté" : "Difficulty"}: {task.difficultyLevel}/5</span>
                          </div>

                          {task.scheduledFor && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(task.scheduledFor).toLocaleDateString()}
                              </span>
                            </div>
                          )}

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
          </TabsContent>
        ))}
      </Tabs>

      {/* Task Edit Drawer */}
      <TaskEditDrawer
        task={editingTask}
        isOpen={isEditDrawerOpen}
        onOpenChange={handleEditDrawerClose}
        onTaskUpdated={handleTaskUpdated}
        language={language}
      />
    </div>
  );
}