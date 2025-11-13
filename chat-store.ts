/**
 * Simplified chat store with WebSocket support
 * Automatically detects mode: voice input triggers voice mode, text input triggers text mode
 */

import { create } from 'zustand';

import { marked } from 'marked';
import type { ConnectionAckMessage, ErrorMessage, SttChunkMessage, LlmChunkMessage, EndMessage } from '@/lib/types/chat-ws';
import {
  buildWebSocketUrl,
  isBinaryData,
  deserializeServerMessage,
  serializeClientMessage,
  createTextMessage,
  createEndSpeechMessage,
  SttChunkBuffer,
} from './_utils/websocket-client';
import { AudioPlaybackManager } from './_utils/audio-processor';
import { startRecording, stopRecording, getRecordingErrorMessage, type RecordingResources } from './_utils/recording-manager';

export interface ChatMessage {
  content?: string;
  rawContent?: string;
  type: 'user' | 'bot' | 'system';
}

interface ChatState {
  // UI state
  isLoading: boolean;
  error: string | null;
  chatOpened: boolean;
  animationEnded: boolean;
  isChatPanelOpen: boolean;

  // Messages
  messages: ChatMessage[];
  isTyping: boolean;

  // Recording state
  isRecording: boolean;
  recordingResources: Partial<RecordingResources>;

  // WebSocket state
  webSocket: WebSocket | null;
  sessionId: string | null;
  isConnected: boolean;
  currentLanguage: string;
  ttsEnabled: boolean;

  // Authentication
  siteToken: string | null;
  jwt: string | null;
  jwtExpiresAt: Date | null;

  // Audio processing
  sttBuffer: SttChunkBuffer;
  audioPlayback: AudioPlaybackManager;
  audioContextResumed: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  startVoiceInput: () => Promise<void>;
  stopVoiceInput: () => void;
  clearChat: () => void;
  setChatOpened: (opened: boolean) => void;
  setAnimationEnded: (ended: boolean) => void;
  setChatPanelOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
  setLanguage: (language: string) => void;
  setSiteToken: (token: string) => void;
  setTTSEnabled: (enabled: boolean) => void;
  resumeAudioContext: () => Promise<void>;

  // Internal
  stopTTSPlayback: () => void;
  sendTTSControl: (enabled: boolean) => void;
  connectWebSocket: (ttsEnabled?: boolean) => Promise<void>;
  disconnectWebSocket: () => void;
  authenticateAndGetJWT: () => Promise<string>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  chatOpened: false,
  animationEnded: false,
  isChatPanelOpen: false,
  messages: [],
  isTyping: false,
  isRecording: false,
  recordingResources: {},
  webSocket: null,
  sessionId: null,
  isConnected: false,
  currentLanguage: 'en',
  ttsEnabled: true,
  siteToken: null,
  jwt: null,
  jwtExpiresAt: null,
  sttBuffer: new SttChunkBuffer(10),
  audioPlayback: new AudioPlaybackManager(),
  audioContextResumed: false,

  /**
   * Authenticate and get JWT
   */
  authenticateAndGetJWT: async () => {
    const { siteToken, jwt, jwtExpiresAt } = get();

    // Check if we have a valid JWT (with 1 minute buffer)
    if (jwt && jwtExpiresAt && new Date(jwtExpiresAt.getTime() - 60000) > new Date()) {
      return jwt;
    }

    // Need to authenticate
    if (!siteToken) {
      throw new Error('Site token not configured');
    }

    try {
      const origin = window.location.origin;
      const baseUrl = process.env.NEXT_PUBLIC_BOT_WS_URL || 'ws://localhost:8080';
      // Remove /ws path if present and convert to HTTP
      const httpUrl = baseUrl.replace(/^ws(s)?:\/\//, 'http$1://').replace(/\/ws$/, '');

      const response = await fetch(`${httpUrl}/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_token: siteToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      set({
        jwt: data.jwt,
        jwtExpiresAt: new Date(data.expires_at),
      });

      return data.jwt;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Failed to authenticate');
    }
  },

  /**
   * Connect to WebSocket with TTS enabled/disabled
   */
  connectWebSocket: async (ttsEnabledParam?: boolean) => {
    const { webSocket, disconnectWebSocket, currentLanguage, audioPlayback, authenticateAndGetJWT, ttsEnabled } = get();
    const effectiveTtsEnabled = ttsEnabledParam !== undefined ? ttsEnabledParam : ttsEnabled;

    // Disconnect existing connection
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      disconnectWebSocket();
    }

    try {
      // Get JWT token
      const jwtToken = await authenticateAndGetJWT();

      const wsUrl = buildWebSocketUrl();
      const url = new URL(wsUrl);
      url.searchParams.set('ttsEnabled', String(effectiveTtsEnabled));
      url.searchParams.set('lang', currentLanguage);

      // Add JWT to URL as query parameter (WebSocket doesn't support custom headers easily)
      url.searchParams.set('jwt', jwtToken);

      const newWebSocket = new WebSocket(url.toString());
      const newSttBuffer = new SttChunkBuffer(10);

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (newWebSocket.readyState === WebSocket.CONNECTING) {
          console.error('WebSocket connection timeout');
          newWebSocket.close();
          set({ error: 'Connection timeout. Please try again.' });
        }
      }, 10000);

      set({
        webSocket: newWebSocket,
        sttBuffer: newSttBuffer,
        isConnected: false,
      });

      // WebSocket event handlers
      newWebSocket.onopen = () => {
        console.log('WebSocket connected');
        clearTimeout(connectionTimeout);
        set({ isConnected: true, error: null });
      };

      newWebSocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        clearInterval(renewalInterval);

        // Handle unauthorized close (4401)
        if (event.code === 4401) {
          console.log('[JWT] Token expired or invalid, clearing JWT');
          set({
            isConnected: false,
            webSocket: null,
            jwt: null,
            jwtExpiresAt: null,
            error: 'Session expired. Reconnecting...',
          });

          // Auto-reconnect after clearing JWT
          setTimeout(() => {
            const { connectWebSocket } = get();
            connectWebSocket(true).catch((err) => {
              console.error('Auto-reconnect failed:', err);
            });
          }, 1000);
        } else {
          set({ isConnected: false, webSocket: null });
        }
      };

      newWebSocket.onerror = (event) => {
        console.error('WebSocket error:', event);
        set({ error: 'Connection error. Please try again.' });
      };

      // Start JWT renewal timer (renew every 10 minutes)
      const renewalInterval = setInterval(
        () => {
          const ws = get().webSocket;
          if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('[JWT] Requesting token renewal');
            ws.send(
              JSON.stringify({
                type: 'renew',
                timestamp: Date.now(),
              })
            );
          }
        },
        10 * 60 * 1000
      ); // 10 minutes

      newWebSocket.onmessage = async (event) => {
        const { sttBuffer, ttsEnabled } = get();

        try {
          if (isBinaryData(event.data)) {
            // Binary audio data (TTS) - only play if TTS is enabled
            if (!ttsEnabled) {
              console.log('[TTS] TTS disabled, ignoring received audio chunk');
              return;
            }
            console.log('[TTS] Received audio chunk:', event.data.size || event.data.byteLength, 'bytes');
            await audioPlayback.playAudioChunk(event.data);
          } else {
            // JSON message
            const message = deserializeServerMessage(event.data);

            switch (message.type) {
              case 'renewed':
                // Update JWT token
                const renewedMsg = message as any;
                set({
                  jwt: renewedMsg.token,
                  jwtExpiresAt: new Date(renewedMsg.expiresAt * 1000),
                });
                console.log('[JWT] Token renewed successfully, expires:', new Date(renewedMsg.expiresAt * 1000));
                break;

              case 'connection-ack':
                const ackMsg = message as ConnectionAckMessage;
                set({ sessionId: ackMsg.sessionId });
                console.log('Connection acknowledged:', ackMsg.sessionId);
                break;

              case 'text':
                // Handle text messages (including STT transcripts)
                const textMsg = message as any;
                console.log('[TEXT] Received:', {
                  content: textMsg.payload?.content,
                  role: textMsg.payload?.role,
                  context: textMsg.payload?.context,
                  timestamp: new Date().toISOString(),
                });

                // Check if this is an STT transcript
                if (textMsg.payload?.context?.source === 'stt') {
                  const isFinal = textMsg.payload.context.is_final;
                  const content = textMsg.payload.content;

                  console.log('[STT] Received transcript:', {
                    content,
                    isFinal,
                    confidence: textMsg.payload.context.confidence,
                  });

                  // Update user message with transcription
                  set((state) => {
                    const messages = [...state.messages];
                    const lastMessage = messages[messages.length - 1];

                    // Check if this is a duplicate (same content as last user message)
                    if (lastMessage && lastMessage.type === 'user' && lastMessage.content === content) {
                      console.log('[STT] Skipping duplicate transcript');
                      return state; // No change
                    }

                    if (lastMessage && lastMessage.type === 'user') {
                      // Update the last user message with the transcript
                      messages[messages.length - 1] = {
                        ...lastMessage,
                        content: content,
                      };
                    } else if (isFinal) {
                      // If no user message exists and this is final, create one
                      messages.push({
                        content: content,
                        type: 'user',
                      });
                    }

                    return { messages };
                  });

                  // If final transcript, trigger loading state for bot response (only once)
                  if (isFinal) {
                    const currentState = get();
                    if (!currentState.isLoading) {
                      set({ isLoading: true });
                    }
                  }
                }
                break;

              case 'stt-chunk':
                const sttMsg = message as SttChunkMessage;
                console.log('[STT-CHUNK] Received:', {
                  text: sttMsg.text,
                  isFinal: sttMsg.isFinal,
                  timestamp: new Date().toISOString(),
                });
                sttBuffer.add(sttMsg);

                // Update user message with live transcription
                set((state) => {
                  const messages = [...state.messages];
                  const lastMessage = messages[messages.length - 1];

                  if (lastMessage && lastMessage.type === 'user') {
                    // Get complete text (all final chunks + latest interim)
                    const completeText = sttBuffer.getCompleteText();

                    console.log('[STT-CHUNK] Updating message:', {
                      completeText,
                      isFinal: sttMsg.isFinal,
                      finalText: sttBuffer.getFinalText(),
                      interimText: sttBuffer.getInterimText(),
                    });

                    messages[messages.length - 1] = {
                      ...lastMessage,
                      content: completeText,
                    };
                  }

                  return { messages };
                });
                break;

              case 'llm-chunk':
                const llmMsg = message as LlmChunkMessage;
                set((state) => {
                  const messages = [...state.messages];
                  const lastMessage = messages[messages.length - 1];

                  if (lastMessage && lastMessage.type === 'bot') {
                    const newRawContent = (lastMessage.rawContent || '') + llmMsg.text;
                    messages[messages.length - 1] = {
                      rawContent: newRawContent,
                      content: newRawContent,
                      type: 'bot',
                    };
                  } else {
                    messages.push({
                      rawContent: llmMsg.text,
                      content: llmMsg.text,
                      type: 'bot',
                    });
                  }

                  return { messages, isTyping: true };
                });
                break;

              case 'error':
                const errorMsg = message as ErrorMessage;
                set({ error: errorMsg.error, isTyping: false, isLoading: false });
                break;

              case 'end':
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
                break;
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      set({ error: 'Failed to connect to chat service' });
    }
  },

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket: () => {
    const { webSocket, audioPlayback } = get();

    if (webSocket) {
      webSocket.close(1000, 'Client disconnecting');
    }

    audioPlayback.stop();

    set({
      webSocket: null,
      isConnected: false,
      sessionId: null,
    });
  },

  /**
   * Send text message
   */
  sendMessage: async (content: string) => {
    const { webSocket, isConnected, sessionId } = get();

    if (!content.trim()) return;

    // Check if WebSocket is connected
    if (!webSocket || !isConnected || webSocket.readyState !== WebSocket.OPEN) {
      set({ error: 'Not connected to chat service' });
      return;
    }

    set({
      chatOpened: true,
      isLoading: true,
      error: null,
    });

    // Add user message
    const userMessage: ChatMessage = { content: content.trim(), type: 'user' };
    set((state) => ({ messages: [...state.messages, userMessage] }));

    try {
      // Send message via WebSocket
      const textMessage = createTextMessage(content.trim(), sessionId || undefined);
      webSocket.send(serializeClientMessage(textMessage));
    } catch (error) {
      console.error('Failed to send message:', error);
      set({
        isTyping: false,
        isLoading: false,
        error: 'Failed to send message',
      });
    }
  },

  /**
   * Start voice input (automatically switches to voice mode)
   */
  startVoiceInput: async () => {
    const { webSocket, isConnected, sessionId, sttBuffer } = get();

    // Check if WebSocket is connected
    if (!webSocket || !isConnected || webSocket.readyState !== WebSocket.OPEN) {
      set({ error: 'Not connected to chat service' });
      return;
    }

    try {
      set({
        isRecording: true,
        chatOpened: true,
        error: null,
      });

      // Add placeholder user message for live transcription
      const userMessage: ChatMessage = { content: '', type: 'user' };
      set((state) => ({ messages: [...state.messages, userMessage] }));

      // Start recording
      const resources = await startRecording(webSocket, () => {
        // On silence detected
        get().stopVoiceInput();
      });

      set({ recordingResources: resources });
    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage = getRecordingErrorMessage(error);
      set({
        isRecording: false,
        error: errorMessage,
        recordingResources: {},
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Stop voice input
   */
  stopVoiceInput: () => {
    const { recordingResources, sttBuffer, webSocket, sessionId, isRecording } = get();

    // Guard against duplicate calls
    if (!isRecording) {
      console.log('[STOP-VOICE] Already stopped, ignoring duplicate call');
      return;
    }

    console.log('[STOP-VOICE] Stopping voice input');

    // Set isRecording to false immediately to prevent duplicate calls
    set({ isRecording: false });

    // Stop recording
    stopRecording(recordingResources);

    // Send end-speech message (even if finalText is empty)
    // The backend will send 'done' command to Cartesia to trigger final transcript
    const finalText = sttBuffer.getFinalText();
    console.log('[STOP-VOICE] Final text from buffer:', finalText);
    console.log('[STOP-VOICE] WebSocket state:', webSocket?.readyState);

    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      const endSpeechMessage = createEndSpeechMessage(finalText, sessionId || undefined);
      console.log('[STOP-VOICE] Sending end-speech message:', endSpeechMessage);
      webSocket.send(serializeClientMessage(endSpeechMessage));

      if (!finalText) {
        console.log('[STOP-VOICE] Buffer was empty - backend will wait for final transcript');
      }
    } else {
      console.error('[STOP-VOICE] Cannot send end-speech - WebSocket not open');
    }

    // Clear STT buffer
    sttBuffer.clear();

    set({
      recordingResources: {},
    });
  },

  /**
   * Clear chat and disconnect
   */
  clearChat: () => {
    const { disconnectWebSocket, audioPlayback } = get();
    disconnectWebSocket();
    audioPlayback.stop();

    set({
      messages: [],
      chatOpened: false,
      isTyping: false,
      isRecording: false,
      isLoading: false,
      error: null,
      recordingResources: {},
      sttBuffer: new SttChunkBuffer(10),
      audioContextResumed: false,
    });
  },

  setChatOpened: (opened: boolean) => {
    set({ chatOpened: opened });
  },

  setAnimationEnded: (ended: boolean) => {
    set({ animationEnded: ended });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setLanguage: (language: string) => {
    const { webSocket, isConnected } = get();

    set({ currentLanguage: language });

    // If connected, send language change message
    if (webSocket && isConnected) {
      webSocket.send(
        JSON.stringify({
          type: 'set-language',
          language: language,
          timestamp: Date.now(),
        })
      );
      console.log('Language changed to:', language);
    }
  },

  setSiteToken: (token: string) => {
    set({ siteToken: token });
  },

  setChatPanelOpen: (open: boolean) => {
    set({ isChatPanelOpen: open });
  },

  setTTSEnabled: (enabled: boolean) => {
    set({ ttsEnabled: enabled });
  },

  /**
   * Send TTS control message without reconnecting
   */
  sendTTSControl: (enabled: boolean) => {
    const { webSocket, isConnected } = get();

    if (webSocket && isConnected) {
      webSocket.send(
        JSON.stringify({
          type: 'set-tts',
          ttsEnabled: enabled,
          timestamp: Date.now(),
        })
      );
      console.log('TTS setting changed to:', enabled);
    }
  },

  /**
   * Immediately stop TTS audio playback
   */
  stopTTSPlayback: () => {
    const { audioPlayback } = get();
    audioPlayback.stopTTS();
  },

  /**
   * Resume audio context after user interaction (for iOS)
   */
  resumeAudioContext: async () => {
    const { audioPlayback, audioContextResumed } = get();

    if (!audioContextResumed) {
      try {
        await audioPlayback.forceResume();
        set({ audioContextResumed: true });
        console.log('[ChatStore] Audio context resumed after user interaction');
      } catch (error) {
        console.warn('[ChatStore] Failed to resume audio context:', error);
      }
    }
  },
}));
