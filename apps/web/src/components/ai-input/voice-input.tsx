import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  className?: string;
  language?: "en-US" | "fr-FR";
}

export function VoiceInput({
  onTranscript,
  onError,
  className,
  language = "en-US",
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isManualStopRef = useRef(false);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      setIsSupported(true);
      
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Simple settings - use continuous mode to avoid auto-stops
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        console.log("Recognition started");
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        console.log("Recognition result:", event);
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript) {
          onTranscript(interimTranscript, false);
        }

        if (finalTranscript) {
          onTranscript(finalTranscript, true);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        onError?.(event.error);
      };

      recognition.onend = () => {
        console.log("Recognition ended, manual stop:", isManualStopRef.current);
        setIsListening(false);
        
        // If not manually stopped, restart after a delay (this handles unexpected stops)
        if (!isManualStopRef.current) {
          console.log("Auto-restarting due to unexpected end");
          setTimeout(() => {
            if (!isManualStopRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.log("Restart failed:", error);
              }
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      onError?.("Speech recognition not supported");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, onTranscript, onError]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      console.log("User clicked stop");
      isManualStopRef.current = true;
      recognitionRef.current.stop();
    } else {
      console.log("User clicked start");
      isManualStopRef.current = false;
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Start failed:", error);
        onError?.("Failed to start voice input");
      }
    }
  }, [isListening, onError]);

  if (!isSupported) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Voice not supported
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "default"}
      size="icon"
      onClick={toggleListening}
      className={cn("transition-all duration-200", isListening && "animate-pulse")}
      title={isListening ? "Stop" : "Start"}
    >
      {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}