import { useState, useEffect, useCallback, useRef } from 'react';

// Web Speech API types (not fully typed in TypeScript)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type VoiceCommand =
  | 'next'
  | 'previous'
  | 'repeat'
  | 'pause'
  | 'resume'
  | 'help'
  | 'timer'
  | 'unknown';

interface UseVoiceOptions {
  onCommand: (command: VoiceCommand, text: string) => void;
  language?: string;
  continuous?: boolean;
}

export function useVoice({ onCommand, language = 'es-MX', continuous = true }: UseVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if Speech Recognition is supported
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognitionAPI);

      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.lang = language;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const results = event.results;
          const lastResult = results[results.length - 1];
          const transcriptText = lastResult[0].transcript.toLowerCase().trim();

          setTranscript(transcriptText);

          if (lastResult.isFinal) {
            const command = parseCommand(transcriptText);
            onCommand(command, transcriptText);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, onCommand]);

  const parseCommand = (text: string): VoiceCommand => {
    const lowerText = text.toLowerCase();

    // Next step commands
    if (
      lowerText.includes('siguiente') ||
      lowerText.includes('continuar') ||
      lowerText.includes('adelante') ||
      lowerText.includes('next')
    ) {
      return 'next';
    }

    // Previous step commands
    if (
      lowerText.includes('anterior') ||
      lowerText.includes('atrás') ||
      lowerText.includes('regresar') ||
      lowerText.includes('previous')
    ) {
      return 'previous';
    }

    // Repeat commands
    if (
      lowerText.includes('repetir') ||
      lowerText.includes('repite') ||
      lowerText.includes('otra vez') ||
      lowerText.includes('de nuevo') ||
      lowerText.includes('repeat')
    ) {
      return 'repeat';
    }

    // Pause commands
    if (
      lowerText.includes('pausa') ||
      lowerText.includes('detener') ||
      lowerText.includes('espera') ||
      lowerText.includes('pause')
    ) {
      return 'pause';
    }

    // Resume commands
    if (
      lowerText.includes('reanudar') ||
      lowerText.includes('continúa') ||
      lowerText.includes('resume')
    ) {
      return 'resume';
    }

    // Help commands
    if (
      lowerText.includes('ayuda') ||
      lowerText.includes('auxilio') ||
      lowerText.includes('help')
    ) {
      return 'help';
    }

    // Timer commands
    if (
      lowerText.includes('timer') ||
      lowerText.includes('cronómetro') ||
      lowerText.includes('temporizador') ||
      lowerText.includes('alarma')
    ) {
      return 'timer';
    }

    return 'unknown';
  };

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
  };
}
