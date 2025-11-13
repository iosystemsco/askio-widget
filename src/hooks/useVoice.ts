/**
 * Voice input hook
 * Manages voice recording, STT chunk buffering, and audio streaming
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { RecordingManager } from '../services/recording';
import { AudioPlaybackManager } from '../services/audio';
import type { SttChunkMessage } from '../types/messages';

export interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  hasPermission: boolean;
  transcription: string;
  finalTranscription: string;
  error: string | null;
}

export interface VoiceActions {
  startVoiceInput: () => Promise<void>;
  stopVoiceInput: () => void;
  requestPermission: () => Promise<boolean>;
  clearTranscription: () => void;
}

export interface UseVoiceOptions {
  onAudioData?: (data: ArrayBuffer) => void;
  onTranscriptionComplete?: (text: string) => void;
  onError?: (error: Error) => void;
  enableSilenceDetection?: boolean;
  sampleRate?: number;
  batchSize?: number;
}

/**
 * STT chunk buffer for managing transcription chunks
 */
class SttChunkBuffer {
  private chunks: SttChunkMessage[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  add(chunk: SttChunkMessage): void {
    this.chunks.push(chunk);
    if (this.chunks.length > this.maxSize) {
      this.chunks.shift();
    }
  }

  getFinalText(): string {
    return this.chunks
      .filter((chunk) => chunk.isFinal)
      .map((chunk) => chunk.text)
      .join(' ')
      .trim();
  }

  getInterimText(): string {
    let lastFinalIndex = -1;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      if (this.chunks[i].isFinal) {
        lastFinalIndex = i;
        break;
      }
    }

    const interimChunks = this.chunks.slice(lastFinalIndex + 1);
    if (interimChunks.length === 0) return '';

    return interimChunks[interimChunks.length - 1]?.text || '';
  }

  getCompleteText(): string {
    const finalText = this.getFinalText();
    const interimText = this.getInterimText();

    if (!finalText) return interimText;
    if (!interimText) return finalText;

    return `${finalText} ${interimText}`.trim();
  }

  clear(): void {
    this.chunks = [];
  }
}

/**
 * Voice input hook
 */
export function useVoice(options: UseVoiceOptions = {}): [VoiceState, VoiceActions] {
  const [state, setState] = useState<VoiceState>({
    isRecording: false,
    isProcessing: false,
    hasPermission: false,
    transcription: '',
    finalTranscription: '',
    error: null,
  });

  const recordingManagerRef = useRef<RecordingManager | null>(null);
  const audioPlaybackRef = useRef<AudioPlaybackManager | null>(null);
  const sttBufferRef = useRef<SttChunkBuffer>(new SttChunkBuffer());

  // Initialize managers
  useEffect(() => {
    if (!recordingManagerRef.current) {
      recordingManagerRef.current = new RecordingManager();
    }
    if (!audioPlaybackRef.current) {
      audioPlaybackRef.current = new AudioPlaybackManager();
    }

    // Check initial permission state
    checkPermission();

    return () => {
      // Cleanup on unmount
      if (recordingManagerRef.current?.recording) {
        recordingManagerRef.current.stopRecording();
      }
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.stop();
      }
    };
  }, []);

  /**
   * Check microphone permission status
   */
  const checkPermission = useCallback(async () => {
    try {
      if (!navigator.permissions) {
        // Permissions API not supported, assume we need to request
        setState((prev) => ({ ...prev, hasPermission: false }));
        return;
      }

      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setState((prev) => ({ ...prev, hasPermission: result.state === 'granted' }));

      // Listen for permission changes
      result.onchange = () => {
        setState((prev) => ({ ...prev, hasPermission: result.state === 'granted' }));
      };
    } catch (error) {
      // Permissions API might not be fully supported
      console.warn('[Voice] Permission check failed:', error);
      setState((prev) => ({ ...prev, hasPermission: false }));
    }
  }, []);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just wanted to request permission
      stream.getTracks().forEach((track) => track.stop());
      setState((prev) => ({ ...prev, hasPermission: true, error: null }));
      return true;
    } catch (error) {
      console.error('[Voice] Permission denied:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Microphone permission denied. Please allow microphone access and try again.';
      setState((prev) => ({
        ...prev,
        hasPermission: false,
        error: errorMessage,
      }));
      options.onError?.(
        error instanceof Error ? error : new Error('Microphone permission denied')
      );
      return false;
    }
  }, [options]);

  /**
   * Handle STT chunk from WebSocket
   */
  const handleSttChunk = useCallback((chunk: SttChunkMessage) => {
    sttBufferRef.current.add(chunk);

    const finalText = sttBufferRef.current.getFinalText();
    const completeText = sttBufferRef.current.getCompleteText();

    setState((prev) => ({
      ...prev,
      transcription: completeText,
      finalTranscription: finalText,
    }));
  }, []);

  /**
   * Start voice input
   */
  const startVoiceInput = useCallback(async () => {
    if (state.isRecording) {
      console.warn('[Voice] Already recording');
      return;
    }

    // Check permission first
    if (!state.hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }

    try {
      setState((prev) => ({ ...prev, isProcessing: true, error: null }));

      // Clear previous transcription
      sttBufferRef.current.clear();

      const recordingManager = recordingManagerRef.current;
      if (!recordingManager) {
        throw new Error('Recording manager not initialized');
      }

      // Start recording
      await recordingManager.startRecording({
        onAudioData: (data) => {
          // Send audio data to WebSocket
          options.onAudioData?.(data);
        },
        onSilence: options.enableSilenceDetection
          ? () => {
              console.log('[Voice] Silence detected, stopping recording');
              stopVoiceInput();
            }
          : undefined,
        sampleRate: options.sampleRate || 16000,
        batchSize: options.batchSize || 16,
      });

      // Initialize audio playback for TTS (if needed)
      const audioPlayback = audioPlaybackRef.current;
      if (audioPlayback) {
        await audioPlayback.initialize();
      }

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isProcessing: false,
        transcription: '',
        finalTranscription: '',
      }));

      console.log('[Voice] Started voice input');
    } catch (error) {
      console.error('[Voice] Failed to start voice input:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start voice input';
      setState((prev) => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        error: errorMessage,
      }));
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [state.isRecording, state.hasPermission, options, requestPermission]);

  /**
   * Stop voice input
   */
  const stopVoiceInput = useCallback(() => {
    if (!state.isRecording) {
      return;
    }

    try {
      const recordingManager = recordingManagerRef.current;
      if (recordingManager) {
        recordingManager.stopRecording();
      }

      const finalText = sttBufferRef.current.getFinalText();

      setState((prev) => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
      }));

      // Notify completion with final transcription
      if (finalText) {
        options.onTranscriptionComplete?.(finalText);
      }

      console.log('[Voice] Stopped voice input');
    } catch (error) {
      console.error('[Voice] Failed to stop voice input:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop voice input';
      setState((prev) => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        error: errorMessage,
      }));
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [state.isRecording, options]);

  /**
   * Clear transcription
   */
  const clearTranscription = useCallback(() => {
    sttBufferRef.current.clear();
    setState((prev) => ({
      ...prev,
      transcription: '',
      finalTranscription: '',
      error: null,
    }));
  }, []);

  /**
   * Play TTS audio chunk
   */
  const playAudioChunk = useCallback(async (data: ArrayBuffer | Blob) => {
    const audioPlayback = audioPlaybackRef.current;
    if (audioPlayback) {
      try {
        await audioPlayback.playAudioChunk(data);
      } catch (error) {
        console.error('[Voice] Failed to play audio chunk:', error);
      }
    }
  }, []);

  /**
   * Stop TTS playback
   */
  const stopTTS = useCallback(() => {
    const audioPlayback = audioPlaybackRef.current;
    if (audioPlayback) {
      audioPlayback.stopTTS();
    }
  }, []);

  // Expose STT chunk handler for external use
  const actions: VoiceActions & {
    handleSttChunk: (chunk: SttChunkMessage) => void;
    playAudioChunk: (data: ArrayBuffer | Blob) => Promise<void>;
    stopTTS: () => void;
  } = {
    startVoiceInput,
    stopVoiceInput,
    requestPermission,
    clearTranscription,
    handleSttChunk,
    playAudioChunk,
    stopTTS,
  };

  return [state, actions];
}
