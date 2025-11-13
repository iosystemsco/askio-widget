/**
 * Chat store with Zustand
 * Framework-agnostic state management for chat functionality
 */

import { create } from 'zustand';
import { marked } from 'marked';
import { debounce } from '../utils/performance';
import type {
  ChatMessage,
  SttChunkMessage,
  LlmChunkMessage,
  ErrorMessage,
  ConnectionAckMessage,
  TextResponseMessage,
} from '../types/messages';
import { AuthService } from './auth';
import { WebSocketService } from './websocket';

/**
 * STT chunk buffer for managing transcription chunks
 */
export class SttChunkBuffer {
  private chunks: SttChunkMessage[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  add(chunk: SttChunkMessage) {
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

  clear() {
    this.chunks = [];
  }
}

/**
 * Chat state interface
 */
export interface ChatState {
  // Messages
  messages: ChatMessage[];
  isTyping: boolean;
  isLoading: boolean;

  // Connection state
  isConnected: boolean;
  sessionId: string | null;
  error: string | null;

  // Recording state
  isRecording: boolean;

  // Configuration
  language: string;
  ttsEnabled: boolean;

  // Services
  authService: AuthService;
  wsService: WebSocketService;
  sttBuffer: SttChunkBuffer;
  typingDebouncer: ReturnType<typeof debounce> | null;

  // Actions
  initialize: (siteToken: string, config?: ChatConfig) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (content: string) => Promise<void>;
  startVoiceInput: (onAudioChunk: (data: ArrayBuffer) => void) => void;
  stopVoiceInput: (finalText?: string) => void;
  clearChat: () => void;
  setLanguage: (language: string) => void;
  setTTSEnabled: (enabled: boolean) => void;
  setError: (error: string | null) => void;
  setRecording: (isRecording: boolean) => void;
}

/**
 * Chat configuration
 */
export interface ChatConfig {
  wsUrl?: string;
  apiUrl?: string;
  language?: string;
  ttsEnabled?: boolean;
  onError?: (error: Error) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

/**
 * Create chat store
 */
export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  messages: [],
  isTyping: false,
  isLoading: false,
  isConnected: false,
  sessionId: null,
  error: null,
  isRecording: false,
  language: 'en',
  ttsEnabled: true,

  // Services
  authService: new AuthService(),
  wsService: new WebSocketService(),
  sttBuffer: new SttChunkBuffer(10),
  typingDebouncer: null,

  /**
   * Initialize chat with site token and configuration
   */
  initialize: async (siteToken: string, config?: ChatConfig) => {
    const { authService } = get();

    // Configure auth service
    authService.setSiteToken(siteToken);
    if (config?.apiUrl) {
      authService.setApiUrl(config.apiUrl);
    }

    // Set initial configuration
    if (config?.language) {
      set({ language: config.language });
    }
    if (config?.ttsEnabled !== undefined) {
      set({ ttsEnabled: config.ttsEnabled });
    }

    console.log('[ChatStore] Initialized with site token');
  },

  /**
   * Connect to WebSocket
   */
  connect: async () => {
    const { authService, wsService, language, ttsEnabled, sttBuffer } = get();

    try {
      // Authenticate and get JWT
      const jwt = await authService.authenticate();

      // Connect WebSocket
      await wsService.connect({
        url: '', // Will use default
        jwt,
        language,
        ttsEnabled,

        onOpen: () => {
          console.log('[ChatStore] WebSocket connected');
          set({ isConnected: true, error: null });
        },

        onClose: (event) => {
          console.log('[ChatStore] WebSocket closed:', event.code);
          set({ isConnected: false });

          // Handle unauthorized close
          if (event.code === 4401) {
            authService.clearToken();
            set({ error: 'Session expired. Please reconnect.' });
          }
        },

        onError: (error) => {
          console.error('[ChatStore] WebSocket error:', error);
          set({ error: error.message });
        },

        onConnectionAck: (message: ConnectionAckMessage) => {
          console.log('[ChatStore] Connection acknowledged:', message.sessionId);
          set({ sessionId: message.sessionId });
        },

        onSttChunk: (message: SttChunkMessage) => {
          console.log('[ChatStore] STT chunk:', message.text, message.isFinal);
          sttBuffer.add(message);

          // Update user message with live transcription
          set((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];

            if (lastMessage && lastMessage.type === 'user') {
              const completeText = sttBuffer.getCompleteText();
              messages[messages.length - 1] = {
                ...lastMessage,
                content: completeText,
              };
            }

            return { messages };
          });
        },

        onLlmChunk: (message: LlmChunkMessage) => {
          // Create debouncer if not exists
          let { typingDebouncer } = get();
          if (!typingDebouncer) {
            typingDebouncer = debounce(() => {
              set({ isTyping: false });
            }, 1000);
            set({ typingDebouncer });
          }

          set((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];

            if (lastMessage && lastMessage.type === 'bot') {
              const newRawContent = (lastMessage.rawContent || '') + message.text;
              messages[messages.length - 1] = {
                ...lastMessage,
                rawContent: newRawContent,
                content: newRawContent,
              };
            } else {
              messages.push({
                id: `bot-${Date.now()}`,
                rawContent: message.text,
                content: message.text,
                type: 'bot',
                timestamp: Date.now(),
              });
            }

            return { messages, isTyping: true };
          });

          // Debounce typing indicator reset
          typingDebouncer();
        },

        onTextResponse: (message: TextResponseMessage) => {
          console.log('[ChatStore] Text response:', message.payload.content);

          // Check if this is an STT transcript
          if (message.payload.context?.source === 'stt') {
            const isFinal = message.payload.context.is_final;
            const content = message.payload.content;

            // Update user message with transcription
            set((state) => {
              const messages = [...state.messages];
              const lastMessage = messages[messages.length - 1];

              // Skip duplicates
              if (lastMessage && lastMessage.type === 'user' && lastMessage.content === content) {
                return state;
              }

              if (lastMessage && lastMessage.type === 'user') {
                messages[messages.length - 1] = {
                  ...lastMessage,
                  content: content,
                };
              } else if (isFinal) {
                messages.push({
                  id: `user-${Date.now()}`,
                  content: content,
                  type: 'user',
                  timestamp: Date.now(),
                  metadata: { source: 'voice', isFinal: true },
                });
              }

              return { messages };
            });

            // If final transcript, trigger loading state
            if (isFinal) {
              const currentState = get();
              if (!currentState.isLoading) {
                set({ isLoading: true });
              }
            }
          }
        },

        onErrorMessage: (message: ErrorMessage) => {
          console.error('[ChatStore] Error message:', message.error);
          set({ error: message.error, isTyping: false, isLoading: false });
        },

        onEnd: async () => {
          console.log('[ChatStore] Message end');
          set({ isTyping: false, isLoading: false });

          // Process markdown for final bot message
          const messages = get().messages;
          const lastMessage = messages[messages.length - 1];

          if (lastMessage && lastMessage.type === 'bot' && lastMessage.rawContent) {
            const html = await marked.parse(lastMessage.rawContent, { gfm: false });
            set((state) => {
              const updatedMessages = [...state.messages];
              const lastMsg = updatedMessages[updatedMessages.length - 1];
              if (lastMsg && lastMsg.type === 'bot') {
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMsg,
                  content: html,
                };
              }
              return { messages: updatedMessages };
            });
          }
        },

        onBinaryMessage: (data: ArrayBuffer) => {
          // Binary audio data (TTS) - handled by audio playback manager
          console.log('[ChatStore] Received audio chunk:', data.byteLength, 'bytes');
        },
      });
    } catch (error) {
      console.error('[ChatStore] Connection failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to connect',
        isConnected: false,
      });
      throw error;
    }
  },

  /**
   * Disconnect from WebSocket
   */
  disconnect: () => {
    const { wsService, authService } = get();

    wsService.disconnect();
    authService.clearToken();

    set({
      isConnected: false,
      sessionId: null,
      error: null,
    });

    console.log('[ChatStore] Disconnected');
  },

  /**
   * Send text message
   */
  sendMessage: async (content: string) => {
    const { wsService, isConnected } = get();

    if (!content.trim()) return;

    if (!isConnected || !wsService.isWebSocketConnected()) {
      set({ error: 'Not connected to chat service' });
      return;
    }

    set({ isLoading: true, error: null });

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: content.trim(),
      type: 'user',
      timestamp: Date.now(),
      metadata: { source: 'text' },
    };

    set((state) => ({ messages: [...state.messages, userMessage] }));

    try {
      // Send message via WebSocket
      wsService.sendTextMessage(content.trim());
    } catch (error) {
      console.error('[ChatStore] Failed to send message:', error);
      set({
        isTyping: false,
        isLoading: false,
        error: 'Failed to send message',
      });
    }
  },

  /**
   * Start voice input
   */
  startVoiceInput: (_onAudioChunk: (data: ArrayBuffer) => void) => {
    const { isConnected } = get();

    if (!isConnected) {
      set({ error: 'Not connected to chat service' });
      return;
    }

    set({ isRecording: true, error: null });

    // Add placeholder user message for live transcription
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: '',
      type: 'user',
      timestamp: Date.now(),
      metadata: { source: 'voice' },
    };

    set((state) => ({ messages: [...state.messages, userMessage] }));

    console.log('[ChatStore] Voice input started');
  },

  /**
   * Stop voice input
   */
  stopVoiceInput: (finalText?: string) => {
    const { wsService, sttBuffer, isRecording } = get();

    if (!isRecording) {
      console.log('[ChatStore] Already stopped, ignoring duplicate call');
      return;
    }

    console.log('[ChatStore] Stopping voice input');
    set({ isRecording: false });

    // Send end-speech message
    const text = finalText || sttBuffer.getFinalText();
    console.log('[ChatStore] Final text:', text);

    if (wsService.isWebSocketConnected()) {
      wsService.sendEndSpeech(text);
    }

    // Clear STT buffer
    sttBuffer.clear();
  },

  /**
   * Clear chat
   */
  clearChat: () => {
    const { disconnect, sttBuffer } = get();

    disconnect();
    sttBuffer.clear();

    set({
      messages: [],
      isTyping: false,
      isLoading: false,
      isRecording: false,
      error: null,
    });

    console.log('[ChatStore] Chat cleared');
  },

  /**
   * Set language
   */
  setLanguage: (language: string) => {
    const { wsService, isConnected } = get();

    set({ language });

    // If connected, send language change message
    if (isConnected && wsService.isWebSocketConnected()) {
      wsService.sendLanguageChange(language);
      console.log('[ChatStore] Language changed to:', language);
    }
  },

  /**
   * Set TTS enabled
   */
  setTTSEnabled: (enabled: boolean) => {
    const { wsService, isConnected } = get();

    set({ ttsEnabled: enabled });

    // If connected, send TTS control message
    if (isConnected && wsService.isWebSocketConnected()) {
      wsService.sendTTSControl(enabled);
      console.log('[ChatStore] TTS enabled:', enabled);
    }
  },

  /**
   * Set error
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * Set recording state
   */
  setRecording: (isRecording: boolean) => {
    set({ isRecording });
  },
}));
