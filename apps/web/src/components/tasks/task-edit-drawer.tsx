import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ai-tasked/backend";
import { useMutation } from "@tanstack/react-query";
import { 
  Edit3, 
  Save, 
  X, 
  Calendar, 
  Clock,
  AlertTriangle,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface TaskEditDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: () => void;
  language?: "en-US" | "fr-FR";
}

export function TaskEditDrawer({ 
  task, 
  isOpen, 
  onOpenChange, 
  onTaskUpdated,
  language = "fr-FR" 
}: TaskEditDrawerProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledFor: "",
    duration: "",
  });

  const updateTask = useConvexMutation(api.tasks.updateTask);
  const acceptDateSuggestion = useConvexMutation(api.tasks.acceptDateSuggestion);

  const acceptSuggestionMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      return acceptDateSuggestion({ taskId: task._id as any });
    },
    onSuccess: (result) => {
      if (result) {
        toast.success(
          language === "fr-FR" 
            ? `🎉 Suggestion acceptée ! +${result.boost} XP bonus !`
            : `🎉 Suggestion accepted! +${result.boost} XP bonus!`
        );
        onTaskUpdated?.();
        // Update form data with new scheduled date
        if (result.task.scheduledFor) {
          setFormData(prev => ({
            ...prev,
            scheduledFor: new Date(result.task.scheduledFor!).toISOString().slice(0, 16)
          }));
        }
      }
    },
    onError: (error) => {
      console.error("Accept suggestion error:", error);
      toast.error(
        language === "fr-FR" 
          ? "Erreur lors de l'acceptation de la suggestion" 
          : "Failed to accept suggestion"
      );
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!task) return;
      
      const updateData: any = {
        taskId: task._id as any,
        title: data.title,
        description: data.description || undefined,
      };

      if (data.scheduledFor) {
        updateData.scheduledFor = new Date(data.scheduledFor).getTime();
      }

      if (data.duration) {
        updateData.duration = parseInt(data.duration);
      }

      return updateTask(updateData);
    },
    onSuccess: () => {
      toast.success(
        language === "fr-FR" ? "Tâche mise à jour !" : "Task updated!"
      );
      onTaskUpdated?.();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error(
        language === "fr-FR" 
          ? "Erreur lors de la mise à jour" 
          : "Failed to update task"
      );
    },
  });

  // Update form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        scheduledFor: task.scheduledFor 
          ? new Date(task.scheduledFor).toISOString().slice(0, 16)
          : "",
        duration: task.duration ? task.duration.toString() : "",
      });
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !formData.title.trim()) return;
    
    updateTaskMutation.mutate(formData);
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent": return "text-red-500";
      case "high": return "text-orange-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  const getPriorityIcon = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent": return <AlertTriangle className="h-4 w-4" />;
      case "high": return <Star className="h-4 w-4" />;
      case "medium": return <Clock className="h-4 w-4" />;
      case "low": return <Calendar className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (!task) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh] flex flex-col">
        <DrawerHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-500" />
                {language === "fr-FR" ? "Modifier la tâche" : "Edit Task"}
              </DrawerTitle>
              <DrawerDescription>
                {language === "fr-FR" 
                  ? "Modifiez les détails de votre tâche" 
                  : "Modify your task details"
                }
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="outline" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {language === "fr-FR" ? "Titre" : "Title"} *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={language === "fr-FR" ? "Titre de la tâche..." : "Task title..."}
                className="text-base"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {language === "fr-FR" ? "Description" : "Description"}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={language === "fr-FR" ? "Description optionnelle..." : "Optional description..."}
                className="min-h-[80px] resize-none text-base"
              />
            </div>

            {/* AI-Controlled Priority Display */}
            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                {getPriorityIcon(task.priority)}
                <span className="font-medium text-sm">
                  {language === "fr-FR" ? "Priorité définie par l'IA" : "AI-Set Priority"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn("flex items-center gap-2", getPriorityColor(task.priority))}>
                  {getPriorityIcon(task.priority)}
                  <span className="font-medium capitalize">
                    {language === "fr-FR" ? 
                      (task.priority === "low" ? "Faible" : 
                       task.priority === "medium" ? "Moyen" : 
                       task.priority === "high" ? "Élevé" : "Urgent") 
                      : task.priority
                    }
                  </span>
                  {task.aiGenerated && " ✨"}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "fr-FR" 
                  ? "La priorité détermine les récompenses XP et ne peut pas être modifiée"
                  : "Priority determines XP rewards and cannot be modified"
                }
              </p>
            </div>

            {/* AI-Controlled Difficulty Display */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Star className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {language === "fr-FR" ? "Difficulté définie par l'IA" : "AI-Set Difficulty"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i}
                      className={cn(
                        "h-3 w-3",
                        i < task.difficultyLevel ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {language === "fr-FR" ? "Niveau" : "Level"} {task.difficultyLevel}/5
                  {task.aiGenerated && " ✨"}
                </span>
              </div>
            </div>

            {/* AI Date Suggestion */}
            {task.suggestedDate && task.xpBoost && !task.usedSuggestedDate && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    ✨
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-purple-900 dark:text-purple-100 text-sm">
                        {language === "fr-FR" ? "Suggestion IA" : "AI Suggestion"}
                      </h4>
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                        <Star className="h-3 w-3 text-yellow-600" />
                        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                          +{task.xpBoost} XP
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                      {language === "fr-FR" ? "Moment optimal suggéré:" : "Suggested optimal time:"}
                    </p>
                    <div className="bg-white/50 dark:bg-black/20 rounded-md p-2 mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">
                          {new Date(task.suggestedDate).toLocaleString(
                            language === "fr-FR" ? "fr-FR" : "en-US",
                            { 
                              weekday: 'long',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }
                          )}
                        </span>
                      </div>
                    </div>
                    {task.suggestionReason && (
                      <p className="text-xs text-muted-foreground mb-3">
                        💡 {task.suggestionReason}
                      </p>
                    )}
                    <Button
                      type="button"
                      onClick={() => acceptSuggestionMutation.mutate()}
                      disabled={acceptSuggestionMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm"
                    >
                      {acceptSuggestionMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          {language === "fr-FR" ? "Acceptation..." : "Accepting..."}
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          {language === "fr-FR" 
                            ? `Accepter (+${task.xpBoost} XP)` 
                            : `Accept (+${task.xpBoost} XP)`
                          }
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled For */}
            <div className="space-y-2">
              <Label htmlFor="scheduledFor">
                <Calendar className="h-4 w-4 inline mr-1" />
                {language === "fr-FR" ? "Planifié pour" : "Scheduled for"}
                {task.usedSuggestedDate && (
                  <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                    ✨ {language === "fr-FR" ? "Suggestion acceptée" : "AI suggestion used"}
                  </span>
                )}
              </Label>
              <Input
                id="scheduledFor"
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                className="text-base"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">
                <Clock className="h-4 w-4 inline mr-1" />
                {language === "fr-FR" ? "Durée (minutes)" : "Duration (minutes)"}
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="1440"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder={language === "fr-FR" ? "Ex: 30" : "e.g. 30"}
                className="text-base"
              />
            </div>

            {/* Task Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span>{task.xpValue} XP {language === "fr-FR" ? "actuels" : "current"}</span>
              </div>
              {task.aiGenerated && (
                <div className="flex items-center gap-2">
                  ✨ {language === "fr-FR" ? "Créé par l'IA" : "AI generated"}
                </div>
              )}
              <div>
                {language === "fr-FR" ? "Créé le" : "Created"}: {" "}
                {new Date(task.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <DrawerFooter className="flex-shrink-0">
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={!formData.title.trim() || updateTaskMutation.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateTaskMutation.isPending 
                  ? (language === "fr-FR" ? "Sauvegarde..." : "Saving...")
                  : (language === "fr-FR" ? "Sauvegarder" : "Save Changes")
                }
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" disabled={updateTaskMutation.isPending}>
                  {language === "fr-FR" ? "Annuler" : "Cancel"}
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}