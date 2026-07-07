// Web Speech API for voice input (tasks and notes)
// Supports Persian (fa-IR) and English (en-US)

type VoiceInputState = {
  isListening: boolean;
  transcript: string;
  error: string | null;
};

type VoiceInputCallbacks = {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  onListeningChange?: (isListening: boolean) => void;
};

export class VoiceInput {
  private recognition: any = null;
  private isListening = false;
  private callbacks: VoiceInputCallbacks;

  constructor(callbacks: VoiceInputCallbacks) {
    this.callbacks = callbacks;
    this.init();
  }

  private init() {
    if (typeof window === "undefined" || !("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      this.callbacks.onError?.("Voice input not supported in this browser");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = "fa-IR"; // Default to Persian

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onListeningChange?.(true);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onListeningChange?.(false);
    };

    this.recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join("");
      this.callbacks.onTranscript(transcript);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      this.callbacks.onListeningChange?.(false);
      const error = event.error;
      if (error === "not-allowed") {
        this.callbacks.onError?.("Microphone permission denied");
      } else if (error === "no-speech") {
        this.callbacks.onError?.("No speech detected");
      } else {
        this.callbacks.onError?.(`Voice error: ${error}`);
      }
    };
  }

  start(lang: "fa-IR" | "en-US" = "fa-IR") {
    if (!this.recognition) {
      this.callbacks.onError?.("Voice input not supported");
      return;
    }
    if (this.isListening) {
      this.stop();
    }
    this.recognition.lang = lang;
    this.recognition.start();
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  toggle(lang: "fa-IR" | "en-US" = "fa-IR") {
    if (this.isListening) {
      this.stop();
    } else {
      this.start(lang);
    }
  }

  isSupported(): boolean {
    return !!this.recognition;
  }
}
