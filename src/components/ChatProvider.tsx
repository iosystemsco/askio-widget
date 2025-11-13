/**
 * ChatProvider component
 * Provides chat context and manages global chat state
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useChatStore, type ChatConfig } from '../services/chat-store';
import type { ChatMessage } from '../types/messages';

export interface ChatContextValue {
  // State
  messages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  isTyping: boolean;
  isRecording: boolean;
  error: string | null;
  sessionId: string | null;
  language: string;
  ttsEnabled: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  startVoiceInput: (onAudioChunk: (data: ArrayBuffer) => void) => void;
  stopVoiceInput: (finalText?: string) => void;
  clearChat: () => void;
  reconnect: () => Promise<void>;
  setLanguage: (language: string) => void;
  setTTSEnabled: (enabled: boolean) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps {
  siteToken: string;
  config?: ChatConfig;
  children: React.ReactNode;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export function ChatProvider({
  siteToken,
  config,
  children,
  onReady,
  onError,
  onConnectionChange,
}: ChatProviderProps) {
  const initRef = useRef(false);
  const prevConnectedRef = useRef(false);

  // Get store state and actions
  const messages = useChatStore((state) => state.messages);
  const isConnected = useChatStore((state) => state.isConnected);
  const isLoading = useChatStore((state) => state.isLoading);
  const isTyping = useChatStore((state) => state.isTyping);
  const isRecording = useChatStore((state) => state.isRecording);
  const error = useChatStore((state) => state.error);
  const sessionId = useChatStore((state) => state.sessionId);
  const language = useChatStore((state) => state.language);
  const ttsEnabled = useChatStore((state) => state.ttsEnabled);

  const initialize = useChatStore((state) => state.initialize);
  const connect = useChatStore((state) => state.connect);
  const disconnect = useChatStore((state) => state.disconnect);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const startVoiceInput = useChatStore((state) => state.startVoiceInput);
  const stopVoiceInput = useChatStore((state) => state.stopVoiceInput);
  const clearChat = useChatStore((state) => state.clearChat);
  const setLanguage = useChatStore((state) => state.setLanguage);
  const setTTSEnabled = useChatStore((state) => state.setTTSEnabled);

  // Initialize and connect on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initializeChat = async () => {
      try {
        console.log('[ChatProvider] Initializing chat...');
        
        // Initialize with site token and config
        await initialize(siteToken, {
          ...config,
          onError,
          onConnectionChange,
        });

        // Connect to WebSocket
        await connect();

        console.log('[ChatProvider] Chat initialized and connected');
        onReady?.();
      } catch (err) {
        console.error('[ChatProvider] Initialization failed:', err);
        const error = err instanceof Error ? err : new Error('Failed to initialize chat');
        onError?.(error);
      }
    };

    initializeChat();

    // Cleanup on unmount
    return () => {
      console.log('[ChatProvider] Cleaning up...');
      disconnect();
    };
  }, [siteToken]); // Only re-initialize if siteToken changes

  // Handle connection change callbacks
  useEffect(() => {
    if (prevConnectedRef.current !== isConnected) {
      prevConnectedRef.current = isConnected;
      onConnectionChange?.(isConnected);
    }
  }, [isConnected, onConnectionChange]);

  // Handle error callbacks
  useEffect(() => {
    if (error && onError) {
      onError(new Error(error));
    }
  }, [error, onError]);

  // Reconnect function
  const reconnect = async () => {
    try {
      console.log('[ChatProvider] Reconnecting...');
      await connect();
    } catch (err) {
      console.error('[ChatProvider] Reconnection failed:', err);
      const error = err instanceof Error ? err : new Error('Failed to reconnect');
      onError?.(error);
      throw error;
    }
  };

  const value: ChatContextValue = {
    // State
    messages,
    isConnected,
    isLoading,
    isTyping,
    isRecording,
    error,
    sessionId,
    language,
    ttsEnabled,

    // Actions
    sendMessage,
    startVoiceInput,
    stopVoiceInput,
    clearChat,
    reconnect,
    setLanguage,
    setTTSEnabled,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Hook to access chat context
 */
export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }

  return context;
}
