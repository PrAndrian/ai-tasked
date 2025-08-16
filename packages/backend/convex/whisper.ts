import { action } from "./_generated/server";
import { v } from "convex/values";

export const transcribeAudio = action({
  args: {
    audioData: v.string(), // Base64 encoded audio data
  },
  handler: async (ctx, args): Promise<{success: boolean, text?: string, error?: string}> => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      // Convert base64 to Uint8Array (works in both Node.js and browser environments)
      const binaryString = atob(args.audioData);
      const audioBuffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        audioBuffer[i] = binaryString.charCodeAt(i);
      }
      
      // Create form data for Whisper API
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Whisper API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const transcription = result.text?.trim();

      if (!transcription) {
        return {
          success: false,
          error: "No speech detected in recording"
        };
      }

      return {
        success: true,
        text: transcription
      };

    } catch (error) {
      console.error("Whisper transcription error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to transcribe audio"
      };
    }
  },
});