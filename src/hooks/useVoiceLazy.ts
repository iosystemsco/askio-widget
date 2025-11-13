/**
 * Lazy-loaded voice hook wrapper
 * Dynamically imports voice features only when needed
 */

import { useState, useCallback, useEffect } from 'react';
import type { VoiceState, VoiceActions, UseVoiceOptions } from './useVoice';

type UseVoiceHook = (options?: UseVoiceOptions) => [VoiceState, VoiceActions & {
  handleSttChunk: (chunk: any) => void;
  playAudioChunk: (data: ArrayBuffer | Blob) => Promise<void>;
  stopTTS: () => void;
}];

interface VoiceLazyState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

/**
 * Lazy-loaded voice hook
 * Loads voice features on-demand to reduce initial bundle size
 */
export function useVoiceLazy(options: UseVoiceOptions = {}) {
  const [lazyState, setLazyState] = useState<VoiceLazyState>({
    isLoading: false,
    isLoaded: false,
    error: null,
  });

  const [voiceHook, setVoiceHook] = useState<UseVoiceHook | null>(null);

  // Load voice module
  const loadVoiceModule = useCallback(async () => {
    if (lazyState.isLoaded || lazyState.isLoading) {
      return;
    }

    setLazyState({ isLoading: true, isLoaded: false, error: null });

    try {
      const module = await import('./useVoice');
      setVoiceHook(() => module.useVoice as UseVoiceHook);
      setLazyState({ isLoading: false, isLoaded: true, error: null });
      console.log('[VoiceLazy] Voice module loaded');
    } catch (error) {
      console.error('[VoiceLazy] Failed to load voice module:', error);
      setLazyState({
        isLoading: false,
        isLoaded: false,
        error: 'Failed to load voice features',
      });
    }
  }, [lazyState.isLoaded, lazyState.isLoading]);

  // Auto-load on mount if needed
  useEffect(() => {
    // Don't auto-load, wait for explicit call
  }, []);

  // Use the voice hook if loaded
  const voiceResult = voiceHook ? voiceHook(options) : null;

  // Default state when not loaded
  const defaultState: VoiceState = {
    isRecording: false,
    isProcessing: lazyState.isLoading,
    hasPermission: false,
    transcription: '',
    finalTranscription: '',
    error: lazyState.error,
  };

  const defaultActions: VoiceActions & {
    handleSttChunk: (chunk: any) => void;
    playAudioChunk: (data: ArrayBuffer | Blob) => Promise<void>;
    stopTTS: () => void;
  } = {
    startVoiceInput: async () => {
      await loadVoiceModule();
    },
    stopVoiceInput: () => {},
    requestPermission: async () => {
      await loadVoiceModule();
      return false;
    },
    clearTranscription: () => {},
    handleSttChunk: () => {},
    playAudioChunk: async () => {},
    stopTTS: () => {},
  };

  return {
    state: voiceResult ? voiceResult[0] : defaultState,
    actions: voiceResult ? voiceResult[1] : defaultActions,
    lazyState,
    loadVoiceModule,
  };
}
