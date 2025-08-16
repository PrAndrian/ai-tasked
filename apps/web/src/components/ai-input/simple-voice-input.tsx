import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleVoiceInputProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  language?: "en-US" | "fr-FR";
}

export function SimpleVoiceInput({
  onTranscriptionComplete,
  onError,
  className,
  disabled = false,
  language = "en-US",
}: SimpleVoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTextRef = useRef<string>("");

  const startListening = useCallback(() => {
    if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
      setIsSupported(false);
      onError?.("Speech recognition not supported in this browser");
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    finalTextRef.current = "";

    recognition.onstart = () => {
      console.log("Started listening");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        finalTextRef.current += finalTranscript + " ";
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      onError?.(event.error);
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      setIsListening(false);
      
      // Send accumulated text
      if (finalTextRef.current.trim()) {
        onTranscriptionComplete(finalTextRef.current.trim());
      }
      
      finalTextRef.current = "";
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, onError, onTranscriptionComplete]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      console.log("Stopping listening");
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  if (!isSupported) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Voice input not supported
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "default"}
      size="icon"
      onClick={toggleListening}
      disabled={disabled}
      className={cn(
        "transition-all duration-200",
        isListening && "animate-pulse"
      )}
      title={isListening ? "Stop recording" : "Start recording"}
    >
      {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}