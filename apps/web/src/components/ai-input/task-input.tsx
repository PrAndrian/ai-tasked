import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleVoiceInput } from "./simple-voice-input";
import { Loader, Send, Sparkles, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation, useConvexAction } from "@convex-dev/react-query";
import { api } from "@ai-tasked/backend";
import { toast } from "sonner";

interface TaskInputProps {
  userId: string;
  onTasksCreated?: (tasks: any[]) => void;
  className?: string;
  placeholder?: string;
  language?: "en-US" | "fr-FR";
}

export function TaskInput({
  userId,
  onTasksCreated,
  className,
  placeholder = "Tell me what you need to do...",
  language = "en-US",
}: TaskInputProps) {
  const [input, setInput] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"en-US" | "fr-FR">(language);
  const inputRef = useRef<HTMLInputElement>(null);

  const processInput = useConvexAction(api.ai.processNaturalLanguageInput);
  
  const createTasksMutation = useMutation({
    mutationFn: async (inputText: string) => {
      return processInput({
        input: inputText,
        inputType: "text", // Always text now since voice is transcribed first
        userId: userId as any,
        context: {
          currentTime: Date.now(),
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        const message = currentLanguage === "fr-FR" 
          ? `${result.tasks.length} tâche(s) créée(s) avec succès !` 
          : `Created ${result.tasks.length} task(s) successfully!`;
        toast.success(message);
        onTasksCreated?.(result.tasks);
        setInput("");
        setInterimTranscript("");
      } else {
        const errorMsg = currentLanguage === "fr-FR" 
          ? "Échec de la création des tâches" 
          : "Failed to create tasks";
        toast.error(result.error || errorMsg);
      }
    },
    onError: (error) => {
      console.error("Task creation error:", error);
      const errorMsg = currentLanguage === "fr-FR" 
        ? "Intégration IA temporairement désactivée. Veuillez créer les tâches manuellement." 
        : "AI integration temporarily disabled. Please create tasks manually for now.";
      toast.error(errorMsg);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputText = input.trim();
    
    if (!inputText) return;
    
    createTasksMutation.mutate(inputText);
  };

  const handleVoiceTranscription = (transcript: string) => {
    // Add transcribed text to input
    const newInput = input + (input ? " " : "") + transcript;
    setInput(newInput);
    setIsVoiceMode(false); // Exit voice mode after transcription
  };

  const handleVoiceError = (error: string) => {
    // Translate common errors to French if needed
    const translatedError = currentLanguage === "fr-FR" 
      ? error.replace("Failed to access microphone", "Échec d'accès au microphone")
             .replace("No speech detected", "Aucune parole détectée")
             .replace("Failed to transcribe", "Échec de transcription")
      : error;
    toast.error(translatedError);
    setIsVoiceMode(false);
  };

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current && !isVoiceMode) {
      inputRef.current.focus();
    }
  }, [isVoiceMode]);

  const displayValue = input;
  const isLoading = createTasksMutation.isPending;

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                type="text"
                value={displayValue}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentLanguage === "fr-FR" ? "Dites-moi ce que vous devez faire..." : placeholder}
                disabled={isLoading}
                className="pr-12"
              />
              
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCurrentLanguage(currentLanguage === "en-US" ? "fr-FR" : "en-US")}
              title={`Current language: ${currentLanguage === "en-US" ? "English" : "Français"}`}
              className="shrink-0"
            >
              <Languages className="h-4 w-4" />
            </Button>

            <SimpleVoiceInput
              onTranscriptionComplete={handleVoiceTranscription}
              onError={handleVoiceError}
              language={currentLanguage}
              disabled={isLoading}
            />

            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0"
            >
              {isLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* AI Indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>
            AI will analyze your input and create structured tasks
            {language === "fr-FR" && " (French supported)"}
          </span>
        </div>

        {/* Quick Examples */}
        <div className="flex flex-wrap gap-2">
          {[
            "Plan my weekend trip to Paris",
            "Prepare for job interview tomorrow",
            "Organize my home office",
            "Learn React Native basics",
          ].map((example) => (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInput(example)}
              disabled={isLoading}
              className="text-xs"
            >
              {example}
            </Button>
          ))}
        </div>
      </form>
    </div>
  );
}