import { useState, useRef } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SimpleVoiceInput } from "./simple-voice-input";
import { TemplateSelector } from "./template-selector";
import { useMutation } from "@tanstack/react-query";
import { useConvexAction } from "@convex-dev/react-query";
import { api } from "@ai-tasked/backend";
import { 
  Plus, 
  Send, 
  Loader2, 
  Languages, 
  Bot, 
  User,
  Sparkles,
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TASK_TEMPLATES = {
  "fr-FR": [
    { 
      title: "Organiser mon bureau", 
      icon: "🗂️",
      prompt: "J'ai besoin d'organiser mon bureau. Peux-tu me créer des tâches pour trier mes documents, ranger mes fournitures et optimiser mon espace de travail ?"
    },
    { 
      title: "Préparer la réunion de demain", 
      icon: "📝",
      prompt: "J'ai une réunion importante demain. Peux-tu m'aider à créer des tâches pour préparer l'agenda, réviser les documents et anticiper les questions ?"
    },
    { 
      title: "Faire les courses", 
      icon: "🛒",
      prompt: "Je dois faire mes courses cette semaine. Peux-tu me créer une liste organisée avec les produits essentiels, fruits et légumes, et produits d'hygiène ?"
    },
    { 
      title: "Appeler le médecin", 
      icon: "📞",
      prompt: "Je dois prendre rendez-vous chez le médecin. Peux-tu me créer des tâches pour trouver les coordonnées, préparer mes questions et organiser mon emploi du temps ?"
    },
    { 
      title: "Réviser pour l'examen", 
      icon: "📚",
      prompt: "J'ai un examen à préparer. Peux-tu m'aider à créer un planning de révision avec les chapitres à étudier, les exercices à faire et les fiches à réviser ?"
    },
  ],
  "en-US": [
    { 
      title: "Organize my desk", 
      icon: "🗂️",
      prompt: "I need to organize my desk. Can you create tasks to help me sort documents, organize supplies, and optimize my workspace?"
    },
    { 
      title: "Prepare tomorrow's meeting", 
      icon: "📝",
      prompt: "I have an important meeting tomorrow. Can you help me create tasks to prepare the agenda, review documents, and anticipate questions?"
    },
    { 
      title: "Go grocery shopping", 
      icon: "🛒",
      prompt: "I need to do grocery shopping this week. Can you create an organized list with essential products, fruits and vegetables, and hygiene products?"
    },
    { 
      title: "Call the doctor", 
      icon: "📞",
      prompt: "I need to make a doctor's appointment. Can you create tasks to find contact information, prepare my questions, and organize my schedule?"
    },
    { 
      title: "Study for the exam", 
      icon: "📚",
      prompt: "I have an exam to prepare for. Can you help me create a study schedule with chapters to study, exercises to do, and notes to review?"
    },
  ]
};

interface TaskCreationDrawerProps {
  userId: string;
  onTasksCreated?: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export function TaskCreationDrawer({ userId, onTasksCreated }: TaskCreationDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"en-US" | "fr-FR">("en-US");
  const getInitialMessages = (): ChatMessage[] => {
    return [
      {
        id: "welcome",
        type: "ai",
        content: currentLanguage === "fr-FR" 
          ? "Bonjour ! Dites-moi ce que vous devez faire et je créerai vos tâches." 
          : "Hi! Tell me what you need to do and I'll create your tasks.",
        timestamp: new Date(0) // Use epoch time to avoid hydration mismatch
      }
    ];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const processInput = useConvexAction(api.ai.processNaturalLanguageInput);

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
        const successMsg = currentLanguage === "fr-FR" 
          ? `✨ Parfait ! J'ai créé ${result.tasks?.length || 0} tâche(s) pour vous.` 
          : `✨ Perfect! I've created ${result.tasks?.length || 0} task(s) for you.`;
        
        setMessages(prev => prev.map(msg => 
          msg.isLoading ? { ...msg, content: successMsg, isLoading: false } : msg
        ));
        
        onTasksCreated?.();
        
        // Close drawer after success
        setTimeout(() => {
          setIsOpen(false);
          resetConversation();
        }, 2000);
      } else {
        setMessages(prev => prev.map(msg => 
          msg.isLoading ? { 
            ...msg, 
            content: result.error || "Une erreur s'est produite", 
            isLoading: false 
          } : msg
        ));
      }
    },
    onError: (error) => {
      console.error("Task creation error:", error);
      setMessages(prev => prev.map(msg => 
        msg.isLoading ? { 
          ...msg, 
          content: currentLanguage === "fr-FR" 
            ? "Désolé, une erreur s'est produite. Réessayez." 
            : "Sorry, an error occurred. Please try again.", 
          isLoading: false 
        } : msg
      ));
    },
  });

  const resetConversation = () => {
    setInput("");
    setMessages(getInitialMessages());
  };

  const handleSend = () => {
    if (!input.trim() || createTasksMutation.isPending) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    // Add loading AI message
    const loadingMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      type: "ai",
      content: currentLanguage === "fr-FR" ? "Je crée vos tâches..." : "Creating your tasks...",
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    createTasksMutation.mutate(input.trim());
    setInput("");
  };

  const handleVoiceTranscription = (text: string) => {
    setInput(prev => prev + (prev ? " " : "") + text);
    setIsListening(false);
  };

  const handleVoiceError = (error: string) => {
    toast.error(error);
    setIsListening(false);
  };

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === "en-US" ? "fr-FR" : "en-US";
    setCurrentLanguage(newLanguage);
    // Reset messages when language changes if no conversation started
    if (messages.length <= 1) {
      setMessages(getInitialMessages());
    }
  };

  const handleTemplateSelect = (templateTitle: string) => {
    const template = TASK_TEMPLATES[currentLanguage].find(t => t.title === templateTitle);
    if (template) {
      setInput(template.prompt);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </DrawerTrigger>
      
      <DrawerContent className="h-[90vh] flex flex-col">
        <DrawerHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                {currentLanguage === "fr-FR" ? "Créer des tâches avec l'IA" : "Create Tasks with AI"}
              </DrawerTitle>
              <DrawerDescription>
                {currentLanguage === "fr-FR" 
                  ? "Parlez ou tapez ce que vous devez faire" 
                  : "Speak or type what you need to do"
                }
              </DrawerDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={toggleLanguage}>
                <Languages className="h-4 w-4" />
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 items-start",
                message.type === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.type === "ai" && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] p-3 rounded-lg text-sm",
                  message.type === "user"
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-900 rounded-bl-none",
                  message.isLoading && "animate-pulse"
                )}
              >
                {message.content}
                {message.isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin inline ml-2" />
                )}
              </div>
              
              {message.type === "user" && (
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-green-600" />
                </div>
              )}
            </div>
          ))}

          {/* Template Selector - Only show when no conversation started */}
          {messages.length <= 1 && (
            <div className="px-2">
              <TemplateSelector
                templates={TASK_TEMPLATES[currentLanguage]}
                onSelect={handleTemplateSelect}
                language={currentLanguage}
                className="mt-4"
              />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 border-t">
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentLanguage === "fr-FR" 
                  ? "Dites-moi ce que vous devez faire..." 
                  : "Tell me what you need to do..."
                }
                disabled={isListening || createTasksMutation.isPending}
                className="min-h-[60px] pr-12 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SimpleVoiceInput
                  onTranscriptionComplete={handleVoiceTranscription}
                  onError={handleVoiceError}
                  language={currentLanguage}
                  disabled={createTasksMutation.isPending}
                />
                {isListening && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                    <span>
                      {currentLanguage === "fr-FR" ? "Écoute..." : "Listening..."}
                    </span>
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleSend}
                disabled={!input.trim() || createTasksMutation.isPending}
                size="icon"
                className="h-10 w-10"
              >
                {createTasksMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}