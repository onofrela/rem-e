'use client';

import { useState, useRef, useCallback } from 'react';

interface UseGeminiTTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseGeminiTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  usingFallback: boolean;
}

export function useGeminiTTS(options: UseGeminiTTSOptions = {}): UseGeminiTTSReturn {
  const { onStart, onEnd, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const speakWithFallback = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      setUsingFallback(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX';

      utterance.onstart = () => {
        setIsPlaying(true);
        onStart?.();
      };

      utterance.onend = () => {
        setIsPlaying(false);
        onEnd?.();
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setError('Fallback speech synthesis failed');
        onError?.('Fallback speech synthesis failed');
      };

      speechSynthesis.speak(utterance);
    } else {
      setError('No speech synthesis available');
      onError?.('No speech synthesis available');
    }
  }, [onStart, onEnd, onError]);

  const speak = useCallback(async (text: string) => {
    if (!text) return;

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Cancel any browser speech
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    setIsLoading(true);
    setError(null);
    setUsingFallback(false);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsPlaying(true);
        onStart?.();
      };

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        onEnd?.();
      };

      audio.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        // Fallback to browser TTS
        console.warn('Gemini TTS audio playback failed, using fallback');
        speakWithFallback(text);
      };

      await audio.play();
    } catch (err) {
      setIsLoading(false);

      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn('Gemini TTS failed, using fallback:', errorMessage);

      // Fallback to browser TTS
      speakWithFallback(text);
    }
  }, [onStart, onEnd, onError, speakWithFallback]);

  const stop = useCallback(() => {
    // Stop Gemini TTS audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Stop browser speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    setIsLoading(false);
    setIsPlaying(false);
  }, []);

  return {
    speak,
    stop,
    isLoading,
    isPlaying,
    error,
    usingFallback,
  };
}
