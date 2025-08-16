import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConvexAction } from "@convex-dev/react-query";
import { api } from "@ai-tasked/backend";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export function VoiceRecorder({
  onTranscriptionComplete,
  onError,
  className,
  disabled = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const transcribeAudio = useConvexAction(api.whisper.transcribeAudio);

  const startTimer = useCallback(() => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Send to Whisper API for transcription
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      startTimer();
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      onError?.('Failed to access microphone. Please allow microphone access.');
    }
  }, [onError, startTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      stopTimer();
    }
  }, [isRecording, stopTimer]);

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64 using browser FileReader
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      // Send to Convex action for transcription
      const result = await transcribeAudio({
        audioData: base64Audio
      });

      if (result.success && result.text) {
        onTranscriptionComplete(result.text);
      } else {
        onError?.(result.error || 'No speech detected in recording');
      }

    } catch (error) {
      console.error('Transcription error:', error);
      onError?.('Failed to transcribe audio. Please try again.');
    } finally {
      setIsProcessing(false);
      setRecordingTime(0);
    }
  };

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        type="button"
        variant={isRecording ? "destructive" : "default"}
        size="icon"
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        className={cn(
          "transition-all duration-200",
          isRecording && "animate-pulse"
        )}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {(isRecording || isProcessing) && (
        <div className="flex items-center gap-2 text-sm">
          {isRecording && (
            <>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
              <span className="text-red-600 font-medium">
                Recording {formatTime(recordingTime)}
              </span>
            </>
          )}
          
          {isProcessing && (
            <span className="text-blue-600 font-medium flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Transcribing...
            </span>
          )}
        </div>
      )}
    </div>
  );
}