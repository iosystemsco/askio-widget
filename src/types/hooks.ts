/**
 * Hook types and interfaces
 * @module types/hooks
 */

import type { ChatMessage } from './messages';

/**
 * Chat state returned by useChat hook
 */
export interface ChatState {
  /** Array of chat messages */
  messages: ChatMessage[];
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Whether bot is typing a response */
  isTyping: boolean;
  /** Whether voice recording is active */
  isRecording: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Current session identifier */
  sessionId: string | null;
  /** Current language code */
  language: string;
  /** Whether text-to-speech is enabled */
  ttsEnabled: boolean;
}

/**
 * Chat actions returned by useChat hook
 */
export interface ChatActions {
  /**
   * Send a text message
   * @param content - Message content to send
   * @returns Promise that resolves when message is sent
   */
  sendMessage: (content: string) => Promise<void>;

  /**
   * Start voice input recording
   * @param onAudioChunk - Callback for audio data chunks
   */
  startVoiceInput: (onAudioChunk: (data: ArrayBuffer) => void) => void;

  /**
   * Stop voice input recording
   * @param finalText - Optional final transcription text
   */
  stopVoiceInput: (finalText?: string) => void;

  /**
   * Clear all messages and reset chat
   */
  clearChat: () => void;

  /**
   * Reconnect to the chat service
   * @returns Promise that resolves when reconnected
   */
  reconnect: () => Promise<void>;

  /**
   * Change the chat language
   * @param language - Language code (e.g., 'en', 'es')
   */
  setLanguage: (language: string) => void;

  /**
   * Enable or disable text-to-speech
   * @param enabled - Whether TTS should be enabled
   */
  setTTSEnabled: (enabled: boolean) => void;
}

/**
 * Theme context value
 */
export interface ThemeContextValue {
  /** Current theme configuration */
  theme: import('./config').ThemeConfig;
  /** Function to update theme */
  setTheme: (theme: import('./config').ThemeConfig) => void;
  /** Resolved theme colors */
  colors: import('./config').ThemeColors;
}

/**
 * Voice hook state
 */
export interface VoiceState {
  /** Whether microphone is recording */
  isRecording: boolean;
  /** Whether microphone permission is granted */
  hasPermission: boolean;
  /** Current error, if any */
  error: string | null;
  /** Whether voice features are supported */
  isSupported: boolean;
}

/**
 * Voice hook actions
 */
export interface VoiceActions {
  /**
   * Start recording audio
   * @returns Promise that resolves when recording starts
   */
  startRecording: () => Promise<void>;

  /**
   * Stop recording audio
   */
  stopRecording: () => void;

  /**
   * Request microphone permission
   * @returns Promise that resolves with permission status
   */
  requestPermission: () => Promise<boolean>;
}
