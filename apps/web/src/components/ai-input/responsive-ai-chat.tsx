import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { api } from "@ai-tasked/backend";
import { useConvexAction } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import {
  Bot,
  Languages,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SimpleVoiceInput } from "./simple-voice-input";
import { TemplateSelector } from "./template-selector";

const TASK_TEMPLATES = {
  "fr-FR": [
    {
      title: "Organiser mon bureau",
      icon: "🗂️",
      prompt:
        "J'ai besoin d'organiser mon bureau. Peux-tu me créer des tâches pour trier mes documents, ranger mes fournitures et optimiser mon espace de travail ?",
    },
    {
      title: "Préparer la réunion de demain",
      icon: "📝",
      prompt:
        "J'ai une réunion importante demain. Peux-tu m'aider à créer des tâches pour préparer l'agenda, réviser les documents et anticiper les questions ?",
    },
    {
      title: "Faire les courses",
      icon: "🛒",
      prompt:
        "Je dois faire mes courses cette semaine. Peux-tu me créer une liste organisée avec les produits essentiels, fruits et légumes, et produits d'hygiène ?",
    },
    {
      title: "Appeler le médecin",
      icon: "📞",
      prompt:
        "Je dois prendre rendez-vous chez le médecin. Peux-tu me créer des tâches pour trouver les coordonnées, préparer mes questions et organiser mon emploi du temps ?",
    },
    {
      title: "Réviser pour l'examen",
      icon: "📚",
      prompt:
        "J'ai un examen à préparer. Peux-tu m'aider à créer un planning de révision avec les chapitres à étudier, les exercices à faire et les fiches à réviser ?",
    },
  ],
  "en-US": [
    {
      title: "Organize my desk",
      icon: "🗂️",
      prompt:
        "I need to organize my desk. Can you create tasks to help me sort documents, organize supplies, and optimize my workspace?",
    },
    {
      title: "Prepare tomorrow's meeting",
      icon: "📝",
      prompt:
        "I have an important meeting tomorrow. Can you help me create tasks to prepare the agenda, review documents, and anticipate questions?",
    },
    {
      title: "Go grocery shopping",
      icon: "🛒",
      prompt:
        "I need to do grocery shopping this week. Can you create an organized list with essential products, fruits and vegetables, and hygiene products?",
    },
    {
      title: "Call the doctor",
      icon: "📞",
      prompt:
        "I need to make a doctor's appointment. Can you create tasks to find contact information, prepare my questions, and organize my schedule?",
    },
    {
      title: "Study for the exam",
      icon: "📚",
      prompt:
        "I have an exam to prepare for. Can you help me create a study schedule with chapters to study, exercises to do, and notes to review?",
    },
  ],
};

interface ResponsiveAIChatProps {
  userId: string;
  onTasksCreated?: () => void;
}

interface ChatMessage {
  id: string;
  type: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export function ResponsiveAIChat({
  userId,
  onTasksCreated,
}: ResponsiveAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"en-US" | "fr-FR">(
    "fr-FR"
  );
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const getInitialMessages = (): ChatMessage[] => {
    return [
      {
        id: "welcome",
        type: "ai",
        content:
          currentLanguage === "fr-FR"
            ? "Bonjour ! Dites-moi ce que vous devez faire et je créerai vos tâches."
            : "Hi! Tell me what you need to do and I'll create your tasks.",
        timestamp: new Date(0),
      },
    ];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const processInput = useConvexAction(api.ai.processNaturalLanguageInput);

  // Maintain focus and cursor position
  useEffect(() => {
    if (isOpen && isDesktop && textareaRef.current) {
      const timer = setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          // Set cursor to end of text
          const length = textarea.value.length;
          textarea.setSelectionRange(length, length);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isDesktop]);

  // Keep cursor at end when input changes
  useEffect(() => {
    if (textareaRef.current && document.activeElement === textareaRef.current) {
      const textarea = textareaRef.current;
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  }, [input]);

  const createTasksMutation = useMutation({
    mutationFn: async (inputText: string) => {
      return processInput({
        input: inputText,
        inputType: "text",
        userId: userId as any,
        context: {
          currentTime: Date.now(),
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        const successMsg =
          currentLanguage === "fr-FR"
            ? `✨ Parfait ! J'ai créé ${
                result.tasks?.length || 0
              } tâche(s) pour vous.`
            : `✨ Perfect! I've created ${
                result.tasks?.length || 0
              } task(s) for you.`;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.isLoading
              ? { ...msg, content: successMsg, isLoading: false }
              : msg
          )
        );

        onTasksCreated?.();

        // Close after success
        setTimeout(() => {
          setIsOpen(false);
          resetConversation();
        }, 2000);
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isLoading
              ? {
                  ...msg,
                  content: result.error || "Une erreur s'est produite",
                  isLoading: false,
                }
              : msg
          )
        );
      }
    },
    onError: (error) => {
      console.error("Task creation error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isLoading
            ? {
                ...msg,
                content:
                  currentLanguage === "fr-FR"
                    ? "Désolé, une erreur s'est produite. Réessayez."
                    : "Sorry, an error occurred. Please try again.",
                isLoading: false,
              }
            : msg
        )
      );
    },
  });

  const resetConversation = () => {
    setInput("");
    setMessages(getInitialMessages());
  };

  const handleSend = () => {
    if (!input.trim() || createTasksMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      type: "ai",
      content:
        currentLanguage === "fr-FR"
          ? "Je crée vos tâches..."
          : "Creating your tasks...",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    createTasksMutation.mutate(input.trim());
    setInput("");
  };

  const handleVoiceTranscription = (text: string) => {
    setInput((prev) => prev + (prev ? " " : "") + text);
    setIsListening(false);
  };

  const handleVoiceError = (error: string) => {
    toast.error(error);
    setIsListening(false);
  };

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === "en-US" ? "fr-FR" : "en-US";
    setCurrentLanguage(newLanguage);
    if (messages.length <= 1) {
      setMessages(getInitialMessages());
    }
  };

  // Create a stable key for the ChatContent to prevent re-mounting
  const chatKey = `chat-${isDesktop ? "desktop" : "mobile"}-${currentLanguage}`;

  const handleTemplateSelect = (templateTitle: string) => {
    const template = TASK_TEMPLATES[currentLanguage].find(
      (t) => t.title === templateTitle
    );
    if (template) {
      setInput(template.prompt);
    }
  };

  // Shared content component
  const ChatContent = ({ className = "" }: { className?: string }) => (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-2 border-b bg-background">
        <div className="flex justify-between items-center">
          <div className="flex-1 pr-2 min-w-0">
            <div className="flex gap-2 items-center">
              <Sparkles className="flex-shrink-0 w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold truncate">
                {currentLanguage === "fr-FR" ? "Assistant IA" : "AI Assistant"}
              </h2>
            </div>
            <p className="text-xs truncate text-muted-foreground">
              {currentLanguage === "fr-FR"
                ? "Parlez ou tapez ce que vous devez faire"
                : "Speak or type what you need to do"}
            </p>
          </div>
          <div className="flex flex-shrink-0 gap-1 items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLanguage}
              className="w-7 h-7"
            >
              <Languages className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto flex-1 p-2 space-y-2 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-2 items-start",
              message.type === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.type === "ai" && (
              <div className="flex flex-shrink-0 justify-center items-center w-6 h-6 bg-blue-100 rounded-full dark:bg-blue-900">
                <Bot className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
            )}

            <div
              className={cn(
                "max-w-[75%] p-2 rounded-lg text-xs leading-relaxed",
                message.type === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none",
                message.isLoading && "animate-pulse"
              )}
            >
              {message.content}
              {message.isLoading && (
                <Loader2 className="inline ml-1 w-3 h-3 animate-spin" />
              )}
            </div>

            {message.type === "user" && (
              <div className="flex flex-shrink-0 justify-center items-center w-6 h-6 bg-green-100 rounded-full dark:bg-green-900">
                <User className="w-3 h-3 text-green-600 dark:text-green-400" />
              </div>
            )}
          </div>
        ))}

        {/* Template Selector */}
        {messages.length <= 1 && (
          <div className="px-1 pb-2">
            <TemplateSelector
              templates={TASK_TEMPLATES[currentLanguage]}
              onSelect={handleTemplateSelect}
              language={currentLanguage}
              className="mt-1"
            />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-2 border-t bg-background">
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                const newValue = e.target.value;
                const cursorPosition = e.target.selectionStart;
                setInput(newValue);

                // Restore cursor position after state update
                requestAnimationFrame(() => {
                  if (textareaRef.current) {
                    textareaRef.current.setSelectionRange(
                      cursorPosition,
                      cursorPosition
                    );
                  }
                });
              }}
              placeholder={
                currentLanguage === "fr-FR"
                  ? "Dites-moi ce que vous devez faire..."
                  : "Tell me what you need to do..."
              }
              disabled={isListening || createTasksMutation.isPending}
              className="min-h-[40px] max-h-[80px] resize-none text-sm pr-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              autoFocus={isDesktop && isOpen}
            />
          </div>

          <div className="flex gap-2 justify-between items-center">
            <div className="flex flex-1 gap-1 items-center min-w-0">
              <SimpleVoiceInput
                onTranscriptionComplete={handleVoiceTranscription}
                onError={handleVoiceError}
                language={currentLanguage}
                disabled={createTasksMutation.isPending}
              />
              {isListening && (
                <div className="flex gap-1 items-center text-xs text-red-600">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                  <span className="truncate">
                    {currentLanguage === "fr-FR" ? "Écoute..." : "Listening..."}
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleSend}
              disabled={!input.trim() || createTasksMutation.isPending}
              size="icon"
              className="flex-shrink-0"
            >
              {createTasksMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    // Desktop: Custom floating div instead of Dialog to avoid focus issues
    return (
      <>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed right-6 bottom-6 w-12 h-12 rounded-full shadow-lg"
        >
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <MessageCircle className="w-5 h-5" />
          )}
        </Button>

        {isOpen && (
          <div className="fixed bottom-20 right-6 w-[450px] h-[min(600px,80vh)] z-40">
            <div className="overflow-hidden w-full h-full rounded-lg border-2 shadow-2xl duration-300 bg-background animate-in slide-in-from-bottom-4">
              <ChatContent key={chatKey} className="h-full" />
            </div>
          </div>
        )}
      </>
    );
  }

  // Mobile: Drawer
  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button className="fixed right-6 bottom-6 w-14 h-14 rounded-full shadow-lg">
          <Plus className="w-6 h-6" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[90vh] flex flex-col">
        <ChatContent key={chatKey} className="flex-1 min-h-0" />
      </DrawerContent>
    </Drawer>
  );
}
